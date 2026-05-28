/**
 * R6-3: GitHub snippet import (public — no OAuth, no cost).
 *
 * Accepts any of:
 *   - raw file URL: https://raw.githubusercontent.com/owner/repo/main/AGENTS.md
 *   - blob file URL: https://github.com/owner/repo/blob/main/.cursorrules
 *   - repo URL:      https://github.com/owner/repo  (we look for known files)
 *   - gist URL:      https://gist.github.com/owner/id
 *
 * Returns parsed candidate snippets. Uses the public GitHub API / raw host —
 * unauthenticated (60 req/hr/IP, plenty for occasional imports). OAuth for
 * private repos is a future add — this covers the 90% case at $0.
 */

export interface ImportedSnippet {
  suggestedTrigger: string
  label:            string
  body:             string
  sourceUrl:        string
  sourcePath:       string
}

// Files we recognize as "knowledge / rules" worth importing as snippets.
const KNOWN_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.cursorrules',
  '.cursor/rules/main.mdc',
  '.windsurfrules',
  'CONVENTIONS.md',
]

const MAX_BYTES = 100_000

interface ParsedUrl {
  kind:   'raw' | 'blob' | 'repo' | 'gist'
  owner?: string
  repo?:  string
  ref?:   string
  path?:  string
  rawUrl?: string
}

export function parseGitHubUrl(input: string): ParsedUrl | null {
  let url: URL
  try { url = new URL(input.trim()) } catch { return null }

  // raw.githubusercontent.com/owner/repo/ref/path...
  if (url.hostname === 'raw.githubusercontent.com') {
    return { kind: 'raw', rawUrl: url.toString() }
  }

  // gist.github.com/owner/id
  if (url.hostname === 'gist.github.com') {
    return { kind: 'gist', rawUrl: url.toString() + '/raw' }
  }

  if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    // /owner/repo/blob/ref/path...
    if (parts.length >= 5 && parts[2] === 'blob') {
      const [owner, repo, , ref, ...rest] = parts
      const path = rest.join('/')
      return {
        kind: 'blob', owner, repo, ref, path,
        rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
      }
    }
    // /owner/repo
    if (parts.length >= 2) {
      return { kind: 'repo', owner: parts[0], repo: parts[1] }
    }
  }
  return null
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SpringBloom-Importer' } })
    if (!res.ok) return null
    const text = await res.text()
    return text.slice(0, MAX_BYTES)
  } catch {
    return null
  }
}

/** Resolve the default branch for a repo via the public API. */
async function defaultBranch(owner: string, repo: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'SpringBloom-Importer', 'Accept': 'application/vnd.github+json' },
    })
    if (res.ok) {
      const data = await res.json() as { default_branch?: string }
      return data.default_branch ?? 'main'
    }
  } catch { /* fall through */ }
  return 'main'
}

function deriveTrigger(path: string): string {
  const base = path.split('/').pop() ?? path
  const stem = base.replace(/^\./, '').replace(/\.[^.]+$/, '')  // drop leading dot + extension
  return (stem || 'imported')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'imported'
}

function deriveLabel(path: string): string {
  const base = path.split('/').pop() ?? path
  return `Imported: ${base}`
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function importFromGitHub(input: string): Promise<ImportedSnippet[]> {
  const parsed = parseGitHubUrl(input)
  if (!parsed) throw new Error('Not a recognized GitHub URL')

  // Direct file (raw / blob / gist) → one snippet
  if (parsed.rawUrl) {
    const body = await fetchText(parsed.rawUrl)
    if (!body) throw new Error('Could not fetch file (private repo or 404?)')
    const path = parsed.path ?? new URL(parsed.rawUrl).pathname.split('/').slice(3).join('/') ?? 'file'
    return [{
      suggestedTrigger: deriveTrigger(path),
      label:            deriveLabel(path),
      body,
      sourceUrl:        input,
      sourcePath:       path,
    }]
  }

  // Repo URL → probe for known files
  if (parsed.kind === 'repo' && parsed.owner && parsed.repo) {
    const ref = await defaultBranch(parsed.owner, parsed.repo)
    const found: ImportedSnippet[] = []
    for (const candidate of KNOWN_FILES) {
      const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${ref}/${candidate}`
      const body = await fetchText(rawUrl)
      if (body && body.trim().length > 0) {
        found.push({
          suggestedTrigger: deriveTrigger(`${parsed.repo}-${candidate}`),
          label:            `${parsed.repo}: ${candidate}`,
          body,
          sourceUrl:        `https://github.com/${parsed.owner}/${parsed.repo}`,
          sourcePath:       candidate,
        })
      }
    }
    if (found.length === 0) {
      throw new Error('No AGENTS.md / CLAUDE.md / .cursorrules found in that repo')
    }
    return found
  }

  throw new Error('Unsupported GitHub URL shape')
}
