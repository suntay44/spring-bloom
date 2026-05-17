# Wild Cupcake — Programmer-Centric AI App Builder Plan
_Generated: 2026-05-14 | Stack confirmed through brainstorm session_

---

## Product Direction (locked in)

**Wild Cupcake is a no-code AI app builder for people who still care about code.**

The product can serve non-technical users, but the default audience is builders, developers, technical founders, agencies, and teams that want AI speed without losing engineering control. The app should feel closer to a programmable workspace than a toy website generator: every generated app has real code, review trails, deployable infrastructure, usage analytics, and security checks that cost credits only when they perform meaningful work.

### Core Promise

```
Prompt → clarify → plan → generate → review → preview → measure → deploy
```

### Positioning

- **Compared with Lovable-style builders:** keep the fast natural-language app creation, but make code inspection, diffs, security review, and production readiness first-class.
- **Compared with Replit-style agents:** keep the workspace, preview, deployment, and agent loop, but make each agent action traceable, budgeted, reviewed, and easy to roll back.
- **Compared with generic AI coding assistants:** own the full product lifecycle: app generation, cloud runtime, database provisioning, analytics, review, security, deployment, and billing.

### Primary Personas

- **Solo developer:** wants to scaffold production-grade apps quickly, inspect generated code, and avoid repetitive setup.
- **Technical founder:** wants to validate products fast while keeping a path to real engineering ownership.
- **Agency/team:** wants repeatable client builds, review reports, security posture, and handoff-ready code.
- **Non-technical builder:** can still start from plain English, but gets guided choices and safe defaults.

### Differentiators

- **Developer-grade transparency:** generated files, shell commands, migrations, dependencies, diffs, and agent reasoning are visible.
- **Integrated code review:** AI reviews every meaningful change for correctness, maintainability, accessibility, performance, and framework best practices.
- **Integrated security:** dependency scanning, secret scanning, RLS checks, API hardening checks, input validation checks, and deploy-blocking critical findings.
- **Built-in analytics:** project analytics, product events, build health, credit burn, prompt efficiency, deploy history, and generated app usage.
- **Credit-aware agent:** users see estimates before work starts, live burn while the agent runs, and a receipt after completion.
- **Human approval gates:** destructive operations, production database changes, deployment, paid APIs, and external integrations require explicit confirmation.

### Competitive Notes Checked 2026-05-14

- Lovable documentation positions the product around full-stack AI development with real code, security, and enterprise governance; it also exposes AI-driven security review as a credit-consuming chat action. Source: https://docs.lovable.dev/features/security
- Replit documentation positions Agent as an action-taking builder that plans, creates, tests, and deploys apps from natural language, with app testing and deployment loops as central product behaviors. Sources: https://docs.replit.com/core-concepts/agent/ and https://replit.com/products/agent
- Wild Cupcake should not merely copy those flows. The durable angle is: **an AI app builder that treats review, security, analytics, and credit economics as core engineering surfaces, not add-ons.**

---

## Product Flow: Surface vs Backend (locked in)

The product has two flows that must stay aligned:

- **Surface flow:** what the user sees, clicks, confirms, and expects.
- **Backend flow:** what the platform does behind the scenes to make the surface flow safe, traceable, and credit-aware.

### Surface Flow (user-facing)

```
Signup/Login
→ Prompt-first creation screen
→ User submits first app idea
→ 5 required project-brief questions
→ Simple PRD + build plan
→ User approves Start Building
→ Builder workspace: AI chat left, live preview right
→ Iterate through chat
→ Optional developer tools: Files, Diff, Review, Security, Analytics
→ Deploy when ready
```

Key UX rules:

- After signup, the user lands on the **prompt-first creation screen**, not a heavy dashboard.
- The dashboard is secondary: recent tasks, deployed apps, settings, billing, credits, database, security, and analytics.
- The first prompt starts discovery. It does **not** start coding.
- Every new project requires the 5-question project brief.
- AI can prefill answers from the prompt, but the user must review or confirm them.
- Coding starts only after the simple PRD/build plan is approved.
- Builder default layout is always: **chat/progress on the left, live preview on the right**.

### Backend Flow (behind the scenes)

```
Create profile + initial credits
→ Prepare user workspace
→ Store raw prompt
→ Store 5 project-brief answers
→ Generate structured PRD/build plan
→ Estimate credits
→ User approves plan
→ Create agent run + place credit hold
→ Builder agent generates app
→ Preview starts
→ Review/security pipeline runs
→ Credits finalize + receipt is saved
→ Deploy gate checks review/security status
```

Backend rules:

- Store the raw prompt, project-brief answers, generated PRD, approval timestamp, credit estimate, and agent run.
- Planner agent runs before builder agent.
- Builder agent cannot run until PRD approval exists.
- Credit hold is placed only after approval.
- Review/security runs after meaningful generated diffs.
- Critical security findings block deploy.
- Final credit receipt itemizes planner, builder, reviewer, scanner, analytics, and deployment costs.

### Backend Choice Rules

Users choose the backend path during the 5-question brief:

- **Managed Supabase:** platform provisions or reuses Wild Cupcake-managed Supabase.
- **Connect own Supabase:** user provides Supabase credentials; platform validates before generated code depends on it.
- **Decide later:** platform builds frontend/mock-data-first and marks backend decisions as pending before real data work.

---

## Delivery Strategy: UI/UX First (locked in)

Build the user experience before wiring our real backend. The first milestone is a polished, clickable product shell using mock data so we can validate the surface flow, pricing, settings, billing, prompt flow, and builder experience before committing backend complexity.

### UI/UX-first scope

Complete these with mock data before backend integration:

- Homepage / marketing landing page
- Pricing section/page
- Signup and login pages
- Prompt-first creation screen
- 5-question project brief
- Simple PRD + build plan approval
- Dashboard / recent tasks / deployed apps
- Builder shell with chat left and preview right
- Files, diff, review, security, analytics, and deploy tabs as mock surfaces
- User settings
- Credits and billing settings
- Database settings
- Security and analytics settings

### UI/UX gate before backend

Do not start Supabase auth wiring, real project persistence, Fly.io machines, AI streaming, Stripe, or deployment APIs until:

- all public, auth, app, settings, billing, and builder screens render with mock data
- responsive layouts are checked at mobile, tablet, and desktop widths
- the post-signup flow lands on `/new`
- first prompt opens the required project brief
- PRD approval is required before builder entry
- builder default layout is chat/progress left and live preview right
- pricing and credit usage are understandable without backend data
- settings and billing pages communicate the future real behavior clearly

Backend implementation begins only after this UI shell is accepted.

---

## Phase 0: Documentation Discovery — Confirmed APIs

### Next.js App Router (source: nextjs.org/docs)
- Root layout: `app/layout.tsx` (required, must have `<html>` + `<body>`)
- Pages: `app/[path]/page.tsx`
- API routes: `app/api/[path]/route.ts`
- Route groups (no URL impact): `app/(group)/page.tsx`
- Private folders (not routable): `app/_folder/`
- Dynamic segments: `app/builder/[projectId]/page.tsx`

### shadcn/ui (source: ui.shadcn.com/docs)
- Init: `pnpm dlx shadcn@latest init`
- Add component: `pnpm dlx shadcn@latest add [component]`
- Install path: `components/ui/[component].tsx`
- Sidebar API: `SidebarProvider > Sidebar > SidebarHeader / SidebarContent / SidebarFooter`
- Hook: `useSidebar()` → `{ state, open, setOpen, isMobile, toggleSidebar }`

### Vercel AI SDK (source: ai-sdk.dev/docs)
- `useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`
- Returns: `{ messages, sendMessage, status, stop, error, setMessages }`
- Status values: `'submitted' | 'streaming' | 'ready' | 'error'`
- Server: `streamText({ model, system, prompt })` → `result.toUIMessageStreamResponse()`
- Custom body: `sendMessage({ text }, { body: { customKey } })`

### Fly.io Machines API (source: fly.io/docs)
- Create: `POST /v1/apps/{app_name}/machines` — only `config.image` required
- Start: `POST /v1/apps/{app_name}/machines/{id}/start`
- Stop: `POST /v1/apps/{app_name}/machines/{id}/stop`
- Suspend: `POST /v1/apps/{app_name}/machines/{id}/suspend`
- Auth: `Authorization: Bearer ${FLY_API_TOKEN}`
- States: `created → starting → started → stopping → stopped/suspended`
- Auto-stop config in `fly.toml`: `auto_stop_machines = "suspend"`, `auto_start_machines = true`

### Supabase Auth in Next.js (source: supabase.com/docs)
- Packages: `@supabase/supabase-js`, `@supabase/ssr`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Server: use `supabase.auth.getClaims()` (NOT `getSession()`)
- Two clients: browser singleton + server per-request instance
- Protected routes: middleware pattern

---

## Architecture Summary (locked in)

```
PLATFORM FRONTEND   Next.js App Router + Tailwind + shadcn/ui → Cloudflare Pages
PLATFORM BACKEND    Supabase (auth, projects, credits, messages)
AI LAYER            Anthropic (Claude) + OpenAI (GPT-5.x) + Google (Gemini) via Vercel AI SDK
                    User picks model per prompt — locked during active stream only
AI TOOLCHAIN        Planner agent + Builder agent + Reviewer agent + Security agent
EXECUTION           Fly.io Machines — one per USER ACCOUNT
                    auto_stop_machines="suspend", auto_start_machines=true
                    sized by plan tier (shared-cpu-2x → performance-2x)
GENERATED APP DB    Supabase auto-provisioned via Management API
WEB PREVIEW         next dev on Fly.io machine → proxied iframe
MOBILE PREVIEW      expo start --web → phone-frame iframe
                    expo start --tunnel → QR code → Expo Go
DEPLOY              Web: Vercel API | Mobile: EAS Build
TRUST LAYER         code review runs, security scans, dependency checks, audit log
ANALYTICS           platform usage + generated app event tracking + build health
CREDITS             estimates, holds, final charge, itemized credit receipts
```

## Tech Stack (locked in)

### Platform App

