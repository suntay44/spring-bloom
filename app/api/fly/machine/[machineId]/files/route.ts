import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { writeFile, listFiles } from '@/lib/fly/client'

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, machineId: string, userId: string) {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('fly_machine_id', machineId)
    .eq('user_id', userId)
    .single()
  return !!data
}

// GET — list all files on machine
export async function GET(_req: Request, { params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyOwnership(supabase, machineId, user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const files = await listFiles(machineId)
  return NextResponse.json({ data: files })
}

// POST — write one or more files
// Body: { files: Array<{ path: string; content: string }> }
export async function POST(req: Request, { params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyOwnership(supabase, machineId, user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { files } = await req.json() as { files: Array<{ path: string; content: string }> }
  if (!Array.isArray(files) || !files.length) {
    return NextResponse.json({ error: 'files array required' }, { status: 400 })
  }

  // Write sequentially to avoid race conditions
  for (const file of files) {
    await writeFile(machineId, `/app/${file.path}`, file.content)
  }

  return NextResponse.json({ ok: true, count: files.length })
}
