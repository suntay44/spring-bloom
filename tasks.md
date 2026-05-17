# Wild Cupcake — Codex Task List

> **How to use**: Work tasks top-to-bottom within each phase. Mark done by changing `[ ]` to `[x]`.
> After each phase run `pnpm typecheck` and verify dev server renders correctly before moving on.
> All paths are relative to the project root.
>
> **Status**: UI/UX gate passed. All frontend phases complete. Backend work begins here.
> **Current phase**: Phase 10 — Platform Supabase Schema + Real Auth

---

## ── COMPLETED ── Frontend Phases (F · G · J · H · I)

All frontend work complete and merged. UI/UX gate accepted.
Do not re-open these phases.

---

## ── PHASE 10 ── Platform Supabase Schema + Real Auth

**Goal**: Replace MockAuthContext with real Supabase Auth. Wire signup/login.
Create the full platform DB schema. Protect routes with middleware.

**Pre-requisites** (must be done by the project owner before Codex runs this phase):
- Supabase project created at supabase.com
- `.env.local` populated with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  ```

---

### 10.1 — Install Supabase packages

- [ ] Run:
  ```bash
  pnpm add @supabase/supabase-js @supabase/ssr
  ```
- [ ] Verify no version conflicts: `pnpm typecheck` passes before continuing.

---

### 10.2 — Create Supabase browser client

- [ ] Create `lib/supabase/client.ts`:
  ```typescript
  import { createBrowserClient } from '@supabase/ssr'

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }
  ```

---

### 10.3 — Create Supabase server client

- [ ] Create `lib/supabase/server.ts`:
  ```typescript
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'

  export async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    )
  }
  ```

---

### 10.4 — Create root middleware for auth protection

- [ ] Create `middleware.ts` at the project root:
  ```typescript
  import { createServerClient } from '@supabase/ssr'
  import { NextResponse, type NextRequest } from 'next/server'

  export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Use getClaims() NOT getSession() — getSession() is not safe server-side
    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    const protectedPaths = ['/dashboard', '/new', '/builder', '/settings']
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

    if (isProtected && !user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    // Redirect logged-in users away from auth pages
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const newUrl = request.nextUrl.clone()
      newUrl.pathname = '/new'
      return NextResponse.redirect(newUrl)
    }

    return supabaseResponse
  }

  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
  }
  ```

---

### 10.5 — Run database schema in Supabase SQL editor

Copy and run each block in order in the Supabase dashboard → SQL Editor.

- [ ] **Block 1: profiles**
  ```sql
  create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    full_name text,
    avatar_url text,
    plan text default 'free' check (plan in ('free','starter','pro','teams')),
    fly_machine_id text,
    fly_app_name text,
    supabase_project_ref text,
    supabase_project_url text,
    supabase_anon_key text,
    supabase_service_role_key text,
    created_at timestamptz default now()
  );
  alter table public.profiles enable row level security;
  create policy "users own their profile"
    on public.profiles for all using (auth.uid() = id);
  ```

- [ ] **Block 2: projects**
  ```sql
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
    fly_port integer,
    db_schema text,
    deploy_url text,
    github_url text,
    vercel_project_id text,
    design_style text,
    primary_color text,
    dark_mode text default 'light',
    forked_from uuid references public.projects(id),
    is_public boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table public.projects enable row level security;
  create policy "users own their projects"
    on public.projects for all using (auth.uid() = user_id);
  ```

- [ ] **Block 3: project_briefs**
  ```sql
  create table public.project_briefs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    initial_prompt text not null,
    answers jsonb not null,
    prd jsonb not null,
    estimated_credits numeric(10,4) not null default 0,
    approved_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table public.project_briefs enable row level security;
  create policy "users own their project briefs"
    on public.project_briefs for all using (auth.uid() = user_id);
  ```

- [ ] **Block 4: messages**
  ```sql
  create table public.messages (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    role text not null check (role in ('user','assistant','system')),
    content text not null,
    model_id text,
    credits_used numeric(10,4) default 0,
    created_at timestamptz default now()
  );
  alter table public.messages enable row level security;
  create policy "users own their messages"
    on public.messages for all
    using (exists (
      select 1 from public.projects
      where id = messages.project_id and user_id = auth.uid()
    ));
  ```

- [ ] **Block 5: agent_runs**
  ```sql
  create table public.agent_runs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_brief_id uuid references public.project_briefs(id),
    parent_message_id uuid references public.messages(id),
    status text default 'queued'
      check (status in ('queued','planning','building','reviewing','scanning','completed','failed','cancelled')),
    prompt text not null,
    model_provider text not null default 'anthropic'
      check (model_provider in ('anthropic','openai','google')),
    model_id text not null default 'claude-sonnet-4-5',
    model_label text not null default 'Claude Sonnet 4.5',
    plan jsonb,
    changed_files jsonb default '[]'::jsonb,
    commands jsonb default '[]'::jsonb,
    estimated_credits numeric(10,4) not null default 0,
    held_credits numeric(10,4) not null default 0,
    final_credits numeric(10,4) not null default 0,
    tokens_input int,
    tokens_output int,
    started_at timestamptz default now(),
    finished_at timestamptz
  );
  alter table public.agent_runs enable row level security;
  create policy "users own their agent runs"
    on public.agent_runs for all using (auth.uid() = user_id);
  ```

- [ ] **Block 6: model_pricing**
  ```sql
  create table public.model_pricing (
    model_id               text primary key,
    display_name           text not null,
    provider               text not null check (provider in ('anthropic','openai','google')),
    credits_per_1m_input   numeric(8,4) not null,
    credits_per_1m_output  numeric(8,4) not null,
    min_plan               text not null check (min_plan in ('free','starter','pro','teams')),
    is_active              boolean default true
  );
  -- Public read (no auth required to fetch model list)
  alter table public.model_pricing enable row level security;
  create policy "anyone can read model pricing"
    on public.model_pricing for select using (true);

  -- Seed: 1 credit = $0.17 USD
  insert into public.model_pricing values
    ('claude-haiku-4-5',    'Claude Haiku 4.5',     'anthropic', 5.88,  29.41, 'free',    true),
    ('claude-sonnet-4-5',   'Claude Sonnet 4.5',    'anthropic', 17.65, 88.24, 'free',    true),
    ('claude-sonnet-4-6',   'Claude Sonnet 4.6',    'anthropic', 17.65, 88.24, 'free',    true),
    ('claude-opus-4-5',     'Claude Opus 4.5',      'anthropic', 29.41, 147.06,'starter', true),
    ('gpt-4-1-nano',        'GPT-4.1 Nano',         'openai',    0.59,  2.35,  'free',    true),
    ('gpt-5-4-mini',        'GPT-5.4 Mini',         'openai',    4.41,  26.47, 'starter', true),
    ('gpt-5-4-standard',    'GPT-5.4 Standard',     'openai',    14.71, 88.24, 'pro',     true),
    ('gpt-5-5',             'GPT-5.5',              'openai',    29.41, 176.47,'teams',   true),
    ('o3',                  'o3',                   'openai',    11.76, 47.06, 'pro',     true),
    ('gemini-2-5-flash',    'Gemini 2.5 Flash',     'google',    1.76,  14.71, 'free',    true),
    ('gemini-2-5-pro',      'Gemini 2.5 Pro',       'google',    7.35,  58.82, 'starter', true);
  ```

- [ ] **Block 7: credit_transactions**
  ```sql
  create table public.credit_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id uuid references public.projects(id),
    agent_run_id uuid references public.agent_runs(id),
    run_id uuid,
    type text not null
      check (type in ('purchase','hold','deduct','refund','bonus','expire','monthly_reset')),
    amount numeric(10,4) not null,
    model_id text,
    tokens_input int,
    tokens_output int,
    price_paid_usd numeric(8,2),
    stripe_session_id text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  alter table public.credit_transactions enable row level security;
  create policy "users own their transactions"
    on public.credit_transactions for all using (auth.uid() = user_id);

  create view public.user_credit_balance as
    select user_id, sum(amount) as balance
    from public.credit_transactions
    group by user_id;
  ```

- [ ] **Block 8: review_runs + review_findings**
  ```sql
  create table public.review_runs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    agent_run_id uuid references public.agent_runs(id) on delete cascade,
    score integer check (score between 0 and 100),
    status text default 'pending'
      check (status in ('pending','passed','passed_with_risks','failed')),
    summary text,
    credits_used numeric(10,4) default 0,
    created_at timestamptz default now()
  );
  alter table public.review_runs enable row level security;
  create policy "users own their review runs"
    on public.review_runs for all
    using (exists (select 1 from public.projects where id = review_runs.project_id and user_id = auth.uid()));

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
      select 1 from public.review_runs rr
      join public.projects p on p.id = rr.project_id
      where rr.id = review_findings.review_run_id and p.user_id = auth.uid()
    ));
  ```

- [ ] **Block 9: security_scans + security_findings**
  ```sql
  create table public.security_scans (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    agent_run_id uuid references public.agent_runs(id) on delete cascade,
    status text default 'pending'
      check (status in ('pending','clean','needs_attention','blocked','failed')),
    scanner_version text,
    credits_used numeric(10,4) default 0,
    created_at timestamptz default now()
  );
  alter table public.security_scans enable row level security;
  create policy "users own their security scans"
    on public.security_scans for all
    using (exists (select 1 from public.projects where id = security_scans.project_id and user_id = auth.uid()));

  create table public.security_findings (
    id uuid primary key default gen_random_uuid(),
    security_scan_id uuid references public.security_scans(id) on delete cascade not null,
    severity text not null check (severity in ('critical','high','medium','low','info')),
    category text not null,
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
      select 1 from public.security_scans ss
      join public.projects p on p.id = ss.project_id
      where ss.id = security_findings.security_scan_id and p.user_id = auth.uid()
    ));
  ```

- [ ] **Block 10: analytics_events + project_snapshots**
  ```sql
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
      auth.uid() = user_id or
      exists (select 1 from public.projects where id = analytics_events.project_id and user_id = auth.uid())
    );

  create table public.project_snapshots (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    file_tree jsonb not null,
    taken_at timestamptz default now()
  );
  alter table public.project_snapshots enable row level security;
  create policy "users own their snapshots"
    on public.project_snapshots for all
    using (exists (select 1 from public.projects where id = project_snapshots.project_id and user_id = auth.uid()));
  ```

- [ ] **Block 11: profile auto-create trigger**
  ```sql
  -- Auto-create profile row when a user signs up
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.profiles (id, full_name, avatar_url)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
    -- Give new users 5 free credits
    insert into public.credit_transactions (user_id, type, amount, metadata)
    values (new.id, 'bonus', 5, '{"reason": "signup_bonus"}'::jsonb);
    return new;
  end;
  $$ language plpgsql security definer;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
  ```

---

### 10.6 — Remove MockAuthContext, replace with real Supabase Auth

- [ ] Delete `context/MockAuthContext.tsx` entirely.
- [ ] Delete `components/shared/AuthGuard.tsx` entirely.
- [ ] In `app/layout.tsx`:
  - Remove `import { MockAuthProvider }` and `<MockAuthProvider>` wrapper.
  - The layout should just render `{children}` inside `<body>` (middleware handles auth).
  - Keep `<Toaster />` from Sonner.

---

### 10.7 — Wire signup form to Supabase

- [ ] In `app/(auth)/signup/page.tsx` (or wherever the signup form lives):
  ```typescript
  'use client'
  import { createClient } from '@/lib/supabase/client'
  import { useRouter } from 'next/navigation'

  // On form submit:
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
  if (error) { /* show error toast */ return }
  router.push('/new')
  ```
- [ ] Show `toast.error(error.message)` on failure.
- [ ] Show `toast.success("Account created!")` on success.
- [ ] Button shows spinner while submitting (disabled during async).

---

### 10.8 — Wire login form to Supabase

- [ ] In `app/(auth)/login/page.tsx`:
  ```typescript
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { toast.error(error.message); return }
  router.push('/new')
  ```
- [ ] Same spinner + toast pattern as signup.

---

### 10.9 — Wire logout

- [ ] In `components/layout/AppShell.tsx` (or wherever the user menu is):
  ```typescript
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push('/login')
  ```
- [ ] Wire to the "Sign out" menu item or button.

---

### 10.10 — Replace mock user with real session data

- [ ] In `components/layout/AppShell.tsx`:
  - Replace `MOCK_USER` with real data. Fetch in the server component or pass as prop:
    ```typescript
    // In app/(app)/layout.tsx (server component):
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, plan')
      .eq('id', user!.id)
      .single()
    const { data: balanceRow } = await supabase
      .from('user_credit_balance')
      .select('balance')
      .eq('user_id', user!.id)
      .single()
    ```
  - Pass `user`, `profile`, `balance` as props to `AppShell`.
  - Display real name, plan, and credit balance.
  - If `profile` is null (new user, trigger hasn't fired yet): show loading state, not crash.

---

### 10.11 — Create API route stubs (typed, auth-checked, empty bodies)

Create each file. Each must: verify auth with `supabase.auth.getUser()`, return 401 if no user, return 200 with `{ data: null }` placeholder. No real logic yet — that's Phase 11+.

- [ ] `app/api/projects/route.ts` — GET (list), POST (create)
- [ ] `app/api/projects/[id]/route.ts` — GET, PATCH, DELETE
- [ ] `app/api/projects/[id]/brief/route.ts` — GET, POST
- [ ] `app/api/projects/[id]/brief/approve/route.ts` — POST
- [ ] `app/api/projects/[id]/messages/route.ts` — GET, POST
- [ ] `app/api/projects/[id]/agent-runs/route.ts` — GET, POST
- [ ] `app/api/credits/route.ts` — GET balance
- [ ] `app/api/credits/estimate/route.ts` — POST estimate
- [ ] `app/api/models/route.ts` — GET active model list from `model_pricing` table (public, no auth required)

**Pattern for each stub:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: null })
}
```

