// SERVER ONLY — never import in client components
const MGMT_BASE = 'https://api.supabase.com/v1'

function mgmtHeaders() {
  return {
    Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN!}`,
    'Content-Type': 'application/json',
  }
}

export interface SupabaseProject {
  id: string
  ref: string
  name: string
  status: string
  api_url?: string  // not always returned by Management API — derive from ref if missing
  region: string
}

export interface SupabaseApiKey {
  name: string
  api_key: string
}

// Create a new Supabase project for a user. Takes ~30s to become ready.
export async function createSupabaseProject(params: {
  name: string
  region?: string
  dbPass: string
}): Promise<SupabaseProject> {
  const res = await fetch(`${MGMT_BASE}/projects`, {
    method: 'POST',
    headers: mgmtHeaders(),
    body: JSON.stringify({
      name: params.name,
      organization_id: process.env.SUPABASE_ORG_ID!,
      region: params.region ?? 'us-east-1',
      db_pass: params.dbPass,
      plan: 'free',
    }),
  })
  if (!res.ok) throw new Error(`Supabase create project failed: ${await res.text()}`)
  return res.json() as Promise<SupabaseProject>
}

// Poll until project status is 'ACTIVE_HEALTHY'. Timeout after 120s.
export async function waitForProject(ref: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${MGMT_BASE}/projects/${ref}`, { headers: mgmtHeaders() })
    if (res.ok) {
      const project = await res.json() as { status: string }
      if (project.status === 'ACTIVE_HEALTHY') return
    }
    await new Promise((r) => setTimeout(r, 4000))
  }
  throw new Error(`Supabase project ${ref} did not become healthy within ${timeoutMs}ms`)
}

export async function getProjectApiKeys(ref: string): Promise<SupabaseApiKey[]> {
  const res = await fetch(`${MGMT_BASE}/projects/${ref}/api-keys`, {
    headers: mgmtHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to get API keys for project ${ref}`)
  return res.json() as Promise<SupabaseApiKey[]>
}

// Run a SQL migration on the user's Supabase project
export async function runMigration(ref: string, sql: string): Promise<void> {
  const res = await fetch(`${MGMT_BASE}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: mgmtHeaders(),
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`Migration failed on project ${ref}: ${await res.text()}`)
}

// ── Auth Provider Config ──────────────────────────────────────────────────────
//
// These two functions work with EITHER:
//   A) SpringBloom-provisioned projects → pass pat = undefined (uses SUPABASE_MANAGEMENT_TOKEN)
//   B) User BYOK projects               → pass pat = user's Personal Access Token
//
// The Management API endpoint:
//   GET/PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
//
// Derive ref from project URL: "https://xxx.supabase.co" → ref = "xxx"

export interface AuthProviderConfig {
  // Email
  external_email_enabled:         boolean
  // Google
  external_google_enabled:        boolean
  external_google_client_id:      string
  external_google_secret:         string
  // Apple
  external_apple_enabled:         boolean
  external_apple_client_id:       string  // Service ID
  external_apple_secret:          string  // private key in PEM format
  // Facebook / Meta
  external_facebook_enabled:      boolean
  external_facebook_client_id:    string
  external_facebook_secret:       string
  // GitHub
  external_github_enabled:        boolean
  external_github_client_id:      string
  external_github_secret:         string
}

function resolveToken(pat?: string): string {
  return pat ?? process.env.SUPABASE_MANAGEMENT_TOKEN!
}

/** Extract the project ref from a Supabase project URL.
 *  "https://xxx.supabase.co" → "xxx"
 *  "https://xxx.supabase.co/" → "xxx"
 */
export function refFromUrl(projectUrl: string): string {
  const hostname = new URL(projectUrl).hostname       // "xxx.supabase.co"
  return hostname.split('.')[0]!                      // "xxx"
}

/** Read the current auth provider config from the Supabase Management API. */
export async function getAuthConfig(
  projectUrl: string,
  pat?: string,
): Promise<Partial<AuthProviderConfig>> {
  const ref = refFromUrl(projectUrl)
  const res = await fetch(`${MGMT_BASE}/projects/${ref}/config/auth`, {
    headers: {
      Authorization: `Bearer ${resolveToken(pat)}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to read auth config for ${ref}: ${await res.text()}`)
  }
  return res.json() as Promise<Partial<AuthProviderConfig>>
}

/** Update one or more auth provider settings. Only sends changed fields. */
export async function updateAuthConfig(
  projectUrl: string,
  config: Partial<AuthProviderConfig>,
  pat?: string,
): Promise<void> {
  const ref = refFromUrl(projectUrl)
  const res = await fetch(`${MGMT_BASE}/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${resolveToken(pat)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    throw new Error(`Failed to update auth config for ${ref}: ${await res.text()}`)
  }
}
