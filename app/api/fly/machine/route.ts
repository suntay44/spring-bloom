import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createMachine, startMachine, getMachine, execOnMachine } from '@/lib/fly/client'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('supabase_project_url, supabase_anon_key')
        .eq('id', user.id)
        .single()

      if (profile?.supabase_project_url && profile?.supabase_anon_key) {
        await execOnMachine(machine.id, [
          'sh', '-c',
          'printf "NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$1" "$2" >> /app/.env.local',
          '--',
          profile.supabase_project_url,
          profile.supabase_anon_key,
        ])
      }
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

  return NextResponse.json({ data: machine }, { status: 201 })
}
