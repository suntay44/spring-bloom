import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe, CREDIT_PACKS, SUBSCRIPTION_PRICES, type SubscriptionPlan } from '@/lib/stripe/client'

type CheckoutBody =
  | { type: 'pack'; credits: number }
  | { type: 'subscription'; plan: SubscriptionPlan }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as CheckoutBody

  // Get or create Stripe customer (shared for both pack and subscription flows)
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('id', user.id)
    .single() as { data: { stripe_customer_id: string | null; full_name: string | null } | null; error: unknown }

  let stripe
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Billing unavailable' }, { status: 503 })
  }

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    } catch (err) {
      console.error('[checkout] stripe customer create failed:', err)
      return NextResponse.json({ error: 'Billing unavailable' }, { status: 503 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // ── One-time credit pack ──────────────────────────────────────────────────
  if (body.type === 'pack') {
    const pack = CREDIT_PACKS.find((p) => p.credits === body.credits)
    if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.priceUsd * 100,
            product_data: {
              name: `Wild Cupcake — ${pack.label}`,
              description: `${pack.credits} credits · $${(pack.priceUsd / pack.credits).toFixed(3)}/credit · no expiry`,
            },
          },
        }],
        metadata: {
          user_id: user.id,
          credits: String(pack.credits),
        },
        success_url: `${appUrl}/settings?credits=success`,
        cancel_url: `${appUrl}/settings?credits=cancelled`,
      })
      return NextResponse.json({ url: session.url })
    } catch (err) {
      console.error('[checkout] stripe session create (pack) failed:', err)
      return NextResponse.json({ error: 'Billing unavailable' }, { status: 503 })
    }
  }

  // ── Recurring subscription ────────────────────────────────────────────────
  if (body.type === 'subscription') {
    const { plan } = body
    const priceId = SUBSCRIPTION_PRICES[plan]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { userId: user.id, plan },
        },
        metadata: { userId: user.id, plan },
        success_url: `${appUrl}/settings?subscription=success`,
        cancel_url: `${appUrl}/settings?subscription=cancelled`,
      })
      return NextResponse.json({ url: session.url })
    } catch (err) {
      console.error('[checkout] stripe session create (subscription) failed:', err)
      return NextResponse.json({ error: 'Billing unavailable' }, { status: 503 })
    }
  }

  return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
}
