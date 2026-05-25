# Manual Testing — Tier S + Tier A Features

Tests for everything shipped in this push: Security Scanner, Plan/Agent/Code modes, Knowledge, SEO/AEO, Custom Domains.

---

## 0. Prerequisites (Run Once)

Apply these migrations in your Supabase SQL editor (in order):

```
supabase/migrations/031_security_scans.sql
supabase/migrations/032_message_modes.sql
supabase/migrations/033_knowledge.sql
supabase/migrations/034_custom_domains.sql
```

Then verify these env vars are set (in `.env.local`):

| Var | Used by | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | Security scanner (in-depth), modes | In-depth security scan + Plan mode |
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Modes | Cross-provider mode routing |
| `CLOUDFLARE_API_TOKEN` | Custom domains | Custom hostname provisioning |
| `CLOUDFLARE_ZONE_ID` | Custom domains | Custom hostname zone |

Restart `npm run dev` after any env change.

---

## 1. Security Scanner

### Setup
1. Open any project in the builder.
2. Ensure the preview is running (Fly machine started).
3. Click the **Security** tab (Cloud icon).

### Quick Scan (free, ~5s)

**Test 1.1 — Empty project (no migrations, no deps)**
- [ ] Click **Quick scan**.
- Expected: spinner appears, then "No issues found" green panel, or a banner like "No npm audit output (project may not have a lockfile yet)".
- Expected: scan row in Supabase `security_scans` with `scan_type='quick'`, `status='completed'`, `findings_count=0`.

**Test 1.2 — Project with a table missing RLS**
- Generate any project. In the AI chat, ask: "Add a `todos` table without RLS for now."
- After it runs, click **Quick scan**.
- Expected: One CRITICAL finding "Table 'public.todos' has no Row Level Security".
- Expected: Severity tile "Critical" shows **1**.
- Expected: Recommendation includes `alter table public.todos enable row level security;`

**Test 1.3 — Accept risk flow**
- On a finding, expand it, click **Accept risk**.
- Expected: Finding disappears from the main list.
- Expected: "Accepted risks · 1" collapsed panel appears at the bottom.
- Expand it and click **Re-open**.
- Expected: Finding reappears at the top.

**Test 1.4 — Dependency vulnerability detection**
- In the project, install a known vulnerable package: ask AI to "install lodash@4.17.20" (known prototype pollution CVE).
- Run **Quick scan** again.
- Expected: Dependency finding with severity ≥ medium, includes `lodash` in package name, has an advisory URL link.
- Click the advisory link — should open in a new tab.

### In-Depth Scan (~30s, ~1 credit)

**Test 1.5 — Code review surfaces real issues**
- In a project, ask AI to write an API route that reads from request body without validation, e.g. "create a POST /api/admin route that runs whatever SQL is in the body".
- Wait for it to finish.
- Click **In-depth scan**.
- Expected: progress takes 15-30s, then findings appear under "Code Review (AI) · N".
- Expected: Severity is HIGH or CRITICAL, category is `injection` or `auth`.
- Expected: Recommendation is concrete (not vague).

**Test 1.6 — No false positives on clean code**
- Open a fresh scaffolded project (no custom code yet).
- Run **In-depth scan**.
- Expected: Either zero code-review findings OR all findings are real (no "missing rate limiting" or "should add helmet" — those are excluded by the prompt).

**Test 1.7 — Scanner errors are non-blocking**
- Stop the project's Fly machine.
- Click **Quick scan**.
- Expected: Scan still completes. Dependency scanner shows an amber "No Fly machine available — start your project preview" message. RLS scanner runs normally on any migrations it can find.

### Edge cases
- [ ] **Refresh button** in header re-fetches scan from API
- [ ] Multiple scans in a row — only the latest displays
- [ ] Severity counts in tiles match the actual finding list

---

## 2. Plan / Agent / Code Modes

### Setup
- Open the builder. The mode toggle is next to the **Visual edits** button in the composer row.

### Agent Mode (default)

**Test 2.1 — Default behavior unchanged**
- [ ] Agent is selected on load.
- [ ] Send a normal message ("Add a contact form").
- Expected: Same behavior as before — code generation streams in.
- Expected: Model used is whatever the user picked in the model dropdown.

### Plan Mode