- **Framework:** Next.js App Router
- **Language:** TypeScript strict mode
- **Styling:** Tailwind CSS + custom CSS layout system (`globals.css`)
- **UI system:** shadcn/ui for interactive components (Button, Dialog, Tabs, DropdownMenu, Progress, Tooltip, Sonner); custom CSS for layout (`.app-layout`, `.sidebar`, `.builder-chrome`, `.hero`, `.grid-3`, etc.)
- **Icons:** lucide-react
- **Animations:** framer-motion for transitions (add when needed, not pre-installed)
- **Theme:** next-themes (add when dark mode is implemented)
- **Package manager:** pnpm
- **Platform hosting:** Cloudflare Pages

### Platform Backend

- **Auth:** Supabase Auth with `@supabase/ssr`
- **Database:** Supabase Postgres
- **Storage for platform data:** Supabase tables for profiles, projects, messages, project briefs, agent runs, reviews, security scans, analytics events, credits, and snapshots
- **Server routes:** Next.js Route Handlers under `app/api`
- **RLS:** required on every Supabase table
- **Secrets:** server-only env vars, never exposed to generated apps

### AI + Agent Runtime

- **AI SDK:** Vercel AI SDK
- **Providers at launch:** Anthropic (`@ai-sdk/anthropic`), OpenAI (`@ai-sdk/openai`), Google (`@ai-sdk/google`)
- **Default model:** Claude Sonnet 4.5 (Anthropic)
- **Selectable models per prompt:** Claude Haiku 4.5, Sonnet 4.5/4.6, Opus 4.5 · GPT-4.1 Nano, GPT-5.4 Mini/Standard, GPT-5.5 · Gemini 2.5 Flash, Gemini 2.5 Pro
- **Model policy:** selected per prompt (before each message), locked during active stream, available again after stream completes
- **Agent roles:** Planner, Builder, Reviewer, Security, Analytics
- **Streaming:** `streamText()` with UI message streaming
- **Artifact protocol:** `boltArtifact` / `boltAction`-style file, shell, and start actions
- **Context:** local context manager with recent messages, summaries, and file tree

### Workspace + Preview Runtime

- **Execution:** Fly.io Machines
- **Workspace model:** one reusable Fly.io machine per user account
- **Machine image:** Node.js + Next.js + Expo tooling + preloaded templates
- **Web preview:** generated Next.js app runs on Fly.io and is proxied into iframe
- **Mobile preview:** Expo web preview in phone frame, Expo tunnel QR for Expo Go
- **Sleep/wake:** suspend after idle, resume when builder opens

### Generated Apps

- **Full-stack web:** Next.js + Tailwind + shadcn/ui + Supabase
- **Mobile:** Expo / React Native + NativeWind + Supabase
- **Landing page:** Next.js/static app, SEO-ready
- **Backend options:** managed Supabase, connect own Supabase, or decide later with mock data first
- **Generated app auth/data:** Supabase Auth, Postgres, Storage, Realtime, and Edge/server functions when needed
- **Generated app analytics:** platform-provided event tracking snippet when analytics is enabled

### Developer Workspace

- **Code editor:** CodeMirror 6
- **File browser:** generated project file tree
- **Diff view:** pull-request-style generated diff viewer
- **Review tools:** AI code review findings
- **Security tools:** secrets, dependency, auth, RLS, CORS, API validation, and env exposure checks
- **Analytics tools:** build health, product events, sessions, signups, funnels, errors, and credit burn

### Deploy + Billing

- **Web deploy:** Vercel API
- **Mobile build/deploy:** EAS Build
- **Credit billing:** internal credit ledger
- **Payments/top-ups:** Stripe Checkout + Stripe webhooks
- **Credit model:** estimate, hold, final charge, refund unused hold, itemized receipt

### Agent Roles

- **Planner agent:** turns user intent into a build plan, feature list, schema plan, credit estimate, and approval checklist.
- **Builder agent:** writes files, runs shell commands, starts previews, and opens pull-request-style diffs.
- **Reviewer agent:** reviews changes before they are accepted into the project snapshot.
- **Security agent:** scans generated code, dependencies, migrations, environment usage, auth, RLS, and API routes.
- **Analytics agent:** instruments generated apps with event tracking and explains user/build metrics inside the dashboard.

### Approval Gates

The agent must ask for explicit confirmation before:

- running destructive shell commands
- applying database migrations that drop/alter existing data
- deploying to production
- adding paid third-party services
- exposing public URLs for previews
- modifying auth, billing, or permissions code
- spending above the build-plan credit estimate tolerance

---

## Phase 1: Project Bootstrap

**Goal:** Working Next.js app with shadcn/ui, mock-data foundation, auth shell, and folder structure.

This phase sets up the UI/UX-first build. Install backend-related packages if needed for types/future structure, but do not wire real Supabase auth, Stripe, Fly.io, AI streaming, or deployment APIs yet.

### Tasks
1. Create Next.js project
```bash
pnpm create next-app@latest wild-cupcake \
  --typescript --tailwind --app --src-dir=false \
  --import-alias="@/*"
cd wild-cupcake
```

2. Install shadcn/ui
```bash
pnpm dlx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables: yes
```

3. Install core shadcn components
```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu \
  input label separator sheet sidebar tabs textarea toast \
  avatar badge progress scroll-area tooltip
```

4. Install dependencies
```bash
pnpm add @supabase/supabase-js @supabase/ssr \
  ai @ai-sdk/anthropic \
  @codemirror/state @codemirror/view @codemirror/lang-javascript \
  @codemirror/lang-typescript @codemirror/theme-one-dark \
  lucide-react next-themes framer-motion
```

5. Folder structure to create
```
app/
  (marketing)/          ← public pages, no auth required
    page.tsx            ← landing page
    layout.tsx
  (auth)/               ← auth pages
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
    layout.tsx
  (app)/                ← authenticated app shell (AppShell sidebar + topbar)
    dashboard/page.tsx
    new/page.tsx
    settings/page.tsx
    help/page.tsx
    layout.tsx          ← wraps with AuthGuard + AppShell
  (builder)/            ← fullscreen builder, NO AppShell sidebar
    builder/[projectId]/page.tsx
    layout.tsx          ← wraps with AuthGuard only
  api/
    chat/route.ts
    machines/route.ts
    projects/route.ts
    analytics/route.ts
    reviews/route.ts
    security/route.ts
    credits/estimate/route.ts
  layout.tsx            ← root layout (html, body, providers)
  globals.css

components/
  ui/                   ← shadcn components (auto-generated)
  layout/
    AppSidebar.tsx
    TopNav.tsx
    ThemeProvider.tsx
  marketing/
    HeroSection.tsx
    FeaturesSection.tsx
    PricingSection.tsx
    Navbar.tsx
    Footer.tsx
  dashboard/
    ProjectCard.tsx
    ProjectGrid.tsx
    EmptyState.tsx
  new-project/
    AppTypeTabs.tsx
    PromptInput.tsx
    ProjectBriefModal.tsx
    BuildPlanCard.tsx
  builder/
    ChatPanel.tsx
    MessageItem.tsx
    ArtifactCard.tsx
    CodeEditor.tsx
    FileTree.tsx
    PreviewFrame.tsx
    PhoneFrame.tsx
    BuilderToolbar.tsx
    CreditsBadge.tsx
    DiffViewer.tsx
    ReviewPanel.tsx
    SecurityPanel.tsx
    AnalyticsPanel.tsx
    AgentRunTimeline.tsx
    CreditReceipt.tsx
  shared/
    Logo.tsx
    UserMenu.tsx
    CreditsCounter.tsx

lib/
  supabase/
    client.ts           ← browser singleton
    server.ts           ← server per-request
    middleware.ts       ← auth middleware helper
  ai/
    system-prompt.ts    ← 3-layer security + quality prompt
    prompt-enhancer.ts
    context-manager.ts
    artifact-parser.ts
    credit-estimator.ts
    reviewer.ts
    security-scanner.ts
  fly/
    machines.ts         ← Fly.io Machines API client
    proxy.ts            ← preview URL routing
  analytics/
    events.ts           ← platform event tracking
    generated-app.ts    ← tracking snippet for generated apps
  credits/
    index.ts            ← check, hold, deduct, refund
    pricing.ts          ← credit costs by operation
  mock/
    projects.ts         ← mock data for UI phase
    messages.ts
    files.ts
    reviews.ts
    security.ts
    analytics.ts

middleware.ts           ← root middleware (Supabase auth)
```

### Verification
- `pnpm dev` runs without errors
- `/` renders (blank for now)
- TypeScript strict passes: `pnpm tsc --noEmit`

---

## Phase 2: Homepage + Pricing (UI — mock data)

**Goal:** Full homepage and pricing experience that sells the product. No backend needed.

### Page: `app/(marketing)/page.tsx`

#### Sections to build (top to bottom):

**Navbar** — `components/marketing/Navbar.tsx`
```
[Logo] [Features] [Pricing] [Docs]    [Login] [Start Building →]
```

**Hero** — `components/marketing/HeroSection.tsx`
```
Headline:    "Build apps in plain English."
Subheadline: "Describe what you want. We generate the web app
              or mobile app — with real backend, auth, and database."

CTA buttons: [Start Building — Free] [Watch Demo ▶]

Below CTA:   Animated demo GIF / video placeholder
             (use a colored div with "Demo Preview" text for now)

Social proof: "Trusted by 2,400+ builders" + avatar stack (mock)
```

**App Type Showcase** — 3 cards side by side
```
[🌐 Full Stack App]    [📱 Mobile App]      [📄 Landing Page]
Next.js + Supabase     Expo + NativeWind    Fast, SEO-ready
Live preview           Expo Go QR code      One-click deploy
```

**How It Works** — 3 steps
```
1. Describe your app
   "Build me a task manager for teams with Kanban board"

2. We ask the right questions
   Design style, color theme, auth, database setup

3. Get a live preview instantly
   Web preview in browser, scan QR for mobile
```

**Features Grid** — 6 cards
```
✨ AI-powered generation    🔒 Secure by default
📱 Web + Mobile            🗄️ Auto Supabase setup
🎨 Design customization    🚀 One-click deploy
```

**Developer Features Band** — 4 horizontal feature rows
```
Code review built in       AI reviews every generated diff before acceptance
Security scans             Secrets, dependencies, auth, RLS, API routes
Analytics from day one     Product events + build health + credit burn
GitHub-ready handoff       Clean commits, changelog, pull-request-style diffs
```

