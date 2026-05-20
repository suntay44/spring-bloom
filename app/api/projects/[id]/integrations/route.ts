/**
 * GET  /api/projects/[id]/integrations
 *   Returns all integrations for a project.
 *   Secret values are NEVER returned — only `is_set` booleans per field.
 *
 * POST /api/projects/[id]/integrations
 *   Upserts one integration. Splits incoming payload into:
 *     public_config  → project_integrations (user-readable)
 *     secret_config  → project_secrets (service-role only)
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Which fields in each integration type are secrets vs public
const SECRET_FIELDS: Record<string, string[]> = {
  stripe:    ["secret_key", "webhook_secret"],
  supabase:  ["service_role_key"],
  twilio:    ["api_key_secret"],
  openai:    ["api_key"],
  anthropic: ["api_key"],
  resend:    ["api_key"],
  env:       [], // env entries are handled as an array — all treated as secret
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const db = createAdminClient()

  const [{ data: integrations }, { data: secrets }] = await Promise.all([
    db.from("project_integrations")
      .select("type, status, public_config, updated_at")
      .eq("project_id", projectId),
    db.from("project_secrets")
      .select("type, secret_config")
      .eq("project_id", projectId),
  ])

  // Build a map: type → which secret keys are set (but NOT their values)
  const secretSetMap: Record<string, Record<string, boolean>> = {}
  for (const s of secrets ?? []) {
    const config = (s.secret_config ?? {}) as Record<string, unknown>
    secretSetMap[s.type] = Object.fromEntries(
      Object.entries(config).map(([k, v]) => [k, !!v])
    )
  }

  const result = (integrations ?? []).map(i => ({
    type:          i.type,
    status:        i.status,
    public_config: i.public_config,
    secrets_set:   secretSetMap[i.type] ?? {},
    updated_at:    i.updated_at,
  }))

  return NextResponse.json({ integrations: result })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json() as {
    type: string
    public_config?: Record<string, unknown>
    secret_config?: Record<string, unknown>
  }

  const { type, public_config = {}, secret_config = {} } = body
  const validTypes = ["stripe", "supabase", "twilio", "openai", "anthropic", "resend", "env"]
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid integration type" }, { status: 400 })
  }

  // Separate public from secret fields — client might send everything together
  const secretFields = SECRET_FIELDS[type] ?? []
  const safePublic: Record<string, unknown>  = { ...public_config }
  const safeSecret: Record<string, unknown>  = { ...secret_config }

  // Strip any secret fields that slipped into public_config
  for (const f of secretFields) delete safePublic[f]

  // Determine status
  const hasSecrets = Object.values(safeSecret).some(v => !!v)
  const status     = hasSecrets ? "active" : "pending"

  const db = createAdminClient()

  // Upsert both tables in parallel
  const [intRes, secRes] = await Promise.all([
    db.from("project_integrations").upsert(
      { project_id: projectId, type, status, public_config: safePublic, updated_at: new Date().toISOString() },
      { onConflict: "project_id,type" }
    ),
    // Only write secret_config if caller provided any values
    Object.keys(safeSecret).length > 0
      ? db.from("project_secrets").upsert(
          { project_id: projectId, type, secret_config: safeSecret, updated_at: new Date().toISOString() },
          { onConflict: "project_id,type" }
        )
      : Promise.resolve({ error: null }),
  ])

  if (intRes.error) {
    return NextResponse.json({ error: intRes.error.message }, { status: 500 })
  }
  if (secRes.error) {
    return NextResponse.json({ error: secRes.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status })
}
