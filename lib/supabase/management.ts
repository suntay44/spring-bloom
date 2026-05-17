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
