import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { projectId: string }
  const { projectId } = body
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id, fly_machine_id, publish_slug')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // TODO Phase 17:
  // 1. Get file snapshot from Fly machine
  // 2. Build static output (or use Fly to run build)
  // 3. Deploy to Cloudflare Pages via Direct Upload
  // 4. Set publish_slug, published_url, cloudflare_deployment_id on project
  // 5. Return { url: `https://${slug}.springbloom.app` }

  return NextResponse.json({ error: 'Publish not yet implemented' }, { status: 501 })
}
