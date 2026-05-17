import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'

// Service-role client — credit grants bypass RLS
const platformClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  const stripe = getStripe()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const credits = Number(session.metadata?.credits ?? 0)

    if (!userId || !credits) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Insert credit purchase transaction — idempotent via stripe_session_id unique constraint
    const { error: insertError } = await (platformClient as unknown as ReturnType<typeof createClient<any>>)
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
      // Duplicate = already processed (Stripe retried), safe to ack
      if ((insertError as { code?: string }).code === '23505') {
        return NextResponse.json({ received: true })
      }
      console.error('[stripe webhook] credit insert failed:', insertError)
      return NextResponse.json({ error: 'Credit insert failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

// Required: disable body parsing so stripe-signature verification works
export const config = { api: { bodyParser: false } }
