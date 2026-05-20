import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"
import { UserSearchInput } from "@/components/admin/UserSearchInput"

interface SearchParams {
  q?: string
  plan?: string
  page?: string
}

const PAGE_SIZE = 30

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminPage()
  const { q, plan, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const db     = createAdminClient()
  const from   = (page - 1) * PAGE_SIZE
  const to     = from + PAGE_SIZE - 1

  let query = db
    .from("profiles")
    .select("id, display_name, plan, credit_balance, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (plan) query = query.eq("plan", plan)
  if (q)    query = query.ilike("id", `%${q}%`)

  const { data: profiles, count } = await query

  // Fetch emails from auth admin API
  const { data: { users: authUsers } } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? "—"]))

  // If searching by q (email), filter auth users first then cross-match profiles
  const rows = (profiles ?? []).map(p => ({
    ...p,
    email: emailMap[p.id] ?? "—",
  }))

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-zinc-500">{count ?? 0} total</p>
        </div>
        <UserSearchInput />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Plan</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">Credits</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No users found</td>
              </tr>
            )}
            {rows.map(u => (
              <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-white font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3 text-zinc-300">{u.display_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <PlanBadge plan={u.plan} />
                </td>
                <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">{u.credit_balance ?? 0}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/backend-admin/users/${u.id}`}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/backend-admin/users?${buildPageUrl({ q, plan, page: page - 1 })}`}
                className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/backend-admin/users?${buildPageUrl({ q, plan, page: page + 1 })}`}
                className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function buildPageUrl({ q, plan, page }: { q?: string; plan?: string; page: number }) {
  const sp = new URLSearchParams()
  if (q)    sp.set("q", q)
  if (plan) sp.set("plan", plan)
  sp.set("page", String(page))
  return sp.toString()
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
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {plan ?? "free"}
    </span>
  )
}
