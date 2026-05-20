import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"
import { SettingsEditor } from "@/components/admin/SettingsEditor"
import { HealthCheckPanel } from "@/components/admin/HealthCheckPanel"

export default async function AdminSettingsPage() {
  await requireAdminPage()
  const db = createAdminClient()

  const { data: settings } = await db
    .from("platform_settings")
    .select("key, value, updated_at")
    .order("key")

  // Seed default settings if table is empty
  const resolved = settings ?? []

  if (resolved.length === 0) {
    const defaults = [
      { key: "ai.default_model_free",    value: "claude-haiku-4-5" },
      { key: "ai.default_model_starter", value: "claude-sonnet-4-5" },
      { key: "ai.default_model_pro",     value: "claude-sonnet-4-5" },
      { key: "ai.default_model_teams",   value: "claude-opus-4-5" },
      { key: "rate_limit.free_rpm",      value: 3 },
      { key: "rate_limit.starter_rpm",   value: 10 },
      { key: "rate_limit.pro_rpm",       value: 30 },
      { key: "rate_limit.teams_rpm",     value: 60 },
      { key: "credits.free_monthly",     value: 50 },
      { key: "credits.starter_monthly",  value: 500 },
      { key: "credits.pro_monthly",      value: 2000 },
      { key: "credits.teams_monthly",    value: 10000 },
    ]
    await db.from("platform_settings").upsert(defaults, { onConflict: "key" })
    const { data: seeded } = await db
      .from("platform_settings")
      .select("key, value, updated_at")
      .order("key")
    resolved.push(...(seeded ?? []))
  }

  return (
    <div className="p-6 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500">Platform configuration and service health</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Platform Config</h2>
        <SettingsEditor settings={resolved} />
      </section>

      <div className="border-t border-zinc-800 pt-8">
        <HealthCheckPanel />
      </div>
    </div>
  )
}
