import { describe, it, expect } from 'vitest'
import { generateSeoFiles } from '@/lib/seo/generator'

const baseCfg = {
  siteName: 'Vote Fair',
  siteUrl: 'https://votefair.app',
  defaultTitle: 'Vote Fair',
  defaultDescription: 'Easy poll voting for everyone.',
  routes: [
    { path: '/' },
    { path: '/about' },
  ],
}

describe('generateSeoFiles', () => {
  it('produces all 6 SEO files', () => {
    const files = generateSeoFiles(baseCfg)
    const paths = files.map(f => f.path)
    expect(paths).toContain('public/robots.txt')
    expect(paths).toContain('public/llms.txt')
    expect(paths).toContain('app/sitemap.ts')
    expect(paths).toContain('lib/seo/config.ts')
    expect(paths).toContain('lib/seo/SEO.tsx')
    expect(paths).toContain('lib/seo/jsonld.ts')
  })

  it('robots.txt allows AI engines (AEO)', () => {
    const files = generateSeoFiles(baseCfg)
    const robots = files.find(f => f.path === 'public/robots.txt')!
    expect(robots.content).toContain('GPTBot')
    expect(robots.content).toContain('PerplexityBot')
    expect(robots.content).toContain('ClaudeBot')
    expect(robots.content).toContain('Sitemap: https://votefair.app/sitemap.xml')
  })

  it('llms.txt references all routes', () => {
    const files = generateSeoFiles(baseCfg)
    const llms = files.find(f => f.path === 'public/llms.txt')!
    expect(llms.content).toContain('# Vote Fair')
    expect(llms.content).toContain('Easy poll voting')
    expect(llms.content).toContain('https://votefair.app/')
    expect(llms.content).toContain('https://votefair.app/about')
  })

  it('sitemap.ts is valid TypeScript with MetadataRoute import', () => {
    const files = generateSeoFiles(baseCfg)
    const sitemap = files.find(f => f.path === 'app/sitemap.ts')!
    expect(sitemap.content).toContain("import type { MetadataRoute }")
    expect(sitemap.content).toContain('export default function sitemap')
    expect(sitemap.content).toContain('https://votefair.app')
  })

  it('config.ts is typed and JSON-safe', () => {
    const files = generateSeoFiles(baseCfg)
    const config = files.find(f => f.path === 'lib/seo/config.ts')!
    expect(config.content).toContain('export const seoConfig')
    expect(config.content).toContain('"Vote Fair"')
    expect(config.content).toContain('as const')
  })

  it('SEO.tsx exports buildMetadata for Next.js Metadata API', () => {
    const files = generateSeoFiles(baseCfg)
    const seo = files.find(f => f.path === 'lib/seo/SEO.tsx')!
    expect(seo.content).toContain('export function buildMetadata')
    expect(seo.content).toContain("import type { Metadata } from 'next'")
    expect(seo.content).toContain('openGraph')
    expect(seo.content).toContain('twitter')
  })

  it('jsonld.ts includes Schema.org builders', () => {
    const files = generateSeoFiles(baseCfg)
    const jsonld = files.find(f => f.path === 'lib/seo/jsonld.ts')!
    expect(jsonld.content).toContain('export function article')
    expect(jsonld.content).toContain('export function product')
    expect(jsonld.content).toContain('export function organization')
    expect(jsonld.content).toContain('export function faq')
    expect(jsonld.content).toContain('export function breadcrumbs')
    expect(jsonld.content).toContain('https://schema.org')
  })

  it('every file reports a byte size', () => {
    const files = generateSeoFiles(baseCfg)
    for (const f of files) {
      expect(f.byteSize).toBeGreaterThan(0)
      expect(f.byteSize).toBe(Buffer.byteLength(f.content, 'utf8'))
    }
  })

  it('handles trailing slash in siteUrl correctly', () => {
    const files = generateSeoFiles({ ...baseCfg, siteUrl: 'https://votefair.app/' })
    const robots = files.find(f => f.path === 'public/robots.txt')!
    // Should not double-slash
    expect(robots.content).toContain('https://votefair.app/sitemap.xml')
    expect(robots.content).not.toContain('//sitemap.xml')
  })
})
