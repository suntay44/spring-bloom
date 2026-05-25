/**
 * GET  /api/projects/[id]/analytics
 *   Returns the currently connected analytics adapter (if any) + its config.
 *
 * POST /api/projects/[id]/analytics
 *   Body: { kind: AnalyticsKind, config: Record<string, string>, apply?: boolean }
 *   apply=false → return generated snippet for preview
 *   apply=true  → write to Fly machine + persist config in project_integrations
 *
 * DELETE /api/projects/[id]/analytics
 *   Body: { kind: AnalyticsKind }
 *   Removes the integration row + deletes the snippet file from the project.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile, execOnMachine } from '@/lib/fly/client'
import { ANALYTICS_ADAPTERS, type AnalyticsKind } from '@/lib/analytics/adapters'

const VALID_KINDS: AnalyticsKind[] = ['posthog', 'plausible', 'umami', 'ga4']

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  // Project ownership check via projects.user_id
  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Look up any analytics integrations on this project
  const { data: rows } = await supabase
    .from('project_integrations')
    .select('type, public_config, status, updated_at')
    .eq('project_id', projectId)
    .in('type', VALID_KINDS as string[])

  const integrations = (rows ?? []).map((r: { type: string; public_config: Record<string, string>; status: string; updated_at: string }) => ({
    kind:        r.type as AnalyticsKind,
    config:      r.public_config ?? {},
    status:      r.status,
    updated_at:  r.updated_at,
  }))

  return NextResponse.json({ integrations })
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as { kind?: AnalyticsKind; config?: Record<string, string>; apply?: boolean }

  if (!body.kind || !VALID_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }
  const adapter = ANALYTICS_ADAPTERS[body.kind]
  const config = body.config ?? {}

  // Required-field validation
  for (const f of adapter.fields) {
    if (f.required && !(config[f.key] ?? '').trim()) {
      return NextResponse.json({ error: `Field "${f.label}" is required` }, { status: 400 })
    }
  }

  // Generate snippet
  const snippet = adapter.buildSnippet(config)
  const preview = { path: adapter.filePath, content: snippet, byteSize: Buffer.byteLength(snippet, 'utf8') }

  // Preview only?
  if (!body.apply) return NextResponse.json({ preview, applied: false })

  // Apply mode — need a Fly machine + ownership check
  const { data: project } = await supabase
    .from('projects').select('id, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const machineId = (project as { fly_machine_id?: string }).fly_machine_id
  if (!machineId) {
    return NextResponse.json({ error: 'Start your project preview first' }, { status: 400 })
  }

  // Write file
  try {
    await writeFile(machineId, `/app/${adapter.filePath}`, snippet)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'write failed' },
      { status: 502 },
    )
  }

  // Persist as a project_integrations row
  await supabase
    .from('project_integrations')
    .upsert({
      project_id:    projectId,
      type:          body.kind,
      status:        'active',
      public_config: config,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'project_id,type' })

  return NextResponse.json({ preview, applied: true })
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') as AnalyticsKind | null
  if (!kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Missing or invalid ?kind' }, { status: 400 })
  }
  const adapter = ANALYTICS_ADAPTERS[kind]

  const { data: project } = await supabase
    .from('projects').select('id, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete file from Fly machine (soft-fail)
  const machineId = (project as { fly_machine_id?: string }).fly_machine_id
  if (machineId) {
    try {
      await execOnMachine(machineId, ['rm', '-f', `/app/${adapter.filePath}`], '/app', 5)
    } catch {
      /* soft-fail */
    }
  }

  // Remove integration row
  await supabase
    .from('project_integrations')
    .delete()
    .eq('project_id', projectId)
    .eq('type', kind)

  return NextResponse.json({ ok: true })
}
