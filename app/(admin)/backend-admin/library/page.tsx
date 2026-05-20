import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"
import { ClusterPromoteButton } from "@/components/admin/ClusterPromoteButton"

type Tab = "clusters" | "modules"

interface SearchParams {
  tab?: string
}

export default async function AdminLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminPage()
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === "modules" ? "modules" : "clusters"

  const db = createAdminClient()

  const [clustersRes, modulesRes] = await Promise.all([
    db.from("template_clusters")
      .select("id, name, app_type, status, build_count, avg_success_score, created_at")
      .order("build_count", { ascending: false })
      .limit(100),
    db.from("scaffold_modules")
      .select("id, name, type, description, status, source, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const clusters = clustersRes.data ?? []
  const modules  = modulesRes.data ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Library</h1>
        <p className="text-sm text-zinc-500">Template clusters, scaffold modules</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {(["clusters", "modules"] as Tab[]).map(t => (
          <Link
            key={t}
            href={`/backend-admin/library?tab=${t}`}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-purple-500 text-white"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "clusters" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">{clusters.length} clusters</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">App Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">Builds</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">Avg Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {clusters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                      No clusters yet — builds will auto-cluster as users generate apps
                    </td>
                  </tr>
                )}
                {clusters.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{c.name ?? "Unnamed cluster"}</p>
                      <p className="text-xs text-zinc-600 font-mono">{c.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{c.app_type ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">{c.build_count ?? 0}</td>
                    <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                      {c.avg_success_score != null ? c.avg_success_score.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ClusterPromoteButton
                        clusterId={c.id}
                        currentStatus={c.status as "candidate" | "canonical" | "deprecated"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "modules" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">{modules.length} modules</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {modules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No modules</td>
                  </tr>
                )}
                {modules.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-800/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-zinc-600 font-mono">{m.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{m.type ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs max-w-xs truncate">{m.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <SourceBadge source={m.source} />
                    </td>
                    <td className="px-4 py-3">
                      <ModuleStatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceBadge({ source }: { source: string | null }) {
  const map: Record<string, string> = {
    handwritten: "bg-blue-900/50 text-blue-400",
    extracted:   "bg-purple-900/50 text-purple-400",
    curated:     "bg-green-900/50 text-green-400",
  }
  const cls = map[source ?? ""] ?? "bg-zinc-700 text-zinc-300"
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{source ?? "—"}</span>
}

function ModuleStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    active:     "bg-green-900/50 text-green-400",
    deprecated: "bg-red-900/50 text-red-400",
    draft:      "bg-zinc-700 text-zinc-300",
  }
  const cls = map[status ?? ""] ?? "bg-zinc-700 text-zinc-300"
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{status ?? "—"}</span>
}
