import { describe, it, expect } from 'vitest'
import { resolveKnowledge, injectKnowledge } from '@/lib/knowledge/resolver'
import { buildAgentsMd } from '@/lib/knowledge/agents-md'

describe('resolveKnowledge', () => {
  it('returns empty blocks when nothing provided', async () => {
    const r = await resolveKnowledge({ userKnowledge: null, machineId: null })
    expect(r.userBlock).toBe('')
    expect(r.projectBlock).toBe('')
    expect(r.totalChars).toBe(0)
  })

  it('wraps user knowledge in a tagged block', async () => {
    const r = await resolveKnowledge({
      userKnowledge: 'Use Drizzle, never Prisma.',
      machineId: null,
    })
    expect(r.userBlock).toContain('USER PREFERENCES')
    expect(r.userBlock).toContain('Drizzle')
    expect(r.projectBlock).toBe('')
  })

  it('truncates over-budget content', async () => {
    const huge = 'x'.repeat(10_000)
    const r = await resolveKnowledge({
      userKnowledge: huge, machineId: null, maxChars: 500,
    })
    // user budget is 40% of 500 = 200; allow truncation marker overhead
    expect(r.userBlock.length).toBeLessThan(500)
    expect(r.userBlock).toContain('truncated')
  })
})

describe('injectKnowledge', () => {
  it('returns base prompt unchanged when no knowledge', () => {
    const base = 'You are a helpful assistant.'
    const r = injectKnowledge(base, { userBlock: '', projectBlock: '', totalChars: 0 })
    expect(r).toBe(base)
  })

  it('appends knowledge blocks after base prompt', () => {
    const base = 'You are a builder.'
    const r = injectKnowledge(base, {
      userBlock: 'USER: prefer Tailwind',
      projectBlock: 'PROJECT: monorepo layout',
      totalChars: 50,
    })
    expect(r).toContain(base)
    expect(r).toContain('USER: prefer Tailwind')
    expect(r).toContain('PROJECT: monorepo layout')
    // Project should come AFTER user (recency wins for conflicts)
    expect(r.indexOf('PROJECT:')).toBeGreaterThan(r.indexOf('USER:'))
  })

  it('omits empty blocks', () => {
    const r = injectKnowledge('base', { userBlock: 'only-user', projectBlock: '', totalChars: 10 })
    expect(r).toContain('only-user')
    expect(r.match(/\n\n/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

describe('buildAgentsMd', () => {
  it('renders core project sections', () => {
    const md = buildAgentsMd({
      projectName: 'Vote Fair',
      projectType: 'fullstack',
      framework: 'Next.js',
      designStyle: 'minimal',
      primaryColor: '#7c3aed',
    })
    expect(md).toContain('# Vote Fair')
    expect(md).toContain('Type: fullstack')
    expect(md).toContain('Framework: Next.js')
    expect(md).toContain('Conventions')
    expect(md).toContain('Security Baseline')
  })

  it('includes scaffold name when provided', () => {
    const md = buildAgentsMd({
      projectName: 'TaskApp', projectType: 'mobile',
      scaffoldName: 'Task Manager / Todo',
    })
    expect(md).toContain('Task Manager / Todo')
  })

  it('renders brief answers section when provided', () => {
    const md = buildAgentsMd({
      projectName: 'Test', projectType: 'fullstack',
      briefAnswers: { auth_method: 'Email + Google', monetization: 'Subscription' },
    })
    expect(md).toContain('Intent (from planning Q&A)')
    expect(md).toContain('Email + Google')
    expect(md).toContain('Subscription')
  })

  it('skips empty sections', () => {
    const md = buildAgentsMd({ projectName: 'X', projectType: 'landing' })
    expect(md).not.toContain('Tech Stack')
    expect(md).not.toContain('Intent (from planning Q&A)')
    // Should still include defaults
    expect(md).toContain('Conventions')
  })

  it('output is portable to Cursor/Claude Code', () => {
    const md = buildAgentsMd({ projectName: 'Y', projectType: 'fullstack' })
    expect(md).toMatch(/Cursor/)
    expect(md).toMatch(/Claude Code/)
  })
})
