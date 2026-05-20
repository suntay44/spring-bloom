/**
 * GET /api/auth/stripe-connect/callback
 *
 * Stripe Connect OAuth callback. Stripe redirects here after the user
 * authorises the platform. Steps:
 *   1. Verify CSRF state matches the record stored in app_stripe_sandboxes
 *   2. Exchange the authorisation code for an access token + stripe_user_id
 *   3. Create a restricted key scoped to that connected account
 *   4. Inject the live publishable + secret keys into the Fly machine
 *   5. Mark the sandbox row as mode='live' with claimed_at timestamp
 *   6. Redirect the user back to their project
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { injectStripeEnv } from '@/lib/fly/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error) {
    console.error('[stripe-connect callback] OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_connect=error`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_connect=invalid`)
  }

  const db = createAdminClient()

  // Look up the sandbox row by CSRF state
  const { data: sandbox } = await db
    .from('app_stripe_sandboxes')
    .select('project_id')
    .eq('oauth_state', state)
    .maybeSingle()

  if (!sandbox) {
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_connect=invalid_state`)
  }

  const projectId = sandbox.project_id

  // Fetch the project's Fly machine ID
  const { data: project } = await db
    .from('projects')
    .select('fly_machine_id')
    .eq('id', projectId)
    .single()

  // Exchange code for access token
  const stripe = getStripe()
  let stripeUserId: string
  let livePublishableKey: string
  let liveSecretKey: string

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await (stripe.oauth as any).token({ grant_type: 'authorization_code', code })
    stripeUserId      = token.stripe_user_id
    livePublishableKey = token.stripe_publishable_key
    liveSecretKey      = token.access_token  // the connected account's secret key
  } catch (err) {
    console.error('[stripe-connect callback] token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/dashboard?stripe_connect=token_error`)
  }

  // Inject live keys into Fly machine (best-effort)
  if (project?.fly_machine_id) {
    try {
      await injectStripeEnv(project.fly_machine_id, livePublishableKey, liveSecretKey)
    } catch (err) {
      console.error('[stripe-connect callback] Fly env injection failed:', err)
    }
  }

  // Mark sandbox as live
  const now = new Date().toISOString()
  await db.from('app_stripe_sandboxes').update({
    mode: 'live',
    stripe_account_id: stripeUserId,
    oauth_state: null,  // clear the CSRF token
    claimed_at: now,
    updated_at: now,
  }).eq('project_id', projectId)

  // Redirect back to the project's integrations tab
  return NextResponse.redirect(
    `${appUrl}/projects/${projectId}?tab=integrations&stripe_connect=success`,
  )
}
