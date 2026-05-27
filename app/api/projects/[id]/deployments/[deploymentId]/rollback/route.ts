/**
 * POST /api/projects/[id]/deployments/[deploymentId]/rollback
 *   Promotes the target deployment back to production via Cloudflare's
 *   rollback endpoint. Records a new deployment row for the rollback.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rollbackPagesDeployment } from '@/lib/cloudflare/client'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; deploymentId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId, deploymentId } = await params

  // Load target deployment + ensure it belongs to this user/project
  const { data: target } = await supabase
    .from('deployments')
    .select('id, cf_deployment_id, published_url, status')
    .eq('id', deploymentId).eq('project_id', projectId).eq('user_id', user.id)
    .maybeSingle()
  if (!target) return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })

  const tgt = target as { id: string; cf_deployment_id?: string; published_url?: string; status: string }
  if (!tgt.cf_deployment_id) {
    return NextResponse.json({ error: 'Target has no Cloudflare deployment id' }, { status: 400 })
  }
  if (tgt.status !== 'success') {
    return NextResponse.json({ error: 'Can only rollback to a successful deployment' }, { status: 400 })
  }

  // Pull cf project name from projects row
  const { data: project } = await supabase
    .from('projects')
    .select('cloudflare_project_name')
    .eq('id', projectId).single()
  const projectName = (project as { cloudflare_project_name?: string } | null)?.cloudflare_project_name
  if (!projectName) {
    return NextResponse.json({ error: 'No Cloudflare project — has this been published?' }, { status: 400 })
  }

  // Execute rollback via Cloudflare
  let rolled
  try {
    rolled = await rollbackPagesDeployment(projectName, tgt.cf_deployment_id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'CF rollback failed' },
      { status: 502 },
    )
  }

  // Mark old current deployment as rolled-back; insert new row for the rollback
  const nowIso = new Date().toISOString()
  await supabase
    .from('deployments')
    .update({ rolled_back_at: nowIso })
    .eq('project_id', projectId).eq('user_id', user.id).eq('status', 'success')
    .is('rolled_back_at', null)

  const { data: newRow } = await supabase
    .from('deployments')
    .insert({
      project_id:       projectId,
      user_id:          user.id,
      cf_deployment_id: rolled.deploymentId,
      cf_project_name:  projectName,
      published_url:    tgt.published_url ?? null,
      status:           'success',
      error_message:    `Rollback to deployment ${tgt.cf_deployment_id.slice(0, 8)}`,
      completed_at:     nowIso,
    })
    .select().single()

  // Update projects.cloudflare_deployment_id to the new (rollback) id
  await supabase
    .from('projects')
    .update({
      cloudflare_deployment_id: rolled.deploymentId,
      published_at:             nowIso,
    })
    .eq('id', projectId)

  return NextResponse.json({ deployment: newRow, rolled_back_to: tgt.cf_deployment_id })
}
