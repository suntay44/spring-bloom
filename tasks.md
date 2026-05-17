# Wild Cupcake — Codex Task List

> **How to use**: Work tasks top-to-bottom within each phase. Mark done by changing `[ ]` to `[x]`.
> After each phase run `pnpm typecheck` and verify dev server renders correctly before moving on.
> All paths are relative to the project root.
>
> **Status**: Phases 10, 11, 11b, 12, and 13 complete and verified.
> **Current phase**: Phase 14 — Credits + Stripe Billing

---

## ── COMPLETED ── Frontend Phases (F · G · J · H · I)

All frontend work complete and merged. UI/UX gate accepted.
Do not re-open these phases.

---

## ── COMPLETED ── Phase 10 — Platform Supabase Schema + Real Auth

All tasks complete. Verified in production Supabase project.

**What was done:**
- [x] Installed `@supabase/supabase-js` + `@supabase/ssr`
- [x] Created `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server)
- [x] Created `middleware.ts` with protected paths + auth redirects
- [x] Ran all 11 DB schema blocks in Supabase SQL editor (profiles, projects, messages, agent_runs, model_pricing, credit_transactions, review_runs, review_findings, security_scans, security_findings, analytics_events, project_snapshots, triggers)
- [x] `user_credit_balance` view with `security_invoker = true`
- [x] `handle_new_user()` trigger — auto-creates profile + 5 credit signup bonus
- [x] Removed `MockAuthContext` and `AuthGuard`
- [x] Wired signup/login/logout to Supabase Auth
- [x] Created all API route stubs (projects, messages, agent-runs, credits, models)
- [x] `GET /api/models` returns live model list from `model_pricing` table

---

## ── COMPLETED ── Phase 11 — AI Streaming (Anthropic + OpenAI + Google)

All tasks complete. Verified with real API keys.

**What was done:**
- [x] Installed `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `ai`
- [x] Created `lib/ai/providers.ts` — `resolveModel()` registry, null on missing key
- [x] Created `lib/ai/system-prompt.ts` — 3-layer security + quality + dynamic context prompt
- [x] Created `lib/ai/artifact-parser.ts` — `parseArtifacts()`, `hasArtifact()`, `extractPreamble()`
- [x] Created `lib/ai/context-manager.ts` — 8-message verbatim window, summarize older
- [x] Created `lib/ai/credit-estimator.ts` — heuristic estimate, empty prompt guard
- [x] Created `lib/credits/calculate.ts` — `getBalance()`, `holdCredits()`, `finalizeCredits()`
- [x] Implemented `app/api/chat/route.ts` — auth → project → model → credit check → hold → stream → finalize
- [x] Updated `ChatPanel.tsx` — `useChat()` with `DefaultChatTransport`, real send/stream/stop
- [x] Updated `MessageItem.tsx` — handles `UIMessage` parts array + `MockMessage` union
- [x] Updated `ArtifactCard.tsx` — handles `ParsedArtifact[]` + `MockArtifact[]` union
- [x] Messages saved to Supabase after each turn (user + assistant)
- [x] Credit hold → deduct → refund cycle verified in `credit_transactions`
- [x] `agent_runs` status updated to `completed` with token counts

---

## ── COMPLETED ── Phase 11b — Mock Data Cleanup + UI Fixes

Done manually this session (not by Codex).

**What was done:**
- [x] `app/(app)/dashboard/page.tsx` — real Supabase project fetch, fixed `nativeButton={false}`, fixed routes (`/new` → `/`, `/builder/` → `/project/`)
- [x] `app/(app)/settings/page.tsx` — server component fetching real profile + balance + transactions
- [x] `components/settings/sections/AccountSection.tsx` — real editable name (saves to `profiles.full_name`), real password reset, plan badge
- [x] `components/settings/sections/BillingSection.tsx` — complete redesign: real balance/stats/transaction history, no `MOCK_CREDIT_USAGE`
- [x] `components/settings/SettingsMock.tsx` — accepts and forwards real user/balance props
- [x] `components/builder/ProjectMenu.tsx` — accepts `ProjectMenuUser` props, no `MOCK_USER`
- [x] `components/builder/BuilderMock.tsx` — accepts and forwards `user` prop to `ProjectMenu`
- [x] `app/(builder)/project/[projectId]/page.tsx` — fetches profile + balance in parallel, passes real `ProjectMenuUser`
- [x] Deleted `app/(builder)/builder/` (old mock-data route)
- [x] Fixed all `router.push("/new")` → `router.push("/")` across 5 files
- [x] `components/marketing/Navbar.tsx` — "Start Building" opens auth modal instead of dead `/new` route
- [x] `components/shared/ModelPicker.tsx` — two-level dropdown (provider → models), real PNGs for Anthropic/OpenAI/Gemini logos
- [x] `lib/mock/data.ts` — updated model list: Opus 4.7/4.6/4.5, Sonnet 4.6/4.5, Haiku 4.5, GPT-5.5/5.4/5.3-Codex, Gemini 3.1 Pro
- [x] `components/shared/PromptToolbar.tsx` — uses `ModelPicker` instead of `<select>`

---

## ── COMPLETED ── Phase 12 — Fly.io Machine + Live Preview

All tasks complete. Verified with zero TypeScript errors. Security audit passed.

**What was done:**
- [x] `supabase/migrations/002_fly_machine_columns.sql` — added `fly_machine_id` + `fly_machine_status` columns to `projects`
- [x] `lib/fly/client.ts` — full Machines API wrapper: `createMachine`, `startMachine`, `stopMachine`, `getMachine`, `execOnMachine`, `writeFile`, `listFiles`
- [x] `app/api/fly/machine/route.ts` — POST: provision or start existing machine; idempotent
- [x] `app/api/fly/machine/[machineId]/start/route.ts` — start with ownership check
- [x] `app/api/fly/machine/[machineId]/stop/route.ts` — stop with ownership check
- [x] `app/api/fly/machine/[machineId]/status/route.ts` — GET machine state with auth + ownership
- [x] `app/api/fly/machine/[machineId]/files/route.ts` — GET list + POST write with ownership check
- [x] `app/api/fly/machine/[machineId]/exec/route.ts` — POST run command with ownership check
- [x] `app/api/fly/preview/[machineId]/route.ts` — proxy to machine dev server with auth
- [x] `lib/fly/action-runner.ts` — applies parsed AI artifact actions (file writes + shell execs) to the machine
- [x] `hooks/useMachineProvisioner.ts` — client hook: provisions on mount, exposes `{ machineId, provisioning, error }`
- [x] `components/builder/BuilderMock.tsx` — wired provisioner hook; `beforeunload` → `sendBeacon` to stop machine
- [x] `components/builder/ChatPanel.tsx` — runs `ActionRunner` after stream completes; shows "Applying changes..." banner; toasts on action failures
- [x] `components/builder/panels/PreviewPanel.tsx` — shows spinner while provisioning, live iframe when machine ready, falls back to mock
- [x] `components/builder/panels/FilesPanel.tsx` — real file tree from machine; click-to-view file content

