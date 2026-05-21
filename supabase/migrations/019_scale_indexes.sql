-- Migration 019: Scale indexes for hot read paths
-- These speed up the most common queries as project / agent_run / credit history grows.

create index if not exists messages_project_id_created_at_idx
  on public.messages(project_id, created_at);

create index if not exists agent_runs_project_id_idx
  on public.agent_runs(project_id);

create index if not exists agent_runs_user_id_idx
  on public.agent_runs(user_id);

-- agent_runs has no created_at column; started_at serves the same purpose.
create index if not exists agent_runs_status_started_at_desc_idx
  on public.agent_runs(status, started_at desc);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions(user_id);
