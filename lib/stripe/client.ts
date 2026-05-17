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
