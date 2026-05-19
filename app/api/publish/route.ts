import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { execOnMachine, listDistFiles, readFileAsBase64 } from '@/lib/fly/client'
import { createPagesProject, deployToPages, generateSlug } from '@/lib/cloudflare/client'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { projectId: string }
  const { projectId } = body
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Verify project ownership (IDOR guard — scoped to the authed user)
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, fly_machine_id, publish_slug, cloudflare_project_name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  if (!project.fly_machine_id) {
    return NextResponse.json(
      { error: 'No machine provisioned for this project' },
      { status: 400 }
    )
  }

  try {
    const machineId = project.fly_machine_id as string

    // 2. Ensure a Cloudflare Pages project exists
    let cloudflareProjectName = project.cloudflare_project_name as string | null
    let publishSlug = project.publish_slug as string | null
    if (!cloudflareProjectName) {
      const slug = generateSlug(project.name as string, project.id as string)
      await createPagesProject(slug)
      const { error: slugErr } = await supabase
        .from('projects')
        .update({ cloudflare_project_name: slug, publish_slug: slug })
        .eq('id', projectId)
      if (slugErr) throw new Error('Failed to persist Cloudflare project name')
      cloudflareProjectName = slug
      publishSlug = slug
    }

    // 3. Run the build inside the Fly machine (5-min timeout)
    const buildResult = await execOnMachine(
      machineId,
      ['sh', '-c', 'cd /app && npm run build'],
      '/app',
      300
    )
    if (buildResult.exit_code !== 0) {
      return NextResponse.json(
        { error: 'Build failed', detail: buildResult.stderr?.slice(0, 2000) },
        { status: 500 }
      )
    }

    // 4. Read the build output
    const paths = await listDistFiles(machineId)
    if (paths.length === 0) {
      return NextResponse.json(
        { error: 'Build produced no output files' },
        { status: 500 }
      )
    }
    const files: Record<string, string> = {}
    for (const p of paths) {
      const relPath = p.replace('/app/dist/', '/')
      files[relPath] = await readFileAsBase64(machineId, p)
    }

    // 5 + 6. Deploy then persist — all-or-nothing. Only write the DB
    //         after a successful deploy so a failed deploy leaves no
    //         stale published_url behind.
    const deployResult = await deployToPages(
      cloudflareProjectName as string,
      files
    )

    const publishedUrl = `https://${publishSlug}.springbloom.app`
    const { error: persistErr } = await supabase
      .from('projects')
      .update({
        cloudflare_deployment_id: deployResult.deploymentId,
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
      })
      .eq('id', projectId)
    if (persistErr) throw new Error('Failed to persist publish result')

    // 7. Return the published URL
    return NextResponse.json({ url: publishedUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed'
    // Sanitized — no stack traces leaked to the client
    return NextResponse.json(
      { error: 'Publish failed', detail: message },
      { status: 500 }
    )
  }
}
