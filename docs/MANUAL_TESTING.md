# SpringBloom — Master Manual Testing Checklist

**Everything to test in one place.** Tier S → A → Round 0 → 1 → 2 → 3 → 4 + Chat Queue.

Estimated full run: **~3 hours** for one person doing every test. Critical-path subset takes ~45 min — those are marked **🔥**.

---

## 0. Pre-flight — one-time setup

### 0.1 Apply migrations (Supabase SQL editor, in order)

```
supabase/migrations/031_security_scans.sql
supabase/migrations/032_message_modes.sql
supabase/migrations/033_knowledge.sql
supabase/migrations/034_custom_domains.sql
supabase/migrations/035_cache_telemetry.sql
supabase/migrations/036_deployments.sql
supabase/migrations/037_security_notes.sql
supabase/migrations/038_user_snippets.sql
supabase/migrations/039_test_runs.sql
supabase/migrations/040_knowledge_chunks.sql
```

### 0.2 Required env vars (`.env.local`)

| Var | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | Security in-depth scan, Plan deep-think, chat |
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Cross-provider mode routing |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` | Custom domains, publish, rollback |
| `FLY_API_TOKEN` + `FLY_APP_NAME` | Project preview, exec, all scaffolds, tests |
| `FLY_SWEEPER_SECRET` | Admin sweeper endpoint |
| `STRIPE_SECRET_KEY` (project_secrets) | Stripe products CRUD (per-project, not platform) |

Restart `npm run dev` after env changes.

### 0.3 Sanity check

```sh
npx tsc --noEmit         # → zero errors (1 pre-existing in __tests__/lib/multi-turn.test.ts is OK)
npx vitest run           # → 268/268 passing
```

---

## 1. Security Scanner (Tier S)

Open the project builder → **Security** tab (Cloud icon).

### Quick Scan (free, ~5s)
- 🔥 **1.1** Empty project: click **Quick scan** → "No issues found" green panel (or amber `npm audit` skipped banner)
- 🔥 **1.2** Ask AI to add a table without RLS → Quick scan → CRITICAL finding "Table 'public.X' has no Row Level Security", recommendation includes `alter table ... enable row level security`
- **1.3** Expand a finding → **Accept risk** → finding hides; expand "Accepted risks · 1" footer → **Re-open** → returns to list
- **1.4** Install `lodash@4.17.20` in the project → Quick scan → dependency finding ≥ medium, advisory URL link works
- **1.5** Stop the Fly machine → Quick scan → still completes; dependency scanner shows amber "No Fly machine available" warning; RLS still runs

### In-depth Scan (~30s, ~1 credit)
- 🔥 **1.6** Ask AI to write `/api/admin` that runs whatever SQL is in the body → In-depth scan → HIGH/CRITICAL finding under "Code Review (AI)"
- **1.7** Fresh scaffolded project → In-depth scan → zero false positives or all flagged items are real
- **1.8** Severity tile counts match the visible findings list
- **1.9** **SARIF download** chip next to scan summary → downloads `<slug>-security-<id>.sarif` → opens as valid JSON `version: "2.1.0"`
- **1.10** Upload that SARIF to GitHub Code Scanning (repo Settings → Security → Code Scanning) → findings appear as PR annotations
- **1.11** Without `?include_accepted=1`, accepted findings excluded from download; with it, they're present with `properties.accepted_risk: true`

### Generation-time Security Notes (UNIQUE vs Lovable)
- 🔥 **1.12** Ask AI to "Add comments table with RLS + policy" → query `security_notes` → rows with patterns `enable_rls`, `create_policy`, file_path set
- **1.13** Ask for `dangerouslySetInnerHTML` usage → note with `innerhtml_assign` / `xss`
- **1.14** Ask AI to embed `STRIPE_SECRET_KEY = 'sk_live_xxx'` in code → note `hardcoded_token_like`
- **1.15** Benign "Add an About page" → no new `security_notes` rows
- **1.16** 50+ `eval()` calls in one file → at most 50 notes inserted

---

## 2. Plan / Agent / Code Modes (Tier S)

Mode toggle is next to "Visual edits" in the composer row.

- 🔥 **2.1** Agent (default): send "Add a contact form" → normal artifact stream (no behavior change vs before)
- 🔥 **2.2** Plan mode, **Deep think OFF** → "Add Stripe checkout" → markdown plan instead of code; cost = same as agent (same model)
- **2.3** Hover the **(i)** next to Deep think → tooltip explains "reasoning-tier model, ~5× cost", lists use cases
- **2.4** Plan + Deep think ON → "Design multi-tenant SaaS schema" → slower (~15-25s), Opus/GPT-5/Gemini 2.5 Pro response, agent_runs row shows ~5× cost
- **2.5** Code mode → "Change button background red" → fast, diff-focused, ~⅕ cost (Haiku)
- **2.6** Switch user model to Gemini → Plan + Deep think → Gemini 2.5 Pro (not Anthropic Opus)
- **2.7** Toggle + Deep think checkbox disabled while streaming
- 🔥 **2.8** After plan-mode response, the assistant message renders as **PlanCard** (violet, "PLAN · draft") not plain text
- **2.9** Click **Edit** → markdown becomes editable; click **Preview** → renders
- **2.10** Click **Approve & Build** → mode auto-switches to Agent; auto-sends "Implement this plan: ..."; agent execution begins
- **2.11** Click **Discard** → status shows "Discarded"; no execution
- **2.12** Refresh page → plan history still renders as PlanCards with correct statuses

---

## 3. Knowledge — 3-tier File-First (Tier S)

### User-level
- **3.1** Devtools: `await fetch('/api/user/knowledge', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: 'Always use Drizzle, never Prisma.' })})`
- **3.2** Send "Add a users table" → generated code uses Drizzle (not Prisma)

### Project-level AGENTS.md
- 🔥 **3.3** **Auto-generation**: create a brand-new project, wait for Fly machine to boot → Files panel shows `AGENTS.md` with project metadata
- **3.4** Edit AGENTS.md ("Use TanStack Query"); restart preview → file NOT clobbered
- **3.5** After 3.4, ask "Add a posts list" → uses `useQuery` (not raw fetch)
- **3.6** Add `.cursorrules` instead → still picked up via fallback chain
- **3.7** 10,000-char AGENTS.md → only ~3600 chars injected with "…[knowledge truncated]" marker

### RAG-lite (R4-5)
- 🔥 **3.8** Upload a doc:
  ```js
  await fetch('/api/user/knowledge/docs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_type: 'upload', filename: 'api-spec.md',
      content: 'The /widgets endpoint accepts POST { name, color } and returns 201 with the new widget.',
      project_id: '<your-project-id>',
    }),
  }).then(r => r.json())
  ```
- **3.9** Verify in Supabase: `select count(*) from knowledge_doc_chunks where doc_id = '<doc-id>'` → ≥ 1
- 🔥 **3.10** In that project, ask "How do I create a widget?" → response references `/widgets`, POST, the exact field names
- **3.11** Ask an unrelated question → no RAG injection (no extra latency, no irrelevant chunks)
- **3.12** Project's chunks AND user-global chunks both retrievable

### Cost conflict resolution
- **3.13** User: "Use Tailwind"; Project AGENTS.md: "vanilla CSS only" → generated code uses vanilla CSS (project wins via recency)

---

## 4. SEO / AEO (Tier A)

Open project → **SEO** tab (Search icon).

- 🔥 **4.1** Defaults pre-fill from project metadata
- **4.2** Click **Preview files** → 6 files: `public/robots.txt`, `public/llms.txt`, `app/sitemap.ts`, `lib/seo/config.ts`, `lib/seo/SEO.tsx`, `lib/seo/jsonld.ts`
- **4.3** robots.txt contains `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`
- **4.4** Click **Apply to project** → green "Wrote 6 files" panel; files appear in Files panel
- **4.5** Visit `https://<preview>/robots.txt` and `/llms.txt` → both serve the generated content
- **4.6** Stop Fly machine → Apply → toast "No Fly machine available — start preview first"; form data preserved

