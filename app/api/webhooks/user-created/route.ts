import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseProject, waitForProject, getProjectApiKeys, runMigration } from '@/lib/supabase/management'
import { BASE_SCHEMA_SQL } from '@/lib/supabase/base-schema'

// Service-role client for writing back to platform DB
const platformClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Typed helper so we don't need `any` on every call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlatformClient = ReturnType<typeof createClient<any>>

export async function POST(req: Request) {
  // Validate webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { type: string; record: { id: string; email: string } }
  if (body.type !== 'INSERT') return NextResponse.json({ ok: true })

  const userId = body.record.id

  // Idempotency check: if already provisioned, return immediately
  const { data: profile } = await (platformClient as unknown as PlatformClient)
    .from('profiles')
    .select('supabase_project_ref, supabase_status')
    .eq('id', userId)
    .single()

  if (profile?.supabase_project_ref) {
    console.log(`[user-created webhook] User ${userId} already provisioned — skipping`)
    return NextResponse.json({ status: 'already_provisioned' })
  }

  // If already in progress (another webhook delivery), skip to avoid double-provisioning
  if (profile?.supabase_status === 'provisioning') {
    console.log(`[user-created webhook] User ${userId} provisioning already in progress — skipping`)
    return NextResponse.json({ status: 'provisioning' })
  }

  // Mark as provisioning immediately so UI can poll
  await (platformClient as unknown as PlatformClient)
    .from('profiles')
    .update({ supabase_status: 'provisioning' })
    .eq('id', userId)

  const projectName = `wc-${userId.slice(0, 8)}`
  const dbPass = crypto.randomUUID().replace(/-/g, '')

  // Return 200 immediately — Supabase webhook has a short delivery timeout.
  // Provisioning (waitForProject) can take up to 2 minutes, so run it in the
  // background after the response is sent to prevent retries / double-provisioning.
  void (async () => {
    try {
      const project = await createSupabaseProject({ name: projectName, dbPass })
      await waitForProject(project.ref)
      const keys = await getProjectApiKeys(project.ref)
      const anonKey = keys.find((k) => k.name === 'anon')?.api_key ?? ''
      const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key ?? ''
      await runMigration(project.ref, BASE_SCHEMA_SQL)

      // Service-role key is stored in the locked-down user_secrets table
      // (RLS denies all non-service-role access), never in profiles.
      await (platformClient as unknown as PlatformClient)
        .from('user_secrets')
        .upsert({ user_id: userId, supabase_service_key: serviceKey })

      await (platformClient as unknown as PlatformClient)
        .from('profiles')
        .update({
          supabase_project_ref: project.ref,
          // api_url is not always returned by the Management API — derive from ref
          supabase_project_url: project.api_url ?? `https://${project.ref}.supabase.co`,
          supabase_anon_key: anonKey,
          supabase_status: 'ready',
        })
        .eq('id', userId)
    } catch (err) {
      console.error('[user-created webhook] Provisioning failed:', err)
      await (platformClient as unknown as PlatformClient)
        .from('profiles')
        .update({ supabase_status: 'error' })
        .eq('id', userId)
    }
  })()

  return NextResponse.json({ status: 'provisioning' })
}
