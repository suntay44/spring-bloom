-- Migration 015: Add error tracking columns to agent_runs
-- Lets the admin debug page categorize failures and filter out credit exhaustion.
-- Credit exhaustion (402) is rejected before a run is created, so it won't
-- normally appear here — but we include it as a possible reason for future paths.

alter table public.agent_runs
  add column if not exists error_message text,
  add column if not exists failure_reason text
    check (failure_reason in (
      'stream_error',
      'finalize_error',
      'provider_error',
      'credit_exhausted',
      'rate_limited',
      'timeout',
      'unknown'
    ));

comment on column public.agent_runs.error_message   is 'Human-readable error detail for failed runs';
comment on column public.agent_runs.failure_reason  is 'Categorized failure type for admin filtering';
