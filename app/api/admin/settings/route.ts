import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const db = createAdminClient()
  const { data, error } = await db
    .from("platform_settings")
    .select("key, value, updated_at")
    .order("key")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data ?? [] })
}

export async function PUT(req: Request) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const body = await req.json() as { key: string; value: unknown }[]
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected array of {key, value}" }, { status: 400 })
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  const upserts = body.map(({ key, value }) => ({
    key,
    value: typeof value === "string" ? JSON.parse(value) : value,
    updated_at: now,
  }))

  const { error } = await db
    .from("platform_settings")
    .upsert(upserts, { onConflict: "key" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updated: upserts.length })
}
