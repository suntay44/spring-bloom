-- Migration 016: Per-project integrations + secrets
--
-- Two-table design mirrors the profiles / user_secrets pattern:
--   project_integrations — public metadata (type, status, non-secret config)
--                          normal user-owned RLS, readable by the project owner
--   project_secrets      — actual credentials (secret keys, tokens)
--                          RLS enabled with ZERO policies → only service-role
--                          can read/write (same guarantee as user_secrets)

-- ────────────────────────────────────────────────────────────────
-- 1.  project_integrations  (public / status layer)
-- ────────────────────────────────────────────────────────────────
create table public.project_integrations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects(id) on delete cascade not null,
  type         text not null check (type in (
                 'stripe', 'supabase', 'twilio',
                 'openai', 'anthropic', 'resend', 'env'
               )),
  status       text not null default 'pending'
               check (status in ('pending', 'active', 'sandbox', 'error')),
  -- Non-secret config: mode (test/live), URLs, Account SIDs, publishable keys, etc.
  public_config  jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (project_id, type)
);

alter table public.project_integrations enable row level security;

create policy "users own their project integrations"
  on public.project_integrations for all
  using (
    exists (
      select 1 from public.projects
      where id = project_integrations.project_id
        and user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 2.  project_secrets  (credential layer — service-role only)
-- ────────────────────────────────────────────────────────────────
create table public.project_secrets (
  project_id    uuid references public.projects(id) on delete cascade not null,
  type          text not null check (type in (
                  'stripe', 'supabase', 'twilio',
                  'openai', 'anthropic', 'resend', 'env'
                )),
  -- Stored as jsonb so one row can hold multiple named secrets per integration
  -- e.g. { "secret_key": "sk_...", "webhook_secret": "whsec_..." }
  secret_config jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  primary key (project_id, type)
);

alter table public.project_secrets enable row level security;
-- Intentionally NO policies: RLS with zero policies denies all access to
-- authenticated/anon roles. Only the service-role key (which bypasses RLS)
-- can read or write this table — same as user_secrets.

comment on table public.project_secrets is
  'Per-project API credentials. Zero RLS policies = service-role only. Never expose to clients.';
