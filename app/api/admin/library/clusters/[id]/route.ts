import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

/** POST /api/admin/library/clusters/[id] — promote or demote a cluster */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error
  const { user } = result

  const { id } = await params
  const body = await req.json() as { action: "promote" | "demote" | "deprecate" }

  if (!["promote", "demote", "deprecate"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const db = createAdminClient()

  const statusMap = {
    promote:    "canonical",
    demote:     "candidate",
    deprecate:  "deprecated",
  } as const

  const updates: Record<string, unknown> = {
    status:     statusMap[body.action],
    updated_at: new Date().toISOString(),
  }
  if (body.action === "promote") {
    updates.promoted_at = new Date().toISOString()
    updates.promoted_by = user.id
  }

  const { error } = await db
    .from("template_clusters")
    .update(updates)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