**Security fixes applied during audit:**
- [x] All `[machineId]` routes verify `fly_machine_id` belongs to the authenticated user's project (IDOR prevention)
- [x] `writeFile` path sanitized with regex + `printf` positional args (no shell injection)
- [x] `startMachine`/`stopMachine` throw on non-OK HTTP status
- [x] `FilesPanel` wrapped in try/catch/finally (spinner always clears)
- [x] `ChatPanel` useEffect dependency array includes `onTabChange`

---

## ── COMPLETED ── Phase 13 — Supabase Auto-Provisioning

**Goal**: Auto-create a dedicated Supabase project for each Wild Cupcake user on signup.
When the AI generates a full-stack app with a database, it generates schema + RLS policies into
the user's own Supabase project (not the platform's). Invisible to the user — happens in the
background. Generated apps connect to the user's Supabase via env vars injected into the Fly machine.

**Pre-requisites** (must be in `.env.local` before Codex runs this phase):
```
SUPABASE_MANAGEMENT_TOKEN=sbp_...   ← Supabase Management API token (app.supabase.com → Account → Access Tokens)
SUPABASE_ORG_ID=...                 ← Your Supabase organization ID (from app.supabase.com/org/settings)
WEBHOOK_SECRET=...                  ← Random secret for validating Supabase Auth webhooks (use: openssl rand -hex 32)
```

---

### 13.1 — Create `lib/supabase/management.ts` — Management API client