---

### 10.12 — Create `GET /api/models` (real, not a stub)

This endpoint is needed by the model picker in the chat UI (Phase 11).

- [ ] In `app/api/models/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'

  export async function GET() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('model_pricing')
      .select('model_id, display_name, provider, min_plan, credits_per_1m_input, credits_per_1m_output')
      .eq('is_active', true)
      .order('provider')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  ```
- [ ] No auth required (model pricing is public).

---

### 10.13 — Verification

- [ ] `pnpm typecheck` — zero errors.
- [ ] `pnpm dev` — no runtime errors in console.
- [ ] `/signup` → fill form → submit → profile row appears in Supabase dashboard → redirects to `/new`.
- [ ] `/login` → sign in with created account → redirects to `/new`.
- [ ] Visit `/dashboard` while logged out → redirects to `/login`.
- [ ] Visit `/builder/anything` while logged out → redirects to `/login`.
- [ ] Sidebar shows real user name and credit balance (5 credits from signup bonus).
- [ ] `GET /api/models` returns the 11 active models from DB.
- [ ] Sign out → redirects to `/login`, protected routes redirect again.
- [ ] No `MockAuthContext` or `AuthGuard` imports remain anywhere in the codebase.

---

## ── NEXT ── Phase 11 — AI Streaming (Anthropic + OpenAI + Google)

