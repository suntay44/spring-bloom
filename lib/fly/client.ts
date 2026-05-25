// SERVER ONLY — never import in client components
const FLY_API_BASE = 'https://api.machines.dev/v1'
const FLY_APP_NAME = process.env.FLY_APP_NAME!
const FLY_API_TOKEN = process.env.FLY_API_TOKEN!

function headers() {
  return {
    Authorization: `Bearer ${FLY_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export interface FlyMachine {
  id: string
  name: string
  state: string
  region: string
  private_ip: string
}

// Provision a new machine. Image: node:20-slim. 1 CPU, 512MB RAM.
export async function createMachine(projectId: string): Promise<FlyMachine> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: `project-${projectId.slice(0, 8)}`,
      config: {
        image: 'node:20-slim',
        guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
        auto_destroy: false,
        restart: { policy: 'no' },
        env: { PROJECT_ID: projectId },
        services: [
          {
            ports: [{ port: 3000, handlers: ['http'] }],
            protocol: 'tcp',
            internal_port: 3000,
            // Auto-suspend when idle (warm boot ~1s) rather than full stop (~10s cold).
            // Only applies to newly-created machines; existing machines unaffected.
            auto_stop_machines: 'suspend',
            auto_start_machines: true,
            min_machines_running: 0,
          },
        ],
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fly create machine failed: ${err}`)
  }
  return res.json() as Promise<FlyMachine>
}

export async function startMachine(machineId: string): Promise<void> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/start`, {
    method: 'POST',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Fly start machine failed: ${res.status}`)
}

export async function stopMachine(machineId: string): Promise<void> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`, {
    method: 'POST',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Fly stop machine failed: ${res.status}`)
}

export async function getMachine(machineId: string): Promise<FlyMachine> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Fly get machine failed: ${res.status}`)
  return res.json() as Promise<FlyMachine>
}

// Execute a command inside the machine and return stdout/stderr
export async function execOnMachine(
  machineId: string,
  command: string[],
  cwd = '/app',
  timeoutSec = 30
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/exec`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ command, cwd, timeout: timeoutSec }),
  })
  if (!res.ok) throw new Error(`Fly exec failed: ${res.status}`)
  return res.json() as Promise<{ stdout: string; stderr: string; exit_code: number }>
}

// Read a single file from the machine as base64. IDOR-guarded path.
export async function readFileAsBase64(machineId: string, absPath: string): Promise<string> {
  if (!/^\/app\/[\w.\-/]+$/.test(absPath)) {
    throw new Error(`Unsafe file path rejected: ${absPath}`)
  }
  const result = await execOnMachine(machineId, [
    'sh', '-c', 'base64 -w0 "$1"', '--', absPath,
  ])
  return result.stdout
}

// List every file under /app/dist (build output). Returns [] if dist doesn't exist.
export async function listDistFiles(machineId: string): Promise<string[]> {
  try {
    const result = await execOnMachine(machineId, ['find', '/app/dist', '-type', 'f'])
    return result.stdout.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

// Write a single file to the machine via exec + base64.
// Uses printf + argument array to avoid shell injection from AI-generated file paths.
export async function writeFile(
  machineId: string,
  filePath: string,
  content: string
): Promise<void> {
  const encoded = Buffer.from(content).toString('base64')
  // Sanitize: reject paths that escape /app or contain shell metacharacters
  if (!/^\/app\/[\w./-]+$/.test(filePath)) {
    throw new Error(`Unsafe file path rejected: ${filePath}`)
  }
  const dir = filePath.slice(0, filePath.lastIndexOf('/'))
  // Pass base64 via argument (not interpolated into shell string) to prevent injection
  await execOnMachine(machineId, [
    'sh', '-c',
    'mkdir -p "$1" && printf "%s" "$2" | base64 -d > "$3"',
    '--', dir, encoded, filePath,
  ])
}

// R0-8: Destroy a machine (and its root volume). Used by the TTL sweeper to
// reclaim compute on abandoned projects. Returns true on success, false if the
// machine was already gone (404). Throws on other errors.
export async function destroyMachine(machineId: string): Promise<boolean> {
  // Fly destroy requires the machine to be stopped first.
  try { await stopMachine(machineId) } catch { /* may already be stopped */ }
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}?force=true`,
    { method: 'DELETE', headers: headers() },
  )
  if (res.status === 404) return false
  if (!res.ok) throw new Error(`Fly destroy failed: ${res.status} ${await res.text()}`)
  return true
}

// List files in /app on the machine
export async function listFiles(machineId: string): Promise<string[]> {
  const result = await execOnMachine(machineId, ['find', '/app', '-type', 'f', '-not', '-path', '*/node_modules/*'])
  return result.stdout.split('\n').filter(Boolean).map((f) => f.replace('/app/', ''))
}

// R0-4: cached variant — file tree changes only on writes, so a 60s TTL is fine.
// Saves a Fly exec round-trip (wakes suspended VM) on every chat turn.
interface FileTreeCacheEntry { files: string[]; fetchedAt: number }
const FILE_TREE_CACHE = new Map<string, FileTreeCacheEntry>()
const FILE_TREE_TTL_MS = 60_000

export function invalidateFileTreeCache(machineId: string): void {
  FILE_TREE_CACHE.delete(machineId)
}

export async function listFilesCached(machineId: string): Promise<string[]> {
  const cached = FILE_TREE_CACHE.get(machineId)
  if (cached && Date.now() - cached.fetchedAt < FILE_TREE_TTL_MS) {
    return cached.files
  }
  try {
    const files = await listFiles(machineId)
    FILE_TREE_CACHE.set(machineId, { files, fetchedAt: Date.now() })
    return files
  } catch {
    return cached?.files ?? []   // soft-fail: stale data > no data
  }
}

// Inject (or replace) STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in /app/.env.local.
// Removes any existing STRIPE_ key lines first to avoid duplicates.
export async function injectStripeEnv(
  machineId: string,
  publishableKey: string,
  secretKey: string,
): Promise<void> {
  await execOnMachine(machineId, [
    'sh', '-c',
    'touch /app/.env.local && ' +
    'sed -i "/^STRIPE_PUBLISHABLE_KEY=/d; /^STRIPE_SECRET_KEY=/d" /app/.env.local && ' +
    'printf "STRIPE_PUBLISHABLE_KEY=%s\\nSTRIPE_SECRET_KEY=%s\\n" "$1" "$2" >> /app/.env.local',
    '--',
    publishableKey,
    secretKey,
  ])
}
