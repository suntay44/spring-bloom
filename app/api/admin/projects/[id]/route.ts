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

  const [{ data: project }, { data: messages }, { data: runs }] = await Promise.all([
    db.from("projects")
      .select("*, profiles(full_name)")
      .eq("id", id)
      .single(),
    db.from("messages")
      .select("id, role, content, model_id, credits_used, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    db.from("agent_runs")
      .select("id, prompt, model_id, model_label, status, estimated_credits, final_credits, tokens_input, tokens_output, created_at, finished_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  return NextResponse.json({ project, messages: messages ?? [], runs: runs ?? [] })
}
