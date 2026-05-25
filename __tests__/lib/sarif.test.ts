import { describe, it, expect } from 'vitest'
import { buildSarifLog } from '@/lib/security/sarif'
import type { SecurityFinding } from '@/lib/security/types'

function makeFinding(over: Partial<SecurityFinding> = {}): SecurityFinding {
  return {
    id: 'f1', scan_id: 's1', project_id: 'p1', user_id: 'u1',
    scanner: 'rls', severity: 'critical', category: 'rls',
    title: 'Table todos has no RLS', description: 'Anyone can read.',
    file_path: 'supabase/migrations/001.sql', line: 42,
    recommendation: 'alter table todos enable row level security;',
    accepted_risk: false, accepted_at: null, accepted_note: null,
    created_at: '2026-05-25T00:00:00Z',
    ...over,
  }
}

describe('buildSarifLog', () => {
  it('produces a valid SARIF 2.1.0 envelope', () => {
    const log = buildSarifLog({ projectName: 'Test', findings: [makeFinding()] })
    expect(log.version).toBe('2.1.0')
    expect(log.$schema).toContain('sarif-2.1.0')
    expect(log.runs).toHaveLength(1)
    expect(log.runs[0]!.tool.driver.name).toBe('SpringBloom Security Scanner')
  })

  it('maps critical/high → error, medium → warning, low/info → note', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [
      makeFinding({ id: 'a', severity: 'critical' }),
      makeFinding({ id: 'b', severity: 'high' }),
      makeFinding({ id: 'c', severity: 'medium' }),
      makeFinding({ id: 'd', severity: 'low' }),
      makeFinding({ id: 'e', severity: 'info' }),
    ]})
    const levels = log.runs[0]!.results.map(r => r.level)
    expect(levels).toEqual(['error', 'error', 'warning', 'note', 'note'])
  })

  it('emits physicalLocation with file + line', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [makeFinding()] })
    const loc = log.runs[0]!.results[0]!.locations![0]!.physicalLocation
    expect(loc.artifactLocation.uri).toBe('supabase/migrations/001.sql')
    expect(loc.region?.startLine).toBe(42)
  })

  it('de-duplicates rules by scanner.category', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [
      makeFinding({ id: 'a' }),
      makeFinding({ id: 'b', title: 'Another RLS issue' }),
    ]})
    expect(log.runs[0]!.tool.driver.rules).toHaveLength(1)  // both share rls.rls
  })

  it('rule ID is scanner.category for stability', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [
      makeFinding({ scanner: 'dependency', category: 'dependency' }),
    ]})
    expect(log.runs[0]!.results[0]!.ruleId).toBe('dependency.dependency')
  })

  it('includes advisory URL as helpUri', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [
      makeFinding({
        scanner: 'dependency', category: 'dependency',
        advisory_url: 'https://github.com/advisories/GHSA-xxx',
      }),
    ]})
    expect(log.runs[0]!.tool.driver.rules[0]!.helpUri).toBe('https://github.com/advisories/GHSA-xxx')
  })

  it('properties preserve scanner + severity + accepted_risk', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [
      makeFinding({ scanner: 'code_review', accepted_risk: true }),
    ]})
    expect(log.runs[0]!.results[0]!.properties?.scanner).toBe('code_review')
    expect(log.runs[0]!.results[0]!.properties?.accepted_risk).toBe(true)
  })

  it('omits location when finding has no file_path', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [
      makeFinding({ file_path: undefined, line: undefined }),
    ]})
    expect(log.runs[0]!.results[0]!.locations).toBeUndefined()
  })

  it('handles empty findings array', () => {
    const log = buildSarifLog({ projectName: 'T', findings: [] })
    expect(log.runs[0]!.results).toEqual([])
    expect(log.runs[0]!.tool.driver.rules).toEqual([])
  })
})
