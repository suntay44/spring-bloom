/**
 * Tests for lib/ai/context-manager.ts
 *
 * shouldCompress() and buildContextMessages() are pure functions.
 * generateContextSummary() is excluded (requires real API key).
 */

import { describe, it, expect } from 'vitest'
import { shouldCompress, buildContextMessages } from '@/lib/ai/context-manager'

// ── shouldCompress ────────────────────────────────────────────────────────────

describe('shouldCompress', () => {
  it('returns false when message count is at the threshold (12)', () => {
    expect(shouldCompress(12)).toBe(false)
  })

  it('returns true when message count exceeds threshold', () => {
    expect(shouldCompress(13)).toBe(true)
    expect(shouldCompress(50)).toBe(true)
    expect(shouldCompress(100)).toBe(true)
  })

  it('returns false for small conversations', () => {
    expect(shouldCompress(0)).toBe(false)
    expect(shouldCompress(1)).toBe(false)
    expect(shouldCompress(5)).toBe(false)
  })

  it('returns false for exactly 12 messages (not above threshold)', () => {
    expect(shouldCompress(12)).toBe(false)
  })
})

// ── buildContextMessages ──────────────────────────────────────────────────────

const makeMessages = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `Message ${i + 1}`,
  }))

describe('buildContextMessages — basic windowing', () => {
  it('returns all messages when count is within verbatim window (<=8)', () => {
    const msgs = makeMessages(5)
    const result = buildContextMessages(msgs)
    // Only user/assistant messages (no summary injected)
    expect(result).toHaveLength(5)
    expect(result[0]?.content).toBe('Message 1')
    expect(result[4]?.content).toBe('Message 5')
  })

  it('returns only the last 8 messages when there are more than 8', () => {
    const msgs = makeMessages(15)
    const result = buildContextMessages(msgs)
    // Last 8: Messages 8-15
    expect(result).toHaveLength(8)
    expect(result[0]?.content).toBe('Message 8')
    expect(result[7]?.content).toBe('Message 15')
  })

  it('applies hard cap: never sends more than 30 messages', () => {
    const msgs = makeMessages(50) // 50 messages, cap is 30, window is 8
    const result = buildContextMessages(msgs)
    // Hard cap at 30, then take last 8 from that
    expect(result).toHaveLength(8)
    // Last 8 of the last 30 = messages 43-50
    expect(result[0]?.content).toBe('Message 43')
    expect(result[7]?.content).toBe('Message 50')
  })
})

describe('buildContextMessages — summary injection', () => {
  it('prepends a system message when summary is provided', () => {
    const msgs = makeMessages(3)
    const result = buildContextMessages(msgs, 'User built a login page.')
    expect(result[0]?.role).toBe('system')
    expect(result[0]?.content).toContain('User built a login page.')
    // Remaining messages follow
    expect(result).toHaveLength(4) // 1 summary + 3 messages
  })

  it('does not prepend system message when summary is empty string', () => {
    const msgs = makeMessages(3)
    const result = buildContextMessages(msgs, '')
    expect(result).toHaveLength(3)
    expect(result[0]?.role).not.toBe('system')
  })

  it('does not prepend system message when summary is undefined', () => {
    const msgs = makeMessages(3)
    const result = buildContextMessages(msgs, undefined)
    expect(result).toHaveLength(3)
  })
})

describe('buildContextMessages — file tree injection', () => {
  it('appends a system message with file tree when provided', () => {
    const msgs = makeMessages(2)
    const result = buildContextMessages(msgs, undefined, ['app/page.tsx', 'lib/utils.ts'])
    const last = result[result.length - 1]
    expect(last?.role).toBe('system')
    expect(last?.content).toContain('app/page.tsx')
    expect(last?.content).toContain('lib/utils.ts')
  })

  it('does not append file tree when array is empty', () => {
    const msgs = makeMessages(2)
    const result = buildContextMessages(msgs, undefined, [])
    // No extra system message
    expect(result).toHaveLength(2)
    expect(result.every(m => m.role !== 'system')).toBe(true)
  })

  it('includes both summary and file tree when both provided', () => {
    const msgs = makeMessages(2)
    const result = buildContextMessages(msgs, 'Prior summary', ['app/page.tsx'])
    // summary at start + 2 messages + file tree at end
    expect(result).toHaveLength(4)
    expect(result[0]?.role).toBe('system')
    expect(result[0]?.content).toContain('Prior summary')
    expect(result[result.length - 1]?.role).toBe('system')
    expect(result[result.length - 1]?.content).toContain('app/page.tsx')
  })
})

describe('buildContextMessages — role preservation', () => {
  it('preserves user/assistant roles correctly', () => {
    const msgs = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
      { role: 'user' as const, content: 'Build me something' },
    ]
    const result = buildContextMessages(msgs)
    expect(result[0]?.role).toBe('user')
    expect(result[1]?.role).toBe('assistant')
    expect(result[2]?.role).toBe('user')
  })

  it('handles empty message list without crashing', () => {
    expect(() => buildContextMessages([])).not.toThrow()
    expect(buildContextMessages([])).toHaveLength(0)
  })
})
