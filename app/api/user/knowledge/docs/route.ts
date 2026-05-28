/**
 * GET  /api/user/knowledge/docs?project_id=...
 *   Returns user's reference docs (optionally filtered to a project).
 *
 * POST /api/user/knowledge/docs
 *   Body: { source_type, filename?, source_url?, content, project_id? }
 *   Creates a doc + chunks it. Returns { doc, chunk_count }.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/knowledge/chunker'
import { embedBatch, vectorLiteral } from '@/lib/knowledge/embeddings'

const MAX_DOC_BYTES = 1_000_000  // 1 MB raw text — anything larger should be RAG'd elsewhere

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('project_id')

  let q = supabase
    .from('knowledge_docs')
    .select('id, project_id, source_type, source_url, filename, byte_size, indexed_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (projectId) q = q.or(`project_id.eq.${projectId},project_id.is.null`)

  const { data } = await q
  return NextResponse.json({ docs: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    source_type?: 'upload' | 'url' | 'github' | 'openapi' | 'readme'
    filename?:    string
    source_url?:  string
    content?:     string
    project_id?:  string | null
  }

  const type = body.source_type ?? 'upload'
  const content = (body.content ?? '').slice(0, MAX_DOC_BYTES)
  if (!content.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  // If project_id provided, verify ownership
  if (body.project_id) {
    const { data: project } = await supabase
      .from('projects').select('id').eq('id', body.project_id).eq('user_id', user.id).maybeSingle()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Create the doc row
  const { data: doc, error: docErr } = await supabase
    .from('knowledge_docs')
    .insert({
      user_id:     user.id,
      project_id:  body.project_id ?? null,
      source_type: type,
      source_url:  body.source_url ?? null,
      filename:    body.filename ?? null,
      content,
      byte_size:   Buffer.byteLength(content, 'utf8'),
    })
    .select('id').single()
  if (docErr || !doc) {
    return NextResponse.json({ error: docErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Chunk + embed + insert chunks
  const chunks = chunkText(content)
  let embeddedCount = 0
  if (chunks.length > 0) {
    // R5-2: embed in parallel, gracefully degrade to no-embedding if it fails
    const embeddings = await embedBatch(chunks.map((c) => c.chunk_text))
    embeddedCount = embeddings.filter((e) => e !== null).length

    const rows = chunks.map((c, i) => {
      const emb = embeddings[i]
      return {
        doc_id:      (doc as { id: string }).id,
        user_id:     user.id,
        project_id:  body.project_id ?? null,
        chunk_index: c.chunk_index,
        chunk_text:  c.chunk_text,
        char_start:  c.char_start,
        char_end:    c.char_end,
        embedding:   emb ? vectorLiteral(emb.vector) : null,
      }
    })
    // Batch insert (Postgres handles thousands; doc size already capped)
    const { error: chunkErr } = await supabase.from('knowledge_doc_chunks').insert(rows)
    if (chunkErr) {
      // Roll back the doc on chunk failure to avoid orphans
      await supabase.from('knowledge_docs').delete().eq('id', (doc as { id: string }).id)
      return NextResponse.json({ error: chunkErr.message }, { status: 500 })
    }
  }

  await supabase
    .from('knowledge_docs')
    .update({ indexed_at: new Date().toISOString() })
    .eq('id', (doc as { id: string }).id)

  return NextResponse.json({
    doc_id:        (doc as { id: string }).id,
    chunk_count:   chunks.length,
    embedded_count: embeddedCount,
  })
}
