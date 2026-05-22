// SERVER ONLY — never import in client components
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return _stripe
}

// Top-up pack definitions — single source of truth.
// Per-credit price is higher than plan rate to incentivise subscribing.
export const CREDIT_PACKS = [
  { credits: 10,  priceUsd: 4,  label: '10 credits',  popular: false },  // $0.40/cr
  { credits: 25,  priceUsd: 8,  label: '25 credits',  popular: true  },  // $0.32/cr
  { credits: 50,  priceUsd: 14, label: '50 credits',  popular: false },  // $0.28/cr
  { credits: 100, priceUsd: 25, label: '100 credits', popular: false },  // $0.25/cr
] as const

export type CreditPack = typeof CREDIT_PACKS[number]

// Subscription plan → Stripe recurring price ID mapping
export const SUBSCRIPTION_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER_ID!,
  pro:     process.env.STRIPE_PRICE_PRO_ID!,
  teams:   process.env.STRIPE_PRICE_TEAMS_ID!,
}

export type SubscriptionPlan = 'starter' | 'pro' | 'teams'

// Monthly credits granted per plan on invoice.paid — must stay in sync with
// PLAN_CREDIT_LIMITS in lib/credits/limits.ts
export const PLAN_MONTHLY_CREDITS: Record<SubscriptionPlan, number> = {
  starter: 50,
  pro:     150,
  teams:   500,
}

/** Reverse-map a Stripe price ID to a plan name, or return undefined. */
export function planFromPriceId(priceId: string): SubscriptionPlan | undefined {
  const entry = Object.entries(SUBSCRIPTION_PRICES).find(([, id]) => id === priceId)
  return entry ? (entry[0] as SubscriptionPlan) : undefined
}
