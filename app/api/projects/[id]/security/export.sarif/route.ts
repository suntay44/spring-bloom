/**
 * GET /api/projects/[id]/security/export.sarif
 *
 * Returns the most recent security scan's findings as SARIF 2.1.0 JSON.
 * Uploadable to:
 *   - GitHub Code Scanning (Security tab, PR annotations)
 *   - Semgrep, CodeQL, SonarQube, etc.
 *
 * Query params:
 *   ?scan_id=...  — export a specific scan instead of the latest
 *   ?include_accepted=1 — include findings marked as accepted risk (default: exclude)
 *
 * Response: application/sarif+json with Content-Disposition: attachment
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSarifLog } from '@/lib/security/sarif'
import type { SecurityFinding } from '@/lib/security/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const url = new URL(req.url)
  const scanId          = url.searchParams.get('scan_id')
  const includeAccepted = url.searchParams.get('include_accepted') === '1'

  const { data: project } = await supabase
    .from('projects').select('id, name')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Resolve the scan to export
  let resolvedScanId = scanId
  if (!resolvedScanId) {
    const { data: latest } = await supabase
      .from('security_scans').select('id')
      .eq('project_id', projectId).eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()
    resolvedScanId = (latest as { id?: string } | null)?.id ?? null
  }

  if (!resolvedScanId) {
    return NextResponse.json({ error: 'No scans found for this project' }, { status: 404 })
  }

  // Load findings
  let query = supabase
    .from('security_findings').select('*')
    .eq('scan_id', resolvedScanId)
  if (!includeAccepted) query = query.eq('accepted_risk', false)

  const { data: findingsRaw } = await query
  const findings = (findingsRaw ?? []) as SecurityFinding[]

  const proj = project as { id: string; name: string }
  const sarif = buildSarifLog({
    projectName: proj.name,
    findings,
    scanId: resolvedScanId,
  })

  // Slugify project name for the filename
  const slug = proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
  const filename = `${slug}-security-${resolvedScanId.slice(0, 8)}.sarif`

  return new NextResponse(JSON.stringify(sarif, null, 2), {
    headers: {
      'Content-Type':        'application/sarif+json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
