import { notFound } from "next/navigation"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()
  const { id } = await params
  const db = createAdminClient()

  const [profileRes, userRes, projectsRes, txRes] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).single(),
    db.auth.admin.getUserById(id),
    db.from("projects")
      .select("id, name, framework, created_at, updated_at")
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .limit(20),
    db.from("credit_transactions")
      .select("id, type, amount, description, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (profileRes.error || !profileRes.data) notFound()

  const profile  = profileRes.data
  const email    = userRes.data.user?.email ?? "—"
  const projects = projectsRes.data ?? []
  const txs      = txRes.data ?? []

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/backend-admin/users" className="text-xs text-zinc-500 hover:text-white mb-2 block">
            ← Back to Users
          </Link>
          <h1 className="text-xl font-bold text-white">{profile.display_name ?? email}</h1>
          <p className="text-sm text-zinc-500">{email}</p>
        </div>
        <PlanBadge plan={profile.plan} />
      </div>

      {/* Profile Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Credit Balance" value={String(profile.credit_balance ?? 0)} />
        <StatCard label="Plan" value={profile.plan ?? "free"} />
        <StatCard label="Member Since" value={new Date(profile.created_at).toLocaleDateString()} />
      </div>

      {/* Projects */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">
          Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet</p>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.framework} · Updated {new Date(p.updated_at).toLocaleDateString()}</p>
                </div>
                <Link
                  href={`/backend-admin/projects/${p.id}`}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Credit Ledger */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Credit Ledger</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {txs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No transactions</td>
                </tr>
              )}
              {txs.map(tx => (
                <tr key={tx.id} className="hover:bg-zinc-800/20">
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold ${tx.type === "deduction" ? "text-red-400" : "text-green-400"}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{tx.description ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums font-semibold text-white">
                    {tx.type === "deduction" ? "-" : "+"}{Math.abs(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string | null }) {
  const map: Record<string, string> = {
    free:    "bg-zinc-700 text-zinc-300",
    starter: "bg-blue-900/50 text-blue-400",
    pro:     "bg-purple-900/50 text-purple-400",
    teams:   "bg-green-900/50 text-green-400",
  }
  const cls = map[plan ?? "free"] ?? "bg-zinc-700 text-zinc-300"
  return (
    <span className={`rounded px-3 py-1 text-sm font-semibold ${cls}`}>
      {plan ?? "free"}
    </span>
  )
}
