import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single() as { data: { stripe_customer_id: string | null } | null; error: unknown }

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const stripe = getStripe()

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[credits/portal] Stripe error:', err)
    return NextResponse.json({ error: 'Unable to open billing portal. Please try again.' }, { status: 503 })
  }
}
