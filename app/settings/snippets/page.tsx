"use client"

/**
 * R4-3: Snippet management page (`/settings/snippets`).
 *
 * CRUD UI for user_snippets. Create, edit, delete reusable instruction
 * packages that trigger via `/<trigger>` slash command in the chat composer.
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "@/lib/toast"

interface Snippet {
  id:          string
  trigger:     string
  label:       string
  description: string | null
  body:        string
  tags:        string[]
  source:      string
  use_count:   number
  last_used_at: string | null
  updated_at:  string
}

export default function SnippetsSettingsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Snippet | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/snippets')
      const data = await res.json() as { snippets?: Array<Snippet & { body?: string }> }
      // List endpoint omits body — fetch each on demand
      setSnippets((data.snippets ?? []).map((s) => ({ ...s, body: '' })))
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function startEdit(s: Snippet) {
    // Fetch full snippet (with body) — list endpoint omits it
    const res = await fetch(`/api/user/snippets/${s.id}`)
    const data = await res.json() as { snippet?: Snippet }
    if (data.snippet) setEditing(data.snippet)
  }

  async function save(s: Partial<Snippet> & { id?: string }) {
    if (!s.label || !s.body) { toast.error('Label and body required'); return }
    try {
      if (s.id) {
        // Update
        const res = await fetch(`/api/user/snippets/${s.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ label: s.label, description: s.description, body: s.body, tags: s.tags ?? [] }),
        })
        if (!res.ok) { const e = await res.json() as { error?: string }; toast.error(e.error ?? 'Save failed'); return }
        toast.success('Saved')
      } else {
        // Create
        if (!s.trigger) { toast.error('Trigger required'); return }
        const res = await fetch('/api/user/snippets', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            trigger: s.trigger, label: s.label, description: s.description,
            body: s.body, tags: s.tags ?? [], source: 'manual',
          }),
        })
        if (!res.ok) { const e = await res.json() as { error?: string }; toast.error(e.error ?? 'Create failed'); return }
        toast.success('Snippet created')
      }
      setEditing(null); setCreating(false)
      await load()
    } catch { toast.error('Network error') }
  }

  async function remove(s: Snippet) {
    if (!confirm(`Delete /${s.trigger}?`)) return
    await fetch(`/api/user/snippets/${s.id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6 text-zinc-200">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" /> Snippets
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Reusable instruction packages triggered via <code className="font-mono">/&lt;trigger&gt;</code> in the chat composer.
            Apply across all your projects.
          </p>
        </div>
        <button
          onClick={() => { setEditing({ id: '', trigger: '', label: '', description: '', body: '', tags: [], source: 'manual', use_count: 0, last_used_at: null, updated_at: '' }); setCreating(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-violet-600 hover:bg-violet-500 text-white"
          type="button"
        >
          <Plus size={12} /> New snippet
        </button>
      </header>

      {/* Editor (modal-ish) */}
      {editing && (
        <SnippetEditor
          snippet={editing}
          isNew={creating}
          onCancel={() => { setEditing(null); setCreating(false) }}
          onSave={save}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-zinc-600" /></div>
      ) : snippets.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-300 font-medium">No snippets yet</p>
          <p className="text-xs text-zinc-500 mt-1">Create your first reusable instruction package.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snippets.map((s) => (
            <div key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 flex items-center gap-3">
              <code className="font-mono text-[11px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded shrink-0">/{s.trigger}</code>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{s.label}</p>
                {s.description && <p className="text-xs text-zinc-500 truncate">{s.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {s.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                  <span className="text-[10px] text-zinc-600">used {s.use_count}× · {s.source}</span>
                </div>
              </div>
              <button type="button" onClick={() => void startEdit(s)} className="text-zinc-500 hover:text-zinc-200 p-1.5" title="Edit">
                <Pencil size={12} />
              </button>
              <button type="button" onClick={() => void remove(s)} className="text-zinc-500 hover:text-red-400 p-1.5" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Editor ─────────────────────────────────────────────────────────────────

function SnippetEditor({
  snippet, isNew, onCancel, onSave,
}: {
  snippet:  Snippet
  isNew:    boolean
  onCancel: () => void
  onSave:   (s: Partial<Snippet> & { id?: string }) => void | Promise<void>
}) {
  const [trigger, setTrigger]         = useState(snippet.trigger)
  const [label, setLabel]             = useState(snippet.label)
  const [description, setDescription] = useState(snippet.description ?? '')
  const [body, setBody]               = useState(snippet.body)
  const [tagsRaw, setTagsRaw]         = useState((snippet.tags ?? []).join(', '))

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{isNew ? 'New snippet' : `Edit /${snippet.trigger}`}</h2>
        <button onClick={onCancel} type="button" className="text-zinc-500 hover:text-zinc-200">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-2">
        <input
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="trigger"
          disabled={!isNew}
          className="px-2 py-1.5 text-[12px] font-mono bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40 disabled:opacity-60"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Human-readable label"
          className="px-2 py-1.5 text-[12px] bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40"
        />
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description — 'Use when…' (helps fuzzy search)"
        className="w-full px-2 py-1.5 text-[12px] bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40"
      />

      <input
        value={tagsRaw}
        onChange={(e) => setTagsRaw(e.target.value)}
        placeholder="Tags, comma-separated (database, drizzle, postgres)"
        className="w-full px-2 py-1.5 text-[12px] bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        placeholder="The instruction text that gets injected into the chat composer..."
        className="w-full px-2 py-1.5 text-[12px] font-mono bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40 resize-vertical"
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} type="button" className="text-xs text-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded">Cancel</button>
        <button
          onClick={() => void onSave({
            id:          isNew ? undefined : snippet.id,
            trigger:     trigger.trim().toLowerCase(),
            label,
            description: description || undefined,
            body,
            tags:        tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
          })}
          type="button"
          disabled={!label || !body || (isNew && !trigger)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          <Save size={11} /> {isNew ? 'Create' : 'Save'}
        </button>
      </div>
    </div>
  )
}
