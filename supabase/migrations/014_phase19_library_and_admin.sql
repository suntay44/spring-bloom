-- 014_phase19_library_and_admin.sql
-- Phase 19: Generation Intelligence Layer + Phase 20 admin prerequisites
--
-- New tables (creation order respects FK dependencies):
--   platform_settings     — internal key/value config for 3rd-party services
--   template_clusters     — groups of builds sharing the same fingerprint pattern
--   scaffold_templates    — promoted canonical templates (Books)
--   scaffold_modules      — proven micro-modules (Chapters)
--   app_builds            — structural fingerprint per AI generation (refs template_clusters)
--
-- profiles changes:
--   + is_admin boolean (service-role-only write, guarded by trigger)
--
-- All new tables: RLS enabled. Service-role-only write on all of them.

-- ── profiles: add is_admin ───────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Recreate guard trigger to include is_admin as a privileged column.
create or replace function public.guard_profile_privileged_columns()
returns trigger as $$
declare
  jwt_role text;
begin
  begin
    jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    jwt_role := null;
  end;

  if jwt_role = 'service_role' or auth.role() = 'service_role' then
    return new;
  end if;

  if new.plan                     is distinct from old.plan
     or new.subscription_id       is distinct from old.subscription_id
     or new.subscription_status   is distinct from old.subscription_status
     or new.plan_period_end       is distinct from old.plan_period_end
     or new.stripe_customer_id    is distinct from old.stripe_customer_id
     or new.supabase_project_ref  is distinct from old.supabase_project_ref
     or new.supabase_project_url  is distinct from old.supabase_project_url
     or new.supabase_anon_key     is distinct from old.supabase_anon_key
     or new.supabase_status       is distinct from old.supabase_status
     or new.is_admin              is distinct from old.is_admin
  then
    raise exception 'profiles: privileged columns can only be modified server-side (service role)';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ── platform_settings ────────────────────────────────────────────────────────
create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);
alter table public.platform_settings enable row level security;
-- Intentionally NO policies — service-role only.

insert into public.platform_settings (key, value) values
  ('ai.default_model_free',      '"claude-haiku-4-5"'),
  ('ai.default_model_starter',   '"claude-sonnet-4-5"'),
  ('ai.default_model_pro',       '"claude-sonnet-4-5"'),
  ('ai.default_model_teams',     '"claude-opus-4-5"'),
  ('ai.max_tokens_per_request',  '8192'),
  ('rate_limit.free_rpm',        '5'),
  ('rate_limit.starter_rpm',     '10'),
  ('rate_limit.pro_rpm',         '20'),
  ('rate_limit.teams_rpm',       '60'),
  ('credits.monthly_free',       '10'),
  ('credits.monthly_starter',    '100'),
  ('credits.monthly_pro',        '175'),
  ('credits.monthly_teams',      '500')
on conflict (key) do nothing;

-- ── template_clusters ────────────────────────────────────────────────────────
-- Must be created before app_builds (FK dependency).
create table if not exists public.template_clusters (
  id                  uuid primary key default gen_random_uuid(),
  fingerprint         jsonb not null default '{}',
  build_count         integer not null default 0,
  distinct_app_types  integer not null default 0,
  avg_success_score   numeric(5,2) not null default 0,
  status              text not null default 'candidate'
    check (status in ('candidate', 'canonical', 'deprecated')),
  promoted_at         timestamptz,
  promoted_by         uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table public.template_clusters enable row level security;
-- No user-facing policies.

-- ── scaffold_templates ───────────────────────────────────────────────────────
create table if not exists public.scaffold_templates (
  id            uuid primary key default gen_random_uuid(),
  cluster_id    uuid references public.template_clusters(id) on delete set null,
  name          text not null,
  description   text,
  category      text not null,
  tags          text[] not null default '{}',
  scaffold      jsonb not null default '{}',
  version       integer not null default 1,
  times_used    integer not null default 0,
  last_used_at  timestamptz,
  status        text not null default 'active'
    check (status in ('active', 'deprecated')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.scaffold_templates enable row level security;
-- No user-facing policies.

-- ── scaffold_modules ─────────────────────────────────────────────────────────
create table if not exists public.scaffold_modules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  module_type     text not null,
  description     text,
  tags            text[] not null default '{}',
  scaffold        jsonb not null default '{}',
  version         integer not null default 1,
  times_used      integer not null default 0,
  success_rate    numeric(5,2) not null default 0,
  source          text not null default 'extracted'
    check (source in ('extracted', 'handwritten')),
  status          text not null default 'active'
    check (status in ('active', 'deprecated')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.scaffold_modules enable row level security;
-- No user-facing policies.

-- Seed the Auth module (the one hand-written exception)
insert into public.scaffold_modules (
  name, module_type, description, tags, scaffold, source, status
) values (
  'Auth',
  'auth',
  'Supabase authentication — sign up, sign in, sign out, session handling, protected routes',
  array['auth', 'supabase', 'session', 'protected-routes'],
  '{
    "files": ["lib/supabase/client.ts", "lib/supabase/server.ts", "middleware.ts", "app/(auth)/login/page.tsx", "app/(auth)/signup/page.tsx"],
    "patterns": ["supabase-ssr", "protected-routes", "server-component-auth"],
    "imports": ["@supabase/supabase-js", "@supabase/ssr"],
    "state": "supabase-session"
  }',
  'handwritten',
  'active'
) on conflict do nothing;

-- ── app_builds ───────────────────────────────────────────────────────────────
-- Created after template_clusters to satisfy FK constraint.
create table if not exists public.app_builds (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.projects(id) on delete cascade not null,
  agent_run_id     uuid references public.agent_runs(id) on delete set null,
  user_id          uuid references auth.users(id) on delete cascade not null,
  fingerprint      jsonb not null default '{}',
  success_score    integer not null default 0
    check (success_score >= 0 and success_score <= 100),
  user_continued   boolean not null default false,
  was_published    boolean not null default false,
  edits_after      integer not null default 0,
  cluster_id       uuid references public.template_clusters(id) on delete set null,
  created_at       timestamptz default now()
);
alter table public.app_builds enable row level security;
create policy "users read their builds"
  on public.app_builds for select using (auth.uid() = user_id);
-- No insert/update policies — service-role only.

create index if not exists app_builds_user_id_idx    on public.app_builds(user_id);
create index if not exists app_builds_cluster_id_idx on public.app_builds(cluster_id);
create index if not exists app_builds_created_at_idx on public.app_builds(created_at desc);
