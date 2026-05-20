# SpringBloom — Session Handoff

> **READ THIS FIRST** on every new session. This is the authoritative state of the project.
> Last updated: 2026-05-19

---

## What This Project Is

SpringBloom is an AI-powered no-code web/mobile builder — similar to Lovable.dev, bolt.new, Emergent.sh, Base44.
Users describe an app in plain English and get a live, working, deployable app.

**Stack:** Next.js 16 (App Router), TypeScript strict, React 19, Tailwind CSS, shadcn/ui,
Supabase (auth + DB), Fly.io (machines for live preview), Cloudflare Pages (publish target),
Stripe (billing), Vercel (platform deployment), pnpm.

---

## Current Build State

### Completed Phases

| Phase | What | Status |
|-------|------|--------|
| 1–9 | Full UI/UX (mock data) — landing, auth, dashboard, builder, settings | ✅ |
| 10 | Platform Supabase schema + real auth | ✅ |
| 11 | AI streaming (Anthropic + OpenAI + Google via Vercel AI SDK v5) | ✅ |
| 11b | Mock data cleanup + real Supabase data in UI | ✅ |
| 12 | Fly.io machine integration + live preview | ✅ |
| 13 | Supabase auto-provisioning per user (webhook) | ✅ |
| 14 | Credits + Stripe billing (one-time packs + subscriptions) | ✅ |
| 15 | Security hardening, error boundaries, middleware, rate limiting | ✅ |
| 16 | Subscription billing (Stripe webhooks, plan management) | ✅ |
| 17 | Publish pipeline (Cloudflare Pages Direct Upload, PublishModal UI) | ✅ |
| Codex P0–P2 | All 16 security/billing/UX findings fixed | ✅ |

### Key Security Fixes (Codex — commit 7392ba5)
- Atomic credit hold via `place_credit_hold()` Postgres RPC (migration 010)
- RLS hardening: credit_transactions write-locked, profiles privileged columns guarded (migration 011)
- `plan_reset` added to credit type CHECK constraint (migration 012)
- `supabase_service_key` moved from profiles → `user_secrets` table, zero-policy RLS (migration 013)
- `cancelHold()` added — orphaned holds cleaned up on stream error
- `onError` handler on streamText cancels hold + marks run failed
- Per-user rate limiting wired into `/api/chat`
- Billing checkout payload fixed, "Upgrade to Pro" uses subscription not credit pack

### Production Database
All 13 migrations (001–013) are applied and verified in production. ✅

### TypeScript
Zero errors confirmed. ✅

---

## Git State

- HEAD: `786dd26` — gitignore updated (.claude/worktrees and lock files)
- Previous: `7392ba5` — all Codex P0–P2 fixes
- All changes committed and clean
- Remote: https://github.com/suntay44/nocode_web_and_website_builder

**Project location:** `~/Projects/nocode_web_and_website_builder`
(Moved from Desktop to avoid iCloud dataless issues)

---

## Immediate Pending Tasks (In Order)

### 1. D2 — Deploy to Vercel (USER ACTION)
```bash
pnpm add -D vercel
vercel --prod
```
- Add all env vars from `.env.example` to Vercel project settings
- Add `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_PAGES_PROJECT_NAME`
- Build command: `pnpm build`, output: `.next`

### 2. D3 — Post-deploy verification (USER ACTION)
- Auth flow works end-to-end
- AI streaming works in builder
- Stripe webhook receives events
- Lighthouse > 90 on landing page
- `curl -I https://your-domain.com | grep -E "X-Frame|Content-Security|Strict-Transport"`

### 3. Phase 19 — Generation Intelligence Layer (NEXT CODE SPRINT)
See full spec below.

### 4. Phase 20 — Internal Admin Dashboard (`/backend-admin`)
Full spec in `PLAN.md`. Covers:
- User search + detail (projects, credit ledger, prompt history)
- Library management UI (promote/demote template clusters, edit scaffold modules)
- 3rd-party settings panel (Supabase, Fly, Cloudflare, Stripe, AI model defaults, rate limits)
- `is_admin` boolean on profiles (service-role-only write, guarded by trigger)
- New `platform_settings` key-value table (service-role only, no RLS policies)
- All admin API routes re-verify `is_admin` server-side on every request