**Pricing** — `components/marketing/PricingSection.tsx`
```
FREE          STARTER ($12)    PRO ($29)      AGENCY ($79)
100 credits   500 credits      1,500 credits  5,000 credits
1 project     2 simultaneous   4 simultaneous Unlimited
              previews         previews       previews
```

**Credit Usage Examples**
```
Initial app build             50-150 credits
Follow-up feature             10-60 credits
AI code review                5-25 credits
Security scan                 10-40 credits
Analytics instrumentation     10-30 credits
Deployment assist             5-20 credits
```

**Footer**

### Optional dedicated pricing page: `app/(marketing)/pricing/page.tsx`

If the homepage pricing section feels too dense, add a dedicated pricing page that reuses `PricingSection` and expands:

- plan comparison
- included credits
- credit top-up packages
- what consumes credits
- security/review/analytics credit examples
- FAQ for billing, refunds, and plan upgrades

### Mock data file: `lib/mock/marketing.ts`
```typescript
export const MOCK_STATS = {
  builders: '2,400+',
  appsBuilt: '18,000+',
  rating: '4.9/5',
}

export const MOCK_TESTIMONIALS = [
  {
    name: 'Sarah K.',
    role: 'Founder',
    text: 'Built my SaaS MVP in a weekend. First prompt just worked.',
    avatar: 'SK',
  },
  // ... 2 more
]
```

### Verification
- `/` renders full landing page with all sections
- `/pricing` renders if a dedicated pricing page is created
- Responsive at 375px, 768px, 1280px
- No TypeScript errors

---

## Phase 3: Auth Pages (UI — no backend yet)

**Goal:** Beautiful signup/login forms. Forms are wired to state but don't submit yet.

### Files

**`app/(auth)/layout.tsx`**
```tsx
// Centered layout, light bg, logo top-left
// Split: left = form, right = decorative panel with product screenshot mock
```

**`app/(auth)/signup/page.tsx`**
```
Logo
"Create your account"
[Full name input]
[Email input]
[Password input]
[Create Account button] ← disabled, shows spinner on click (mock)
"Already have an account? Log in"
Divider
[Continue with Google] (mock, no action yet)
```

**`app/(auth)/login/page.tsx`**
```
Logo
"Welcome back"
[Email input]
[Password input]
[Forgot password?]
[Sign In button]
"Don't have an account? Sign up"
[Continue with Google]
```

### Verification
- Both pages render and are responsive
- Forms have proper validation UI (required fields highlighted)
- No backend calls yet — just visual

---

## Phase 4: Dashboard (UI — mock data)

**Goal:** User's project list. Uses rich mock data so it looks real.

### Mock data: `lib/mock/projects.ts`
```typescript
export const MOCK_PROJECTS = [
  {
    id: 'proj-1',
    name: 'Task Manager Pro',
    type: 'fullstack',       // 'fullstack' | 'mobile' | 'landing'
    framework: 'nextjs',
    status: 'live',          // 'building' | 'live' | 'draft'
    deployUrl: 'https://task-manager.vercel.app',
    lastUpdated: '2 hours ago',
    thumbnail: null,         // placeholder gradient
    creditsUsed: 85,
  },
  {
    id: 'proj-2',
    name: 'Cal-Bee Mobile',
    type: 'mobile',
    framework: 'expo',
    status: 'live',
    lastUpdated: '1 day ago',
    thumbnail: null,
    creditsUsed: 120,
  },
  {
    id: 'proj-3',
    name: 'Portfolio Site',
    type: 'landing',
    framework: 'nextjs',
    status: 'draft',
    lastUpdated: '3 days ago',
    thumbnail: null,
    creditsUsed: 25,
  },
]

export const MOCK_USER = {
  name: 'Christian Suntay',
  email: 'christian@example.com',
  plan: 'pro',
  credits: 1415,
  creditsTotal: 1500,
}
```

### Layout: `app/(app)/layout.tsx`
```tsx
// Custom AppShell — does NOT use shadcn SidebarProvider
// AuthGuard wraps the shell; redirects unauthenticated users to /login
import { AuthGuard } from "@/components/shared/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }) {
  return <AuthGuard><AppShell>{children}</AppShell></AuthGuard>;
}
```

### Sidebar: `components/layout/AppShell.tsx`
```
[Logo]
──────────────
[+ New Project]
──────────────
Projects
  📁 Task Manager Pro        ●
  📱 Cal-Bee Mobile
  📄 Portfolio Site
──────────────
Settings
Help
──────────────
[CS] Christian Suntay
     1,415 credits remaining
     [Buy Credits]
```

### Dashboard page: `app/(app)/dashboard/page.tsx`
```
Header: "Your Projects"  [+ New Project]

Project grid (3 cols desktop, 1 col mobile):
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ gradient thumb  │  │ gradient thumb  │  │ gradient thumb  │
│                 │  │                 │  │                 │
│ Task Manager    │  │ Cal-Bee Mobile  │  │ Portfolio Site  │
│ 🌐 Full Stack   │  │ 📱 Mobile App   │  │ 📄 Landing      │
│ ● Live          │  │ ● Live          │  │ ◌ Draft         │
│ 2 hours ago     │  │ 1 day ago       │  │ 3 days ago      │
│ [Open] [↗]      │  │ [Open] [↗]      │  │ [Open]          │
└─────────────────┘  └─────────────────┘  └─────────────────┘

+ Empty state card: [+ Create New Project]
```

### Component: `components/dashboard/ProjectCard.tsx`
```tsx
// Props: project: MockProject
// Shows: gradient placeholder, name, type badge, status dot, last updated
// Actions: "Open" (→ /builder/[id]), external link icon (→ deployUrl)
// Hover: slight lift shadow effect (framer-motion)
```

### Verification
- `/dashboard` renders project grid with mock data
- Sidebar shows all sections
- Credits counter visible in sidebar
- Responsive grid

---

## Phase 5: Prompt-First Creation Screen (UI — no backend)

**Goal:** The "What will you build today?" screen — the core post-signup entry point.

Signed-in users should land here by default. The page should feel like the first screenshot reference: a focused creation surface with app-type tabs, a large prompt box, lightweight agent controls, and recent work below. The dashboard remains accessible, but it is not the default first experience after signup.

### Page: `app/(app)/new/page.tsx`

```
[Project selector dropdown]  ← "Christian's Project ▾"

        "What will you build today?"

┌─────────────────────────────────────────────────────┐
│  [🌐 Full Stack App]  [📱 Mobile App]  [📄 Landing] │
│                                                     │
│  Build me a clone of netflix...                     │
│  (textarea, auto-grows, 4-8 lines)                  │
│                                                     │
│  📎  GitHub  🤖 E-1 ▾  ✦ Claude Sonnet 4.5 ▾       │
│  👤 Maxx ○                          🎙  ⚙  [→]     │
└─────────────────────────────────────────────────────┘

Below prompt box — example prompts (clickable chips):
  "Build a task manager for teams"
  "Create an Airbnb clone"
  "Build a fitness tracking mobile app"
  "Make a SaaS dashboard with analytics"

Lower page:
  Recent Tasks tab
  Deployed Apps tab
  Empty state for new users
```

### Component: `components/new-project/AppTypeTabs.tsx`
```tsx
// Tab options: fullstack | mobile | landing
// Each has icon + label
// Selected tab highlights
// Placeholder text in textarea changes based on selected tab:
//   fullstack: "Build me a clone of netflix..."
//   mobile:    "Build me a fitness tracking app for iOS and Android..."
//   landing:   "Create a landing page for my SaaS product..."
```

### Component: `components/new-project/PromptInput.tsx`
```tsx
// Textarea with:
//   - auto-resize on content growth
//   - bottom toolbar: attachment, github, model selector, agent toggle, mic, settings, send
//   - send button disabled when empty
//   - on submit → opens ProjectBriefModal (mock for now)
// Model selector dropdown: Claude Sonnet, Claude Opus, GPT-5.5, and approved future models
// Agent toggle (Maxx): on/off switch
```

### Model selector behavior

- The selected model applies to the upcoming project brief, PRD generation, and initial build run.
- Model choice is shown in the PRD/build plan because it affects reasoning style, speed, context window, and credit estimate.
- Once the user clicks "Start Building", the selected model is locked for that active agent run.
- During an active run, the model dropdown is disabled and shows "Locked for this run".
- After the run is completed, failed, cancelled, or idle, the user can switch models for the next prompt/run.
- Switching models between runs should show a small note: "Changing model may affect output style and credit cost."
- Model choice is never permanent for the whole project; it is recorded per run.

### Verification
- New signed-in users land on `/new` by default
- Tab switching changes placeholder text
- Textarea grows with content
- All toolbar buttons render (actions mocked)
- Example chips populate textarea on click
- Submitting the first prompt opens the 5-question project brief, not the builder
- Model selector works before the first prompt and is included in PRD credit estimate

---

## Phase 6: 5-Question Project Brief (UI — mock flow)

**Goal:** A mandatory clarification flow before building. Full mock, no AI yet.

Every new project must pass through this brief. AI may prefill suggested answers from the first prompt, but the user must review or confirm the answers before a PRD/build plan is generated.

### Component: `components/new-project/ProjectBriefModal.tsx`

**Trigger:** User submits prompt on new project page

**Modal content — 5 required questions:**

**Question 1: Product goal**
```
┌────────────────────────────────────────────────────┐
│  Project brief                              Step 1 │
│                                                    │
│  App name:                                         │
│  [Task Manager Pro                              ]  │
│                                                    │
│  Who is this for?                                  │
│  [Teams managing shared tasks                   ]  │
│                                                    │
│  What should v1 accomplish?                        │
│  [Let teams create, assign, and track tasks     ]  │
└────────────────────────────────────────────────────┘
```

**Question 2: Frontend/design direction**
```
┌────────────────────────────────────────────────────┐
│  Design direction                          Step 2 │
│                                                    │
│  Style:                                            │
│  [● Clean SaaS] [Admin] [Playful] [Editorial]      │
│                                                    │
│  Mode:  [● Light] [Dark] [System]                  │
│  Primary color: 🔵 🟣 🟢 🔴 🟡 [Custom #]          │
│  Device priority: [● Desktop] [Mobile] [Both]      │
└────────────────────────────────────────────────────┘
```

