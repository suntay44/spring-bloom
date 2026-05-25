import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createMachine, startMachine, getMachine, execOnMachine } from '@/lib/fly/client'
import { machineRateLimit } from '@/lib/rate-limit'
import { bootstrapProjectKnowledge } from '@/lib/knowledge/bootstrap'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Inject the user's Supabase env vars into the machine's /app/.env.local.
// Swallows failures loosely so a bad injection doesn't break machine lifecycle.
async function injectSupabaseEnv(
  machineId: string,
  supabase: SupabaseServerClient,
  userId: string
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('supabase_project_url, supabase_anon_key')
    .eq('id', userId)
    .single()

  if (profile?.supabase_project_url && profile?.supabase_anon_key) {
    await execOnMachine(machineId, [
      'sh', '-c',
      'printf "NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$1" "$2" >> /app/.env.local',
      '--',
      profile.supabase_project_url,
      profile.supabase_anon_key,
    ])
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit BEFORE any Fly API call — machine provisioning is expensive
  const { success } = await machineRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many machine requests. Please slow down.' }, { status: 429 })
  }

  const { projectId } = await req.json() as { projectId: string }
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Verify user owns this project
  const { data: project } = await supabase
    .from('projects')
    .select('id, fly_machine_id, fly_machine_status')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // If machine already exists, start it and return
  if (project.fly_machine_id) {
    try {
      await startMachine(project.fly_machine_id)
      const machine = await getMachine(project.fly_machine_id)
      // Inject user's Supabase env vars into machine
      await injectSupabaseEnv(machine.id, supabase, user.id)
      await supabase.from('projects').update({ fly_machine_status: machine.state }).eq('id', projectId)
      return NextResponse.json({ data: machine })
    } catch {
      // Machine might be deleted — fall through to create a new one
    }
  }

  // Provision a new machine
  const machine = await createMachine(projectId)
  await supabase.from('projects')
    .update({ fly_machine_id: machine.id, fly_machine_status: machine.state })
    .eq('id', projectId)

  // Inject user's Supabase env vars into the freshly created machine.
  // Ensure it's started (mirror the existing-machine branch's readiness
  // approach) before exec. Swallow failures so creation still succeeds.
  try {
    await startMachine(machine.id)
    await getMachine(machine.id)
    await injectSupabaseEnv(machine.id, supabase, user.id)
    // G2: bootstrap AGENTS.md so the builder + Cursor/Claude Code see project
    // conventions from turn 1. Best-effort, won't fail machine creation.
    await bootstrapProjectKnowledge(supabase, machine.id, projectId)
  } catch {
    // Injection is best-effort — don't fail machine creation
  }

  return NextResponse.json({ data: machine }, { status: 201 })
}
