/**
 * GET /api/projects/[id]/plans
 *   Returns plans for this project (newest first).
 *   Query: ?limit=20 (default 20, max 100)
 *
 * Used by ChatPanel after a plan-mode message completes to map message_id → planId.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20))

  const { data } = await supabase
    .from('plans')
    .select('id, message_id, status, markdown, edited_markdown, created_at, approved_at, executed_at')
    .eq('project_id', projectId).eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ plans: data ?? [] })
}
