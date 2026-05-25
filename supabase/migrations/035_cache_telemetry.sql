-- Migration 035: Prompt cache telemetry on agent_runs
--
-- After wiring Anthropic prompt caching (R0-1), we need to know whether
-- the cache is actually hitting in production. Without these columns we'd
-- be flying blind on the most important cost optimization in the stack.
--
-- Anthropic's API returns:
--   cache_creation_input_tokens — first-time tokens written into the cache
--                                  (charged at 1.25× normal input price)
--   cache_read_input_tokens     — tokens served from cache (10% of normal price)
--
-- Cache hit rate = cache_read / (cache_read + cache_creation + cached_eligible_input)
-- Aim for >70% on warm sessions.

alter table public.agent_runs
  add column if not exists cache_creation_input_tokens int default 0,
  add column if not exists cache_read_input_tokens     int default 0;

comment on column public.agent_runs.cache_creation_input_tokens is
  'Anthropic prompt-cache write tokens (charged 1.25× normal). High on cold turns.';
comment on column public.agent_runs.cache_read_input_tokens is
  'Anthropic prompt-cache read tokens (charged 0.1× normal). Should dominate on warm sessions.';
