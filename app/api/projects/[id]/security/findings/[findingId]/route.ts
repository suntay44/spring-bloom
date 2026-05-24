/**
 * PATCH /api/projects/[id]/security/findings/[findingId]
 *   Body: { accepted_risk: boolean, accepted_note?: string }
 *   Marks a finding as accepted risk (or un-accepts it).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; findingId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, findingId } = await params
  const body = await req.json() as { accepted_risk?: boolean; accepted_note?: string }

  const update: Record<string, unknown> = {}
  if (typeof body.accepted_risk === 'boolean') {
    update.accepted_risk = body.accepted_risk
    update.accepted_at   = body.accepted_risk ? new Date().toISOString() : null
  }
  if (typeof body.accepted_note === 'string') {
    update.accepted_note = body.accepted_note.slice(0, 500)
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('security_findings')
    .update(update)
    .eq('id', findingId)
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Finding not found' }, { status: 404 })

  return NextResponse.json({ finding: data })
}
