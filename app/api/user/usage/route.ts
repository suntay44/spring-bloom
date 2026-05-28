/**
 * GET /api/user/usage
 *   Returns the signed-in user's usage analytics:
 *     - current credit balance
 *     - this-month spend (credits) + token totals
 *     - by-model breakdown (last 30 days)
 *     - cache hit rate (R0 telemetry)
 *     - daily spend series (last 30 days) for a sparkline
 *     - recent credit transactions
 *
 * All reads — no new infra cost. Uses the user-scoped client (RLS enforced).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Run all reads in parallel
  const [
    balanceRes,
    monthTxRes,
    agentRunsRes,
    recentTxRes,
  ] = await Promise.all([
    supabase.from('user_credit_balance').select('balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_transactions')
      .select('type, amount, created_at')
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
    supabase.from('agent_runs')
      .select('model_id, final_credits, tokens_input, tokens_output, cache_creation_input_tokens, cache_read_input_tokens, created_at, status')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('credit_transactions')
      .select('type, amount, model_id, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const balance = Number((balanceRes.data as { balance?: number } | null)?.balance ?? 0)

  // ── This-month spend (deduct rows are negative; bonus/purchase positive) ──
  type Tx = { type: string; amount: number; created_at: string }
  const monthTx = (monthTxRes.data ?? []) as Tx[]
  let monthSpend = 0, monthGranted = 0, monthPurchased = 0
  for (const t of monthTx) {
    if (t.type === 'deduct') monthSpend += Math.abs(t.amount)
    else if (t.type === 'bonus') monthGranted += t.amount
    else if (t.type === 'purchase') monthPurchased += t.amount
  }

  // ── Agent-run analytics ──
  type Run = {
    model_id: string | null; final_credits: number | null
    tokens_input: number | null; tokens_output: number | null
    cache_creation_input_tokens: number | null; cache_read_input_tokens: number | null
    created_at: string; status: string | null
  }
  const runs = (agentRunsRes.data ?? []) as Run[]

  // By-model breakdown
  const byModelMap = new Map<string, { runs: number; credits: number; tokensIn: number; tokensOut: number }>()
  let totalCacheCreate = 0, totalCacheRead = 0, totalNonCachedInput = 0
  const dailyMap = new Map<string, number>()  // YYYY-MM-DD → credits

  for (const r of runs) {
    const model = r.model_id ?? 'unknown'
    const m = byModelMap.get(model) ?? { runs: 0, credits: 0, tokensIn: 0, tokensOut: 0 }
    m.runs++
    m.credits  += r.final_credits ?? 0
    m.tokensIn += r.tokens_input ?? 0
    m.tokensOut += r.tokens_output ?? 0
    byModelMap.set(model, m)

    totalCacheCreate    += r.cache_creation_input_tokens ?? 0
    totalCacheRead      += r.cache_read_input_tokens ?? 0
    totalNonCachedInput += r.tokens_input ?? 0

    const day = r.created_at.slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + (r.final_credits ?? 0))
  }

  const byModel = Array.from(byModelMap.entries())
    .map(([model_id, v]) => ({ model_id, ...v }))
    .sort((a, b) => b.credits - a.credits)

  // Cache hit rate = cache_read / (cache_read + cache_create + non-cached input)
  const cacheDenom = totalCacheRead + totalCacheCreate + totalNonCachedInput
  const cacheHitRate = cacheDenom > 0 ? totalCacheRead / cacheDenom : 0

  // Daily series (fill gaps with 0 for a clean sparkline)
  const daily: Array<{ date: string; credits: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    daily.push({ date: d, credits: Number((dailyMap.get(d) ?? 0).toFixed(4)) })
  }

  return NextResponse.json({
    balance,
    month: {
      spend:     Number(monthSpend.toFixed(4)),
      granted:   Number(monthGranted.toFixed(4)),
      purchased: Number(monthPurchased.toFixed(4)),
    },
    by_model: byModel,
    cache: {
      hit_rate:        Number((cacheHitRate * 100).toFixed(1)),  // percent
      read_tokens:     totalCacheRead,
      creation_tokens: totalCacheCreate,
    },
    daily,
    recent_transactions: recentTxRes.data ?? [],
    run_count_30d: runs.length,
  })
}
