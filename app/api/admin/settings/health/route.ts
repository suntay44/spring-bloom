import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/require-admin"
import { createAdminClient } from "@/lib/supabase/admin"

type Service = "supabase" | "fly" | "stripe" | "anthropic" | "cloudflare" | "upstash"

export async function POST(req: Request) {
  const result = await requireAdminApi()
  if ("error" in result) return result.error

  const { service } = await req.json() as { service: Service }

  try {
    switch (service) {
      case "supabase": {
        const db = createAdminClient()
        const { error } = await db.from("platform_settings").select("key").limit(1)
        if (error) throw new Error(error.message)
        return NextResponse.json({ ok: true, latencyMs: 0 })
      }

      case "fly": {
        const start = Date.now()
        const res = await fetch("https://api.machines.dev/v1/apps", {
          headers: { Authorization: `Bearer ${process.env.FLY_API_TOKEN}` },
        })
        if (!res.ok) throw new Error(`Fly API: ${res.status} ${res.statusText}`)
        return NextResponse.json({ ok: true, latencyMs: Date.now() - start })
      }

      case "stripe": {
        const start = Date.now()
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        })
        if (!res.ok) throw new Error(`Stripe API: ${res.status}`)
        return NextResponse.json({ ok: true, latencyMs: Date.now() - start })
      }

      case "anthropic": {
        const start = Date.now()
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key":         process.env.ANTHROPIC_API_KEY ?? "",
            "anthropic-version": "2023-06-01",
          },
        })
        if (!res.ok) throw new Error(`Anthropic API: ${res.status}`)
        return NextResponse.json({ ok: true, latencyMs: Date.now() - start })
      }

      case "cloudflare": {
        const start = Date.now()
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`,
          { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } }
        )
        const json = await res.json() as { success: boolean }
        if (!json.success) throw new Error("Cloudflare auth failed")
        return NextResponse.json({ ok: true, latencyMs: Date.now() - start })
      }

      case "upstash": {
        const start = Date.now()
        const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        })
        if (!res.ok) throw new Error(`Upstash: ${res.status}`)
        return NextResponse.json({ ok: true, latencyMs: Date.now() - start })
      }

      default:
        return NextResponse.json({ error: "Unknown service" }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    })
  }
}
