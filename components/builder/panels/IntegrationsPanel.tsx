"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CreditCard, Database, Phone, Mail, Key,
  ChevronDown, ChevronUp, CheckCircle2, Loader2, Trash2, Plus, X,
  ExternalLink, AlertCircle, Plug, Clock, Zap, ArrowRight,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Integration {
  type:          IntegrationType
  status:        "pending" | "active" | "sandbox" | "error"
  public_config: Record<string, string>
  secrets_set:   Record<string, boolean>
  updated_at:    string
}

interface EnvEntry { key: string; value: string }

type IntegrationType = "stripe" | "supabase" | "twilio" | "openai" | "anthropic" | "resend" | "env"

// Connectors shown in the "coming soon" section — not yet wired
const COMING_SOON_CONNECTORS = [
  { label: "Shopify",           description: "Build an eCommerce store"                  },
  { label: "GitHub",            description: "Sync code and trigger deployments"          },
  { label: "Figma",             description: "Import designs directly into your app"      },
  { label: "Notion",            description: "Read and write your Notion workspace"       },
  { label: "Airtable",          description: "Spreadsheet-database hybrid + automation"  },
  { label: "Salesforce",        description: "CRM data and lead management"              },
  { label: "OpenAI",            description: "GPT models for AI-powered features"        },
  { label: "AWS S3",            description: "Read and write files in S3 buckets"        },
  { label: "Google Calendar",   description: "Sync events and scheduling"                },
  { label: "Slack",             description: "Send notifications and messages"           },
]

interface IntegrationDef {
  type:         IntegrationType
  label:        string
  icon:         React.ElementType
  description:  string
  docsUrl:      string
  fields: {
    key:         string
    label:       string
    placeholder: string
    secret:      boolean
    hint?:       string
  }[]
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: "stripe", label: "Stripe", icon: CreditCard,
    description: "Accept payments, subscriptions, and manage billing in your app.",
    docsUrl: "https://stripe.com/docs",
    fields: [
      { key: "mode",             label: "Mode",              placeholder: "test",              secret: false, hint: "test or live" },
      { key: "publishable_key",  label: "Publishable Key",   placeholder: "pk_test_…",         secret: false },
      { key: "secret_key",       label: "Secret Key",        placeholder: "sk_test_…",         secret: true  },
      { key: "webhook_secret",   label: "Webhook Secret",    placeholder: "whsec_…",           secret: true, hint: "Optional — only needed if you handle webhooks" },
    ],
  },
  {
    type: "supabase", label: "Supabase", icon: Database,
    description: "Database, auth, and storage for your generated app (your own project).",
    docsUrl: "https://supabase.com/docs",
    fields: [
      { key: "project_url",     label: "Project URL",       placeholder: "https://xxx.supabase.co", secret: false },
      { key: "anon_key",        label: "Anon Key",          placeholder: "eyJ…",                    secret: false },
      { key: "service_role_key",label: "Service Role Key",  placeholder: "eyJ…",                    secret: true,  hint: "Keep this secret — grants full DB access" },
    ],
  },
  {
    type: "twilio", label: "Twilio", icon: Phone,
    description: "SMS, voice calls, WhatsApp, and phone number verification.",
    docsUrl: "https://www.twilio.com/docs",
    fields: [
      { key: "account_sid",    label: "Account SID",    placeholder: "AC…",   secret: false },
      { key: "api_key_sid",    label: "API Key SID",    placeholder: "SK…",   secret: false },
      { key: "api_key_secret", label: "API Key Secret", placeholder: "••••",  secret: true  },
    ],
  },
  {
    type: "resend", label: "Resend", icon: Mail,
    description: "Transactional email — welcome emails, password resets, notifications.",
    docsUrl: "https://resend.com/docs",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_…", secret: true },
    ],
  },
]

// ─── Main panel ──────────────────────────────────────────────────────────────

