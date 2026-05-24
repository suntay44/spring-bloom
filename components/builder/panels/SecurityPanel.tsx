"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertOctagon, AlertTriangle, Check, ChevronDown, ChevronRight,
  ExternalLink, Info, Loader2, Package, RefreshCw, ShieldAlert, ShieldCheck, Sparkles,
} from "lucide-react"
import { toast } from "@/lib/toast"
import type { SecurityFinding, SecurityScan, Severity, Scanner } from "@/lib/security/types"

// ─── Types from the API ──────────────────────────────────────────────────────

interface ScanResponse {
  scan: SecurityScan | null
  findings: SecurityFinding[]
  scanner_errors?: Array<{ scanner: Scanner; error: string }>
}

// ─── Severity helpers ────────────────────────────────────────────────────────

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

const SEVERITY_STYLE: Record<Severity, { color: string; bg: string; label: string; icon: typeof AlertOctagon }> = {
  critical: { color: 'text-red-300',    bg: 'bg-red-500/15 border-red-500/25',       label: 'Critical', icon: AlertOctagon  },
  high:     { color: 'text-orange-300', bg: 'bg-orange-500/15 border-orange-500/25', label: 'High',     icon: AlertTriangle },
  medium:   { color: 'text-amber-300',  bg: 'bg-amber-500/15 border-amber-500/25',   label: 'Medium',   icon: AlertTriangle },
  low:      { color: 'text-sky-300',    bg: 'bg-sky-500/15 border-sky-500/25',       label: 'Low',      icon: Info          },
  info:     { color: 'text-zinc-400',   bg: 'bg-zinc-700/30 border-zinc-700/40',     label: 'Info',     icon: Info          },
}

