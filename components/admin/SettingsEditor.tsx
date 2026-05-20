"use client"

import { useState } from "react"
import { Save, Loader2 } from "lucide-react"

interface Setting {
  key: string
  value: unknown
  updated_at: string
}

interface Props {
  settings: Setting[]
}

const GROUPS: { label: string; prefix: string; description: string }[] = [
  { label: "AI Models",   prefix: "ai.",           description: "Default model per plan and generation limits" },
  { label: "Rate Limits", prefix: "rate_limit.",   description: "Requests per minute per plan tier" },
  { label: "Credits",     prefix: "credits.",      description: "Monthly credit allocation per plan" },
]

function formatKey(key: string): string {
  return key.split(".").pop()?.replace(/_/g, " ") ?? key
}

function formatValue(value: unknown): string {
  if (typeof value === "string")  return value
  if (typeof value === "number")  return String(value)
  return JSON.stringify(value)
}

export function SettingsEditor({ settings }: Props) {
  const [values,  setValues]  = useState<Record<string, string>>(
    Object.fromEntries(settings.map(s => [s.key, formatValue(s.value)]))
  )
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function onChange(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload = Object.entries(values).map(([key, value]) => ({ key, value }))
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? "Save failed")
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {GROUPS.map(group => {
        const groupSettings = settings.filter(s => s.key.startsWith(group.prefix))
        if (!groupSettings.length) return null
        return (
          <div key={group.prefix}>
            <div className="mb-3 border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-semibold text-white">{group.label}</h3>
              <p className="text-xs text-zinc-500">{group.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {groupSettings.map(s => (
                <div key={s.key}>
                  <label className="mb-1 block text-xs font-semibold text-zinc-400 capitalize">
                    {formatKey(s.key)}
                  </label>
                  <input
                    type="text"
                    value={values[s.key] ?? ""}
                    onChange={e => onChange(s.key, e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                  <p className="mt-0.5 text-[10px] text-zinc-600 font-mono">{s.key}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved  && <span className="text-sm text-green-400">Saved ✓</span>}
        {error  && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  )
}
