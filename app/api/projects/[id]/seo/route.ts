/**
 * POST /api/projects/[id]/seo
 *   Body: { config: SeoConfig, apply?: boolean }
 *   - apply=false (default): returns generated files for preview only
 *   - apply=true:            writes them into the project's Fly machine
 *
 * GET  /api/projects/[id]/seo
 *   Returns the inferred default config from project metadata (no files yet).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from '@/lib/fly/client'
import { generateSeoFiles, type SeoConfig } from '@/lib/seo/generator'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug, type')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const proj = project as { id: string; name: string; slug?: string; type: string }
  const inferred: SeoConfig = {
    siteName: proj.name,
    siteUrl: proj.slug ? `https://${proj.slug}.springbloom.app` : 'https://example.com',
    defaultTitle: proj.name,
    titleTemplate: `%s · ${proj.name}`,
    defaultDescription: `${proj.name} — built with SpringBloom.`,
    defaultOgImage: '/og.png',
    locale: 'en-US',
    routes: [
      { path: '/',         priority: 1.0, changefreq: 'weekly' },
      { path: '/pricing',  priority: 0.8, changefreq: 'monthly' },
      { path: '/about',    priority: 0.6, changefreq: 'monthly' },
    ],
  }
  return NextResponse.json({ config: inferred })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as { config: SeoConfig; apply?: boolean }

  if (!body.config?.siteUrl || !body.config?.siteName) {
    return NextResponse.json({ error: 'config.siteUrl and config.siteName are required' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate files
  const files = generateSeoFiles(body.config)

  // Preview-only mode — just return the files
  if (!body.apply) {
    return NextResponse.json({ files, applied: false })
  }

  // Apply mode — write to the Fly machine
  const machineId = (project as { fly_machine_id?: string }).fly_machine_id
  if (!machineId) {
    return NextResponse.json(
      { error: 'No Fly machine available — start your project preview first' },
      { status: 400 },
    )
  }

  const written: string[] = []
  const failed: Array<{ path: string; error: string }> = []
  for (const f of files) {
    try {
      await writeFile(machineId, `/app/${f.path}`, f.content)
      written.push(f.path)
    } catch (err) {
      failed.push({ path: f.path, error: err instanceof Error ? err.message : 'write failed' })
    }
  }

  return NextResponse.json({
    files,
    applied: true,
    written,
    failed,
  })
}
