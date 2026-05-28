# SpringBloom — End-to-End Manual Testing

**ONE comprehensive checklist** for every shipped feature: Tier S → A → Round 0 → 1 → 2 → 3 → 4 + Chat Queue + Round 5.

🔥 = critical-path subset (~60 min). Full run: ~3.5 hours.

---

## 0. Pre-flight — one-time setup

### 0.1 Apply ALL migrations in 30 seconds

```sh
npm run db:migrate:dry     # see what's pending
npm run db:migrate         # apply pending migrations
```

**First-time only** (if you have migrations already applied manually):
```sh
npx tsx scripts/apply-migrations.ts --bootstrap
```
This marks every on-disk migration as already applied without running them, so future `db:migrate` only applies new ones.

You should now have **all 42 migrations** applied:
```sh
npm run db:migrate         # → "✓ All 42 migration(s) already applied"
```

### 0.2 Required env vars (`.env.local`)

| Var | Used by |
|---|---|
| `SUPABASE_MANAGEMENT_TOKEN` | Migration runner, JWT hook editor |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` | Core auth + admin DB |
| `ANTHROPIC_API_KEY` | Security in-depth scan, Plan deep-think, chat |
| `OPENAI_API_KEY` | Cross-provider mode routing **+ RAG embeddings (R5-2)** |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Cross-provider mode routing |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` | Domains, publish, rollback |
| `FLY_API_TOKEN` + `FLY_APP_NAME` | Preview, exec, all scaffolds, tests, export |
| `FLY_SWEEPER_SECRET` | Admin sweeper endpoint |

Restart `npm run dev` after env changes.

### 0.3 Sanity check

```sh
npx tsc --noEmit         # → zero new errors
npx vitest run           # → 268/268 passing
```

---

## 1. Security Scanner

Open project → **Security** tab (Cloud icon).

### Quick Scan (free, ~5s)
- 🔥 **1.1** Empty project: click **Quick scan** → "No issues found" green panel
- 🔥 **1.2** Ask AI to add table without RLS → Quick scan → CRITICAL "Table has no RLS" finding with `alter table ... enable row level security` recommendation
- **1.3** Expand finding → **Accept risk** → hides; "Accepted risks · 1" footer → **Re-open** → returns
- **1.4** Install `lodash@4.17.20` → Quick scan → dependency finding ≥ medium, advisory URL works
- **1.5** Stop Fly machine → Quick scan still works (RLS only); amber "No Fly machine" warning for npm audit

### In-depth Scan (~30s, ~1 credit)
- 🔥 **1.6** Ask AI to write `/api/admin` route that runs body SQL → In-depth scan → HIGH/CRITICAL finding under "Code Review (AI)"
- **1.7** Fresh scaffolded project → In-depth scan → zero false positives or all flagged are real
- **1.8** Severity tile counts match findings list
- 🔥 **1.9 SARIF download** → chip next to scan summary → downloads `<slug>-security-<id>.sarif`
- **1.10** Upload .sarif to GitHub Code Scanning → findings appear as PR annotations
- **1.11** `?include_accepted=1` toggles whether accepted findings are present

### Generation-time Security Notes (G5 — UNIQUE)
- 🔥 **1.12** Ask AI to "Add comments table with RLS + policy" → query `security_notes` → rows with patterns `enable_rls`, `create_policy`, file_path
- **1.13** Ask for `dangerouslySetInnerHTML` → note `innerhtml_assign` / `xss`
- **1.14** Ask AI to hardcode `STRIPE_SECRET_KEY = 'sk_live_xxx'` → note `hardcoded_token_like`
- **1.15** Benign "Add an About page" → zero new `security_notes` rows
- **1.16** 50+ `eval()` calls → cap at 50 notes inserted

---

## 2. Plan / Agent / Code Modes

Mode toggle next to "Visual edits" in composer.

- 🔥 **2.1** Agent (default): "Add contact form" → normal artifact stream
- 🔥 **2.2** Plan + **Deep think OFF** → "Add Stripe checkout" → markdown plan, cost = same as agent
- **2.3** Hover **(i)** next to Deep think → tooltip explains "reasoning-tier model, ~5× cost"
- **2.4** Plan + Deep think ON → "Design multi-tenant SaaS schema" → ~15-25s, Opus/GPT-5/Gemini 2.5 Pro, agent_runs shows ~5× cost
- **2.5** Code mode → "Change button red" → fast, diff-focused, ~⅕ cost
- **2.6** Switch model to Gemini → Plan+DeepThink → Gemini 2.5 Pro (not Anthropic)
- **2.7** Toggle + Deep think disabled while streaming
- 🔥 **2.8** After plan response → renders as **violet PlanCard** "PLAN · draft" (not plain text)
- **2.9** Click **Edit** → editable; **Preview** → renders
- **2.10** **Approve & Build** → auto-switches to Agent, sends "Implement this plan: ..."
- **2.11** **Discard** → "Discarded" badge, no execution
- **2.12** Refresh page → plan history persists as PlanCards

