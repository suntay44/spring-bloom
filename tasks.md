# SpringBloom — Task List

> **How to use**: Work tasks top-to-bottom within each phase. Mark done by changing `[ ]` to `[x]`.
> After each phase run `pnpm typecheck` and verify dev server renders correctly before moving on.
> All paths are relative to the project root.
>
> **Status**: Phases 1–17 scaffold complete and verified. `pnpm build` passes clean. Zero TypeScript errors.
> **Current**: Phase 16 (Subscription Billing) + Phase 17 scaffold done. Next = Deployment.

---

## ── COMPLETED ── Phases 1–9 (UI/UX — mock data)

All frontend UI phases complete. UI/UX gate accepted. Not re-opened.

- Phase 1: Project Bootstrap ✅
- Phase 2: Homepage + Pricing ✅
- Phase 3: Auth Pages ✅
- Phase 4: Dashboard ✅
- Phase 5: Prompt-First Creation Screen ✅
- Phase 6: 5-Question Project Brief ✅
- Phase 7: PRD + Build Plan Approval ✅
- Phase 8: Builder View (mock data) ✅
- Phase 8.5: Programmer Command Center ✅
- Phase 9: Settings Page ✅
- Phase F/G/J/H/I: Code review, project type, shadcn migration, interactivity, E2E gate ✅

---

## ── COMPLETED ── Phase 10 — Platform Supabase Schema + Real Auth

- [x] `@supabase/supabase-js` + `@supabase/ssr` installed
- [x] `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server)
- [x] `middleware.ts` with protected paths + auth redirects (restored in Phase 15 QA)
- [x] All DB schema tables in production Supabase (profiles, projects, messages, agent_runs, model_pricing, credit_transactions, review_runs, review_findings, security_scans, security_findings, analytics_events, project_snapshots)
- [x] `user_credit_balance` view with `security_invoker = true`
- [x] `handle_new_user()` trigger — auto-creates profile + 5 credit signup bonus
- [x] Real Supabase Auth (signup/login/logout)
- [x] `GET /api/models` returns live model list from `model_pricing` table

---

## ── COMPLETED ── Phase 11 — AI Streaming (Anthropic + OpenAI + Google)

- [x] `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `ai` installed
- [x] `lib/ai/providers.ts` — `resolveModel()` registry
- [x] `lib/ai/system-prompt.ts` — 3-layer security + quality + dynamic context prompt
- [x] `lib/ai/artifact-parser.ts` — `parseArtifacts()`, `hasArtifact()`, `extractPreamble()`
- [x] `lib/ai/context-manager.ts` — 8-message verbatim window
- [x] `lib/ai/credit-estimator.ts` — heuristic estimate
- [x] `lib/credits/calculate.ts` — `getBalance()`, `holdCredits()`, `finalizeCredits()`
- [x] `app/api/chat/route.ts` — auth → rate limit → project → model → credit check → hold → stream → finalize
- [x] `ChatPanel.tsx` — `useChat()` with `DefaultChatTransport`, real send/stream/stop
- [x] Credit hold → deduct → refund cycle verified
- [x] `agent_runs` status updated to `completed` with token counts

---

## ── COMPLETED ── Phase 11b — Mock Data Cleanup + UI Fixes

- [x] Dashboard: real Supabase project fetch
- [x] Settings page: server component fetching real profile + balance + transactions
- [x] `BillingSection.tsx` — real balance/stats/transaction history
- [x] `ModelPicker` — two-level dropdown (provider → models), real provider logos
- [x] Pricing plan data corrected in `lib/mock/data.ts` to match PRICING.md

---

## ── COMPLETED ── Phase 12 — Fly.io Machine + Live Preview

- [x] `supabase/migrations/002_fly_machine_columns.sql` — `fly_machine_id` + `fly_machine_status`
- [x] `lib/fly/client.ts` — full Machines API wrapper
- [x] `app/api/fly/machine/route.ts` — provision or start existing machine (idempotent)
- [x] All 5 `[machineId]` sub-routes: start / stop / status / files / exec
- [x] IDOR prevention: all machine routes verify ownership via `projects` table
- [x] `lib/fly/action-runner.ts` — applies AI artifact actions to the machine
- [x] `hooks/useMachineProvisioner.ts` — client hook for machine lifecycle
- [x] `ChatPanel.tsx` — runs ActionRunner after stream completes
- [x] `PreviewPanel.tsx` — live iframe when machine ready, fallback to mock
- [x] `FilesPanel.tsx` — real file tree from machine
- [x] All Fly sub-routes wrapped in try/catch (Phase 15 QA)
- [x] Rate limiting on exec/files routes (Phase 15 QA)

