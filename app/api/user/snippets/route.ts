/**
 * GET  /api/user/snippets               → list user's snippets (most-recently-used first)
 * POST /api/user/snippets               → create snippet
 *   Body: { trigger, label, description?, body, tags?, source?, source_url? }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TRIGGER_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_snippets')
    .select('id, trigger, label, description, tags, source, use_count, last_used_at, updated_at')
    .eq('user_id', user.id)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })

  return NextResponse.json({ snippets: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    trigger?: string; label?: string; description?: string
    body?: string; tags?: string[]; source?: string; source_url?: string
  }

  const trigger = (body.trigger ?? '').trim().toLowerCase()
  if (!TRIGGER_RE.test(trigger)) {
    return NextResponse.json({ error: 'Trigger must be 2-64 chars, lowercase, kebab-case' }, { status: 400 })
  }
  if (!body.label?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'label and body are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_snippets')
    .insert({
      user_id:     user.id,
      trigger,
      label:       body.label.trim(),
      description: body.description ?? null,
      body:        body.body,
      tags:        body.tags ?? [],
      source:      body.source ?? 'manual',
      source_url:  body.source_url ?? null,
    })
    .select().single()

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A snippet with this trigger already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ snippet: data })
}
