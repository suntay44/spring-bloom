# SpringBloom — Local → Production Launch Checklist

> Work top-to-bottom. Each section must be ✅ complete before moving to the next.
> Legend: ✅ Done · ⏳ In progress · ☐ Not started

---

## 1. Environment Variables

### Local `.env.local` — current state
| Variable | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | Platform DB |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | Platform DB |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | Server-only |
| `SUPABASE_MANAGEMENT_TOKEN` | ✅ Set | Phase 13 |
| `SUPABASE_ORG_ID` | ✅ Set | Phase 13 |
| `ANTHROPIC_API_KEY` | ✅ Set | Claude |
| `OPENAI_API_KEY` | ✅ Set | GPT |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ Set | Gemini |
| `FLY_API_TOKEN` | ✅ Set | Machines |
| `FLY_ORG_SLUG` | ✅ Set | Machines |
| `FLY_APP_NAME` | ✅ Set | Machines |
| `UPSTASH_REDIS_REST_URL` | ✅ Set | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ Set | Rate limiting |
| `STRIPE_SECRET_KEY` | ✅ Set | Billing (test key?) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ Set | Billing (test key?) |
| `STRIPE_WEBHOOK_SECRET` | ✅ Set | Billing |
| `NEXT_PUBLIC_APP_URL` | ✅ Set | App base URL |
| `WEBHOOK_SECRET` | ✅ Set | Supabase Auth webhook |

### Production — must add to Cloudflare Pages / Vercel env vars
- [ ] All variables above copied to production environment
- [ ] `STRIPE_SECRET_KEY` → swap to **live** key (`sk_live_...`) before launch
- [ ] `STRIPE_PUBLISHABLE_KEY` → swap to **live** key (`pk_live_...`) before launch
- [ ] `NEXT_PUBLIC_APP_URL` → set to production domain (e.g. `https://springbloom.app`)
- [ ] `STRIPE_WEBHOOK_SECRET` → re-generate from Stripe dashboard using production webhook URL
- [ ] Verify no env var is prefixed `NEXT_PUBLIC_` unless it's intentionally public

---

## 2. Supabase Platform Database

### Migrations (run in Supabase SQL editor — production project)
- [ ] `001_initial_schema.sql` — all platform tables + RLS + triggers
- [ ] `002_fly_machine_columns.sql` — `fly_machine_id`, `fly_machine_status` on `projects`
- [ ] Phase 13 migration — `supabase_project_ref`, `supabase_project_url`, `supabase_anon_key`, `supabase_service_key`, `supabase_status` on `profiles`
- [ ] `user_credit_balance` view exists with `security_invoker = true`
- [ ] `handle_new_user()` trigger fires on `auth.users` INSERT (auto-creates profile + 5 credit signup bonus)
- [ ] All tables have RLS enabled — verify with: `select tablename, rowsecurity from pg_tables where schemaname = 'public'`
- [ ] Seed `model_pricing` table with all active models + credit rates

### Auth configuration (Supabase Dashboard → Authentication)
- [ ] Email confirmation enabled
- [ ] Email templates customized with SpringBloom branding (sender name, logo, colors)
- [ ] Redirect URLs allowlist includes production domain:
  - `https://springbloom.app/**`
  - `https://springbloom.app/auth/callback`
- [ ] **Supabase Auth webhook registered** (Phase 13 Task 13.5):
  - Event: `auth.users` INSERT
  - URL: `https://springbloom.app/api/webhooks/user-created`
  - Header: `x-webhook-secret: {WEBHOOK_SECRET value}`
- [ ] Password requirements configured (min 8 chars)
- [ ] Rate limiting on auth endpoints enabled

---

## 3. Fly.io

- [ ] Fly app created: `fly apps create {FLY_APP_NAME}`
- [ ] Org deploy token generated and set as `FLY_API_TOKEN`
- [ ] Fly app is in the correct region (pick closest to Supabase region for low latency)
- [ ] Machine base image works: `node:20-slim` boots and accepts exec commands
- [ ] **Auto-stop configured** — machines suspend after 5 min idle (set in Fly dashboard or `fly.toml`):
  ```toml
  [http_service]
    auto_stop_machines = "suspend"
    auto_start_machines = true
    min_machines_running = 0
  ```
- [ ] Verify machines stop when builder tab closes (check Fly dashboard after test)
- [ ] Verify machines wake within ~2s when builder reopens

---

## 4. Stripe Billing

- [ ] Stripe account created and verified (business details submitted)
- [ ] **Test mode** fully working end-to-end before switching to live
- [ ] Credit top-up products created in Stripe dashboard:
  - 100 credits → $17
  - 250 credits → $40
  - 500 credits → $80
  - 1,000 credits → $150
- [ ] Stripe Checkout configured (one-time payment, not subscription for top-ups)
- [ ] Subscription products created for plans:
  - Free: $0/month — 100 credits
  - Starter: $16/month — 500 credits
  - Pro: $20/month — 1,500 credits
  - Teams: $60/month — 5,000 credits
