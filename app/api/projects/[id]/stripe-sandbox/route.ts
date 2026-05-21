/**
 * GET  /api/projects/[id]/stripe-sandbox
 *   Returns sandbox status (mode, provisioned, claimed). Never returns raw keys.
 *
 * POST /api/projects/[id]/stripe-sandbox
 *   Provisions platform test keys into the project's Fly machine and records
 *   the sandbox row. Idempotent — safe to call multiple times.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformTestKeys } from '@/lib/stripe/sandbox'
import { injectStripeEnv } from '@/lib/fly/client'
import { writeRateLimit } from '@/lib/rate-limit'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const db = createAdminClient()
  const { data: sandbox } = await db
    .from('app_stripe_sandboxes')
    .select('mode, sandbox_provisioned_at, claimed_at, stripe_account_id')
    .eq('project_id', projectId)
    .maybeSingle()

  return NextResponse.json({ sandbox: sandbox ?? null })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit — sandbox provisioning hits Fly + writes credentials
  const { success } = await writeRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, fly_machine_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const db = createAdminClient()

  // Idempotency — if already provisioned in sandbox mode, skip re-injection
  const { data: existing } = await db
    .from('app_stripe_sandboxes')
    .select('mode, sandbox_provisioned_at')
    .eq('project_id', projectId)
    .maybeSingle()

  if (existing?.mode === 'sandbox' && existing.sandbox_provisioned_at) {
    return NextResponse.json({ ok: true, mode: 'sandbox', already_provisioned: true })
  }

  // Inject platform test keys into Fly machine (best-effort if machine exists)
  let injected = false
  if (project.fly_machine_id) {
    try {
      const { publishableKey, secretKey } = getPlatformTestKeys()
      await injectStripeEnv(project.fly_machine_id, publishableKey, secretKey)
      injected = true
    } catch (err) {
      console.error('[stripe-sandbox] Fly env injection failed:', err)
      // Non-fatal — record the sandbox row regardless so UI reflects intent
    }
  }

  // Upsert sandbox record
  const now = new Date().toISOString()
  const { error } = await db.from('app_stripe_sandboxes').upsert(
    {
      project_id: projectId,
      mode: 'sandbox',
      sandbox_provisioned_at: now,
      updated_at: now,
    },
    { onConflict: 'project_id' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, mode: 'sandbox', injected })
}