---

## ── COMPLETED ── Phase 13 — Supabase Auto-Provisioning

- [x] `lib/supabase/management.ts` — Management API client
- [x] `lib/supabase/base-schema.ts` — Base SQL for generated apps
- [x] `app/api/webhooks/user-created/route.ts` — provisions user Supabase project on signup
- [x] `app/api/user/supabase-status/route.ts` — polling endpoint for provisioning state
- [x] Supabase env vars injected into Fly machine on builder open
- [x] `profiles` table: `supabase_project_ref`, `supabase_project_url`, `supabase_anon_key`, `supabase_service_key`, `supabase_status` columns added
- [x] Project name prefix updated: `sb-{userId}` (was `wc-`)

---

## ── COMPLETED ── Phase 14 — Credits + Stripe Billing

- [x] `profiles.stripe_customer_id` column added
- [x] `lib/stripe/client.ts` — server-only Stripe singleton + `CREDIT_PACKS`
- [x] `app/api/credits/checkout/route.ts` — Stripe Checkout session (wrapped in try/catch)
- [x] `app/api/credits/portal/route.ts` — Stripe Customer Portal (wrapped in try/catch)
- [x] `app/api/webhooks/stripe/route.ts` — `checkout.session.completed` → credit grant
  - Fixed: `type: 'grant'` → `'purchase'` (schema constraint)
  - Idempotency: unique constraint on `stripe_session_id` (migration 006)
  - Returns 500 on insert failure so Stripe retries
- [x] `BillingSection.tsx` — real buy/portal buttons, success/cancelled toasts
- [x] Plan enforcement in `/api/chat` — model gate by user plan tier
- [x] `supabase/migrations/005_monthly_credit_reset.sql` — pg_cron monthly reset
- [x] Low-credit banner in `AppShell.tsx` (< 10 credits → amber warning)
- [x] `lib/credits/limits.ts` — single source of truth for plan credit limits

---

## ── COMPLETED ── Phase 15 — Final Polish + Security Hardening