- [ ] Create `lib/supabase/management.ts`:
  ```typescript
  // SERVER ONLY — never import in client components
  const MGMT_BASE = 'https://api.supabase.com/v1'

  function mgmtHeaders() {
    return {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN!}`,
      'Content-Type': 'application/json',
    }
  }

  export interface SupabaseProject {
    id: string
    ref: string
    name: string
    status: string
    api_url: string
    region: string
  }

  export interface SupabaseApiKey {
    name: string
    api_key: string
  }

  // Create a new Supabase project for a user. Takes ~30s to become ready.
  export async function createSupabaseProject(params: {
    name: string
    region?: string
    dbPass: string
  }): Promise<SupabaseProject> {
    const res = await fetch(`${MGMT_BASE}/projects`, {
      method: 'POST',
      headers: mgmtHeaders(),
      body: JSON.stringify({
        name: params.name,
        organization_id: process.env.SUPABASE_ORG_ID!,
        region: params.region ?? 'us-east-1',
        db_pass: params.dbPass,
        plan: 'free',
      }),
    })
    if (!res.ok) throw new Error(`Supabase create project failed: ${await res.text()}`)
    return res.json() as Promise<SupabaseProject>
  }

  // Poll until project status is 'ACTIVE_HEALTHY'. Timeout after 120s.
  export async function waitForProject(ref: string, timeoutMs = 120_000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`${MGMT_BASE}/projects/${ref}`, { headers: mgmtHeaders() })
      if (res.ok) {
        const project = await res.json() as { status: string }
        if (project.status === 'ACTIVE_HEALTHY') return
      }
      await new Promise((r) => setTimeout(r, 4000))
    }
    throw new Error(`Supabase project ${ref} did not become healthy within ${timeoutMs}ms`)
  }

  export async function getProjectApiKeys(ref: string): Promise<SupabaseApiKey[]> {
    const res = await fetch(`${MGMT_BASE}/projects/${ref}/api-keys`, {
      headers: mgmtHeaders(),
    })
    if (!res.ok) throw new Error(`Failed to get API keys for project ${ref}`)
    return res.json() as Promise<SupabaseApiKey[]>
  }

  // Run a SQL migration on the user's Supabase project
  export async function runMigration(ref: string, sql: string): Promise<void> {
    const res = await fetch(`${MGMT_BASE}/projects/${ref}/database/query`, {
      method: 'POST',
      headers: mgmtHeaders(),
      body: JSON.stringify({ query: sql }),
    })
    if (!res.ok) throw new Error(`Migration failed on project ${ref}: ${await res.text()}`)
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 13.2 — Add Supabase project columns to `profiles` table

- [ ] Run in Supabase SQL editor:
  ```sql
  alter table public.profiles
    add column if not exists supabase_project_ref  text,
    add column if not exists supabase_project_url  text,
    add column if not exists supabase_anon_key     text,
    add column if not exists supabase_service_key  text,
    add column if not exists supabase_status       text default 'none'
      check (supabase_status in ('none', 'provisioning', 'ready', 'error'));

  -- Revoke anon access to the service key column — only service role can read it
  create policy "service key is private" on public.profiles
    as restrictive
    for select
    using (auth.uid() = id);
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 13.3 — Create `lib/supabase/base-schema.ts` — Base SQL for generated apps

- [ ] Create `lib/supabase/base-schema.ts`:
  ```typescript
  // Base schema applied to every user's Supabase project on provisioning.
  // Gives AI-generated apps a safe, RLS-enabled foundation to build on.
  export const BASE_SCHEMA_SQL = `
  -- Enable required extensions
  create extension if not exists "uuid-ossp";
  create extension if not exists "pgcrypto";

  -- Auth helpers view (safe to expose to generated app)
  create or replace view public.users as
    select id, email, created_at from auth.users;
  `
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 13.4 — Create `app/api/webhooks/user-created/route.ts`

This webhook is called by Supabase Auth when a new user signs up.
It provisions their Supabase project in the background.

- [ ] Create `app/api/webhooks/user-created/route.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  import { NextResponse } from 'next/server'
  import { createSupabaseProject, waitForProject, getProjectApiKeys, runMigration } from '@/lib/supabase/management'
  import { BASE_SCHEMA_SQL } from '@/lib/supabase/base-schema'

  // Service-role client for writing back to platform DB
  const platformClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  export async function POST(req: Request) {
    // Validate webhook secret
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as { type: string; record: { id: string; email: string } }
    if (body.type !== 'INSERT') return NextResponse.json({ ok: true })

    const userId = body.record.id
    const projectName = `wc-${userId.slice(0, 8)}`
    const dbPass = crypto.randomUUID().replace(/-/g, '')

    // Mark as provisioning immediately so UI can poll
    await (platformClient as unknown as ReturnType<typeof createClient<any>>)
      .from('profiles')
      .update({ supabase_status: 'provisioning' })
      .eq('id', userId)

    try {
      const project = await createSupabaseProject({ name: projectName, dbPass })
      await waitForProject(project.ref)
      const keys = await getProjectApiKeys(project.ref)
      const anonKey = keys.find((k) => k.name === 'anon')?.api_key ?? ''
      const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key ?? ''
      await runMigration(project.ref, BASE_SCHEMA_SQL)

      await (platformClient as unknown as ReturnType<typeof createClient<any>>)
        .from('profiles')
        .update({
          supabase_project_ref: project.ref,
          supabase_project_url: project.api_url,
          supabase_anon_key: anonKey,
          supabase_service_key: serviceKey,
          supabase_status: 'ready',
        })
        .eq('id', userId)
    } catch (err) {
      console.error('[user-created webhook] Provisioning failed:', err)
      await (platformClient as unknown as ReturnType<typeof createClient<any>>)
        .from('profiles')
        .update({ supabase_status: 'error' })
        .eq('id', userId)
    }

    return NextResponse.json({ ok: true })
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 13.5 — Register the webhook in Supabase Auth (manual step)

- [ ] In Supabase Dashboard → Authentication → Hooks (or Webhooks):
  - Event: `auth.users` INSERT
  - URL: `https://your-domain.com/api/webhooks/user-created`
  - Header: `x-webhook-secret: {value of WEBHOOK_SECRET in .env}`

---

### 13.6 — Inject Supabase env vars into Fly machine on builder open

When a project opens in the builder, inject the user's Supabase URL + anon key into the
Fly.io machine so generated apps automatically have working DB connections.

- [ ] In `app/api/fly/machine/route.ts`, after a successful `startMachine()` call, add:
  ```typescript
  // Inject user's Supabase env vars into machine
  const { data: profile } = await supabase
    .from('profiles')
    .select('supabase_project_url, supabase_anon_key')
    .eq('id', user.id)
    .single()

  if (profile?.supabase_project_url && profile?.supabase_anon_key) {
    await execOnMachine(machine.id, [
      'sh', '-c',
      'printf "NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$1" "$2" >> /app/.env.local',
      '--',
      profile.supabase_project_url,
      profile.supabase_anon_key,
    ])
  }
  ```
  Import `execOnMachine` from `@/lib/fly/client` (already imported in that route).
- [ ] `pnpm typecheck` — zero errors.

---

### 13.7 — Create `GET /api/user/supabase-status`

Allows the client to poll provisioning state if the user opens the builder right after signup.

- [ ] Create `app/api/user/supabase-status/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'

  export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('profiles')
      .select('supabase_status')
      .eq('id', user.id)
      .single() as { data: { supabase_status: string } | null; error: unknown }

    return NextResponse.json({ status: data?.supabase_status ?? 'none' })
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 13.8 — Verification

- [ ] `pnpm typecheck` — zero TypeScript errors.
- [ ] `pnpm dev` — no runtime errors.
- [ ] Deploy to staging. Register a new test account.
- [ ] Within ~2 minutes: `profiles.supabase_status` transitions `none` → `provisioning` → `ready`.
- [ ] `profiles.supabase_project_ref`, `supabase_project_url`, `supabase_anon_key` all populated.
- [ ] Open a project in the builder → `/app/.env.local` on the Fly machine contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `GET /api/user/supabase-status` returns `{ status: "ready" }`.
- [ ] Confirm in Supabase dashboard: new project exists under the org with the base schema applied.

---

## ── PHASE 14 ── Credits + Stripe Billing

**Goal**: Real money. Users can buy credit top-up packs via Stripe Checkout, manage their plan
via the Stripe Customer Portal, and get monthly credits reset automatically. The existing credit
hold/deduct/refund system (Phase 11) is already wired — this phase adds the payment layer on top.

**Pre-requisites** (must be in `.env.local`):
```
STRIPE_SECRET_KEY=sk_test_...        ← Stripe secret key (use test key for dev)
STRIPE_PUBLISHABLE_KEY=pk_test_...   ← Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...      ← From Stripe Dashboard → Webhooks → signing secret
NEXT_PUBLIC_APP_URL=http://localhost:3001  ← Used for Stripe redirect URLs
```

**Credit pricing (canonical — do not change without updating PRICING.md):**
```
1 credit = $0.17 USD
Free:    $0/month  —   5 credits/month
Starter: $16/month — 100 credits/month
Pro:     $20/month — 175 credits/month
Teams:   $60/month — 500 credits/month

Top-up packs (one-time, no expiry):
  100 cr → $17   |  250 cr → $40   |  500 cr → $75   |  1,000 cr → $140
```

---

### 14.1 — Add `stripe_customer_id` to profiles + fix plan credit limits

- [ ] Run in Supabase SQL editor:
  ```sql
  alter table public.profiles
    add column if not exists stripe_customer_id text;
  ```
- [ ] Fix `PLAN_CREDIT_LIMITS` in `components/layout/AppShell.tsx` — current values are wrong:
  ```typescript
  // CORRECT values (match PRICING.md):
  const PLAN_CREDIT_LIMITS: Record<AppShellProfile["plan"], number> = {
    free: 5,
    starter: 100,
    pro: 175,
    teams: 500,
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.2 — Create `lib/stripe/client.ts` — server-only Stripe singleton

- [ ] Install Stripe: `pnpm add stripe`
- [ ] Create `lib/stripe/client.ts`:
  ```typescript
  // SERVER ONLY — never import in client components
  import Stripe from 'stripe'

  let _stripe: Stripe | null = null

  export function getStripe(): Stripe {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-01-27.acacia',
        typescript: true,
      })
    }
    return _stripe
  }

  // Top-up pack definitions — single source of truth
  export const CREDIT_PACKS = [
    { credits: 100,  priceUsd: 17,  label: '100 credits',   popular: false },
    { credits: 250,  priceUsd: 40,  label: '250 credits',   popular: true  },
    { credits: 500,  priceUsd: 75,  label: '500 credits',   popular: false },
    { credits: 1000, priceUsd: 140, label: '1,000 credits', popular: false },
  ] as const

  export type CreditPack = typeof CREDIT_PACKS[number]
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.3 — Create `app/api/credits/checkout/route.ts` — Stripe Checkout session

- [ ] Create `app/api/credits/checkout/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'
  import { getStripe, CREDIT_PACKS } from '@/lib/stripe/client'

  export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { credits } = await req.json() as { credits: number }
    const pack = CREDIT_PACKS.find((p) => p.credits === credits)
    if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    const stripe = getStripe()

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single() as { data: { stripe_customer_id: string | null; full_name: string | null } | null; error: unknown }

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pack.priceUsd * 100, // cents
          product_data: {
            name: `Wild Cupcake — ${pack.label}`,
            description: `${pack.credits} credits · $${(pack.priceUsd / pack.credits).toFixed(3)}/credit · no expiry`,
          },
        },
      }],
      metadata: {
        user_id: user.id,
        credits: String(pack.credits),
      },
      success_url: `${appUrl}/settings?credits=success`,
      cancel_url: `${appUrl}/settings?credits=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.4 — Create `app/api/webhooks/stripe/route.ts` — handle payment + subscription events

- [ ] Create `app/api/webhooks/stripe/route.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  import { NextResponse } from 'next/server'
  import { getStripe } from '@/lib/stripe/client'

  // Service-role client — credit grants bypass RLS
  const platformClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  export async function POST(req: Request) {
    const stripe = getStripe()
    const sig = req.headers.get('stripe-signature')
    if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

    let event
    try {
      const body = await req.text()
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const credits = Number(session.metadata?.credits ?? 0)

      if (!userId || !credits) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      // Insert credit grant transaction
      await (platformClient as unknown as ReturnType<typeof createClient<any>>)
        .from('credit_transactions')
        .insert({
          user_id: userId,
          type: 'grant',
          amount: credits,
          metadata: {
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
          },
        })
    }

    return NextResponse.json({ received: true })
  }

  // Required: disable body parsing so stripe-signature verification works
  export const config = { api: { bodyParser: false } }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.5 — Create `app/api/credits/portal/route.ts` — Stripe Customer Portal

