alter table public.profiles
  add column if not exists supabase_project_ref  text,
  add column if not exists supabase_project_url  text,
  add column if not exists supabase_anon_key     text,
  add column if not exists supabase_service_key  text,
  add column if not exists supabase_status       text default 'none'
    check (supabase_status in ('none', 'provisioning', 'ready', 'error'));

-- Revoke anon access to the service key column — only service role can read it
create policy "service key is private" on public.profiles
  as restrictive
  for select
  using (auth.uid() = id);
