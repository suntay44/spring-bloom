/**
 * Dependency Audit
 *
 * Runs `npm audit --json` inside the project's Fly.io machine and converts
 * the npm advisory output into our SecurityFinding shape.
 *
 * Cost: $0 — npm audit consults the public registry's advisory DB.
 *
 * If npm audit fails (e.g., no package-lock.json), we fall back to a "skipped"
 * result rather than throwing — the project might be new and not have deps yet.
 */

import { execOnMachine } from '@/lib/fly/client'
import type { ScannerResult, SecurityFindingDraft, Severity } from '../types'

// npm audit JSON shape (partial — only the fields we use)
interface NpmAuditOutput {
  vulnerabilities?: Record<string, NpmVuln>
  metadata?: {
    vulnerabilities?: {
      critical?: number
      high?: number
      moderate?: number
      low?: number
      info?: number
      total?: number
    }
  }
  // Older npm v6 shape — we ignore it; npm v7+ has been default for years
}

interface NpmVuln {
  name?:        string
  severity?:    string                  // 'info' | 'low' | 'moderate' | 'high' | 'critical'
  via?:         (string | NpmAdvisory)[]
  fixAvailable?: boolean | { name: string; version: string }
  range?:       string
}

interface NpmAdvisory {
  source?:  number | string
  name?:    string
  url?:     string
  title?:   string
  severity?: string
  cwe?:     string[]
  cvss?:    { score: number }
  range?:   string
}

// ─── Severity mapping ───────────────────────────────────────────────────────

function mapSeverity(npmSeverity?: string): Severity {
  switch (npmSeverity) {
    case 'critical': return 'critical'
    case 'high':     return 'high'
    case 'moderate': return 'medium'
    case 'low':      return 'low'
    default:         return 'info'
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────

export interface DepsScanInput {
  machineId: string
  /** Working directory inside the machine. Defaults to /app */
  cwd?: string
  /** Max seconds for npm audit to finish. Defaults to 45. */
  timeoutSec?: number
}

export async function scanDependencies(input: DepsScanInput): Promise<ScannerResult> {
  const start = Date.now()
  const cwd = input.cwd ?? '/app'

  try {
    // npm audit exits non-zero when vulns are found — that's expected, not an error.
    // We tell exec to ignore exit code by wrapping in `|| true`.
    const result = await execOnMachine(
      input.machineId,
      ['sh', '-c', 'cd "$1" && npm audit --json || true', '--', cwd],
      cwd,
      input.timeoutSec ?? 45,
    )

    if (!result.stdout.trim()) {
      // Empty output — likely no package-lock.json
      return {
        scanner: 'dependency',
        findings: [],
        duration_ms: Date.now() - start,
        error: 'No npm audit output (project may not have a lockfile yet)',
      }
    }

    let parsed: NpmAuditOutput
    try {
      parsed = JSON.parse(result.stdout) as NpmAuditOutput
    } catch {
      return {
        scanner: 'dependency',
        findings: [],
        duration_ms: Date.now() - start,
        error: `Failed to parse npm audit output: ${result.stderr.slice(0, 200)}`,
      }
    }

    const findings: SecurityFindingDraft[] = []

    for (const [pkgName, vuln] of Object.entries(parsed.vulnerabilities ?? {})) {
      // Pull the first usable advisory from the `via` array (rest are transitive)
      const advisory = (vuln.via ?? []).find(v => typeof v === 'object') as NpmAdvisory | undefined
      const severity = mapSeverity(vuln.severity ?? advisory?.severity)
      const advisoryId  = advisory?.source ? `GHSA-${advisory.source}` : undefined
      const advisoryUrl = advisory?.url ?? `https://www.npmjs.com/advisories?search=${pkgName}`
      const fixHint = vuln.fixAvailable
        ? (typeof vuln.fixAvailable === 'boolean'
            ? `Run \`npm audit fix\``
            : `Upgrade ${vuln.fixAvailable.name} to ${vuln.fixAvailable.version} (\`npm audit fix\`)`)
        : `No automatic fix available — consider replacing ${pkgName} or pinning a safe version`

      findings.push({
        scanner:  'dependency',
        severity,
        category: 'dependency',
        title:    advisory?.title
          ? `${pkgName}: ${advisory.title}`
          : `Vulnerable dependency: ${pkgName} (${vuln.range ?? 'unknown range'})`,
        description: advisory?.title
          ? `${pkgName} ${vuln.range ?? ''} has a known advisory. CVSS: ${advisory.cvss?.score ?? 'n/a'}.`
          : `npm flagged ${pkgName} as having a known vulnerability.`,
        recommendation: fixHint,
        package_name:   pkgName,
        advisory_id:    advisoryId,
        advisory_url:   advisoryUrl,
        blocks_deploy:  severity === 'critical',
      })
    }

    return {
      scanner: 'dependency',
      findings,
      duration_ms: Date.now() - start,
    }
  } catch (err) {
    return {
      scanner: 'dependency',
      findings: [],
      duration_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'npm audit execution failed',
    }
  }
}
