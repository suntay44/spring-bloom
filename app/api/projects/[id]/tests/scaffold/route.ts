/**
 * POST /api/projects/[id]/tests/scaffold
 *   Body: { apply?, baseUrl?, includeAuth?, includeCi? }
 *
 * Scaffolds Playwright into the project's repo.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from '@/lib/fly/client'
import { generatePlaywrightScaffold } from '@/lib/tests/playwright-scaffold'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as {
    apply?: boolean
    baseUrl?: string
    includeAuth?: boolean
    includeCi?: boolean
  }

  const { data: project } = await supabase
    .from('projects').select('id, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const files = generatePlaywrightScaffold({
    baseUrl:     body.baseUrl,
    includeAuth: body.includeAuth,
    includeCi:   body.includeCi,
  })

  if (!body.apply) return NextResponse.json({ files, applied: false })

  const machineId = (project as { fly_machine_id?: string }).fly_machine_id
  if (!machineId) {
    return NextResponse.json({ error: 'Start your project preview first' }, { status: 400 })
  }

  const written: string[] = []
  const failed:  Array<{ path: string; error: string }> = []
  for (const f of files) {
    try { await writeFile(machineId, `/app/${f.path}`, f.content); written.push(f.path) }
    catch (err) { failed.push({ path: f.path, error: err instanceof Error ? err.message : 'write failed' }) }
  }
  return NextResponse.json({ files, applied: true, written, failed })
}
