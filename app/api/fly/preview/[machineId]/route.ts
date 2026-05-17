import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Proxy — forward requests to the Fly.io machine's internal dev server
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

  const appName = process.env.FLY_APP_NAME
  const upstreamUrl = `http://${machineId}.vm.${appName}.internal:3000`
  try {
    const res = await fetch(upstreamUrl)
    const html = await res.text()
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch {
    return new NextResponse('<p>Preview not ready yet. The dev server may still be starting.</p>', {
      headers: { 'Content-Type': 'text/html' },
      status: 503,
    })
  }
}
