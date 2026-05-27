/**
 * DELETE /api/user/knowledge/docs/[docId]
 *   Removes the doc and (cascading) its chunks.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { docId } = await params
  await supabase.from('knowledge_docs').delete().eq('id', docId).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
