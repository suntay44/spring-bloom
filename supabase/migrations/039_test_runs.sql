-- Migration 039: Test runs history
--
-- One row per "run tests" invocation against a user's project. Stores full
-- stdout/stderr so devs can debug failures without re-running.

create table if not exists public.test_runs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  framework       text not null default 'unknown'
    check (framework in ('vitest', 'jest', 'playwright', 'bun', 'mocha', 'unknown')),
  command         text not null,
  status          text not null default 'running'
    check (status in ('running', 'passed', 'failed', 'cancelled', 'error')),
  -- Stats parsed from output (best-effort)
  passed_count    int default 0,
  failed_count    int default 0,
  skipped_count   int default 0,
  duration_ms     int,
  -- Full output, capped to keep rows small
  stdout          text,
  stderr          text,
  exit_code       int,
  -- Optional: commit SHA at time of run for per-commit history
  commit_sha      text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_test_runs_project on public.test_runs(project_id, created_at desc);

alter table public.test_runs enable row level security;
create policy "users own their test runs"
  on public.test_runs for all using (auth.uid() = user_id);

comment on table public.test_runs is
  'History of npm test / npx playwright runs against a project. Full stdout/stderr stored.';
