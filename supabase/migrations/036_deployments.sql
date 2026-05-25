-- Migration 036: Deployment history
--
-- Currently `projects` stores a single cloudflare_deployment_id — we overwrite
-- it on every publish, losing history. This table records every publish
-- attempt so we can:
--   - Show a deployment timeline in PublishModal
--   - Roll back to a previous deployment via Cloudflare API
--   - Debug failed publishes (build_log preserved)
--   - Measure publish reliability over time

create table if not exists public.deployments (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid references public.projects(id) on delete cascade not null,
  user_id                uuid references auth.users(id) on delete cascade not null,
  -- Cloudflare resource ids
  cf_project_name        text,
  cf_deployment_id       text,
  published_url          text,
  -- State machine: pending → building → uploading → success | failed | cancelled
  status                 text not null default 'pending'
    check (status in ('pending', 'building', 'uploading', 'success', 'failed', 'cancelled')),
  -- Build artifact metadata
  build_log              text,                   -- captured stdout/stderr (truncated to ~64KB)
  build_duration_ms      int,
  bundle_size_bytes      bigint,
  file_count             int,
  -- Failure info
  error_message          text,
  -- Promotion (preview vs production split — future use)
  is_production          boolean not null default true,
  rolled_back_at         timestamptz,
  created_at             timestamptz not null default now(),
  completed_at           timestamptz
);

create index if not exists idx_deployments_project on public.deployments(project_id, created_at desc);
create index if not exists idx_deployments_user on public.deployments(user_id);

alter table public.deployments enable row level security;
create policy "users own their deployments"
  on public.deployments for all using (auth.uid() = user_id);

comment on table  public.deployments is
  'One row per publish attempt. Replaces the single fly_machine fields on projects (those stay for current-live convenience).';
comment on column public.deployments.build_log is
  'Captured npm run build stdout/stderr. Truncated to ~64KB to keep rows small.';
comment on column public.deployments.is_production is
  'False for preview branches (future). True for primary production deployments.';
