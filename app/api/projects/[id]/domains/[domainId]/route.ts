/**
 * GET    /api/projects/[id]/domains/[domainId]                → re-check DNS/SSL status
 * DELETE /api/projects/[id]/domains/[domainId]                → remove domain
 * PATCH  /api/projects/[id]/domains/[domainId]                → toggle is_primary
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCustomHostname, deleteCustomHostname, normalizeStatus,
} from '@/lib/cloudflare/custom-hostnames'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, domainId } = await params

  const { data: domain } = await supabase
    .from('custom_domains').select('*')
    .eq('id', domainId).eq('project_id', projectId).eq('user_id', user.id).maybeSingle()
  if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const d = domain as { cf_custom_hostname_id?: string; id: string }
  if (!d.cf_custom_hostname_id) {
    return NextResponse.json({ error: 'Domain not registered with Cloudflare' }, { status: 400 })
  }

  try {
    const ch = await getCustomHostname(d.cf_custom_hostname_id)
    const status = normalizeStatus(ch)
    const { data: updated } = await supabase
      .from('custom_domains')
      .update({
        dns_status: status.dns_status,
        ssl_status: status.ssl_status,
        last_status_message: status.message ?? null,
        verification_record_type: ch.ownership_verification?.type?.toUpperCase() ?? 'TXT',
        verification_record_name: ch.ownership_verification?.name ?? null,
        verification_record_value: ch.ownership_verification?.value ?? null,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', d.id).select().single()
    return NextResponse.json({ domain: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CF status check failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, domainId } = await params

  const { data: domain } = await supabase
    .from('custom_domains').select('id, cf_custom_hostname_id')
    .eq('id', domainId).eq('project_id', projectId).eq('user_id', user.id).maybeSingle()
  if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const d = domain as { id: string; cf_custom_hostname_id?: string }
  if (d.cf_custom_hostname_id) {
    try {
      await deleteCustomHostname(d.cf_custom_hostname_id)
    } catch (err) {
      // Soft-fail on CF — still delete the row so user isn't blocked
      console.warn('[custom-domains] CF delete failed:', err instanceof Error ? err.message : err)
    }
  }

  await supabase.from('custom_domains').delete().eq('id', d.id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, domainId } = await params
  const body = await req.json() as { is_primary?: boolean }
  if (typeof body.is_primary !== 'boolean') {
    return NextResponse.json({ error: 'is_primary required' }, { status: 400 })
  }

  // If setting primary=true, clear other primaries first
  if (body.is_primary) {
    await supabase
      .from('custom_domains')
      .update({ is_primary: false })
      .eq('project_id', projectId).eq('user_id', user.id).neq('id', domainId)
  }

  const { data, error } = await supabase
    .from('custom_domains')
    .update({ is_primary: body.is_primary })
    .eq('id', domainId).eq('project_id', projectId).eq('user_id', user.id)
    .select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ domain: data })
}
