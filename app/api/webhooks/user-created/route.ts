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

export async function POST(req: Request) {
  // Validate webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { type: string; record: { id: string; email: string } }
  if (body.type !== 'INSERT') return NextResponse.json({ ok: true })

  const userId = body.record.id
  const projectName = `sb-${userId.slice(0, 8)}`
  const dbPass = crypto.randomUUID().replace(/-/g, '')

  // Mark as provisioning immediately so UI can poll
  await (platformClient as unknown as ReturnType<typeof createClient<any>>)
    .from('profiles')
    .update({ supabase_status: 'provisioning' })
    .eq('id', userId)

  try {
    const project = await createSupabaseProject({ name: projectName, dbPass })
    await waitForProject(project.ref)
    const keys = await getProjectApiKeys(project.ref)
    const anonKey = keys.find((k) => k.name === 'anon')?.api_key ?? ''
    const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key ?? ''
    await runMigration(project.ref, BASE_SCHEMA_SQL)

    await (platformClient as unknown as ReturnType<typeof createClient<any>>)
      .from('profiles')
      .update({
        supabase_project_ref: project.ref,
        // api_url is not always returned by the Management API — derive from ref
        supabase_project_url: project.api_url ?? `https://${project.ref}.supabase.co`,
        supabase_anon_key: anonKey,
        supabase_service_key: serviceKey,
        supabase_status: 'ready',
      })
      .eq('id', userId)
  } catch (err) {
    console.error('[user-created webhook] Provisioning failed:', err)
    await (platformClient as unknown as ReturnType<typeof createClient<any>>)
      .from('profiles')
      .update({ supabase_status: 'error' })
      .eq('id', userId)
  }

  return NextResponse.json({ ok: true })
}