const SCANNER_LABEL: Record<Scanner, string> = {
  rls:         'RLS Analysis',
  database:    'Database',
  dependency:  'Dependencies',
  code_review: 'Code Review (AI)',
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SecurityPanel({ projectId }: { projectId: string }) {
  const [scan, setScan]         = useState<SecurityScan | null>(null)
  const [findings, setFindings] = useState<SecurityFinding[]>([])
  const [loading, setLoading]   = useState(true)
  const [scanning, setScanning] = useState<'quick' | 'in_depth' | null>(null)
  const [scannerErrors, setScannerErrors] = useState<Array<{ scanner: Scanner; error: string }>>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/security/scan`)
      const data = await res.json() as ScanResponse
      setScan(data.scan)
      setFindings(data.findings ?? [])
    } catch {
      toast.error('Could not load security scan')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function runScan(scanType: 'quick' | 'in_depth') {
    setScanning(scanType)
    setScannerErrors([])
    try {
      const res = await fetch(`/api/projects/${projectId}/security/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_type: scanType }),
      })
      const data = await res.json() as ScanResponse & { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Scan failed')
        return
      }
      setScan(data.scan)
      setFindings(data.findings ?? [])
      setScannerErrors(data.scanner_errors ?? [])
      const count = data.findings?.length ?? 0
      toast.success(count === 0
        ? 'No issues found'
        : `${count} finding${count === 1 ? '' : 's'} (${data.scan?.critical_count ?? 0} critical)`)
    } catch {
      toast.error('Scan failed — check your project preview is running')
    } finally {
      setScanning(null)
    }
  }

  async function acceptRisk(findingId: string, accepted: boolean) {
    try {
      const res = await fetch(`/api/projects/${projectId}/security/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_risk: accepted }),
      })
      if (!res.ok) { toast.error('Could not update'); return }
      setFindings(prev => prev.map(f => f.id === findingId
        ? { ...f, accepted_risk: accepted, accepted_at: accepted ? new Date().toISOString() : null }
        : f))
    } catch { toast.error('Could not update') }
  }

  // Bucket findings by scanner for grouping
  const grouped = groupByScanner(findings)
  const activeFindings = findings.filter(f => !f.accepted_risk)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            Security
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Scan your project for RLS gaps, vulnerable deps, and code-level risks.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded"
          title="Refresh"
          type="button"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Scan action bar */}
      <div className="border-b border-zinc-800 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void runScan('quick')}
            disabled={scanning !== null}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {scanning === 'quick' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Quick scan
            <span className="text-[10px] font-normal text-zinc-500 ml-1">Free · ~5s</span>
          </button>
          <button
            onClick={() => void runScan('in_depth')}
            disabled={scanning !== null}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-violet-600/40 bg-violet-600/20 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {scanning === 'in_depth' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            In-depth scan
            <span className="text-[10px] font-normal text-violet-300/70 ml-1">~1 credit · 30s</span>
          </button>
        </div>
        {scan && (
          <p className="text-[10px] text-zinc-600 mt-2">
            Last scan: {new Date(scan.created_at).toLocaleString()} ·{' '}
            {scan.scan_type === 'in_depth' ? 'In-depth' : 'Quick'} · {scan.findings_count} finding{scan.findings_count === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-zinc-600" />
          </div>
        ) : !scan ? (
          <EmptyState />
        ) : (
          <>
            {/* Summary tiles */}
            <SummaryTiles scan={scan} />

            {/* Scanner errors (non-blocking warnings) */}
            {scannerErrors.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1">
                {scannerErrors.map((e, i) => (
                  <p key={i} className="text-[11px] text-amber-200/80">
                    <span className="font-semibold">{SCANNER_LABEL[e.scanner]}:</span> {e.error}
                  </p>
                ))}
              </div>
            )}

            {/* Findings grouped by scanner */}
            {activeFindings.length === 0 ? (
              <NoIssuesFound />
            ) : (
              Object.entries(grouped)
                .filter(([, items]) => items.some(f => !f.accepted_risk))
                .map(([scanner, items]) => (
                  <ScannerGroup
                    key={scanner}
                    scanner={scanner as Scanner}
                    items={items.filter(f => !f.accepted_risk)}
                    onAcceptRisk={(id) => void acceptRisk(id, true)}
                  />
                ))
            )}

            {/* Accepted risks (collapsed) */}
            {findings.some(f => f.accepted_risk) && (
              <AcceptedRisks
                items={findings.filter(f => f.accepted_risk)}
                onUnaccept={(id) => void acceptRisk(id, false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
      <ShieldAlert size={28} className="mx-auto text-zinc-600 mb-2" />
      <p className="text-sm text-zinc-300 font-medium">Run your first security scan</p>
      <p className="text-xs text-zinc-500 mt-1">
        Quick scan checks RLS policies and npm dependencies. In-depth adds AI code review.
      </p>
    </div>
  )
}

function NoIssuesFound() {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
      <ShieldCheck size={28} className="mx-auto text-emerald-400 mb-2" />
      <p className="text-sm font-medium text-emerald-200">No issues found</p>
      <p className="text-xs text-emerald-300/60 mt-1">
        The scanner didn&apos;t surface any findings. The scanner can&apos;t catch every possible risk.
      </p>
    </div>
  )
}

function SummaryTiles({ scan }: { scan: SecurityScan }) {
  const tiles: Array<{ label: string; count: number; style: typeof SEVERITY_STYLE[Severity] }> = [
    { label: 'Critical', count: scan.critical_count, style: SEVERITY_STYLE.critical },
    { label: 'High',     count: scan.high_count,     style: SEVERITY_STYLE.high     },
    { label: 'Medium',   count: scan.medium_count,   style: SEVERITY_STYLE.medium   },
    { label: 'Low',      count: scan.low_count,      style: SEVERITY_STYLE.low      },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map(t => (
        <div key={t.label} className={`rounded-lg border ${t.style.bg} px-2 py-2 text-center`}>
          <p className={`text-lg font-bold ${t.style.color}`}>{t.count}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{t.label}</p>
        </div>
      ))}
    </div>
  )
}

function ScannerGroup({
  scanner, items, onAcceptRisk,
}: {
  scanner: Scanner
  items: SecurityFinding[]
  onAcceptRisk: (id: string) => void
}) {
  // Sort by severity desc
  const sorted = [...items].sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))

  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
        {SCANNER_LABEL[scanner]} · {sorted.length}
      </p>
      {sorted.map(f => (
        <FindingCard key={f.id} finding={f} onAcceptRisk={onAcceptRisk} />
      ))}
    </div>
  )
}

function FindingCard({
  finding, onAcceptRisk,
}: {
  finding: SecurityFinding
  onAcceptRisk: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const style = SEVERITY_STYLE[finding.severity]
  const Icon = style.icon

  return (
    <div className={`rounded-lg border ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02]"
        type="button"
      >
        <Icon size={14} className={`${style.color} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-100 leading-snug">{finding.title}</p>
          {finding.file_path && (
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">
              {finding.file_path}{finding.line ? `:${finding.line}` : ''}
            </p>
          )}
          {finding.package_name && (
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono flex items-center gap-1">
              <Package size={9} /> {finding.package_name}
              {finding.advisory_id && <span className="text-zinc-600">· {finding.advisory_id}</span>}
            </p>
          )}
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${style.color} shrink-0`}>
          {style.label}
        </span>
        {expanded ? <ChevronDown size={12} className="text-zinc-500 shrink-0 mt-1" /> : <ChevronRight size={12} className="text-zinc-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="border-t border-white/5 px-3 py-2.5 space-y-2 bg-black/20">
          {finding.description && (
            <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{finding.description}</p>
          )}
          {finding.recommendation && (
            <div className="rounded-md bg-zinc-900/60 border border-zinc-800 p-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-semibold">Recommendation</p>
              <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{finding.recommendation}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            {finding.advisory_url ? (
              <a
                href={finding.advisory_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-violet-300 hover:underline flex items-center gap-1"
              >
                Advisory <ExternalLink size={10} />
              </a>
            ) : <span />}
            <button
              onClick={() => onAcceptRisk(finding.id)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-white/5"
              type="button"
            >
              Accept risk
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AcceptedRisks({
  items, onUnaccept,
}: {
  items: SecurityFinding[]
  onUnaccept: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-zinc-500 hover:text-zinc-300"
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <Check size={11} /> Accepted risks · {items.length}
        </span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && (
        <div className="border-t border-zinc-800/60 px-3 py-2 space-y-1">
          {items.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-2 py-1">
              <span className="text-[11px] text-zinc-500 truncate">{f.title}</span>
              <button
                onClick={() => onUnaccept(f.id)}
                className="text-[10px] text-zinc-600 hover:text-zinc-300 shrink-0"
                type="button"
              >
                Re-open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function groupByScanner(findings: SecurityFinding[]): Record<Scanner, SecurityFinding[]> {
  const out: Record<Scanner, SecurityFinding[]> = {
    rls: [], database: [], dependency: [], code_review: [],
  }
  for (const f of findings) {
    if (out[f.scanner]) out[f.scanner].push(f)
  }
  return out
}
