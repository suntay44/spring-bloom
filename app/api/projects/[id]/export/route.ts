/**
 * GET /api/projects/[id]/export
 *
 * Streams a tar.gz of /app from the project's Fly machine. The tar excludes
 * node_modules, .next, .git so the download stays small (≤ a few MB for a
 * typical app).
 *
 * This is THE key trust signal: users can leave SpringBloom at any time with
 * their code intact. No vendor lock-in. Lovable Cloud has no migration path.
 *
 * Response: application/gzip with Content-Disposition: attachment.
 */

import { createClient } from '@/lib/supabase/server'
import { execOnMachine } from '@/lib/fly/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EXCLUDES = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  '.cache',
  '.turbo',
  '.vercel',
]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError(401, 'Unauthorized')

  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return jsonError(404, 'Not found')

  const proj = project as { id: string; name: string; slug?: string; fly_machine_id?: string }
  if (!proj.fly_machine_id) {
    return jsonError(400, 'Start your project preview first — no Fly machine to export from')
  }

  // Build the tar command. base64-encode so binary survives the JSON exec
  // protocol Fly returns, then decode on our side.
  const excludeFlags = EXCLUDES.map((e) => `--exclude="${e}"`).join(' ')
  const cmd = `cd /app && tar ${excludeFlags} -czf - . | base64 -w0`

  let result
  try {
    // 120s — plenty for any reasonable project; large monorepos may need more.
    result = await execOnMachine(proj.fly_machine_id, ['sh', '-c', cmd], '/app', 120)
  } catch (err) {
    return jsonError(502, err instanceof Error ? err.message : 'export failed')
  }

  if (result.exit_code !== 0) {
    return jsonError(500, `tar failed: ${result.stderr.slice(0, 500)}`)
  }
  if (!result.stdout) {
    return jsonError(500, 'Empty export — is the project directory empty?')
  }

  // Decode base64 back to raw bytes
  const buffer = Buffer.from(result.stdout.trim(), 'base64')

  const slug = proj.slug ?? proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ?? 'project'
  const filename = `${slug}-${new Date().toISOString().slice(0, 10)}.tar.gz`

  // Convert Buffer to Uint8Array for the Response body
  const bytes = new Uint8Array(buffer)

  return new Response(bytes, {
    headers: {
      'Content-Type':        'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(buffer.byteLength),
      'Cache-Control':       'no-store',
    },
  })
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
