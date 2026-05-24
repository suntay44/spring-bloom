/**
 * GET  /api/projects/[id]/domains          → list domains
 * POST /api/projects/[id]/domains          → add domain (creates CF custom hostname)
 *   Body: { hostname: string, is_primary?: boolean }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomHostname, normalizeStatus } from '@/lib/cloudflare/custom-hostnames'

const HOSTNAME_RE = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})+$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: domains } = await supabase
    .from('custom_domains')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ domains: domains ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as { hostname?: string; is_primary?: boolean }
  const hostname = body.hostname?.trim().toLowerCase() ?? ''

  if (!hostname || !HOSTNAME_RE.test(hostname)) {
    return NextResponse.json({ error: 'Invalid hostname' }, { status: 400 })
  }

  // Verify ownership
  const { data: project } = await supabase
    .from('projects').select('id, slug').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check duplicate
  const { data: existing } = await supabase
    .from('custom_domains').select('id').eq('project_id', projectId).eq('hostname', hostname).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Hostname already added' }, { status: 409 })

  // Create on Cloudflare
  let ch
  try {
    ch = await createCustomHostname(hostname)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CF create failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const status = normalizeStatus(ch)

  // Persist
  const { data: domain, error } = await supabase
    .from('custom_domains')
    .insert({
      project_id: projectId,
      user_id:    user.id,
      hostname,
      cf_custom_hostname_id: ch.id,
      verification_record_type:  ch.ownership_verification?.type?.toUpperCase() ?? 'TXT',
      verification_record_name:  ch.ownership_verification?.name ?? null,
      verification_record_value: ch.ownership_verification?.value ?? null,
      dns_status: status.dns_status,
      ssl_status: status.ssl_status,
      last_status_message: status.message ?? null,
      is_primary: !!body.is_primary,
      last_checked_at: new Date().toISOString(),
    })
    .select().single()

  if (error || !domain) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({
    domain,
    cname_target: (project as { slug?: string }).slug
      ? `${(project as { slug: string }).slug}.springbloom.app`
      : 'app.springbloom.app',
  })
}
