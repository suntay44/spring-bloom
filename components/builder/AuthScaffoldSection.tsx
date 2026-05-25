"use client"

/**
 * B1: Auth code-scaffold UI — sibling to the AuthProvidersPanel toggles.
 *
 * Renders inside AuthProvidersPanel. Lets the user one-click drop in the
 * server/client clients, callback handler, middleware, and (optionally)
 * MFA + custom-JWT-claims templates.
 */

import { useState } from "react"
import { Check, ChevronDown, ChevronRight, FileCode, KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "@/lib/toast"

interface GeneratedFile { path: string; content: string; byteSize: number }

export function AuthScaffoldSection({ projectId }: { projectId: string }) {
  const [open, setOpen]             = useState(false)
  const [includeMfa, setIncludeMfa] = useState(false)
  const [includeJwt, setIncludeJwt] = useState(false)
  const [routes, setRoutes]         = useState("/dashboard, /settings")
  const [files, setFiles]           = useState<GeneratedFile[]>([])
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [working, setWorking]       = useState<"preview" | "apply" | null>(null)
  const [applied, setApplied]       = useState<{ written: string[]; failed: { path: string; error: string }[] } | null>(null)

  async function call(apply: boolean) {
    setWorking(apply ? "apply" : "preview")
    try {
      const res = await fetch(`/api/projects/${projectId}/auth/scaffold`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          apply,
          includeMfa,
          includeJwtHook: includeJwt,
          protectedRoutes: routes.split(",").map((r) => r.trim()).filter(Boolean),
        }),
      })
      const data = await res.json() as { files?: GeneratedFile[]; written?: string[]; failed?: { path: string; error: string }[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? "Failed"); return }
      setFiles(data.files ?? [])
      if (apply) {
        setApplied({ written: data.written ?? [], failed: data.failed ?? [] })
        toast.success(`Wrote ${data.written?.length ?? 0} file(s)`)
      } else {
        setApplied(null)
      }
    } catch { toast.error("Network error") } finally { setWorking(null) }
  }

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden mx-3 my-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          <KeyRound size={12} className="text-violet-300 shrink-0" />
          <span className="text-[12px] font-semibold text-zinc-100">Scaffold auth code</span>
        </div>
        <span className="text-[10px] text-violet-300/70 shrink-0">$0 · 5+ files</span>
      </button>

      {open && (
        <div className="border-t border-violet-500/15 px-3 py-2.5 space-y-2 bg-black/20">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Drops production-grade Supabase Auth into your repo: server + browser clients, OAuth callback handler,
            signout endpoint, and middleware that refreshes sessions and gates protected routes.
          </p>

          {/* Options */}
          <div className="space-y-1.5 pt-1">
            <label className="block">
              <span className="text-[11px] text-zinc-400">Protected routes (comma-separated)</span>
              <input
                type="text" value={routes} onChange={(e) => setRoutes(e.target.value)}
                placeholder="/dashboard, /settings"
                className="w-full mt-1 px-2.5 py-1 text-[12px] font-mono bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeMfa} onChange={(e) => setIncludeMfa(e.target.checked)}
                className="rounded accent-violet-600" />
              <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                <ShieldCheck size={10} /> Include MFA enroll/verify page <code className="text-zinc-500 font-mono">app/(auth)/mfa/page.tsx</code>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeJwt} onChange={(e) => setIncludeJwt(e.target.checked)}
                className="rounded accent-violet-600" />
              <span className="text-[11px] text-zinc-300">
                Include custom JWT claims template (Postgres function migration)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => void call(false)}
              disabled={working !== null}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              {working === "preview" ? <Loader2 size={11} className="animate-spin" /> : <FileCode size={11} />}
              Preview
            </button>
            <button
              type="button"
              onClick={() => void call(true)}
              disabled={working !== null}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {working === "apply" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Apply to project
            </button>
          </div>

          {/* Applied confirmation */}
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

          {/* File previews */}
          {files.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Files ({files.length})</p>
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
            <strong>After applying:</strong> <code className="font-mono">npm install @supabase/ssr</code> and set
            <code className="font-mono mx-1">NEXT_PUBLIC_SUPABASE_URL</code> +
            <code className="font-mono mx-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in env.
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
