/**
 * Security Scan Orchestrator
 *
 * Coordinates the three scanners and returns merged ScannerResult[].
 *
 *   quick    → RLS + dependency audit (static + npm audit, no AI)
 *   in_depth → quick + AI code review (Claude Haiku)
 */

import { execOnMachine } from '@/lib/fly/client'
import { scanRls } from './scanners/rls'
import { scanDependencies } from './scanners/deps'
import { scanCodeReview } from './scanners/code-review'
import type { ScanType, ScannerResult } from './types'

export interface OrchestratorInput {
  scanType:   ScanType
  machineId:  string | null            // null = skip scanners that need machine access
  modelId?:   string                   // override for AI scanners
  provider?:  string
}

export async function runScan(input: OrchestratorInput): Promise<ScannerResult[]> {
  const results: ScannerResult[] = []

  // ── Always: fetch project files from the Fly machine ──
  let migrations: Record<string, string> = {}
  let sourceFiles: Record<string, string> = {}
  if (input.machineId) {
    try {
      [migrations, sourceFiles] = await Promise.all([
        fetchMigrations(input.machineId),
        input.scanType === 'in_depth' ? fetchSourceFiles(input.machineId) : Promise.resolve({}),
      ])
    } catch (err) {
      // Non-fatal — individual scanners will report empty findings if they have no input
      console.warn('[security] file fetch failed:', err)
    }
  }

  // ── RLS scan (always) ──
  results.push(scanRls({ migrations }))

  // ── Dependency audit (always, but needs machine) ──
  if (input.machineId) {
    results.push(await scanDependencies({ machineId: input.machineId }))
  } else {
    results.push({
      scanner: 'dependency', findings: [], duration_ms: 0,
      error: 'No Fly machine available — start your project preview to run dependency audit',
    })
  }

  // ── AI code review (in_depth only) ──
  if (input.scanType === 'in_depth') {
    if (Object.keys(sourceFiles).length === 0) {
      results.push({
        scanner: 'code_review', findings: [], duration_ms: 0,
        error: 'No source files available for review',
      })
    } else {
      results.push(await scanCodeReview({
        files: sourceFiles,
        modelId: input.modelId,
        provider: input.provider,
      }))
    }
  }

  return results
}

// ─── File fetchers ──────────────────────────────────────────────────────────

async function fetchMigrations(machineId: string): Promise<Record<string, string>> {
  // Find all .sql files under supabase/migrations or db/migrations
  try {
    const find = await execOnMachine(
      machineId,
      ['sh', '-c', 'find /app/supabase/migrations /app/db/migrations -type f -name "*.sql" 2>/dev/null || true'],
      '/app', 15,
    )
    const paths = find.stdout.split('\n').filter(Boolean)
    if (paths.length === 0) return {}

    const out: Record<string, string> = {}
    for (const path of paths.slice(0, 50)) {  // cap to 50 files
      try {
        const cat = await execOnMachine(machineId, ['cat', path], '/app', 5)
        out[path.replace('/app/', '')] = cat.stdout
      } catch { /* skip individual file failures */ }
    }
    return out
  } catch {
    return {}
  }
}

async function fetchSourceFiles(machineId: string): Promise<Record<string, string>> {
  // Pull TS/JS source files; skip node_modules, .next, build outputs
  try {
    const find = await execOnMachine(
      machineId,
      ['sh', '-c',
        `find /app \\( -name node_modules -o -name .next -o -name dist -o -name .git \\) -prune -o ` +
        `-type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \\) -print 2>/dev/null | head -200`,
      ],
      '/app', 15,
    )
    const paths = find.stdout.split('\n').filter(Boolean)
    if (paths.length === 0) return {}

    const out: Record<string, string> = {}
    for (const path of paths) {
      try {
        const cat = await execOnMachine(machineId, ['cat', path], '/app', 5)
        out[path.replace('/app/', '')] = cat.stdout
      } catch { /* skip */ }
    }
    return out
  } catch {
    return {}
  }
}
