alter table public.projects
  add column if not exists fly_machine_id text,
  add column if not exists fly_machine_status text default 'stopped'
    check (fly_machine_status in ('created','starting','started','stopping','stopped','destroying','destroyed'));
