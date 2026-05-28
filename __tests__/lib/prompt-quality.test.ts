import { describe, it, expect } from 'vitest'
import { scorePrompt } from '@/lib/ai/prompt-quality'

describe('scorePrompt', () => {
  it('returns empty for blank input', () => {
    expect(scorePrompt('').level).toBe('empty')
    expect(scorePrompt('   ').level).toBe('empty')
  })

  it('flags vague short prompts as weak', () => {
    expect(scorePrompt('make an app').level).toBe('weak')
    expect(scorePrompt('build something').level).toBe('weak')
    expect(scorePrompt('do it').level).toBe('weak')
  })

  it('does NOT flag refinements as weak', () => {
    expect(scorePrompt('make it blue').level).not.toBe('weak')
    expect(scorePrompt('fix the button').level).not.toBe('weak')
    expect(scorePrompt('change the color to red').level).not.toBe('weak')
  })

  it('rates detailed prompts as strong', () => {
    const p = 'Build a task manager with a Postgres table for todos, drag-and-drop columns, and email reminders using Resend'
    const r = scorePrompt(p)
    expect(r.level).toBe('strong')
    expect(r.score).toBeGreaterThanOrEqual(65)
  })

  it('rates a moderately specific prompt as ok or better', () => {
    const r = scorePrompt('Add a login page with email and password fields')
    expect(['ok', 'strong']).toContain(r.level)
  })

  it('rewards naming a service', () => {
    const withService = scorePrompt('add auth with google')
    const without = scorePrompt('add auth')
    expect(withService.score).toBeGreaterThan(without.score)
  })

  it('rewards numbers/specifics', () => {
    const r = scorePrompt('show the last 30 days of sales in a bar chart')
    expect(['ok', 'strong']).toContain(r.level)
  })

  it('always returns reasons for weak prompts', () => {
    const r = scorePrompt('make app')
    expect(r.level).toBe('weak')
    expect(r.reasons.length).toBeGreaterThan(0)
  })

  it('score stays within 0-100', () => {
    for (const p of ['', 'x', 'make it', 'a very long detailed prompt '.repeat(20)]) {
      const r = scorePrompt(p)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    }
  })
})