---

## 5. Custom Domains (Tier A)

Publish a project first; PublishModal's "Custom Domains" section appears post-success.

- 🔥 **5.1** Add `test.yourdomain.com` (real domain you control) → row appears, `DNS verifying` + `SSL pending`, CNAME + TXT shown with Copy buttons
- **5.2** Invalid hostname `not a hostname` → toast error
- **5.3** Duplicate add → 409 "already added"
- **5.4** Click refresh icon → re-checks; "checked Ns ago" updates
- 🔥 **5.5** Add the real CNAME + TXT at your registrar, wait ~5 min, re-check → flips to `DNS active` + `SSL active`; green border; external-link icon appears
- **5.6** **Make primary** → "Primary" badge; second domain made primary unsets the first (partial unique index works)
- **5.7** Trash → confirm → row removed; CF hostname also deleted
- **5.8** Unset `CLOUDFLARE_API_TOKEN`, restart → add domain → 502 with graceful error (not crash)

---

## 6. Round 0 — Cost Optimization

Apply migration `035_cache_telemetry.sql`. Set `FLY_SWEEPER_SECRET` in `.env.local`.

- 🔥 **6.1 Prompt cache hit rate**: send 3 chat messages back-to-back; query `agent_runs` last 3 rows → turn 2 & 3 show `cache_read_input_tokens > 0`
- 🔥 **6.2 AGENTS.md cache**: watch `fly logs -a springbloom-builder`; send 2 chats within 60s → only ONE `exec` for AGENTS.md (cache hit on 2nd)
- **6.3 fileTree fix**: ask "What files are in this project?" → real file list, not invented
- **6.4 Hold estimate includes input**: long chat (>15 turns); composer cost estimate grows with history
- **6.5 model_pricing cache**: devtools network; 5 chat messages → only 1 `model_pricing` query (5-min TTL)
- **6.6 Fly sweeper dry-run**:
  ```sh
  curl -H "Authorization: Bearer $FLY_SWEEPER_SECRET" "http://localhost:3000/api/admin/fly-sweeper?dry_run=1&days=30"
  ```
  → JSON `{ dry_run: true, candidates: [...], count: N }`; no machines destroyed

