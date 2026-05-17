import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe, CREDIT_PACKS } from '@/lib/stripe/client'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { credits } = await req.json() as { credits: number }
  const pack = CREDIT_PACKS.find((p) => p.credits === credits)
  if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const stripe = getStripe()

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('id', user.id)
    .single() as { data: { stripe_customer_id: string | null; full_name: string | null } | null; error: unknown }

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: pack.priceUsd * 100, // cents
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
}
