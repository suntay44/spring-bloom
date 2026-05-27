/**
 * GET /api/projects/[id]/tests?limit=20
 *   Returns recent test_runs for this project.
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
  const limit = Math.max(1, Math.min(100, Number(new URL(req.url).searchParams.get('limit')) || 20))

  const { data } = await supabase
    .from('test_runs')
    .select('id, framework, command, status, passed_count, failed_count, skipped_count, duration_ms, exit_code, created_at, completed_at')
    .eq('project_id', projectId).eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ runs: data ?? [] })
}
