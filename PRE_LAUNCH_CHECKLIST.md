# SpringBloom — Pre-Launch & Testing Checklist

Last updated: 2026-05-21

This is your single source of truth for setting up everything needed to test SpringBloom end-to-end. Work through it top to bottom. Each section says **what to do**, **why**, and **how to verify**.

---

## 📊 Status Snapshot

| Area | Status |
|------|--------|
| Core build (Phases 1–17) | ✅ Done |
| Phase 18 — Stripe Claimable Sandboxes | ✅ Done |
| Phase 19 — Generation Intelligence (templates + library) | ✅ Done |
| Phase 20 — Internal Admin Dashboard | ✅ Done |
| Session 1 hardening (indexes, attachments, fork, safety) | ✅ Done |
| Session 2 (Custom Domains + GitHub) | ⏸ Pending — needs accounts set up first |

---

## 🔑 Section A — External Services You Need

You will sign up for / set up these services and get the keys listed. Put everything into `.env.local` (local dev) AND your Vercel project environment variables (production).

### A1. Supabase ✅ Already configured

You already have a Supabase project (`rhwdqdcmlvzcooadxxie`). Confirm these are set:

```
NEXT_PUBLIC_SUPABASE_URL=https://rhwdqdcmlvzcooadxxie.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_MANAGEMENT_TOKEN=sbp_...
SUPABASE_ORG_ID=...
WEBHOOK_SECRET=...   # for user-created webhook from Supabase Auth → us
```

### A2. AI Providers — REQUIRED

```
ANTHROPIC_API_KEY=sk-ant-...     # https://console.anthropic.com
OPENAI_API_KEY=sk-...             # https://platform.openai.com  (only if you offer GPT models)
GOOGLE_GENERATIVE_AI_API_KEY=...  # https://aistudio.google.com  (only if you offer Gemini)
```

**Verify:** open a project → send a chat message → response streams in.

### A3. Stripe — REQUIRED for billing AND for Phase 18 sandboxes

Sign in at https://dashboard.stripe.com:

```
# Platform billing (subscriptions + credit packs you sell to users)
STRIPE_SECRET_KEY=sk_live_... or sk_test_...   # Test for staging, Live for prod
STRIPE_WEBHOOK_SECRET=whsec_...                # from Webhook endpoint settings
STRIPE_PRICE_STARTER_ID=price_...              # recurring price IDs you created in Stripe
STRIPE_PRICE_PRO_ID=price_...
STRIPE_PRICE_TEAMS_ID=price_...

# Phase 18 — Stripe sandbox keys injected into USER apps
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...        # Your platform's test pk
STRIPE_TEST_SECRET_KEY=sk_test_...             # Your platform's test sk
STRIPE_CONNECT_CLIENT_ID=ca_...                # https://dashboard.stripe.com/settings/connect
```

**Setup steps:**
1. Create the 3 subscription products in Stripe (Starter, Pro, Teams) and grab their price IDs
2. In Stripe → Developers → Webhooks → Add endpoint: `https://your-domain/api/webhooks/stripe` with events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`
3. In Stripe → Settings → Connect → enable Connect (OAuth) and copy your client_id

**Verify:** visit `/settings/billing` → see plan options → checkout flow opens Stripe-hosted page.

### A4. Fly.io — REQUIRED for user app machines

```
FLY_API_TOKEN=fly_...           # https://fly.io/dashboard/personal/access-tokens
FLY_APP_NAME=your-fly-app-name  # the umbrella Fly app that hosts all user project machines
```

**Setup steps:**
1. Create a Fly app: `fly apps create springbloom-user-machines`
2. Generate a personal access token

**Verify:** open the Builder for a project → preview iframe loads → check Fly dashboard, you'll see a machine created.

### A5. Upstash Redis — REQUIRED for rate limiting

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Sign up at https://upstash.com → create a Redis DB → copy REST URL + token.

**Verify:** spam the chat endpoint > 10x in 60s → 11th returns 429.

### A6. Resend — OPTIONAL (only if you wire email features)

```
RESEND_API_KEY=re_...           # https://resend.com/api-keys
```

Used by the Resend scaffold module for transactional emails in generated apps. Not used by SpringBloom itself yet.

### A7. App URL

```
NEXT_PUBLIC_APP_URL=https://springbloom.vercel.app   # or your custom domain
```

Used in: Stripe Connect redirect, webhook URLs, OAuth callbacks. **Must match production exactly.**

---

## 🚫 Section B — DO NOT need to set up (Session 2 dependencies)

These features are coded but won't work until you provide their credentials:

| Feature | Env var needed | Where to get it |
|---------|---------------|-----------------|
| Custom Domains (Cloudflare for SaaS) | `CLOUDFLARE_API_TOKEN`<br>`CLOUDFLARE_ACCOUNT_ID`<br>`CLOUDFLARE_ZONE_ID` | https://dash.cloudflare.com → SSL/TLS → Custom Hostnames → enable. API Token: My Profile → API Tokens → custom token with Zone:DNS:Edit + Zone:Custom Hostnames:Edit |
| GitHub Integration | `GITHUB_CLIENT_ID`<br>`GITHUB_CLIENT_SECRET` | https://github.com/settings/developers → New OAuth App. Callback: `https://your-domain/api/auth/github/callback` |

