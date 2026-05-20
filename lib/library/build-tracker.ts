/**
 * Phase 19 — Build Tracker
 *
 * Silently records every AI generation as an app_build, then attempts to
 * assign it to an existing template_cluster (or creates a new candidate cluster).
 *
 * All operations are fire-and-forget from the caller's perspective — errors
 * are caught and logged but never propagated to the user stream.
 *
 * Promotion thresholds (≥10 builds, ≥3 distinct app types, avg score >70)
 * are checked after each insert but promotion itself requires a human action
 * via the admin UI — this module only flags eligible clusters.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { extractFingerprint, fingerprintSimilarity } from './fingerprinter'
import type { BuildFingerprint, TemplateCluster } from './types'
import { CLUSTER_SIMILARITY_THRESHOLD, PROMOTION_THRESHOLDS } from './types'

interface TrackBuildInput {
  projectId: string
  agentRunId: string
  userId: string
  userPrompt: string
  artifactText?: string
  projectType: string
}

/**
 * Record a completed generation as an app_build and maintain cluster state.
 * This runs asynchronously in onFinish — never awaited by the response path.
 */
export async function trackBuild(input: TrackBuildInput): Promise<void> {
  try {
    const supabase = await createServerClient()
    const fingerprint = extractFingerprint(input.userPrompt, input.artifactText)

    // 1. Insert the build record
    const { data: build, error: buildError } = await supabase
      .from('app_builds')
      .insert({
        project_id:   input.projectId,
        agent_run_id: input.agentRunId,
        user_id:      input.userId,
        fingerprint,
      })
      .select('id')
      .single()

    if (buildError || !build) {
      console.error('[build-tracker] Failed to insert app_build:', buildError)
      return
    }

    // 2. Find or create a cluster for this fingerprint
    const clusterId = await findOrCreateCluster(fingerprint, input.projectType, supabase)
    if (!clusterId) return

    // 3. Assign the build to the cluster
    await supabase
      .from('app_builds')
      .update({ cluster_id: clusterId })
      .eq('id', build.id)

  } catch (err) {
    // Fingerprinting errors must never affect the user — log only.
    console.error('[build-tracker] Unexpected error:', err)
  }
}

/**
 * Update success signals for an existing build (e.g. user published, continued).
 * Call this from relevant API routes when signals are observed.
 */
export async function updateBuildSignals(
  buildId: string,
  signals: {
    user_continued?: boolean
    was_published?: boolean
    edits_after?: number
    success_score?: number
  },
): Promise<void> {
  try {
    const supabase = await createServerClient()
    await supabase
      .from('app_builds')
      .update(signals)
      .eq('id', buildId)

    // Re-aggregate the cluster if score changed
    if (signals.success_score !== undefined) {
      const { data } = await supabase
        .from('app_builds')
        .select('cluster_id')
        .eq('id', buildId)
        .single()
      if (data?.cluster_id) await aggregateCluster(data.cluster_id, supabase)
    }
  } catch (err) {
    console.error('[build-tracker] updateBuildSignals error:', err)
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function findOrCreateCluster(
  fingerprint: BuildFingerprint,
  projectType: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<string | null> {
  try {
    // Load all candidate/canonical clusters (not deprecated)
    const { data: clusters } = await supabase
      .from('template_clusters')
      .select('id, fingerprint')
      .neq('status', 'deprecated')
      .order('build_count', { ascending: false })
      .limit(200)

    // Find best matching cluster above the similarity threshold
    let bestId: string | null = null
    let bestScore = 0

    for (const cluster of (clusters ?? [])) {
      const score = fingerprintSimilarity(
        fingerprint,
        cluster.fingerprint as BuildFingerprint,
      )
      if (score > CLUSTER_SIMILARITY_THRESHOLD && score > bestScore) {
        bestScore = score
        bestId = cluster.id
      }
    }

    if (bestId) {
      // Update existing cluster aggregates
      await aggregateCluster(bestId, supabase)
      return bestId
    }

    // No matching cluster — create a new candidate
    const { data: newCluster, error } = await supabase
      .from('template_clusters')
      .insert({
        fingerprint,
        build_count: 1,
        distinct_app_types: 1,
        avg_success_score: 0,
        status: 'candidate',
      })
      .select('id')
      .single()

    if (error || !newCluster) {
      console.error('[build-tracker] Failed to create cluster:', error)
      return null
    }

    return newCluster.id
  } catch (err) {
    console.error('[build-tracker] findOrCreateCluster error:', err)
    return null
  }
}

async function aggregateCluster(
  clusterId: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<void> {
  try {
    const { data: builds } = await supabase
      .from('app_builds')
      .select('success_score, project_id')
      .eq('cluster_id', clusterId)

    if (!builds?.length) return

    const buildCount = builds.length
    const avgScore = builds.reduce((acc, b) => acc + (b.success_score ?? 0), 0) / buildCount

    // Count distinct project types via the projects table
    const projectIds = [...new Set(builds.map(b => b.project_id))]
    const { data: projects } = await supabase
      .from('projects')
      .select('type')
      .in('id', projectIds)
    const distinctTypes = new Set((projects ?? []).map(p => p.type)).size

    await supabase
      .from('template_clusters')
      .update({
        build_count:        buildCount,
        distinct_app_types: distinctTypes,
        avg_success_score:  Math.round(avgScore * 100) / 100,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', clusterId)

    // Check promotion eligibility and log (human promotes via admin UI)
    if (
      buildCount        >= PROMOTION_THRESHOLDS.min_build_count &&
      distinctTypes     >= PROMOTION_THRESHOLDS.min_distinct_app_types &&
      avgScore          >= PROMOTION_THRESHOLDS.min_avg_success_score
    ) {
      console.info(
        `[build-tracker] Cluster ${clusterId} meets promotion thresholds ` +
        `(builds=${buildCount}, types=${distinctTypes}, score=${avgScore.toFixed(1)}). ` +
        `Promote via /backend-admin/library.`
      )
    }
  } catch (err) {
    console.error('[build-tracker] aggregateCluster error:', err)
  }
}
