// SERVER ONLY — never import in client components

import { createHash } from 'crypto'

const CF_BASE = 'https://api.cloudflare.com/client/v4'
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

function cfHeaders() {
  return {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// Create a new Cloudflare Pages project for a user's app
export async function createPagesProject(projectName: string): Promise<{ id: string; subdomain: string }> {
  const res = await fetch(`${CF_BASE}/accounts/${ACCOUNT_ID}/pages/projects`, {
    method: 'POST',
    headers: cfHeaders(),
    body: JSON.stringify({
      name: projectName,
      production_branch: 'main',
    }),
  })
  const data = await res.json() as { result: { id: string; subdomain: string }; success: boolean; errors: unknown[] }
  if (!res.ok || !data.success) throw new Error(`CF Pages create failed: ${JSON.stringify(data.errors)}`)
  return data.result
}

// Maximum total payload size for a Direct Upload deployment (25 MB).
const MAX_TOTAL_BYTES = 25 * 1024 * 1024

// Minimal MIME map for static site assets. Falls back to octet-stream.
function mimeFor(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = {
    html: 'text/html', htm: 'text/html', css: 'text/css', js: 'application/javascript',
    mjs: 'application/javascript', json: 'application/json', svg: 'image/svg+xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', ico: 'image/x-icon', txt: 'text/plain', xml: 'application/xml',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', map: 'application/json',
    wasm: 'application/wasm', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm',
  }
  return map[ext] ?? 'application/octet-stream'
}

interface CFDeploymentResponse {
  result: { id: string; url: string } | null
  success: boolean
  errors: unknown[]
}

// Deploy a set of files to Cloudflare Pages via the Direct Upload v2 API.
// `files`: Record<relativePath, base64-encoded file contents>.
export async function deployToPages(
  projectName: string,
  files: Record<string, string>
): Promise<{ deploymentId: string; url: string }> {
  const form = new FormData()
  const manifest: Record<string, string> = {}
  let totalBytes = 0

  for (const [relPath, base64] of Object.entries(files)) {
    const buf = Buffer.from(base64, 'base64')
    totalBytes += buf.byteLength
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(
        `Build output exceeds the 25MB Cloudflare Pages Direct Upload limit (${totalBytes} bytes)`
      )
    }
    const hash = createHash('sha256').update(buf).digest('hex')
    const normalizedPath = relPath.startsWith('/') ? relPath : `/${relPath}`
    manifest[normalizedPath] = hash
    // Each file blob is keyed by its sha256 hex digest.
    form.append(
      hash,
      new Blob([new Uint8Array(buf)], { type: mimeFor(relPath) }),
      hash
    )
  }

  form.append('manifest', JSON.stringify(manifest))

  const deployRes = await fetch(
    `${CF_BASE}/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: form,
    }
  )
  const deployData = (await deployRes.json()) as CFDeploymentResponse
  if (!deployRes.ok || !deployData.success || !deployData.result) {
    throw new Error(`CF Pages deploy failed: ${JSON.stringify(deployData.errors)}`)
  }
  return { deploymentId: deployData.result.id, url: deployData.result.url }
}

// Add a custom hostname via Cloudflare for SaaS
export async function addCustomHostname(zoneId: string, hostname: string): Promise<{ id: string; status: string }> {
  const res = await fetch(`${CF_BASE}/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    headers: cfHeaders(),
    body: JSON.stringify({ hostname, ssl: { method: 'http', type: 'dv' } }),
  })
  const data = await res.json() as { result: { id: string; status: string }; success: boolean; errors: unknown[] }
  if (!res.ok || !data.success) throw new Error(`CF custom hostname failed: ${JSON.stringify(data.errors)}`)
  return data.result
}

// Generate a URL-safe slug from a project name
export function generateSlug(name: string, id: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const suffix = id.slice(0, 6)
  return `${base}-${suffix}`
}
