/**
 * POST /api/user/snippets/import
 *   Body: { url: string, preview?: boolean }
 *
 *   preview=true  → fetch + parse, return candidates without saving
 *   preview=false → create user_snippets rows from the candidates
 *
 * Public GitHub content only (no OAuth). Zero infra cost.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importFromGitHub } from '@/lib/snippets/github-import'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { url?: string; preview?: boolean }
  if (!body.url?.trim()) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let candidates
  try {
    candidates = await importFromGitHub(body.url.trim())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Import failed' }, { status: 400 })
  }

  if (body.preview) {
    return NextResponse.json({ candidates, count: candidates.length })
  }

  // Insert — de-dup triggers against what the user already has + within batch.
  const { data: existing } = await supabase
    .from('user_snippets').select('trigger').eq('user_id', user.id)
  const taken = new Set((existing ?? []).map((s: { trigger: string }) => s.trigger))

  const created: string[] = []
  const skipped: string[] = []
  for (const c of candidates) {
    let trigger = c.suggestedTrigger
    // Resolve collisions by suffixing -2, -3, ...
    let n = 2
    while (taken.has(trigger)) { trigger = `${c.suggestedTrigger}-${n++}` }
    taken.add(trigger)

    const { error } = await supabase.from('user_snippets').insert({
      user_id:     user.id,
      trigger,
      label:       c.label,
      description: `Imported from ${c.sourcePath}`,
      body:        c.body,
      tags:        ['imported', 'github'],
      source:      'github',
      source_url:  c.sourceUrl,
    })
    if (error) skipped.push(trigger)
    else created.push(trigger)
  }

  return NextResponse.json({ created, skipped, count: created.length })
}
