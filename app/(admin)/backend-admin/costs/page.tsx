import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"

const DAYS = 30

export default async function AdminCostsPage() {
  await requireAdminPage()
  const db = createAdminClient()

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Load settings for credit price (what we charge per credit in USD)
  const { data: settingsRows } = await db
    .from("platform_settings")
    .select("key, value")
    .in("key", ["billing.usd_per_credit", "billing.free_ai_cost_budget_usd"])

  const settingsMap = Object.fromEntries((settingsRows ?? []).map(r => [r.key, r.value]))
  const usdPerCredit = parseFloat(String(settingsMap["billing.usd_per_credit"] ?? "0.001"))

  const [runsRes, pricingRes, topConsumersRes] = await Promise.all([
    // All completed runs in window with model info
    db.from("agent_runs")
      .select("id, user_id, model_id, tokens_input, tokens_output, final_credits, started_at")
      .eq("status", "completed")
      .gte("started_at", since),
    // Model pricing for AI cost calculation
    db.from("model_pricing")
      .select("model_id, credits_per_1m_input, credits_per_1m_output"),
    // Top credit consumers (all time)
    db.from("profiles")
      .select("id, display_name, plan, credit_balance")
      .order("credit_balance", { ascending: true })
      .limit(10),
  ])

  const runs    = runsRes.data    ?? []
  const pricing = pricingRes.data ?? []
  const topConsumers = topConsumersRes.data ?? []

  // Build pricing lookup
  const priceLookup: Record<string, { input: number; output: number }> = {}
  for (const p of pricing) {
    priceLookup[p.model_id] = {
      input:  Number(p.credits_per_1m_input),
      output: Number(p.credits_per_1m_output),
    }
  }

  // Calculate AI cost per run (in credits, then convert to USD)
  let totalCreditsConsumed = 0
  let totalAICostCredits   = 0

  const dailyCost: Record<string, { credits: number; aiCostCredits: number }> = {}
  // init buckets
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86400000).toISOString().slice(0, 10)
    dailyCost[d] = { credits: 0, aiCostCredits: 0 }
  }

  const planCost: Record<string, number> = {}

  for (const r of runs) {
    const p = priceLookup[r.model_id]
    const aiCostCredits = p
      ? ((r.tokens_input ?? 0) / 1_000_000) * p.input +
        ((r.tokens_output ?? 0) / 1_000_000) * p.output
      : 0

    totalCreditsConsumed += r.final_credits ?? 0
    totalAICostCredits   += aiCostCredits

    const day = r.started_at.slice(0, 10)
    if (dailyCost[day]) {
      dailyCost[day].credits      += r.final_credits ?? 0
      dailyCost[day].aiCostCredits += aiCostCredits
    }
  }

  // Revenue = credits consumed × price we charge per credit
  const totalRevenueUSD = totalCreditsConsumed * usdPerCredit
  // AI cost in USD (what we pay Anthropic)
  const totalAICostUSD  = totalAICostCredits * usdPerCredit
  const grossMargin     = totalRevenueUSD > 0
    ? Math.round(((totalRevenueUSD - totalAICostUSD) / totalRevenueUSD) * 100)
    : 0

  const days = Object.entries(dailyCost)
  const maxDailyRevenue = Math.max(...days.map(([, v]) => v.credits * usdPerCredit), 0.001)

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Cost & Margin</h1>
        <p className="text-sm text-zinc-500">Last {DAYS} days · credit price ${usdPerCredit.toFixed(4)} / credit</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Credits Consumed" value={Math.round(totalCreditsConsumed).toLocaleString()} sub="last 30d" />
        <KPI label="Revenue (est.)"   value={`$${totalRevenueUSD.toFixed(2)}`} sub="at credit price" color="green" />
        <KPI label="AI Cost (est.)"   value={`$${totalAICostUSD.toFixed(2)}`}  sub="Anthropic tokens" color="red" />
        <KPI
          label="Gross Margin"
          value={`${grossMargin}%`}
          sub="revenue − AI cost"
          color={grossMargin >= 60 ? "green" : grossMargin >= 30 ? "yellow" : "red"}
        />
      </div>

      {/* Daily revenue vs cost chart */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Daily Revenue vs AI Cost (est. USD)</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-end gap-0.5 h-28">
            {days.map(([date, v]) => {
              const rev  = v.credits * usdPerCredit
              const cost = v.aiCostCredits * usdPerCredit
              const revPct  = rev / maxDailyRevenue
              const costPct = rev > 0 ? Math.min(cost / rev, 1) : 0
              return (
                <div key={date} className="group relative flex flex-1 flex-col justify-end" style={{ height: "100%" }}>
                  <div className="w-full overflow-hidden rounded-sm" style={{ height: `${Math.max(revPct * 100, rev > 0 ? 4 : 1)}%` }}>
                    {/* AI cost portion (bottom = cost, top = margin) */}
                    <div className="w-full bg-green-500/60" style={{ height: `${(1 - costPct) * 100}%` }} />
                    <div className="w-full bg-red-500/60"   style={{ height: `${costPct * 100}%` }} />
                  </div>
                  <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                    <div className="rounded bg-zinc-700 px-2 py-1 text-[10px] text-white">
                      <p className="font-semibold">{date.slice(5)}</p>
                      <p className="text-green-400">Rev ${rev.toFixed(3)}</p>
                      <p className="text-red-400">Cost ${cost.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            <span>{days[0]?.[0]?.slice(5)}</span>
            <span>{days[days.length - 1]?.[0]?.slice(5)}</span>
          </div>
          <div className="mt-2 flex gap-4">
            <span className="flex items-center gap-1 text-[10px] text-zinc-500"><span className="inline-block h-2 w-2 rounded-sm bg-green-500/60" /> Margin</span>
            <span className="flex items-center gap-1 text-[10px] text-zinc-500"><span className="inline-block h-2 w-2 rounded-sm bg-red-500/60" /> AI Cost</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Totals breakdown */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Summary</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            <StatRow label="Completed runs (30d)"   value={String(runs.length)} />
            <StatRow label="Credits consumed (30d)" value={Math.round(totalCreditsConsumed).toLocaleString()} />
            <StatRow label="Estimated revenue"      value={`$${totalRevenueUSD.toFixed(4)}`} />
            <StatRow label="Estimated AI cost"      value={`$${totalAICostUSD.toFixed(4)}`} accent="red" />
            <StatRow label="Gross margin"           value={`${grossMargin}%`} accent={grossMargin < 30 ? "red" : undefined} />
            <StatRow label="Credit price setting"   value={`$${usdPerCredit} / credit`} />
          </div>
          <p className="mt-2 text-[10px] text-zinc-600">
            * Estimates based on token counts × model pricing. Revenue assumes all consumed credits were purchased.
            Adjust <span className="font-mono">billing.usd_per_credit</span> in Settings to match your Stripe pricing.
          </p>
        </div>

        {/* Top consumers (lowest balance = spent most) */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Low Balance Users</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {topConsumers.length === 0 && (
              <p className="px-4 py-4 text-sm text-zinc-500">No data yet</p>
            )}
            {topConsumers.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs text-zinc-300">{u.display_name ?? u.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-zinc-600">{u.plan ?? "free"}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-yellow-400">
                  {u.credit_balance ?? 0} cr
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: "green" | "yellow" | "red"
}) {
  const vc = color === "green" ? "text-green-400" : color === "yellow" ? "text-yellow-400" : color === "red" ? "text-red-400" : "text-white"
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${vc}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: "red" }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent === "red" ? "text-red-400" : "text-white"}`}>{value}</span>
    </div>
  )
}
