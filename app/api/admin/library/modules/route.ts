import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const db = createAdminClient()
  const { data, error } = await db
    .from("scaffold_modules")
    .select("*")
    .order("times_used", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modules: data ?? [] })
}

export async function POST(req: Request) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const body = await req.json() as {
    name: string
    module_type: string
    description?: string
    tags?: string[]
    scaffold?: Record<string, unknown>
    source?: "handwritten" | "extracted"
  }

  if (!body.name || !body.module_type) {
    return NextResponse.json({ error: "name and module_type are required" }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from("scaffold_modules")
    .insert({
      name:        body.name,
      module_type: body.module_type,
      description: body.description ?? null,
      tags:        body.tags ?? [],
      scaffold:    body.scaffold ?? {},
      source:      body.source ?? "handwritten",
      status:      "active",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ module: data }, { status: 201 })
}
