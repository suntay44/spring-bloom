-- Migration 031: Security Scans
--
-- Stores results of automated security scans run against user projects.
-- Scans come in two flavors:
--   - 'quick'    → static-only: RLS analysis + dependency audit (free, ~5s, no AI)
--   - 'in_depth' → quick + AI code review (Claude Haiku, ~30s, ~1 credit)
--
-- Each scan run produces 0..N findings. Findings remember their source
-- (which scanner generated them) so the UI can group/filter accordingly.

-- ── Scans table ──────────────────────────────────────────────────────────────

create table if not exists public.security_scans (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  scan_type     text not null check (scan_type in ('quick', 'in_depth')),
  status        text not null check (status in ('running', 'completed', 'failed')) default 'running',
  -- Snapshot of project state at scan time so we can detect "out of date"
  source_hash   text,
  -- Aggregate counts (denormalized for fast UI rendering)
  findings_count int not null default 0,
  critical_count int not null default 0,
  high_count     int not null default 0,
  medium_count   int not null default 0,
  low_count      int not null default 0,
  error_message  text,
  duration_ms    int,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists idx_security_scans_project on public.security_scans(project_id, created_at desc);

alter table public.security_scans enable row level security;
create policy "users own their security scans"
  on public.security_scans for all using (auth.uid() = user_id);

-- ── Findings table ───────────────────────────────────────────────────────────

create table if not exists public.security_findings (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid references public.security_scans(id) on delete cascade not null,
  project_id    uuid references public.projects(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  -- Which scanner produced this finding
  scanner       text not null check (scanner in ('rls', 'database', 'dependency', 'code_review')),
  severity      text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  category      text not null,            -- e.g. 'rls' | 'secrets' | 'validation' | 'auth' | 'cors' | 'dependency' | 'env'
  title         text not null,
  description   text,
  -- Location (optional — dependency findings won't have file/line)
  file_path     text,
  line          int,
  -- Remediation hint (markdown allowed)
  recommendation text,
  -- For dependency findings: package name + CVE/GHSA id + advisory URL
  package_name  text,
  advisory_id   text,
  advisory_url  text,
  -- Accepted-risk flag (user dismissed this finding as a known/expected risk)
  accepted_risk boolean not null default false,
  accepted_at   timestamptz,
  accepted_note text,
  blocks_deploy boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_findings_scan on public.security_findings(scan_id);
create index if not exists idx_findings_project_severity on public.security_findings(project_id, severity)
  where accepted_risk = false;

alter table public.security_findings enable row level security;
create policy "users own their security findings"
  on public.security_findings for all using (auth.uid() = user_id);

-- ── Comments for clarity ────────────────────────────────────────────────────

comment on table  public.security_scans     is 'One row per scan run. Stores aggregate counts; details live in security_findings.';
comment on table  public.security_findings  is 'Individual vulnerability records produced by a scan. Severity drives UI badges.';
comment on column public.security_findings.scanner       is 'rls | database | dependency | code_review';
comment on column public.security_findings.accepted_risk is 'User explicitly dismissed this finding. Hide from default views but keep in DB for audit.';
