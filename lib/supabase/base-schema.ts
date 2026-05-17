// Base schema applied to every user's Supabase project on provisioning.
// Gives AI-generated apps a safe, RLS-enabled foundation to build on.
export const BASE_SCHEMA_SQL = `
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Auth helpers view (safe to expose to generated app)
create or replace view public.users as
  select id, email, created_at from auth.users;
`
