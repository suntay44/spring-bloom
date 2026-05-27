/**
 * POST /api/projects/[id]/tests/run
 *   SSE-streamed test run inside the project's Fly machine.
 *
 * Events:
 *   event: phase   data: { phase: 'detect'|'running'|'parsing'|'done'|'error', message }
 *   event: result  data: { framework, command, exit_code, duration_ms, stdout, stderr, passed, failed, skipped }
 *   event: done    data: { test_run_id }
 *   event: error   data: { message }
 *
 * Fly exec doesn't stream stdout so we batch — output appears at completion.
 */

import { createClient } from '@/lib/supabase/server'
import { execOnMachine } from '@/lib/fly/client'
import { detectTestFramework, parseTestStats } from '@/lib/tests/framework-detect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OUTPUT_CAP = 64_000  // ~64KB per stdout/stderr to keep rows small

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError(401, 'Unauthorized')

  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects').select('id, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return jsonError(404, 'Not found')
  const machineId = (project as { fly_machine_id?: string }).fly_machine_id
  if (!machineId) return jsonError(400, 'Start your project preview first')

  // Pre-insert the run row
  const { data: runRow } = await supabase
    .from('test_runs')
    .insert({ project_id: projectId, user_id: user.id, command: 'pending', status: 'running' })
    .select('id').single()
  const testRunId = (runRow as { id: string } | null)?.id

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      const updateRun = async (patch: Record<string, unknown>) => {
        if (!testRunId) return
        await supabase.from('test_runs').update(patch).eq('id', testRunId)
      }

      const startedAt = Date.now()
      try {
        // Phase 1: detect framework
        send('phase', { phase: 'detect', message: 'Detecting test framework...' })
        const pkgResult = await execOnMachine(
          machineId, ['sh', '-c', 'cat /app/package.json 2>/dev/null || echo "{}"'], '/app', 5,
        )
        const detected = detectTestFramework(pkgResult.stdout)
        await updateRun({ framework: detected.framework, command: detected.command })

        // Phase 2: run
        send('phase', { phase: 'running', message: `Running ${detected.command}...` })
        const runResult = await execOnMachine(
          machineId,
          ['sh', '-c', `cd /app && ${detected.command} 2>&1 || true`],
          '/app',
          300,
        )

        const stdout = (runResult.stdout ?? '').slice(0, OUTPUT_CAP)
        const stderr = (runResult.stderr ?? '').slice(0, OUTPUT_CAP)

        // Phase 3: parse stats
        send('phase', { phase: 'parsing', message: 'Parsing results...' })
        const combined = stdout + '\n' + stderr
        const stats = parseTestStats(detected.framework, combined)

        const duration = Date.now() - startedAt
        // Determine final status
        const finalStatus = runResult.exit_code === 0 && stats.failed === 0 ? 'passed' : 'failed'

        await updateRun({
          status:        finalStatus,
          passed_count:  stats.passed,
          failed_count:  stats.failed,
          skipped_count: stats.skipped,
          duration_ms:   duration,
          stdout, stderr,
          exit_code:     runResult.exit_code,
          completed_at:  new Date().toISOString(),
        })

        send('result', {
          framework:  detected.framework,
          command:    detected.command,
          exit_code:  runResult.exit_code,
          duration_ms: duration,
          stdout, stderr,
          ...stats,
        })
        send('done', { test_run_id: testRunId })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Test run failed'
        await updateRun({ status: 'error', stderr: message, completed_at: new Date().toISOString() })
        send('error', { message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
