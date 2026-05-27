/**
 * R4-5: Chunker for knowledge_docs.
 *
 * Splits text into ~500-char chunks at sensible boundaries (paragraph >
 * sentence > word). Records exact char_start / char_end so we can quote
 * the source verbatim when the chunk is retrieved.
 *
 * Pure function — no AI calls. Trivially testable.
 */

export interface Chunk {
  chunk_index: number
  chunk_text:  string
  char_start:  number
  char_end:    number
}

export interface ChunkOptions {
  /** Target chunk size in characters (default 500) */
  targetSize?: number
  /** Hard maximum — never produce a chunk longer than this (default 800) */
  maxSize?: number
  /** Minimum size — drop chunks smaller than this when possible (default 50) */
  minSize?: number
}

export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetSize ?? 500
  const max    = opts.maxSize    ?? 800
  const min    = opts.minSize    ?? 50

  if (!text || text.trim().length === 0) return []
  if (text.length <= max) {
    return [{ chunk_index: 0, chunk_text: text.trim(), char_start: 0, char_end: text.length }]
  }

  const chunks: Chunk[] = []
  let pos = 0
  let index = 0

  while (pos < text.length) {
    let end = Math.min(pos + target, text.length)

    // If we still have room before max, prefer a paragraph break
    const slice = text.slice(pos, Math.min(pos + max, text.length))
    const paraBreak = slice.lastIndexOf('\n\n')
    if (paraBreak >= target / 2) {
      end = pos + paraBreak + 2
    } else {
      // Try sentence boundary
      const sentenceMatch = slice.slice(0, max).match(/[.!?]\s+(?=[A-Z])/g)
      if (sentenceMatch && sentenceMatch.length > 0) {
        // Find the LAST sentence boundary within target..max
        const re = /[.!?]\s+(?=[A-Z])/g
        let m: RegExpExecArray | null
        let lastEnd = -1
        while ((m = re.exec(slice)) !== null) {
          const candidate = m.index + m[0].length
          if (candidate >= target / 2 && candidate <= max) lastEnd = candidate
        }
        if (lastEnd > 0) end = pos + lastEnd
      } else {
        // Fall back to word boundary
        const subSlice = text.slice(pos, end)
        const lastSpace = subSlice.lastIndexOf(' ')
        if (lastSpace > target / 2) end = pos + lastSpace + 1
      }
    }

    const chunkText = text.slice(pos, end).trim()
    if (chunkText.length >= min || end >= text.length) {
      chunks.push({
        chunk_index: index++,
        chunk_text:  chunkText,
        char_start:  pos,
        char_end:    end,
      })
    }
    pos = end
  }

  return chunks
}
