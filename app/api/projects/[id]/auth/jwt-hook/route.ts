/**
 * GET  /api/projects/[id]/auth/jwt-hook
 *   Returns the current custom_access_token_hook function body from the user's
 *   Supabase project (via Management API + their PAT).
 *
 * POST /api/projects/[id]/auth/jwt-hook
 *   Body: { body: string }
 *   Replaces the function. Triggers `create or replace function ...`.
 *
 * Requires the user to have stored their Supabase Management PAT in
 * project_secrets (same key the auth-providers panel uses).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MGMT_BASE = 'https://api.supabase.com/v1'

async function getPatAndRef(projectId: string, userId: string) {
  const supabase = await createClient()

  const { data: integration } = await supabase
    .from('project_integrations')
    .select('public_config')
    .eq('project_id', projectId).eq('type', 'supabase').maybeSingle()
  const projectUrl = (integration?.public_config as Record<string, string> | null)?.project_url
  if (!projectUrl) return { error: 'No Supabase project connected' as const }

  const admin = createAdminClient()
  const { data: secrets } = await admin
    .from('project_secrets')
    .select('secret_config')
    .eq('project_id', projectId).eq('type', 'supabase').maybeSingle()
  const pat = (secrets?.secret_config as Record<string, string> | null)?.management_pat
  if (!pat) return { error: 'Add your Supabase Management PAT in Integrations first' as const }

  void userId  // unused for now; reserved for audit logging
  const ref = new URL(projectUrl).hostname.split('.')[0]!
  return { pat, ref }
}

async function runSql(ref: string, pat: string, sql: string): Promise<unknown[]> {
  const res = await fetch(`${MGMT_BASE}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const body = await res.json() as unknown
  if (Array.isArray(body)) return body
  return (body as { rows?: unknown[] }).rows ?? []
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const conn = await getPatAndRef(projectId, user.id)
  if ('error' in conn) return NextResponse.json({ error: conn.error }, { status: 400 })

  try {
    const rows = await runSql(conn.ref, conn.pat, `
      select pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'custom_access_token_hook'
      limit 1;
    `)
    const def = (rows[0] as { definition?: string } | undefined)?.definition ?? null
    return NextResponse.json({ exists: !!def, definition: def })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'fetch failed' }, { status: 502 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as { body?: string }
  const fnBody = body.body?.trim()
  if (!fnBody) return NextResponse.json({ error: 'body required' }, { status: 400 })

  // Lightweight safety check — we expect a plpgsql block; the user can override.
  if (fnBody.length > 50_000) {
    return NextResponse.json({ error: 'Function body too large (50KB cap)' }, { status: 400 })
  }

  const conn = await getPatAndRef(projectId, user.id)
  if ('error' in conn) return NextResponse.json({ error: conn.error }, { status: 400 })

  const sql = `
    create or replace function public.custom_access_token_hook(event jsonb)
    returns jsonb
    language plpgsql
    stable
    as $func$
    declare
      claims jsonb;
    begin
      claims := event->'claims';
${fnBody}
      event := jsonb_set(event, '{claims}', claims);
      return event;
    end;
    $func$;

    grant execute on function public.custom_access_token_hook to supabase_auth_admin;
    revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
  `

  try {
    await runSql(conn.ref, conn.pat, sql)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'apply failed' }, { status: 502 })
  }
}