- [x] `middleware.ts` restored — Supabase SSR session refresh + auth guard on /dashboard, /settings, /project/*
- [x] `app/error.tsx`, `app/(app)/error.tsx`, `app/(builder)/error.tsx` — error boundaries with min-h-screen
- [x] `app/not-found.tsx` — custom 404 page
- [x] Security headers in `next.config.ts` — COOP, COEP (credentialless), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy
- [x] Rate limiting on `/api/chat` (Upstash, 10 req/min per user, prefix `sb:chat`)
- [x] Rate limiting on Fly exec/files routes (30 req/min, prefix `sb:machine`)
- [x] Auth guard added to `/api/models`
- [x] Stub API routes return 501 Not Implemented (was silent `{ data: null }`)
- [x] `pnpm build` — zero errors ✅
- [x] `pnpm typecheck` — zero errors ✅
- [x] Builder page: `notFound()` → `redirect('/login')` on auth failure
- [x] ChatPanel: 401-specific "session expired" toast with login CTA
- [x] Credit hold refunded on stream failure/abort
- [x] Fly machine restart: 404-only fallthrough to create new machine
- [x] Duplicate Fly machine prevention on transient errors
- [x] `supabase/migrations/006_stripe_session_id_unique.sql` — UNIQUE on `stripe_session_id`
- [x] PLAN_LABELS fixed in BillingSection (starter/teams, removed invalid agency)
- [x] Pricing data corrected in `lib/mock/data.ts`
- [x] `console.log` removed from production code
- [x] Graphify knowledge graph generated (481 nodes, 842 edges, 25 communities)
- [x] `GRAPH_REPORT.md` generated
- [x] Brand rename: Wild Cupcake → SpringBloom across entire codebase

---

## ── NEXT ── Deployment

### D1 — Run migration 006 in production Supabase

- [ ] In Supabase SQL editor (production project):
  ```sql
  ALTER TABLE public.credit_transactions
    ADD CONSTRAINT credit_transactions_stripe_session_id_unique
    UNIQUE (stripe_session_id);
  ```

### D2 — Vercel deployment (current)

> Note: Cloudflare Pages is obsolete/replaced. SpringBloom platform now deploys to Vercel.

- [ ] Install Vercel CLI: `pnpm add -D vercel`
- [ ] Run `vercel --prod` or connect GitHub repo to Vercel dashboard
- [ ] Add all env vars from `.env.example` to Vercel project settings
- [ ] Set build command: `pnpm build`, output dir: `.next`
- [ ] Enable Edge middleware: automatic with Next.js (no extra config needed)

### D3 — Post-deploy verification

- [ ] `/` loads — landing page renders
- [ ] `/login` → `/signup` → email confirm → `/dashboard` flow works
- [ ] `/dashboard` → create project → builder opens
- [ ] Builder sends chat → AI streams → machine provisioned
- [ ] Settings → buy credits → Stripe Checkout → webhook → balance updates
- [ ] `curl -I https://your-domain.com | grep -E "X-Frame|Content-Security-Policy|Strict-Transport"`
- [ ] Lighthouse score > 90 on landing page
- [ ] Stripe webhooks configured in Stripe dashboard pointing to `https://your-domain.com/api/webhooks/stripe`
- [ ] Subscription prices created in Stripe and IDs copied to `STRIPE_PRICE_STARTER_ID`, `STRIPE_PRICE_PRO_ID`, `STRIPE_PRICE_TEAMS_ID` env vars

---

## ── PHASE 17 ── Publish & Custom Domains (Cloudflare)

> Scaffold in place. Full implementation pending.

### P17-1 — DB + API scaffold ✅ (done in Wave 2)
- [x] Migration 008: projects.published_url, published_at, custom_domain, cloudflare_deployment_id, publish_slug
- [x] lib/cloudflare/client.ts — Pages API + custom hostname wrapper
- [x] app/api/publish/route.ts — stub (501) with auth + ownership check

### P17-2 — Build + Deploy pipeline
- [ ] Get files from Fly machine via /api/fly/machine/[id]/files
- [ ] Run build command in Fly machine (npm run build)
- [ ] Upload dist/ to Cloudflare Pages via Direct Upload API
- [ ] Store cloudflare_deployment_id + published_url in projects table
- [ ] Return { url: 'https://{slug}.springbloom.app' }

### P17-3 — Publish UI
- [ ] "Publish" button in builder toolbar
- [ ] Publish progress modal (3 steps: Building → Uploading → Live)
- [ ] Show published URL with copy button after success
- [ ] "Unpublish" to clear published_url

### P17-4 — Custom Domains
- [ ] Custom domain input in project settings
- [ ] Add via Cloudflare for SaaS API (addCustomHostname)
- [ ] DNS verification instructions shown to user
- [ ] CNAME {slug}.springbloom.app as fallback

---

## ── PHASE 16 ── Subscription Billing ✅ (complete)

- [x] `supabase/migrations/007_subscription_columns.sql` — `subscription_id`, `subscription_status`, `plan_period_end` on profiles
- [x] `lib/stripe/client.ts` — `SUBSCRIPTION_PRICES` map, `PLAN_MONTHLY_CREDITS`, `planFromPriceId()` helper
- [x] `app/api/credits/checkout/route.ts` — discriminated union: `type:'pack'` (one-time) | `type:'subscription'` (recurring)
- [x] `app/api/webhooks/stripe/route.ts` — handlers for `customer.subscription.created/updated/deleted` + `invoice.paid` (idempotent credit grants)
- [x] `profiles.plan` is now set by subscription webhooks (was never written before)

---

## ── POST-LAUNCH BACKLOG ──

These are identified improvements for after initial deployment:

| Priority | Feature | Why |
|----------|---------|-----|
| High | OpenGraph images | Social sharing previews for landing + pricing |
| High | Loading skeletons in dashboard + builder | Better perceived performance |
| Medium | `estimate.estimate` credit guard (not `estimate.min`) | Prevents negative balances |
| Medium | IP-level rate limit before auth check | Prevents credential stuffing |
| Medium | Analytics event tracking | Platform events for onboarding, project creation, credit spend |
| Low | Encrypt `supabase_service_key` at rest | Currently stored plaintext in profiles |
| Low | Credit pack prices single source of truth | Duplicated in BillingSection + lib/stripe/client.ts |
| Low | Error boundaries show digest in prod, not raw message | Security best practice |

---

## ── HARD RULES (always apply) ──

1. Never call `supabase.auth.getSession()` server-side — always `supabase.auth.getUser()`
2. No frontend credit changes — deduction happens server-side only
3. No mock data imports in real pages — `lib/mock/*` is UI-dev only
4. RLS on every table — every `create table` followed by `enable row level security`
5. Service role key is server-only — never in client components
6. Fly.io API token is server-only — all Fly calls through Next.js API routes
7. Run `pnpm typecheck` after each task
8. Spinner on all async form actions
9. Machine provisioning is idempotent — start existing, don't duplicate