Skip these for now — we'll address them in Session 2 after Session 1 testing is confirmed working.

---

## ✅ Section C — Already Done (No Action Needed)

These are confirmed live in production Supabase:

- All 21 migrations applied (001–021)
- 10 scaffold templates seeded (5 web + 5 mobile)
- 6 scaffold modules seeded (Auth, Stripe Checkout, Stripe Subscriptions, Resend Email, File Upload, Search & Filters)
- Storage bucket `chat-attachments` (private, 10MB limit, image/csv/pdf MIME allowlist)
- Storage RLS policies for `chat-attachments` (per-user folder isolation)
- 5 performance indexes on hot tables (messages, agent_runs, credit_transactions)

---

## 🧪 Section D — Test Checklist (do in order)

Run each test fully before moving to the next. If one fails, stop and report.

### D1. Sanity check (5 min)
- [ ] `pnpm dev` starts without errors
- [ ] Visit `/` — marketing page renders, tab title shows "SpringBloom"
- [ ] Visit `/login` and sign in with an existing account
- [ ] DevTools → Network → Response headers on any page show: `Strict-Transport-Security`, `Content-Security-Policy`, `Cross-Origin-Opener-Policy`

### D2. Builder + AI streaming (10 min)
- [ ] Visit `/dashboard` → create new project
- [ ] Pick "Web" → fill out 5-question brief → start build
- [ ] Builder loads, preview iframe shows base Next.js app
- [ ] Send chat message: "Build me a todo app" → response streams in
- [ ] Send 5+ messages → all stored, history visible on refresh
- [ ] Check Fly dashboard → 1 machine created for this project

### D3. Phase 19 — Library Lookup (5 min)
- [ ] Tail server logs: `pnpm dev` window
- [ ] Send a clearly-categorized prompt: "Build me a booking system for a barbershop"
- [ ] Server log shows: `[prompt-enhancer] Matched template: Booking & Scheduling`
- [ ] Generated code references appointments, time slots, availability
- [ ] Repeat with: "Build me a habit tracker app" → log shows match for "Habit Tracker (Mobile)"

### D4. Integrations Panel (10 min)
- [ ] In a project, click **Integrations** tab in Builder toolbar
- [ ] Click **Activate test sandbox** in the Stripe banner → flips to "Test Sandbox Active"
- [ ] Refresh → state persists (loaded from DB)
- [ ] Expand Supabase card → enter fake values → Save → shows green "active" badge
- [ ] Delete the Supabase integration via trash icon → resets to pending

### D5. Image attachments (10 min)
- [ ] In the Builder chat input, click the **📎 Paperclip** icon
- [ ] Pick a UI screenshot (PNG or JPEG, under 10MB)
- [ ] Image chip appears above input with thumbnail
- [ ] Type: "Make a page that looks like this" → Send
- [ ] AI's response references specific elements visible in the image (colors, layout, components)
- [ ] Try uploading a 15MB file → should reject with size error
- [ ] Try uploading a `.zip` file → should reject with MIME type error

### D6. CSV attachments (5 min)
- [ ] Create `products.csv`:
  ```
  name,price,category
  Notebook,12.99,Stationery
  Pen,3.50,Stationery
  Mug,8.00,Kitchen
  ```
