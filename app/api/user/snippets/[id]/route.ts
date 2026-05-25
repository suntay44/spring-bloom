/**
 * GET    /api/user/snippets/[id]   → full snippet incl. body
 * PATCH  /api/user/snippets/[id]   → update fields
 * DELETE /api/user/snippets/[id]
 *
 * Also: POST /api/user/snippets/[id]?action=use → bump use_count + set last_used_at
 *   Called by the chat UI when a snippet is selected via slash command.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data } = await supabase
    .from('user_snippets').select('*')
    .eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ snippet: data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  // Whitelist updatable fields
  const allowed = ['label', 'description', 'body', 'tags'] as const
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in body) update[k] = body[k]

  const { data, error } = await supabase
    .from('user_snippets').update(update)
    .eq('id', id).eq('user_id', user.id)
    .select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ snippet: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await supabase.from('user_snippets').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}

// Bump use_count when a snippet is invoked from the chat composer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  if (url.searchParams.get('action') !== 'use') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  const { id } = await params
  // Fetch current count then increment — atomic enough for this counter.
  const { data: row } = await supabase
    .from('user_snippets').select('use_count')
    .eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('user_snippets').update({
    use_count: ((row as { use_count?: number }).use_count ?? 0) + 1,
    last_used_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
