"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Loader2, Wifi } from "lucide-react"

const SERVICES = [
  { id: "supabase",   label: "Supabase",   desc: "Platform database + auth" },
  { id: "fly",        label: "Fly.io",     desc: "Machine compute" },
  { id: "stripe",     label: "Stripe",     desc: "Payments" },
  { id: "anthropic",  label: "Anthropic",  desc: "AI models" },
  { id: "cloudflare", label: "Cloudflare", desc: "CDN + user app hosting" },
  { id: "upstash",    label: "Upstash",    desc: "Rate limiting (Redis)" },
] as const

type ServiceId = typeof SERVICES[number]["id"]
type Status = { ok: boolean; latencyMs?: number; error?: string } | null

export function HealthCheckPanel() {
  const [results,  setResults]  = useState<Record<ServiceId, Status>>({} as Record<ServiceId, Status>)
  const [loading,  setLoading]  = useState<Record<ServiceId, boolean>>({} as Record<ServiceId, boolean>)

  async function check(service: ServiceId) {
    setLoading(prev => ({ ...prev, [service]: true }))
    try {
      const res = await fetch("/api/admin/settings/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      })
      const data = await res.json() as Status
      setResults(prev => ({ ...prev, [service]: data }))
    } catch {
      setResults(prev => ({ ...prev, [service]: { ok: false, error: "Network error" } }))
    } finally {
      setLoading(prev => ({ ...prev, [service]: false }))
    }
  }

  async function checkAll() {
    await Promise.all(SERVICES.map(s => check(s.id)))
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">Service Health</h2>
        <button
          onClick={checkAll}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
        >
          <Wifi size={12} /> Check All
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ id, label, desc }) => {
          const result  = results[id]
          const isLoading = loading[id]
          return (
            <div key={id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
                {result && !result.ok && (
                  <p className="mt-0.5 text-xs text-red-400">{result.error}</p>
                )}
                {result?.ok && result.latencyMs !== undefined && (
                  <p className="mt-0.5 text-xs text-zinc-500">{result.latencyMs}ms</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin text-zinc-400" />
                ) : result ? (
                  result.ok
                    ? <CheckCircle2 size={16} className="text-green-400" />
                    : <XCircle size={16} className="text-red-400" />
                ) : null}
                <button
                  onClick={() => check(id)}
                  disabled={isLoading}
                  className="text-xs text-zinc-500 hover:text-white disabled:opacity-40"
                >
                  {result ? "retry" : "test"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
