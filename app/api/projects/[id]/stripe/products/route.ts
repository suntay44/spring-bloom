/**
 * GET  /api/projects/[id]/stripe/products
 *   Lists active products (with their default_price) from the user's connected Stripe account.
 *
 * POST /api/projects/[id]/stripe/products
 *   Creates a product + default price.
 *   Body: { name, description?, unit_amount, currency, interval? }
 *     - interval='month' | 'year' creates a recurring price; omit for one-time.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjectStripe } from '@/lib/stripe/project-client'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const stripe = await getProjectStripe(projectId)
    const products = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] })
    return NextResponse.json({
      products: products.data.map((p) => {
        const dp = p.default_price && typeof p.default_price === 'object' ? p.default_price : null
        return {
          id:           p.id,
          name:         p.name,
          description:  p.description,
          active:       p.active,
          created:      p.created,
          default_price: dp ? {
            id:          dp.id,
            unit_amount: dp.unit_amount,
            currency:    dp.currency,
            recurring:   dp.recurring ? { interval: dp.recurring.interval } : null,
          } : null,
        }
      }),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe error' }, { status: 502 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as {
    name?: string; description?: string
    unit_amount?: number; currency?: string
    interval?: 'month' | 'year'
  }

  const name = body.name?.trim()
  const unit_amount = Number(body.unit_amount)
  const currency = (body.currency ?? 'usd').toLowerCase()

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!Number.isFinite(unit_amount) || unit_amount < 50) {
    return NextResponse.json({ error: 'unit_amount must be ≥ 50 (cents)' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const stripe = await getProjectStripe(projectId)
    const product = await stripe.products.create({
      name,
      description: body.description,
      default_price_data: {
        unit_amount, currency,
        ...(body.interval ? { recurring: { interval: body.interval } } : {}),
      },
    })
    return NextResponse.json({ product })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe error' }, { status: 502 })
  }
}
