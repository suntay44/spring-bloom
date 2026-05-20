// SERVER ONLY — never import in client components
import crypto from 'crypto'

/** Platform-owned Stripe test keys injected into every new app's Fly machine. */
export function getPlatformTestKeys(): { publishableKey: string; secretKey: string } {
  const publishableKey = process.env.STRIPE_TEST_PUBLISHABLE_KEY
  const secretKey = process.env.STRIPE_TEST_SECRET_KEY
  if (!publishableKey || !secretKey) {
    throw new Error('Platform Stripe test keys not configured (STRIPE_TEST_PUBLISHABLE_KEY / STRIPE_TEST_SECRET_KEY)')
  }
  return { publishableKey, secretKey }
}

/** Random CSRF state token for OAuth flows. */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Builds the Stripe Connect OAuth URL.
 * Requires STRIPE_CONNECT_CLIENT_ID in env.
 */
export function buildConnectOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!clientId) throw new Error('STRIPE_CONNECT_CLIENT_ID not configured')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    state,
    redirect_uri: redirectUri,
  })
  return `https://connect.stripe.com/oauth/authorize?${params}`
}
