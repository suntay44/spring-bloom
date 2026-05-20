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

  // Always upsert defaults so new keys are seeded even if the table isn't empty
  const defaults = [
    // AI model defaults per plan
    { key: "ai.default_model_free",          value: "claude-haiku-4-5"  },
    { key: "ai.default_model_starter",       value: "claude-sonnet-4-5" },
    { key: "ai.default_model_pro",           value: "claude-sonnet-4-5" },
    { key: "ai.default_model_teams",         value: "claude-opus-4-5"   },
    // Rate limits (requests per minute per plan)
    { key: "rate_limit.free_rpm",            value: 3   },
    { key: "rate_limit.starter_rpm",         value: 10  },
    { key: "rate_limit.pro_rpm",             value: 30  },
    { key: "rate_limit.teams_rpm",           value: 60  },
    // Monthly credit allocation per plan
    { key: "credits.free_monthly",           value: 50    },
    { key: "credits.starter_monthly",        value: 500   },
    { key: "credits.pro_monthly",            value: 2000  },
    { key: "credits.teams_monthly",          value: 10000 },
    // Billing — used by Cost & Margin analytics
    { key: "billing.usd_per_credit",         value: 0.001 },
    { key: "billing.free_ai_cost_budget_usd",value: 5     },
    // Analytics display preferences
    { key: "analytics.retention_days",       value: 90  },
    { key: "analytics.default_window_days",  value: 30  },
  ]
  await db.from("platform_settings").upsert(defaults, { onConflict: "key", ignoreDuplicates: true })
  const { data: seeded } = await db
    .from("platform_settings")
    .select("key, value, updated_at")
    .order("key")
  if (resolved.length === 0) resolved.push(...(seeded ?? []))
  else {
    // Merge any newly seeded keys not yet in resolved
    const existingKeys = new Set(resolved.map(r => r.key))
    for (const s of seeded ?? []) {
      if (!existingKeys.has(s.key)) resolved.push(s)
    }
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
