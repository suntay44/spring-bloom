/**
 * POST /api/projects/[id]/security/scan
 *   Body: { scan_type: 'quick' | 'in_depth', model_id?, provider? }
 *   Runs all relevant scanners, persists scan + findings, returns the scan row + findings.
 *
 * GET  /api/projects/[id]/security/scan
 *   Returns the most recent scan + its findings for this project.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runScan } from '@/lib/security/orchestrator'
import { aggregateCounts, type ScanType, type ScannerResult, type SecurityFindingDraft } from '@/lib/security/types'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  // Verify project ownership + get fly machine
  const { data: project } = await supabase
    .from('projects')
    .select('id, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json() as { scan_type?: ScanType; model_id?: string; provider?: string }
  const scanType: ScanType = body.scan_type === 'in_depth' ? 'in_depth' : 'quick'

  // Insert pending scan row immediately so the UI can show "running" state
  const { data: scanRow, error: insertErr } = await supabase
    .from('security_scans')
    .insert({
      project_id: projectId,
      user_id: user.id,
      scan_type: scanType,
      status: 'running',
    })
    .select()
    .single()

  if (insertErr || !scanRow) {
    return NextResponse.json({ error: 'Could not create scan record' }, { status: 500 })
  }

  // Run scanners — collect into a single drafts array
  const startedAt = Date.now()
  let results: ScannerResult[]
  try {
    results = await runScan({
      scanType,
      machineId: (project as { fly_machine_id?: string }).fly_machine_id ?? null,
      modelId: body.model_id,
      provider: body.provider,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scan failed'
    await supabase.from('security_scans')
      .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
      .eq('id', scanRow.id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Flatten drafts + persist
  const allDrafts: SecurityFindingDraft[] = results.flatMap(r => r.findings)
  const counts = aggregateCounts(allDrafts)

  if (allDrafts.length > 0) {
    await supabase.from('security_findings').insert(
      allDrafts.map(d => ({
        scan_id:        scanRow.id,
        project_id:     projectId,
        user_id:        user.id,
        scanner:        d.scanner,
        severity:       d.severity,
        category:       d.category,
        title:          d.title,
        description:    d.description ?? null,
        file_path:      d.file_path ?? null,
        line:           d.line ?? null,
        recommendation: d.recommendation ?? null,
        package_name:   d.package_name ?? null,
        advisory_id:    d.advisory_id ?? null,
        advisory_url:   d.advisory_url ?? null,
        blocks_deploy:  d.blocks_deploy ?? false,
      })),
    )
  }

  // Mark scan completed with aggregate counts
  const { data: completedScan } = await supabase
    .from('security_scans')
    .update({
      status: 'completed',
      ...counts,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanRow.id)
    .select()
    .single()

  const { data: findings } = await supabase
    .from('security_findings')
    .select('*')
    .eq('scan_id', scanRow.id)
    .order('severity', { ascending: true })

  return NextResponse.json({
    scan: completedScan,
    findings: findings ?? [],
    scanner_errors: results
      .filter(r => r.error)
      .map(r => ({ scanner: r.scanner, error: r.error })),
  })
}

// ─── GET — fetch latest scan ────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const { data: scan } = await supabase
    .from('security_scans')
    .select('*')
    .eq('project_id', projectId).eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!scan) return NextResponse.json({ scan: null, findings: [] })

  const { data: findings } = await supabase
    .from('security_findings')
    .select('*')
    .eq('scan_id', scan.id)
    .order('severity', { ascending: true })

  return NextResponse.json({ scan, findings: findings ?? [] })
}