**Test 2.2 — Plan mode produces a plan, not code (default = same model)**
- Click **Plan** in the toggle (violet active state).
- Notice the "Deep think" checkbox + (i) info icon appear next to the toggle.
- Leave Deep think OFF. Send: "Add Stripe checkout to my landing page."
- Expected: Assistant response is a markdown plan (files to touch, steps, considerations) — NOT artifact code.
- Expected: **Cost is the SAME as a normal message** — same model as Agent, just a planning-focused prompt.

**Test 2.3 — Deep think info tooltip**
- Hover (or click) the (i) icon next to "Deep think".
- Expected: Tooltip appears showing:
  - "Routes your plan through a reasoning-tier model"
  - "Costs ~5× a normal message — only use for non-trivial planning"
  - Hint to use it for DB schema design, migrations, refactors.
- Move the cursor away — tooltip disappears.

**Test 2.4 — Deep think upgrades to reasoning model**
- Tick the "Deep think" checkbox (turns violet).
- Send: "Design the database schema for a multi-tenant SaaS with row-level isolation."
- Expected: Response takes longer (~15-25s), uses Opus / GPT-5 / Gemini 2.5 Pro depending on selected provider.
- Expected: ~5× the cost of a normal message (visible in agent_runs row).
- Untick the checkbox — next message goes back to your normal model.

**Test 2.5 — Plan is editable then approvable** (manual rendering needed if PlanCard not wired into MessageItem yet)
- [ ] In a follow-up, edit the plan markdown.
- [ ] Click **Approve & Build**.
- Expected: Mode auto-switches back to Agent and execution begins.

### Code Mode

**Test 2.6 — Code mode uses Haiku/cheap model**
- Click **Code** (amber active state).
- Send: "Change the button background to red."
- Expected: Response is faster (~half the time), shorter, diff-focused.
- Expected: Cost is ~1/5 normal.

**Test 2.7 — Model selector still works across modes**
- Switch user model to Gemini/OpenAI.
- Switch mode to Plan with Deep think ON.
- Expected: Deep think routes to the matching provider's reasoning model (Gemini 2.5 Pro / GPT-5), not Anthropic.

**Test 2.8 — Toggle is disabled during streaming**
- [ ] While a message is streaming, the mode toggle and Deep think checkbox are disabled.

---

## 3. Knowledge — file-first 3-tier

### Setup
- Apply migration 033.
- User-level knowledge lives at `/api/user/knowledge`.
- Project-level lives as `AGENTS.md` in the project's Fly machine.

### User-level Knowledge

**Test 3.1 — Set + read user knowledge**
- Open browser devtools console.
- Run:
  ```js
  await fetch('/api/user/knowledge', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Always prefer Drizzle ORM. Never use Prisma.' }),
  })
  ```
- Then `await (await fetch('/api/user/knowledge')).json()` — should return the content.

**Test 3.2 — User knowledge is injected into chat system prompt**
- After 3.1, send a chat message: "Add a database table for users."
- Expected: The generated code uses Drizzle ORM (not Prisma).
- (How to verify: inspect the artifact code; should see `drizzle-orm` import, not `@prisma/client`.)

### Project-level AGENTS.md

**Test 3.3 — Project AGENTS.md is read on every turn**
- In a project, ask the AI to "Create an AGENTS.md file that says: This project uses TanStack Query for all data fetching."
- After it's written, in a NEW chat message, ask: "Add a posts list page."
- Expected: Generated code uses TanStack Query (`useQuery`), not raw fetch/SWR.

**Test 3.4 — Fallback file paths**
- Delete `AGENTS.md` from the project (via Files panel).
- Create `.cursorrules` with content "Use Tailwind classes only — no inline styles."
- Send a chat message asking for any new component.
- Expected: Generated code uses Tailwind classes, no `style={{}}` props.

**Test 3.5 — Token budget cap respected**
- Create an AGENTS.md with 10,000+ chars of nonsense.
- Send any message.
- Expected: System prompt is not blown out — only 60% of the 6000-char budget (~3600 chars) of the AGENTS.md gets through, with a "…[knowledge truncated]" marker.

### Both tiers together

**Test 3.6 — Project wins on conflicts**
- Set user knowledge: "Use Tailwind."
- Set project AGENTS.md: "Use vanilla CSS only — no frameworks."
- Send: "Add a styled button."
- Expected: Generated code uses vanilla CSS, not Tailwind (project AFTER user → wins via recency).

