-- Migration 034: Custom Domains via Cloudflare for SaaS
--
-- Stores user-attached domains for published projects. Uses Cloudflare's
-- Custom Hostnames API — free SSL provisioning, automatic cert renewal,
-- no per-hostname fee.
--
-- DNS state machine:  pending → verifying → active → failed
-- SSL state machine:  pending → validating → active → failed
--
-- A project can have multiple domains (apex + subdomains + redirects).
-- One per project can be marked is_primary for the canonical URL.

create table if not exists public.custom_domains (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid references public.projects(id) on delete cascade not null,
  user_id                  uuid references auth.users(id) on delete cascade not null,
  hostname                 text not null,
  -- Cloudflare Custom Hostname resource id (set after CF API create)
  cf_custom_hostname_id    text,
  -- Cloudflare verification record values — surfaced to the user verbatim
  verification_record_type text default 'TXT',
  verification_record_name text,
  verification_record_value text,
  -- DNS / SSL status, kept in sync from CF polls
  dns_status               text not null default 'pending'
    check (dns_status in ('pending', 'verifying', 'active', 'failed')),
  ssl_status               text not null default 'pending'
    check (ssl_status in ('pending', 'validating', 'active', 'failed')),
  last_status_message      text,
  is_primary               boolean not null default false,
  last_checked_at          timestamptz,
  created_at               timestamptz not null default now(),
  unique (project_id, hostname)
);

create index if not exists idx_custom_domains_project on public.custom_domains(project_id);
create index if not exists idx_custom_domains_user    on public.custom_domains(user_id);

alter table public.custom_domains enable row level security;
create policy "users own their custom domains"
  on public.custom_domains for all using (auth.uid() = user_id);

-- Only one primary per project (enforced via partial unique index)
create unique index if not exists idx_custom_domains_one_primary
  on public.custom_domains(project_id)
  where is_primary = true;

comment on table  public.custom_domains is 'Per-project custom domains backed by Cloudflare Custom Hostnames API.';
comment on column public.custom_domains.is_primary is 'Canonical URL — only one per project (partial unique index enforces).';