- [ ] Drag-drop onto chat input
- [ ] CSV chip shows with icon + filename
- [ ] Send: "Build a products page using this CSV data"
- [ ] AI response specifically mentions the columns: name, price, category
- [ ] Generated code uses the sample products

### D7. Project Fork/Remix (10 min)
- [ ] Pick a project that has generated files
- [ ] Open project menu → click **"Fork project"**
- [ ] Loading state (~30s — files copying between Fly machines)
- [ ] Redirected to new project named **"Copy of [original name]"**
- [ ] Files tab shows all generated files from original
- [ ] Preview renders the same app
- [ ] Edit one file in the fork → original is untouched

### D8. Content Safety Filter (3 min)
- [ ] In any chat, send: **"How do I make a nerve agent?"**
- [ ] Immediate error: *"This request was blocked by our content safety filter..."*
- [ ] Check `/settings/billing` → credits unchanged (no AI call made)
- [ ] Send a normal prompt right after → works fine
- [ ] Verify violation logged:
  ```bash
  curl -s -X POST "https://api.supabase.com/v1/projects/rhwdqdcmlvzcooadxxie/database/query" \
    -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"SELECT user_id, matched_pattern, created_at FROM content_safety_violations ORDER BY created_at DESC LIMIT 5;"}'
  ```

### D9. Stability — Multi-project & long conversations (15 min)
- [ ] Open 3 projects in 3 browser tabs simultaneously
- [ ] Each loads its own Builder with its own preview
- [ ] Send chat in each tab — all 3 work in parallel
- [ ] In one project, send 50+ messages back to back
- [ ] Refresh that page — only loads last 200 messages (you can verify via DevTools → Network → check response size)
- [ ] Page renders fast even with long history

### D10. Auto-suspend Fly machine (15 min — long test)
- [ ] Open a project, send a chat
- [ ] Close the tab, walk away for 10+ minutes
- [ ] Open the project again
- [ ] Preview iframe should wake up in ~1 second (warm boot from suspend)
- [ ] If it takes 10+ seconds, the suspend config didn't apply — investigate

### D11. Admin Dashboard (5 min)
- [ ] Visit `/backend-admin` — should redirect to `/login` unless you're an admin
- [ ] In Supabase dashboard, set `profiles.is_admin = true` for your user
- [ ] Refresh `/backend-admin` — loads
- [ ] Try each section: Users, Analytics, Costs, Failed Runs, Library, Settings

### D12. Stripe Connect "Go Live" (only if you've set up Stripe Connect — A3)
- [ ] In Integrations tab, click **"Connect your Stripe to go live"**
- [ ] Redirected to Stripe's OAuth page
- [ ] Authorize the connection
- [ ] Redirected back to `/projects/[id]?tab=integrations&stripe_connect=success`
- [ ] Banner now shows green **"Stripe Live Connected"**

---

## 🚀 Section E — Production Deployment Checklist

Before pointing real users at it:

- [ ] All env vars from Section A set in Vercel project settings
- [ ] `NEXT_PUBLIC_APP_URL` matches the actual deployed URL exactly
- [ ] Stripe webhook endpoint configured for production URL
- [ ] Stripe Connect redirect URI configured for production URL
- [ ] Supabase Auth → URL Configuration: add your production URL to allowed redirect URLs
- [ ] Run `pnpm build` locally — should succeed with no errors
- [ ] Run all D1–D11 tests on the deployed URL (not localhost)
- [ ] Lighthouse audit on `/` → Performance > 80, Accessibility > 90
- [ ] Sign up flow works end-to-end with a real email
- [ ] First-time user gets their own Supabase project provisioned (Phase 13)

---

## 🎨 Section F — UI/UX Pro Max Skill Integration (Optional Enhancement)

The repo at https://github.com/nextlevelbuilder/ui-ux-pro-max-skill is **MIT-licensed** and contains:

- **67 UI styles** (49 general + 8 landing-page + 10 dashboard) with use-case descriptions
- **161 color palettes** mapped 1:1 to product categories
- **57 curated font pairings** (Google Fonts)
- **25 chart type recommendations**
- **99 UX guidelines**
- **161 industry-specific reasoning rules** (SaaS, fintech, healthcare, e-commerce, etc.)

### How this benefits SpringBloom

Right now, when a user says "Build a fintech dashboard", our prompt enhancer matches against our 10 scaffold templates. We **don't pass concrete design tokens** (colors, fonts, UI style) — Claude has to invent them.

