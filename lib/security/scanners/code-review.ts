/**
 * AI Code Review Scanner — the "in-depth" half of a scan.
 *
 * Reads up to N high-signal files from the project (API routes, auth handlers,
 * webhook handlers) and asks Claude Haiku to produce structured findings.
 *
 * Cost: ~1 credit per scan. Manual trigger only — never auto-run.
 */

import { generateText } from 'ai'
import { resolveModel } from '@/lib/ai/providers'
import type { ScannerResult, SecurityFindingDraft, Severity, Category } from '../types'

// File priority — these patterns are most likely to contain auth, secrets,
// or DB queries that need a security eye.
const HIGH_PRIORITY_PATTERNS = [
  /\/api\/.*\/route\.(ts|js)$/,
  /\/middleware\.(ts|js)$/,
  /\/webhooks?\/.*\.(ts|js)$/,
  /\/auth\/.*\.(ts|js)$/,
  /\/lib\/.*supabase.*\.(ts|js)$/,
  /\/lib\/.*stripe.*\.(ts|js)$/,
  /\/lib\/.*auth.*\.(ts|js)$/,
]

// Files we never need to scan
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next\//,
  /\.git\//,
  /\.test\.(ts|tsx|js)$/,
  /\.spec\.(ts|tsx|js)$/,
  /\/__tests__\//,
]

const MAX_FILES        = 12      // hard cap to bound token usage
const MAX_BYTES_PER_FILE = 16_000  // ~4k tokens per file
const MAX_TOTAL_BYTES  = 120_000  // ~30k tokens total context

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior application security engineer reviewing a generated web app for HIGH-CONFIDENCE security vulnerabilities only.

Rules:
- Only flag CONCRETE vulnerabilities — not theoretical or style issues.
- DO NOT flag: missing rate limiting, DOS, hardening recommendations, lack of audit logs, regex DOS, log spoofing.
- DO NOT report React/Next XSS unless dangerouslySetInnerHTML is used.
- Focus on: SQL injection, command injection, missing auth checks, IDOR, secret exposure in API responses,
  hardcoded credentials, JWT misuse, RLS bypass via service role in client code, SSRF (host/protocol control only),
  path traversal, missing webhook signature verification, missing CSRF for state-changing requests.

Output ONLY a single JSON object with this exact shape (no markdown, no preamble):
{
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "category": "auth|secrets|validation|injection|xss|cors|env|other",
      "title": "Short title (under 80 chars)",
      "description": "1-2 sentences explaining the vulnerability and exploit path",
      "file_path": "relative/path/to/file.ts",
      "line": 42,
      "recommendation": "Concrete one-line fix"
    }
  ]
}

If you find no concrete vulnerabilities, return: { "findings": [] }.
Be conservative — false positives erode trust.`

// ─── Main entry point ───────────────────────────────────────────────────────

export interface CodeReviewInput {
  /** Map of file path (relative) → file contents */
  files: Record<string, string>
  /** Model ID to use. Defaults to Haiku for cost efficiency */
  modelId?: string
  provider?: string
}

export async function scanCodeReview(input: CodeReviewInput): Promise<ScannerResult> {
  const start = Date.now()
  const modelId  = input.modelId  ?? 'claude-haiku-4-5'
  const provider = input.provider ?? 'anthropic'

  try {
    const model = resolveModel(modelId, provider)
    if (!model) {
      return {
        scanner: 'code_review', findings: [], duration_ms: Date.now() - start,
        error: `Model ${provider}/${modelId} not available`,
      }
    }

    // Prioritize + truncate files to bound token usage
    const selected = selectFiles(input.files)
    if (selected.length === 0) {
      return {
        scanner: 'code_review', findings: [], duration_ms: Date.now() - start,
        error: 'No source files matched scan patterns',
      }
    }

    const fileBlock = selected
      .map(([path, content]) => `--- ${path} ---\n${content}`)
      .join('\n\n')

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `Review these files for security vulnerabilities. Return JSON only.\n\n${fileBlock}`,
      maxOutputTokens: 1500,
      temperature: 0.1,
    })

    const findings = parseFindings(text)
    return {
      scanner: 'code_review',
      findings,
      duration_ms: Date.now() - start,
    }
  } catch (err) {
    return {
      scanner: 'code_review', findings: [], duration_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'code review failed',
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function selectFiles(files: Record<string, string>): Array<[string, string]> {
  // Tier 1 — high-priority patterns
  const tier1: Array<[string, string]> = []
  // Tier 2 — anything else not skipped
  const tier2: Array<[string, string]> = []

  for (const [path, content] of Object.entries(files)) {
    if (SKIP_PATTERNS.some(re => re.test(path))) continue
    if (HIGH_PRIORITY_PATTERNS.some(re => re.test(path))) tier1.push([path, content])
    else tier2.push([path, content])
  }

  const ordered = [...tier1, ...tier2].slice(0, MAX_FILES)

  let totalBytes = 0
  const result: Array<[string, string]> = []
  for (const [path, content] of ordered) {
    const truncated = content.length > MAX_BYTES_PER_FILE
      ? content.slice(0, MAX_BYTES_PER_FILE) + '\n/* …truncated… */'
      : content
    if (totalBytes + truncated.length > MAX_TOTAL_BYTES) break
    totalBytes += truncated.length
    result.push([path, truncated])
  }
  return result
}

interface ParsedFinding {
  severity?: string; category?: string; title?: string; description?: string
  file_path?: string; line?: number; recommendation?: string
}

function parseFindings(text: string): SecurityFindingDraft[] {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return []
  let parsed: { findings?: ParsedFinding[] }
  try {
    parsed = JSON.parse(match[0]) as { findings?: ParsedFinding[] }
  } catch {
    return []
  }
  const raw = Array.isArray(parsed.findings) ? parsed.findings : []
  return raw
    .filter((f): f is ParsedFinding =>
      !!f && typeof f.title === 'string' && typeof f.severity === 'string')
    .map(f => ({
      scanner:        'code_review' as const,
      severity:       normalizeSeverity(f.severity),
      category:       normalizeCategory(f.category),
      title:          f.title!.slice(0, 200),
      description:    typeof f.description === 'string' ? f.description : undefined,
      file_path:      typeof f.file_path === 'string' ? f.file_path : undefined,
      line:           typeof f.line === 'number' ? f.line : undefined,
      recommendation: typeof f.recommendation === 'string' ? f.recommendation : undefined,
      blocks_deploy:  f.severity === 'critical',
    }))
}

function normalizeSeverity(s?: string): Severity {
  const lower = (s ?? '').toLowerCase()
  if (lower === 'critical' || lower === 'high' || lower === 'medium' || lower === 'low') return lower
  return 'info'
}

function normalizeCategory(c?: string): Category {
  const lower = (c ?? '').toLowerCase()
  const allowed: Category[] = ['rls','secrets','validation','auth','cors','dependency','env','injection','xss','other']
  return (allowed as string[]).includes(lower) ? lower as Category : 'other'
}
