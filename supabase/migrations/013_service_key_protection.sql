-- 013_service_key_protection.sql
-- Fixes P0-2: profiles.supabase_service_key holds the SERVICE-ROLE key for each
-- user's auto-provisioned Supabase project. After 011 the row owner can
-- `select supabase_service_key from profiles` (the `for select` policy allows
-- reading the owner's own row), which would hand the user full admin/RLS-bypass
-- access to their generated project's database.
--
-- Fix: move the secret into a dedicated table with RLS enabled and NO policies,
-- so every non-service-role caller is denied (service role bypasses RLS).

create table if not exists public.user_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  supabase_service_key text,
  created_at timestamptz default now()
);

alter table public.user_secrets enable row level security;
-- Intentionally NO policies: RLS with zero policies denies all access to the
-- authenticated/anon roles. Only the service-role key (which bypasses RLS) can
-- read or write this table.

-- Migrate any existing secrets out of profiles.
insert into public.user_secrets (user_id, supabase_service_key)
select id, supabase_service_key
from public.profiles
where supabase_service_key is not null
on conflict (user_id) do nothing;

-- The 003 restrictive SELECT policy referenced profiles broadly; it is no longer
-- needed for secret protection once the column is gone. Drop it to avoid an
-- unnecessary restrictive policy lingering on profiles.
drop policy if exists "service key is private" on public.profiles;

-- Remove the secret from profiles entirely.
alter table public.profiles
  drop column if exists supabase_service_key;

-- CRITICAL: migration 011's guard_profile_privileged_columns() trigger function
-- references new.supabase_service_key / old.supabase_service_key. PL/pgSQL
-- resolves record field references at RUNTIME, so once the column is dropped
-- above, the very next UPDATE on profiles would throw
-- 'record "new" has no field "supabase_service_key"' — breaking ALL profile
-- writes (signup, subscription changes, provisioning status, etc).
-- Recreate the guard function without the now-removed column.
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
    return new; -- trusted server-side write — allow everything
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
  then
    raise exception 'profiles: privileged columns can only be modified server-side (service role)';
  end if;

  return new;
end;
$$ language plpgsql security definer;
