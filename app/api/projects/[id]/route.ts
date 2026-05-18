import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { stopMachine } from '@/lib/fly/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function PATCH() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Load the project and verify ownership
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, user_id, fly_machine_id')
    .eq('id', id)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Best-effort: stop + destroy the Fly machine if one was provisioned
  if (project.fly_machine_id) {
    try {
      await stopMachine(project.fly_machine_id)
    } catch (err) {
      // Non-fatal — machine may already be stopped or not exist
      console.warn(`[project delete] Failed to stop Fly machine ${project.fly_machine_id}:`, err)
    }

    try {
      const FLY_API_BASE = 'https://api.machines.dev/v1'
      const res = await fetch(
        `${FLY_API_BASE}/apps/${process.env.FLY_APP_NAME}/machines/${project.fly_machine_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.FLY_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )
      if (!res.ok) {
        console.warn(`[project delete] Fly DELETE machine returned ${res.status}`)
      }
    } catch (err) {
      // Non-fatal — continue with DB delete regardless
      console.warn(`[project delete] Failed to delete Fly machine ${project.fly_machine_id}:`, err)
    }
  }

  // Delete the project row — cascades to messages, agent_runs, etc.
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // belt-and-suspenders ownership check

  if (deleteError) {
    console.error('[project delete] DB delete failed:', deleteError)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
