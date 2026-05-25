/**
 * SARIF (Static Analysis Results Interchange Format) 2.1.0 exporter.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/
 *
 * GitHub Code Scanning, Semgrep, CodeQL, SonarQube, and most major DevSecOps
 * tools accept SARIF as the universal interchange. Letting devs export their
 * SpringBloom scan results means they can:
 *   - Upload to GitHub Code Scanning (Security tab → Annotations on PRs)
 *   - Pipe into Semgrep / CodeQL workflows
 *   - Aggregate with their existing SAST/DAST results
 *
 * This is a Lovable can't-do: Lovable's security view is closed.
 */

import type { SecurityFinding, Scanner, Severity } from './types'

// ─── Type aliases (subset of full SARIF schema) ─────────────────────────────

interface SarifLog {
  version:  '2.1.0'
  $schema:  string
  runs:     SarifRun[]
}

interface SarifRun {
  tool: {
    driver: {
      name:           string
      version:        string
      informationUri: string
      rules:          SarifRule[]
    }
  }
  results: SarifResult[]
}

interface SarifRule {
  id:        string
  name:      string
  shortDescription: { text: string }
  fullDescription?: { text: string }
  helpUri?:  string
  defaultConfiguration?: { level: SarifLevel }
}

interface SarifResult {
  ruleId:    string
  level:     SarifLevel
  message:   { text: string }
  locations?: Array<{
    physicalLocation: {
      artifactLocation: { uri: string }
      region?: { startLine: number }
    }
  }>
  properties?: {
    scanner?:       Scanner
    severity?:      Severity
    accepted_risk?: boolean
    package?:       string
    advisory?:      string
  }
}

type SarifLevel = 'none' | 'note' | 'warning' | 'error'

// ─── Severity / scanner mapping ─────────────────────────────────────────────

function levelFor(severity: Severity): SarifLevel {
  switch (severity) {
    case 'critical':
    case 'high':     return 'error'
    case 'medium':   return 'warning'
    case 'low':      return 'note'
    case 'info':     return 'note'
  }
}

const SCANNER_NAMES: Record<Scanner, string> = {
  rls:         'SpringBloom-RLS',
  database:    'SpringBloom-Database',
  dependency:  'SpringBloom-Dependency',
  code_review: 'SpringBloom-AI-Code-Review',
}

// ─── Builder ────────────────────────────────────────────────────────────────

export interface BuildSarifInput {
  projectName: string
  findings:    SecurityFinding[]
  scanId?:     string
  /** SpringBloom build/version string for traceability */
  version?:    string
}

export function buildSarifLog(input: BuildSarifInput): SarifLog {
  const rules = collectRules(input.findings)
  const results: SarifResult[] = input.findings.map(f => ({
    ruleId:  ruleIdFor(f),
    level:   levelFor(f.severity),
    message: { text: f.description ?? f.title },
    locations: f.file_path ? [{
      physicalLocation: {
        artifactLocation: { uri: f.file_path },
        ...(f.line ? { region: { startLine: f.line } } : {}),
      },
    }] : undefined,
    properties: {
      scanner:       f.scanner,
      severity:      f.severity,
      accepted_risk: f.accepted_risk,
      package:       f.package_name ?? undefined,
      advisory:      f.advisory_id ?? undefined,
    },
  }))

  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name:           'SpringBloom Security Scanner',
          version:        input.version ?? '1.0.0',
          informationUri: 'https://springbloom.app',
          rules,
        },
      },
      results,
    }],
  }
}

// ─── Internals ──────────────────────────────────────────────────────────────

function ruleIdFor(f: SecurityFinding): string {
  // ID shape: scanner.category — stable across runs for the same finding type
  return `${f.scanner}.${f.category}`
}

function collectRules(findings: SecurityFinding[]): SarifRule[] {
  const seen = new Map<string, SarifRule>()
  for (const f of findings) {
    const id = ruleIdFor(f)
    if (seen.has(id)) continue
    seen.set(id, {
      id,
      name: `${SCANNER_NAMES[f.scanner]} · ${f.category}`,
      shortDescription: { text: f.title.slice(0, 200) },
      fullDescription:  f.recommendation ? { text: f.recommendation } : undefined,
      helpUri: f.advisory_url ?? undefined,
      defaultConfiguration: { level: levelFor(f.severity) },
    })
  }
  return Array.from(seen.values())
}