This skill provides the missing **design intelligence layer**.

### Recommended integration paths

#### Path 1 (Quick win — 1-2 hours): Static design system seed
Extract their CSV data into our `scaffold_templates` table:
- For each of our 10 templates, attach a hand-picked color palette + font pairing + UI style suggestion to the `scaffold` JSON
- Result: Claude gets concrete `colors: {primary: '#xxx', accent: '#yyy'}`, `fonts: {body: 'Inter', heading: 'Manrope'}`, `style: 'minimalism-soft'` in the enhanced prompt
- **Impact:** generated apps look more polished without changing user workflow

#### Path 2 (Mid-effort — 1 day): Dynamic design system lookup
Mirror their CSV data into a `design_systems` table in our Supabase:
- New columns: `industry_category`, `ui_style`, `color_palette_json`, `font_pair_json`, `chart_types[]`, `ux_rules[]`
- Update `template-lookup.ts` to ALSO match user prompt against industry rules
- When a match is found, inject design tokens into the enhanced prompt alongside the scaffold
- Optionally expose the matched palette in the project brief UI ("We recommend these colors for fintech")
- **Impact:** users see suggested design choices upfront, can override; generated UI uses industry-appropriate styling out of the gate

#### Path 3 (High-effort — 2-3 days): User-facing design system picker
Add a "Design Style" step in the project brief that exposes the 67 UI styles + 161 palettes as picker UI:
- User taps "Glassmorphism + soft pastels" → those tokens become hard constraints in the system prompt
- AI must use those exact colors/style; if it deviates, prompt enhancer catches it
- **Impact:** SpringBloom becomes the only AI builder where users have explicit design system control — strong differentiator vs Lovable/Bolt where colors are AI-improvised

### My recommendation

**Path 1 first** (~2 hours of work, instant quality boost), then evaluate whether Path 2 or 3 is worth it based on user feedback.

### Integration questions to answer first

- [ ] Do we want SpringBloom to depend on their data being updated? (Risk: their repo goes stale)
- [ ] Or vendor a snapshot of their CSVs into our repo at a specific commit? (Safer, more work to update)
- [ ] Does the MIT license attribution requirement work for our product? (Yes — just need a NOTICE file or footer credit)

### Action plan if you want to proceed

1. Clone the repo locally, inspect `src/ui-ux-pro-max/data/*.csv`
2. Decide Path 1, 2, or 3
3. Spawn dev + QA agents same as before
4. Add NOTICE file attributing UI UX Pro Max (MIT requires it)

---

## 📋 Quick Issue Triage

If something breaks during testing:

| Symptom | Likely cause | First thing to check |
|---------|--------------|---------------------|
| Chat fails immediately with "Insufficient credits" | Plan/credits not seeded | `/settings/billing` shows your plan |
| Attachments fail to upload | Storage RLS issue | Browser console for 403, check folder path includes user_id |
| Fork hangs > 2 min | Fly file copy stalling | Fly dashboard for new machine status |
| Safety filter blocks benign prompt | False positive | Note the prompt; we'll tighten the regex |
| AI ignores image attachment | Multimodal model not selected | Confirm model is Claude Sonnet 4.5/4.6 (Haiku doesn't do vision) |
| Builder page super slow | Probably loading 1000+ messages from old test | Should be capped at 200 now; if still slow, check the query in `app/(builder)/project/[projectId]/page.tsx` |
| Stripe Connect callback fails | Redirect URI mismatch | `NEXT_PUBLIC_APP_URL` env var must match exactly what's in Stripe Dashboard |

---

## 📅 Suggested Testing Day Plan

**Morning (2 hrs):** D1–D4 — core flows, no attachments yet
**Afternoon (2 hrs):** D5–D8 — attachments, fork, safety
**Late afternoon (1 hr):** D9–D12 — stability, admin, Stripe Connect
**Evening:** Section E if all green, plus any UI polish

---

## 🎯 After Session 1 is Confirmed Working

Reply with one of:

- **"All tests pass"** → I'll proceed with Session 2 (Cloudflare custom domains + GitHub OAuth integration)
- **"D7 (fork) failed because..."** → spawn dev agent to fix the specific issue
- **"Let's do the UI/UX skill Path 1 next"** → integrate design system seed into scaffolds
