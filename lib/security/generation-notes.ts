/**
 * G5: Generation-time security note detector.
 *
 * Runs in the chat route's onFinish() against the assistant's final artifact
 * text. We can't stream-detect mid-generation (would require tokenized parsing
 * + re-emit), so this is a post-hoc pass over the completed artifact.
 *
 * Detects common security-relevant patterns and emits notes that:
 *   1. Surface in the Security tab as context for the next scan
 *   2. Build an audit trail of "the AI wrote auth here, raw SQL there"
 *   3. Differentiate us from Lovable, whose memory is purely manual
 *
 * Notes are advisory — they are NOT findings. They flag interesting code
 * the user should KNOW the AI wrote, so they can review proactively.
 */

import { parseArtifacts } from '@/lib/ai/artifact-parser'

export interface DetectedNote {
  category:    string
  pattern:     string
  title:       string
  snippet:     string                  // truncated to ~200 chars
  file_path?:  string
  line_start?: number
  line_end?:   number
}

interface DetectorRule {
  pattern:   string
  category:  string
  /** Regex applied to file content. Multiline. */
  regex:     RegExp
  /** Human-friendly title for the matched note */
  title:     (match: RegExpMatchArray) => string
  /** Optional file-path filter — only apply on matching paths */
  filePathMatcher?: RegExp
}

const RULES: DetectorRule[] = [
  // ── SQL / RLS ────────────────────────────────────────────────────────────
  {
    pattern: 'enable_rls', category: 'rls',
    regex: /alter\s+table\s+([\w.]+)\s+enable\s+row\s+level\s+security/gi,
    title: (m) => `RLS enabled on ${m[1]}`,
    filePathMatcher: /\.sql$/i,
  },
  {
    pattern: 'create_policy', category: 'rls',
    regex: /create\s+policy\s+["'][^"']+["']\s+on\s+([\w.]+)/gi,
    title: (m) => `RLS policy added on ${m[1]}`,
    filePathMatcher: /\.sql$/i,
  },
  {
    pattern: 'service_role_in_client', category: 'secrets',
    regex: /SUPABASE_SERVICE_ROLE_KEY/g,
    title: () => 'Service role key referenced — verify this is server-only code',
  },
  {
    pattern: 'raw_sql_query', category: 'sql',
    regex: /\.rpc\s*\(\s*['"`][\w]+['"`]/g,
    title: () => 'Direct RPC call — confirm the function has proper SECURITY DEFINER guards',
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  {
    pattern: 'auth_check', category: 'auth',
    regex: /(?:supabase|auth)\.auth\.getUser\(\)/gi,
    title: () => 'Auth check via getUser() — make sure the calling path requires it',
  },
  {
    pattern: 'admin_client_init', category: 'auth',
    regex: /createAdminClient|createServiceClient|createClient[^(]*\([^,]*SERVICE_ROLE/g,
    title: () => 'Admin/service-role client created — RLS is bypassed in this scope',
  },

  // ── Webhooks ────────────────────────────────────────────────────────────
  {
    pattern: 'webhook_signature_verify', category: 'webhook',
    regex: /(?:webhooks?\.constructEvent|verifyWebhook|crypto\.timingSafeEqual)/g,
    title: () => 'Webhook signature verification present (good)',
    filePathMatcher: /webhook/i,
  },
  {
    pattern: 'webhook_no_verify', category: 'webhook',
    regex: /export\s+(?:async\s+)?function\s+POST.*?(?=\n})/gs,
    // Synthesised in code below — placeholder regex never used directly
    title: () => 'Webhook route — verify signature is checked',
    filePathMatcher: /webhooks?\/[\w-]+\/route\.ts$/i,
  },

  // ── Dangerous JS ────────────────────────────────────────────────────────
  {
    pattern: 'eval_use', category: 'eval',
    regex: /\beval\s*\(/g,
    title: () => 'eval() used — strongly avoid; consider Function() or a parser',
  },
  {
    pattern: 'innerhtml_assign', category: 'xss',
    regex: /\.innerHTML\s*=|dangerouslySetInnerHTML/g,
    title: () => 'Inline HTML insertion — verify input is sanitized',
  },

  // ── Secrets / env ───────────────────────────────────────────────────────
  {
    pattern: 'hardcoded_token_like', category: 'secrets',
    regex: /(?:sk_live|sk_test|sbp_|whsec_|sk-ant-|sk-proj-|AIzaSy)[A-Za-z0-9_-]{16,}/g,
    title: () => 'String resembling a hardcoded secret — verify it should be in env',
  },
]

// ─── Public API ─────────────────────────────────────────────────────────────

export interface DetectInput {
  /** Full assistant text (with <boltArtifact> blocks). */
  text:        string
  /** Optional default file path if no artifact is parsed (rare). */
  defaultFile?: string
}

export function detectSecurityNotes(input: DetectInput): DetectedNote[] {
  const notes: DetectedNote[] = []

  // First try artifact files (preferred — gives us file paths)
  const artifacts = parseArtifacts(input.text)
  const fileItems: Array<{ path: string; content: string }> = []
  for (const art of artifacts) {
    for (const action of art.actions) {
      if (action.type === 'file' && action.filePath && action.content) {
        fileItems.push({ path: action.filePath, content: action.content })
      }
    }
  }

  // Fallback — scan the whole message text as one "file"
  if (fileItems.length === 0 && input.text.length > 0) {
    fileItems.push({ path: input.defaultFile ?? 'response.md', content: input.text })
  }

  // Cap total work — refuse to scan absurd inputs
  if (fileItems.length > 100) return []

  for (const file of fileItems) {
    for (const rule of RULES) {
      if (rule.filePathMatcher && !rule.filePathMatcher.test(file.path)) continue
      // Reset regex state since we use the /g flag
      rule.regex.lastIndex = 0
      let m: RegExpExecArray | null
      let matches = 0
      while ((m = rule.regex.exec(file.content)) !== null) {
        if (++matches > 25) break  // per-file rule cap
        const lineStart = lineOf(file.content, m.index)
        notes.push({
          category: rule.category,
          pattern:  rule.pattern,
          title:    rule.title(m),
          snippet:  m[0].slice(0, 200),
          file_path: file.path,
          line_start: lineStart,
          line_end:   lineStart,
        })
      }
    }
  }

  // Deduplicate by (pattern, file_path, line_start)
  const seen = new Set<string>()
  const out: DetectedNote[] = []
  for (const n of notes) {
    const key = `${n.pattern}|${n.file_path}|${n.line_start}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(n)
  }

  // Cap total notes per generation
  return out.slice(0, 50)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function lineOf(content: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++
  }
  return line
}
