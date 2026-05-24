"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Bot, Check, ChevronDown, ChevronRight, FileCode, Globe, Loader2, RefreshCw, Search, Sparkles,
} from "lucide-react"
import { toast } from "@/lib/toast"
import type { SeoConfig, GeneratedFile } from "@/lib/seo/generator"

interface SEOPanelProps {
  projectId: string
}

export function SEOPanel({ projectId }: SEOPanelProps) {
  const [config, setConfig]     = useState<SeoConfig | null>(null)
  const [files, setFiles]       = useState<GeneratedFile[]>([])
  const [loading, setLoading]   = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<{ written: string[]; failed: { path: string; error: string }[] } | null>(null)

  const loadDefaults = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/seo`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json() as { config: SeoConfig }
      setConfig(data.config)
    } catch {
      toast.error('Could not load SEO defaults')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void loadDefaults() }, [loadDefaults])

  async function preview() {
    if (!config) return
    setPreviewing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, apply: false }),
      })
      const data = await res.json() as { files: GeneratedFile[] }
      setFiles(data.files)
      setApplyResult(null)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  async function applyToProject() {
    if (!config) return
    setApplying(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, apply: true }),
      })
      const data = await res.json() as { written: string[]; failed: { path: string; error: string }[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Apply failed'); return }
      setApplyResult({ written: data.written, failed: data.failed })
      toast.success(`Wrote ${data.written.length} file${data.written.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('Could not write files — check your project preview is running')
    } finally {
      setApplying(false)
    }
  }

  function patch(key: keyof SeoConfig, value: SeoConfig[typeof key]) {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Search size={14} className="text-cyan-400" />
            SEO &amp; AI Search
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Generate real files in your repo: sitemap, robots.txt, <code className="text-zinc-400">llms.txt</code>, metadata helpers.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading || !config ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            {/* AEO callout */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot size={12} className="text-cyan-300" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Answer Engine Optimization</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                We allowlist ChatGPT, Perplexity, Claude, and Google-Extended in robots.txt and emit an
                <code className="text-cyan-200 mx-1">llms.txt</code> file so AI engines can index your site cleanly.
              </p>
            </div>

            {/* Config form */}
            <div className="space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Site Defaults</p>
              <Field label="Site name"        value={config.siteName}           onChange={v => patch('siteName', v)} />
              <Field label="Site URL"         value={config.siteUrl}            onChange={v => patch('siteUrl', v)}  placeholder="https://example.com" />
              <Field label="Default title"    value={config.defaultTitle}       onChange={v => patch('defaultTitle', v)} />
              <Field label="Title template"   value={config.titleTemplate ?? ''} onChange={v => patch('titleTemplate', v)} placeholder="%s · SiteName" hint="%s gets replaced with the page title" />
              <FieldTextarea label="Description" value={config.defaultDescription} onChange={v => patch('defaultDescription', v)} />
              <Field label="Twitter handle"   value={config.twitterHandle ?? ''} onChange={v => patch('twitterHandle', v)} placeholder="@example" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => void preview()}
                disabled={previewing || applying}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                type="button"
              >
                {previewing ? <Loader2 size={12} className="animate-spin" /> : <FileCode size={12} />}
                Preview files
              </button>
              <button
                onClick={() => void applyToProject()}
                disabled={previewing || applying || !config.siteName || !config.siteUrl}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-600/20 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-600/30 disabled:opacity-50 transition-colors"
                type="button"
              >
                {applying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Apply to project
              </button>
            </div>

            {/* Apply result */}
            {applyResult && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                <p className="text-[11px] font-semibold text-emerald-200 flex items-center gap-1.5">
                  <Check size={11} /> Wrote {applyResult.written.length} file{applyResult.written.length === 1 ? '' : 's'}
                </p>
                {applyResult.written.map(p => (
                  <p key={p} className="text-[10px] font-mono text-emerald-300/70 ml-4">{p}</p>
                ))}
                {applyResult.failed.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-red-300 mt-2">Failed:</p>
                    {applyResult.failed.map(f => (
                      <p key={f.path} className="text-[10px] font-mono text-red-300/70 ml-4">{f.path} — {f.error}</p>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Generated files list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Generated Files ({files.length})</p>
                {files.map(f => (
                  <FilePreview
                    key={f.path}
                    file={f}
                    expanded={expanded === f.path}
                    onToggle={() => setExpanded(e => e === f.path ? null : f.path)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-zinc-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-[12px] bg-black/40 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
      />
      {hint && <p className="text-[10px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

function FieldTextarea({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] text-zinc-400 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className="w-full px-2.5 py-1.5 text-[12px] bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-cyan-500/40 resize-vertical"
      />
    </div>
  )
}

function FilePreview({
  file, expanded, onToggle,
}: { file: GeneratedFile; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50"
        type="button"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          <FileCode size={11} className="text-zinc-500 shrink-0" />
          <code className="text-[11px] text-zinc-200 truncate font-mono">{file.path}</code>
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{formatBytes(file.byteSize)}</span>
      </button>
      {expanded && (
        <pre className="border-t border-zinc-800 bg-black/40 px-3 py-2 text-[10.5px] font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-72">
          {file.content}
        </pre>
      )}
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}