- [ ] Create `app/api/credits/portal/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'
  import { getStripe } from '@/lib/stripe/client'

  export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single() as { data: { stripe_customer_id: string | null } | null; error: unknown }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.6 — Wire Stripe Checkout into `BillingSection.tsx`

- [ ] In `components/settings/sections/BillingSection.tsx`:
  - Replace static "Buy" buttons with real async handlers that call `POST /api/credits/checkout`
  - On success: redirect to `session.url` (Stripe Checkout page)
  - Show spinner on button while fetching
  - Add "Manage billing" button that calls `POST /api/credits/portal` and redirects
  - Add success/cancelled toast based on `?credits=success` or `?credits=cancelled` query param on page load
- [ ] `pnpm typecheck` — zero errors.

---

### 14.7 — Add plan enforcement to `/api/chat/route.ts`

Gate model access server-side by the user's plan. Never trust the client.

- [ ] In `app/api/chat/route.ts`, after loading `modelPricing`, add:
  ```typescript
  // Load user plan for model gate check
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single() as { data: { plan: string } | null; error: unknown }

  const planOrder = ['free', 'starter', 'pro', 'teams']
  const userPlanIndex = planOrder.indexOf(profile?.plan ?? 'free')
  const requiredPlanIndex = planOrder.indexOf(modelPricing.min_plan ?? 'free')

  if (userPlanIndex < requiredPlanIndex) {
    return NextResponse.json(
      { error: `This model requires the ${modelPricing.min_plan} plan or higher` },
      { status: 403 }
    )
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.8 — Monthly credit reset via pg_cron

- [ ] Run in Supabase SQL editor:
  ```sql
  -- Enable pg_cron extension (only needs to be done once per project)
  create extension if not exists pg_cron;

  -- Reset credits on the 1st of every month at midnight UTC
  -- Uses user_credit_balance view's monthly allocation from plan
  select cron.schedule(
    'monthly-credit-reset',
    '0 0 1 * *',
    $$
      insert into public.credit_transactions (user_id, type, amount, metadata)
      select
        p.id,
        'grant',
        case p.plan
          when 'free'    then 5
          when 'starter' then 100
          when 'pro'     then 175
          when 'teams'   then 500
          else 0
        end,
        '{"reason": "monthly_reset"}'::jsonb
      from public.profiles p
      where p.plan != 'free' or (
        -- Free users only get reset if balance is below 5
        select coalesce(sum(amount), 0)
        from public.credit_transactions
        where user_id = p.id
      ) < 5;
    $$
  );
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 14.9 — Add low-credit banner to `AppShell.tsx`

When a user has < 10 credits, show a warning banner above the credit progress bar.

- [ ] In `components/layout/AppShell.tsx`:
  ```typescript
  {balance < 10 ? (
    <div className="mt-2 rounded-md bg-amber-950/50 px-3 py-2 text-xs font-semibold text-amber-400">
      ⚠ Running low — {balance.toLocaleString()} credits left
    </div>
  ) : null}
  ```
  Add this just above the `<Progress>` bar in the credit section.
- [ ] `pnpm typecheck` — zero errors.

---

### 14.10 — Verification

- [ ] `pnpm typecheck` — zero TypeScript errors.
- [ ] `pnpm dev` — no runtime errors.
- [ ] Run Stripe CLI locally to test webhook: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
- [ ] Go to Settings → click "Buy 250 credits" → Stripe Checkout opens with correct amount ($40).
- [ ] Use Stripe test card `4242 4242 4242 4242` → payment succeeds → redirected to `/settings?credits=success`.
- [ ] Check `credit_transactions` table — new `grant` row with `amount: 250` and `stripe_session_id` in metadata.
- [ ] Check `user_credit_balance` view — balance increased by 250.
- [ ] Credit counter in sidebar updates after page refresh.
- [ ] Try sending a message with a model above your plan tier → get 403 error.
- [ ] Balance < 10 → low-credit banner appears in sidebar.
- [ ] "Manage billing" button → Stripe Customer Portal opens.
- [ ] `PLAN_CREDIT_LIMITS` in AppShell shows correct values (free: 5, starter: 100, pro: 175, teams: 500).

---

## ── PHASE 15 ── Final Polish + Deployment

**Goal**: Ship-ready. Error boundaries, loading states, security headers, rate limiting, SEO, and Cloudflare Pages deployment.

**Pre-requisites**: Phase 14 verified ✅. `pnpm typecheck` passes ✅.

**Bugs already fixed before Phase 15 (do not redo):**
- `lib/credits/limits.ts` created — single source of truth for plan credit limits
- `settings/page.tsx` and `project/[projectId]/page.tsx` — removed stale `PLAN_MAX_CREDITS` (free:100, pro:1500, agency:5000), now use `planLimit()` from `lib/credits/limits.ts`
- `AppShell.tsx` — removed inline `PLAN_CREDIT_LIMITS`, now uses `planLimit()`
- `BillingSection.tsx` — fixed `"debit"` → `"deduct"` in all 3 helper functions + `"grant"` → `"monthly_reset"` in txColor
- `app/layout.tsx` — restored `Inter` font via `next/font/google` with `--font-inter` CSS variable
- `next.config.ts` — fixed `allowedDevOrigins: ["localhost", "127.0.0.1"]`
- `app/api/webhooks/stripe/route.ts` — fixed silent failure: `type: "grant"` → `"purchase"`, added idempotency check on `stripe_session_id` (error code 23505), added error logging
- `supabase/migrations/005_monthly_credit_reset.sql` — fixed `type: "grant"` → `"monthly_reset"`
- `components/builder/PhoneFrame.tsx` — full device spec system (5 devices: iPhone SE/15/15 Pro Max, Galaxy S24/S24 Ultra)
- `components/builder/panels/PreviewPanel.tsx` — web viewport switcher + mobile device picker, works on both mock and live Fly.io iframe
- Fly machine columns added to production Supabase via Management API

---

### 15.1 — Error pages

- [ ] Create `app/not-found.tsx`:
  ```tsx
  import Link from "next/link";
  export default function NotFound() {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-purple-400">404</p>
          <h1 className="mt-4 text-4xl font-semibold">Page not found</h1>
          <p className="mt-3 text-slate-400">The page you're looking for doesn't exist or was moved.</p>
          <Link className="mt-8 inline-block rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold hover:bg-purple-500" href="/">
            Go home
          </Link>
        </div>
      </main>
    );
  }
  ```
- [ ] Create `app/error.tsx`:
  ```tsx
  "use client";
  import { useEffect } from "react";
  export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error(error); }, [error]);
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-red-400">Error</p>
          <h1 className="mt-4 text-4xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-slate-400">An unexpected error occurred. Our team has been notified.</p>
          <button className="mt-8 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold hover:bg-purple-500" onClick={reset} type="button">
            Try again
          </button>
        </div>
      </main>
    );
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 15.2 — Error boundaries on async server pages

