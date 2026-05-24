"use client"

/**
 * Custom domains UI — embeddable in the Publish modal or anywhere else.
 *
 * Shows the raw DNS records the user must add. No abstractions, no
 * "we'll configure DNS for you" — devs want to see exactly what to copy.
 */

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle, CheckCircle2, Clock, Copy, ExternalLink, Loader2,
  Plus, RefreshCw, ShieldCheck, Trash2, X,
} from "lucide-react"
import { toast } from "@/lib/toast"

interface CustomDomain {
  id:                        string
  hostname:                  string
  dns_status:                'pending' | 'verifying' | 'active' | 'failed'
  ssl_status:                'pending' | 'validating' | 'active' | 'failed'
  is_primary:                boolean
  verification_record_type:  string | null
  verification_record_name:  string | null
  verification_record_value: string | null
  last_status_message:       string | null
  last_checked_at:           string | null
  created_at:                string
}

interface AddResponse {
  domain:       CustomDomain
  cname_target: string
}

interface ListResponse {
  domains: CustomDomain[]
}

interface CustomDomainsSectionProps {
  projectId:   string
  defaultCnameTarget?: string   // e.g. "{slug}.springbloom.app"
}

export function CustomDomainsSection({ projectId, defaultCnameTarget }: CustomDomainsSectionProps) {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [newHost, setNewHost] = useState("")
  const [cnameTarget, setCnameTarget] = useState(defaultCnameTarget ?? "")
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`)
      const data = await res.json() as ListResponse
      setDomains(data.domains ?? [])
    } catch {
      toast.error("Could not load custom domains")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function addDomain() {
    if (!newHost.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: newHost.trim().toLowerCase() }),
      })
      const data = await res.json() as AddResponse & { error?: string }
      if (!res.ok) { toast.error(data.error ?? "Could not add domain"); return }
      setDomains(prev => [data.domain, ...prev])
      setCnameTarget(data.cname_target)
      setNewHost("")
      toast.success(`Added ${data.domain.hostname}`)
    } catch {
      toast.error("Network error")
    } finally {
      setAdding(false)
    }
  }

  async function recheck(id: string) {
    setCheckingId(id)
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${id}`)
      const data = await res.json() as { domain?: CustomDomain; error?: string }
      if (!res.ok) { toast.error(data.error ?? "Check failed"); return }
      if (data.domain) {
        setDomains(prev => prev.map(d => d.id === id ? data.domain! : d))
        toast.success(`${data.domain.hostname}: ${data.domain.dns_status}`)
      }
    } catch {
      toast.error("Network error")
    } finally {
      setCheckingId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this domain? You'll need to re-add it to use it again.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error("Delete failed"); return }
      setDomains(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error("Network error")
    } finally {
      setDeletingId(null)
    }
  }

  async function setPrimary(id: string, value: boolean) {
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: value }),
      })
      if (!res.ok) { toast.error("Could not update"); return }
      setDomains(prev => prev.map(d => ({
        ...d,
        is_primary: d.id === id ? value : (value ? false : d.is_primary),
      })))
    } catch {
      toast.error("Network error")
    }
  }

  function copy(text: string, label = "Copied") {
    void navigator.clipboard.writeText(text).then(() => toast.success(label))
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Custom Domains</p>
        <p className="text-[11px] text-zinc-500">
          Point your own domain at this project. SSL is provisioned automatically by Cloudflare — usually within a few minutes.
        </p>
      </div>

      {/* Add form */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newHost}
          onChange={e => setNewHost(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void addDomain() }}
          placeholder="app.yourdomain.com"
          className="flex-1 px-2.5 py-1.5 text-[12px] bg-black/40 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/40"
          disabled={adding}
        />
        <button
          onClick={() => void addDomain()}
          disabled={!newHost.trim() || adding}
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-md bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors"
          type="button"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add
        </button>
      </div>

      {/* Domain list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={14} className="animate-spin text-zinc-600" />
        </div>
      ) : domains.length === 0 ? (
        <p className="text-[11px] text-zinc-600 italic text-center py-3">No custom domains yet.</p>
      ) : (
        <div className="space-y-2">
          {domains.map(d => (
            <DomainRow
              key={d.id}
              domain={d}
              cnameTarget={cnameTarget}
              checking={checkingId === d.id}
              deleting={deletingId === d.id}
              onRecheck={() => void recheck(d.id)}
              onDelete={() => void remove(d.id)}
              onSetPrimary={(v) => void setPrimary(d.id, v)}
              onCopy={copy}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Domain Row ─────────────────────────────────────────────────────────────

function DomainRow({
  domain, cnameTarget, checking, deleting, onRecheck, onDelete, onSetPrimary, onCopy,
}: {
  domain:       CustomDomain
  cnameTarget:  string
  checking:     boolean
  deleting:     boolean
  onRecheck:    () => void
  onDelete:     () => void
  onSetPrimary: (value: boolean) => void
  onCopy:       (text: string, label?: string) => void
}) {
  const dnsOk = domain.dns_status === 'active'
  const sslOk = domain.ssl_status === 'active'
  const live  = dnsOk && sslOk

  return (
    <div className={`rounded-lg border ${live ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {live ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> : <Clock size={12} className="text-amber-400 shrink-0" />}
          <code className="text-[12px] font-semibold text-zinc-100 truncate">{domain.hostname}</code>
          {domain.is_primary && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">Primary</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {live && (
            <a
              href={`https://${domain.hostname}`}
              target="_blank" rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300 p-1"
              title="Open"
            >
              <ExternalLink size={11} />
            </a>
          )}
          <button
            onClick={onRecheck}
            disabled={checking}
            className="text-zinc-500 hover:text-zinc-300 p-1 disabled:opacity-50"
            title="Re-check DNS &amp; SSL"
            type="button"
          >
            {checking ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-zinc-500 hover:text-red-400 p-1 disabled:opacity-50"
            title="Remove"
            type="button"
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-3 px-3 pb-2 text-[10.5px]">
        <StatusBadge label="DNS" status={domain.dns_status} />
        <StatusBadge label="SSL" status={domain.ssl_status} icon={ShieldCheck} />
        <span className="text-zinc-600 ml-auto">
          {domain.last_checked_at ? `checked ${timeAgo(domain.last_checked_at)}` : 'not yet checked'}
        </span>
      </div>

      {/* DNS records to add — show only when not yet live */}
      {!live && (
        <div className="border-t border-zinc-800/50 px-3 py-2.5 space-y-2 bg-black/30">
          <p className="text-[10.5px] text-zinc-500">Add these DNS records at your registrar:</p>
          <DnsRecordRow
            type="CNAME"
            name={domain.hostname.split('.').length > 2 ? domain.hostname.split('.')[0]! : '@'}
            value={cnameTarget || '<your-project>.springbloom.app'}
            onCopy={onCopy}
          />
          {domain.verification_record_name && domain.verification_record_value && (
            <DnsRecordRow
              type={domain.verification_record_type ?? 'TXT'}
              name={domain.verification_record_name}
              value={domain.verification_record_value}
              onCopy={onCopy}
            />
          )}
          {domain.last_status_message && (
            <div className="flex items-start gap-1.5 mt-1 text-[10.5px] text-amber-300/80">
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{domain.last_status_message}</span>
            </div>
          )}
        </div>
      )}

      {/* Primary toggle */}
      {live && (
        <div className="border-t border-zinc-800/50 px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            {domain.is_primary ? "Used as canonical URL" : "Mark as primary"}
          </span>
          <button
            onClick={() => onSetPrimary(!domain.is_primary)}
            className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
              domain.is_primary
                ? 'bg-violet-500/20 text-violet-200 hover:bg-violet-500/30'
                : 'border border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            type="button"
          >
            {domain.is_primary ? "Unset primary" : "Make primary"}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── DNS record row ─────────────────────────────────────────────────────────

function DnsRecordRow({
  type, name, value, onCopy,
}: { type: string; name: string; value: string; onCopy: (text: string, label?: string) => void }) {
  return (
    <div className="grid grid-cols-[60px_1fr_2fr_auto] items-center gap-2 text-[11px]">
      <span className="font-mono font-bold text-violet-300 text-[10px] uppercase">{type}</span>
      <code className="font-mono text-zinc-300 truncate">{name}</code>
      <code className="font-mono text-zinc-300 truncate">{value}</code>
      <button
        onClick={() => onCopy(value, `${type} value copied`)}
        className="text-zinc-500 hover:text-zinc-300 p-0.5"
        title="Copy value"
        type="button"
      >
        <Copy size={10} />
      </button>
    </div>
  )
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({
  label, status, icon: Icon,
}: {
  label:  string
  status: CustomDomain['dns_status'] | CustomDomain['ssl_status']
  icon?:  typeof X
}) {
  const map = {
    active:     { text: 'active',      color: 'text-emerald-300', dot: 'bg-emerald-400' },
    verifying:  { text: 'verifying…',  color: 'text-amber-300',   dot: 'bg-amber-400 animate-pulse' },
    validating: { text: 'validating…', color: 'text-amber-300',   dot: 'bg-amber-400 animate-pulse' },
    pending:    { text: 'pending',     color: 'text-zinc-500',    dot: 'bg-zinc-500' },
    failed:     { text: 'failed',      color: 'text-red-300',     dot: 'bg-red-400' },
  } as const
  const s = map[status as keyof typeof map] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {Icon && <Icon size={9} />}
      <span className="uppercase font-semibold tracking-wider">{label}</span>
      <span>{s.text}</span>
    </span>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