interface StripeSandbox {
  mode: "sandbox" | "live"
  sandbox_provisioned_at: string | null
  claimed_at: string | null
  stripe_account_id: string | null
}

export function IntegrationsPanel({ projectId }: { projectId: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading]           = useState(true)
  const [expanded, setExpanded]         = useState<IntegrationType | null>(null)
  const [sandbox, setSandbox]           = useState<StripeSandbox | null>(null)

  const loadSandbox = useCallback(async () => {
    try {
      const res  = await fetch(`/api/projects/${projectId}/stripe-sandbox`)
      const data = await res.json() as { sandbox: StripeSandbox | null }
      setSandbox(data.sandbox ?? null)
    } catch { /* non-fatal */ }
  }, [projectId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/projects/${projectId}/integrations`)
      const data = await res.json() as { integrations: Integration[] }
      setIntegrations(data.integrations ?? [])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadSandbox() }, [loadSandbox])

  const getIntegration = (type: IntegrationType) =>
    integrations.find(i => i.type === type)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold text-white">Integrations</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Connect third-party services. Keys are stored securely and injected into your app&apos;s environment.
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-zinc-500" />
          </div>
        ) : (
          <>
            {/* ── Active integrations ── */}
            <div className="space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Your App</p>

              {/* Stripe sandbox banner */}
              <StripeSandboxBanner
                projectId={projectId}
                sandbox={sandbox}
                onProvisioned={() => { void loadSandbox() }}
              />

              {INTEGRATIONS.map(def => (
                <IntegrationCard
                  key={def.type}
                  def={def}
                  integration={getIntegration(def.type)}
                  projectId={projectId}
                  isExpanded={expanded === def.type}
                  onToggle={() => setExpanded(prev => prev === def.type ? null : def.type)}
                  onSaved={load}
                  onRemoved={load}
                />
              ))}

              {/* Custom env vars */}
              <EnvVarsCard
                projectId={projectId}
                integration={getIntegration("env")}
                isExpanded={expanded === "env"}
                onToggle={() => setExpanded(prev => prev === "env" ? null : "env")}
                onSaved={load}
                onRemoved={load}
              />
            </div>

            {/* ── Connectors — coming soon ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Connectors</p>
                <span className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  <Clock size={9} /> Coming soon
                </span>
              </div>
              <p className="px-1 text-[10px] text-zinc-600">
                One-click connectors let your app talk to external tools. Configured once, available across all your projects.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {COMING_SOON_CONNECTORS.map(c => (
                  <div
                    key={c.label}
                    className="flex flex-col gap-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">{c.label}</span>
                      <Plug size={10} className="text-zinc-600" />
                    </div>
                    <span className="text-[10px] text-zinc-600 leading-snug">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Stripe Sandbox Banner ───────────────────────────────────────────────────

function StripeSandboxBanner({
  projectId,
  sandbox,
  onProvisioned,
}: {
  projectId: string
  sandbox: StripeSandbox | null
  onProvisioned: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function provision() {
    setBusy(true)
    try {
      await fetch(`/api/projects/${projectId}/stripe-sandbox`, { method: "POST" })
      onProvisioned()
    } finally {
      setBusy(false)
    }
  }

  async function goLive() {
    setBusy(true)
    try {
      const res  = await fetch(`/api/projects/${projectId}/stripe-sandbox/connect`)
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
    } finally {
      setBusy(false)
    }
  }

  // Live — user has claimed their own Stripe account
  if (sandbox?.mode === "live") {
    return (
      <div className="rounded-lg border border-green-900/40 bg-green-950/20 px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 size={12} className="text-green-400" />
            <span className="text-xs font-semibold text-green-300">Stripe Live Connected</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Your Stripe account is active. Payments go to your account.
          </p>
        </div>
        <span className="shrink-0 rounded bg-green-900/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
          Live
        </span>
      </div>
    )
  }

  // Sandbox provisioned — show "Go Live" CTA
  if (sandbox?.mode === "sandbox" && sandbox.sandbox_provisioned_at) {
    return (
      <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap size={12} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">Test Sandbox Active</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Platform Stripe test keys are injected into your app. Safe for development — no real charges.
            </p>
          </div>
          <span className="shrink-0 rounded bg-purple-900/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-400">
            Test
          </span>
        </div>
        <button
          onClick={goLive}
          disabled={busy}
          className="mt-3 flex items-center gap-1.5 rounded-md bg-purple-700 hover:bg-purple-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
          Connect your Stripe to go live
        </button>
      </div>
    )
  }

  // Not yet provisioned — offer to auto-provision
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <CreditCard size={12} className="text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-300">Stripe Payments</span>
      </div>
      <p className="text-[11px] text-zinc-500 mb-3">
        Auto-provision a free Stripe test sandbox for this app. You can connect your own account later.
      </p>
      <button
        onClick={provision}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
        Activate test sandbox
      </button>
    </div>
  )
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  def, integration, projectId, isExpanded, onToggle, onSaved, onRemoved,
}: {
  def:         IntegrationDef
  integration: Integration | undefined
  projectId:   string
  isExpanded:  boolean
  onToggle:    () => void
  onSaved:     () => void
  onRemoved:   () => void
}) {
  const Icon     = def.icon
  const isActive = integration?.status === "active"
  const isSandbox= integration?.status === "sandbox"

  // Form state: one key per field
  const [values,  setValues]  = useState<Record<string, string>>({})
  const [saving,  setSaving]  = useState(false)
  const [removing,setRemoving]= useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Pre-populate public fields when expanding
  useEffect(() => {
    if (isExpanded && integration) {
      const pre: Record<string, string> = {}
      for (const f of def.fields) {
        if (!f.secret) pre[f.key] = (integration.public_config[f.key] ?? "") as string
      }
      setValues(pre)
    }
  }, [isExpanded, integration, def.fields])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const public_config: Record<string, string> = {}
      const secret_config: Record<string, string> = {}
      for (const f of def.fields) {
        const v = values[f.key] ?? ""
        if (!v) continue
        if (f.secret) secret_config[f.key] = v
        else          public_config[f.key]  = v
      }
      const res = await fetch(`/api/projects/${projectId}/integrations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: def.type, public_config, secret_config }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? "Save failed")
      }
      onSaved()
      // Clear secret fields after save (they're now set on server)
      setValues(prev => {
        const next = { ...prev }
        for (const f of def.fields) if (f.secret) delete next[f.key]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm(`Remove ${def.label} integration and all its keys?`)) return
    setRemoving(true)
    try {
      await fetch(`/api/projects/${projectId}/integrations/${def.type}`, { method: "DELETE" })
      onRemoved()
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={`rounded-lg border transition-colors ${isActive ? "border-green-900/50 bg-zinc-900" : isSandbox ? "border-purple-900/40 bg-zinc-900" : "border-zinc-800 bg-zinc-900"}`}>
      {/* Card header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-green-900/40" : "bg-zinc-800"}`}>
          <Icon size={15} className={isActive ? "text-green-400" : "text-zinc-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{def.label}</span>
            <StatusBadge status={integration?.status} />
          </div>
          <p className="text-xs text-zinc-500 truncate">{def.description}</p>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-zinc-500 shrink-0" /> : <ChevronDown size={14} className="text-zinc-500 shrink-0" />}
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3">
          {def.fields.map(f => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-400">
                  {f.label}
                  {f.secret && <span className="ml-1 text-[10px] text-zinc-600 font-normal">(secret)</span>}
                </label>
                {f.secret && integration?.secrets_set[f.key] && (
                  <span className="text-[10px] text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Set
                  </span>
                )}
              </div>
              <input
                type={f.secret ? "password" : "text"}
                placeholder={f.secret && integration?.secrets_set[f.key] ? "Leave blank to keep existing" : f.placeholder}
                value={values[f.key] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none font-mono"
              />
              {f.hint && <p className="mt-0.5 text-[10px] text-zinc-600">{f.hint}</p>}
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 rounded bg-red-950/40 border border-red-900/40 px-3 py-2 text-xs text-red-400">
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {integration && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={removing}
                  className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                >
                  {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Remove
                </button>
              )}
              <a
                href={def.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                <ExternalLink size={11} /> Docs
              </a>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {saving ? "Saving…" : "Save & Inject"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Env Vars Card ────────────────────────────────────────────────────────────

function EnvVarsCard({
  projectId, integration, isExpanded, onToggle, onSaved, onRemoved,
}: {
  projectId:   string
  integration: Integration | undefined
  isExpanded:  boolean
  onToggle:    () => void
  onSaved:     () => void
  onRemoved:   () => void
}) {
  const [entries,  setEntries]  = useState<EnvEntry[]>([{ key: "", value: "" }])
  const [saving,   setSaving]   = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const count = integration
    ? Object.keys(integration.secrets_set).length
    : 0

  function addRow()   { setEntries(prev => [...prev, { key: "", value: "" }]) }
  function removeRow(i: number) { setEntries(prev => prev.filter((_, idx) => idx !== i)) }
  function updateRow(i: number, field: "key" | "value", val: string) {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const valid = entries.filter(e => e.key.trim() && e.value.trim())
      if (valid.length === 0) throw new Error("Add at least one key-value pair")
      // Store as { KEY: VALUE, ... } in secret_config
      const secret_config = Object.fromEntries(valid.map(e => [e.key.trim(), e.value.trim()]))
      const res = await fetch(`/api/projects/${projectId}/integrations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "env", public_config: { count: valid.length }, secret_config }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? "Save failed")
      }
      onSaved()
      setEntries([{ key: "", value: "" }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm("Remove all custom environment variables?")) return
    setRemoving(true)
    try {
      await fetch(`/api/projects/${projectId}/integrations/env`, { method: "DELETE" })
      onRemoved()
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={`rounded-lg border transition-colors ${count > 0 ? "border-green-900/50 bg-zinc-900" : "border-zinc-800 bg-zinc-900"}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${count > 0 ? "bg-green-900/40" : "bg-zinc-800"}`}>
          <Key size={15} className={count > 0 ? "text-green-400" : "text-zinc-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Environment Variables</span>
            {count > 0 && <span className="rounded bg-green-900/40 px-2 py-0.5 text-[10px] font-semibold text-green-400">{count} set</span>}
          </div>
          <p className="text-xs text-zinc-500">Custom key-value pairs injected into your app&apos;s environment.</p>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-zinc-500 shrink-0" /> : <ChevronDown size={14} className="text-zinc-500 shrink-0" />}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3">
          <p className="text-[10px] text-zinc-500">
            Values are stored securely and never returned to the browser. Add rows for any third-party API not listed above.
          </p>

          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="VARIABLE_NAME"
                  value={e.key}
                  onChange={ev => updateRow(i, "key", ev.target.value)}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none font-mono uppercase"
                />
                <input
                  type="password"
                  placeholder="value"
                  value={e.value}
                  onChange={ev => updateRow(i, "value", ev.target.value)}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="shrink-0 rounded p-1 text-zinc-600 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"
          >
            <Plus size={12} /> Add variable
          </button>

          {error && (
            <div className="flex items-center gap-2 rounded bg-red-950/40 border border-red-900/40 px-3 py-2 text-xs text-red-400">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {integration && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={removing}
                  className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                >
                  {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Clear all
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {saving ? "Saving…" : "Save & Inject"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "pending") {
    return <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">Not connected</span>
  }
  if (status === "active") {
    return <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">Connected</span>
  }
  if (status === "sandbox") {
    return <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">Sandbox</span>
  }
  if (status === "error") {
    return <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">Error</span>
  }
  return null
}
