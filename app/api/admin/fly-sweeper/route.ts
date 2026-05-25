/**
 * GET /api/admin/fly-sweeper
 *
 * Destroys Fly machines for projects with no activity in the last 30 days.
 * Designed to be hit by a cron (Vercel cron, GitHub Actions, etc.) — protected
 * by a shared secret in the Authorization header.
 *
 * "Activity" = updated_at on the projects row OR a message in the last 30 days.
 *
 * Query params:
 *   ?dry_run=1   — return the list without destroying (test mode)
 *   ?days=N      — override the 30-day window (clamped 7-365)
 *
 * Headers:
 *   Authorization: Bearer ${FLY_SWEEPER_SECRET}
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { destroyMachine } from '@/lib/fly/client'

interface SweepCandidate {
  project_id:     string
  fly_machine_id: string
  last_activity:  string | null
}

export async function GET(req: Request) {
  // ── Auth ──
  const auth = req.headers.get('authorization')
  const secret = process.env.FLY_SWEEPER_SECRET
  if (!secret) return NextResponse.json({ error: 'FLY_SWEEPER_SECRET not configured' }, { status: 500 })
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── Params ──
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === '1'
  const days   = Math.max(7, Math.min(365, Number(url.searchParams.get('days')) || 30))
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  const admin = createAdminClient()

  // ── Find candidates ──
  // Projects that:
  //   (a) have a fly_machine_id (non-null)
  //   (b) haven't been updated since the cutoff
  //   (c) haven't had a message since the cutoff
  const { data: stale, error } = await admin
    .from('projects')
    .select('id, fly_machine_id, updated_at, messages(created_at)')
    .not('fly_machine_id', 'is', null)
    .lt('updated_at', cutoff)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter out projects with any recent message activity
  const candidates: SweepCandidate[] = []
  for (const p of (stale ?? []) as Array<{
    id: string
    fly_machine_id: string
    updated_at: string
    messages?: Array<{ created_at: string }>
  }>) {
    const lastMessage = p.messages?.reduce<string | null>(
      (latest, m) => !latest || m.created_at > latest ? m.created_at : latest,
      null,
    ) ?? null
    if (lastMessage && lastMessage >= cutoff) continue
    candidates.push({
      project_id:     p.id,
      fly_machine_id: p.fly_machine_id,
      last_activity:  lastMessage ?? p.updated_at,
    })
  }

  // ── Dry run? ──
  if (dryRun) {
    return NextResponse.json({
      dry_run:    true,
      window_days: days,
      cutoff,
      candidates,
      count:      candidates.length,
    })
  }

  // ── Destroy ──
  const destroyed: string[] = []
  const failed:    Array<{ project_id: string; error: string }> = []

  for (const c of candidates) {
    try {
      await destroyMachine(c.fly_machine_id)
      // Clear the column so a future build can provision a fresh machine
      await admin.from('projects')
        .update({ fly_machine_id: null, fly_machine_status: 'destroyed' })
        .eq('id', c.project_id)
      destroyed.push(c.project_id)
    } catch (err) {
      failed.push({
        project_id: c.project_id,
        error:      err instanceof Error ? err.message : 'destroy failed',
      })
    }
  }

  return NextResponse.json({
    window_days: days,
    cutoff,
    destroyed,
    failed,
    destroyed_count: destroyed.length,
    failed_count:    failed.length,
  })
}
