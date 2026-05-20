-- Migration 017: Per-app Stripe sandbox state
--
-- Tracks whether a project is running on platform-owned test keys (sandbox)
-- or has claimed its own Stripe account (live). Zero RLS policies means only
-- the service-role key can touch this table — same guarantee as user_secrets
-- and project_secrets.

create table public.app_stripe_sandboxes (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid references public.projects(id) on delete cascade not null unique,
  -- 'sandbox' = platform test keys injected; 'live' = user's own keys via Connect
  mode                    text not null default 'sandbox'
                          check (mode in ('sandbox', 'live')),
  -- Stripe Connect account ID — set when user completes OAuth ("Go Live")
  stripe_account_id       text,
  -- Ephemeral CSRF state token generated when we kick off the OAuth flow
  oauth_state             text,
  -- When sandbox keys were first injected into the Fly machine
  sandbox_provisioned_at  timestamptz,
  -- When user completed Connect OAuth and live keys were injected
  claimed_at              timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.app_stripe_sandboxes enable row level security;
-- Intentionally NO policies: service-role only (bypasses RLS).
-- Never expose raw Stripe keys to the browser.

comment on table public.app_stripe_sandboxes is
  'Per-project Stripe sandbox state. Zero RLS policies = service-role only. Never expose to clients.';
