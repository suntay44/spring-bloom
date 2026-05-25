"use client"

/**
 * B2: Resend email scaffold — drops React Email templates + sendEmail() helper.
 *
 * Visible only when Resend is connected. Lovable hides their template layer;
 * we ship the actual .tsx files so devs can edit + preview locally.
 */

import { useState } from "react"
import { Check, ChevronDown, ChevronRight, FileCode, Loader2, Mail } from "lucide-react"
import { toast } from "@/lib/toast"

interface GeneratedFile { path: string; content: string; byteSize: number }

export function EmailScaffoldSection({ projectId }: { projectId: string }) {
  const [open, setOpen]               = useState(false)
  const [productName, setProductName] = useState("")
  const [fromAddress, setFromAddress] = useState("")
  const [brandColor, setBrandColor]   = useState("#7c3aed")
  const [includeReceipt, setReceipt]  = useState(true)
  const [files, setFiles]             = useState<GeneratedFile[]>([])
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [working, setWorking]         = useState<"preview" | "apply" | null>(null)
  const [applied, setApplied]         = useState<{ written: string[]; failed: { path: string; error: string }[] } | null>(null)

  async function call(apply: boolean) {
    setWorking(apply ? "apply" : "preview")
    try {
      const res = await fetch(`/api/projects/${projectId}/emails/scaffold`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          apply,
          productName: productName || undefined,
          fromAddress: fromAddress || undefined,
          brandColor,
          includeReceipt,
        }),
      })
      const data = await res.json() as { files?: GeneratedFile[]; written?: string[]; failed?: { path: string; error: string }[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? "Failed"); return }
      setFiles(data.files ?? [])
      if (apply) {
        setApplied({ written: data.written ?? [], failed: data.failed ?? [] })
        toast.success(`Wrote ${data.written?.length ?? 0} email file(s)`)
      } else { setApplied(null) }
    } catch { toast.error("Network error") } finally { setWorking(null) }
  }

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          <Mail size={12} className="text-violet-300 shrink-0" />
          <span className="text-[12px] font-semibold text-zinc-100">Scaffold email templates</span>
        </div>
        <span className="text-[10px] text-violet-300/70 shrink-0">$0 · React Email + sendEmail()</span>
      </button>

      {open && (
        <div className="border-t border-violet-500/15 px-3 py-2.5 space-y-2 bg-black/20">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Drops 4-5 transactional email templates as <code className="font-mono">.tsx</code> files using React Email, plus
            a typed <code className="font-mono">sendEmail()</code> helper wrapping Resend. Includes a local preview index for hot-reload.
          </p>

          <div className="space-y-1.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name"
                className="px-2 py-1 text-[12px] bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40" />
              <input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="noreply@yourdomain.com"
                className="px-2 py-1 text-[12px] font-mono bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40" />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span>Brand color</span>
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                  className="w-7 h-6 rounded border border-zinc-800 cursor-pointer bg-transparent" />
              </label>
              <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                <input type="checkbox" checked={includeReceipt} onChange={(e) => setReceipt(e.target.checked)}
                  className="accent-violet-600" />
                <span className="text-[11px] text-zinc-300">Include receipt template</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => void call(false)} disabled={working !== null}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded transition-colors disabled:opacity-50">
              {working === "preview" ? <Loader2 size={11} className="animate-spin" /> : <FileCode size={11} />} Preview
            </button>
            <button type="button" onClick={() => void call(true)} disabled={working !== null}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
              {working === "apply" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Apply
            </button>
          </div>

          {applied && (
            <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 p-2 space-y-0.5">
              <p className="text-[11px] font-semibold text-emerald-200">
                Wrote {applied.written.length} file{applied.written.length === 1 ? '' : 's'}
              </p>
              {applied.written.map((p) => <p key={p} className="text-[10px] font-mono text-emerald-300/70 ml-2">{p}</p>)}
              {applied.failed.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-red-300 mt-1">Failed:</p>
                  {applied.failed.map((f) => <p key={f.path} className="text-[10px] font-mono text-red-300/70 ml-2">{f.path} — {f.error}</p>)}
                </>
              )}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Files ({files.length})</p>
              {files.map((f) => (
                <div key={f.path} className="rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                  <button type="button" onClick={() => setExpanded((e) => e === f.path ? null : f.path)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-zinc-800/40">
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
            <strong>After applying:</strong> <code className="font-mono">npm install resend @react-email/components @react-email/render</code>.
            Set <code className="font-mono">RESEND_API_KEY</code> in env (already in Integrations).
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
