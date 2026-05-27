// SERVER ONLY — per-project Stripe clients using the user's keys (from project_secrets).
//
// Different from lib/stripe/client.ts (which uses the platform's STRIPE_SECRET_KEY
// for our own billing). This one talks to the customer's Stripe account.

import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Look up the project's Stripe secret key from project_secrets, instantiate
 * a Stripe client with it. Throws if the project hasn't connected Stripe.
 */
export async function getProjectStripe(projectId: string): Promise<Stripe> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('project_secrets')
    .select('secret_config')
    .eq('project_id', projectId)
    .eq('type', 'stripe')
    .maybeSingle()

  const config = (data as { secret_config?: Record<string, string> } | null)?.secret_config
  const secretKey = config?.secret_key
  if (!secretKey) {
    throw new Error('Stripe is not connected for this project. Connect it in Integrations first.')
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
    appInfo: { name: 'SpringBloom', version: '1.0.0' },
  })
}