Wrap the three main async page layouts in error boundaries so a single broken query doesn't white-screen the user.

- [ ] Create `app/(app)/error.tsx` (same pattern as root error.tsx above but without `min-h-screen` — inherits app shell layout)
- [ ] Create `app/(builder)/error.tsx` (same pattern)
- [ ] `pnpm typecheck` — zero errors.

---

### 15.3 — Rate limiting on `/api/chat` via Upstash Redis

- [ ] Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are in `.env.local`.
- [ ] Install: `pnpm add @upstash/ratelimit @upstash/redis`
- [ ] Create `lib/rate-limit.ts`:
  ```typescript
  import { Ratelimit } from "@upstash/ratelimit";
  import { Redis } from "@upstash/redis";

  export const chatRateLimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    prefix: "wc:chat",
  });
  ```
- [ ] In `app/api/chat/route.ts`, after auth check add:
  ```typescript
  const { success, limit, remaining } = await chatRateLimit.limit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "X-RateLimit-Limit": String(limit), "X-RateLimit-Remaining": String(remaining) } }
    );
  }
  ```
- [ ] `pnpm typecheck` — zero errors.

---

### 15.4 — Security headers in `next.config.ts`

- [ ] Add COOP/COEP headers (required for WebContainers/SharedArrayBuffer) and full security header set to `next.config.ts`:
  ```typescript
  { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Strict-Transport-Security",    value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",              value: "DENY" },
  { key: "X-Content-Type-Options",       value: "nosniff" },
  { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",           value: "camera=(), microphone=(), geolocation=()" },
  ```
  Merge with existing headers already in `next.config.ts` (don't duplicate).
- [ ] `pnpm typecheck` — zero errors.

---

### 15.5 — SEO metadata

- [ ] In `app/(marketing)/pricing/page.tsx` add:
  ```typescript
  export const metadata = {
    title: "Pricing — Wild Cupcake",
    description: "Simple, credit-based pricing. Start free, scale as you build.",
  };
  ```
- [ ] In `app/(app)/dashboard/page.tsx` add:
  ```typescript
  export const metadata = { title: "Dashboard — Wild Cupcake" };
  ```
- [ ] In `app/(app)/settings/page.tsx` add:
  ```typescript
  export const metadata = { title: "Settings — Wild Cupcake" };
  ```
- [ ] Verify root `app/layout.tsx` already has `title: "Wild Cupcake"` and `description` — it does, no change needed.
- [ ] `pnpm typecheck` — zero errors.

---

### 15.6 — Remove `console.log` from production code

- [ ] Run: `grep -rn "console.log" app/ lib/ components/ --include="*.ts" --include="*.tsx"`
- [ ] Remove every `console.log` found. Keep `console.error` in API routes (needed for server-side error visibility).
- [ ] `pnpm typecheck` — zero errors.

---

### 15.7 — Stub API routes: return 501 instead of null

The following routes currently return `{ data: null }` which causes silent failures. Replace with a proper 501 Not Implemented response so the client knows the feature is pending.

- [ ] `app/api/credits/route.ts`
- [ ] `app/api/credits/estimate/route.ts`
- [ ] `app/api/projects/[id]/route.ts`
- [ ] `app/api/projects/[id]/messages/route.ts`
- [ ] `app/api/projects/[id]/brief/route.ts`
- [ ] `app/api/projects/[id]/brief/approve/route.ts`
- [ ] `app/api/projects/[id]/agent-runs/route.ts`

Each should return:
```typescript
return NextResponse.json({ error: "Not implemented" }, { status: 501 });
```
- [ ] `pnpm typecheck` — zero errors.

---

### 15.8 — `pnpm build` passes cleanly

- [ ] Run `pnpm build` — zero errors, zero type errors.
- [ ] Check bundle sizes in build output — warn if any route exceeds 250 KB (first load JS).
- [ ] Fix any build-time errors before proceeding.

---

### 15.9 — Verification checklist

- [ ] `pnpm typecheck` — zero errors.
- [ ] `pnpm build` — succeeds cleanly.
- [ ] `/` loads → landing page renders correctly.
- [ ] `/login` → `/signup` → email confirmation → `/dashboard` flow works.
- [ ] `/dashboard` → create project → builder opens → no 404.
- [ ] Builder viewport switcher works (Desktop / Tablet / Mobile).
- [ ] Builder mobile device switcher works (iPhone SE → 15 → 15 Pro Max → Galaxy S24 → S24 Ultra).
- [ ] Settings → Billing → credit balance shows correct plan limit (free = 5/month).
- [ ] Settings → Billing → buy credits → Stripe Checkout → webhook fires → balance updates.
- [ ] Navigate to `/nonexistent` → shows custom 404 page.
- [ ] Rate limit: send 11 chat messages in 60s → 11th returns 429.
- [ ] Security headers present: `curl -I http://localhost:3001 | grep -E "X-Frame|COEP|COOP"`

---

### 12.2 — Create `lib/fly/client.ts` — Fly.io Machines API wrapper

- [ ] Create `lib/fly/client.ts`:
  ```typescript
  // SERVER ONLY — never import in client components
  const FLY_API_BASE = 'https://api.machines.dev/v1'
  const FLY_APP_NAME = process.env.FLY_APP_NAME!
  const FLY_API_TOKEN = process.env.FLY_API_TOKEN!

  function headers() {
    return {
      Authorization: `Bearer ${FLY_API_TOKEN}`,
      'Content-Type': 'application/json',
    }
  }

  export interface FlyMachine {
    id: string
    name: string
    state: string
    region: string
    private_ip: string
  }

  // Provision a new machine. Image: node:20-slim. 1 CPU, 512MB RAM.
  export async function createMachine(projectId: string): Promise<FlyMachine> {
    const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: `project-${projectId.slice(0, 8)}`,
        config: {
          image: 'node:20-slim',
          guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
          auto_destroy: false,
          restart: { policy: 'no' },
          env: { PROJECT_ID: projectId },
          services: [
            {
              ports: [{ port: 3000, handlers: ['http'] }],
              protocol: 'tcp',
              internal_port: 3000,
            },
          ],
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Fly create machine failed: ${err}`)
    }
    return res.json() as Promise<FlyMachine>
  }

  export async function startMachine(machineId: string): Promise<void> {
    await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/start`, {
      method: 'POST',
      headers: headers(),
    })
  }

  export async function stopMachine(machineId: string): Promise<void> {
    await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`, {
      method: 'POST',
      headers: headers(),
    })
  }

  export async function getMachine(machineId: string): Promise<FlyMachine> {
    const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}`, {
      headers: headers(),
    })
    if (!res.ok) throw new Error(`Fly get machine failed: ${res.status}`)
    return res.json() as Promise<FlyMachine>
  }

  // Execute a command inside the machine and return stdout/stderr
  export async function execOnMachine(
    machineId: string,
    command: string[],
    cwd = '/app'
  ): Promise<{ stdout: string; stderr: string; exit_code: number }> {
    const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/exec`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ command, cwd, timeout: 30 }),
    })
    if (!res.ok) throw new Error(`Fly exec failed: ${res.status}`)
    return res.json() as Promise<{ stdout: string; stderr: string; exit_code: number }>
  }

  // Write a single file to the machine via exec + base64
  export async function writeFile(
    machineId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const encoded = Buffer.from(content).toString('base64')
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '/app'
    await execOnMachine(machineId, ['sh', '-c', `mkdir -p ${dir} && echo "${encoded}" | base64 -d > ${filePath}`])
  }

  // List files in /app on the machine
  export async function listFiles(machineId: string): Promise<string[]> {
    const result = await execOnMachine(machineId, ['find', '/app', '-type', 'f', '-not', '-path', '*/node_modules/*'])
    return result.stdout.split('\n').filter(Boolean).map((f) => f.replace('/app/', ''))
  }
  ```

---

### 12.3 — Machine lifecycle API routes

- [ ] Create `app/api/fly/machine/route.ts` (POST — provision or return existing):
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'
  import { createMachine, startMachine, getMachine } from '@/lib/fly/client'

  export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await req.json() as { projectId: string }
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    // Verify user owns this project
    const { data: project } = await supabase
      .from('projects')
      .select('id, fly_machine_id, fly_machine_status')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // If machine already exists, start it and return
    if (project.fly_machine_id) {
      try {
        await startMachine(project.fly_machine_id)
        const machine = await getMachine(project.fly_machine_id)
        await supabase.from('projects').update({ fly_machine_status: machine.state }).eq('id', projectId)
        return NextResponse.json({ data: machine })
      } catch {
        // Machine might be deleted — fall through to create a new one
      }
    }

    // Provision a new machine
    const machine = await createMachine(projectId)
    await supabase.from('projects')
      .update({ fly_machine_id: machine.id, fly_machine_status: machine.state })
      .eq('id', projectId)

    return NextResponse.json({ data: machine }, { status: 201 })
  }
  ```

