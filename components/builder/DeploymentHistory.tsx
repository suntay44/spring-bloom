"use client"

/**
 * R4-2: Deployment history list with rollback button.
 *
 * Embedded in PublishModal — shows the last N successful deployments and lets
 * the user roll back to any of them with one click.
 */

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, ChevronRight, ExternalLink, Loader2, RotateCcw, X } from "lucide-react"
import { toast } from "@/lib/toast"

interface Deployment {
  id:                 string
  cf_deployment_id:   string | null
  published_url:      string | null
  status:             string
  build_duration_ms:  number | null
  bundle_size_bytes:  number | null
  file_count:         number | null
  error_message:      string | null
  rolled_back_at:     string | null
  created_at:         string
  completed_at:       string | null
}

export function DeploymentHistory({ projectId }: { projectId: string }) {
  const [open, setOpen]             = useState(false)
  const [deployments, setDeps]      = useState<Deployment[]>([])
  const [loading, setLoading]       = useState(false)
  const [rollingBack, setRollback]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/deployments?limit=10`)
      const data = await res.json() as { deployments?: Deployment[] }
      setDeps(data.deployments ?? [])
    } catch { /* swallow */ } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { if (open) void load() }, [open, load])

  async function rollback(d: Deployment) {
    if (!confirm(`Roll back to deployment ${d.cf_deployment_id?.slice(0, 8)}? This will replace the current live version.`)) return
    setRollback(d.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/deployments/${d.id}/rollback`, { method: 'POST' })
      const data = await res.json() as { error?: string; rolled_back_to?: string }
      if (!res.ok) { toast.error(data.error ?? 'Rollback failed'); return }
      toast.success('Rolled back — your live URL now serves the previous build')
      await load()
    } catch {
      toast.error('Network error')
    } finally { setRollback(null) }
  }

  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40 text-xs"
      >
        <span className="font-semibold flex items-center gap-1.5">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          Deployment history
        </span>
        <span className="text-[10px] text-muted-foreground">{deployments.length || ''} {deployments.length === 1 ? 'entry' : 'entries'}</span>
      </button>

      {open && (
        <div className="border-t p-2 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
            </div>
          ) : deployments.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic text-center py-2">No deployments yet.</p>
          ) : (
            deployments.map((d) => {
              const success = d.status === 'success'
              const isCurrent = success && !d.rolled_back_at && d === deployments.find((x) => x.status === 'success' && !x.rolled_back_at)
              return (
                <div key={d.id} className={`rounded-md border p-2 text-[11px] ${
                  isCurrent
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : success
                      ? 'border-zinc-700/50 bg-zinc-900/30'
                      : 'border-red-500/20 bg-red-500/5'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {success
                        ? isCurrent ? <Check size={11} className="text-emerald-400 shrink-0" /> : <Check size={11} className="text-zinc-500 shrink-0" />
                        : <X size={11} className="text-red-400 shrink-0" />}
                      <code className="font-mono text-[10.5px] text-zinc-300">
                        {d.cf_deployment_id ? d.cf_deployment_id.slice(0, 12) : '—'}
                      </code>
                      {isCurrent && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">live</span>}
                      {d.rolled_back_at && <span className="text-[9px] uppercase tracking-wider text-zinc-500">rolled back</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {success && d.published_url && (
                        <a href={d.published_url} target="_blank" rel="noopener noreferrer"
                           className="text-zinc-500 hover:text-zinc-200 p-1">
                          <ExternalLink size={10} />
                        </a>
                      )}
                      {success && !isCurrent && (
                        <button
                          type="button"
                          disabled={rollingBack === d.id}
                          onClick={() => void rollback(d)}
                          className="text-zinc-500 hover:text-amber-300 p-1 disabled:opacity-50"
                          title="Roll back to this deployment"
                        >
                          {rollingBack === d.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{timeAgo(d.created_at)}</span>
                    {d.build_duration_ms && <span>· {(d.build_duration_ms / 1000).toFixed(1)}s</span>}
                    {d.file_count && <span>· {d.file_count} files</span>}
                    {d.bundle_size_bytes && <span>· {formatBytes(d.bundle_size_bytes)}</span>}
                  </div>
                  {d.error_message && !success && (
                    <p className="text-[10px] text-red-300 mt-1 truncate" title={d.error_message}>{d.error_message}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
