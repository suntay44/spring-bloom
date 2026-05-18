// SERVER ONLY — never import in client components

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

// Deploy a set of files to Cloudflare Pages via Direct Upload
// files: Record<path, content as string>
export async function deployToPages(projectName: string, files: Record<string, string>): Promise<{ deploymentId: string; url: string }> {
  // 1. Create a deployment
  const deployRes = await fetch(`${CF_BASE}/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/deployments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_TOKEN}` },
    // Cloudflare Pages Direct Upload uses multipart form with file manifest
    // This is a stub — real implementation uses the Wrangler Pages Upload API
    body: JSON.stringify({ files }),
  })
  const deployData = await deployRes.json() as { result: { id: string; url: string }; success: boolean; errors: unknown[] }
  if (!deployRes.ok || !deployData.success) throw new Error(`CF Pages deploy failed: ${JSON.stringify(deployData.errors)}`)
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