**Question 3: Backend/data setup**
```
┌────────────────────────────────────────────────────┐
│  Backend setup                             Step 3 │
│                                                    │
│  Database path:                                    │
│  [● Managed Supabase — we handle it]               │
│  [Connect my own Supabase]                         │
│  [Decide later — frontend/mock data first]         │
│                                                    │
│  Needs: [✓ Auth] [✓ Database] [ ] Storage          │
│         [ ] Realtime [ ] Edge/server functions     │
└────────────────────────────────────────────────────┘
```

**Question 4: Core features and screens**
```
┌────────────────────────────────────────────────────┐
│  Core scope                                Step 4 │
│                                                    │
│  Required screens/pages:                           │
│  [Landing, login, dashboard, kanban, settings    ] │
│                                                    │
│  Required user actions:                            │
│  [Create tasks, assign owners, change status     ] │
└────────────────────────────────────────────────────┘
```

**Question 5: Rules, integrations, and constraints**
```
┌────────────────────────────────────────────────────┐
│  Constraints                               Step 5 │
│                                                    │
│  Integrations:                                     │
│  [ ] Payments [ ] Email [ ] Maps [✓ Analytics]     │
│  [ ] AI features [ ] File uploads                  │
│                                                    │
│  Roles/security:                                   │
│  [Team members can only see their workspace      ] │
│                                                    │
│  Avoid / out of scope:                             │
│  [No billing in v1                               ] │
│                                                    │
│  [Back]                  [Generate PRD →]          │
└────────────────────────────────────────────────────┘
```

### Verification
- Modal opens on prompt submit and cannot be skipped for a new project
- All 5 questions must be answered or confirmed before PRD generation
- AI-prefilled answers can be edited by the user
- Color picker selects and shows selection
- Design style cards highlight on select
- Backend choice supports Managed Supabase, Connect own Supabase, and Decide later
- "Generate PRD →" opens the Simple PRD + Build Plan Approval view

---

## Phase 7: Simple PRD + Build Plan Approval (UI — mock)

**Goal:** Show a clear, lightweight PRD and credit estimate before building.

Coding cannot start until the user approves this plan.

### Component: `components/new-project/BuildPlanCard.tsx`

**Shown as full page or large modal after the 5-question brief:**

```
┌────────────────────────────────────────────────────────┐
│  Simple PRD                                            │
│                                                        │
│  🌐 Task Manager Pro  —  Full Stack Web App            │
│                                                        │
│  Target users:                                         │
│  Teams that need a lightweight shared task workflow    │
│                                                        │
│  Main user flow:                                       │
│  Sign up → create workspace → add tasks → assign team  │
│  members → move tasks across the board                 │
│                                                        │
│  Pages:                                                │
│  • Landing page + auth (login / signup / reset)        │
│  • Dashboard with task overview + stats                │
│  • Kanban board (drag & drop)                          │
│  • Team management                                     │
│  • Profile settings                                    │
│                                                        │
│  Features:                                             │
│  ✅ Email + Google authentication                      │
│  ✅ Team workspaces with invites                       │
│  ✅ Task assignment + due dates + priorities           │
│  ✅ Real-time updates                                  │
│  ✅ Managed Supabase database                          │
│                                                        │
│  Stack:  Next.js · Tailwind · shadcn/ui · Supabase     │
│  Design: Minimal · Blue · Light mode                   │
│  Backend: Managed Supabase                             │
│  Analytics: Basic product events enabled               │
│                                                        │
│  Out of scope for v1:                                  │
│  • Payments                                            │
│  • Native mobile app                                   │
│  • Advanced reporting                                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Estimated credits:          85 credits          │  │
│  │  Your balance:              1,415 credits  ✅    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [Edit Answers] [Regenerate Plan] [Start Building →]   │
└────────────────────────────────────────────────────────┘
```

### PRD fields

- App name
- App type
- Target users
- Main user flow
- Screens/pages
- Core features
- Backend/database choice
- Auth/security needs
- Design direction
- Integrations
- Analytics needs
- Estimated credits
- v1 scope
- Explicit out-of-scope items

### Verification
- Renders cleanly with mock data
- Credit estimate bar shows balance vs cost
- "Edit Answers" returns to the 5-question brief
- "Regenerate Plan" refreshes the PRD from the same answers
- "Start Building" is the first action that can create an agent run
- "Start Building" → navigates to `/builder/[mock-id]`

---

## Phase 8: Builder View (UI — mock data)

**Goal:** The main product screen. Full layout with mock chat, files, and preview.

### Page: `app/(builder)/builder/[projectId]/page.tsx`

Note: builder lives in `(builder)` route group — NOT `(app)`. This bypasses `AppShell` for a fullscreen layout.

**Layout — two panels with tab bar:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [≡]  Task Manager Pro  [Next.js · Fullstack]   [Preview][Files]... │
│      [History] [collapse]                      [Share][GitHub][↗]  │
├──────────────────────────────┬──────────────────────────────────────┤
│  CHAT (left)                 │  PREVIEW PANE (right)                │
│  ──────────────              │  ──────────────                      │
│  [AI message]                │  Active tab content:                 │
│  ✅ 4/5 files generated      │  Preview → web iframe or phone frame  │
│  🔄 streaming...             │  Files   → file tree                  │
│                              │  Diff    → diff viewer               │
│  [quick action chips]        │  Review  → findings panel            │
│                              │  Security→ security scan panel        │
│  ──────────────              │  Analytics → analytics panel         │
│  [composer + send]           │                                      │
└──────────────────────────────┴──────────────────────────────────────┘

Preview tab behavior is project-type-aware:
  mobile    → phone frame only (no viewport toggle)
  fullstack → Desktop / Tablet / Mobile viewport toggle
  landing   → Desktop / Tablet / Mobile viewport toggle
```

### Mock data: `lib/mock/messages.ts`
```typescript
export const MOCK_MESSAGES = [
  {
    id: '1',
    role: 'user',
    content: 'Build me a task manager for teams with a Kanban board',
  },
  {
    id: '2',
    role: 'assistant',
    content: "I'll build a full-stack task manager with team collaboration...",
    artifacts: [
      { type: 'file', path: 'app/page.tsx', status: 'complete' },
      { type: 'file', path: 'app/dashboard/page.tsx', status: 'complete' },
      { type: 'file', path: 'components/KanbanBoard.tsx', status: 'complete' },
      { type: 'shell', command: 'npm install @dnd-kit/core', status: 'complete' },
      { type: 'file', path: 'components/TeamManagement.tsx', status: 'streaming' },
    ],
  },
]

export const MOCK_FILE_TREE = [
  { path: 'app/page.tsx', type: 'file' },
  { path: 'app/dashboard/page.tsx', type: 'file' },
  { path: 'app/layout.tsx', type: 'file' },
  { path: 'components/KanbanBoard.tsx', type: 'file' },
  { path: 'components/TaskCard.tsx', type: 'file' },
  { path: 'lib/supabase/client.ts', type: 'file' },
  { path: 'package.json', type: 'file' },
]

export const MOCK_FILE_CONTENT = `// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:users(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {/* task list */}
    </div>
  )
}`
```

### Component: `components/builder/ChatPanel.tsx`
```tsx
// Left panel
// - Scrollable message list
// - Each message: user bubble or AI response
// - AI response shows artifact cards (file written, shell run)
// - Bottom: textarea input + credit estimate label
// - Status indicator: "Agent thinking..." / "Agent streaming..." / "Ready"
```

### Component: `components/builder/MessageItem.tsx`
```tsx
// Renders one message
// User: right-aligned blue bubble
// Assistant: left-aligned, white card
//   - Text content (markdown rendered)
//   - Artifact cards: file path chip (✅/🔄/⏳) or shell command chip
```

### Component: `components/builder/ArtifactCard.tsx`
```tsx
// Collapsible card showing files written
// Header: "5 files generated" with expand/collapse
// Expanded: list of file paths with status icons
// Shell commands: show command + exit code
```

### Component: `components/builder/FileTree.tsx`
```tsx
// Folder tree from MOCK_FILE_TREE
// Click file → loads into CodeEditor
// Icons: folder (📁), tsx (⚛), ts (📘), json (📋)
// Active file highlighted
```

### Component: `components/builder/CodeEditor.tsx`
```tsx
// CodeMirror 6 integration
// Shows MOCK_FILE_CONTENT for selected file
// Language detection by file extension
// Theme: one-dark
// Read-only in mock phase (editable in integration phase)
```

### Component: `components/builder/PreviewFrame.tsx`
```tsx
// Web tab: <iframe> with placeholder "Preview loading..." screen
//   Shows a mock Next.js app screenshot or colored gradient
// Mobile tab: PhoneFrame wrapping mobile preview
//   + QR code panel on right
// Toggle: [🌐 Web] [📱 Mobile] tabs
```

### Component: `components/builder/PhoneFrame.tsx`
```tsx
// SVG/CSS phone bezel (iPhone-style)
// Inner content: iframe or image placeholder
// Status bar: 9:41, signal, wifi, battery icons
// Right panel: "Try your app on mobile", QR code (mock QR image), Share URL
```

### Component: `components/builder/BuilderToolbar.tsx`
```tsx
// Top bar of builder:
// Left:  [← Dashboard]  [Project name]  [Web/Mobile badge]
// Right: [Agent status badge]  [Resume/Pause]  [Deploy ↗]  [GitHub]
//        [Credits badge: 1,415 ◆]
```

### Component: `components/builder/DiffViewer.tsx`
```tsx
// Pull-request-style generated diff viewer
// - Shows added/modified/deleted files from latest agent run
// - Inline additions/deletions, file-level status, copy path button
// - Actions: Accept file, request change, discard generated file
// - Read-only in mock phase
```

### Component: `components/builder/ReviewPanel.tsx`
```tsx
// Reviewer agent output for latest diff
// Severity groups: Blocker, Risk, Suggestion, Passed checks
// Dimensions: correctness, maintainability, accessibility, performance, framework usage
// Each finding links to file path + line when available
// Actions: Fix with AI, mark accepted risk, create follow-up task
```

### Component: `components/builder/SecurityPanel.tsx`
```tsx
// Security agent output
// Checks: secrets, dependencies, auth, API input validation, RLS, CORS, env exposure
// Critical findings block deploy until fixed or explicitly accepted by an admin-level user
// Shows credit cost for re-scan before user runs it
```

### Component: `components/builder/AnalyticsPanel.tsx`
```tsx
// Build + product analytics inside the builder
// Build metrics: prompts, credits, files changed, review pass rate, build time, deploy history
// Generated app metrics: sessions, signups, key events, errors, conversion funnel
// Mock phase uses lib/mock/analytics.ts
```

### Component: `components/builder/AgentRunTimeline.tsx`
```tsx
// Chronological trace of what the agent did
// Items: prompt received, plan created, credit hold placed, files written,
// commands run, preview started, review completed, security scan completed,
// credits finalized
```

### Component: `components/builder/CreditReceipt.tsx`
```tsx
// Shows estimated vs actual credits for the run
// Itemizes planner, builder, shell/runtime, reviewer, security, analytics, deployment
// Provides refund/adjustment status if a run fails before completion
```

### Verification
- `/builder/mock-id` renders full 3-panel layout
- File tree click loads mock file content into editor
- Web/Mobile tab toggle switches preview
- Chat shows mock messages with artifact cards
- Review, Security, Analytics, Diff, and Timeline tabs render with mock data
- Credit receipt shows estimated vs actual cost
- Responsive (panels stack on mobile)

---

## Phase 8.5: Programmer Command Center (UI — mock data)

**Goal:** Make the product feel programmer-centric before backend integration.

This phase upgrades the builder from a generated-app preview into an engineering workspace. The user should be able to answer: what changed, why did it change, how risky is it, what did it cost, and how is the app performing?

### Views

**Files tab**
```
File tree + CodeMirror editor
Read-only initially, editable in later integration phase
```

**Diff tab**
```
Latest agent run
  12 files changed
  +842 -119

