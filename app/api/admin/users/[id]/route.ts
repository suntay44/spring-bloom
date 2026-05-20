import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const { id } = await params
  const db = createAdminClient()

  const [
    { data: profile },
    { data: authUser },
    { data: projects },
    { data: transactions },
    { data: balance },
  ] = await Promise.all([
    db.from("profiles")
      .select("*")
      .eq("id", id)
      .single(),
    db.auth.admin.getUserById(id),
    db.from("projects")
      .select("id, name, type, framework, status, fly_machine_status, published_url, created_at, updated_at")
      .eq("user_id", id)
      .order("updated_at", { ascending: false }),
    db.from("credit_transactions")
      .select("id, type, amount, created_at, stripe_session_id, agent_run_id, project_id")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("user_credit_balance")
      .select("balance")
      .eq("user_id", id)
      .single(),
  ])

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 })

  return NextResponse.json({
    profile: { ...profile, email: authUser.user?.email ?? "" },
    projects:      projects ?? [],
    transactions:  transactions ?? [],
    balance:       Number(balance?.balance ?? 0),
  })
}
