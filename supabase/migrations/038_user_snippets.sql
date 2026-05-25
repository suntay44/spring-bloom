-- Migration 038: User snippets / skills library
--
-- Reusable instruction packages a user saves once and triggers across projects
-- via `/snippet-name` slash commands in chat OR auto-suggested via NLP match.
--
-- Inspired by Lovable's "Skills" (markdown context packages), but stored
-- per-user (workspace-scoped — applies across all projects of this user) and
-- importable from `.cursor/rules/*.mdc`, `AGENTS.md`, `CLAUDE.md`.

create table if not exists public.user_snippets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  -- Trigger handle: typing `/<trigger>` in chat injects this snippet's body
  trigger         text not null,                  -- kebab-case, e.g. "drizzle-migration"
  label           text not null,                  -- human-readable name
  description     text,                           -- "Use when..." — drives NLP matching
  body            text not null,                  -- markdown or code that gets injected
  tags            text[] not null default '{}',
  -- Provenance
  source          text not null default 'manual'
    check (source in ('manual', 'cursor', 'agents', 'github', 'imported')),
  source_url      text,                           -- GitHub URL if imported
  -- Usage tracking — let users see which snippets they actually use
  use_count       int  not null default 0,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, trigger)
);

create index if not exists idx_user_snippets_user on public.user_snippets(user_id, created_at desc);

alter table public.user_snippets enable row level security;
create policy "users own their snippets"
  on public.user_snippets for all using (auth.uid() = user_id);

comment on table public.user_snippets is
  'Reusable markdown/code snippets the user triggers via /<trigger> slash commands. Cross-project, workspace-scoped.';