[Accept All] [Request Changes] [Discard Run]

app/dashboard/page.tsx
  + server component data loading
  + error boundary
  - mock task array
```

**Review tab**
```
Review score: 86 / 100

Blockers
  None

Risks
  API route needs rate limiting
  Empty state missing keyboard focus handling

Passed
  TypeScript strict
  No any types
  Server-side Supabase queries
```

**Security tab**
```
Security status: Needs attention

Critical
  None

High
  Missing RLS policy on team_invites

Medium
  Dependency @old/package has low maintenance score
  API route accepts unvalidated JSON body

[Fix with AI — est. 12 credits] [Run scan again — est. 18 credits]
```

**Analytics tab**
```
Build health
  Credits used       85
  Build time         6m 12s
  Review pass rate   91%
  Security issues    3 open

Generated app
  Sessions           124
  Signups            18
  Activation         42%
  Runtime errors     2
```

### Mock data files

`lib/mock/reviews.ts`
```typescript
export const MOCK_REVIEW_RUN = {
  score: 86,
  status: 'passed_with_risks',
  findings: [
    { severity: 'risk', file: 'app/api/tasks/route.ts', line: 12, title: 'Missing rate limit' },
    { severity: 'suggestion', file: 'components/EmptyState.tsx', line: 8, title: 'Improve focus handling' },
  ],
}
```

`lib/mock/security.ts`
```typescript
export const MOCK_SECURITY_RUN = {
  status: 'needs_attention',
  findings: [
    { severity: 'high', category: 'rls', title: 'Missing RLS policy on team_invites' },
    { severity: 'medium', category: 'validation', title: 'Unvalidated JSON body' },
  ],
}
```

`lib/mock/analytics.ts`
```typescript
export const MOCK_BUILD_ANALYTICS = {
  creditsUsed: 85,
  buildTimeSeconds: 372,
  reviewPassRate: 0.91,
  openSecurityIssues: 3,
}

export const MOCK_APP_ANALYTICS = {
  sessions: 124,
  signups: 18,
  activationRate: 0.42,
  runtimeErrors: 2,
}
```

### Verification

- Builder has tabs for Files, Diff, Review, Security, Analytics
- Findings link back to the correct file in the editor
- Critical security state visibly disables deploy button
- Credit estimates appear before paid review/security actions
- Mobile layout keeps chat, code, and review surfaces usable

---

## Phase 9: Settings Page (UI — mock)

**Goal:** Account, credits, billing, and database connection settings.

This is still UI-only. Settings, billing, credit packages, database connection, security scan defaults, and analytics preferences should look real and be easy to understand, but buttons are mocked until backend phases begin.

### Page: `app/(app)/settings/page.tsx`

**Tabs:** Account | Credits & Billing | Database | Security | Analytics | Danger Zone

**Account tab:**
```
Profile:  [Avatar] Christian Suntay  christian@example.com
          [Edit name]

Plan:     PRO  — 1,500 credits/month
          [Upgrade to Agency]

Password: [Change password]
```

**Credits & Billing tab:**
```
Current balance:   1,415 / 1,500 credits
                   [████████████████░░] 94%

Usage this month:
  Initial builds:    65 credits  (3 projects)
  Follow-up prompts: 20 credits  (12 prompts)
  Deployments:       0 credits

Credit packages:
  [400 credits — $10]  [1,000 credits — $22]  [3,000 credits — $60]

Billing:  Pro Plan $29/month  ← renews June 14
          [Manage billing]
```

**Database tab:**
```
Database setup:    ✨ Managed (default)
                   Your database is provisioned and managed for you.
                   [View database dashboard ↗]

Connect your own:  [Switch to custom Supabase]
                   Supabase URL: [                    ]
                   Anon Key:     [                    ]
                   [Verify & Connect]
```

**Security tab:**
```
Deploy protection:     [Enabled]
Critical findings      Block deploy
High findings          Require confirmation

Scan defaults:
  [✓] Secret scanning
  [✓] Dependency risk scanning
  [✓] Supabase RLS checks
  [✓] API validation checks

Latest scan: Needs attention — 3 open findings
             [View findings] [Run full scan — est. 22 credits]
```

**Analytics tab:**
```
Generated app analytics: [Enabled]
Event collection:        Anonymous by default
PII collection:          [Disabled]

Tracked events:
  session_started
  signup_completed
  project_created
  key_feature_used
  runtime_error

[Edit tracking plan] [Export events]
```

### Verification
- All tabs render
- Credit bar shows correct proportions
- Security and analytics defaults are visible
- Billing and credit package UI is complete with mocked actions
- Database connection UI clearly offers managed Supabase, own Supabase, and decide later
- No backend calls yet

---

## Phase 10: Platform Backend — Supabase Schema

**Goal:** Real database schema for the platform itself (users, projects, credits, messages).

### Setup
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### Env vars: `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (server only, never expose)
```

### Supabase clients

**`lib/supabase/client.ts`** (browser singleton)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**`lib/supabase/server.ts`** (server per-request)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
```

**`middleware.ts`** (root — protect `/dashboard`, `/builder`, `/new`, `/settings`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Standard Supabase SSR middleware pattern
  // Redirect unauthenticated users to /login
  // Use supabase.auth.getClaims() not getSession()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
}
```

### Database Schema (run in Supabase SQL editor)
```sql
-- USERS (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free','starter','pro','agency')),
  credits_balance integer default 100,
  credits_monthly integer default 100,
  fly_machine_id text,           -- their Fly.io machine ID
  fly_app_name text,             -- their Fly.io app name
  supabase_project_ref text,     -- their auto-provisioned Supabase project
  supabase_project_url text,
  supabase_anon_key text,
  supabase_service_role_key text, -- encrypted
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "users own their profile"
  on public.profiles for all using (auth.uid() = id);

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  type text not null check (type in ('fullstack','mobile','landing')),
  framework text not null check (framework in ('nextjs','expo','static')),
  status text default 'draft' check (status in ('draft','building','live','error')),
  backend_mode text default 'managed_supabase'
    check (backend_mode in ('managed_supabase','own_supabase','decide_later')),
  -- Fly.io
  fly_port integer,              -- port this project's dev server runs on
  -- Supabase schema for this project
  db_schema text,                -- e.g. 'task_manager_pro'
  -- Deployment
  deploy_url text,
  github_url text,
  vercel_project_id text,
  -- Design choices from interview
  design_style text,
  primary_color text,
  dark_mode text default 'light',
  -- Metadata
  forked_from uuid references public.projects(id),
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;
create policy "users own their projects"
  on public.projects for all using (auth.uid() = user_id);

-- PROJECT BRIEFS (required before first build)
create table public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  initial_prompt text not null,
  answers jsonb not null,        -- 5 required answers from ProjectBriefModal
  prd jsonb not null,            -- generated Simple PRD + Build Plan
  estimated_credits integer not null default 0,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_briefs enable row level security;
create policy "users own their project briefs"
  on public.project_briefs for all using (auth.uid() = user_id);

-- MESSAGES (chat history per project)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  credits_used integer default 0,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "users own their messages"
  on public.messages for all
  using (exists (
    select 1 from public.projects
    where id = messages.project_id and user_id = auth.uid()
  ));

-- AGENT RUNS (one traceable unit of AI work)
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_brief_id uuid references public.project_briefs(id),
  parent_message_id uuid references public.messages(id),
  status text default 'queued' check (status in ('queued','planning','building','reviewing','scanning','completed','failed','cancelled')),
  prompt text not null,
  model_provider text not null default 'anthropic'
    check (model_provider in ('anthropic','openai','google')),
  model_id text not null default 'claude-sonnet-4-5',
  model_label text not null default 'Claude Sonnet 4.5',
  plan jsonb,
  changed_files jsonb default '[]'::jsonb,
  commands jsonb default '[]'::jsonb,
  estimated_credits integer not null default 0,
  held_credits integer not null default 0,
  final_credits integer not null default 0,
  started_at timestamptz default now(),
  finished_at timestamptz
);

alter table public.agent_runs enable row level security;
create policy "users own their agent runs"
  on public.agent_runs for all using (auth.uid() = user_id);

