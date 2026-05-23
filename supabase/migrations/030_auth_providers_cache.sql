-- Migration 030: Auth providers cache on project_integrations
--
-- Adds auth_config JSONB to cache the current state of Supabase auth providers
-- so the AuthProvidersPanel can show toggle states without calling the
-- Management API on every render. Updated whenever the user toggles a provider.
--
-- Schema for auth_config:
-- {
--   "email_enabled": true,
--   "google_enabled": false, "google_client_id": "", "google_secret": "",
--   "apple_enabled": false,  "apple_service_id": "", "apple_team_id": "", "apple_key_id": "", "apple_private_key": "",
--   "facebook_enabled": false, "facebook_client_id": "", "facebook_secret": "",
--   "github_enabled": false,  "github_client_id": "", "github_secret": "",
--   "last_synced_at": "2025-01-01T00:00:00Z"
-- }

alter table public.project_integrations
  add column if not exists auth_config jsonb not null default '{}'::jsonb;

comment on column public.project_integrations.auth_config is
  'Cached auth provider state from Supabase Management API. Updated on every toggle.';
