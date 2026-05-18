import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { execOnMachine } from '@/lib/fly/client'
import { machineRateLimit } from '@/lib/rate-limit'

// POST — run a shell command on the user's machine
// Body: { command: string }  e.g. "npm install"
export async function POST(req: Request, { params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await machineRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Verify caller owns a project with this machine
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('fly_machine_id', machineId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { command } = await req.json() as { command: string }
  if (!command) return NextResponse.json({ error: 'command required' }, { status: 400 })

  try {
    const result = await execOnMachine(machineId, ['sh', '-c', command])
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[fly/exec] Failed:', err)
    return NextResponse.json({ error: 'Failed to execute command on machine' }, { status: 503 })
  }
}