-- REVIEW RUNS (AI code review on generated diffs)
create table public.review_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  score integer check (score between 0 and 100),
  status text default 'pending' check (status in ('pending','passed','passed_with_risks','failed')),
  summary text,
  credits_used integer default 0,
  created_at timestamptz default now()
);

alter table public.review_runs enable row level security;
create policy "users own their review runs"
  on public.review_runs for all
  using (exists (
    select 1 from public.projects
    where id = review_runs.project_id and user_id = auth.uid()
  ));

-- REVIEW FINDINGS
create table public.review_findings (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid references public.review_runs(id) on delete cascade not null,
  severity text not null check (severity in ('blocker','risk','suggestion','passed')),
  category text not null,
  file_path text,
  line_number integer,
  title text not null,
  details text,
  status text default 'open' check (status in ('open','fixed','accepted','dismissed')),
  created_at timestamptz default now()
);

alter table public.review_findings enable row level security;
create policy "users own their review findings"
  on public.review_findings for all
  using (exists (
    select 1
    from public.review_runs rr
    join public.projects p on p.id = rr.project_id
    where rr.id = review_findings.review_run_id and p.user_id = auth.uid()
  ));

-- SECURITY SCANS
create table public.security_scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  status text default 'pending' check (status in ('pending','clean','needs_attention','blocked','failed')),
  scanner_version text,
  credits_used integer default 0,
  created_at timestamptz default now()
);

alter table public.security_scans enable row level security;
create policy "users own their security scans"
  on public.security_scans for all
  using (exists (
    select 1 from public.projects
    where id = security_scans.project_id and user_id = auth.uid()
  ));

-- SECURITY FINDINGS
create table public.security_findings (
  id uuid primary key default gen_random_uuid(),
  security_scan_id uuid references public.security_scans(id) on delete cascade not null,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  category text not null,        -- secrets | dependency | auth | rls | cors | validation | env
  file_path text,
  line_number integer,
  title text not null,
  details text,
  fix_prompt text,
  status text default 'open' check (status in ('open','fixed','accepted_risk','dismissed')),
  created_at timestamptz default now()
);

alter table public.security_findings enable row level security;
create policy "users own their security findings"
  on public.security_findings for all
  using (exists (
    select 1
    from public.security_scans ss
    join public.projects p on p.id = ss.project_id
    where ss.id = security_findings.security_scan_id and p.user_id = auth.uid()
  ));

-- PLATFORM + GENERATED APP ANALYTICS EVENTS
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  source text not null check (source in ('platform','generated_app')),
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  session_id text,
  created_at timestamptz default now()
);

alter table public.analytics_events enable row level security;
create policy "users own their analytics events"
  on public.analytics_events for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.projects
      where id = analytics_events.project_id and user_id = auth.uid()
    )
  );

-- MODEL PRICING CATALOG (source of truth for credit rates — update without redeployment)
create table public.model_pricing (
  model_id               text primary key,   -- matches provider model name exactly
  display_name           text not null,
  provider               text not null check (provider in ('anthropic','openai','google')),
  credits_per_1m_input   numeric(8,4) not null,  -- credits charged per 1M input tokens
  credits_per_1m_output  numeric(8,4) not null,  -- credits charged per 1M output tokens
  min_plan               text not null check (min_plan in ('free','starter','pro','teams')),
  is_active              boolean default true
);
-- No RLS needed — model pricing is public read, admin write only

-- Seed data (1 credit = $0.17 USD, ~60-85% gross margin per model)
insert into public.model_pricing values
  ('claude-haiku-4-5',    'Claude Haiku 4.5',     'anthropic', 5.88,  29.41, 'free',    true),
  ('claude-sonnet-4-5',   'Claude Sonnet 4.5',    'anthropic', 17.65, 88.24, 'free',    true),
  ('claude-sonnet-4-6',   'Claude Sonnet 4.6',    'anthropic', 17.65, 88.24, 'free',    true),
  ('claude-opus-4-5',     'Claude Opus 4.5',      'anthropic', 29.41, 147.06,'starter', true),
  ('claude-opus-4-6',     'Claude Opus 4.6',      'anthropic', 29.41, 147.06,'starter', true),
  ('gpt-4-1-nano',        'GPT-4.1 Nano',         'openai',    0.59,  2.35,  'free',    true),
  ('gpt-5-4-mini',        'GPT-5.4 Mini',         'openai',    4.41,  26.47, 'starter', true),
  ('gpt-5-4-standard',    'GPT-5.4 Standard',     'openai',    14.71, 88.24, 'pro',     true),
  ('gpt-5-5',             'GPT-5.5',              'openai',    29.41, 176.47,'teams',   true),
  ('o3',                  'o3',                   'openai',    11.76, 47.06, 'pro',     true),
  ('gemini-2-5-flash',    'Gemini 2.5 Flash',     'google',    1.76,  14.71, 'free',    true),
  ('gemini-2-5-pro',      'Gemini 2.5 Pro',       'google',    7.35,  58.82, 'starter', true);

-- CREDIT TRANSACTIONS (immutable append-only ledger)
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id),
  agent_run_id uuid references public.agent_runs(id),
  run_id uuid,                   -- groups hold + deduct + refund for one stream
  type text not null check (type in ('purchase','hold','deduct','refund','bonus','expire','monthly_reset')),
  amount numeric(10,4) not null, -- negative = deducted, positive = added
  model_id text,                 -- which model was used (null for purchase/bonus)
  tokens_input int,              -- actual tokens (populated on deduct)
  tokens_output int,
  price_paid_usd numeric(8,2),   -- only on purchase rows
  stripe_session_id text,        -- only on purchase rows
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Live balance view
create view public.user_credit_balance as
  select user_id, sum(amount) as balance
  from public.credit_transactions
  group by user_id;

alter table public.credit_transactions enable row level security;
create policy "users own their transactions"
  on public.credit_transactions for all using (auth.uid() = user_id);

-- FILE SNAPSHOTS (latest VFS state per project)
create table public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  file_tree jsonb not null,      -- { "path": "content" } map
  taken_at timestamptz default now()
);

alter table public.project_snapshots enable row level security;
create policy "users own their snapshots"
  on public.project_snapshots for all
  using (exists (
    select 1 from public.projects
    where id = project_snapshots.project_id and user_id = auth.uid()
  ));
```

### API Routes (stubs — implement in order)

**`app/api/projects/route.ts`** — GET (list), POST (create)
**`app/api/projects/[id]/route.ts`** — GET, PATCH, DELETE
**`app/api/projects/[id]/brief/route.ts`** — GET/POST 5-question brief answers + generated PRD
**`app/api/projects/[id]/brief/approve/route.ts`** — POST approve PRD/build plan
**`app/api/projects/[id]/messages/route.ts`** — GET, POST
**`app/api/projects/[id]/agent-runs/route.ts`** — GET run history, POST create run
**`app/api/projects/[id]/reviews/route.ts`** — GET review runs, POST run code review
**`app/api/projects/[id]/security/route.ts`** — GET scans, POST run security scan
**`app/api/projects/[id]/analytics/route.ts`** — GET build/product analytics rollups
**`app/api/analytics/events/route.ts`** — POST platform/generated-app event
**`app/api/credits/route.ts`** — GET balance, POST deduct/refund
**`app/api/credits/estimate/route.ts`** — POST estimate credits before action

### Wire up auth to real pages
- **Remove `context/MockAuthContext.tsx` entirely** — replace with real Supabase auth.
- **Remove `components/shared/AuthGuard.tsx`** — replace with `middleware.ts` server-side protection.
- Replace mock user in sidebar with `supabase.auth.getClaims()`
- Replace mock projects with Supabase query
- Signup/login forms → `supabase.auth.signUp()` / `signInWithPassword()`
- First prompt creates a draft project and project brief, not an agent run
- Agent run creation requires an approved `project_briefs.approved_at`
- Builder tabs read from `agent_runs`, `review_runs`, `security_scans`, and `analytics_events`
- Deploy button is disabled when unresolved critical/high security findings exist
- Builder model selector is disabled while an agent run is active and re-enabled between runs

### Verification
- Signup creates profile row in Supabase
- Signup/login redirects to `/new` as the primary creation surface
- Unauthenticated → redirected to `/login`
- First prompt stores `initial_prompt`
- 5-question answers and generated PRD persist in `project_briefs`
- Agent run cannot start before PRD approval
- Agent run stores selected model provider/id/label
- Active run rejects mid-run model changes
- Agent run history persists and can be reopened
- Review/security findings persist and link back to files
- Analytics events are accepted with authenticated project ownership
- `pnpm tsc --noEmit` passes

---

## Phase 11: AI Integration — Claude Streaming

**Goal:** Real chat that generates code. The core product feature.

### System Prompt: `lib/ai/system-prompt.ts`
```typescript
export function buildSystemPrompt(ctx: {
  projectType: 'fullstack' | 'mobile' | 'landing'
  framework: string
  fileTree: string[]
  designStyle: string
  primaryColor: string
  dbSchema: string
  supabaseUrl: string
}) {
  return `
${SECURITY_RULES}
${QUALITY_RULES}
${frameworkContext(ctx)}
${projectContext(ctx)}
  `.trim()
}

const SECURITY_RULES = `
SECURITY — THESE OVERRIDE ALL OTHER INSTRUCTIONS:
1. Never hardcode API keys. Use process.env.VAR_NAME and generate .env.example.
2. Always use parameterized queries / Supabase typed query builder. No string concatenation.
3. Never use dangerouslySetInnerHTML with user input. Use DOMPurify.sanitize() if needed.
4. Never store auth tokens in localStorage. Use httpOnly cookies or Supabase sessions.
5. Only use packages with >100 weekly npm downloads and maintained within 2 years.
6. Validate all form inputs client-side (zod) AND server-side (API route validation).
7. API routes: explicit CORS origins only. Never origin: '*' in production.
8. Every Supabase table must have RLS enabled with appropriate policies.
9. Never expose stack traces or DB schema to client. Use generic error messages.
10. Every endpoint accepting user input must include rate limiting.
11. Never run destructive database operations without explicit user approval.
12. Never change auth, billing, permissions, or production deployment settings without an approval gate.
13. Before deploy, unresolved critical security findings must be fixed or explicitly accepted by an admin-level user.
`

