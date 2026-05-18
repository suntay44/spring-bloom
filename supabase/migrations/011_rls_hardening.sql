-- 011_rls_hardening.sql
-- Fixes P0-1: authenticated users could self-grant credits and upgrade their own plan.
--
-- Root cause: the `for all` policies on credit_transactions and profiles had no
-- `with check`, so a user holding their anon JWT could INSERT/UPDATE arbitrary rows
-- they "own" (auth.uid() = user_id / id). All legitimate writes to these tables
-- happen server-side via the service-role key, which bypasses RLS entirely — so
-- authenticated users never need write access here.

-- ──────────────────────────────────────────────────────────────────────────
-- credit_transactions: SELECT-only for authenticated users.
-- Dropping the `for all` policy and adding a `for select` policy means there is
-- NO insert/update/delete policy for the `authenticated`/`anon` roles, so RLS
-- denies all writes. The service role bypasses RLS, so server-side credit
-- grants/holds/deducts continue to work. This fully closes self-granting.
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists "users own their transactions" on public.credit_transactions;

drop policy if exists "users read their transactions" on public.credit_transactions;
create policy "users read their transactions"
  on public.credit_transactions
  for select
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- profiles: SELECT own row + UPDATE own row, but privileged columns are locked
-- down by a BEFORE UPDATE trigger. The `with check` keeps the row owned by the
-- same user; the trigger blocks privileged-column tampering even when the row
-- still belongs to the caller.
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists "users own their profile" on public.profiles;

drop policy if exists "users read their profile" on public.profiles;
create policy "users read their profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "users update their profile" on public.profiles;
create policy "users update their profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Guard trigger: reject any change to a privileged column unless the caller is
-- the service role. The service role bypasses RLS but the trigger still fires,
-- so we explicitly detect & allow it here.
create or replace function public.guard_profile_privileged_columns()
returns trigger as $$
declare
  jwt_role text;
begin
  -- Robustly resolve the caller role. If the JWT claim is missing/null,
  -- jwt_role stays null and we treat the caller as NON-privileged (block).
  begin
    jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    jwt_role := null;
  end;

  if jwt_role = 'service_role' or auth.role() = 'service_role' then
    return new; -- trusted server-side write — allow everything
  end if;

  -- Non-service-role caller: forbid any change to privileged columns.
  -- IS DISTINCT FROM handles NULLs (NULL -> value and value -> NULL both caught).
  if new.plan                     is distinct from old.plan
     or new.subscription_id       is distinct from old.subscription_id
     or new.subscription_status   is distinct from old.subscription_status
     or new.plan_period_end       is distinct from old.plan_period_end
     or new.stripe_customer_id    is distinct from old.stripe_customer_id
     or new.supabase_project_ref  is distinct from old.supabase_project_ref
     or new.supabase_project_url  is distinct from old.supabase_project_url
     or new.supabase_anon_key     is distinct from old.supabase_anon_key
     or new.supabase_service_key  is distinct from old.supabase_service_key
     or new.supabase_status       is distinct from old.supabase_status
  then
    raise exception 'profiles: privileged columns can only be modified server-side (service role)';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_profile_privileged_columns on public.profiles;
create trigger guard_profile_privileged_columns
  before update on public.profiles
  for each row execute procedure public.guard_profile_privileged_columns();
