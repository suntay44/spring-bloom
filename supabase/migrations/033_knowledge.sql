-- Migration 033: Knowledge — three-tier file-first context system
--
-- Unlike Lovable's 10k-char textareas, SpringBloom stores knowledge
-- in real files (AGENTS.md in the project repo) so it ships with the code
-- and is portable to Cursor, Claude Code, Copilot, etc.
--
-- Three tiers (project tier lives in the repo, not the DB):
--
--   1. user_knowledge      → DB table, applies to every project the user creates
--                            (preferred stack, lint rules, banned libraries)
--   2. project AGENTS.md   → file in the project repo, single source of truth
--                            (read by builder on every turn, version-controlled)
--   3. reference docs      → RAG candidates, attached files/URLs chunked into
--                            knowledge_chunks (pgvector). Built later.
--
-- This migration sets up tiers 1 and 3 (the table-based ones).

-- ── User-level knowledge ────────────────────────────────────────────────────

create table if not exists public.user_knowledge (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null unique,
  -- Free-form markdown — preferences that apply to every project
  -- (preferred stack, lint rules, banned libraries, comment style)
  content        text not null default '',
  -- Token budget hint — caller can use this to truncate before injection
  max_tokens     int  not null default 1500,
  updated_at     timestamptz not null default now()
);

alter table public.user_knowledge enable row level security;
create policy "users own their knowledge"
  on public.user_knowledge for all using (auth.uid() = user_id);

-- ── Reference docs (for future RAG) ─────────────────────────────────────────
-- Stores user-attached docs (OpenAPI specs, READMEs, design briefs).
-- Chunks live in a separate table so we can swap embedding providers.

create table if not exists public.knowledge_docs (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references public.projects(id) on delete cascade,  -- null = user-global
  user_id        uuid references auth.users(id) on delete cascade not null,
  source_type    text not null check (source_type in ('upload', 'url', 'github', 'openapi', 'readme')),
  source_url     text,
  filename       text,
  content        text not null,                  -- raw text
  byte_size      int  not null default 0,
  -- Set when chunks have been generated + embedded
  indexed_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_knowledge_docs_project on public.knowledge_docs(project_id);
create index if not exists idx_knowledge_docs_user    on public.knowledge_docs(user_id);

alter table public.knowledge_docs enable row level security;
create policy "users own their knowledge docs"
  on public.knowledge_docs for all using (auth.uid() = user_id);

-- knowledge_chunks (pgvector) table comes in a follow-up migration once
-- vector extension setup is finalized.

comment on table public.user_knowledge is
  'Per-user always-injected context (file-first equivalent: ~/.springbloom/AGENTS.md). Project AGENTS.md overrides this.';
comment on table public.knowledge_docs is
  'Reference docs attached by user. Will be chunked + embedded for RAG retrieval per turn.';
