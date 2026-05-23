-- Migration 029: Add questions column to project_briefs
--
-- project_briefs was created in migration 001 with: initial_prompt, answers, prd, approved_at.
-- The planning agent now generates structured questions before the first build and stores
-- them here. answers are keyed by question id.
--
-- Also adds a unique constraint on (project_id, user_id) so the brief upsert in
-- /api/projects/[id]/brief works correctly with ON CONFLICT.

-- Add questions column (JSONB array of ScopingQuestion objects)
alter table public.project_briefs
  add column if not exists questions jsonb not null default '[]';

-- Add unique constraint so upsert works
alter table public.project_briefs
  drop constraint if exists project_briefs_project_id_user_id_key;

alter table public.project_briefs
  add constraint project_briefs_project_id_user_id_key
  unique (project_id, user_id);
