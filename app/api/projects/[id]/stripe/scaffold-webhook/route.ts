/**
 * POST /api/projects/[id]/stripe/scaffold-webhook
 *   Body: { apply?: boolean, events?: StripeEventName[] }
 *
 *   - apply=false (default): returns generated files for preview only
 *   - apply=true:            writes them into the project's Fly machine
 *
 * Auto-detects whether the project has a Supabase integration — if yes, also
 * emits the stripe_events idempotency migration.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from '@/lib/fly/client'
import { generateStripeWebhook, type StripeEventName } from '@/lib/stripe/webhook-scaffold'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as { apply?: boolean; events?: StripeEventName[] }

  // Ownership + machine + integrations lookup in parallel
  const [{ data: project }, { data: stripeIntegration }, { data: supabaseIntegration }] =
    await Promise.all([
      supabase
        .from('projects').select('id, fly_machine_id')
        .eq('id', projectId).eq('user_id', user.id).maybeSingle(),
      supabase
        .from('project_integrations').select('type')
        .eq('project_id', projectId).eq('type', 'stripe').maybeSingle(),
      supabase
        .from('project_integrations').select('type')
        .eq('project_id', projectId).eq('type', 'supabase').maybeSingle(),
    ])

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!stripeIntegration) {
    return NextResponse.json(
      { error: 'Connect Stripe in Integrations first — the scaffold reads STRIPE_SECRET_KEY from your env.' },
      { status: 400 },
    )
  }

  const files = generateStripeWebhook({
    includeSupabaseMigration: !!supabaseIntegration,
    events: body.events,
  })

  // Preview only
  if (!body.apply) {
    return NextResponse.json({ files, applied: false, has_supabase: !!supabaseIntegration })
  }

  // Apply — write to Fly machine
  const machineId = (project as { fly_machine_id?: string }).fly_machine_id
  if (!machineId) {
    return NextResponse.json(
      { error: 'Start your project preview first — no Fly machine to write to' },
      { status: 400 },
    )
  }

  const written: string[] = []
  const failed:  Array<{ path: string; error: string }> = []
  for (const f of files) {
    try {
      await writeFile(machineId, `/app/${f.path}`, f.content)
      written.push(f.path)
    } catch (err) {
      failed.push({ path: f.path, error: err instanceof Error ? err.message : 'write failed' })
    }
  }

  return NextResponse.json({ files, applied: true, written, failed })
}
