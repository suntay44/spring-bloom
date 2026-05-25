-- Migration 037: Security Notes (generation-time auto-capture)
--
-- This is the UNIQUE differentiator vs Lovable. Lovable's "security memory"
-- is a manual textarea the user maintains. Ours auto-populates whenever the
-- AI writes security-relevant code (RLS policies, auth checks, raw SQL,
-- eval, webhook signature verification, etc.).
--
-- Each note records:
--   - WHAT we detected (category + title + matched snippet)
--   - WHERE (file + line range from the artifact)
--   - WHEN (linked to the agent_run that produced it)
--
-- The security scanner reads these notes as context, so it can give better
-- recommendations without re-deriving everything from scratch.

create table if not exists public.security_notes (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  agent_run_id  uuid references public.agent_runs(id) on delete set null,
  -- Where we saw it
  source        text not null check (source in ('generation', 'user', 'scanner')),
  category      text not null,           -- 'rls', 'auth', 'secrets', 'webhook', 'sql', 'eval', etc.
  pattern       text,                    -- the rule that matched (e.g. 'enable_rls')
  -- Content
  title         text not null,
  snippet       text,                    -- the matched code excerpt (truncated)
  file_path     text,
  line_start    int,
  line_end      int,
  -- Disposition
  accepted_risk boolean not null default false,
  accepted_at   timestamptz,
  accepted_note text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_security_notes_project  on public.security_notes(project_id, created_at desc);
create index if not exists idx_security_notes_category on public.security_notes(project_id, category);
create index if not exists idx_security_notes_run      on public.security_notes(agent_run_id);

alter table public.security_notes enable row level security;
create policy "users own their security notes"
  on public.security_notes for all using (auth.uid() = user_id);

comment on table  public.security_notes is
  'Auto-captured security observations from AI-generated code. Differentiator vs Lovable (their security memory is manual-only).';
comment on column public.security_notes.source is
  'generation = auto from LLM stream | user = manual entry | scanner = surfaced by security scan';