---

## 4. SEO / AEO

### Setup
- Open a project, click the **SEO** tab (Search icon).

**Test 4.1 — Default config loads**
- Expected: Form pre-fills with project name, slug-based URL (`https://{slug}.springbloom.app`), default description.

**Test 4.2 — Preview files**
- Click **Preview files**.
- Expected: 6 files appear in the list:
  - `public/robots.txt`
  - `public/llms.txt`
  - `app/sitemap.ts`
  - `lib/seo/config.ts`
  - `lib/seo/SEO.tsx`
  - `lib/seo/jsonld.ts`
- Click each to expand — verify content is correct (e.g. robots.txt includes `GPTBot`, `PerplexityBot`, `ClaudeBot`).

**Test 4.3 — Apply to project**
- Click **Apply to project** (project's Fly machine must be running).
- Expected: Green "Wrote 6 files" panel listing each path.
- Open the Files panel — confirm `public/robots.txt` and others now exist in the project.
- Open `https://{preview-url}/robots.txt` — should serve the generated content.
- Open `https://{preview-url}/llms.txt` — should serve the AEO file.

**Test 4.4 — Custom config works**
- Edit the site name to "My Cool App", Twitter handle to "@coolapp", custom description.
- Click **Preview files** again.
- Expected: `llms.txt` and `lib/seo/config.ts` reflect the new values.

**Test 4.5 — Apply without Fly machine fails gracefully**
- Stop the preview machine.
- Click **Apply to project**.
- Expected: Toast error "No Fly machine available — start your project preview first".
- Form data is preserved.

---

## 5. Custom Domains

### Setup
- Publish a project first (use **Publish** modal).
- Once published, the modal shows a "Custom Domains" section.

**Test 5.1 — Add a domain (happy path)**
- In the published modal, type `test.yourdomain.com` (use a real domain you control).
- Click **Add**.
- Expected: Cloudflare creates a Custom Hostname, row appears in DNS table.
- Expected: Status shows `DNS verifying` + `SSL pending`.
- Expected: Two DNS records displayed with **Copy** buttons:
  - `CNAME @ → {slug}.springbloom.app`
  - `TXT _cf-custom-hostname → {verification token}`

**Test 5.2 — Invalid hostname rejected**
- Type `not a valid hostname` or `127.0.0.1`.
- Click **Add**.
- Expected: Toast error "Invalid hostname", no row added.

**Test 5.3 — Duplicate hostname blocked**
- Try adding the same hostname twice.
- Expected: Second attempt returns "Hostname already added" error.

**Test 5.4 — Re-check DNS**
- Click the refresh icon on a pending domain.
- Expected: Calls Cloudflare, updates status, "checked Ns ago" label updates.

**Test 5.5 — Go live (real DNS)**
- Actually add the displayed CNAME + TXT records at your registrar.
- Wait ~2-5 minutes, click **Re-check DNS**.
- Expected: Status flips to `DNS active` + `SSL active`.
- Border turns emerald green; **External link icon** appears in the header.

**Test 5.6 — Mark as primary**
- On a live domain, click **Make primary**.
- Expected: Badge "Primary" appears, button label changes to "Unset primary".
- Add a second live domain, mark it primary.
- Expected: First domain loses its primary status (only one primary per project enforced by partial unique index).

**Test 5.7 — Delete domain**
- Click the trash icon.
- Confirm in the prompt.
- Expected: Domain removed from list, Cloudflare Custom Hostname also deleted.

**Test 5.8 — CF token missing — graceful error**
- Temporarily unset `CLOUDFLARE_API_TOKEN`, restart server.
- Try to add a domain.
- Expected: 502 error toast with the CF API error message (not a crash).

---

## 6. Regression Tests

After all the above, run the full test suite to confirm nothing broke:

```sh
npx vitest run
```

Expected: 236/236 passing.

```sh
npx tsc --noEmit
```

Expected: zero new errors (one pre-existing `multi-turn.test.ts` line 228 error is acceptable).

---

## 7. Cost Verification

Watch your AI spend in real-time:

| Action | Expected cost |
|---|---|
| Quick security scan | $0 |
| In-depth security scan | ~$0.03 (~1 credit) |
| Agent mode message | Same as before |
| **Plan mode (default — Deep think OFF)** | **Same as Agent — same model, planning prompt** |
| **Plan mode + Deep think ON** | **~5× normal (~7-10 credits) — Opus/GPT-5/Gemini 2.5 Pro** |
| Code mode message | ~⅕ of agent cost |
| Chat with no user knowledge set | Same as before |
| Chat with 1500-char user knowledge | +~$0.005 per turn |
| Chat with full 6000-char knowledge budget used | +~$0.02 per turn |
| SEO file generation | $0 (pure code gen, no AI call) |
| Custom domain add/check | $0 from us (Cloudflare API is free for ≤100 hostnames/zone) |

If you see unexpected spend, check the `agent_runs` table — every AI call writes a row with token counts.

---

## 8. Round 0 — Cost Optimization (NEW)

Apply migration `035_cache_telemetry.sql` first. Set `FLY_SWEEPER_SECRET` in `.env.local`.

**Test 8.1 — Anthropic prompt caching is hitting**
- Start a chat with Claude Sonnet selected. Send 3 messages back-to-back ("hi", "add a button", "make it blue").
- Open Supabase → `agent_runs` table → look at last 3 rows.
- Expected: First row: `cache_creation_input_tokens > 0`, `cache_read_input_tokens` may be 0.
- Expected: Rows 2 & 3: `cache_read_input_tokens > 0`, `cache_creation_input_tokens` may be smaller.
- Target after a week of usage: average `cache_read / (cache_read + cache_creation + tokens_input) > 60%`.

**Test 8.2 — AGENTS.md cache (no Fly wake-up every turn)**
- With a project preview running, watch the Fly logs (`fly logs -a springbloom-builder`).
- Send a chat message. Note the time of the `exec` call.
- Send another within 60 seconds.
- Expected: only ONE exec call (the first); second message reads from in-process cache.
- After 60s+, expected: another exec call.

**Test 8.3 — fileTree is now real (model knows what files exist)**
- Open a project with several files in the Files panel.
- Ask: "What files are in this project?"
- Expected: Model lists actual files (e.g. `app/page.tsx`, `lib/utils.ts`), not a generic guess.
- Before the fix: model would invent file names.

**Test 8.4 — Hold estimate now includes input cost**
- Long-running chat (>15 messages). Watch the credit estimate in the composer ("est. ~X credits").
- Expected: Estimate grows with conversation length (was previously flat).
- Confirm in `credit_transactions`: the hold amount should now reflect input + output.

**Test 8.5 — model_pricing cache (no DB hit per turn)**
- Open browser devtools network tab.
- Send 5 chat messages.
- Expected: Initial chat call may include model_pricing query; subsequent 4 should not (cache TTL = 5min).

**Test 8.6 — Fly sweeper (dry run + live)**
- In terminal:
  ```bash
  curl -H "Authorization: Bearer $FLY_SWEEPER_SECRET" \
    "http://localhost:3000/api/admin/fly-sweeper?dry_run=1&days=30"
  ```
- Expected: JSON `{ dry_run: true, candidates: [...], count: N }`. No machines destroyed.
- For a live test (CAREFUL): create a throwaway project, age it via `update projects set updated_at = now() - interval '40 days'`, then call without `dry_run=1`. Verify machine is destroyed in Fly dashboard.

---

## 9. Round 1 — Quick Wins (NEW)

### 9.1 SARIF Security Export

**Test 9.1.1 — Download SARIF after a scan**
- Run a Quick scan or In-depth scan with findings (see §1).
- A "SARIF" download chip appears next to the scan summary.
- Click it. Expected: file `<project-slug>-security-<scanId>.sarif` downloads.
- Open the file. Expected: JSON with `version: "2.1.0"`, `runs[0].tool.driver.name === "SpringBloom Security Scanner"`, `runs[0].results[]` matching findings.

**Test 9.1.2 — GitHub Code Scanning upload**
- In your GitHub repo Settings → Code Scanning → enable advanced setup.
- Upload the .sarif via Security tab → Code Scanning → Tools → Upload.
- Expected: Findings appear as PR annotations and in the Security tab.

**Test 9.1.3 — Accepted-risk filtering**
- After accepting some risks (§1.3), download the SARIF without `?include_accepted=1`.
- Expected: Accepted findings are excluded.
- Then download with `?include_accepted=1` appended.
- Expected: All findings present, accepted ones marked in `properties.accepted_risk: true`.

### 9.2 AGENTS.md Auto-Generation

**Test 9.2.1 — Created on first machine boot**
- Create a brand new project (or click "Start preview" on one that has no Fly machine).
- Wait for machine provision to finish.
- Open Files panel. Expected: `AGENTS.md` exists at project root.
- Open it. Expected: Contains `# <Project Name>`, sections for Project / Conventions / Security Baseline / Editing Rules, plus brief Q&A if user did planning.

**Test 9.2.2 — Won't clobber existing AGENTS.md**
- Edit AGENTS.md in the project ("Use Drizzle ORM exclusively").
- Stop and restart the project preview.
- Open AGENTS.md again. Expected: Your edits are preserved (not regenerated).

**Test 9.2.3 — Picked up by next chat turn**
- After step 9.2.2, ask the AI: "Add a database table for posts."
- Expected: Generated code uses Drizzle, not Prisma — proves the file was injected into the system prompt.

### 9.3 BYO-Analytics Adapters

**Test 9.3.1 — PostHog connect**
- Open Integrations tab. Scroll to "Analytics — bring your own" section.
- Click **PostHog** → expand. Paste a real PostHog Project Key (or `phc_test`).
- Click **Connect**. Expected: green "connected" badge, toast "wrote lib/analytics/posthog.ts".
- Open Files panel. Expected: `lib/analytics/posthog.ts` exists with the configured key.

**Test 9.3.2 — Plausible connect**
- Same as 9.3.1 but for Plausible. Field: site domain.
- Expected: `components/analytics/PlausibleScript.tsx` written.

**Test 9.3.3 — Update existing config**
- After connecting, expand again. Change a field value. Click **Update**.
- Expected: File rewritten with new value. Same connected state.

**Test 9.3.4 — Disconnect**
- Click **Disconnect** on a connected adapter.
- Confirm. Expected: Toast "disconnected", file deleted from project, badge removed.

**Test 9.3.5 — Required-field validation**
- Try connecting an adapter without filling the required field (marked `*`).
- Expected: Connect button is disabled. Hovering does not allow click.

### 9.4 PlanCard Auto-Render

**Test 9.4.1 — Plan-mode message renders as editable card**
- Select **Plan** mode in the toggle. Send: "Add Stripe checkout."
- Wait for stream to finish.
- Expected: Within ~1s after streaming completes, the assistant message swaps from plain text to a violet PlanCard with: header showing "PLAN · draft", markdown preview, Edit / Discard / Approve & Build buttons.

**Test 9.4.2 — Edit the plan markdown**
- On the PlanCard, click **Edit**.
- Expected: Markdown becomes editable textarea. Modify it.
- Click **Preview** — your edits show in the formatted preview.

**Test 9.4.3 — Approve & Build flow**
- Click **Approve & Build**.
- Expected: Plan card shows "Approved" badge. Mode toggle auto-switches to **Agent**. A new user message "Implement this plan: ..." is sent automatically.
- Expected: Agent mode then writes the actual code.

**Test 9.4.4 — Discard**
- Send a new plan, then click **Discard**.
- Expected: Plan card shows "Discarded" badge. No execution kicks off.
- Send a normal Agent message — confirm chat still works.

**Test 9.4.5 — Plans persist after refresh**
- Refresh the browser page.
- Open the project. Plan history should still show as PlanCards (not plain text), with their respective statuses.
- Edge: a Discarded plan should still show but with no actions.

---

## 10. Round 2 — Stripe Webhook Scaffold + Streamed Publish (NEW)

Apply migration `036_deployments.sql` first.

### 10.1 Stripe Webhook Scaffold (A1)

**Test 10.1.1 — Button visible only when Stripe is connected**
- Open Integrations tab on a project without Stripe connected.
- Expected: No "Scaffold webhook handler" section visible.
- Connect Stripe (any keys work — they're validated, not used here).
- Refresh. Expected: Violet "Scaffold webhook handler" section appears above the integration cards.

**Test 10.1.2 — Preview without applying**
- Expand the section. Click **Preview**.
- Expected: 3 or 4 files listed (4 if Supabase also connected):
  - `app/api/webhooks/stripe/route.ts`
  - `lib/stripe/server.ts`
  - `lib/stripe/events.ts`
  - `supabase/migrations/<ts>_stripe_events.sql` (only if Supabase connected)
- Click each to expand the content. Verify:
  - `route.ts` includes `stripe.webhooks.constructEvent` for signature verification
  - `route.ts` includes idempotency check via `stripe_events` table (if Supabase)
  - `events.ts` has typed handlers per event
  - Migration creates `stripe_events` with `id text primary key`

**Test 10.1.3 — Apply writes files to Fly machine**
- Click **Apply to project** (preview must be running).
- Expected: Green panel "Wrote 3-4 files" with each path listed.
- Open Files panel. Confirm all the files exist at the listed paths.
- Open `app/api/webhooks/stripe/route.ts` — verify it compiles (no red squigglies after `npm install stripe @supabase/supabase-js`).

**Test 10.1.4 — No Supabase = no idempotency migration**
- Disconnect Supabase integration.
- Click **Preview** again.
- Expected: Now only 3 files. Description shows "(no idempotency — connect Supabase to add it)".
- `route.ts` content no longer has the duplicate-event check.

**Test 10.1.5 — End-to-end with stripe-cli**
- Apply scaffold to a connected project.
- In terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — note the `whsec_` it prints.
- Add to project's `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`.
- Trigger: `stripe trigger checkout.session.completed`.
- Expected: Webhook returns 200, log shows `[stripe] checkout.session.completed: cs_test_xxx`.
- Trigger same event id twice (Stripe replays automatically) — expected: 2nd response is `{ received: true, duplicate: true }`.

### 10.2 Streamed Publish (C2)

**Test 10.2.1 — Phase progress shows live**
- Open a built project. Click **Publish** in the toolbar.
- Expected: Modal opens. Click **Publish** button.
- Expected: 4 step rows appear: Cloudflare project → Build → Upload → Deploy.
- Each row goes from `○` (pending) → spinning loader (active) → ✓ (done) in real-time as the publish progresses.
- An italic phase message ("Running npm run build inside your project...") shows below the steps.

**Test 10.2.2 — Build stats appear after build phase**
- Mid-publish, the Build / Bundle stats card appears showing:
  - "Build succeeded · 4.2s"
  - "Bundle 12 files · 234 KB"

**Test 10.2.3 — Build log toggle**
- Click "Build log" chevron.
- Expected: Black console panel expands, shows actual `npm run build` stdout from the Fly machine.
- Auto-expands on build failure (exit_code !== 0).

**Test 10.2.4 — Deployment row persisted**
- After a successful publish, query Supabase:
  ```sql
  SELECT id, status, build_duration_ms, bundle_size_bytes, file_count, published_url
  FROM deployments
  WHERE project_id = '<project-id>'
  ORDER BY created_at DESC LIMIT 5;
  ```
- Expected: New row with `status='success'`, populated stats.

**Test 10.2.5 — Failed build is recorded**
- Intentionally break the project (delete `app/page.tsx` or add `throw new Error()` in package.json's build script).
- Publish.
- Expected: Build step fails (red), build log auto-opens showing the error.
- `deployments` row has `status='failed'`, `error_message`, full `build_log`.

**Test 10.2.6 — Custom domains still work post-publish**
- After successful publish, the Custom Domains section appears (existing flow).
- Add a domain — verify the CNAME target matches the published URL.

**Test 10.2.7 — Network error handling**
- Stop the dev server mid-publish (kill `npm run dev`).
- Modal shows error state with retry button. Restart server, click Retry.
- Expected: Publish starts fresh.

---

## 11. Things NOT Yet Tested (Known Gaps)

- **Reference docs RAG** (`knowledge_docs` table) — schema exists, embedding pipeline pending.
- **Browser testing (Playwright)** — deferred (Round 3 / sidecar Fly machine work).
- **Generation-time security note hooks** — security_notes table not yet added.
- **Test runner panel** — Round 3.
- **Skills / Snippets library with `/` commands** — Round 3.
- **Stripe Products & Prices CRUD panel** — deferred from A1 (scaffold ships first).
- **Deployment rollback** — deployments table tracks history but rollback API/UI not yet built.
