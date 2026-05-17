import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMachine } from '@/lib/fly/client'

export async function GET(_req: Request, { params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller owns a project with this machine
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('fly_machine_id', machineId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const machine = await getMachine(machineId)
  return NextResponse.json({ data: { state: machine.state, private_ip: machine.private_ip } })
}
