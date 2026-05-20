"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Ban } from "lucide-react"

interface Props {
  clusterId: string
  currentStatus: "candidate" | "canonical" | "deprecated"
}

export function ClusterPromoteButton({ clusterId, currentStatus }: Props) {
  const [status, setStatus]   = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function act(action: "promote" | "demote" | "deprecate") {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/library/clusters/${clusterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? "Request failed")
      }
      const nextStatus = action === "promote" ? "canonical" : action === "demote" ? "candidate" : "deprecated"
      setStatus(nextStatus as typeof status)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const badge = {
    candidate:  "bg-zinc-700 text-zinc-300",
    canonical:  "bg-green-900/50 text-green-400",
    deprecated: "bg-red-900/50 text-red-400",
  }[status]

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badge}`}>{status}</span>
      {status !== "canonical"   && <button onClick={() => act("promote")}   disabled={loading} title="Promote to canonical"   className="rounded p-1 text-green-400 hover:bg-zinc-800 disabled:opacity-40"><ChevronUp size={14}/></button>}
      {status === "canonical"   && <button onClick={() => act("demote")}    disabled={loading} title="Demote to candidate"   className="rounded p-1 text-yellow-400 hover:bg-zinc-800 disabled:opacity-40"><ChevronDown size={14}/></button>}
      {status !== "deprecated"  && <button onClick={() => act("deprecate")} disabled={loading} title="Deprecate"              className="rounded p-1 text-red-400 hover:bg-zinc-800 disabled:opacity-40"><Ban size={14}/></button>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
