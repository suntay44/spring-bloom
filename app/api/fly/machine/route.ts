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
    } catch (err) {
      // Only create a new machine if the existing one truly doesn't exist (404)
      // For other errors, surface them instead of silently creating a duplicate
      const isNotFound = err instanceof Error &&
        (err.message.includes('404') || err.message.includes('not found') || err.message.includes('Not Found'))

      if (!isNotFound) {
        console.error('[fly/machine] Machine restart failed (non-404):', err)
        return NextResponse.json({ error: 'Machine restart failed. Please try again.' }, { status: 503 })
      }

      console.log('[fly/machine] Machine not found, provisioning new one')
      // fall through to create new machine
    }
  }

  // Provision a new machine
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('supabase_project_url, supabase_anon_key')
      .eq('id', user.id)
      .single()

    const machine = await createMachine(projectId)
    await supabase.from('projects')
      .update({ fly_machine_id: machine.id, fly_machine_status: machine.state })
      .eq('id', projectId)

    if (profile?.supabase_project_url && profile?.supabase_anon_key) {
      await execOnMachine(machine.id, [
        'sh', '-c',
        'printf "NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$1" "$2" >> /app/.env.local',
        '--',
        profile.supabase_project_url,
        profile.supabase_anon_key,
      ])
    }

    return NextResponse.json({ data: machine }, { status: 201 })
  } catch (err) {
    console.error('[fly/machine] Machine creation failed:', err)
    return NextResponse.json({ error: 'Machine provisioning failed' }, { status: 503 })
  }
}
