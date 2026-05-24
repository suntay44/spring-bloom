// SERVER ONLY — wraps Cloudflare's Custom Hostnames (SSL for SaaS) API.
//
// Docs: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
//
// Requirements:
//   - CLOUDFLARE_ZONE_ID    — the fallback zone (e.g. springbloom.app) that hosts the
//                              CNAME target users point their domains to.
//   - CLOUDFLARE_API_TOKEN  — token with "Zone → SSL and Certificates → Edit"
//                              and "Zone → Custom Hostnames → Edit" permissions.
//
// Free tier: 100 custom hostnames per zone. Paid plans needed beyond.

const CF_BASE   = 'https://api.cloudflare.com/client/v4'
const ZONE_ID   = process.env.CLOUDFLARE_ZONE_ID!
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

interface CfEnvelope<T> {
  result:   T
  success:  boolean
  errors:   Array<{ code: number; message: string }>
  messages: unknown[]
}

interface OwnershipVerification {
  type?:  'txt' | 'cname' | 'http'
  name?:  string
  value?: string
}

interface SslSummary {
  status?:               string   // pending_validation | active | etc.
  validation_records?:   Array<{ status?: string; txt_name?: string; txt_value?: string }>
}

interface CustomHostname {
  id:        string
  hostname:  string
  status:    'pending' | 'active' | 'active_redeploying' | 'moved' | 'pending_deletion' | 'deleted' | 'pending_blocked' | 'pending_migration' | 'pending_provisioned' | 'test_pending' | 'test_active' | 'test_active_apex' | 'test_blocked' | 'test_failed' | 'provisioned' | 'blocked'
  ssl?:                  SslSummary
  ownership_verification?: OwnershipVerification
  verification_errors?:  string[]
  created_at?:           string
}

function headers() {
  return {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type':  'application/json',
  }
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createCustomHostname(hostname: string): Promise<CustomHostname> {
  const res = await fetch(`${CF_BASE}/zones/${ZONE_ID}/custom_hostnames`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      hostname,
      // Use HTTP validation by default — easiest for the user (no DNS TXT setup).
      // Falls back to TXT if HTTP isn't reachable yet.
      ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
    }),
  })
  const data = await res.json() as CfEnvelope<CustomHostname>
  if (!res.ok || !data.success) {
    const msg = data.errors?.map(e => e.message).join('; ') ?? 'unknown error'
    throw new Error(`CF create custom hostname failed: ${msg}`)
  }
  return data.result
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getCustomHostname(id: string): Promise<CustomHostname> {
  const res = await fetch(`${CF_BASE}/zones/${ZONE_ID}/custom_hostnames/${id}`, {
    headers: headers(),
  })
  const data = await res.json() as CfEnvelope<CustomHostname>
  if (!res.ok || !data.success) {
    const msg = data.errors?.map(e => e.message).join('; ') ?? 'unknown error'
    throw new Error(`CF get custom hostname failed: ${msg}`)
  }
  return data.result
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteCustomHostname(id: string): Promise<void> {
  const res = await fetch(`${CF_BASE}/zones/${ZONE_ID}/custom_hostnames/${id}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CF delete custom hostname failed: ${text.slice(0, 200)}`)
  }
}

// ─── Helpers — map CF status → our DNS/SSL state machine ──────────────────

export interface NormalizedStatus {
  dns_status: 'pending' | 'verifying' | 'active' | 'failed'
  ssl_status: 'pending' | 'validating' | 'active' | 'failed'
  message?:   string
}

export function normalizeStatus(ch: CustomHostname): NormalizedStatus {
  // DNS / overall hostname status
  let dns: NormalizedStatus['dns_status'] = 'pending'
  if (ch.status === 'active' || ch.status === 'active_redeploying' || ch.status === 'provisioned') dns = 'active'
  else if (ch.status === 'pending' || ch.status.startsWith('pending_')) dns = 'verifying'
  else if (ch.status === 'blocked' || ch.status === 'test_failed') dns = 'failed'
  else if (ch.status === 'moved' || ch.status === 'deleted' || ch.status === 'pending_deletion') dns = 'failed'

  // SSL
  let ssl: NormalizedStatus['ssl_status'] = 'pending'
  const ss = ch.ssl?.status
  if (ss === 'active') ssl = 'active'
  else if (ss === 'pending_validation' || ss === 'pending_issuance' || ss === 'pending_deployment') ssl = 'validating'
  else if (ss === 'pending_deletion' || ss === 'expired' || ss === 'deleted') ssl = 'failed'
  else if (ss?.startsWith('pending')) ssl = 'validating'

  const message = ch.verification_errors?.join('; ')
  return { dns_status: dns, ssl_status: ssl, message }
}

// ─── Public type re-export ────────────────────────────────────────────────

export type { CustomHostname }
