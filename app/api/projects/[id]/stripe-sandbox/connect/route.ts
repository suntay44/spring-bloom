/**
 * GET /api/projects/[id]/stripe-sandbox/connect
 *
 * Generates a Stripe Connect OAuth URL for the project owner to "Go Live".
 * Stores a CSRF state token in app_stripe_sandboxes so the callback can
 * look up which project to update.
 *
 * Returns: { url: string }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOAuthState, buildConnectOAuthUrl } from '@/lib/stripe/sandbox'
import { writeRateLimit } from '@/lib/rate-limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit — prevents OAuth-state spamming
  const { success } = await writeRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  const { data: project } = await supabase
    .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const state = generateOAuthState()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/auth/stripe-connect/callback`

  const db = createAdminClient()
  const { error } = await db.from('app_stripe_sandboxes').upsert(
    { project_id: projectId, oauth_state: state, updated_at: new Date().toISOString() },
    { onConflict: 'project_id' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = buildConnectOAuthUrl(state, redirectUri)
  return NextResponse.json({ url })
}