---

## Phase 19 — Generation Intelligence Layer

This is the next implementation phase. Full architecture designed and agreed.

### Part A — Prompt Enhancer

Two separate enhancers — Web and Mobile are fundamentally different:

**Web Enhancer knows:**
- Responsive breakpoints (375px / 768px / 1280px)
- Desktop + tablet + mobile views
- Browser APIs, SEO, hover states
- Next.js App Router patterns

**Mobile Enhancer knows:**
- Native navigation patterns (bottom tabs vs stack navigator)
- Device APIs (camera, GPS, push notifications)
- Touch gestures, swipe actions
- Expo / React Native / Capacitor conventions
- App store considerations

**What both enhancers do:**
1. Classify prompt as web or mobile
2. Expand vague prompt into precise technical spec BEFORE generation
3. Ask 2–3 clarifying questions if prompt is too vague
4. Extract ONLY explicitly requested features — nothing assumed or added
5. Wire project brief answers (already collected, currently thrown away) into system prompt

### Part B — The Library System (self-building intelligence)

**Mental model: A library of Books with a Table of Contents**

```
BOOK = Base Template
  e.g. "List-Based Task Manager", "Social Feed App", "Commerce Store"
  → proven file structure, state pattern, component architecture
  → NOT content, colors, or specifics — just the proven bones

TABLE OF CONTENTS = available Micro-Modules
  [Auth] [Inbox] [Profile] [Payments] [Feed] [Search] [Settings] [Dashboard]
  each module: self-contained, independently proven, plugs into any Book

CHAPTER = a single Micro-Module
  has own proven file scaffold, versioned, reusable across Books
```

**Critical design rules:**
- ZERO templates on launch day — earned from real usage, never assumed
- Templates emerge when 10+ users independently produce the same structural pattern
- Modules EXTRACTED from successful builds, NOT hand-crafted (Auth is the only exception)
- Explicit-only composition: user said "Inbox" → add Inbox. Nothing else.
- New builds either REINFORCE / UPGRADE / CREATE NEW candidates
- Promotion threshold: ≥10 builds + ≥3 different app types + avg success score >70

**Structural fingerprinting (how similarity is detected):**
```json
{
  "ui_patterns":  ["list-view", "item-toggle", "add-form"],
  "data_shape":   ["id", "text", "boolean-state", "timestamp"],
  "operations":   ["create", "read", "toggle", "delete"],
  "navigation":   "single-screen",
  "persistence":  "local-storage"
}
```
"TODO app for household chores" and "Grocery checklist app" → same fingerprint → same cluster → Template A

**Cold start (Day 0):**
- Library empty by design
- Part A (Enhancer) provides value immediately
- Fingerprinting silently collects every build
- ~Day 200: first templates go canonical, Composer activates

**Scaling:**
- 10 users: Enhancer alone. Silent data collection.
- 10K: First real templates. Visible quality jump.
- 100K: Need pgvector for retrieval. Template versioning for staleness.
- 1M: Library is the moat. Competitors can't replicate without the data.

### DB Schema Needed for Phase 19

```sql
-- New tables required:
app_builds              -- fingerprint + success signals for every build
template_clusters       -- groups of similar builds
scaffold_templates      -- promoted canonical templates (Books)
scaffold_modules        -- proven micro-modules (Chapters)
project_secrets         -- per-project secrets (supabase service key, etc.)
```

---

## Per-Project Supabase Fix (Phase 19 Prerequisite)

**Current (wrong):** Supabase credentials on `profiles` — ONE per user, all projects share same DB.
**Correct:** Supabase credentials on `projects` — each project gets its own Supabase connection.

