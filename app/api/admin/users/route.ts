import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const { searchParams } = new URL(req.url)
  const q     = searchParams.get("q")?.trim() ?? ""
  const plan  = searchParams.get("plan") ?? ""
  const page  = Math.max(0, Number(searchParams.get("page") ?? 0))
  const limit = 50

  const db = createAdminClient()

  let query = db
    .from("profiles")
    .select(`
      id, full_name, plan, subscription_status, is_admin, created_at,
      supabase_status
    `)
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (q) {
    // Search by email via auth.users — fetch matching IDs first
    const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 })
    const matchingIds = (authUsers?.users ?? [])
      .filter(u => u.email?.toLowerCase().includes(q.toLowerCase()))
      .map(u => u.id)
    if (matchingIds.length === 0) return NextResponse.json({ users: [], total: 0 })
    query = query.in("id", matchingIds)
  }

  if (plan) query = query.eq("plan", plan)

  const { data: profiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch emails + project counts in parallel
  const ids = (profiles ?? []).map(p => p.id)
  const [{ data: authUsers }, { data: projectCounts }, { data: balances }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    ids.length
      ? db.from("projects").select("user_id").in("user_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? db.from("user_credit_balance").select("user_id, balance").in("user_id", ids)
      : Promise.resolve({ data: [] }),
  ])

  const emailMap = Object.fromEntries(
    (authUsers?.users ?? []).map(u => [u.id, u.email ?? ""])
  )
  const projectCountMap: Record<string, number> = {}
  for (const p of projectCounts ?? []) {
    projectCountMap[p.user_id] = (projectCountMap[p.user_id] ?? 0) + 1
  }
  const balanceMap = Object.fromEntries(
    (balances ?? []).map(b => [b.user_id, Number(b.balance ?? 0)])
  )

  const users = (profiles ?? []).map(p => ({
    ...p,
    email:         emailMap[p.id] ?? "",
    project_count: projectCountMap[p.id] ?? 0,
    balance:       balanceMap[p.id] ?? 0,
  }))

  return NextResponse.json({ users, total: users.length })
}
