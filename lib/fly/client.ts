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
  cwd = '/app'
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/exec`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ command, cwd, timeout: 30 }),
  })
  if (!res.ok) throw new Error(`Fly exec failed: ${res.status}`)
  return res.json() as Promise<{ stdout: string; stderr: string; exit_code: number }>
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

// List files in /app on the machine
export async function listFiles(machineId: string): Promise<string[]> {
  const result = await execOnMachine(machineId, ['find', '/app', '-type', 'f', '-not', '-path', '*/node_modules/*'])
  return result.stdout.split('\n').filter(Boolean).map((f) => f.replace('/app/', ''))
}
