/**
 * DELETE /api/projects/[id]/integrations/[type]
 *   Removes the integration and its secrets for a project.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { writeRateLimit } from "@/lib/rate-limit"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id: projectId, type } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Rate limit destructive writes
  const { success } = await writeRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 })
  }

  // Verify ownership
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const db = createAdminClient()

  await Promise.all([
    db.from("project_integrations")
      .delete()
      .eq("project_id", projectId)
      .eq("type", type),
    db.from("project_secrets")
      .delete()
      .eq("project_id", projectId)
      .eq("type", type),
  ])

  return NextResponse.json({ ok: true })
}
