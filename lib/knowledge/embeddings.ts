/**
 * R5-2: OpenAI embeddings for RAG.
 *
 * Model: text-embedding-3-small — 1536 dims, $0.02/1M input tokens.
 * 4000-char chunk ≈ ~1000 tokens ≈ $0.00002 to embed. Negligible cost.
 *
 * Returns null when OPENAI_API_KEY is missing or the API errors — callers
 * gracefully degrade to ILIKE-only retrieval.
 */

const EMBED_URL  = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'

export interface EmbeddingResult {
  /** Float32 vector of length 1536. Stored verbatim in pgvector. */
  vector: number[]
  /** Tokens consumed (for cost tracking). */
  tokens: number
}

/** Embed a single string. Returns null on error or missing key. */
export async function embed(text: string): Promise<EmbeddingResult | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key || !text.trim()) return null
  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    })
    if (!res.ok) {
      console.warn('[embed] OpenAI returned', res.status)
      return null
    }
    const data = await res.json() as {
      data?: Array<{ embedding?: number[] }>
      usage?: { total_tokens?: number }
    }
    const vector = data.data?.[0]?.embedding
    if (!Array.isArray(vector)) return null
    return { vector, tokens: data.usage?.total_tokens ?? 0 }
  } catch (err) {
    console.warn('[embed] failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Embed many strings in one API call. OpenAI accepts up to 2048 inputs. */
export async function embedBatch(texts: string[]): Promise<Array<EmbeddingResult | null>> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return texts.map(() => null)
  const nonEmpty = texts.map((t) => t.trim()).map((t, i) => ({ t, i })).filter((x) => x.t.length > 0)
  if (nonEmpty.length === 0) return texts.map(() => null)

  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: nonEmpty.map((x) => x.t) }),
    })
    if (!res.ok) {
      console.warn('[embedBatch] OpenAI returned', res.status)
      return texts.map(() => null)
    }
    const data = await res.json() as {
      data?: Array<{ embedding?: number[]; index?: number }>
      usage?: { total_tokens?: number }
    }
    const totalTokens = data.usage?.total_tokens ?? 0
    const perItemTokens = Math.ceil(totalTokens / nonEmpty.length)

    // Map embeddings back to original positions
    const out = texts.map(() => null as EmbeddingResult | null)
    for (let k = 0; k < nonEmpty.length; k++) {
      const apiIdx = data.data?.[k]?.index ?? k
      const vec = data.data?.[k]?.embedding
      if (Array.isArray(vec)) {
        out[nonEmpty[apiIdx]?.i ?? k] = { vector: vec, tokens: perItemTokens }
      }
    }
    return out
  } catch (err) {
    console.warn('[embedBatch] failed:', err instanceof Error ? err.message : err)
    return texts.map(() => null)
  }
}

/** Format a vector as a Postgres-compatible literal. */
export function vectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
