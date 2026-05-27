-- Migration 040: Knowledge doc chunks (RAG-lite)
--
-- For now we use ILIKE search (no embeddings yet). pgvector + embeddings is
-- the next step; this schema is already vector-ready (just add an embedding
-- column later and a separate index).
--
-- Each `knowledge_doc` (already exists, migration 033) is split into chunks
-- of ~500 chars at paragraph/sentence boundaries. At chat time we ILIKE the
-- user's prompt against chunk_text and inject top-K matches into context.

create table if not exists public.knowledge_doc_chunks (
  id           uuid primary key default gen_random_uuid(),
  doc_id       uuid references public.knowledge_docs(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  project_id   uuid references public.projects(id) on delete cascade,  -- nullable: user-global docs
  chunk_index  int not null,
  chunk_text   text not null,
  -- char range in the original doc for citation
  char_start   int not null,
  char_end     int not null,
  -- Future: pgvector embedding column
  -- embedding  vector(1536),
  created_at   timestamptz not null default now(),
  unique (doc_id, chunk_index)
);

create index if not exists idx_chunks_doc      on public.knowledge_doc_chunks(doc_id);
create index if not exists idx_chunks_user     on public.knowledge_doc_chunks(user_id);
create index if not exists idx_chunks_project  on public.knowledge_doc_chunks(project_id);
-- Trigram GIN index for fast ILIKE matching (pg_trgm should be enabled).
-- If not enabled in user DB, falls back to seq scan — still works.
create extension if not exists pg_trgm;
create index if not exists idx_chunks_trgm
  on public.knowledge_doc_chunks using gin (chunk_text gin_trgm_ops);

alter table public.knowledge_doc_chunks enable row level security;
create policy "users own their knowledge chunks"
  on public.knowledge_doc_chunks for all using (auth.uid() = user_id);

comment on table public.knowledge_doc_chunks is
  'Pre-chunked text from knowledge_docs for RAG retrieval. ILIKE-based today, pgvector-ready.';
