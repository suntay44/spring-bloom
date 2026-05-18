alter table public.profiles
  add column if not exists subscription_id text,
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists plan_period_end timestamptz;

-- Idempotent: ensure RLS is enabled on profiles
alter table public.profiles enable row level security;
