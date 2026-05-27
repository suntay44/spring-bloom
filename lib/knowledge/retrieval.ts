/**
 * R4-5: RAG-lite retrieval.
 *
 * Given a user prompt + project_id, returns the top-K matching chunks from
 * knowledge_doc_chunks. Today this is ILIKE-based (trigram-indexed if pg_trgm
 * is enabled). Tomorrow this becomes pgvector cosine similarity — the API
 * surface stays the same.
 *
 * Caller (the chat route) decides whether to inject results.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface RetrievedChunk {
  doc_id:       string
  chunk_text:   string
  filename:     string | null
  source_url:   string | null
  char_start:   number
  char_end:     number
}

export interface RetrieveInput {
  supabase:   SupabaseClient
  userId:     string
  projectId:  string
  query:      string
  /** Max chunks returned (default 4). */
  topK?:      number
  /** Total char budget across all chunks (default 4000 ~ 1000 tokens). */
  maxChars?:  number
}

const KEYWORD_RE = /\b[a-zA-Z][a-zA-Z0-9_-]{2,}\b/g

/**
 * Extract distinct keywords from the query (length ≥ 3, alpha-leading).
 * Used for ILIKE OR matching since most users phrase queries conversationally.
 */
function extractKeywords(query: string, max = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of query.toLowerCase().matchAll(KEYWORD_RE)) {
    const w = match[0]
    if (w.length < 3 || STOP_WORDS.has(w)) continue
    if (!seen.has(w)) { seen.add(w); out.push(w) }
    if (out.length >= max) break
  }
  return out
}

const STOP_WORDS = new Set([
  'the','and','for','that','with','this','from','have','has','will','can','our',
  'are','was','were','its','you','your','any','all','not','use','make','add',
  'how','what','when','where','why','who','which','then','than','some','also',
])

export async function retrieveChunks(input: RetrieveInput): Promise<RetrievedChunk[]> {
  const topK = input.topK ?? 4
  const maxChars = input.maxChars ?? 4000

  const keywords = extractKeywords(input.query)
  if (keywords.length === 0) return []

  // Build OR-of-ILIKEs. Wrap each in % wildcards.
  // PostgREST supports `or(ilike.chunk_text.*%word%*)` syntax.
  const orFilter = keywords
    .map((w) => `chunk_text.ilike.%${w.replace(/[%,]/g, '')}%`)
    .join(',')

  // Project-scoped chunks OR user-global chunks (project_id IS NULL).
  const { data } = await input.supabase
    .from('knowledge_doc_chunks')
    .select('doc_id, chunk_text, char_start, char_end, knowledge_docs(filename, source_url)')
    .eq('user_id', input.userId)
    .or(`project_id.eq.${input.projectId},project_id.is.null`)
    .or(orFilter)
    .limit(topK * 3)  // pull a few extras for the scoring pass

  type Row = {
    doc_id: string; chunk_text: string; char_start: number; char_end: number
    knowledge_docs: { filename?: string; source_url?: string } | null
  }
  const rows = (data ?? []) as Row[]
  if (rows.length === 0) return []

  // Cheap scoring: count distinct keyword hits in each chunk text.
  type Scored = RetrievedChunk & { score: number }
  const scored: Scored[] = rows.map((r) => {
    const lower = r.chunk_text.toLowerCase()
    let score = 0
    for (const k of keywords) if (lower.includes(k)) score++
    return {
      doc_id:     r.doc_id,
      chunk_text: r.chunk_text,
      filename:   r.knowledge_docs?.filename ?? null,
      source_url: r.knowledge_docs?.source_url ?? null,
      char_start: r.char_start,
      char_end:   r.char_end,
      score,
    }
  })
  scored.sort((a, b) => b.score - a.score)

  // Trim to char budget
  const out: RetrievedChunk[] = []
  let used = 0
  for (const s of scored.slice(0, topK * 2)) {
    if (s.score === 0) break
    if (used + s.chunk_text.length > maxChars) continue
    used += s.chunk_text.length
    const { score: _unused, ...rest } = s
    void _unused
    out.push(rest)
    if (out.length >= topK) break
  }
  return out
}

/**
 * Format retrieved chunks for system-prompt injection.
 * Wrapped in a single tagged block; cites source filename/url per chunk.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''
  const blocks = chunks.map((c, i) => {
    const src = c.filename ?? c.source_url ?? 'attached doc'
    return `[doc ${i + 1}: ${src}, chars ${c.char_start}-${c.char_end}]\n${c.chunk_text}`
  })
  return `REFERENCE DOCS (top ${chunks.length} matches from user's knowledge base):\n${blocks.join('\n\n')}`
}