---

## 3. Knowledge — 3-tier + RAG

### User-level
- **3.1** Devtools: `await fetch('/api/user/knowledge', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: 'Always use Drizzle.' })})`
- **3.2** Send "Add a users table" → generated code uses Drizzle

### Project AGENTS.md (G2)
- 🔥 **3.3** Brand new project, wait for Fly boot → Files panel shows `AGENTS.md`
- **3.4** Edit AGENTS.md ("Use TanStack Query"); restart preview → NOT clobbered
- **3.5** Ask "Add a posts list" → uses `useQuery`
- **3.6** Replace with `.cursorrules` → still picked up
- **3.7** 10,000-char AGENTS.md → only ~3600 chars injected with truncation marker

### RAG with real embeddings (R5-2)
- 🔥 **3.8 Upload + embed**:
  ```js
  await fetch('/api/user/knowledge/docs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_type: 'upload', filename: 'api-spec.md',
      content: 'The /widgets endpoint accepts POST { name, color } and returns 201.',
      project_id: '<project-id>',
    }),
  }).then(r => r.json())
  ```
  → response shows `embedded_count > 0` (means OpenAI embedded the chunks)
- **3.9** Verify: `select count(*), count(embedding) from knowledge_doc_chunks where doc_id = '<id>'` → both equal
- 🔥 **3.10 Vector search hit**: in that project ask "How do I create a widget?" → response cites `/widgets`, POST, exact fields — even though you didn't use the word "widget" in your knowledge doc
- **3.11** Unset `OPENAI_API_KEY` temporarily → upload → response shows `embedded_count: 0`; ask same question → ILIKE fallback still finds chunk by keyword
- **3.12** Project chunks AND user-global chunks both retrievable (set `project_id: null` on upload)

### Conflict resolution
- **3.13** User: "Tailwind"; Project AGENTS.md: "vanilla CSS only" → generated code uses vanilla CSS

---

## 4. SEO / AEO

**SEO** tab (Search icon).

- 🔥 **4.1** Defaults pre-fill from project name/slug
- **4.2 Preview** → 6 files generated, names match
- **4.3** robots.txt has `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`
- **4.4 Apply** → "Wrote 6 files"; appear in Files panel
- **4.5** `<preview-url>/robots.txt` and `/llms.txt` both serve content
- **4.6** Stop machine → Apply → toast "No Fly machine available"

---

## 5. Custom Domains

Publish first; section appears post-success in PublishModal.

- 🔥 **5.1** Add `test.yourdomain.com` → row appears, DNS+SSL pending, CNAME+TXT shown with copy buttons
- **5.2** Invalid hostname → toast error
- **5.3** Duplicate → 409
- **5.4** Refresh icon → re-checks; "checked Ns ago"
- 🔥 **5.5** Real DNS records added at registrar; re-check → flips active, green border, external-link icon
- **5.6 Primary**: badge appears; second primary unsets first
- **5.7** Delete → confirm → CF hostname deleted too
- **5.8** Missing CF token → 502 graceful error

---

## 6. Round 0 — Cost Verification

- 🔥 **6.1 Cache hit rate**: 3 chat messages in a row → query `agent_runs` → turns 2 & 3 show `cache_read_input_tokens > 0`
- 🔥 **6.2 AGENTS.md cache**: `fly logs -a springbloom-builder` → send 2 chats within 60s → only ONE exec for AGENTS.md
- **6.3 fileTree fix**: "What files are in this project?" → real file list
- **6.4 Hold estimate**: long chat (15+ turns) → composer cost estimate grows
- **6.5 model_pricing cache**: devtools network → 5 messages → only 1 model_pricing query (5-min TTL)
- **6.6 Fly sweeper dry**: `curl -H "Authorization: Bearer $FLY_SWEEPER_SECRET" "localhost:3000/api/admin/fly-sweeper?dry_run=1&days=30"` → candidates JSON, no destruction

---

## 7. BYO-Analytics

IntegrationsPanel → "Analytics — bring your own".

- 🔥 **7.1** Connect PostHog → toast "wrote lib/analytics/posthog.ts"
- **7.2** Plausible: site domain → file `components/analytics/PlausibleScript.tsx`
- **7.3 Update** existing config → file rewritten
- **7.4 Disconnect** → file deleted, badge removed
- **7.5** Required-field validation (Connect button disabled)

---

## 8. Stripe

Connect Stripe first.

