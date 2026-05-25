/**
 * POST /api/projects/[id]/emails/scaffold
 *   Body: { apply?: boolean, productName?, fromAddress?, fromName?, brandColor?, includeReceipt? }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from '@/lib/fly/client'
import { generateEmailScaffold, type EmailScaffoldConfig } from '@/lib/emails/scaffold'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as EmailScaffoldConfig & { apply?: boolean }

  const { data: project } = await supabase
    .from('projects').select('id, name, fly_machine_id')
    .eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const proj = project as { id: string; name: string; fly_machine_id?: string }
  const files = generateEmailScaffold({
    productName:   body.productName ?? proj.name,
    fromAddress:   body.fromAddress,
    fromName:      body.fromName ?? proj.name,
    brandColor:    body.brandColor,
    includeReceipt: body.includeReceipt,
  })

  if (!body.apply) return NextResponse.json({ files, applied: false })

  if (!proj.fly_machine_id) {
    return NextResponse.json({ error: 'Start your project preview first' }, { status: 400 })
  }
  const written: string[] = []
  const failed:  Array<{ path: string; error: string }> = []
  for (const f of files) {
    try { await writeFile(proj.fly_machine_id, `/app/${f.path}`, f.content); written.push(f.path) }
    catch (err) { failed.push({ path: f.path, error: err instanceof Error ? err.message : 'write failed' }) }
  }
  return NextResponse.json({ files, applied: true, written, failed })
}
