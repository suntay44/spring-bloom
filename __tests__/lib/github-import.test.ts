import { describe, it, expect } from 'vitest'
import { parseGitHubUrl } from '@/lib/snippets/github-import'

describe('parseGitHubUrl', () => {
  it('parses a raw githubusercontent URL', () => {
    const r = parseGitHubUrl('https://raw.githubusercontent.com/o/r/main/AGENTS.md')
    expect(r?.kind).toBe('raw')
    expect(r?.rawUrl).toContain('AGENTS.md')
  })

  it('parses a blob URL → raw URL', () => {
    const r = parseGitHubUrl('https://github.com/o/r/blob/main/.cursorrules')
    expect(r?.kind).toBe('blob')
    expect(r?.owner).toBe('o')
    expect(r?.repo).toBe('r')
    expect(r?.ref).toBe('main')
    expect(r?.path).toBe('.cursorrules')
    expect(r?.rawUrl).toBe('https://raw.githubusercontent.com/o/r/main/.cursorrules')
  })

  it('parses a nested blob path', () => {
    const r = parseGitHubUrl('https://github.com/o/r/blob/dev/.cursor/rules/main.mdc')
    expect(r?.path).toBe('.cursor/rules/main.mdc')
    expect(r?.rawUrl).toContain('/dev/.cursor/rules/main.mdc')
  })

  it('parses a repo URL', () => {
    const r = parseGitHubUrl('https://github.com/vercel/next.js')
    expect(r?.kind).toBe('repo')
    expect(r?.owner).toBe('vercel')
    expect(r?.repo).toBe('next.js')
  })

  it('parses a gist URL', () => {
    const r = parseGitHubUrl('https://gist.github.com/user/abc123')
    expect(r?.kind).toBe('gist')
    expect(r?.rawUrl).toContain('/raw')
  })

  it('handles www.github.com', () => {
    const r = parseGitHubUrl('https://www.github.com/o/r')
    expect(r?.kind).toBe('repo')
  })

  it('returns null for non-GitHub URLs', () => {
    expect(parseGitHubUrl('https://example.com/foo')).toBeNull()
    expect(parseGitHubUrl('not a url')).toBeNull()
    expect(parseGitHubUrl('https://gitlab.com/o/r')).toBeNull()
  })
})
