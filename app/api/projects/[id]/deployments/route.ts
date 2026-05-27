/**
 * GET /api/projects/[id]/deployments?limit=20
 *   Returns recent deployments for this project (newest first).
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
    .from('deployments')
    .select('id, cf_deployment_id, published_url, status, build_duration_ms, bundle_size_bytes, file_count, error_message, rolled_back_at, created_at, completed_at')
    .eq('project_id', projectId).eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ deployments: data ?? [] })
}
