-- Migration 041: pgvector + embeddings on knowledge_doc_chunks
--
-- Upgrades RAG-lite (R4-5) from ILIKE keyword search to true semantic
-- similarity. ILIKE remains as a fallback for chunks without embeddings
-- (graceful degradation during backfill).
--
-- Model: OpenAI text-embedding-3-small (1536 dims, $0.02/1M tokens — cheap).
-- Index: HNSW (vs IVFFlat — better recall + no training needed).

create extension if not exists vector;

alter table public.knowledge_doc_chunks
  add column if not exists embedding vector(1536);

-- HNSW index for fast cosine similarity. m=16, ef_construction=64 are sane
-- defaults — good recall, modest build time. We use cosine because OpenAI
-- embeddings are normalized so cosine = inner product = euclidean ordering.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_chunks_embedding'
  ) then
    create index idx_chunks_embedding
      on public.knowledge_doc_chunks
      using hnsw (embedding vector_cosine_ops);
  end if;
end$$;

comment on column public.knowledge_doc_chunks.embedding is
  'OpenAI text-embedding-3-small (1536 dims). NULL = not yet embedded; falls back to ILIKE.';
