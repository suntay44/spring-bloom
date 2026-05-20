import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"

const DAYS = 30

export default async function AdminAnalyticsPage() {
  await requireAdminPage()
  const db = createAdminClient()

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [runsRes, totalRes] = await Promise.all([
    db.from("agent_runs")
      .select("id, status, model_id, tokens_input, tokens_output, started_at, finished_at, final_credits")
      .gte("started_at", since)
      .order("started_at", { ascending: true }),
    db.from("agent_runs")
      .select("id, status", { count: "exact", head: true }),
  ])

  const runs       = runsRes.data ?? []
  const totalEver  = totalRes.count ?? 0

  // --- Aggregate stats ---
  const completed  = runs.filter(r => r.status === "completed")
  const failed     = runs.filter(r => r.status === "failed")
  const successRate = runs.length > 0
    ? Math.round((completed.length / runs.length) * 100)
    : 0

  const avgTokensIn  = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + (r.tokens_input  ?? 0), 0) / completed.length)
    : 0
  const avgTokensOut = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + (r.tokens_output ?? 0), 0) / completed.length)
    : 0

  // --- Daily buckets (last 30 days) ---
  const buckets: Record<string, { completed: number; failed: number }> = {}
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86400000)
    buckets[d.toISOString().slice(0, 10)] = { completed: 0, failed: 0 }
  }
  for (const r of runs) {
    const day = r.started_at.slice(0, 10)
    if (buckets[day]) {
      if (r.status === "completed") buckets[day].completed++
      else if (r.status === "failed") buckets[day].failed++
    }
  }
  const days = Object.entries(buckets)
  const maxDaily = Math.max(...days.map(([, v]) => v.completed + v.failed), 1)

  // --- Model breakdown ---
  const modelCounts: Record<string, number> = {}
  for (const r of runs) {
    const m = r.model_id ?? "unknown"
    modelCounts[m] = (modelCounts[m] ?? 0) + 1
  }
  const topModels = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // --- Avg duration ---
  const durations = completed
    .filter(r => r.started_at && r.finished_at)
    .map(r => (new Date(r.finished_at!).getTime() - new Date(r.started_at).getTime()) / 1000)
  const avgDurationSec = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Generation Analytics</h1>
        <p className="text-sm text-zinc-500">Last {DAYS} days · {runs.length} runs · {totalEver} total all-time</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Builds (30d)"    value={String(runs.length)}       sub={`${totalEver} all-time`} />
        <KPI label="Success Rate"    value={`${successRate}%`}          sub={`${failed.length} failed`} color={successRate >= 90 ? "green" : successRate >= 70 ? "yellow" : "red"} />
        <KPI label="Avg Input Tokens"  value={avgTokensIn.toLocaleString()}  sub="per completed run" />
        <KPI label="Avg Gen Time"    value={`${avgDurationSec}s`}      sub="completed runs" />
      </div>

      {/* Daily bar chart */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Builds per Day</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-end gap-0.5 h-28">
            {days.map(([date, v]) => {
              const total  = v.completed + v.failed
              const pct    = total / maxDaily
              const failPct = total > 0 ? v.failed / total : 0
              return (
                <div key={date} className="group relative flex flex-1 flex-col justify-end" style={{ height: "100%" }}>
                  <div className="w-full overflow-hidden rounded-sm" style={{ height: `${Math.max(pct * 100, total > 0 ? 4 : 1)}%` }}>
                    <div className="w-full bg-red-500/70"    style={{ height: `${failPct * 100}%` }} />
                    <div className="w-full bg-purple-500/70" style={{ height: `${(1 - failPct) * 100}%` }} />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                    <div className="rounded bg-zinc-700 px-2 py-1 text-[10px] text-white">
                      <p className="font-semibold">{date.slice(5)}</p>
                      <p className="text-green-400">{v.completed} ok</p>
                      {v.failed > 0 && <p className="text-red-400">{v.failed} failed</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            <span>{days[0]?.[0]?.slice(5)}</span>
            <span>{days[Math.floor(days.length / 2)]?.[0]?.slice(5)}</span>
            <span>{days[days.length - 1]?.[0]?.slice(5)}</span>
          </div>
          <div className="mt-2 flex gap-4">
            <span className="flex items-center gap-1 text-[10px] text-zinc-500"><span className="inline-block h-2 w-2 rounded-sm bg-purple-500/70" /> Completed</span>
            <span className="flex items-center gap-1 text-[10px] text-zinc-500"><span className="inline-block h-2 w-2 rounded-sm bg-red-500/70" /> Failed</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Model breakdown */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Top Models Used</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {topModels.length === 0 && (
              <p className="px-4 py-4 text-sm text-zinc-500">No data yet</p>
            )}
            {topModels.map(([model, count]) => (
              <div key={model} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-mono text-zinc-300 truncate">{model}</span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${(count / (topModels[0]?.[1] ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 tabular-nums w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Token breakdown */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Token Averages (completed runs)</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            <StatRow label="Avg input tokens"  value={avgTokensIn.toLocaleString()} />
            <StatRow label="Avg output tokens" value={avgTokensOut.toLocaleString()} />
            <StatRow label="Avg gen time"      value={`${avgDurationSec}s`} />
            <StatRow label="Completed runs"    value={String(completed.length)} />
            <StatRow label="Failed runs"       value={String(failed.length)} accent={failed.length > 0 ? "red" : undefined} />
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color?: "green" | "yellow" | "red"
}) {
  const valueColor = color === "green" ? "text-green-400" : color === "yellow" ? "text-yellow-400" : color === "red" ? "text-red-400" : "text-white"
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
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
