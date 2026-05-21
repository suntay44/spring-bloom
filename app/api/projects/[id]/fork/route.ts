import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeRateLimit } from '@/lib/rate-limit'
import { createMachine, listFiles, readFileAsBase64, writeFile } from '@/lib/fly/client'

// File copy across two Fly machines can take a while for larger projects.
export const maxDuration = 300

const COPY_CONCURRENCY = 5

async function copyFilesInBatches(
  sourceMachineId: string,
  targetMachineId: string,
  files: string[],
): Promise<void> {
  for (let i = 0; i < files.length; i += COPY_CONCURRENCY) {
    const batch = files.slice(i, i + COPY_CONCURRENCY)
    await Promise.all(batch.map(async (rel) => {
      const absPath = `/app/${rel}`
      // readFileAsBase64 / writeFile both validate their own paths.
      try {
        const b64 = await readFileAsBase64(sourceMachineId, absPath)
        const decoded = Buffer.from(b64, 'base64').toString('utf-8')
        await writeFile(targetMachineId, absPath, decoded)
      } catch (err) {
        // Skip files we can't copy (e.g. unsafe path, binary won't roundtrip cleanly)
        // — fork still succeeds for the rest of the tree.
        console.warn(`[fork] copy failed for ${rel}:`, err)
      }
    }))
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await writeRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id: sourceProjectId } = await params

  // 1. Load source project + brief in parallel, both ownership-checked.
  const [{ data: source }, { data: sourceBrief }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, type, framework, design_style, primary_color, db_schema, backend_mode, fly_machine_id')
      .eq('id', sourceProjectId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('project_briefs')
      .select('initial_prompt, answers')
      .eq('project_id', sourceProjectId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (!source) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // 2. Create the new project row.
  const { data: newProject, error: insertErr } = await supabase
    .from('projects')
    .insert({
      user_id:        user.id,
      name:           `Copy of ${source.name}`,
      type:           source.type,
      framework:      source.framework,
      design_style:   source.design_style,
      primary_color:  source.primary_color,
      db_schema:      source.db_schema,
      backend_mode:   source.backend_mode,
      status:         'draft',
    })
    .select('id')
    .single()

  if (insertErr || !newProject) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  const newProjectId = newProject.id

  // 3. Copy the brief (if there is one).
  if (sourceBrief) {
    await supabase.from('project_briefs').insert({
      project_id:     newProjectId,
      user_id:        user.id,
      initial_prompt: sourceBrief.initial_prompt,
      answers:        sourceBrief.answers ?? {},
    })
  }

  // 4. Copy messages.
  const { data: sourceMessages } = await supabase
    .from('messages')
    .select('role, content, model_id, credits_used, created_at')
    .eq('project_id', sourceProjectId)
    .order('created_at', { ascending: true })

  if (sourceMessages && sourceMessages.length > 0) {
    const toInsert = sourceMessages.map((m) => ({
      project_id:   newProjectId,
      role:         m.role,
      content:      m.content,
      model_id:     m.model_id,
      credits_used: m.credits_used ?? 0,
      created_at:   m.created_at,
    }))
    // Insert in chunks to stay well under PostgREST request limits.
    const CHUNK = 100
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await supabase.from('messages').insert(toInsert.slice(i, i + CHUNK))
    }
  }

  // 5–7. Provision a fresh Fly machine and copy the source filesystem if there is one.
  let newMachineId: string | null = null
  try {
    const newMachine = await createMachine(newProjectId)
    newMachineId = newMachine.id

    await supabase
      .from('projects')
      .update({ fly_machine_id: newMachine.id })
      .eq('id', newProjectId)
      .eq('user_id', user.id)

    if (source.fly_machine_id) {
      const files = await listFiles(source.fly_machine_id)
      await copyFilesInBatches(source.fly_machine_id, newMachine.id, files)
    }
  } catch (err) {
    // Fork is best-effort on the machine side — the project row still exists
    // and the user can re-provision later. Log so we can chase down systemic issues.
    console.error('[fork] machine provision / file copy failed:', err)
  }

  return NextResponse.json({ projectId: newProjectId, machineId: newMachineId }, { status: 201 })
}
