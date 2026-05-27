/**
 * DELETE /api/projects/[id]/stripe/products/[productId]
 *   Archives the product (Stripe doesn't truly delete after use).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjectStripe } from '@/lib/stripe/project-client'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, productId } = await params
  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const stripe = await getProjectStripe(projectId)
    // Stripe disallows true delete once a product has been used in a charge;
    // setting active=false ("archive") is the recommended approach.
    await stripe.products.update(productId, { active: false })
    return NextResponse.json({ ok: true, archived: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe error' }, { status: 502 })
  }
}
