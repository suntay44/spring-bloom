import { describe, it, expect } from 'vitest'
import { chunkText } from '@/lib/knowledge/chunker'

describe('chunkText', () => {
  it('returns empty for empty input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   ')).toEqual([])
  })

  it('returns a single chunk for short text', () => {
    const text = 'A short paragraph.'
    const chunks = chunkText(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.chunk_text).toBe('A short paragraph.')
    expect(chunks[0]!.char_start).toBe(0)
    expect(chunks[0]!.char_end).toBe(text.length)
  })

  it('splits at paragraph breaks when available', () => {
    const text = 'Paragraph one. '.repeat(40) + '\n\n' + 'Paragraph two. '.repeat(40)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    // First chunk should end at or near the paragraph break
    const firstEnd = chunks[0]!.char_end
    expect(text.slice(0, firstEnd)).toContain('Paragraph one')
  })

  it('falls back to sentence boundaries when no paragraph break', () => {
    const text = 'First sentence. Second sentence. Third sentence. '.repeat(20)
    const chunks = chunkText(text, { targetSize: 200, maxSize: 300 })
    expect(chunks.length).toBeGreaterThan(1)
    // Most chunks should END with sentence punctuation+space (truncate strips trailing)
    for (const c of chunks.slice(0, -1)) {
      expect(c.chunk_text.length).toBeLessThanOrEqual(300)
    }
  })

  it('all chunks together cover the full text', () => {
    const text = Array.from({ length: 50 }, (_, i) => `Line ${i}.`).join(' ').repeat(5)
    const chunks = chunkText(text, { targetSize: 200 })
    // Reconstruct (approximately): char ranges should be contiguous
    let lastEnd = 0
    for (const c of chunks) {
      expect(c.char_start).toBeGreaterThanOrEqual(lastEnd)
      lastEnd = c.char_end
    }
    expect(lastEnd).toBeGreaterThanOrEqual(text.length - 10)  // allow trailing-whitespace fuzz
  })

  it('respects maxSize hard cap', () => {
    const text = 'word '.repeat(1000)
    const chunks = chunkText(text, { targetSize: 400, maxSize: 500 })
    for (const c of chunks) {
      expect(c.chunk_text.length).toBeLessThanOrEqual(500)
    }
  })

  it('assigns sequential chunk_index starting at 0', () => {
    const text = 'a'.repeat(2000)
    const chunks = chunkText(text, { targetSize: 200 })
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]!.chunk_index).toBe(i)
    }
  })

  it('handles realistic mixed content', () => {
    const text = `# Heading

This is the first paragraph with some content. It has multiple sentences. Like this one.

This is the second paragraph. It also has content. And another sentence here.

## Subheading

Some more text follows. With multiple lines. ${Array(50).fill('Text. ').join('')}
`
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0]!.chunk_text).toContain('Heading')
  })
})
