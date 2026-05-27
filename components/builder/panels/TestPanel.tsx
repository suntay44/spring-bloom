"use client"

/**
 * R4-1: Test Runner panel.
 *
 * Run tests inside the Fly machine via /api/projects/[id]/tests/run (SSE).
 * Shows live phase progress, parsed pass/fail counts, full stdout in a
 * collapsible console. History list at the bottom — re-open any run to view
 * its full log.
 */

import { useCallback, useEffect, useState } from "react"
import {
  AlertOctagon, Check, CheckCircle2, ChevronDown, ChevronRight, FileCode,
  Loader2, Play, RefreshCw, Sparkles, Terminal, XCircle,
} from "lucide-react"
import { toast } from "@/lib/toast"

interface TestRun {
  id:             string
  framework:      string
  command:        string
  status:         'running' | 'passed' | 'failed' | 'cancelled' | 'error'
  passed_count:   number
  failed_count:   number
  skipped_count:  number
  duration_ms:    number | null
  exit_code:      number | null
  created_at:     string
  completed_at:   string | null
}

interface RunResult {
  framework:   string
  command:     string
  exit_code:   number
  duration_ms: number
  stdout:      string
  stderr:      string
  passed:      number
  failed:      number
  skipped:     number
}

export function TestPanel({ projectId }: { projectId: string }) {
  const [runs, setRuns]               = useState<TestRun[]>([])
  const [loading, setLoading]         = useState(true)
  const [running, setRunning]         = useState(false)
  const [phase, setPhase]             = useState<string>('')
  const [result, setResult]           = useState<RunResult | null>(null)
  const [logsOpen, setLogsOpen]       = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/tests?limit=10`)
      const data = await res.json() as { runs?: TestRun[] }
      setRuns(data.runs ?? [])
    } catch { /* swallow */ } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function startRun() {
    setRunning(true); setResult(null); setPhase('Starting...')
    try {
      const res = await fetch(`/api/projects/${projectId}/tests/run`, { method: 'POST' })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Failed' })) as { error?: string }
        toast.error(data.error ?? 'Test run failed')
        return
      }
      await consumeSse(res.body, {
        onPhase:  (d) => setPhase(d.message),
        onResult: (d) => { setResult(d); if (d.exit_code !== 0 || d.failed > 0) setLogsOpen(true) },
        onDone:   () => { void load() },
        onError:  (d) => { toast.error(d.message); setResult(null) },
      })
    } catch {
      toast.error('Network error')
    } finally {
      setRunning(false); setPhase('')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" />
            Tests
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Run npm test / vitest / playwright / jest inside your project preview.
          </p>
        </div>
        <button onClick={() => void load()} className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded" type="button" title="Refresh history">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Run button + Playwright scaffold */}
      <div className="border-b border-zinc-800 px-4 py-3 shrink-0 space-y-2">
        <button
          type="button"
          onClick={() => void startRun()}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-600/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-600/25 disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {running ? 'Running tests...' : 'Run tests'}
          <span className="text-[10px] text-cyan-300/60 ml-1">~30s</span>
        </button>
        {phase && (
          <p className="text-[10px] text-zinc-500 italic">{phase}</p>
        )}
        <PlaywrightScaffoldButton projectId={projectId} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Live result card */}
        {result && (
          <div className={`rounded-xl border ${result.exit_code === 0 && result.failed === 0 ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'} p-3 space-y-2`}>
            <div className="flex items-center gap-2">
              {result.exit_code === 0 && result.failed === 0 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
              <span className="text-xs font-semibold text-zinc-100">
                {result.exit_code === 0 && result.failed === 0 ? 'All tests passed' : 'Tests failed'}
              </span>
              <span className="text-[10px] text-zinc-500 ml-auto">{result.framework} · {(result.duration_ms / 1000).toFixed(1)}s</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <Stat label="Passed"  count={result.passed}  color="text-emerald-400" />
              <Stat label="Failed"  count={result.failed}  color="text-red-400" />
              <Stat label="Skipped" count={result.skipped} color="text-zinc-500" />
            </div>
            <div className="rounded-md border border-zinc-800 overflow-hidden">
              <button type="button" onClick={() => setLogsOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 hover:bg-zinc-900/40 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5"><Terminal size={11} /> stdout</span>
                {logsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
              {logsOpen && (
                <pre className="border-t border-zinc-800 bg-black/80 text-zinc-200 px-3 py-2 text-[10.5px] font-mono leading-relaxed overflow-x-auto max-h-72">
                  {(result.stdout || result.stderr || '(no output)').trim()}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-2">
          <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">History</p>
          {runs.length === 0 ? (
            <p className="text-[11px] text-zinc-600 italic text-center py-3">No test runs yet.</p>
          ) : (
            runs.map((r) => (
              <HistoryRow
                key={r.id}
                run={r}
                expanded={expandedRun === r.id}
                onToggle={() => setExpandedRun((e) => e === r.id ? null : r.id)}
                projectId={projectId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Playwright scaffold ────────────────────────────────────────────────────

function PlaywrightScaffoldButton({ projectId }: { projectId: string }) {
  const [open, setOpen]               = useState(false)
  const [includeAuth, setAuth]        = useState(false)
  const [includeCi, setCi]            = useState(true)
  const [working, setWorking]         = useState(false)
  const [done, setDone]               = useState<string[] | null>(null)

  async function apply() {
    setWorking(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/tests/scaffold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true, includeAuth, includeCi }),
      })
      const data = await res.json() as { written?: string[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Apply failed'); return }
      setDone(data.written ?? [])
      toast.success(`Wrote ${data.written?.length ?? 0} Playwright file(s)`)
    } catch { toast.error('Network error') } finally { setWorking(false) }
  }

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 hover:bg-white/[0.03] text-left">
        <div className="flex items-center gap-1.5 min-w-0">
          {open ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />}
          <Sparkles size={10} className="text-violet-300" />
          <span className="text-[11px] font-semibold text-zinc-100">Add Playwright</span>
        </div>
        <span className="text-[9px] text-violet-300/70">$0 · scaffolds e2e/</span>
      </button>
      {open && (
        <div className="border-t border-violet-500/15 px-2.5 py-2 space-y-1.5 bg-black/20">
          <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={includeAuth} onChange={(e) => setAuth(e.target.checked)} className="accent-violet-600" />
            Include signed-in flow scaffold (auth.spec.ts)
          </label>
          <label className="flex items-center gap-1.5 text-[10.5px] text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={includeCi} onChange={(e) => setCi(e.target.checked)} className="accent-violet-600" />
            Include .github/workflows/e2e.yml (runs on PR)
          </label>
          <button type="button" onClick={() => void apply()} disabled={working}
            className="w-full mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 py-1.5 rounded-md transition-colors disabled:opacity-50">
            {working ? <Loader2 size={10} className="animate-spin" /> : <FileCode size={10} />} Apply scaffold
          </button>
          {done && (
            <div className="text-[10px] text-emerald-300/80 space-y-0.5 pt-1">
              {done.map((p) => <p key={p} className="font-mono">✓ {p}</p>)}
              <p className="text-zinc-500 pt-0.5">Then: <code className="font-mono">npm i -D @playwright/test &amp;&amp; npx playwright install</code></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Stat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-md bg-black/30 border border-white/5 px-2 py-1.5 text-center">
      <p className={`text-base font-bold ${color}`}>{count}</p>
      <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function HistoryRow({
  run, expanded, onToggle, projectId,
}: {
  run: TestRun; expanded: boolean; onToggle: () => void; projectId: string
}) {
  const [fullStdout, setFullStdout] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadFull() {
    if (fullStdout !== null) return
    setLoading(true)
    try {
      // We don't have a per-run GET that returns stdout — fall back to truncated
      // display. Could add one if needed. For now, history shows summary only.
      setFullStdout('(open a fresh run to see live output)')
    } finally { setLoading(false) }
  }
  useEffect(() => { if (expanded) void loadFull() }, [expanded])  // eslint-disable-line react-hooks/exhaustive-deps

  void projectId  // reserved for per-run fetch when we add it

  const ok = run.status === 'passed'
  const failed = run.status === 'failed' || run.status === 'error'
  return (
    <div className={`rounded-lg border ${ok ? 'border-emerald-500/20 bg-emerald-500/5' : failed ? 'border-red-500/20 bg-red-500/5' : 'border-zinc-800 bg-zinc-900/40'} overflow-hidden`}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          {ok ? <Check size={11} className="text-emerald-400 shrink-0" /> : failed ? <AlertOctagon size={11} className="text-red-400 shrink-0" /> : <Loader2 size={11} className="animate-spin text-zinc-400" />}
          <span className="text-[11px] text-zinc-300">{run.framework}</span>
          <span className="text-[10px] text-zinc-500">{run.passed_count}P · {run.failed_count}F{run.skipped_count > 0 ? ` · ${run.skipped_count}S` : ''}</span>
        </div>
        <span className="text-[10px] text-zinc-600">{timeAgo(run.created_at)}{run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}</span>
      </button>
      {expanded && (
        <div className="border-t border-zinc-800/50 px-3 py-2 text-[10.5px] font-mono text-zinc-500">
          {loading ? <Loader2 size={11} className="animate-spin" /> : fullStdout}
        </div>
      )}
    </div>
  )
}

interface SseHandlers {
  onPhase:  (d: { phase: string; message: string }) => void
  onResult: (d: RunResult) => void
  onDone:   (d: { test_run_id: string }) => void
  onError:  (d: { message: string }) => void
}

async function consumeSse(body: ReadableStream<Uint8Array>, h: SseHandlers): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx); buffer = buffer.slice(idx + 2)
      let event = "message"; let dataText = ""
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) dataText += line.slice(5).trim()
      }
      if (!dataText) continue
      let data: unknown
      try { data = JSON.parse(dataText) } catch { continue }
      switch (event) {
        case "phase":  h.onPhase(data as { phase: string; message: string }); break
        case "result": h.onResult(data as RunResult); break
        case "done":   h.onDone(data as { test_run_id: string }); break
        case "error":  h.onError(data as { message: string }); break
      }
    }
  }
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
