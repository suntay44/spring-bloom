// Shared types for the SpringBloom security scanner.
//
// A "scan" runs one or more scanners. Each scanner returns ScannerResult.
// The orchestrator merges all results into a SecurityScan + SecurityFinding[].

export type ScanType   = 'quick' | 'in_depth'
export type ScanStatus = 'running' | 'completed' | 'failed'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type Scanner =
  | 'rls'           // static SQL analysis
  | 'database'      // unsafe DB patterns (SECURITY DEFINER, public schema, etc.)
  | 'dependency'    // npm audit
  | 'code_review'   // AI-driven code review (in_depth only)

export type Category =
  | 'rls'
  | 'secrets'
  | 'validation'
  | 'auth'
  | 'cors'
  | 'dependency'
  | 'env'
  | 'injection'
  | 'xss'
  | 'other'

// ─── Finding (what each scanner produces, before DB insert) ─────────────────

export interface SecurityFindingDraft {
  scanner:       Scanner
  severity:      Severity
  category:      Category
  title:         string
  description?:  string
  file_path?:    string
  line?:         number
  recommendation?: string
  // Dependency-specific
  package_name?: string
  advisory_id?:  string
  advisory_url?: string
  blocks_deploy?: boolean
}

// ─── DB row shapes ──────────────────────────────────────────────────────────

export interface SecurityScan {
  id:             string
  project_id:     string
  user_id:        string
  scan_type:      ScanType
  status:         ScanStatus
  source_hash:    string | null
  findings_count: number
  critical_count: number
  high_count:     number
  medium_count:   number
  low_count:      number
  error_message:  string | null
  duration_ms:    number | null
  created_at:     string
  completed_at:   string | null
}

export interface SecurityFinding extends SecurityFindingDraft {
  id:            string
  scan_id:       string
  project_id:    string
  user_id:       string
  accepted_risk: boolean
  accepted_at:   string | null
  accepted_note: string | null
  created_at:    string
}

// ─── Scanner result envelope ────────────────────────────────────────────────

export interface ScannerResult {
  scanner:      Scanner
  findings:     SecurityFindingDraft[]
  duration_ms:  number
  // If the scanner failed entirely, set error; otherwise leave undefined.
  error?:       string
}

// ─── Convenience: derive aggregate counts from drafts ───────────────────────

export function aggregateCounts(findings: SecurityFindingDraft[]) {
  let critical = 0, high = 0, medium = 0, low = 0
  for (const f of findings) {
    if      (f.severity === 'critical') critical++
    else if (f.severity === 'high')     high++
    else if (f.severity === 'medium')   medium++
    else if (f.severity === 'low')      low++
  }
  return {
    findings_count: findings.length,
    critical_count: critical,
    high_count:     high,
    medium_count:   medium,
    low_count:      low,
  }
}
