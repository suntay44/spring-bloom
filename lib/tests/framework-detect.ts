/**
 * Framework detection — looks at the project's package.json to figure out
 * which test runner to invoke. Used by the test runner panel + scaffolds.
 */

export type TestFramework = 'vitest' | 'jest' | 'playwright' | 'bun' | 'mocha' | 'unknown'

export interface DetectedFramework {
  framework: TestFramework
  command:   string
  reason:    string                    // human-readable: "vitest in devDependencies"
}

/**
 * Inspect a package.json string and return the best test invocation.
 * Order of preference: explicit `test` script → known deps → fallback.
 */
export function detectTestFramework(packageJsonRaw: string): DetectedFramework {
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(packageJsonRaw) as Record<string, unknown>
  } catch {
    return { framework: 'unknown', command: 'npm test', reason: 'package.json unparseable' }
  }

  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {}
  const allDeps = {
    ...(pkg.dependencies as Record<string, string> | undefined ?? {}),
    ...(pkg.devDependencies as Record<string, string> | undefined ?? {}),
  }

  // 1. Honor explicit `test` script if it points to a known runner
  const testScript = scripts.test
  if (testScript) {
    if (/vitest/.test(testScript))    return { framework: 'vitest',     command: 'npm test', reason: `scripts.test runs vitest` }
    if (/playwright/.test(testScript)) return { framework: 'playwright', command: 'npm test', reason: `scripts.test runs playwright` }
    if (/jest/.test(testScript))      return { framework: 'jest',       command: 'npm test', reason: `scripts.test runs jest` }
    if (/bun\s+test/.test(testScript)) return { framework: 'bun',        command: 'npm test', reason: `scripts.test runs bun test` }
    if (/mocha/.test(testScript))     return { framework: 'mocha',      command: 'npm test', reason: `scripts.test runs mocha` }
  }

  // 2. Detect by deps
  if (allDeps.vitest)               return { framework: 'vitest',     command: 'npx vitest run',     reason: 'vitest in deps' }
  if (allDeps['@playwright/test'])  return { framework: 'playwright', command: 'npx playwright test', reason: '@playwright/test in deps' }
  if (allDeps.jest)                 return { framework: 'jest',       command: 'npx jest',            reason: 'jest in deps' }
  if (allDeps.mocha)                return { framework: 'mocha',      command: 'npx mocha',           reason: 'mocha in deps' }
  if (allDeps.bun)                  return { framework: 'bun',        command: 'bun test',            reason: 'bun in deps' }

  // 3. Fallback
  return { framework: 'unknown', command: testScript ? 'npm test' : 'echo "no test script"', reason: 'no recognized test framework' }
}

// ─── Output parser ──────────────────────────────────────────────────────────
// Best-effort: extract passed/failed/skipped counts so the UI can show a
// summary without us re-running. Per-framework heuristics.

export interface TestStats {
  passed:  number
  failed:  number
  skipped: number
}

export function parseTestStats(framework: TestFramework, output: string): TestStats {
  const out: TestStats = { passed: 0, failed: 0, skipped: 0 }

  if (framework === 'vitest') {
    // " Tests  10 passed (10)" / " Tests  3 failed | 7 passed (10)"
    const m = output.match(/Tests\s+(.*?\([\d]+\))/i)
    if (m) {
      const passed  = m[1]!.match(/(\d+)\s+passed/i)?.[1]
      const failed  = m[1]!.match(/(\d+)\s+failed/i)?.[1]
      const skipped = m[1]!.match(/(\d+)\s+skipped/i)?.[1]
      if (passed)  out.passed  = parseInt(passed)
      if (failed)  out.failed  = parseInt(failed)
      if (skipped) out.skipped = parseInt(skipped)
    }
    return out
  }

  if (framework === 'jest') {
    // "Tests:       5 failed, 17 passed, 22 total"
    const passed  = output.match(/(\d+)\s+passed/i)?.[1]
    const failed  = output.match(/(\d+)\s+failed/i)?.[1]
    const skipped = output.match(/(\d+)\s+skipped/i)?.[1]
    if (passed)  out.passed  = parseInt(passed)
    if (failed)  out.failed  = parseInt(failed)
    if (skipped) out.skipped = parseInt(skipped)
    return out
  }

  if (framework === 'playwright') {
    // "  6 passed (3.2s)" / "  2 failed"
    const passed  = output.match(/(\d+)\s+passed/i)?.[1]
    const failed  = output.match(/(\d+)\s+failed/i)?.[1]
    const skipped = output.match(/(\d+)\s+skipped/i)?.[1]
    if (passed)  out.passed  = parseInt(passed)
    if (failed)  out.failed  = parseInt(failed)
    if (skipped) out.skipped = parseInt(skipped)
    return out
  }

  // Generic fallback
  const passed = output.match(/(\d+)\s+passed/i)?.[1]
  if (passed) out.passed = parseInt(passed)
  const failed = output.match(/(\d+)\s+failed/i)?.[1]
  if (failed) out.failed = parseInt(failed)

  return out
}
