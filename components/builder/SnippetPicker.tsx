"use client"

/**
 * B4: Slash-command picker — opens above the chat composer when the user
 * types `/` at the start of an empty line, lists matching snippets.
 *
 * Selection injects snippet.body into the chat input, replacing the `/<query>`.
 */

import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

interface Snippet {
  id:          string
  trigger:     string
  label:       string
  description: string | null
  tags:        string[]
  use_count:   number
}

interface SnippetPickerProps {
  /** The current chat composer value (only used to compute the query). */
  query:       string
  /** Called when the user picks a snippet — receives the trigger so caller
   *  can fetch the body. Caller is responsible for replacing the input. */
  onPick:      (trigger: string) => void
  /** Hide the picker. */
  onClose:     () => void
  /** Optional limit. */
  maxResults?: number
}

export function SnippetPicker({ query, onPick, onClose, maxResults = 8 }: SnippetPickerProps) {
  const [snippets, setSnippets] = useState<Snippet[] | null>(null)
  const [highlight, setHighlight] = useState(0)

  // Fetch on mount (snippets are user-level — fine to cache aggressively)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/user/snippets')
        if (!res.ok) return
        const data = await res.json() as { snippets?: Snippet[] }
        if (cancelled) return
        setSnippets(data.snippets ?? [])
      } catch { /* swallow */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Strip leading "/" then filter by trigger prefix or label fuzzy match
  const trimmedQ = query.startsWith('/') ? query.slice(1).toLowerCase() : query.toLowerCase()
  const filtered = (snippets ?? [])
    .filter((s) => !trimmedQ
      || s.trigger.toLowerCase().startsWith(trimmedQ)
      || s.label.toLowerCase().includes(trimmedQ)
      || s.tags.some((t) => t.toLowerCase().includes(trimmedQ)))
    .slice(0, maxResults)

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (filtered.length === 0) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
      else if (e.key === 'Enter')   { e.preventDefault(); const picked = filtered[highlight]; if (picked) onPick(picked.trigger) }
      else if (e.key === 'Escape')  { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, highlight, onPick, onClose])

  // Reset highlight when query changes
  useEffect(() => { setHighlight(0) }, [trimmedQ])

  return (
    <div className="absolute bottom-full left-2 right-2 mb-2 z-50 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
      <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-1.5">
        <Sparkles size={9} /> Snippets {trimmedQ && <span className="text-zinc-400">· “{trimmedQ}”</span>}
      </div>

      {snippets === null ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={12} className="animate-spin text-zinc-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-[11px] text-zinc-500">
            {snippets.length === 0 ? "No snippets yet. Save reusable patterns in Settings → Snippets." : "No matches."}
          </p>
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto">
          {filtered.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s.trigger)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                  i === highlight ? 'bg-violet-600/15' : 'hover:bg-zinc-900'
                }`}
              >
                <code className={`text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
                  i === highlight ? 'bg-violet-600/30 text-violet-100' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  /{s.trigger}
                </code>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-zinc-100 truncate">{s.label}</p>
                  {s.description && (
                    <p className="text-[10.5px] text-zinc-500 truncate">{s.description}</p>
                  )}
                </div>
                {s.use_count > 0 && (
                  <span className="text-[9px] text-zinc-600 shrink-0">×{s.use_count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="px-3 py-1.5 border-t border-zinc-800 text-[9px] text-zinc-600 flex items-center justify-between">
        <span>↑↓ navigate · ↵ pick · esc close</span>
        <a href="/settings/snippets" className="text-zinc-500 hover:text-violet-300">Manage</a>
      </div>
    </div>
  )
}
