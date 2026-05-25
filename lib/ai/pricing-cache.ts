/**
 * R0-6: In-process cache for model_pricing rows.
 *
 * Pricing changes rarely (once per provider price drop). Hitting Postgres on
 * every chat turn just to read 6 numeric columns was wasteful. 5-min TTL.
 *
 * Cache is per-process — fine for our deployment shape. If we add a write
 * path that changes pricing (e.g., admin tool), call invalidatePricingCache().
 */

import { createClient } from '@/lib/supabase/server'

export interface ModelPricing {
  model_id:              string
  display_name:          string
  provider:              string
  min_plan:              string | null
  credits_per_1m_input:  number
  credits_per_1m_output: number
}

interface CacheEntry { row: ModelPricing | null; fetchedAt: number }
const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 5 * 60_000   // 5 minutes

export function invalidatePricingCache(modelId?: string): void {
  if (modelId) CACHE.delete(modelId)
  else CACHE.clear()
}

export async function getModelPricing(modelId: string): Promise<ModelPricing | null> {
  const cached = CACHE.get(modelId)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.row
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('model_pricing')
    .select('model_id, display_name, provider, min_plan, credits_per_1m_input, credits_per_1m_output')
    .eq('model_id', modelId)
    .eq('is_active', true)
    .single()

  const row = (data as ModelPricing | null) ?? null
  CACHE.set(modelId, { row, fetchedAt: Date.now() })
  return row
}