---

## 7. BYO-Analytics (Round 1)

IntegrationsPanel → "Analytics — bring your own" section.

- 🔥 **7.1 PostHog connect**: expand → paste any `phc_xxx` key → **Connect** → toast "wrote lib/analytics/posthog.ts"; Files panel shows it
- **7.2 Plausible**: same flow with site domain; file at `components/analytics/PlausibleScript.tsx`
- **7.3 Update**: change a field value → **Update** → file rewritten
- **7.4 Disconnect**: confirm → file deleted from project, badge removed
- **7.5** Try Connect without required `*` field → button disabled

---

## 8. Stripe (Round 2 + Round 4)

Connect Stripe in Integrations first. IntegrationsPanel.

### Webhook Scaffold (A1)
- 🔥 **8.1** Without Stripe connected → no "Scaffold webhook handler" section
- **8.2** Connect Stripe → section appears (violet)
- **8.3 Preview**: 3 files (4 if Supabase also connected): `app/api/webhooks/stripe/route.ts`, `lib/stripe/server.ts`, `lib/stripe/events.ts`, optional migration
- **8.4** Expand `route.ts` → contains `stripe.webhooks.constructEvent` + idempotency check (Supabase)
- 🔥 **8.5 Apply** → green confirmation, files appear in Files panel
- **8.6 With stripe-cli**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` → set `STRIPE_WEBHOOK_SECRET` → `stripe trigger checkout.session.completed` → 200 response, logs show handler firing
- **8.7** Same event twice → 2nd response `{ received: true, duplicate: true }` (idempotency works)

### Products & Prices CRUD (R4-4)
- 🔥 **8.8** Expand "Products & Prices" → list loads from your connected Stripe account
- **8.9** **Add product**: name "Pro", $19, USD, Monthly → **Create** → product appears, has price `1900 USD / month`
- **8.10** External-link icon → opens product in dashboard.stripe.com
- **8.11** **Archive** → confirm → product becomes inactive (drops from list)
- **8.12** Disconnect Stripe → next API call returns "Stripe is not connected" 502

---

## 9. Publish / Deployment (Round 2 + Round 4)

PublishModal — click **Publish** button in the toolbar.

- 🔥 **9.1 Streamed phases**: 4 step rows appear: Cloudflare project → Build → Upload → Deploy; each `○ → ⌛ → ✓` live; italic phase messages below
- **9.2 Stats card**: appears mid-publish — "Build succeeded · 4.2s", "Bundle 12 files · 234 KB"
- **9.3 Build log toggle**: click chevron → console panel with actual `npm run build` output
- 🔥 **9.4 deployment row**: query `deployments` → new row with `status='success'`, build_duration_ms, bundle_size_bytes, file_count
- **9.5 Failure path**: break the project (`throw new Error()` in package.json build) → Publish → red step, log auto-opens; row has `status='failed'`, full `build_log`
- **9.6 Stop server mid-publish** → error state + Retry button → Retry works after server restarts

### Rollback (R4-2)
- 🔥 **9.7** After 2+ successful publishes, expand **Deployment history** in modal → list with timestamps, file counts, "live" badge on current
- **9.8** Rollback icon on a previous deployment → confirm → toast "Rolled back"; live URL serves the previous build
- **9.9 Verify**: refresh history → previous deployment now has "rolled back" badge; new row appeared for the rollback action
- **9.10** Rollback non-success row → button disabled (only on `status='success'`)

---

## 10. Auth Scaffold (Round 3)

Auth tab → "Scaffold auth code" violet card.

- 🔥 **10.1 Preview without MFA/JWT**: 5 files (`middleware.ts`, `app/auth/callback/route.ts`, `app/auth/signout/route.ts`, `lib/auth/server.ts`, `lib/auth/client.ts`)
- **10.2 With both checkboxes**: 7 files (+ `app/(auth)/mfa/page.tsx`, `enroll-action.ts`, `supabase/migrations/<ts>_custom_access_token_hook.sql`)
- 🔥 **10.3 Apply** → all files written; `middleware.ts` PROTECTED array matches your input
- **10.4** Run `npm install @supabase/ssr` in project → visit `/dashboard` while signed-out → redirected to `/login?next=/dashboard`

---

## 11. Email Templates (Round 3)

Connect Resend in Integrations first. Section appears in IntegrationsPanel.

- 🔥 **11.1 Preview** with Product name, brand color, from address → 4-5 files: `lib/emails/send.ts`, `lib/emails/templates/{welcome,password-reset,magic-link,receipt}.tsx`, `lib/emails/preview.tsx`
- **11.2 Apply** → files written; `npm install resend @react-email/components @react-email/render`
- **11.3** Mount `PreviewIndex` at `/email-preview` in project → all 4 templates render in iframes with sample data
- **11.4 TypeScript safety**: `sendEmail({ template: 'welcome', to: 'me@example.com', props: {} })` → TS error "name required in props"

---

## 12. Snippets / Skills Library (Round 3 + Round 4)

### Slash command picker (B4)
- 🔥 **12.1 Create via API**:
  ```js
  await fetch('/api/user/snippets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trigger: 'drizzle-setup', label: 'Drizzle ORM standard setup',
      description: 'Use when adding Drizzle to a new project',
      body: 'Set up Drizzle ORM with PostgreSQL. Schema-first approach.',
      tags: ['database', 'drizzle'],
    }),
  })
  ```
- 🔥 **12.2** Type `/` in chat → picker appears showing the snippet with `/drizzle-setup` badge
- **12.3** Continue typing `/dri` → filtered list
- **12.4** ↓↑ navigation + Enter to pick → composer value replaced with snippet body; picker closes
- **12.5** Re-open picker → snippet shows `×1` use count, sorts to top
- **12.6** Duplicate trigger → 409 "already exists"
- **12.7** Invalid trigger (`Bad Name!` or `a`) → 400 "kebab-case, 2-64 chars"

### Management page (R4-3) — `/settings/snippets`
- 🔥 **12.8** Visit `/settings/snippets` → list shows your snippets with `/trigger` badges
- **12.9 New snippet**: click **New snippet** → editor opens → fill all fields → **Create** → appears in list
- **12.10 Edit**: pencil icon → editor opens with body loaded; modify → **Save** → list reflects change
- **12.11 Delete**: trash icon → confirm → snippet removed

---

## 13. Test Runner (Round 4)

**Tests** tab (Terminal icon) in the builder.

- 🔥 **13.1 Run tests**: click button → spinner; phase "Detecting test framework..." → "Running ..." → result card
- **13.2 Pass/fail/skip tiles**: counts match actual output
- **13.3** Click "stdout" chevron → full output (auto-opens on failure)
- **13.4 History list**: after a run, history row appears with framework, P/F/S counts, time ago, duration
- 🔥 **13.5 Framework detection**: vitest in package.json → command shows `npx vitest run`; jest → `npx jest`; @playwright/test → `npx playwright test`
- **13.6** Failing test → status `failed`, exit_code non-zero, red tile
- **13.7** Stats parser: pull `test_runs` row; `passed_count`/`failed_count` non-zero when stats parseable

### Playwright scaffold (R4-6)
- **13.8** Expand "Add Playwright" → both checkboxes ON → **Apply scaffold** → 5 files written: `playwright.config.ts`, `e2e/example.spec.ts`, `e2e/auth.spec.ts`, `.github/workflows/e2e.yml`, `e2e/README.md`
- **13.9** Without checkboxes → only `playwright.config.ts` + `e2e/example.spec.ts` + README
- **13.10** In project: `npm i -D @playwright/test && npx playwright install` then **Run tests** in the panel → uses `npx playwright test`

---

## 14. Chat Queue (R4-7 — Lovable parity)

The killer UX feature.

- 🔥 **14.1** Send a message that triggers a long generation.
- 🔥 **14.2** While streaming, type "fine tune SEO" → press Enter → message disappears from input; **Queue (1)** card appears above composer
- **14.3** Add 2 more messages → queue grows to **Queue (3)**
- **14.4** Placeholder reads "Queue follow-up..." while busy / queue non-empty
- 🔥 **14.5 Auto-drain**: when current run finishes, first queued item dispatches automatically; Queue count decreases
- **14.6 Per-item menu** (⋮ icon): Edit (inline textarea + Save/Cancel), Copy (clipboard), Repeat (re-appends to tail), Move up/down (hidden on first/last), Remove
- **14.7 Header**: count badge, **X** (confirm-clear-all), **▶ Play now** (dispatches next immediately if ready), **▼/▲** collapse/expand
- 🔥 **14.8 localStorage persistence**: queue 3 items, refresh page → all 3 still in queue
- **14.9** Different project → its own separate queue (keyed by projectId)
- **14.10** Click Play now while still streaming → toast "Wait for the current run to finish, then the next queued item will play automatically"
- **14.11** Drag handle icon visible on hover (no drag-reorder shipped yet; use Move up/down)

---

## 15. Cost Verification — sanity-check each action

| Action | Expected per-use cost | Verification |
|---|---|---|
| **Free tier**: SEO files, custom domains, BYO analytics, SARIF download, auth scaffold, email scaffold, Stripe webhook scaffold, Playwright scaffold, snippets, queue | **$0** | No `agent_runs` row created |
| Quick security scan | $0 | No `agent_runs` row |
| In-depth security scan | ~$0.03 (~1 credit) | `agent_runs` row with model=haiku |
| Agent mode message | Same as before | Baseline |
| Plan mode (Deep think OFF) | **Same as Agent** | No surprise cost |
| Plan mode + Deep think ON | **~5× normal (~7-10 cr)** | Opus/GPT-5/Gemini 2.5 Pro in agent_runs |
| Code mode | ~⅕ of agent | Haiku in agent_runs |
| Chat with no knowledge set | Baseline | knowledge resolver returns empty |
| Chat with 1500-char user knowledge | +~$0.005/turn | +~1500 input tokens |
| Chat with RAG matches | +~$0.013/turn | +~4000 chars chunks injected |
| Test run (npm test) | $0 from us (Fly compute already paid) | `test_runs` row, no agent_run |
| Publish | $0 from us | `deployments` row |
| Rollback | $0 from us (CF API free) | new `deployments` row |

---

## 16. Final regression check

```sh
npx tsc --noEmit         # → zero new errors
npx vitest run           # → 268/268 passing
```

If both green and all 🔥-marked tests pass, ship it.

---

## 17. Known gaps (NOT shipped yet)

- pgvector + real embeddings (current RAG is ILIKE-only)
- Sidecar Fly machines for parallel Playwright runs
- Real-time per-run Playwright trace viewer in panel
- Snippet drag-reorder (Move up/down ships instead)
- Custom GitHub OAuth for snippet import
- Custom JWT claims hook UI (we ship the SQL template only)
