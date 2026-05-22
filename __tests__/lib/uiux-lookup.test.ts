/**
 * Tests for lib/library/uiux-lookup.ts
 *
 * scoreModule() is a pure function — no DB, no mocks.
 * Tests verify that tag matching, category signals, and name bonus
 * all contribute correctly to module scoring.
 */

import { describe, it, expect } from 'vitest'
import { scoreModule } from '@/lib/library/uiux-lookup'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mod(overrides: Partial<{ name: string; category: string; tags: string[] }>) {
  return {
    name: 'Test Module',
    category: 'components',
    tags: [],
    ...overrides,
  }
}

// ── Tag matching ──────────────────────────────────────────────────────────────

describe('scoreModule — tag matching', () => {
  it('scores +2 for each exact tag found in prompt', () => {
    const m = mod({ tags: ['button', 'cta'] })
    expect(scoreModule('i need a button for cta', m)).toBe(4) // 2+2
  })

  it('scores 0 when no tags match', () => {
    const m = mod({ tags: ['animation', 'motion'] })
    expect(scoreModule('build me a login form', m)).toBe(0)
  })

  it('is case-insensitive for tags', () => {
    const m = mod({ tags: ['Button', 'CTA'] })
    expect(scoreModule('add a button cta', m)).toBe(4)
  })

  it('counts only matching tags, not all tags', () => {
    const m = mod({ tags: ['button', 'modal', 'tooltip'] })
    // Only 'button' matches
    expect(scoreModule('add a button please', m)).toBe(2)
  })

  it('handles tags with hyphens', () => {
    const m = mod({ tags: ['dark-mode', 'color-scheme'] })
    expect(scoreModule('add a dark-mode toggle', m)).toBe(2)
  })
})

// ── Category signals ──────────────────────────────────────────────────────────

describe('scoreModule — category signal matching', () => {
  it('scores +1 for each category signal keyword in prompt', () => {
    const m = mod({ category: 'forms', tags: [] })
    // 'form', 'input', and 'field' are all signals for 'forms'
    expect(scoreModule('create a form with input fields', m)).toBe(3) // 1+1+1
  })

  it('scores 0 for category with no matching signals', () => {
    const m = mod({ category: 'motion', tags: [] })
    expect(scoreModule('build me a dashboard with a sidebar', m)).toBe(0)
  })

  it('uses tailwind category signals', () => {
    const m = mod({ category: 'tailwind', tags: [] })
    expect(scoreModule('add a button and a badge', m)).toBe(2) // button+badge
  })

  it('uses layout category signals', () => {
    const m = mod({ category: 'layout', tags: [] })
    expect(scoreModule('build a dashboard with a sidebar', m)).toBe(2) // dashboard+sidebar
  })

  it('returns 0 for unknown category (no signals)', () => {
    const m = mod({ category: 'unknown-category', tags: [] })
    expect(scoreModule('anything at all', m)).toBe(0)
  })
})

// ── Name bonus ────────────────────────────────────────────────────────────────

describe('scoreModule — name match bonus', () => {
  it('scores +0.5 when module name (lowercased) appears in prompt', () => {
    const m = mod({ name: 'Button Variants', tags: [] })
    expect(scoreModule('i need button variants for my app', m)).toBe(0.5)
  })

  it('does not score name bonus if name not in prompt', () => {
    const m = mod({ name: 'Modal Dialog', tags: [] })
    expect(scoreModule('add a button please', m)).toBe(0)
  })
})

// ── Combined scoring ──────────────────────────────────────────────────────────

describe('scoreModule — combined signals', () => {
  it('combines tag + category + name scores', () => {
    const m = mod({
      name: 'Navigation Patterns',
      category: 'tailwind',
      tags: ['nav', 'navigation', 'sidebar'],
    })
    const prompt = 'create navigation patterns with a sidebar and nav bar'
    const score = scoreModule(prompt, m)
    // Tags: nav(+2), navigation(+2), sidebar(+2) = 6
    // Category signals (tailwind): nav(+1) = 1
    // Name: 'navigation patterns'(+0.5) = 0.5
    expect(score).toBe(7.5)
  })

  it('higher score for more relevant prompt', () => {
    const m = mod({
      name: 'Alert & Notification',
      category: 'tailwind',
      tags: ['alert', 'notification', 'toast', 'warning', 'error'],
    })
    const highRelevance = 'build an alert notification system with toast warnings and errors'
    const lowRelevance = 'create a basic landing page'
    expect(scoreModule(highRelevance, m)).toBeGreaterThan(scoreModule(lowRelevance, m))
  })

  it('real-world: form prompt matches forms module strongly', () => {
    const formModule = mod({
      name: 'Form Field States',
      category: 'forms',
      tags: ['form', 'input', 'field', 'validation', 'error'],
    })
    const score = scoreModule('build a signup form with input validation and error messages', formModule)
    // Tags: form(+2), input(+2), field(+1? no - 'field' not in prompt) validation(+2), error(+2) = 8
    // Category signals (forms): form(+1), input(+1), validation(+1), signup(+1) = 4
    // Name: no
    // Total: 12
    expect(score).toBeGreaterThanOrEqual(10)
  })

  it('real-world: dashboard prompt matches layout module', () => {
    const layoutModule = mod({
      name: 'Dashboard Grid',
      category: 'layout',
      tags: ['dashboard', 'grid', 'layout', 'admin', 'sidebar'],
    })
    const score = scoreModule('build an admin dashboard with a sidebar and grid layout', layoutModule)
    expect(score).toBeGreaterThanOrEqual(8)
  })
})

// ── MIN_SCORE boundary ────────────────────────────────────────────────────────

describe('scoreModule — minimum threshold', () => {
  it('returns 0 for completely unrelated prompt', () => {
    const m = mod({
      name: 'Dark Mode Toggle',
      category: 'tailwind',
      tags: ['dark-mode', 'theme', 'toggle'],
    })
    expect(scoreModule('add a contact form with name and email fields', m)).toBe(0)
  })
})