### Webhook Scaffold (A1)
- 🔥 **8.1** Section visible only when Stripe is connected
- **8.2 Preview** → 3 files (+ migration if Supabase connected)
- **8.3** `route.ts` has `stripe.webhooks.constructEvent` + idempotency
- 🔥 **8.4 Apply** → green confirmation, files in Files panel
- **8.5** With `stripe listen --forward-to localhost:3000/api/webhooks/stripe` → `stripe trigger checkout.session.completed` → 200 + handler fires
- **8.6** Same event twice → `{ received: true, duplicate: true }`

### Products & Prices CRUD (R4-4)
- 🔥 **8.7 Expand "Products & Prices"** → list loads from real Stripe
- **8.8** Add product "Pro", $19, Monthly → appears with price `1900 USD / month`
- **8.9** External-link → dashboard.stripe.com/products/{id}
- **8.10 Archive** → confirm → drops from list
- **8.11** Disconnect Stripe → next call returns "not connected" 502

---

## 9. Publish + Rollback

PublishModal — **Publish** button in toolbar.

- 🔥 **9.1 Streamed phases**: 4 steps ○→⌛→✓ live; italic phase messages
- **9.2** Stats card: "Build succeeded · 4.2s", "Bundle 12 files · 234 KB"
- **9.3** Build log toggle → actual stdout from Fly
- 🔥 **9.4 deployment row**: `select * from deployments order by created_at desc limit 5` → row with success + stats
- **9.5** Break the build (`throw new Error()`) → red step, log auto-opens; `status='failed'`, full `build_log` saved
- **9.6** Stop server mid-publish → error + Retry → works after restart

### Rollback (R4-2)
- 🔥 **9.7** After 2+ successful publishes → expand "Deployment history" → list with live badge
- **9.8** Rollback icon on previous → confirm → toast "Rolled back"; URL serves old build
- **9.9 Verify**: refresh history → previous now "rolled back", new row for the rollback
- **9.10** Rollback button disabled on non-success rows

---

## 10. Auth Scaffold + JWT Hook UI

Auth tab.

### Code scaffold (B1)
- 🔥 **10.1 Preview without MFA/JWT** → 5 files
- **10.2** Both checkboxes → 7 files (+ MFA pages + JWT migration)
- 🔥 **10.3 Apply** → files written; `middleware.ts` PROTECTED matches input
- **10.4** `npm install @supabase/ssr` → visit `/dashboard` signed-out → redirected to `/login?next=/dashboard`

### Live JWT hook editor (R5-4)
- 🔥 **10.5** Expand "Custom JWT claims hook" → loads current definition from user's Supabase (says "NOT installed yet" first time)
- **10.6** Click "user_role from profiles" template → body fills with example
- **10.7 Apply to Supabase** → confirm → toast "Hook applied"; refresh → shows definition
- **10.8** In Supabase dashboard → Authentication → Hooks → Custom Access Token → Enable + select `public.custom_access_token_hook`
- **10.9** Sign in to your test app → decode the JWT → custom claim present
- **10.10** Without PAT stored → endpoint returns 400 "Add your Supabase Management PAT in Integrations"

---

## 11. Email Templates (B2)

Connect Resend first.

- 🔥 **11.1 Preview** with product name + brand color → 4-5 files
- **11.2 Apply** → `npm install resend @react-email/components @react-email/render`
- **11.3** Mount `PreviewIndex` at `/email-preview` → all 4 templates render in iframes
- **11.4** `sendEmail({ template: 'welcome', to: ..., props: {} })` → TS error "name required"

---

## 12. Snippets / Skills

### Slash picker (B4)
- 🔥 **12.1 Create via API**: see §11.4 in the original; trigger=`drizzle-setup`, label, body, tags
- 🔥 **12.2** Type `/` in chat → picker appears with snippet
- **12.3** Type `/dri` → filtered
- **12.4** ↓↑ + Enter → composer fills with body; picker closes
- **12.5** Re-open picker → `×1` use count, sorts to top
- **12.6** Duplicate trigger → 409
- **12.7** Invalid trigger → 400

### Management page (R4-3) — `/settings/snippets`
- 🔥 **12.8** Visit page → list shows snippets with `/trigger` badges
- **12.9 New snippet** → editor opens → Create → appears in list
- **12.10 Edit** pencil → editor with body loaded → Save → reflects
- **12.11 Delete** trash → confirm → removed

---

## 13. Test Runner + Playwright

**Tests** tab (Terminal icon).

