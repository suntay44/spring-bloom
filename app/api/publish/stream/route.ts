/**
 * POST /api/publish/stream
 *   Server-Sent Events version of /api/publish.
 *
 * Emits a stream of events as the publish progresses:
 *   event: phase  data: { phase, message }
 *   event: build  data: { stdout, stderr, exit_code, duration_ms }
 *   event: files  data: { count, total_bytes }
 *   event: deploy data: { url, deployment_id, file_count }
 *   event: done   data: { success: true,  url, deployment_id }
 *   event: error  data: { message }
 *
 * Persists a row in `deployments` so users can see history + roll back.
 *
 * NOTE: Fly's exec API doesn't stream stdout — `npm run build` is a single
 * blocking call. We emit phase events around it instead. Real log streaming
 * would require tailing Fly logs in parallel (deferred — bigger change).
 */

import { createClient } from '@/lib/supabase/server'
import { execOnMachine, listDistFiles, readFileAsBase64 } from '@/lib/fly/client'
import { createPagesProject, deployToPages, generateSlug } from '@/lib/cloudflare/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUILD_LOG_MAX = 64_000   // ~64KB cap to keep deployment rows small

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError(401, 'Unauthorized')

  const body = await req.json() as { projectId?: string }
  const projectId = body.projectId
  if (!projectId) return jsonError(400, 'projectId required')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, fly_machine_id, publish_slug, cloudflare_project_name')
    .eq('id', projectId).eq('user_id', user.id).single()
  if (!project) return jsonError(404, 'Project not found')
  if (!project.fly_machine_id) return jsonError(400, 'No Fly machine provisioned')

  // Pre-create the deployment row so we can update it as we go.
  const { data: deploymentRow } = await supabase
    .from('deployments')
    .insert({
      project_id: projectId,
      user_id:    user.id,
      cf_project_name: project.cloudflare_project_name ?? null,
      status:     'pending',
    })
    .select('id').single()
  const deploymentId = (deploymentRow as { id: string } | null)?.id

  // ── Build the SSE stream ──
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const updateDeployment = async (patch: Record<string, unknown>) => {
        if (!deploymentId) return
        await supabase.from('deployments').update(patch).eq('id', deploymentId)
      }

      const startedAt = Date.now()
      try {
        const machineId = project.fly_machine_id as string

        // Phase 1: ensure Cloudflare Pages project exists
        send('phase', { phase: 'cloudflare', message: 'Preparing Cloudflare Pages project...' })

        let cloudflareProjectName = project.cloudflare_project_name as string | null
        let publishSlug = project.publish_slug as string | null
        if (!cloudflareProjectName) {
          const slug = generateSlug(project.name as string, project.id as string)
          await createPagesProject(slug)
          await supabase.from('projects').update({
            cloudflare_project_name: slug, publish_slug: slug,
          }).eq('id', projectId)
          cloudflareProjectName = slug
          publishSlug = slug
        }
        await updateDeployment({ cf_project_name: cloudflareProjectName, status: 'building' })

        // Phase 2: build
        send('phase', { phase: 'build', message: 'Running npm run build inside your project...' })
        const buildStart = Date.now()
        const buildResult = await execOnMachine(
          machineId,
          ['sh', '-c', 'cd /app && npm run build 2>&1'],
          '/app', 300,
        )
        const buildDuration = Date.now() - buildStart

        const combinedLog = (buildResult.stdout + buildResult.stderr).slice(0, BUILD_LOG_MAX)
        send('build', {
          stdout:      buildResult.stdout.slice(0, BUILD_LOG_MAX),
          stderr:      buildResult.stderr.slice(0, 8000),
          exit_code:   buildResult.exit_code,
          duration_ms: buildDuration,
        })

        if (buildResult.exit_code !== 0) {
          await updateDeployment({
            status: 'failed',
            error_message: 'Build exited non-zero',
            build_log: combinedLog,
            build_duration_ms: buildDuration,
            completed_at: new Date().toISOString(),
          })
          send('error', { message: 'Build failed — see logs above', detail: buildResult.stderr.slice(0, 2000) })
          controller.close()
          return
        }

        // Phase 3: read build output
        send('phase', { phase: 'uploading', message: 'Reading build output...' })
        await updateDeployment({ status: 'uploading' })

        const paths = await listDistFiles(machineId)
        if (paths.length === 0) {
          await updateDeployment({
            status: 'failed', error_message: 'Build produced no output files',
            build_log: combinedLog, build_duration_ms: buildDuration,
            completed_at: new Date().toISOString(),
          })
          send('error', { message: 'Build produced no output files' })
          controller.close()
          return
        }

        const files: Record<string, string> = {}
        let totalBytes = 0
        for (const p of paths) {
          const relPath = p.replace('/app/dist/', '/')
          const b64 = await readFileAsBase64(machineId, p)
          files[relPath] = b64
          totalBytes += Math.floor(b64.length * 0.75) // base64 → original byte estimate
        }
        send('files', { count: paths.length, total_bytes: totalBytes })

        // Phase 4: deploy
        send('phase', { phase: 'deploy', message: 'Uploading to Cloudflare Pages...' })
        const deployResult = await deployToPages(cloudflareProjectName as string, files)

        const publishedUrl = `https://${publishSlug}.springbloom.app`
        await supabase.from('projects').update({
          cloudflare_deployment_id: deployResult.deploymentId,
          published_url: publishedUrl,
          published_at: new Date().toISOString(),
        }).eq('id', projectId)

        await updateDeployment({
          status: 'success',
          cf_deployment_id: deployResult.deploymentId,
          published_url: publishedUrl,
          build_log: combinedLog,
          build_duration_ms: buildDuration,
          bundle_size_bytes: totalBytes,
          file_count: paths.length,
          completed_at: new Date().toISOString(),
        })

        send('deploy', {
          url: publishedUrl,
          deployment_id: deployResult.deploymentId,
          file_count: paths.length,
        })
        send('done', { success: true, url: publishedUrl, deployment_id: deployResult.deploymentId, total_duration_ms: Date.now() - startedAt })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Publish failed'
        await updateDeployment({
          status: 'failed', error_message: message,
          completed_at: new Date().toISOString(),
        })
        send('error', { message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':     'text/event-stream',
      'Cache-Control':    'no-cache, no-transform',
      'Connection':       'keep-alive',
      'X-Accel-Buffering': 'no',  // disable nginx/CF buffering
    },
  })
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