- [ ] Create `app/api/fly/machine/[machineId]/start/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'
  import { startMachine } from '@/lib/fly/client'

  export async function POST(_req: Request, { params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await startMachine(machineId)
    return NextResponse.json({ ok: true })
  }
  ```

- [ ] Create `app/api/fly/machine/[machineId]/stop/route.ts` — same pattern but calls `stopMachine(machineId)`.

- [ ] Create `app/api/fly/machine/[machineId]/status/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server'
  import { getMachine } from '@/lib/fly/client'

  export async function GET(_req: Request, { params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = await params
    const machine = await getMachine(machineId)
    return NextResponse.json({ data: { state: machine.state, private_ip: machine.private_ip } })
  }
  ```

---

### 12.4 — File write + exec API routes

- [ ] Create `app/api/fly/machine/[machineId]/files/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'
  import { writeFile, listFiles } from '@/lib/fly/client'

  // GET — list all files on machine
  export async function GET(_req: Request, { params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const files = await listFiles(machineId)
    return NextResponse.json({ data: files })
  }

  // POST — write one or more files
  // Body: { files: Array<{ path: string; content: string }> }
  export async function POST(req: Request, { params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { files } = await req.json() as { files: Array<{ path: string; content: string }> }
    if (!Array.isArray(files) || !files.length) {
      return NextResponse.json({ error: 'files array required' }, { status: 400 })
    }

    // Write sequentially to avoid race conditions
    for (const file of files) {
      await writeFile(machineId, `/app/${file.path}`, file.content)
    }

    return NextResponse.json({ ok: true, count: files.length })
  }
  ```

