import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"

interface SearchParams {
  reason?: string   // filter by failure_reason
  credits?: string  // "include" | "exclude" (default: exclude)
  days?: string
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  stream_error:    { label: "Stream Error",    color: "bg-red-900/50 text-red-400"    },
  finalize_error:  { label: "Finalize Error",  color: "bg-orange-900/50 text-orange-400" },
  provider_error:  { label: "Provider Error",  color: "bg-yellow-900/50 text-yellow-400" },
  rate_limited:    { label: "Rate Limited",    color: "bg-blue-900/50 text-blue-400"  },
  timeout:         { label: "Timeout",         color: "bg-purple-900/50 text-purple-400" },
  credit_exhausted:{ label: "Credit Exhausted",color: "bg-zinc-700 text-zinc-400"    },
  unknown:         { label: "Unknown",         color: "bg-zinc-700 text-zinc-400"    },
}

export default async function AdminDebugPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminPage()
  const { reason, credits = "exclude", days: daysParam } = await searchParams
  const days = Math.min(90, Math.max(1, parseInt(daysParam ?? "30", 10)))

  const db    = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = db
    .from("agent_runs")
    .select(`
      id,
      user_id,
      project_id,
      model_id,
      prompt,
      error_message,
      failure_reason,
      tokens_input,
      tokens_output,
      final_credits,
      started_at,
      finished_at
    `)
    .eq("status", "failed")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(200)

  if (credits === "exclude") {
    query = query.neq("failure_reason", "credit_exhausted")
  }

  if (reason && reason !== "all") {
    query = query.eq("failure_reason", reason)
  }

  const { data: runs } = await query
  const failedRuns = runs ?? []

  // Count by reason for the summary bar
  const reasonCounts: Record<string, number> = {}
  for (const r of failedRuns) {
    const key = r.failure_reason ?? "unknown"
    reasonCounts[key] = (reasonCounts[key] ?? 0) + 1
  }

  // Fetch user emails for the runs we have
  const userIds = [...new Set(failedRuns.map(r => r.user_id))]
  const emailMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users) {
      if (userIds.includes(u.id)) emailMap[u.id] = u.email ?? u.id.slice(0, 8)
    }
  }

  // Fetch project names
  const projectIds = [...new Set(failedRuns.map(r => r.project_id))]
  const projectMap: Record<string, string> = {}
  if (projectIds.length > 0) {
    const { data: projects } = await db
      .from("projects")
      .select("id, name")
      .in("id", projectIds)
    for (const p of projects ?? []) projectMap[p.id] = p.name
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Failed Runs</h1>
          <p className="text-sm text-zinc-500">
            Last {days} days · {failedRuns.length} failures shown
            {credits === "exclude" && " · credit exhaustion excluded"}
          </p>
        </div>
      </div>

      {/* Reason summary chips */}
      {Object.keys(reasonCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(reasonCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([r, count]) => {
              const meta = REASON_LABELS[r] ?? { label: r, color: "bg-zinc-700 text-zinc-400" }
              return (
                <span key={r} className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}>
                  {meta.label} · {count}
                </span>
              )
            })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 border-b border-zinc-800 pb-4">
        <FilterLink
          label="All reasons"
          href={buildUrl({ reason: undefined, credits, days })}
          active={!reason || reason === "all"}
        />
        {Object.entries(REASON_LABELS).map(([r, meta]) => (
          <FilterLink
            key={r}
            label={meta.label}
            href={buildUrl({ reason: r, credits, days })}
            active={reason === r}
          />
        ))}
        <div className="flex-1" />
        <FilterLink
          label={credits === "exclude" ? "Show credit failures" : "Hide credit failures"}
          href={buildUrl({ reason, credits: credits === "exclude" ? "include" : "exclude", days })}
          active={false}
          variant="toggle"
        />
        {[7, 14, 30, 60, 90].map(d => (
          <FilterLink
            key={d}
            label={`${d}d`}
            href={buildUrl({ reason, credits, days: d })}
            active={days === d}
            variant="days"
          />
        ))}
      </div>

      {/* Fail notice about credit exhaustion */}
      {credits === "exclude" && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 text-xs text-zinc-400">
          <strong className="text-zinc-300">Note:</strong> Credit exhaustion failures are hidden (users returned a 402 before a run was created).
          They don&apos;t appear as agent runs — they&apos;re rejected at the API layer.
          <Link href={buildUrl({ reason, credits: "include", days })} className="ml-2 text-purple-400 hover:underline">
            Show anyway
          </Link>
        </div>
      )}

      {/* Runs table */}
      {failedRuns.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-12 text-center">
          <p className="text-zinc-400 font-semibold">No failed runs</p>
          <p className="text-sm text-zinc-600 mt-1">That&apos;s a good sign.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {failedRuns.map(r => {
            const duration = r.started_at && r.finished_at
              ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)
              : null
            const meta = REASON_LABELS[r.failure_reason ?? "unknown"] ?? { label: "Unknown", color: "bg-zinc-700 text-zinc-400" }

            return (
              <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">{r.model_id ?? "—"}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span className="text-xs text-zinc-500">{new Date(r.started_at).toLocaleString()}</span>
                    {duration != null && (
                      <>
                        <span className="text-xs text-zinc-600">·</span>
                        <span className="text-xs text-zinc-500">{duration}s</span>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-3 text-xs text-zinc-500">
                    <Link href={`/backend-admin/users/${r.user_id}`} className="hover:text-purple-400">
                      {emailMap[r.user_id] ?? r.user_id.slice(0, 8)}
                    </Link>
                    <span>·</span>
                    <Link href={`/backend-admin/projects/${r.project_id}`} className="hover:text-purple-400">
                      {projectMap[r.project_id] ?? "project"}
                    </Link>
                  </div>
                </div>

                {/* Error message */}
                {r.error_message ? (
                  <div className="rounded bg-red-950/30 border border-red-900/30 px-3 py-2">
                    <p className="text-xs font-semibold text-red-400 mb-0.5">Error</p>
                    <p className="text-xs text-red-300 font-mono break-all">{r.error_message}</p>
                  </div>
                ) : (
                  <div className="rounded bg-zinc-800/50 px-3 py-2">
                    <p className="text-xs text-zinc-500 italic">
                      No error message recorded — run migration 015 to enable error tracking on new failures.
                    </p>
                  </div>
                )}

                {/* User prompt */}
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">User prompt</p>
                  <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">{r.prompt}</p>
                </div>

                {/* Token/credit row */}
                <div className="flex gap-6 text-xs text-zinc-600">
                  <span>Input tokens: <span className="text-zinc-400">{(r.tokens_input ?? 0).toLocaleString()}</span></span>
                  <span>Output tokens: <span className="text-zinc-400">{(r.tokens_output ?? 0).toLocaleString()}</span></span>
                  <span>Credits charged: <span className="text-zinc-400">{r.final_credits ?? 0}</span></span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function buildUrl({ reason, credits, days }: { reason?: string; credits?: string; days?: number }) {
  const sp = new URLSearchParams()
  if (reason && reason !== "all") sp.set("reason", reason)
  if (credits) sp.set("credits", credits)
  if (days)    sp.set("days", String(days))
  const qs = sp.toString()
  return `/backend-admin/debug${qs ? `?${qs}` : ""}`
}

function FilterLink({
  label, href, active, variant = "reason",
}: {
  label: string; href: string; active: boolean; variant?: "reason" | "toggle" | "days"
}) {
  const base = "rounded px-2.5 py-1 text-xs font-semibold transition-colors"
  const cls  = active
    ? `${base} bg-purple-600 text-white`
    : variant === "toggle"
      ? `${base} border border-zinc-700 text-zinc-400 hover:text-white`
      : `${base} text-zinc-500 hover:text-white`
  return <Link href={href} className={cls}>{label}</Link>
}
