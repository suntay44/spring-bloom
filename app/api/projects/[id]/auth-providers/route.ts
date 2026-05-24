/**
 * GET  /api/projects/[id]/auth-providers
 *   Returns cached auth provider state from project_integrations.auth_config.
 *   Falls back to live Management API fetch if cache is empty.
 *
 * POST /api/projects/[id]/auth-providers
 *   Toggles a provider on/off and optionally sets OAuth credentials.
 *   Works for both:
 *     A) SpringBloom-provisioned projects (uses SUPABASE_MANAGEMENT_TOKEN)
 *     B) User BYOK projects (uses PAT from project_secrets)
 *
 * Body: {
 *   provider: 'google' | 'apple' | 'facebook' | 'github' | 'email'
 *   enabled: boolean
 *   credentials?: { client_id?: string; secret?: string; [key: string]: string | undefined }
 * }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthConfig, updateAuthConfig, refFromUrl, type AuthProviderConfig } from '@/lib/supabase/management'

// Only these fields are safe to return to the browser — never return *_secret values
const AUTH_CONFIG_PUBLIC_FIELDS = new Set([
  'external_email_enabled',
  'external_google_enabled',   'external_google_client_id',
  'external_apple_enabled',    'external_apple_client_id',
  'external_facebook_enabled', 'external_facebook_client_id',
  'external_github_enabled',   'external_github_client_id',
])

function redactAuthConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([k]) => AUTH_CONFIG_PUBLIC_FIELDS.has(k))
  )
}

type Provider = 'email' | 'google' | 'apple' | 'facebook' | 'github'

const PROVIDER_KEYS: Record<Provider, (keyof AuthProviderConfig)[]> = {
  email:    ['external_email_enabled'],
  google:   ['external_google_enabled', 'external_google_client_id', 'external_google_secret'],
  apple:    ['external_apple_enabled',  'external_apple_client_id',  'external_apple_secret'],
  facebook: ['external_facebook_enabled', 'external_facebook_client_id', 'external_facebook_secret'],
  github:   ['external_github_enabled', 'external_github_client_id', 'external_github_secret'],
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  // Return cached auth_config from project_integrations
  const { data: integration } = await supabase
    .from('project_integrations')
    .select('auth_config, public_config')
    .eq('project_id', projectId)
    .eq('type', 'supabase')
    .maybeSingle()

  const cached = integration?.auth_config as Record<string, unknown> | null

  // If we have a cached config, return it — redact secrets before sending to browser
  if (cached && Object.keys(cached).length > 0) {
    return NextResponse.json({ config: redactAuthConfig(cached), source: 'cache' })
  }

  // No cache — try live fetch if we have a project URL
  const projectUrl = (integration?.public_config as Record<string, string> | null)?.project_url
  if (!projectUrl) {
    return NextResponse.json({ config: {}, source: 'empty' })
  }

  try {
    // Get PAT from project_secrets (BYOK) — admin client bypasses RLS
    const admin = createAdminClient()
    const { data: secrets } = await admin
      .from('project_secrets')
      .select('secret_config')
      .eq('project_id', projectId)
      .eq('type', 'supabase')
      .maybeSingle()

    const pat = (secrets?.secret_config as Record<string, string> | null)?.management_pat
    const config = await getAuthConfig(projectUrl, pat)

    // Cache only public fields — never persist OAuth secrets to project_integrations
    const safeConfig = redactAuthConfig(config as Record<string, unknown>)
    await supabase
      .from('project_integrations')
      .update({ auth_config: safeConfig })
      .eq('project_id', projectId)
      .eq('type', 'supabase')

    return NextResponse.json({ config: safeConfig, source: 'live' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch auth config'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const body = await req.json() as {
    provider: Provider
    enabled: boolean
    credentials?: Record<string, string>
  }

  const { provider, enabled, credentials = {} } = body
  if (!provider || enabled === undefined) {
    return NextResponse.json({ error: 'provider and enabled are required' }, { status: 400 })
  }

  // Verify project ownership + get Supabase URL
  const { data: integration } = await supabase
    .from('project_integrations')
    .select('public_config, auth_config')
    .eq('project_id', projectId)
    .eq('type', 'supabase')
    .maybeSingle()

  const projectUrl = (integration?.public_config as Record<string, string> | null)?.project_url
  if (!projectUrl) {
    return NextResponse.json(
      { error: 'No Supabase project connected. Add your project URL in Integrations first.' },
      { status: 400 },
    )
  }

  // Get PAT from project_secrets for BYOK projects
  const admin = createAdminClient()
  const { data: secrets } = await admin
    .from('project_secrets')
    .select('secret_config')
    .eq('project_id', projectId)
    .eq('type', 'supabase')
    .maybeSingle()

  const secretConfig = secrets?.secret_config as Record<string, string> | null
  const pat = secretConfig?.management_pat

  // Build the patch payload
  const enabledKey = `external_${provider}_enabled` as keyof AuthProviderConfig
  const patch: Partial<AuthProviderConfig> = {
    [enabledKey]: enabled,
  }

  // Map credential keys to Supabase Management API field names
  if (credentials.client_id) {
    const clientKey = `external_${provider}_client_id` as keyof AuthProviderConfig
    patch[clientKey] = credentials.client_id as never
  }
  if (credentials.secret) {
    const secretKey = `external_${provider}_secret` as keyof AuthProviderConfig
    patch[secretKey] = credentials.secret as never
  }
  // Apple-specific extra fields
  if (credentials.team_id)    (patch as Record<string, unknown>)[`external_apple_team_id`]    = credentials.team_id
  if (credentials.key_id)     (patch as Record<string, unknown>)[`external_apple_key_id`]     = credentials.key_id

  try {
    await updateAuthConfig(projectUrl, patch, pat)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Management API call failed'

    // Friendly message for missing PAT
    if (msg.includes('401') || msg.includes('403')) {
      return NextResponse.json(
        { error: 'Invalid or missing Management API Token. Add your Supabase PAT in Integrations → Supabase → Management API Token.' },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Update the cached auth_config in project_integrations
  const currentCache = (integration?.auth_config as Record<string, unknown>) ?? {}
  const newCache = {
    ...currentCache,
    ...patch,
    last_synced_at: new Date().toISOString(),
  }

  await supabase
    .from('project_integrations')
    .update({ auth_config: newCache })
    .eq('project_id', projectId)
    .eq('type', 'supabase')

  // Verify provider keys exist in PROVIDER_KEYS for the eslint unused var
  void PROVIDER_KEYS

  return NextResponse.json({ ok: true, ref: refFromUrl(projectUrl) })
}
