-- Migration 042: match_knowledge_chunks RPC for vector search.
--
-- Wraps pgvector's <=> cosine-distance operator so PostgREST can call it.
-- Returns chunks with similarity (1 - distance) so higher = more relevant.
--
-- Joined to knowledge_docs to surface filename/source_url for citation in one
-- round trip.

create or replace function public.match_knowledge_chunks (
  query_embedding   vector(1536),
  match_user_id     uuid,
  match_project_id  uuid,
  match_count       int default 8
)
returns table (
  doc_id     uuid,
  chunk_text text,
  char_start int,
  char_end   int,
  filename   text,
  source_url text,
  similarity float
)
language sql stable
security definer
set search_path = public
as $$
  select
    c.doc_id,
    c.chunk_text,
    c.char_start,
    c.char_end,
    d.filename,
    d.source_url,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_doc_chunks c
  join public.knowledge_docs d on d.id = c.doc_id
  where c.user_id = match_user_id
    and (c.project_id = match_project_id or c.project_id is null)
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_knowledge_chunks(vector, uuid, uuid, int)
  to authenticated, service_role;

comment on function public.match_knowledge_chunks is
  'Top-K vector search over knowledge chunks (cosine). Used by /api/chat for RAG.';
