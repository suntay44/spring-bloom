'use client'
import { useEffect, useState } from 'react'

export function useMachineProvisioner(projectId: string, initialMachineId: string | null) {
  const [machineId, setMachineId] = useState<string | null>(initialMachineId)
  const [provisioning, setProvisioning] = useState(!initialMachineId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialMachineId) return // already have a machine
    let cancelled = false

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
  }, [projectId, initialMachineId])

  return { machineId, provisioning, error }
}
