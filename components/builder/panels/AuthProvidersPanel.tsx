"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown, ChevronUp, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "@/lib/toast"

// ─── Types ───────────────────────────────────────────────────────────────────

type Provider = "email" | "google" | "apple" | "facebook" | "github"

interface ProviderDef {
  id:          Provider
  label:       string
  icon:        string         // emoji or text abbreviation
  description: string
  docsUrl:     string
  alwaysOn?:   boolean        // email cannot be toggled off
  credentials: CredentialField[]
}

interface CredentialField {
  key:         string
  label:       string
  placeholder: string
  hint?:       string
  multiline?:  boolean
}

interface AuthConfig {
  external_email_enabled?:    boolean
  external_google_enabled?:   boolean
  external_google_client_id?: string
  external_apple_enabled?:    boolean
  external_apple_client_id?:  string
  external_facebook_enabled?: boolean
  external_facebook_client_id?: string
  external_github_enabled?:   boolean
  external_github_client_id?: string
}

// ─── Provider definitions ─────────────────────────────────────────────────────

const PROVIDERS: ProviderDef[] = [
  {
    id: "email",
    label: "Email / Password",
    icon: "✉",
    description: "Users sign in with email and password.",
    docsUrl: "https://supabase.com/docs/guides/auth/auth-email",
    alwaysOn: true,
    credentials: [],
  },
  {
    id: "google",
    label: "Google",
    icon: "G",
    description: "Sign in with Google account.",
    docsUrl: "https://supabase.com/docs/guides/auth/social-login/auth-google",
    credentials: [
      { key: "client_id", label: "Client ID",     placeholder: "1234567890-xxx.apps.googleusercontent.com" },
      { key: "secret",    label: "Client Secret", placeholder: "GOCSPX-…" },
    ],
  },
  {
    id: "apple",
    label: "Apple",
    icon: "",
    description: "Sign in with Apple ID.",
    docsUrl: "https://supabase.com/docs/guides/auth/social-login/auth-apple",
    credentials: [
      { key: "client_id", label: "Service ID",    placeholder: "com.yourapp.service" },
      { key: "team_id",   label: "Team ID",       placeholder: "XXXXXXXXXX" },
      { key: "key_id",    label: "Key ID",        placeholder: "XXXXXXXXXX" },
      { key: "secret",    label: "Private Key",   placeholder: "-----BEGIN PRIVATE KEY-----\n…", multiline: true,
        hint: "Download from Apple Developer → Certificates, IDs & Profiles → Keys" },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "f",
    description: "Sign in with Facebook / Meta account.",
    docsUrl: "https://supabase.com/docs/guides/auth/social-login/auth-facebook",
    credentials: [
      { key: "client_id", label: "App ID",     placeholder: "1234567890" },
      { key: "secret",    label: "App Secret", placeholder: "abc123…" },
    ],
  },
  {
    id: "github",
    label: "GitHub",
    icon: "⌥",
    description: "Sign in with GitHub account.",
    docsUrl: "https://supabase.com/docs/guides/auth/social-login/auth-github",
    credentials: [
      { key: "client_id", label: "Client ID",     placeholder: "Ov23li…" },
      { key: "secret",    label: "Client Secret", placeholder: "abc123…" },
    ],
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

interface AuthProvidersPanelProps {
  projectId: string
}

export function AuthProvidersPanel({ projectId }: AuthProvidersPanelProps) {
  const [config, setConfig]       = useState<AuthConfig>({})
  const [loading, setLoading]     = useState(true)
  const [noSupabase, setNoSupabase] = useState(false)
  const [noPat, setNoPat]         = useState(false)

  // Fetch cached config on mount
  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/auth-providers`)
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        if (err.error?.includes('No Supabase project')) setNoSupabase(true)
        return
      }
      const json = await res.json() as { config: AuthConfig }
      setConfig(json.config ?? {})
    } catch {
      toast.error("Could not load auth provider settings.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void fetchConfig() }, [fetchConfig])

  async function toggle(provider: Provider, enabled: boolean, credentials?: Record<string, string>) {
    try {
      const res = await fetch(`/api/projects/${projectId}/auth-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, enabled, credentials }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        if (json.error?.includes('Management API Token')) setNoPat(true)
        toast.error(json.error ?? "Failed to update provider.")
        return false
      }
      setNoPat(false)
      // Optimistically update local config
      setConfig(prev => ({
        ...prev,
        [`external_${provider}_enabled`]: enabled,
        ...(credentials?.client_id ? { [`external_${provider}_client_id`]: credentials.client_id } : {}),
      }))
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} ${enabled ? 'enabled' : 'disabled'}`)
      return true
    } catch {
      toast.error("Connection error. Try again.")
      return false
    }
  }

  // ── No Supabase connected ──────────────────────────────────────────────────
  if (!loading && noSupabase) {
    return (
      <div className="auth-providers-empty">
        <AlertCircle size={20} className="text-amber-400" />
        <p className="auth-providers-empty-text">
          Connect your Supabase project first in the <strong>Integrations</strong> tab to enable auth providers.
        </p>
      </div>
    )
  }

  return (
    <div className="auth-providers-panel">
      <div className="auth-providers-header">
        <h3 className="auth-providers-title">Sign-in Methods</h3>
        <p className="auth-providers-subtitle">
          Configure how users authenticate in your app.
          Changes apply to your connected Supabase project instantly.
        </p>
      </div>

      {/* Missing PAT warning */}
      {noPat && (
        <div className="auth-providers-warning">
          <AlertCircle size={14} />
          <span>
            Add your <strong>Management API Token</strong> in Integrations → Supabase to enable toggles.{" "}
            <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer" className="auth-providers-link">
              Get token ↗
            </a>
          </span>
        </div>
      )}

      {loading ? (
        <div className="auth-providers-loading">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading auth settings…</span>
        </div>
      ) : (
        <div className="auth-providers-list">
          {PROVIDERS.map(def => (
            <ProviderRow
              key={def.id}
              def={def}
              enabled={
                def.alwaysOn
                  ? true
                  : !!(config[`external_${def.id}_enabled` as keyof AuthConfig])
              }
              clientIdSet={!!(config[`external_${def.id}_client_id` as keyof AuthConfig])}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Individual Provider Row ──────────────────────────────────────────────────

interface ProviderRowProps {
  def:         ProviderDef
  enabled:     boolean
  clientIdSet: boolean
  onToggle:    (provider: Provider, enabled: boolean, credentials?: Record<string, string>) => Promise<boolean>
}

function ProviderRow({ def, enabled, clientIdSet, onToggle }: ProviderRowProps) {
  const [expanded, setExpanded]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [credentials, setCredentials] = useState<Record<string, string>>({})

  const needsCreds = def.credentials.length > 0 && !clientIdSet && !enabled

  async function handleToggle(newEnabled: boolean) {
    if (def.alwaysOn) return
    // If turning ON and credentials required but not yet saved, expand instead
    if (newEnabled && def.credentials.length > 0 && !clientIdSet) {
      setExpanded(true)
      return
    }
    setSaving(true)
    await onToggle(def.id, newEnabled)
    setSaving(false)
  }

  async function handleSave() {
    setSaving(true)
    const ok = await onToggle(def.id, true, credentials)
    if (ok) {
      setExpanded(false)
      setCredentials({})
    }
    setSaving(false)
  }

  const allCredsFilledIn = def.credentials
    .filter(f => f.key !== 'team_id' && f.key !== 'key_id') // Apple optional fields
    .every(f => (credentials[f.key] ?? '').trim().length > 0)

  return (
    <div className={`auth-provider-row ${enabled ? 'auth-provider-row--active' : ''}`}>
      {/* Main row */}
      <div className="auth-provider-main">
        <div className="auth-provider-icon">{def.icon}</div>
        <div className="auth-provider-info">
          <span className="auth-provider-label">
            {def.label}
            {enabled && clientIdSet && (
              <CheckCircle2 size={12} className="auth-provider-check" />
            )}
          </span>
          <span className="auth-provider-desc">{def.description}</span>
        </div>
        <div className="auth-provider-controls">
          {def.credentials.length > 0 && (
            <button
              className="auth-provider-docs"
              onClick={() => window.open(def.docsUrl, '_blank')}
              type="button"
              title="Setup guide"
            >
              <ExternalLink size={12} />
            </button>
          )}
          {def.credentials.length > 0 && (
            <button
              className="auth-provider-expand-btn"
              onClick={() => setExpanded(e => !e)}
              type="button"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {/* Toggle switch */}
          {saving ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : (
            <button
              role="switch"
              aria-checked={enabled}
              className={`auth-toggle ${enabled ? 'auth-toggle--on' : ''} ${def.alwaysOn ? 'auth-toggle--locked' : ''}`}
              onClick={() => void handleToggle(!enabled)}
              type="button"
              disabled={def.alwaysOn}
              title={def.alwaysOn ? 'Email auth cannot be disabled' : undefined}
            >
              <span className="auth-toggle-thumb" />
            </button>
          )}
        </div>
      </div>

      {/* Credentials expansion */}
      {expanded && def.credentials.length > 0 && (
        <div className="auth-provider-creds">
          <p className="auth-provider-creds-hint">
            {needsCreds
              ? `Enter your ${def.label} OAuth credentials to enable this provider.`
              : `Update your ${def.label} OAuth credentials.`}
            {" "}
            <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" className="auth-providers-link">
              Setup guide ↗
            </a>
          </p>
          {def.credentials.map(field => (
            <div key={field.key} className="auth-cred-field">
              <label className="auth-cred-label">
                {field.label}
                {field.hint && <span className="auth-cred-field-hint">{field.hint}</span>}
              </label>
              {field.multiline ? (
                <textarea
                  className="auth-cred-input auth-cred-input--textarea"
                  placeholder={field.placeholder}
                  rows={4}
                  value={credentials[field.key] ?? ''}
                  onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              ) : (
                <input
                  type="text"
                  className="auth-cred-input"
                  placeholder={field.placeholder}
                  value={credentials[field.key] ?? ''}
                  onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="auth-cred-actions">
            <button
              className="auth-cred-cancel"
              onClick={() => { setExpanded(false); setCredentials({}) }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="auth-cred-save"
              onClick={() => void handleSave()}
              disabled={saving || !allCredsFilledIn}
              type="button"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Enable {def.label}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
