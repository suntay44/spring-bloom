"use client"

/**
 * B5: BYO-Analytics — one-click toggles for PostHog, Plausible, Umami, GA4.
 *
 * Embeddable section for the IntegrationsPanel. Lets devs scaffold the
 * analytics tool of their choice into the project as a real file, instead of
 * forcing our (or anyone's) dashboard.
 */

import { useCallback, useEffect, useState } from "react"
import {
  Activity, Check, ChevronDown, ChevronRight, ExternalLink, FileCode, Loader2, Plus, Trash2,
} from "lucide-react"
import { toast } from "@/lib/toast"
import { ANALYTICS_ADAPTERS, ANALYTICS_KINDS, type AnalyticsAdapter, type AnalyticsKind } from "@/lib/analytics/adapters"

interface ConnectedIntegration {
  kind:       AnalyticsKind
  config:     Record<string, string>
  status:     string
  updated_at: string
}

export function AnalyticsAdaptersSection({ projectId }: { projectId: string }) {
  const [connected, setConnected] = useState<ConnectedIntegration[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<AnalyticsKind | null>(null)
  const [working, setWorking]     = useState<AnalyticsKind | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics`)
      const data = await res.json() as { integrations: ConnectedIntegration[] }
      setConnected(data.integrations ?? [])
    } catch {
      toast.error("Could not load analytics integrations")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const isConnected = (k: AnalyticsKind) => connected.some(c => c.kind === k)
  const getConfig   = (k: AnalyticsKind) => connected.find(c => c.kind === k)?.config ?? {}

  async function apply(kind: AnalyticsKind, config: Record<string, string>) {
    setWorking(kind)
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, config, apply: true }),
      })
      const data = await res.json() as { applied?: boolean; error?: string; preview?: { path: string } }
      if (!res.ok) { toast.error(data.error ?? "Apply failed"); return }
      toast.success(`${ANALYTICS_ADAPTERS[kind].label} connected — wrote ${data.preview?.path}`)
      setExpanded(null)
      await load()
    } catch {
      toast.error("Network error")
    } finally {
      setWorking(null)
    }
  }

  async function disconnect(kind: AnalyticsKind) {
    if (!confirm(`Disconnect ${ANALYTICS_ADAPTERS[kind].label}? The snippet file will also be deleted.`)) return
    setWorking(kind)
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics?kind=${kind}`, { method: 'DELETE' })
      if (!res.ok) { toast.error("Disconnect failed"); return }
      toast.success(`${ANALYTICS_ADAPTERS[kind].label} disconnected`)
      await load()
    } catch {
      toast.error("Network error")
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1.5">
          <Activity size={10} /> Analytics — bring your own
        </p>
        <span className="text-[10px] text-zinc-600">$0 from SpringBloom</span>
      </div>
      <p className="px-1 text-[10px] text-zinc-600 leading-snug">
        We don&apos;t bundle our own dashboard. Pick the analytics tool you already use — we&apos;ll scaffold the snippet into your repo.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={14} className="animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {ANALYTICS_KINDS.map(kind => (
            <AdapterRow
              key={kind}
              adapter={ANALYTICS_ADAPTERS[kind]}
              connected={isConnected(kind)}
              expanded={expanded === kind}
              working={working === kind}
              initialConfig={getConfig(kind)}
              onToggleExpand={() => setExpanded(e => e === kind ? null : kind)}
              onApply={cfg => void apply(kind, cfg)}
              onDisconnect={() => void disconnect(kind)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Adapter row ────────────────────────────────────────────────────────────

function AdapterRow({
  adapter, connected, expanded, working, initialConfig,
  onToggleExpand, onApply, onDisconnect,
}: {
  adapter:        AnalyticsAdapter
  connected:      boolean
  expanded:       boolean
  working:        boolean
  initialConfig:  Record<string, string>
  onToggleExpand: () => void
  onApply:        (cfg: Record<string, string>) => void
  onDisconnect:   () => void
}) {
  const [config, setConfig] = useState<Record<string, string>>(initialConfig)

  // If the connected config changes upstream, reset local edits
  useEffect(() => { setConfig(initialConfig) }, [adapter.kind, initialConfig])

  const allRequiredFilled = adapter.fields
    .filter(f => f.required)
    .every(f => (config[f.key] ?? '').trim().length > 0)

  return (
    <div className={`rounded-lg border ${connected ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.02] text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          <span className="text-[12px] font-semibold text-zinc-100">{adapter.label}</span>
          {connected && (
            <span className="text-[10px] text-emerald-300 flex items-center gap-0.5 font-semibold">
              <Check size={10} /> connected
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-500 shrink-0">{adapter.pricing}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/60 px-3 py-2.5 space-y-2 bg-black/30">
          <p className="text-[11px] text-zinc-400 leading-snug">{adapter.description}</p>
          <p className="text-[10px] text-zinc-500 flex items-center gap-1">
            <FileCode size={9} />
            <code className="font-mono">{adapter.filePath}</code>
            <a href={adapter.homepage} target="_blank" rel="noopener noreferrer" className="ml-auto text-zinc-500 hover:text-violet-300 flex items-center gap-0.5">
              docs <ExternalLink size={9} />
            </a>
          </p>

          {adapter.fields.map(field => (
            <div key={field.key}>
              <label className="block text-[11px] text-zinc-400 mb-1">
                {field.label}{field.required && <span className="text-amber-400">*</span>}
              </label>
              <input
                type="text"
                value={config[field.key] ?? ''}
                onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-black/40 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/40"
              />
              {field.hint && <p className="text-[10px] text-zinc-600 mt-1">{field.hint}</p>}
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-1">
            {connected && (
              <button
                type="button"
                onClick={onDisconnect}
                disabled={working}
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 size={10} /> Disconnect
              </button>
            )}
            <button
              type="button"
              onClick={() => onApply(config)}
              disabled={working || !allRequiredFilled}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {working ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              {connected ? 'Update' : 'Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
