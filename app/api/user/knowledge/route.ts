/**
 * GET  /api/user/knowledge       → returns { content }
 * PUT  /api/user/knowledge       → body: { content } — upserts
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_CONTENT = 50_000  // ~12k tokens — generous; resolver trims at injection time

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_knowledge')
    .select('content, max_tokens, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    content:   data?.content ?? '',
    max_tokens: data?.max_tokens ?? 1500,
    updated_at: data?.updated_at ?? null,
  })
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { content?: string; max_tokens?: number }
  const content = (body.content ?? '').slice(0, MAX_CONTENT)
  const maxTokens = typeof body.max_tokens === 'number'
    ? Math.max(100, Math.min(8000, body.max_tokens))
    : undefined

  const update: Record<string, unknown> = {
    user_id: user.id,
    content,
    updated_at: new Date().toISOString(),
  }
  if (maxTokens !== undefined) update.max_tokens = maxTokens

  const { error } = await supabase
    .from('user_knowledge')
    .upsert(update, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