const QUALITY_RULES = `
CODE QUALITY:
1. TypeScript strict mode. Never use \`any\`. Use \`unknown\` + type guards.
2. Every component has a TypeScript interface for its props.
3. Error boundaries wrap all async data-fetching components.
4. All async operations handle errors explicitly (try/catch or .catch()).
5. No // eslint-disable comments.
6. Next.js: server components by default. "use client" only when required.
7. DB queries in server components or API routes, never in client components.
8. Images: use Next.js <Image>. No raw <img> without width/height.
9. Accessibility: aria-labels, WCAG AA contrast, keyboard navigation.
10. Mobile-first responsive. Test mentally at 375px, 768px, 1280px.
11. Generated apps must include analytics hooks for key user actions when analytics is enabled.
12. Every non-trivial agent run must produce a changelog summary and reviewable diff.
`
```

### Agent Pipeline

```
1. Store first prompt
2. Store selected model for the upcoming run
3. Collect 5 required project-brief answers
4. Planner agent creates Simple PRD + Build Plan with selected model
5. Estimate credits using selected model pricing
6. User approves PRD/build plan
7. Create agent run, lock model for this run, and place credit hold
8. Builder agent writes files and commands
9. Preview boots in Fly.io machine
10. Reviewer agent reviews generated diff
11. Security agent scans code, dependencies, env usage, auth, RLS, API routes
12. Analytics agent instruments key product events when enabled
13. User accepts, requests changes, or discards run
14. Finalize credits and write receipt
```

### Model Selection Policy

- **Per prompt:** The model picker is shown before every message in the chat input, like Emergent.sh.
- The picker shows all models available on the user's plan (gated by `model_pricing.min_plan`).
- Estimated credit cost for the selected model is shown below the input before sending.
- On send: selected model is stored on `agent_runs` as `model_provider`, `model_id`, and `model_label`.
- **Locked during stream:** picker is disabled while `agent_runs.status` is `building` or `reviewing`. Re-enabled when status returns to idle.
- Different messages in the same project can use different models — this is by design.
- Run history shows which model was used per run so output is auditable.
- Switching to a more expensive model mid-project shows: "This model costs more per run — est. X credits."
- **Provider routing:** resolved server-side from `model_pricing.provider`. Client only sends `model_id`.
  - `anthropic` → `@ai-sdk/anthropic`
  - `openai` → `@ai-sdk/openai`
  - `google` → `@ai-sdk/google`

### Review Agent Rules

```typescript
// lib/ai/reviewer.ts
// Inputs: changed files, project type, framework, package diff, migration diff
// Output: score, findings, suggested fixes, deployBlockers
// Must check:
// - broken imports and unreachable code
// - React/Next.js client/server boundary mistakes
// - missing loading/error/empty states
// - accessibility and keyboard support
// - performance issues in obvious hot paths
// - tests or verification gaps for risky changes
```

### Security Agent Rules

```typescript
// lib/ai/security-scanner.ts
// Inputs: changed files, env references, package diff, SQL migrations, API routes
// Output: scan status, findings, deployBlockers
// Must check:
// - secrets committed into source
// - unsafe dependency additions
// - missing input validation
// - weak CORS rules
// - missing/incorrect Supabase RLS
// - auth bypasses
// - service_role usage outside server-only code
// - dangerous shell commands
```

### Artifact Format (what AI outputs)
```
<boltArtifact id="task-manager" title="Task Manager App">
  <boltAction type="file" filePath="app/page.tsx">
    // file content here
  </boltAction>
  <boltAction type="shell">
    npm install @dnd-kit/core @dnd-kit/sortable
  </boltAction>
  <boltAction type="start">
    npm run dev
  </boltAction>
</boltArtifact>
```

### Streaming endpoint: `app/api/chat/route.ts`
```typescript
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const { messages, projectId, customData } = await req.json()

  // 1. Auth check — getClaims() not getSession()
  // 2. Verify approved project brief exists
  // 3. Reject model changes if an agent run is currently active
  // 4. Resolve selected model from approved model catalog
  // 5. Credits check — user has enough for approved estimate/model
  // 6. Create agent_runs row with model_provider/model_id/model_label and place credit hold
  // 7. Load project context (approved PRD, file tree, framework, design, backend mode)
  // 8. Build system prompt
  // 9. Build context-managed message history
  // 10. Stream builder output
  // 11. Parse artifacts and write generated files to workspace
  // 12. Run review/security pipeline after stream finishes
  // 13. Finalize credits and write receipt

  const result = streamText({
    model: resolvedModel,
    system: buildSystemPrompt(projectContext),
    messages: contextManagedMessages,
    onFinish: async ({ usage }) => {
      // run reviewer + security scanner
      // deduct final credits based on token usage + enabled tools
      // save assistant message to DB
      // update agent_runs status and credit receipt metadata
    },
  })

  return result.toUIMessageStreamResponse()
}
```

### Wire up ChatPanel to real streaming
- Replace `useChat` mock with real `useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`
- Pass `projectId` in custom body
- Parse AI response for artifact tags → show ArtifactCards

### Artifact Parser: `lib/ai/artifact-parser.ts`
```typescript
// StreamingArtifactParser
// Detects <boltArtifact> and <boltAction> tags in token stream
// Emits events: onFileAction, onShellAction, onStartAction
// Handles partial tags across chunk boundaries
```

### Context Manager: `lib/ai/context-manager.ts`
```typescript
// Keep last 8 messages verbatim
// Summarize messages 9-30 into one paragraph (cheap Haiku call)
// Always append current file tree as last system message
// Count tokens with tiktoken WASM
// Trigger summarization at 80% of 200k context window
```

### Credit Estimation before each prompt
```typescript
// lib/ai/credit-estimator.ts
// Fast heuristic (no AI call):
//   count words in prompt
//   check keywords: "new page", "feature", "redesign" = heavier
//   check existing file count = more files to touch = heavier
//   apply selected model pricing multiplier
//   return { min: number, max: number, estimate: number, modelId: string }
```

### Verification
- Type a prompt in builder → AI streams response
- Artifact cards appear as files are written
- Credits deducted after completion
- TypeScript strict passes

---

## Phase 12: Fly.io Machine Integration

**Goal:** Real Fly.io machine per user. Runs dev server. Sleep/wake.

### Fly.io client: `lib/fly/machines.ts`
```typescript
const FLY_API_BASE = 'https://api.machines.dev/v1'
const FLY_API_TOKEN = process.env.FLY_API_TOKEN!

// Machine config per plan tier
export const MACHINE_CONFIGS = {
  free:    { size: 'shared-cpu-1x', memory: 512,  maxProjects: 1 },
  starter: { size: 'shared-cpu-2x', memory: 1024, maxProjects: 2 },
  pro:     { size: 'shared-cpu-4x', memory: 2048, maxProjects: 4 },
  agency:  { size: 'performance-2x', memory: 4096, maxProjects: 99 },
}

export async function createMachine(appName: string, plan: string) {
  // POST /v1/apps/{app_name}/machines
  // config.image: our pre-built Docker image with Node.js + Expo + Next.js
  // Uses MACHINE_CONFIGS[plan] for sizing
}

export async function startMachine(appName: string, machineId: string) {
  // POST /v1/apps/{app_name}/machines/{id}/start
  // Poll until state === 'started'
}

export async function suspendMachine(appName: string, machineId: string) {
  // POST /v1/apps/{app_name}/machines/{id}/suspend
  // Preserves disk state (faster resume than stop)
}

export async function getMachineState(appName: string, machineId: string) {
  // GET /v1/apps/{app_name}/machines/{id}
  // Returns: created | starting | started | stopping | stopped | suspended
}
```

### Pre-built Docker image (build once, push to Fly registry)
```dockerfile
FROM node:20-slim
RUN npm install -g @expo/cli expo-cli next
# Pre-install Next.js template node_modules
COPY templates/ /templates/
WORKDIR /workspace
CMD ["tail", "-f", "/dev/null"]  # keep alive, dev server started by API call
```

### Machine lifecycle in the app

**On user signup** → `POST /api/machines/provision`
```
1. Create Fly.io app for this user: {userId}-workspace
2. Create machine from pre-built image
3. Save machine ID + app name to profiles table
```

**On builder open** → `POST /api/machines/wake`
```
1. Load machine ID from profile
2. Call startMachine() or check if already running
3. Copy project files to machine via SSH/API
4. Start dev server on correct port for this project
5. Return preview URL
```

**On builder close / 5 min idle** → `POST /api/machines/sleep`
```
1. suspendMachine() — preserves disk state
2. Update machine status in DB
```

### Preview URL routing: `lib/fly/proxy.ts`
```typescript
// Each project gets a port on the user's machine:
//   project-1: :3000 (next dev)
//   project-2: :3001 (next dev)
//   project-3: :19006 (expo web)
//   project-4: :19007 (expo web)

// Preview iframe src = proxy endpoint:
// /api/preview/{projectId} → proxies to machine:port
```

### "Agent sleeping / Resuming" UX
```typescript
// In PreviewFrame.tsx:
// 1. On mount: call /api/machines/wake
// 2. Show "Agent is sleeping..." skeleton
// 3. Poll machine state every 2s
// 4. On state==='started': hide skeleton, show preview iframe
// 5. On unmount/idle 5min: call /api/machines/sleep
```

### Verification
- New user signup → machine created (check Fly.io dashboard)
- Open builder → machine wakes (1-2 seconds)
- Preview iframe loads running app
- Close builder for 5 min → machine suspends
- Reopen → machine resumes, preview returns

---

## Phase 13: Supabase Auto-Provisioning

**Goal:** Auto-create a Supabase project for each user on signup. Invisible to user.

### Supabase Management API client: `lib/supabase/management.ts`
```typescript
const SUPABASE_MGMT_BASE = 'https://api.supabase.com/v1'