### Runner (R4-1)
- 🔥 **13.1 Run tests** button → phase progress → result card
- **13.2** Pass/fail/skip tiles match output
- **13.3** stdout chevron → full output (auto-opens on failure)
- **13.4** History list after run shows framework, P/F/S, duration
- 🔥 **13.5 Framework detection**: vitest → `npx vitest run`; jest → `npx jest`; @playwright/test → `npx playwright test`
- **13.6** Failing test → red tile, exit_code non-zero
- **13.7** `test_runs` row populated with parsed counts

### Playwright scaffold (R4-6)
- **13.8** Expand "Add Playwright" + both checkboxes ON → Apply → 5 files
- **13.9** Without checkboxes → 3 files
- **13.10** In project: `npm i -D @playwright/test && npx playwright install` → Run tests in panel → uses `npx playwright test`

---

## 14. Chat Queue (R4-7) — Lovable parity

- 🔥 **14.1** Send a slow-generating message
- 🔥 **14.2** While streaming, type "fine tune SEO" + Enter → disappears from input, **Queue (1)** card appears above composer
- **14.3** Add 2 more → Queue (3)
- **14.4** Placeholder reads "Queue follow-up..." while busy
- 🔥 **14.5 Auto-drain**: current run finishes → first queued auto-dispatches; count decreases
- **14.6 Per-item menu** (⋮): Edit, Copy, Repeat, Move up/down (hidden on edges), Remove
- **14.7 Header**: count badge, X (confirm-clear-all), ▶ Play now, ▼/▲ collapse
- 🔥 **14.8 localStorage**: queue 3 items, refresh page → all 3 still queued
- **14.9** Different project → separate queue (per-project key)
- **14.10** Click Play now while streaming → toast "Wait for current run to finish"
- 🔥 **14.11 Drag-reorder (R5-5)**: hover grip → drag item to new position → order updates, persists

---

## 15. Project Export — escape hatch (R5-3)

- 🔥 **15.1** Open ProjectMenu (initials avatar in toolbar) → "Export project (.tar.gz)" link
- 🔥 **15.2** Click → browser downloads `<slug>-YYYY-MM-DD.tar.gz` (a few hundred KB to ~5 MB depending on project)
- **15.3** Extract locally: `tar -xzf <file>.tar.gz` → see your full project tree
- **15.4** Verify: NO `node_modules`, NO `.next`, NO `.git` inside (excludes worked)
- **15.5** `cd <extracted> && npm install && npm run dev` → project runs locally on your machine
- **15.6** Stop Fly machine → click Export → toast "Start your project preview first"

---

## 16. Migration Runner (R5-1)

You've already used this for setup, but verify:

- 🔥 **16.1** `npm run db:migrate:dry` → "✓ All N migration(s) already applied" (when nothing pending)
- **16.2** Add a dummy migration `999_test.sql` with `select 1;` → `npm run db:migrate:dry` → lists it as pending → `npm run db:migrate` → applies → re-run dry → empty
- **16.3** `npx tsx scripts/apply-migrations.ts --force 999_test.sql` → re-applies
- **16.4** Bad SQL → halts with clear error; migrations before it stay applied
- **16.5** `select * from schema_migrations` → has rows for everything you've applied

---

## 17. Cost Verification

| Action | Cost | Verification |
|---|---|---|
| **Free**: SEO files, custom domains, BYO analytics, SARIF, auth scaffold, email scaffold, Stripe webhook scaffold, Playwright scaffold, snippets, queue, project export, JWT hook UI, migration runner | $0 | No `agent_runs` row |
| Quick security scan | $0 | No agent_runs |
| In-depth security scan | ~$0.03 (~1 cr) | agent_runs with haiku |
| Agent mode | Baseline | Normal |
| Plan mode (Deep think OFF) | **Same as Agent** | No surprise |
| Plan + Deep think ON | **~5×** | Opus in agent_runs |
| Code mode | ~⅕ | Haiku in agent_runs |
| Chat without knowledge set | Baseline | Empty resolver |
| Chat with 1500-char user knowledge | +~$0.005/turn | +1500 input tokens |
| Chat with RAG matches | +~$0.013/turn | +4000 chars chunks |
| **Embed doc on upload (R5-2)** | **~$0.00002 per chunk** | OpenAI embeddings — basically free |
| Test run (npm test) | $0 from us | Fly compute already paid |
| Publish + rollback | $0 from us | CF API free |

---

## 18. Final regression

```sh
npx tsc --noEmit         # zero new errors (1 pre-existing OK)
npx vitest run           # 268/268 passing
npm run db:migrate:dry   # all applied
```

If green and all 🔥-marked tests pass → ship it.

---

## 19. Known gaps (not yet built)

- Sidecar Fly machines for parallel Playwright runs
- Real-time per-run Playwright trace viewer in panel
- Custom GitHub OAuth for snippet import
- Per-user usage dashboard (telemetry exists, no UI yet)
- Free-tier credit grant on signup (manual today)
