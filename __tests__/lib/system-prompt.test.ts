/**
 * Tests for lib/ai/system-prompt.ts
 *
 * Verifies that security rules and quality rules are always injected regardless
 * of context, and that framework/project-specific sections vary correctly.
 */

import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'

// ── Baseline context ──────────────────────────────────────────────────────────

const baseCtx = {
  projectType: 'fullstack' as const,
  framework: 'nextjs',
  fileTree: [],
  backendMode: 'managed_supabase' as const,
}

// ── Security rules always present ─────────────────────────────────────────────

describe('buildSystemPrompt — security rules', () => {
  it('always includes hardcoded secrets rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Never hardcode API keys or secrets')
  })

  it('always includes parameterized queries rule (no SQL injection)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('parameterized queries')
  })

  it('always includes dangerouslySetInnerHTML warning', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('dangerouslySetInnerHTML')
  })

  it('always includes auth token storage rule (no localStorage)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('localStorage')
  })

  it('always includes RLS enforcement rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('RLS')
  })

  it('always includes CORS rule (no wildcard origin)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain("origin: '*'")
  })

  it('always includes rate limiting rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('rate limiting')
  })

  it('always includes REFUSE block for dangerous code categories', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('REFUSE')
    expect(prompt).toContain('CSAM')
  })

  it('security rules appear before quality rules in the prompt', () => {
    const prompt = buildSystemPrompt(baseCtx)
    const securityIdx = prompt.indexOf('SECURITY')
    const qualityIdx = prompt.indexOf('CODE QUALITY')
    expect(securityIdx).toBeGreaterThanOrEqual(0)
    expect(qualityIdx).toBeGreaterThan(securityIdx)
  })
})

// ── Quality rules always present ──────────────────────────────────────────────

describe('buildSystemPrompt — quality rules', () => {
  it('always includes TypeScript strict mode rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('TypeScript strict mode')
  })

  it('always includes no-any rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('`any`')
  })

  it('always includes error boundaries rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Error boundaries')
  })

  it('always includes accessibility rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('aria-labels')
  })

  it('always includes mobile-first responsive rule', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Mobile-first')
  })
})

// ── Output format always present ──────────────────────────────────────────────

describe('buildSystemPrompt — output format', () => {
  it('always includes boltArtifact output format', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('<boltArtifact')
  })

  it('always includes boltAction file type', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('type="file"')
  })

  it('always includes boltAction shell type', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('type="shell"')
  })
})

// ── Framework-specific sections ───────────────────────────────────────────────

describe('buildSystemPrompt — framework-specific content', () => {
  it('includes Next.js App Router instructions for nextjs framework', () => {
    const prompt = buildSystemPrompt({ ...baseCtx, framework: 'nextjs' })
    expect(prompt).toContain('Next.js App Router')
    expect(prompt).toContain('server components')
  })

  it('includes Expo instructions for expo framework', () => {
    const prompt = buildSystemPrompt({
      ...baseCtx,
      framework: 'expo',
      projectType: 'mobile',
    })
    expect(prompt).toContain('Expo')
  })

  it('does not include Next.js instructions for expo framework', () => {
    const prompt = buildSystemPrompt({
      ...baseCtx,
      framework: 'expo',
      projectType: 'mobile',
    })
    expect(prompt).not.toContain('Next.js App Router')
  })
})

// ── Brief context injection ───────────────────────────────────────────────────

describe('buildSystemPrompt — brief context', () => {
  it('includes brief answers when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseCtx,
      briefAnswers: { purpose: 'SaaS dashboard', audience: 'developers' },
    })
    // Brief context should appear in prompt
    expect(prompt).toContain('SaaS dashboard')
  })

  it('includes initial prompt when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseCtx,
      initialPrompt: 'Build a todo app with user auth',
    })
    expect(prompt).toContain('Build a todo app with user auth')
  })

  it('does not crash when briefAnswers is null', () => {
    expect(() =>
      buildSystemPrompt({ ...baseCtx, briefAnswers: null })
    ).not.toThrow()
  })

  it('does not crash when briefAnswers is undefined', () => {
    expect(() =>
      buildSystemPrompt({ ...baseCtx, briefAnswers: undefined })
    ).not.toThrow()
  })
})

// ── Design style injection ────────────────────────────────────────────────────

describe('buildSystemPrompt — design context', () => {
  it('includes primary color when set', () => {
    const prompt = buildSystemPrompt({ ...baseCtx, primaryColor: '#6d28d9' })
    expect(prompt).toContain('#6d28d9')
  })

  it('includes design style when set', () => {
    const prompt = buildSystemPrompt({ ...baseCtx, designStyle: 'minimalist' })
    expect(prompt).toContain('minimalist')
  })

  it('handles no design context without crashing', () => {
    expect(() =>
      buildSystemPrompt({ ...baseCtx, designStyle: null, primaryColor: null })
    ).not.toThrow()
  })
})

// ── DB schema injection ───────────────────────────────────────────────────────

describe('buildSystemPrompt — DB schema', () => {
  it('includes db schema when provided', () => {
    const schema = 'CREATE TABLE users (id uuid PRIMARY KEY);'
    const prompt = buildSystemPrompt({ ...baseCtx, dbSchema: schema })
    expect(prompt).toContain('CREATE TABLE users')
  })

  it('handles null dbSchema without crashing', () => {
    expect(() =>
      buildSystemPrompt({ ...baseCtx, dbSchema: null })
    ).not.toThrow()
  })
})