**Begins after Phase 10 verification passes.**

Key tasks (full detail in PLAN.md Phase 11):
- Install `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`
- Build `lib/ai/system-prompt.ts` (3-layer: security + quality + project context)
- Build `lib/ai/artifact-parser.ts` (boltArtifact streaming parser)
- Build `lib/ai/context-manager.ts` (8 messages verbatim + summarize older)
- Build `lib/credits/calculate.ts` (hold → deduct → refund using model_pricing table)
- Implement `app/api/chat/route.ts` (multi-provider routing, credit hold, stream, finalize)
- Wire `useChat()` in `ChatPanel.tsx` to real `/api/chat`
- Model picker reads from `/api/models`, gated by user's plan

---

## ── NOTES FOR CODEX ──

### Hard rules
1. **Never call `supabase.auth.getSession()` server-side** — always use `supabase.auth.getUser()`.
2. **No frontend credit changes** — credit deduction happens server-side only via API routes.
3. **No mock data imports in real pages** — `lib/mock/*` is only for UI development, not used in backend routes.
4. **RLS on every table** — every `create table` must be followed by `alter table ... enable row level security` and at least one policy.
5. **Service role key is server-only** — never import `SUPABASE_SERVICE_ROLE_KEY` in any file inside `app/(marketing)`, `app/(auth)`, or client components.
6. **Run `pnpm typecheck` after each numbered task** — do not batch multiple tasks before checking.
7. **Spinner on all async form actions** — disable button + show loading state while Supabase calls are in flight.
