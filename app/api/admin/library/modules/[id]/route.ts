import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const db = createAdminClient()
  const { data, error } = await db
    .from("scaffold_modules")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ module: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const { id } = await params
  const db = createAdminClient()

  // Soft delete — set status to deprecated
  const { error } = await db
    .from("scaffold_modules")
    .update({ status: "deprecated", updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
