/**
 * GET   /api/projects/[id]/plans/[planId]                → fetch plan
 * PATCH /api/projects/[id]/plans/[planId]                → edit markdown / approve / discard
 *   Body: { edited_markdown?: string, status?: 'approved'|'discarded' }
 *
 * Approval flow: setting status='approved' just stamps approved_at. The
 * actual code-gen execution is kicked off by the client switching to Agent
 * mode and sending a new message that references the plan markdown.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATUS = ['draft', 'approved', 'discarded'] as const
type PlanStatus = typeof ALLOWED_STATUS[number]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, planId } = await params
  const { data } = await supabase
    .from('plans').select('*')
    .eq('id', planId).eq('project_id', projectId).eq('user_id', user.id)
    .maybeSingle()
  if (!data) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ plan: data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, planId } = await params
  const body = await req.json() as { edited_markdown?: string; status?: string }

  const update: Record<string, unknown> = {}
  if (typeof body.edited_markdown === 'string') {
    update.edited_markdown = body.edited_markdown
  }
  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUS.includes(body.status as PlanStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
    if (body.status === 'approved') update.approved_at = new Date().toISOString()
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('plans').update(update)
    .eq('id', planId).eq('project_id', projectId).eq('user_id', user.id)
    .select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ plan: data })
}
