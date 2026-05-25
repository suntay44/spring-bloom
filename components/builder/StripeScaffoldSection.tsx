"use client"

/**
 * A1: Stripe webhook scaffold — one-click drop-in handler.
 *
 * Embedded in IntegrationsPanel; visible only when the Stripe integration is
 * connected. Generates app/api/webhooks/stripe/route.ts + lib/stripe/*
 * + (optionally) supabase/migrations/<ts>_stripe_events.sql.
 *
 * Vs Lovable: their docs explicitly say "do not create webhooks manually,
 * Lovable auto-registers." Devs need to SEE and EDIT the handler.
 */

import { useState } from "react"
import { Check, ChevronDown, ChevronRight, FileCode, Loader2, Webhook } from "lucide-react"
import { toast } from "@/lib/toast"

interface GeneratedFile { path: string; content: string; byteSize: number }

export function StripeScaffoldSection({
  projectId,
  hasSupabase,
}: {
  projectId:    string
  hasSupabase:  boolean
}) {
  const [open, setOpen]         = useState(false)
  const [files, setFiles]       = useState<GeneratedFile[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [working, setWorking]   = useState<'preview' | 'apply' | null>(null)
  const [applied, setApplied]   = useState<{ written: string[]; failed: { path: string; error: string }[] } | null>(null)

  async function preview() {
    setWorking('preview')
    try {
      const res = await fetch(`/api/projects/${projectId}/stripe/scaffold-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: false }),
      })
      const data = await res.json() as { files?: GeneratedFile[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Preview failed'); return }
      setFiles(data.files ?? [])
      setApplied(null)
    } catch { toast.error('Network error') } finally { setWorking(null) }
  }

  async function apply() {
    setWorking('apply')
    try {
      const res = await fetch(`/api/projects/${projectId}/stripe/scaffold-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      })
      const data = await res.json() as { written?: string[]; failed?: { path: string; error: string }[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Apply failed'); return }
      setApplied({ written: data.written ?? [], failed: data.failed ?? [] })
      toast.success(`Wrote ${data.written?.length ?? 0} file(s)`)
    } catch { toast.error('Network error') } finally { setWorking(null) }
  }

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          <Webhook size={12} className="text-violet-300 shrink-0" />
          <span className="text-[12px] font-semibold text-zinc-100">Scaffold webhook handler</span>
        </div>
        <span className="text-[10px] text-violet-300/70 shrink-0">$0 · drops 3-4 files</span>
      </button>

      {open && (
        <div className="border-t border-violet-500/15 px-3 py-2.5 space-y-2 bg-black/20">
          <p className="text-[11px] text-zinc-400 leading-snug">
            One-click scaffold for a production-grade Stripe webhook handler with signature
            verification, typed event switch, and {hasSupabase ? <strong>idempotency table</strong> : <span>(no idempotency — connect Supabase to add it)</span>}.
          </p>
          <p className="text-[10.5px] text-zinc-500 leading-snug">
            Files: <code className="font-mono">app/api/webhooks/stripe/route.ts</code> · <code className="font-mono">lib/stripe/server.ts</code> · <code className="font-mono">lib/stripe/events.ts</code>{hasSupabase && <> · <code className="font-mono">supabase/migrations/&lt;ts&gt;_stripe_events.sql</code></>}.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => void preview()}
              disabled={working !== null}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              {working === 'preview' ? <Loader2 size={11} className="animate-spin" /> : <FileCode size={11} />}
              Preview
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              disabled={working !== null}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {working === 'apply' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Apply to project
            </button>
          </div>

          {applied && (
            <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 p-2 space-y-0.5">
              <p className="text-[11px] font-semibold text-emerald-200">
                Wrote {applied.written.length} file{applied.written.length === 1 ? '' : 's'}
              </p>
              {applied.written.map((p) => (
                <p key={p} className="text-[10px] font-mono text-emerald-300/70 ml-2">{p}</p>
              ))}
              {applied.failed.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-red-300 mt-1">Failed:</p>
                  {applied.failed.map((f) => (
                    <p key={f.path} className="text-[10px] font-mono text-red-300/70 ml-2">{f.path} — {f.error}</p>
                  ))}
                </>
              )}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Preview</p>
              {files.map((f) => (
                <div key={f.path} className="rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => e === f.path ? null : f.path)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-zinc-800/40"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {expanded === f.path ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />}
                      <FileCode size={10} className="text-zinc-500" />
                      <code className="text-[10.5px] text-zinc-300 font-mono truncate">{f.path}</code>
                    </div>
                    <span className="text-[9px] text-zinc-600">{formatBytes(f.byteSize)}</span>
                  </button>
                  {expanded === f.path && (
                    <pre className="border-t border-zinc-800 bg-black/40 px-2.5 py-2 text-[10px] font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-64">
                      {f.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-zinc-600 leading-snug pt-1">
            <strong>Local testing:</strong> <code className="font-mono">stripe listen --forward-to localhost:3000/api/webhooks/stripe</code> — use the printed whsec_ as <code className="font-mono">STRIPE_WEBHOOK_SECRET</code>.
          </p>
        </div>
      )}
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}