- [ ] Webhook endpoint registered in Stripe dashboard:
  - URL: `https://springbloom.app/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] `STRIPE_WEBHOOK_SECRET` updated with the signing secret from the webhook
- [ ] **Switch to live keys** (`sk_live_...` / `pk_live_...`) only when ready to accept real payments
- [ ] Stripe Customer Portal configured (for plan management + payment method updates)

---

## 5. AI Providers

- [ ] Anthropic API key has sufficient quota for production traffic
- [ ] OpenAI API key has sufficient quota
- [ ] Google AI API key has sufficient quota
- [ ] Rate limits set in Upstash Redis:
  - `/api/chat` — 10 requests/min per user
  - `/api/fly/machine/*/exec` — 30 requests/min per user
- [ ] Verify Upstash Redis instance is in a region close to your deployment

---

## 6. Platform App Deployment (Cloudflare Pages)

- [ ] `pnpm build` succeeds locally with zero TypeScript errors
- [ ] `pnpm typecheck` — zero errors
- [ ] All Phase 12 and 13 SQL migrations run on production Supabase
- [ ] Connect GitHub repo to Cloudflare Pages
- [ ] Build command: `pnpm build`
- [ ] Output directory: `.next`
- [ ] Add `@cloudflare/next-on-pages` adapter (Phase 15):
  ```bash
  pnpm add @cloudflare/next-on-pages
  ```
- [ ] **COOP/COEP headers** configured in `public/_headers` or `next.config.ts`:
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- [ ] Security headers added to `next.config.ts` (Phase 15):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
- [ ] Custom domain pointed to Cloudflare Pages (DNS CNAME)
- [ ] HTTPS enforced (Cloudflare handles this automatically)
- [ ] Preview deployments disabled for `main` branch (or locked to team only)

---

## 7. Security Pre-Launch

- [ ] Run `pnpm audit` — no critical or high vulnerabilities
- [ ] No API keys or secrets in git history (`git log -p | grep -E "sk_|sbp_|fo1_"`)
- [ ] `.env.local` is in `.gitignore`
- [ ] All Fly.io machine routes have ownership verification (✅ done in Phase 12 audit)
- [ ] `supabase_service_key` is never returned to the client
- [ ] `/api/webhooks/*` routes validate `x-webhook-secret` before processing
- [ ] Stripe webhook validates `stripe-signature` header (add in Phase 14)
- [ ] Security headers verified with: `curl -I https://springbloom.app`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never appears in client bundles: `grep -r "SERVICE_ROLE" .next/`

---

## 8. Performance + Quality

- [ ] `pnpm build` output — check for oversized bundles (warn at >250kb per route)
- [ ] Lighthouse score on landing page > 90 (run in Chrome DevTools)
- [ ] All pages have loading skeletons (no layout shift on data fetch)
- [ ] Error boundaries on all async components
- [ ] 404 page exists (`app/not-found.tsx`)
- [ ] Error page exists (`app/error.tsx`)
- [ ] All images have `width` + `height` or use Next.js `<Image>`
- [ ] No `console.log` left in production code: `grep -r "console.log" app/ lib/ components/ --include="*.ts" --include="*.tsx"`

---

## 9. End-to-End Smoke Test (run before every production deploy)

- [ ] Land on homepage → looks correct on mobile + desktop
- [ ] Sign up with a new email → confirmation email received
- [ ] Email confirm → redirected to dashboard
- [ ] Supabase project provisioned within 2 min (check `profiles.supabase_status = 'ready'`)
- [ ] Create a new project → builder opens
- [ ] Fly machine provisions → "Warming up..." spinner appears → machine ready
- [ ] Send prompt: "Create a hello world Next.js page" → AI streams → files written to machine
- [ ] FilesPanel shows the generated file
- [ ] Credit balance deducted correctly
- [ ] Switch model → send another prompt → works
- [ ] Open Settings → balance shown correctly, transaction history present
- [ ] Sign out → redirected to login
- [ ] Sign back in → project still exists, machine ID preserved

---

## 10. Launch Day Sequence

1. [ ] Run all DB migrations on production Supabase
2. [ ] Set all production env vars in Cloudflare Pages
3. [ ] Register Stripe production webhook
4. [ ] Register Supabase Auth webhook
5. [ ] Swap Stripe to live keys
6. [ ] Deploy to Cloudflare Pages (`main` branch push)
7. [ ] Run full smoke test on production URL
8. [ ] Verify Fly.io machines boot correctly on production
9. [ ] Verify Supabase provisioning webhook fires on a test signup
10. [ ] Monitor Cloudflare Pages logs + Supabase logs for 30 min
11. [ ] 🚀 Share the link

---

## Remaining Phases Before Launch

| Phase | Status | Blocks launch? |
|---|---|---|
| Phase 12 — Fly.io machines | ✅ Done | — |
| Phase 13 — Supabase auto-provisioning | ⏳ In progress | Yes |
| Phase 14 — Credits + Stripe billing | ☐ Not started | Yes |
| Phase 15 — Polish + security headers | ☐ Not started | Yes |