**Two modes per project:**
```
Option A — Platform Managed (default):
  Auto-provision a fresh Supabase project when project is created with backend
  Stored on projects table

Option B — Bring Your Own Supabase:
  User provides: Project URL + Anon Key (+ optionally Service Role Key)
  Stored on projects table — same columns, different source
  Injected into Fly machine identically to managed
```

**Files to update:**
- New migration: add supabase columns to `projects`, create `project_secrets`, remove from `profiles`
- `app/api/webhooks/user-created/route.ts` → remove Supabase provisioning (wrong trigger)
- New route: `app/api/projects/[id]/provision-supabase/route.ts`
- `app/api/fly/machine/route.ts` → read creds from `projects` not `profiles`

---

## Architecture Decisions Already Made

| Decision | Choice |
|----------|--------|
| AI artifact format | `<boltArtifact>` XML tags (in system prompt, parsed by artifact-parser.ts) |
| Credit model | Hold → finalize → deduct (atomic, no double-charge) |
| Service key storage | `user_secrets` zero-policy RLS table |
| Rate limiting | Upstash Redis per-user (wired into /api/chat) |
| Publish target | Cloudflare Pages Direct Upload v2 |
| Machine build timeout | 300s (execOnMachine timeoutSec param) |
| Template discovery | Emergent — zero on day 0, earned from usage |
| Module authoring | Extract from builds (Auth hand-written only) |
| Multi-agent flow | PM → Developer → QA for all implementation sprints |

---

## Hard Rules (Always Apply)

1. Never `supabase.auth.getSession()` server-side — always `getUser()`
2. No frontend credit changes — server-side only
3. RLS on every new table — zero-policy for secrets tables
4. Service role key is server-only — never in client components
5. Fly.io API token is server-only — all Fly calls through API routes
6. `pnpm exec tsc --noEmit --pretty false` must exit 0 after every change
7. Spinner on all async form actions
8. Machine provisioning is idempotent
9. No stack traces exposed to client — sanitized errors only
10. DB writes are atomic — never partial writes on failure

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/ai/system-prompt.ts` | 3-layer security + quality + context prompt |
| `lib/ai/artifact-parser.ts` | Parses `<boltArtifact>` XML from AI stream |
| `lib/fly/action-runner.ts` | Applies AI artifact actions to Fly machine |
| `lib/fly/client.ts` | Fly Machines API + readFileAsBase64 + listDistFiles |
| `lib/cloudflare/client.ts` | Cloudflare Pages Direct Upload v2 |
| `lib/credits/calculate.ts` | Hold / finalize / cancelHold credit lifecycle |
| `app/api/chat/route.ts` | Main AI streaming endpoint |
| `app/api/publish/route.ts` | Full publish pipeline |
| `supabase/migrations/` | 001–013 (all applied in production ✅) |
| `docs/deploy/PRODUCTION_MIGRATIONS.md` | Migration runbook (all done, keep for reference) |
| `tasks.md` | Full task checklist |
| `PLAN.md` | Full architecture plan (includes Phase 18 Stripe Sandboxes) |

---

## Environment Variables

See `.env.local` (exists, not committed to git).

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Platform DB |
| `SUPABASE_SERVICE_ROLE_KEY` | Platform DB admin |
| `SUPABASE_MANAGEMENT_TOKEN` | Provision user Supabase projects |
| `ANTHROPIC_API_KEY` | Primary AI model |
| `FLY_API_TOKEN` | Machine management |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_PAGES_PROJECT_NAME` | Publish |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Billing |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `WEBHOOK_SECRET` | user-created webhook auth |

---

## How to Start a New Session

```bash
# 1. Open Claude Code in this folder
claude .

# 2. Say:
"Read HANDOFF.md and let's continue with Phase 19"

# 3. The agent will:
#    - Confirm git + typecheck are clean
#    - Start PM → Dev → QA flow for Phase 19
#    - Per-project Supabase fix first (prerequisite)
#    - Then Prompt Enhancer (Web + Mobile)
#    - Then Library System foundation
```