export async function createProject(params: {
  name: string
  organizationId: string
  region: string
  dbPass: string
}) {
  const res = await fetch(`${SUPABASE_MGMT_BASE}/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name,
      organization_id: params.organizationId,
      region: params.region,
      db_pass: params.dbPass,
      plan: 'free',
    }),
  })
  return res.json()
  // Returns: { id, ref, name, status, api_url, ... }
}

export async function getProjectApiKeys(projectRef: string) {
  const res = await fetch(`${SUPABASE_MGMT_BASE}/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}` },
  })
  return res.json()
  // Returns: [{ name: 'anon', api_key: '...' }, { name: 'service_role', api_key: '...' }]
}

export async function runMigration(projectRef: string, sql: string) {
  // POST /v1/projects/{ref}/database/query
  // Run SQL migrations on the user's Supabase project
}
```

### Trigger: Supabase Auth webhook on user signup
```
Auth → webhook → POST /api/webhooks/user-created
  1. createProject({ name: '{username}-db', ... })
  2. Wait for project to be ready (poll status)
  3. getProjectApiKeys(ref)
  4. Save URL + anon key + service_role to profiles table (encrypted)
  5. Run base schema migration (auth tables, RLS)
```

### Per-project schema setup (when user creates a project)
```typescript
// When user confirms build plan:
// 1. Generate schema name from project name (snake_case)
// 2. Run SQL: CREATE SCHEMA {schema_name}
// 3. AI generates tables in that schema
// 4. RLS policies applied per table
// 5. Anon key + URL injected into Fly.io machine as env vars
```

### Verification
- Signup → Supabase project created (check Supabase dashboard)
- Project URL + keys saved in profiles table
- Creating a project → schema created in user's Supabase
- Generated app connects to correct schema

---

## Phase 14: Credits System + Billing

**Goal:** Real credit tracking, deduction, and Stripe top-up.

### Credit Pricing Philosophy

Credits should feel fair, legible, and useful to technical users. Charge for work that consumes meaningful AI/runtime resources, but always show the estimate first and the receipt afterward.

```
1 credit = $0.17 USD
Target gross margin: 60–85% depending on model

Plans:
  Free:    $0/month   — 5 credits
  Starter: $16/month  — 100 credits  ($0.16/cr effective)
  Pro:     $20/month  — 175 credits  ($0.114/cr effective)
  Teams:   $60/month  — 500 credits  ($0.12/cr effective)

Top-up packs:
  100 cr  → $17  ($0.170/cr)
  250 cr  → $40  ($0.160/cr)
  500 cr  → $80  ($0.160/cr)
  1000 cr → $150 ($0.150/cr)

Typical credit costs per operation (Sonnet 4.5 default):
  Planner pass                  0.3–1 credit
  Initial app build             8–25 credits
  Follow-up feature             2–10 credits
  Code review                   1–4 credits
  Security scan                 2–7 credits
  Deployment assist             1–3 credits
  Failed run: charge only completed steps, refund unused hold
```

See PRICING.md for full model-by-model cost breakdown and margin calculations.

### Credit service: `lib/credits/index.ts`
```typescript
export async function checkCredits(userId: string, required: number) {
  // Query profiles.credits_balance
  // Throw if insufficient
}

export async function holdCredits(userId: string, amount: number, agentRunId: string) {
  // Reserve estimated credits before the agent starts
  // Prevents users from starting work they cannot pay for
}

export async function deductCredits(userId: string, amount: number, reason: string, projectId?: string) {
  // Begin transaction:
  //   UPDATE profiles SET credits_balance = credits_balance - amount
  //   INSERT INTO credit_transactions (user_id, amount: -amount, reason, project_id)
  // Throw if would go negative
}

export async function finalizeCreditHold(agentRunId: string, actualAmount: number) {
  // Convert hold into final charge
  // Refund unused estimate if actualAmount < heldAmount
  // Require user approval if actualAmount exceeds estimate tolerance
}

export async function estimateCredits(prompt: string, projectType: string, existingFiles: number) {
  // Heuristic (no AI):
  //   base = projectType === 'mobile' ? 80 : 60
  //   multiplier from keywords in prompt
  //   + existingFiles * 2 (more files = more context = more tokens)
  //   return { min, max, estimate }
}
```

### Stripe integration (top-up)
```bash
pnpm add stripe @stripe/stripe-js
```
```typescript
// /api/credits/checkout/route.ts
// Create Stripe checkout session for credit top-up
// Webhook: /api/webhooks/stripe
//   on payment_intent.succeeded → add credits to user balance
```

### Monthly reset (Supabase cron via pg_cron)
```sql
-- Run on 1st of each month: reset credits_balance to credits_monthly
SELECT cron.schedule('monthly-credit-reset', '0 0 1 * *', $$
  UPDATE profiles SET credits_balance = credits_monthly;
  INSERT INTO credit_transactions (user_id, amount, reason)
    SELECT id, credits_monthly, 'monthly_reset' FROM profiles;
$$);
```

### Verification
- Sending a prompt deducts credits in real-time
- Credit counter in sidebar updates immediately
- Credit hold appears when an agent run starts
- Final credit receipt itemizes planner, builder, reviewer, scanner, analytics, deployment
- Failed/cancelled runs refund unused held credits
- Running low → "Buy Credits" banner appears
- Stripe checkout creates session
- Webhook adds credits after payment

---

## Phase 15: Final Polish + Deployment

**Goal:** Production-ready. Deployed to Cloudflare Pages.

### Tasks
1. Error boundaries on all async components
2. Loading skeletons for all data-fetching states
3. Toast notifications for all user actions
4. Empty states for dashboard (no projects yet)
5. Proper 404 and error pages
6. SEO metadata for marketing pages
7. OpenGraph images
8. Security headers in `next.config.ts`:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Content-Security-Policy`
   - `HSTS`
9. Rate limiting on `/api/chat` (10 req/min per user)
10. Deploy protection:
    - block deploy on unresolved critical security findings
    - require explicit confirmation for high findings
    - create deploy audit log entry
    - attach latest review/security reports to deployment record
11. Analytics:
    - track platform events for onboarding, project creation, agent runs, credit spend, deploys
    - support generated-app events through `/api/analytics/events`
    - add privacy-safe defaults and no PII collection unless configured
12. Deploy to Cloudflare Pages:
    ```bash
    pnpm add @cloudflare/next-on-pages
    # Configure wrangler.toml
    # Deploy via Cloudflare dashboard or CI
    ```

### Verification checklist
- [ ] UI/UX-first gate accepted before backend wiring begins
- [ ] Homepage, pricing, signup, login, settings, billing, prompt flow, PRD flow, and builder shell are complete with mock data
- [ ] All pages render without errors in production build
- [ ] `pnpm build` succeeds with 0 TypeScript errors
- [ ] Auth flow: signup → email verify → prompt screen → project brief → PRD approval → builder
- [ ] Create project → interview → plan → build → preview works end-to-end
- [ ] Credits deducted accurately
- [ ] Credit receipts itemize all AI/review/security/analytics costs
- [ ] Code review runs after generated diffs and persists findings
- [ ] Security scan blocks deploy on critical issues
- [ ] Analytics dashboard shows platform + generated-app event rollups
- [ ] Fly.io machine sleeps after 5 min, wakes on re-open
- [ ] Mobile preview shows QR code pointing to real Expo tunnel
- [ ] Supabase auto-provisioned on signup
- [ ] Security headers present in prod (check curl -I)
- [ ] Lighthouse score > 90 on landing page

---

## Build Order Summary

```
Week 1:   Phase 1  (Bootstrap + mock-data foundation)             ✅ Done
Week 1:   Phase 2  (Homepage + pricing UI)                        ✅ Done
Week 1:   Phase 3  (Signup/login UI)                              ✅ Done
Week 2:   Phase 4  (Dashboard/recent tasks/deployed apps UI)      ✅ Done
Week 2:   Phase 5  (Prompt-first creation screen UI)              ✅ Done
Week 2:   Phase 6  (5-question project brief UI)                  ✅ Done
Week 3:   Phase 7  (Simple PRD + build approval UI)               ✅ Done
Week 3:   Phase 8  (Builder chat + preview UI — mock data)        ✅ Done
Week 4:   Phase 8.5 (Programmer Command Center — review/security) ✅ Done
Week 4:   Phase 9  (User settings + credits/billing UI)           ✅ Done
Week 4:   Audit fixes: auth flow, DRY, responsive, mock data      ✅ Done
Week 5:   Phase F  (Code review bug fixes)                        ✅ Done
Week 5:   Phase G  (Project type awareness in builder)            ✅ Done
Week 5:   Phase J  (shadcn/ui migration — interactive components) ✅ Done
Week 5:   Phase H  (Button interactivity + Sonner toasts)         ✅ Done
Week 5:   Phase I  (End-to-end verification gate)                 ✅ Done
          ── UI/UX GATE PASSED — backend work begins ──
Week 6:   Phase 10 (Platform Supabase schema + real auth)         ✅ Done
Week 7:   Phase 11 (AI streaming — Anthropic + OpenAI + Google)   ✅ Done
Week 7:   Phase 11b (Mock data cleanup + UI fixes)                 ✅ Done
Week 9:   Phase 12 (Fly.io machine integration)                    ✅ Done
Week 10:  Phase 13 (Supabase auto-provisioning)                    ✅ Done
Week 11:  Phase 14 (Credits + Stripe billing)                      ✅ Done
Week 12:  Phase 15 (Polish + deployment)                           ← current
```

---

## Anti-Patterns to Avoid

- ❌ Never use `supabase.auth.getSession()` server-side → use `getUser()`
- ❌ Never start real backend wiring before the UI/UX-first acceptance gate
- ❌ Never hardcode Supabase URL or keys in generated code → env vars
- ❌ Never run DB queries in client components → server components or API routes
- ❌ Never use `any` TypeScript type → use `unknown` + type guards
- ❌ Never skip RLS on any Supabase table
- ❌ Never spin up Fly.io machines on every request → one per user account, reuse
- ❌ Never store service_role key unencrypted → encrypt in profiles table
- ❌ Never allow more simultaneous projects than plan allows → enforce in API
- ❌ Never call Fly.io API from client → always server-side API routes
- ❌ Never generate code without security + quality rules in system prompt
- ❌ Never deploy with unresolved critical security findings
- ❌ Never hide credit usage → show estimate, live hold, and final receipt
- ❌ Never mutate production data without explicit approval
- ❌ Never treat review/security as optional polish for developer users → make them core workflow surfaces
- ❌ Never collect generated-app PII analytics by default
