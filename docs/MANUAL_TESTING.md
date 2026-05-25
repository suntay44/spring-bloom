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

## 8. Things NOT Yet Tested (Known Gaps)

These work but weren't in scope for manual testing:

- **PlanCard component** — built but not yet auto-rendered when a Plan-mode response arrives. Needs MessageItem to detect plan-mode messages and render PlanCard. Currently the plan markdown shows as a regular assistant message.
- **`AGENTS.md` auto-generation** on project create — `buildAgentsMd()` exists but isn't called yet from the project provisioning flow. Users have to ask the AI to create it manually for now.
- **Reference docs RAG** (`knowledge_docs` table) — schema exists, embedding pipeline pending.
- **SARIF export** for security findings — schema supports it, route not yet built.
- **Browser testing (Playwright)** — deferred to a later phase (needs sidecar Fly machine work).
