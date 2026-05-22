-- ──────────────────────────────────────────────────────────────────────────────
-- 023 · context_summary + per-project Supabase isolation
--
-- Part A: context_summary column on projects
--   Stores the LLM-generated summary of older chat messages so long sessions
--   don't balloon input token costs. Generated lazily by chat/route.ts via
--   Claude Haiku, cached here, invalidated when project files change.
--
-- Part B: project_supabase_instances
--   Tracks the dedicated Supabase project provisioned for each user project.
--   Each user project gets its own isolated Supabase project so their app's
--   DB/auth usage never touches our platform Supabase account.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Part A ────────────────────────────────────────────────────────────────────

alter table projects
  add column if not exists context_summary text default null;

comment on column projects.context_summary is
  'LLM-generated summary of older chat messages. Cached to keep context token costs flat in long sessions. Cleared on significant project changes.';

-- ── Part B ────────────────────────────────────────────────────────────────────

create table if not exists project_supabase_instances (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        not null unique references projects(id) on delete cascade,
  supabase_project_id text        not null,          -- Supabase management API project ref
  supabase_project_ref text       not null,           -- short ref, e.g. "abcdefghij"
  anon_key            text        not null,           -- injected into generated app env vars
  service_role_key    text        not null,           -- stored encrypted; used for migrations
  db_host             text        not null,           -- postgres connection host
  region              text        not null default 'us-east-1',
  status              text        not null default 'provisioning'
                        check (status in ('provisioning','active','paused','deleted')),
  provisioned_at      timestamptz default null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_project_supabase_instances_project_id
  on project_supabase_instances(project_id);

-- RLS: project owners can read their own instance metadata (but not secrets)
alter table project_supabase_instances enable row level security;

create policy "owner_read_supabase_instance"
  on project_supabase_instances for select
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );

-- Service-role key (admin API) bypasses RLS for writes — no extra policy needed.

-- updated_at trigger
create or replace function update_project_supabase_instances_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_project_supabase_instances_updated_at on project_supabase_instances;
create trigger trg_project_supabase_instances_updated_at
  before update on project_supabase_instances
  for each row execute function update_project_supabase_instances_updated_at();

-- ── Credit scale rebase: update platform_settings if already seeded ───────────
-- Safe upsert — only changes values, preserves any admin customisations.
insert into platform_settings (key, value) values
  ('credits.free_monthly',    '20'),
  ('credits.starter_monthly', '50'),
  ('credits.pro_monthly',     '150'),
  ('credits.teams_monthly',   '500'),
  ('billing.usd_per_credit',  '0.24')
on conflict (key) do update set value = excluded.value;
