'use client'
import { useEffect, useState } from 'react'

export function useMachineProvisioner(projectId: string, initialMachineId: string | null) {
  // Seed initial state from initialMachineId so the UI shows "starting" rather
  // than "provisioning from scratch" — but we still always hit the API below to
  // ensure the machine is actually running (it may be stopped on reopen).
  const [machineId, setMachineId] = useState<string | null>(initialMachineId)
  const [provisioning, setProvisioning] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setProvisioning(true)

    // Always call the API — the route is idempotent: it starts an existing
    // machine, creates one if missing, and handles deleted machines.
    async function provision() {
      try {
        const res = await fetch('/api/fly/machine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        })
        const json = await res.json() as { data?: { id: string }; error?: string }
        if (cancelled) return
        if (!res.ok || !json.data) {
          setError(json.error ?? 'Failed to provision machine')
          return
        }
        setMachineId(json.data.id)
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setProvisioning(false)
      }
    }

    void provision()
    return () => { cancelled = true }
  }, [projectId])

  return { machineId, provisioning, error }
}
