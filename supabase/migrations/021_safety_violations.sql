-- Migration 021: Content safety violation log
-- Service-role only — populated by the chat route when prompts hit the
-- BLOCK_PATTERNS in lib/safety/content-check.ts.

create table public.content_safety_violations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  project_id      uuid references public.projects(id) on delete set null,
  prompt_snippet  text not null,
  matched_pattern text not null,
  severity        text not null default 'block' check (severity in ('warn','block')),
  created_at      timestamptz default now()
);

create index content_safety_violations_user_id_idx
  on public.content_safety_violations(user_id);

alter table public.content_safety_violations enable row level security;
-- No policies — service-role only (admin-readable).
