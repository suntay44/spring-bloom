// SERVER ONLY — never import in client components
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    })
  }
  return _stripe
}

// Top-up pack definitions — single source of truth
export const CREDIT_PACKS = [
  { credits: 100,  priceUsd: 17,  label: '100 credits',   popular: false },
  { credits: 250,  priceUsd: 40,  label: '250 credits',   popular: true  },
  { credits: 500,  priceUsd: 75,  label: '500 credits',   popular: false },
  { credits: 1000, priceUsd: 140, label: '1,000 credits', popular: false },
] as const

export type CreditPack = typeof CREDIT_PACKS[number]

// Subscription plan → Stripe recurring price ID mapping
export const SUBSCRIPTION_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER_ID!,
  pro:     process.env.STRIPE_PRICE_PRO_ID!,
  teams:   process.env.STRIPE_PRICE_TEAMS_ID!,
}

export type SubscriptionPlan = 'starter' | 'pro' | 'teams'

// Monthly credits granted per plan on invoice.paid
export const PLAN_MONTHLY_CREDITS: Record<SubscriptionPlan, number> = {
  starter: 100,
  pro:     175,
  teams:   500,
}

/** Reverse-map a Stripe price ID to a plan name, or return undefined. */
export function planFromPriceId(priceId: string): SubscriptionPlan | undefined {
  const entry = Object.entries(SUBSCRIPTION_PRICES).find(([, id]) => id === priceId)
  return entry ? (entry[0] as SubscriptionPlan) : undefined
}
