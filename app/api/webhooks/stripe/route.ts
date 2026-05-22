import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getStripe, planFromPriceId, PLAN_MONTHLY_CREDITS, type SubscriptionPlan } from '@/lib/stripe/client'
import type Stripe from 'stripe'

// Service-role client — credit grants and profile updates bypass RLS
const platformClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = platformClient as unknown as ReturnType<typeof createClient<any>>

export async function POST(req: Request) {
  const stripe = getStripe()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── checkout.session.completed (one-time credit pack) ─────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const credits = Number(session.metadata?.credits ?? 0)

    // Only handle one-time pack purchases here; subscription events handled below
    if (userId && credits) {
      const { error: insertError } = await db
        .from('credit_transactions')
        .insert({
          user_id: userId,
          type: 'purchase',
          amount: credits,
          stripe_session_id: session.id,
          metadata: {
            stripe_payment_intent: session.payment_intent,
          },
        })
        .select()

      if (insertError) {
        if ((insertError as { code?: string }).code === '23505') {
          return NextResponse.json({ received: true })
        }
        console.error('[stripe webhook] credit insert failed:', insertError)
        return NextResponse.json({ error: 'Credit insert failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })
  }

  // ── customer.subscription.created ─────────────────────────────────────────
  if (event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) return NextResponse.json({ received: true })

    const plan = sub.metadata?.plan ?? resolvePlanFromSubscription(sub)

    const { error } = await db
      .from('profiles')
      .update({
        plan,
        subscription_id: sub.id,
        subscription_status: sub.status === 'trialing' ? 'trialing' : 'active',
        plan_period_end: new Date((sub.current_period_end as unknown as number) * 1000).toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('[stripe webhook] subscription.created profile update failed:', error)
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) return NextResponse.json({ received: true })

    // Map Stripe status to our internal status
    let subscriptionStatus: string = sub.status
    if (sub.cancel_at_period_end) subscriptionStatus = 'canceling'

    const plan = sub.metadata?.plan ?? resolvePlanFromSubscription(sub)

    const { error } = await db
      .from('profiles')
      .update({
        plan: sub.status === 'canceled' ? 'free' : plan,
        subscription_id: sub.id,
        subscription_status: subscriptionStatus,
        plan_period_end: new Date((sub.current_period_end as unknown as number) * 1000).toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('[stripe webhook] subscription.updated profile update failed:', error)
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  }

  // ── customer.subscription.deleted ─────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) return NextResponse.json({ received: true })

    const { error } = await db
      .from('profiles')
      .update({
        plan: 'free',
        subscription_id: null,
        subscription_status: 'inactive',
        plan_period_end: null,
      })
      .eq('id', userId)

    if (error) {
      console.error('[stripe webhook] subscription.deleted profile update failed:', error)
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  }

  // ── invoice.paid ──────────────────────────────────────────────────────────
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice

    // Only handle subscription invoices (not one-time payments)
    if (!invoice.subscription) return NextResponse.json({ received: true })

    let sub: Stripe.Subscription
    try {
      sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
    } catch (err) {
      console.error('[stripe webhook] invoice.paid: could not retrieve subscription:', err)
      return NextResponse.json({ error: 'Stripe error' }, { status: 503 })
    }

    const userId = sub.metadata?.userId
    if (!userId) return NextResponse.json({ received: true })

    const planName = (sub.metadata?.plan ?? resolvePlanFromSubscription(sub)) as SubscriptionPlan | undefined
    if (!planName || !PLAN_MONTHLY_CREDITS[planName]) return NextResponse.json({ received: true })

    const credits = PLAN_MONTHLY_CREDITS[planName]
    const billingPeriodStart = new Date((sub.current_period_start as unknown as number) * 1000).toISOString()

    // Idempotency: only grant credits once per billing period
    const { data: existing } = await db
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'plan_reset')
      .gte('created_at', billingPeriodStart)
      .maybeSingle()

    if (existing) {
      // Already granted for this period
      return NextResponse.json({ received: true })
    }

    const { error: insertError } = await db
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'plan_reset',
        amount: credits,
        metadata: {
          plan: planName,
          stripe_invoice_id: invoice.id,
          billing_period_start: billingPeriodStart,
        },
      })

    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        return NextResponse.json({ received: true })
      }
      console.error('[stripe webhook] invoice.paid credit insert failed:', insertError)
      return NextResponse.json({ error: 'Credit insert failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}

/** Attempt to derive the plan name from subscription line items' price IDs. */
function resolvePlanFromSubscription(sub: Stripe.Subscription): SubscriptionPlan | undefined {
  for (const item of sub.items.data) {
    const plan = planFromPriceId(item.price.id)
    if (plan) return plan
  }
  return undefined
}

// Body parsing is handled by reading req.body as raw bytes in the handler above.
// (The App Router does not use the Pages Router config export.)
