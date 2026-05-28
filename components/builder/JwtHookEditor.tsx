"use client"

/**
 * R5-4: JWT custom-claims hook editor.
 *
 * Lets the user inspect + edit the Postgres `custom_access_token_hook`
 * function body and apply it via Management API. Pre-loaded with common
 * templates (user_role, plan, org_id).
 *
 * Renders inside the AuthProvidersPanel (below the scaffold section).
 */

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, ChevronRight, FileCode, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "@/lib/toast"

const TEMPLATES: Array<{ name: string; body: string; description: string }> = [
  {
    name: 'user_role from profiles',
    description: 'Inject a `user_role` claim by reading from public.profiles.role',
    body: `  -- Pull user_role from profiles table
  declare
    v_role text;
  begin
    select role into v_role from public.profiles where id = (event->>'user_id')::uuid;
    if v_role is not null then
      claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
    end if;
  end;`,
  },
  {
    name: 'plan tier',
    description: 'Inject `plan` claim (free/pro/teams) so RLS can gate features',
    body: `  declare v_plan text;
  begin
    select plan into v_plan from public.profiles where id = (event->>'user_id')::uuid;
    claims := jsonb_set(claims, '{plan}', to_jsonb(coalesce(v_plan, 'free')));
  end;`,
  },
  {
    name: 'multi-tenant org_id',
    description: 'Inject `org_id` so RLS can scope every query to a tenant',
    body: `  declare v_org uuid;
  begin
    select organization_id into v_org from public.profiles where id = (event->>'user_id')::uuid;
    if v_org is not null then
      claims := jsonb_set(claims, '{org_id}', to_jsonb(v_org));
    end if;
  end;`,
  },
]

const DEFAULT_BODY = `  -- TODO: read your custom claims from the DB and add to \`claims\`
  -- claims := jsonb_set(claims, '{plan}', to_jsonb('free'));
`

interface JwtHookEditorProps {
  projectId: string
}

export function JwtHookEditor({ projectId }: JwtHookEditorProps) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [definition, setDefinition]   = useState<string | null>(null)
  const [body, setBody]               = useState(DEFAULT_BODY)
  const [applying, setApplying]       = useState(false)
  const [warning, setWarning]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setWarning(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/auth/jwt-hook`)
      const data = await res.json() as { exists?: boolean; definition?: string | null; error?: string }
      if (!res.ok) {
        setWarning(data.error ?? 'Could not load hook')
        return
      }
      setDefinition(data.definition ?? null)
    } catch { setWarning('Network error') } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { if (open) void load() }, [open, load])

  async function apply() {
    if (!confirm('Apply this hook to your Supabase project? It will create-or-replace public.custom_access_token_hook.\n\nAfter applying: go to Authentication → Hooks → Custom Access Token → enable it.')) return
    setApplying(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/auth/jwt-hook`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Apply failed'); return }
      toast.success('Hook applied. Enable it in Auth → Hooks.')
      await load()
    } catch { toast.error('Network error') } finally { setApplying(false) }
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
          <ShieldCheck size={12} className="text-violet-300 shrink-0" />
          <span className="text-[12px] font-semibold text-zinc-100">Custom JWT claims hook</span>
        </div>
        <span className="text-[10px] text-violet-300/70 shrink-0">live · in your Supabase</span>
      </button>

      {open && (
        <div className="border-t border-violet-500/15 px-3 py-2.5 space-y-2 bg-black/20">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Edit your Supabase project&apos;s <code className="font-mono">public.custom_access_token_hook</code> function.
            Use it to inject custom claims (role, plan, org_id) that RLS policies can then read via <code className="font-mono">auth.jwt()</code>.
          </p>

          {warning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
              {warning}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500"><Loader2 size={11} className="animate-spin" /> Loading current hook...</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {definition ? 'Hook exists in DB' : 'Hook NOT installed yet'}
                </p>
                <button type="button" onClick={() => void load()}
                  className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded" title="Refresh">
                  <RefreshCw size={10} />
                </button>
              </div>
              {definition && (
                <pre className="bg-black/40 border border-zinc-800 rounded-md px-2 py-1.5 text-[10px] font-mono text-zinc-400 leading-relaxed overflow-x-auto max-h-32">
                  {definition.slice(0, 1200)}{definition.length > 1200 ? '\n…' : ''}
                </pre>
              )}
            </>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Template (paste then edit)</p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setBody(t.body)}
                  title={t.description}
                  className="text-[10px] text-zinc-400 bg-zinc-800/60 hover:bg-zinc-700/60 hover:text-zinc-200 px-2 py-0.5 rounded transition-colors"
                >
                  {t.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBody(DEFAULT_BODY)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-0.5 rounded"
              >
                Reset
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Function body (between BEGIN/END)</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-black/40 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40 resize-vertical"
              spellCheck={false}
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              Available: <code className="font-mono">event</code> (jsonb), <code className="font-mono">claims</code> (jsonb, modify in-place). Use <code className="font-mono">jsonb_set(claims, &apos;&#123;key&#125;&apos;, to_jsonb(value))</code>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={applying || !body.trim()}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {applying ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Apply to Supabase
            </button>
          </div>

          <div className="text-[10px] text-zinc-600 leading-snug pt-1 flex items-start gap-1.5">
            <FileCode size={10} className="mt-0.5 shrink-0" />
            <span>After applying: open your Supabase dashboard → Authentication → Hooks → Custom Access Token → enable + select <code className="font-mono">public.custom_access_token_hook</code>.</span>
          </div>
        </div>
      )}
    </div>
  )
}