- [ ] Create `app/api/fly/machine/[machineId]/exec/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'
  import { execOnMachine } from '@/lib/fly/client'

  // POST — run a shell command
  // Body: { command: string }  e.g. "npm install"
  export async function POST(req: Request, { params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { command } = await req.json() as { command: string }
    if (!command) return NextResponse.json({ error: 'command required' }, { status: 400 })

    const result = await execOnMachine(machineId, ['sh', '-c', command])
    return NextResponse.json({ data: result })
  }
  ```

---

### 12.5 — Create `lib/fly/action-runner.ts` — execute artifact actions

After the AI stream completes and artifacts are parsed, this runner applies them to the Fly.io machine.

- [ ] Create `lib/fly/action-runner.ts`:
  ```typescript
  import type { ParsedArtifact, ParsedAction } from '@/lib/ai/artifact-parser'

  export type ActionResult = {
    action: ParsedAction
    ok: boolean
    output?: string
    error?: string
  }

  // Runs all actions from parsed artifacts against the user's machine via API routes.
  // Returns results for each action so the UI can display progress.
  export async function runArtifactActions(
    machineId: string,
    artifacts: ParsedArtifact[],
    onProgress?: (result: ActionResult) => void
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = []

    for (const artifact of artifacts) {
      // Batch file writes — send in one request
      const fileActions = artifact.actions.filter((a) => a.type === 'file')
      if (fileActions.length > 0) {
        try {
          const res = await fetch(`/api/fly/machine/${machineId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: fileActions.map((a) => ({ path: a.filePath ?? 'unknown', content: a.content })),
            }),
          })
          for (const action of fileActions) {
            const result: ActionResult = { action, ok: res.ok }
            results.push(result)
            onProgress?.(result)
          }
        } catch (err) {
          for (const action of fileActions) {
            const result: ActionResult = { action, ok: false, error: String(err) }
            results.push(result)
            onProgress?.(result)
          }
        }
      }

      // Shell + start commands — run sequentially
      const shellActions = artifact.actions.filter((a) => a.type === 'shell' || a.type === 'start')
      for (const action of shellActions) {
        try {
          const res = await fetch(`/api/fly/machine/${machineId}/exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: action.content }),
          })
          const json = await res.json() as { data?: { stdout: string; stderr: string; exit_code: number } }
          const result: ActionResult = {
            action,
            ok: res.ok && (json.data?.exit_code ?? 0) === 0,
            output: json.data?.stdout,
            error: json.data?.stderr,
          }
          results.push(result)
          onProgress?.(result)
        } catch (err) {
          const result: ActionResult = { action, ok: false, error: String(err) }
          results.push(result)
          onProgress?.(result)
        }
      }
    }

    return results
  }
  ```

---

### 12.6 — Wire ActionRunner into `ChatPanel.tsx`

After the AI stream finishes (`status` transitions from `'streaming'` to `'ready'`), parse the last assistant message and run the actions.

- [ ] In `components/builder/ChatPanel.tsx`:
  - Add prop: `machineId: string | null`
  - Import `parseArtifacts` from `@/lib/ai/artifact-parser`
  - Import `runArtifactActions` from `@/lib/fly/action-runner`
  - Add state: `const [running, setRunning] = useState(false)`
  - Add `useEffect` that watches `status`:
    ```typescript
    useEffect(() => {
      if (status !== 'ready' || !machineId || !messages.length) return
      const last = messages[messages.length - 1]
      if (last?.role !== 'assistant') return
      const text = last.parts.find((p) => p.type === 'text')?.text ?? ''
      const artifacts = parseArtifacts(text)
      if (!artifacts.length) return

      setRunning(true)
      runArtifactActions(machineId, artifacts).finally(() => {
        setRunning(false)
        onTabChange?.('Preview') // switch to preview after actions complete
      })
    }, [status, machineId, messages])
    ```
  - While `running`: show "Applying changes..." banner above the input
  - Disable send while `running === true`

- [ ] Pass `machineId` from `BuilderMock.tsx` → `ChatPanel.tsx`.
- [ ] `BuilderMock.tsx` receives `machineId: string | null` prop (passed from page).

---

### 12.7 — Provision machine on builder page load

- [ ] In `app/(builder)/project/[projectId]/page.tsx`:
  - After loading the project, check `project.fly_machine_id`
  - If null: call `POST /api/fly/machine` server-side to provision (or let client do it on mount)
  - Pass `machineId: project.fly_machine_id ?? null` to `BuilderMock`

  Since provisioning can take ~5s, do it client-side on mount to avoid blocking the page render:
  - Pass `machineId` as initial prop (may be null)
  - In `BuilderMock.tsx`, add a `useMachineProvisioner` hook that:
    - On mount: if `machineId` is null, POST to `/api/fly/machine` with the `projectId`
    - Shows "Warming up environment..." in the preview panel while provisioning
    - Sets `machineId` in local state once ready

- [ ] Create `hooks/useMachineProvisioner.ts`:
  ```typescript
  'use client'
  import { useEffect, useState } from 'react'

  export function useMachineProvisioner(projectId: string, initialMachineId: string | null) {
    const [machineId, setMachineId] = useState<string | null>(initialMachineId)
    const [provisioning, setProvisioning] = useState(!initialMachineId)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      if (initialMachineId) return // already have a machine
      let cancelled = false

      async function provision() {
        try {
          const res = await fetch('/api/fly/machine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          })
          const json = await res.json() as { data?: { id: string }; error?: string }
          if (cancelled) return
          if (!res.ok || !json.data) {
            setError(json.error ?? 'Failed to provision machine')
            return
          }
          setMachineId(json.data.id)
        } catch (err) {
          if (!cancelled) setError(String(err))
        } finally {
          if (!cancelled) setProvisioning(false)
        }
      }

      void provision()
      return () => { cancelled = true }
    }, [projectId, initialMachineId])

    return { machineId, provisioning, error }
  }
  ```

---

### 12.8 — Update `PreviewPanel.tsx` to show the live machine preview

- [ ] Update `components/builder/panels/PreviewPanel.tsx`:
  - Accept `machineId: string | null` and `provisioning: boolean` props
  - If `provisioning`: show a skeleton/spinner with "Warming up your environment..." text
  - If `machineId` is set: render an `<iframe>` pointing to the machine's preview URL
    - Preview URL format: `https://${machineId}.vm.${FLY_APP_NAME}.internal:3000`
    - **Note**: This requires Fly.io private networking. For public access use Fly.io service ports.
    - For now: show the machine ID and a placeholder iframe with `src="/api/fly/preview/${machineId}"`
  - If no machine and not provisioning: show "No preview available — send a prompt to start building"

- [ ] Create `app/api/fly/preview/[machineId]/route.ts` — proxy to the machine's dev server:
  ```typescript
  import { NextResponse } from 'next/server'

  // Simple proxy — forward requests to the Fly.io machine's internal dev server
  export async function GET(_req: Request, { params }: { params: Promise<{ machineId: string }> }) {
    const { machineId } = await params
    const appName = process.env.FLY_APP_NAME
    // Machine preview URL — adjust port to match the project's dev server
    const upstreamUrl = `http://${machineId}.vm.${appName}.internal:3000`
    try {
      const res = await fetch(upstreamUrl)
      const html = await res.text()
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      })
    } catch {
      return new NextResponse('<p>Preview not ready yet. The dev server may still be starting.</p>', {
        headers: { 'Content-Type': 'text/html' },
        status: 503,
      })
    }
  }
  ```

---

### 12.9 — Update `FilesPanel.tsx` to show real files

- [ ] Update `components/builder/panels/FilesPanel.tsx`:
  - Accept `machineId: string | null` prop
  - On mount (and after each artifact run completes): fetch `GET /api/fly/machine/${machineId}/files`
  - Display the file tree (replace `MOCK_FILE_TREE` entirely)
  - Show a spinner while loading
  - If `machineId` is null: show "Files will appear here after your first generation"
  - File click: fetch file content via `POST /api/fly/machine/${machineId}/exec` with `cat /app/${path}` and display in a simple code viewer

---

### 12.10 — Auto-stop machine on browser close

- [ ] In `BuilderMock.tsx`:
  - Add a `beforeunload` event listener that calls `POST /api/fly/machine/${machineId}/stop`
  - Use `navigator.sendBeacon` for reliability on page close:
    ```typescript
    useEffect(() => {
      if (!machineId) return
      function onUnload() {
        navigator.sendBeacon(`/api/fly/machine/${machineId}/stop`)
      }
      window.addEventListener('beforeunload', onUnload)
      return () => window.removeEventListener('beforeunload', onUnload)
    }, [machineId])
    ```

---

### 12.11 — Verification

- [ ] `pnpm typecheck` — zero TypeScript errors.
- [ ] `pnpm dev` — no runtime errors in console.
- [ ] Set `FLY_API_TOKEN`, `FLY_APP_NAME`, `FLY_ORG_SLUG` in `.env.local`.
- [ ] Open a project in the builder → "Warming up environment..." appears in preview panel.
- [ ] After ~5s: machine provisioned, `fly_machine_id` saved to `projects` row in Supabase.
- [ ] Send prompt: "Say hello and create a file called hello.txt with the text 'Hello World'"
- [ ] After stream: artifact parser detects file action → ActionRunner runs → file written to machine.
- [ ] `FilesPanel` refreshes and shows `hello.txt` in the file tree.
- [ ] `GET /api/fly/machine/${machineId}/files` returns the file list.
- [ ] Send prompt: "Create a simple Next.js app" → `npm install` shell action runs on machine.
- [ ] Preview panel shows the running dev server (or "Preview not ready" if networking not configured yet).
- [ ] Close browser tab → machine stops (verify in Fly.io dashboard).
- [ ] Reopen project → machine starts again from saved `fly_machine_id`.

---

## ── NEXT ── Phase 13 — Project Snapshots + Undo

**Begins after Phase 12 verification passes.**

Key tasks:
- Auto-snapshot `project_snapshots` table before every AI run (save VFS state)
- "Undo last change" button in builder that restores previous snapshot to machine
- Snapshot history drawer showing timeline of changes
- Fork from snapshot: create new project from any historical state

---

## ── NOTES FOR CODEX ──

### Hard rules
1. **Never call `supabase.auth.getSession()` server-side** — always use `supabase.auth.getUser()`.
2. **No frontend credit changes** — credit deduction happens server-side only via API routes.
3. **No mock data imports in real pages** — `lib/mock/*` is only for UI development, not used in backend routes or server components.
4. **RLS on every table** — every `create table` must be followed by `alter table ... enable row level security` and at least one policy.
5. **Service role key is server-only** — never import `SUPABASE_SERVICE_ROLE_KEY` in client components or marketing/auth route groups.
6. **Fly.io API token is server-only** — never expose `FLY_API_TOKEN` to the client. All Fly.io calls go through Next.js API routes.
7. **Run `pnpm typecheck` after each numbered task** — do not batch multiple tasks before checking.
8. **Spinner on all async form actions** — disable button + show loading state while async calls are in flight.
9. **`nativeButton={false}` on all Base UI `<Button render={<Link />}>`** — required to suppress accessibility warnings.
10. **Machine provisioning is idempotent** — if `fly_machine_id` already exists on the project, start it rather than create a new one.
