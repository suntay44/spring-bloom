import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeRateLimit } from '@/lib/rate-limit'

const ALLOWED_KINDS = ['image', 'csv', 'pdf', 'file'] as const
type AttachmentKind = (typeof ALLOWED_KINDS)[number]

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await writeRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id: projectId } = await params

  // Verify project ownership before recording anything.
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const body = await req.json() as {
    kind?: string
    storage_path?: string
    filename?: string
    size_bytes?: number
    mime_type?: string | null
  }

  const { kind, storage_path, filename, size_bytes, mime_type } = body

  if (!kind || !ALLOWED_KINDS.includes(kind as AttachmentKind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }
  if (!storage_path || typeof storage_path !== 'string') {
    return NextResponse.json({ error: 'storage_path is required' }, { status: 400 })
  }
  if (!filename || typeof filename !== 'string') {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }
  if (typeof size_bytes !== 'number' || size_bytes < 0) {
    return NextResponse.json({ error: 'size_bytes must be a non-negative number' }, { status: 400 })
  }

  // Path must live under the caller's user folder — defense-in-depth against
  // a client lying about storage_path even though storage RLS already enforces it.
  const expectedPrefix = `${user.id}/`
  if (!storage_path.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'storage_path must be under your user folder' }, { status: 403 })
  }

  const { data: attachment, error: insertErr } = await supabase
    .from('chat_attachments')
    .insert({
      project_id:   projectId,
      user_id:      user.id,
      kind,
      storage_path,
      filename,
      size_bytes,
      mime_type:    mime_type ?? null,
    })
    .select('id, kind, storage_path, filename')
    .single()

  if (insertErr || !attachment) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Signed URL for immediate preview in the composer.
  const { data: signed } = await supabase
    .storage
    .from('chat-attachments')
    .createSignedUrl(storage_path, 60 * 60) // 1h preview

  return NextResponse.json({
    id:           attachment.id,
    storage_path: attachment.storage_path,
    filename:     attachment.filename,
    kind:         attachment.kind,
    signed_url:   signed?.signedUrl ?? null,
  }, { status: 201 })
}
