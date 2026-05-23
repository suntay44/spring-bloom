-- ═══════════════════════════════════════════════════════════════════════════
-- SPRINGBLOOM — Combined Migrations 014 → 026
-- Safe to run even if some migrations were already applied.
-- All CREATE TABLE use IF NOT EXISTS.
-- All INSERT use ON CONFLICT DO NOTHING.
-- All CREATE POLICY are wrapped to skip if already exists.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── library_clusters + library_modules (required by 024, 025, 026) ───────────
-- These tables were missing from earlier migrations. Safe to run multiple times.

create table if not exists public.library_clusters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  cluster_type text not null,
  tags         text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.library_clusters enable row level security;

create table if not exists public.library_modules (
  id           uuid primary key default gen_random_uuid(),
  cluster_id   uuid references public.library_clusters(id) on delete cascade,
  name         text not null,
  description  text,
  category     text not null,
  tags         text[] not null default '{}',
  template     text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.library_modules enable row level security;

create index if not exists library_modules_cluster_id_idx  on public.library_modules(cluster_id);
create index if not exists library_modules_category_idx    on public.library_modules(category);
create index if not exists library_modules_is_active_idx   on public.library_modules(is_active);


-- ───────────────────────────────────────────────────────────────────────────
-- 014_phase19_library_and_admin.sql
-- ───────────────────────────────────────────────────────────────────────────
-- 014_phase19_library_and_admin.sql
-- Phase 19: Generation Intelligence Layer + Phase 20 admin prerequisites
--
-- New tables (creation order respects FK dependencies):
--   platform_settings     — internal key/value config for 3rd-party services
--   template_clusters     — groups of builds sharing the same fingerprint pattern
--   scaffold_templates    — promoted canonical templates (Books)
--   scaffold_modules      — proven micro-modules (Chapters)
--   app_builds            — structural fingerprint per AI generation (refs template_clusters)
--
-- profiles changes:
--   + is_admin boolean (service-role-only write, guarded by trigger)
--
-- All new tables: RLS enabled. Service-role-only write on all of them.

-- ── profiles: add is_admin ───────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Recreate guard trigger to include is_admin as a privileged column.
create or replace function public.guard_profile_privileged_columns()
returns trigger as $$
declare
  jwt_role text;
begin
  begin
    jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    jwt_role := null;
  end;

  if jwt_role = 'service_role' or auth.role() = 'service_role' then
    return new;
  end if;

  if new.plan                     is distinct from old.plan
     or new.subscription_id       is distinct from old.subscription_id
     or new.subscription_status   is distinct from old.subscription_status
     or new.plan_period_end       is distinct from old.plan_period_end
     or new.stripe_customer_id    is distinct from old.stripe_customer_id
     or new.supabase_project_ref  is distinct from old.supabase_project_ref
     or new.supabase_project_url  is distinct from old.supabase_project_url
     or new.supabase_anon_key     is distinct from old.supabase_anon_key
     or new.supabase_status       is distinct from old.supabase_status
     or new.is_admin              is distinct from old.is_admin
  then
    raise exception 'profiles: privileged columns can only be modified server-side (service role)';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ── platform_settings ────────────────────────────────────────────────────────
create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);
alter table public.platform_settings enable row level security;
-- Intentionally NO policies — service-role only.

insert into public.platform_settings (key, value) values
  ('ai.default_model_free',      '"claude-haiku-4-5"'),
  ('ai.default_model_starter',   '"claude-sonnet-4-5"'),
  ('ai.default_model_pro',       '"claude-sonnet-4-5"'),
  ('ai.default_model_teams',     '"claude-opus-4-5"'),
  ('ai.max_tokens_per_request',  '8192'),
  ('rate_limit.free_rpm',        '5'),
  ('rate_limit.starter_rpm',     '10'),
  ('rate_limit.pro_rpm',         '20'),
  ('rate_limit.teams_rpm',       '60'),
  ('credits.monthly_free',       '10'),
  ('credits.monthly_starter',    '100'),
  ('credits.monthly_pro',        '175'),
  ('credits.monthly_teams',      '500')
on conflict (key) do nothing;

-- ── template_clusters ────────────────────────────────────────────────────────
-- Must be created before app_builds (FK dependency).
create table if not exists public.template_clusters (
  id                  uuid primary key default gen_random_uuid(),
  fingerprint         jsonb not null default '{}',
  build_count         integer not null default 0,
  distinct_app_types  integer not null default 0,
  avg_success_score   numeric(5,2) not null default 0,
  status              text not null default 'candidate'
    check (status in ('candidate', 'canonical', 'deprecated')),
  promoted_at         timestamptz,
  promoted_by         uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table public.template_clusters enable row level security;
-- No user-facing policies.

-- ── scaffold_templates ───────────────────────────────────────────────────────
create table if not exists public.scaffold_templates (
  id            uuid primary key default gen_random_uuid(),
  cluster_id    uuid references public.template_clusters(id) on delete set null,
  name          text not null,
  description   text,
  category      text not null,
  tags          text[] not null default '{}',
  scaffold      jsonb not null default '{}',
  version       integer not null default 1,
  times_used    integer not null default 0,
  last_used_at  timestamptz,
  status        text not null default 'active'
    check (status in ('active', 'deprecated')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.scaffold_templates enable row level security;
-- No user-facing policies.

-- ── scaffold_modules ─────────────────────────────────────────────────────────
create table if not exists public.scaffold_modules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  module_type     text not null,
  description     text,
  tags            text[] not null default '{}',
  scaffold        jsonb not null default '{}',
  version         integer not null default 1,
  times_used      integer not null default 0,
  success_rate    numeric(5,2) not null default 0,
  source          text not null default 'extracted'
    check (source in ('extracted', 'handwritten')),
  status          text not null default 'active'
    check (status in ('active', 'deprecated')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.scaffold_modules enable row level security;
-- No user-facing policies.

-- Seed the Auth module (the one hand-written exception)
insert into public.scaffold_modules (
  name, module_type, description, tags, scaffold, source, status
) values (
  'Auth',
  'auth',
  'Supabase authentication — sign up, sign in, sign out, session handling, protected routes',
  array['auth', 'supabase', 'session', 'protected-routes'],
  '{
    "files": ["lib/supabase/client.ts", "lib/supabase/server.ts", "middleware.ts", "app/(auth)/login/page.tsx", "app/(auth)/signup/page.tsx"],
    "patterns": ["supabase-ssr", "protected-routes", "server-component-auth"],
    "imports": ["@supabase/supabase-js", "@supabase/ssr"],
    "state": "supabase-session"
  }',
  'handwritten',
  'active'
) on conflict do nothing;

-- ── app_builds ───────────────────────────────────────────────────────────────
-- Created after template_clusters to satisfy FK constraint.
create table if not exists public.app_builds (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.projects(id) on delete cascade not null,
  agent_run_id     uuid references public.agent_runs(id) on delete set null,
  user_id          uuid references auth.users(id) on delete cascade not null,
  fingerprint      jsonb not null default '{}',
  success_score    integer not null default 0
    check (success_score >= 0 and success_score <= 100),
  user_continued   boolean not null default false,
  was_published    boolean not null default false,
  edits_after      integer not null default 0,
  cluster_id       uuid references public.template_clusters(id) on delete set null,
  created_at       timestamptz default now()
);
alter table public.app_builds enable row level security;
do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'users read their builds'
      and tablename = 'app_builds'
  ) then
    create policy "users read their builds"
  on public.app_builds for select using (auth.uid() = user_id);
  end if;
end
$policy$;
-- No insert/update policies — service-role only.

create index if not exists app_builds_user_id_idx    on public.app_builds(user_id);
create index if not exists app_builds_cluster_id_idx on public.app_builds(cluster_id);
create index if not exists app_builds_created_at_idx on public.app_builds(created_at desc);


-- ───────────────────────────────────────────────────────────────────────────
-- 015_agent_run_error_tracking.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 015: Add error tracking columns to agent_runs
-- Lets the admin debug page categorize failures and filter out credit exhaustion.
-- Credit exhaustion (402) is rejected before a run is created, so it won't
-- normally appear here — but we include it as a possible reason for future paths.

alter table public.agent_runs
  add column if not exists error_message text,
  add column if not exists failure_reason text
    check (failure_reason in (
      'stream_error',
      'finalize_error',
      'provider_error',
      'credit_exhausted',
      'rate_limited',
      'timeout',
      'unknown'
    ));

comment on column public.agent_runs.error_message   is 'Human-readable error detail for failed runs';
comment on column public.agent_runs.failure_reason  is 'Categorized failure type for admin filtering';


-- ───────────────────────────────────────────────────────────────────────────
-- 016_project_integrations.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 016: Per-project integrations + secrets
--
-- Two-table design mirrors the profiles / user_secrets pattern:
--   project_integrations — public metadata (type, status, non-secret config)
--                          normal user-owned RLS, readable by the project owner
--   project_secrets      — actual credentials (secret keys, tokens)
--                          RLS enabled with ZERO policies → only service-role
--                          can read/write (same guarantee as user_secrets)

-- ────────────────────────────────────────────────────────────────
-- 1.  project_integrations  (public / status layer)
-- ────────────────────────────────────────────────────────────────
create table if not exists  public.project_integrations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects(id) on delete cascade not null,
  type         text not null check (type in (
                 'stripe', 'supabase', 'twilio',
                 'openai', 'anthropic', 'resend', 'env'
               )),
  status       text not null default 'pending'
               check (status in ('pending', 'active', 'sandbox', 'error')),
  -- Non-secret config: mode (test/live), URLs, Account SIDs, publishable keys, etc.
  public_config  jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (project_id, type)
);

alter table public.project_integrations enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'users own their project integrations'
      and tablename = 'project_integrations'
  ) then
    create policy "users own their project integrations"
  on public.project_integrations for all
  using (
    exists (
      select 1 from public.projects
      where id = project_integrations.project_id
        and user_id = auth.uid()
    )
  );
  end if;
end
$policy$;

-- ────────────────────────────────────────────────────────────────
-- 2.  project_secrets  (credential layer — service-role only)
-- ────────────────────────────────────────────────────────────────
create table if not exists  public.project_secrets (
  project_id    uuid references public.projects(id) on delete cascade not null,
  type          text not null check (type in (
                  'stripe', 'supabase', 'twilio',
                  'openai', 'anthropic', 'resend', 'env'
                )),
  -- Stored as jsonb so one row can hold multiple named secrets per integration
  -- e.g. { "secret_key": "sk_...", "webhook_secret": "whsec_..." }
  secret_config jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  primary key (project_id, type)
);

alter table public.project_secrets enable row level security;
-- Intentionally NO policies: RLS with zero policies denies all access to
-- authenticated/anon roles. Only the service-role key (which bypasses RLS)
-- can read or write this table — same as user_secrets.

comment on table public.project_secrets is
  'Per-project API credentials. Zero RLS policies = service-role only. Never expose to clients.';


-- ───────────────────────────────────────────────────────────────────────────
-- 017_app_stripe_sandboxes.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 017: Per-app Stripe sandbox state
--
-- Tracks whether a project is running on platform-owned test keys (sandbox)
-- or has claimed its own Stripe account (live). Zero RLS policies means only
-- the service-role key can touch this table — same guarantee as user_secrets
-- and project_secrets.

create table if not exists  public.app_stripe_sandboxes (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid references public.projects(id) on delete cascade not null unique,
  -- 'sandbox' = platform test keys injected; 'live' = user's own keys via Connect
  mode                    text not null default 'sandbox'
                          check (mode in ('sandbox', 'live')),
  -- Stripe Connect account ID — set when user completes OAuth ("Go Live")
  stripe_account_id       text,
  -- Ephemeral CSRF state token generated when we kick off the OAuth flow
  oauth_state             text,
  -- When sandbox keys were first injected into the Fly machine
  sandbox_provisioned_at  timestamptz,
  -- When user completed Connect OAuth and live keys were injected
  claimed_at              timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.app_stripe_sandboxes enable row level security;
-- Intentionally NO policies: service-role only (bypasses RLS).
-- Never expose raw Stripe keys to the browser.

comment on table public.app_stripe_sandboxes is
  'Per-project Stripe sandbox state. Zero RLS policies = service-role only. Never expose to clients.';


-- ───────────────────────────────────────────────────────────────────────────
-- 018_seed_library.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 018: Seed scaffold_templates and scaffold_modules
--
-- 10 hand-curated scaffold templates (5 web + 5 mobile) and 5 new scaffold modules.
-- These are the "General Library" — proven patterns that seed the AI prompt enhancer
-- for new users before organic app_builds accumulate enough data for auto-clustering.
--
-- All inserts use ON CONFLICT DO NOTHING so re-running is safe.

-- ── Web Scaffold Templates ────────────────────────────────────────────────────

insert into public.scaffold_templates
  (name, description, category, tags, scaffold, status)
values

-- 1. AI Chat Tool
(
  'AI Chat Tool',
  'Streaming AI assistant with conversation history, model selection, and system prompt config.',
  'ai-tool',
  array['ai', 'chatbot', 'streaming', 'llm', 'chat', 'assistant', 'gpt', 'claude', 'openai'],
  '{
    "file_structure": [
      "app/(chat)/page.tsx",
      "app/(chat)/[id]/page.tsx",
      "components/ChatMessage.tsx",
      "components/ChatInput.tsx",
      "components/ConversationSidebar.tsx",
      "components/ModelSelector.tsx",
      "app/api/chat/route.ts",
      "lib/ai/client.ts"
    ],
    "component_architecture": "Full-height layout: collapsible ConversationSidebar (list of past chats) on left, main chat area on right. Main area: scrollable message thread (ChatMessage components for user/assistant roles) + fixed bottom ChatInput bar with send button and model indicator. ModelSelector dropdown in header.",
    "state_pattern": "useChat() from Vercel AI SDK for streaming state. Conversation list in useState fetched from Supabase on mount. Active conversation ID in URL params. Auto-scroll ref on message container.",
    "db_schema": "conversations(id, user_id, title, model_id, system_prompt, created_at) | messages(id, conversation_id, role TEXT CHECK role IN user assistant, content, created_at)",
    "key_patterns": [
      "Stream via AI SDK streamText, return result.toUIMessageStreamResponse()",
      "Auto-scroll to bottom on each new message token using useEffect + scrollRef",
      "Optimistic user message appended to UI immediately before server confirms",
      "System prompt editable per conversation via modal, stored in conversations table",
      "Conversation title auto-generated from first user message (first 60 chars)"
    ],
    "default_modules": ["auth"]
  }',
  'active'
),

-- 2. SaaS Dashboard
(
  'SaaS Dashboard',
  'Multi-tenant SaaS with sidebar nav, KPI metrics, data tables, subscription billing, and team management.',
  'saas',
  array['saas', 'dashboard', 'analytics', 'metrics', 'subscription', 'billing', 'admin', 'sidebar', 'team', 'organization'],
  '{
    "file_structure": [
      "app/(dashboard)/layout.tsx",
      "app/(dashboard)/page.tsx",
      "app/(dashboard)/analytics/page.tsx",
      "app/(dashboard)/settings/page.tsx",
      "app/(dashboard)/settings/billing/page.tsx",
      "app/(dashboard)/settings/team/page.tsx",
      "components/Sidebar.tsx",
      "components/MetricCard.tsx",
      "components/DataTable.tsx",
      "components/DateRangePicker.tsx"
    ],
    "component_architecture": "Sidebar (collapsible on mobile, fixed on desktop) + main scrollable content. Dashboard home: row of MetricCards (total users, MRR, churn, active sessions) + date-filtered time-series chart (Recharts) + recent activity DataTable. Settings split into tabs: Profile, Billing (plan + usage + invoices), Team (invite members, set roles).",
    "state_pattern": "Server components for all data fetching. Client islands for interactive charts and date picker. SWR or React Query for metric refresh every 30s. URL search params for date range and table pagination.",
    "db_schema": "organizations(id, name, plan, stripe_customer_id, stripe_subscription_id) | org_members(org_id, user_id, role TEXT CHECK role IN owner admin member) | events(id, org_id, type, value, metadata jsonb, created_at)",
    "key_patterns": [
      "Role-based sidebar: owner sees Billing + Team; member sees only data sections",
      "Metrics aggregated server-side with GROUP BY date_trunc to avoid sending raw rows to client",
      "Empty state components for new orgs with guided onboarding checklist",
      "Stripe Customer Portal for billing self-service (redirect to Stripe-hosted page)",
      "Middleware checks org membership before every dashboard route"
    ],
    "default_modules": ["auth", "stripe-subscriptions"]
  }',
  'active'
),

-- 3. Marketplace
(
  'Marketplace',
  'Two-sided platform with listings, seller dashboard, buyer browse/search, and Stripe payments.',
  'marketplace',
  array['marketplace', 'listing', 'seller', 'buyer', 'products', 'services', 'two-sided', 'platform', 'shop', 'store', 'vendor'],
  '{
    "file_structure": [
      "app/(marketplace)/page.tsx",
      "app/(marketplace)/listings/[id]/page.tsx",
      "app/(marketplace)/sell/page.tsx",
      "app/(marketplace)/dashboard/page.tsx",
      "app/(marketplace)/orders/page.tsx",
      "components/ListingCard.tsx",
      "components/ListingForm.tsx",
      "components/FilterSidebar.tsx",
      "app/api/listings/route.ts",
      "app/api/listings/[id]/route.ts"
    ],
    "component_architecture": "Public browse: grid of ListingCards with FilterSidebar (category, price range, location, sort). Listing detail: image gallery, title, price, seller avatar + rating, description, CTA (Buy Now or Contact). Seller dashboard: tabs for My Listings, Orders Received, Earnings. Buyer: Orders Placed history.",
    "state_pattern": "Server components for browse + detail (SEO-critical). Client state for filter sidebar (synced to URL params). Optimistic toggle for favorites/saves. Seller form is client component with react-hook-form.",
    "db_schema": "listings(id, seller_id, title, description, price_cents, category, images text[], status TEXT CHECK status IN active sold paused) | orders(id, buyer_id, listing_id, status, stripe_session_id, created_at) | reviews(id, reviewer_id, listing_id, rating int, comment, created_at)",
    "key_patterns": [
      "Seller and buyer are same users table — role determined by action, not a column",
      "Listing images stored in Supabase Storage, URLs saved as text[] in listings.images",
      "Price stored as integer cents (e.g. 2999 = $29.99) to avoid floating point",
      "Search uses Postgres full-text search: to_tsvector on title + description",
      "Listing status auto-changes to sold after order.status = completed"
    ],
    "default_modules": ["auth", "stripe-checkout", "file-upload"]
  }',
  'active'
),

-- 4. Booking / Scheduling
(
  'Booking & Scheduling',
  'Service booking with availability calendar, time slot selection, confirmation, and admin schedule management.',
  'booking',
  array['booking', 'scheduling', 'appointment', 'calendar', 'availability', 'reservation', 'slots', 'service', 'barbershop', 'salon', 'clinic', 'consultation'],
  '{
    "file_structure": [
      "app/(booking)/page.tsx",
      "app/(booking)/book/[serviceId]/page.tsx",
      "app/(booking)/confirmation/[appointmentId]/page.tsx",
      "app/(admin)/schedule/page.tsx",
      "app/(admin)/services/page.tsx",
      "components/AvailabilityCalendar.tsx",
      "components/TimeSlotPicker.tsx",
      "components/BookingForm.tsx",
      "app/api/availability/route.ts",
      "app/api/appointments/route.ts"
    ],
    "component_architecture": "Public flow (3 steps): 1. Service selection cards → 2. Date picker (AvailabilityCalendar, disabled past + fully-booked days) + TimeSlotPicker (grid of available slots) → 3. BookingForm (name, email, notes) + confirm button → Confirmation page with booking details. Admin: week-view calendar showing all bookings, click to view/cancel/reschedule.",
    "state_pattern": "Multi-step booking in useState with step index (0=service, 1=slot, 2=details). Selected date triggers server fetch for available slots. Confirmation stored optimistically, validated server-side before commit.",
    "db_schema": "services(id, owner_id, name, description, duration_min, price_cents, is_active) | availability_rules(id, service_id, day_of_week int, start_time time, end_time time) | appointments(id, service_id, customer_name, customer_email, slot_start timestamptz, slot_end timestamptz, status TEXT CHECK status IN pending confirmed cancelled, notes)",
    "key_patterns": [
      "Available slots = generate_slots(availability_rules) MINUS existing appointments for that date",
      "Slot generation runs server-side (API route) — never trust client-computed availability",
      "All times stored in UTC; display in user browser timezone via Intl.DateTimeFormat",
      "Double-booking prevented by UNIQUE constraint on (service_id, slot_start) in appointments",
      "Confirmation email sent via Resend on appointment insert (include .ics calendar attachment)"
    ],
    "default_modules": ["auth", "email-notifications"]
  }',
  'active'
),

-- 5. Internal CRUD Admin
(
  'Internal CRUD Admin',
  'Internal operator tool with searchable data tables, record forms, filters, pagination, and role-based access.',
  'admin-tool',
  array['internal', 'admin', 'crud', 'dashboard', 'data', 'table', 'management', 'tool', 'operator', 'back-office', 'panel'],
  '{
    "file_structure": [
      "app/(admin)/layout.tsx",
      "app/(admin)/[resource]/page.tsx",
      "app/(admin)/[resource]/new/page.tsx",
      "app/(admin)/[resource]/[id]/page.tsx",
      "components/DataTable.tsx",
      "components/RecordForm.tsx",
      "components/FilterBar.tsx",
      "components/ColumnHeader.tsx",
      "lib/admin/query-builder.ts"
    ],
    "component_architecture": "Sidebar with resource links + current user + logout. List page: FilterBar (search input + dropdowns) above sortable DataTable with pagination footer + row actions (View, Edit, Delete). Detail/Edit page: full RecordForm with all fields, Save and Delete buttons, back breadcrumb.",
    "state_pattern": "Server components for all data reads (URL search params drive filters + pagination). Client for form state (react-hook-form + zod validation). Optimistic deletes with Sonner undo toast (5s window to cancel).",
    "db_schema": "Built around whatever resource the user specifies (e.g. products, customers, orders). Always include: id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz (soft delete).",
    "key_patterns": [
      "FilterBar writes to URL search params — table is a server component that reads them",
      "Soft delete: set deleted_at = now() instead of DELETE; default filter excludes deleted rows",
      "DataTable column config is a typed array passed as prop — one source of truth per resource",
      "All admin routes guard: check is_admin = true server-side on every request",
      "CSV export button runs same query without pagination, streams to file download"
    ],
    "default_modules": ["auth"]
  }',
  'active'
),

-- ── Mobile Scaffold Templates ─────────────────────────────────────────────────

-- 6. Habit Tracker (Mobile)
(
  'Habit Tracker (Mobile)',
  'Daily habit tracking with streaks, check-ins, reminder notifications, and history heat-map.',
  'habit-tracker',
  array['habit', 'streak', 'tracker', 'daily', 'routine', 'check-in', 'reminder', 'productivity', 'goal', 'consistency'],
  '{
    "file_structure": [
      "app/(tabs)/index.tsx",
      "app/(tabs)/history.tsx",
      "app/(tabs)/settings.tsx",
      "components/HabitCard.tsx",
      "components/StreakRing.tsx",
      "components/AddHabitModal.tsx",
      "components/HeatMap.tsx",
      "lib/habits.ts",
      "store/habits.ts"
    ],
    "component_architecture": "3-tab layout: Today (FlatList of HabitCards with tap-to-complete), History (calendar heat-map showing completion density per day), Settings (manage habits list, set reminder time). HabitCard: color dot + habit name + current streak badge + animated checkmark. AddHabitModal: name input, color picker, frequency selector.",
    "state_pattern": "Zustand store for habits array + todayCompletions Set<habitId>. Local-first: write completion to AsyncStorage immediately, sync to Supabase in background. Hydrate store from Supabase on app foreground.",
    "db_schema": "habits(id, user_id, name, color text, frequency TEXT CHECK frequency IN daily weekly, reminder_time time, is_active bool, created_at) | habit_logs(id, habit_id, user_id, completed_date date)",
    "key_patterns": [
      "Streak = consecutive days with a habit_log entry going backwards from today",
      "Today resets at midnight local time using date-fns startOfDay in user timezone",
      "Completion animation: Reanimated scale 1→1.2→1 + opacity flash on checkmark",
      "Push notification scheduled per-habit via expo-notifications with dailyTrigger",
      "Offline-first: completions queue in AsyncStorage when no network, flush on reconnect"
    ],
    "default_modules": ["auth", "notifications"]
  }',
  'active'
),

-- 7. Fitness Tracker (Mobile)
(
  'Fitness Tracker (Mobile)',
  'Workout logging with exercise library, sets/reps/weight tracking, rest timers, and progress charts.',
  'fitness',
  array['fitness', 'workout', 'exercise', 'gym', 'training', 'health', 'sets', 'reps', 'weight', 'calories', 'bodybuilding', 'strength'],
  '{
    "file_structure": [
      "app/(tabs)/index.tsx",
      "app/(tabs)/history.tsx",
      "app/(tabs)/exercises.tsx",
      "app/(tabs)/profile.tsx",
      "app/workout/[id].tsx",
      "components/WorkoutCard.tsx",
      "components/ExerciseSet.tsx",
      "components/RestTimer.tsx",
      "components/ProgressChart.tsx",
      "store/workout.ts"
    ],
    "component_architecture": "4-tab layout: Home (start workout button + recent workouts), History (list of completed WorkoutCards with duration + volume), Exercises (searchable library by muscle group), Profile (lifetime stats + PRs). Active workout screen: workout name + timer + FlatList of exercises, each with ExerciseSet rows (set number, reps input, weight input, done checkbox).",
    "state_pattern": "Active workout in Zustand (cleared on finish/cancel). Completed workouts and exercises fetched from Supabase. Exercise library loaded once on install, cached in AsyncStorage. Rest timer in local component state with Interval.",
    "db_schema": "exercises(id, name, category text, muscle_group text, equipment text, instructions text) | workouts(id, user_id, name, started_at timestamptz, finished_at timestamptz, notes) | workout_sets(id, workout_id, exercise_id, set_number int, reps int, weight_kg numeric, completed bool)",
    "key_patterns": [
      "Rest timer starts automatically after marking a set done; haptic feedback on complete",
      "Weight stored in kg always; display unit (kg/lbs) is user preference — multiply by 2.205 for lbs",
      "Personal record tracked per exercise: max weight x reps = estimated 1RM (Epley formula)",
      "Workout volume = SUM(sets x reps x weight) shown as total kg lifted",
      "Exercise library seeded with 50 common exercises on first app launch from local JSON"
    ],
    "default_modules": ["auth"]
  }',
  'active'
),

-- 8. Expense / Budget Tracker (Mobile)
(
  'Expense & Budget Tracker (Mobile)',
  'Personal finance app with transaction logging, category budgets, monthly reports, and account balances.',
  'finance',
  array['expense', 'budget', 'finance', 'money', 'spending', 'tracker', 'transaction', 'savings', 'bills', 'income', 'financial'],
  '{
    "file_structure": [
      "app/(tabs)/index.tsx",
      "app/(tabs)/transactions.tsx",
      "app/(tabs)/budgets.tsx",
      "app/(tabs)/reports.tsx",
      "components/TransactionItem.tsx",
      "components/BudgetRing.tsx",
      "components/AddTransactionSheet.tsx",
      "components/MonthlyBarChart.tsx",
      "store/finance.ts"
    ],
    "component_architecture": "4-tab layout: Home (net balance + income vs expense summary + 5 recent transactions + add FAB), Transactions (FlatList with search + category filter, grouped by date), Budgets (grid of BudgetRing components per category showing spent/limit), Reports (monthly bar chart by category, swipe to change month). AddTransactionSheet: bottom sheet with amount keypad, category picker, note input, date picker.",
    "state_pattern": "Transactions fetched from Supabase, cached in Zustand. Monthly aggregates computed client-side with useMemo. Add transaction optimistic: append to local store, then persist to Supabase in background.",
    "db_schema": "accounts(id, user_id, name, balance_cents int, currency char(3)) | transactions(id, account_id, user_id, amount_cents int, category text, note text, date date, type TEXT CHECK type IN income expense) | budget_rules(id, user_id, category text, monthly_limit_cents int)",
    "key_patterns": [
      "All amounts stored as integer cents (e.g. 2999 = $29.99) — no floating point math",
      "Categories are fixed enum: food, transport, shopping, bills, entertainment, health, other",
      "BudgetRing = Animated SVG arc: (spent_cents / limit_cents) ratio, red when over budget",
      "Transactions grouped by date in FlatList using SectionList with date as section header",
      "Monthly report queries last 6 months; bar chart built with react-native-svg"
    ],
    "default_modules": ["auth"]
  }',
  'active'
),

-- 9. Food / Recipe App (Mobile)
(
  'Food & Recipe App (Mobile)',
  'Recipe browser with meal planner, grocery list generation, servings scaler, and personal cookbook.',
  'food',
  array['food', 'recipe', 'cooking', 'meal', 'nutrition', 'grocery', 'ingredients', 'plan', 'cook', 'cookbook', 'chef', 'kitchen'],
  '{
    "file_structure": [
      "app/(tabs)/index.tsx",
      "app/(tabs)/recipes.tsx",
      "app/(tabs)/meal-plan.tsx",
      "app/(tabs)/grocery.tsx",
      "app/recipe/[id].tsx",
      "components/RecipeCard.tsx",
      "components/IngredientList.tsx",
      "components/ServingsScaler.tsx",
      "components/MealPlanDay.tsx",
      "store/meal-plan.ts"
    ],
    "component_architecture": "4-tab layout: Discover (featured + trending recipes in masonry grid), My Recipes (personal cookbook: saved + created), Meal Plan (horizontal week scroll, each day shows breakfast/lunch/dinner slots with add buttons), Grocery (auto-generated checklist from meal plan, grouped by category). Recipe detail: hero image, time/servings header, ServingsScaler stepper, tabbed Instructions / Ingredients / Nutrition.",
    "state_pattern": "Recipes fetched from Supabase. Meal plan week stored in Supabase as plan_json JSONB. Grocery list derived from meal plan ingredients on the fly. ServingsScaler multiplier in local useState.",
    "db_schema": "recipes(id, user_id, title, image_url, prep_min int, cook_min int, servings int, is_public bool, created_at) | recipe_ingredients(id, recipe_id, name, amount numeric, unit text, sort_order int) | meal_plans(id, user_id, week_start date, plan_json jsonb) | grocery_items(id, user_id, ingredient text, amount numeric, unit text, is_checked bool)",
    "key_patterns": [
      "ServingsScaler: multiply all ingredient amounts by (desired / original) ratio, round to 1 decimal",
      "Grocery list merges same ingredients across recipes: 2x onion + 1x onion = 3x onion",
      "Meal plan week_start always Monday; plan_json shape: {mon: {breakfast: recipeId, lunch: recipeId, dinner: recipeId}, ...}",
      "Recipe image picked via expo-image-picker, uploaded to Supabase Storage, URL saved in recipe",
      "Public recipes browsable by all; private recipes visible only to owner (RLS)"
    ],
    "default_modules": ["auth", "file-upload"]
  }',
  'active'
),

-- 10. Social Feed App (Mobile)
(
  'Social Feed App (Mobile)',
  'Photo/text social network with feed, explore, post creation, likes, comments, follows, and real-time notifications.',
  'social',
  array['social', 'feed', 'post', 'like', 'comment', 'follow', 'profile', 'story', 'community', 'network', 'instagram', 'twitter', 'photo'],
  '{
    "file_structure": [
      "app/(tabs)/index.tsx",
      "app/(tabs)/explore.tsx",
      "app/(tabs)/create.tsx",
      "app/(tabs)/notifications.tsx",
      "app/(tabs)/profile.tsx",
      "app/profile/[id].tsx",
      "app/post/[id].tsx",
      "components/PostCard.tsx",
      "components/CommentSheet.tsx",
      "components/StoryRing.tsx",
      "store/feed.ts"
    ],
    "component_architecture": "5-tab layout: Feed (followed users posts + stories row at top), Explore (grid of trending posts, search by hashtag/username), Create (camera/gallery picker → caption + location → post button), Notifications (likes/comments/follows list), Profile (avatar + stats + posts grid). PostCard: avatar + username + image + caption + like/comment/share action row + like count.",
    "state_pattern": "Feed paginated with cursor (last created_at). Optimistic like toggle (local flip, server confirm). Real-time notifications via Supabase Realtime on notifications table. Infinite scroll with FlatList onEndReached.",
    "db_schema": "profiles(id, username text unique, display_name, avatar_url, bio, follower_count int, following_count int) | posts(id, user_id, image_url, caption, like_count int, comment_count int, created_at) | likes(post_id, user_id, primary key(post_id, user_id)) | follows(follower_id, following_id, primary key(follower_id, following_id)) | comments(id, post_id, user_id, text, created_at) | notifications(id, recipient_id, actor_id, type text, post_id, read bool, created_at)",
    "key_patterns": [
      "Feed query: SELECT posts WHERE user_id IN (SELECT following_id FROM follows WHERE follower_id = me) ORDER BY created_at DESC",
      "Like count denormalized on posts.like_count for read performance — increment/decrement via DB function",
      "follower_count and following_count denormalized on profiles — updated by triggers on follows INSERT/DELETE",
      "Image upload via expo-camera or expo-image-picker → resize with expo-image-manipulator → Supabase Storage",
      "Notifications delivered via Supabase Realtime channel subscribed on app mount"
    ],
    "default_modules": ["auth", "file-upload", "notifications"]
  }',
  'active'
);

-- ── New Scaffold Modules ──────────────────────────────────────────────────────

insert into public.scaffold_modules
  (name, module_type, description, tags, scaffold, source, status)
values

-- Stripe Checkout (one-time payments)
(
  'Stripe Checkout',
  'payments',
  'One-time payment via Stripe Checkout Session — product purchase, credit top-up, or pay-per-use.',
  array['stripe', 'checkout', 'payment', 'purchase', 'buy', 'cart', 'one-time'],
  '{
    "files": [
      "app/api/checkout/route.ts",
      "app/api/webhooks/stripe/route.ts",
      "components/CheckoutButton.tsx",
      "lib/stripe/client.ts"
    ],
    "patterns": [
      "POST /api/checkout creates Stripe Checkout Session with success_url and cancel_url",
      "Session metadata carries user_id and item details for webhook reconciliation",
      "Webhook checkout.session.completed updates DB and grants access/credits",
      "Idempotency: check stripe_session_id before inserting to prevent duplicate grants"
    ],
    "imports": ["stripe", "@stripe/stripe-js"],
    "state": "No client state — redirect to Stripe-hosted page via session.url"
  }',
  'handwritten',
  'active'
),

-- Stripe Subscriptions
(
  'Stripe Subscriptions',
  'subscription',
  'Recurring subscription billing with plan selection, Stripe Customer Portal, and webhook lifecycle handling.',
  array['stripe', 'subscription', 'billing', 'plan', 'saas', 'recurring', 'monthly', 'cancel', 'upgrade'],
  '{
    "files": [
      "app/api/subscribe/route.ts",
      "app/api/billing-portal/route.ts",
      "app/api/webhooks/stripe/route.ts",
      "app/(dashboard)/settings/billing/page.tsx",
      "lib/stripe/client.ts"
    ],
    "patterns": [
      "POST /api/subscribe creates Checkout Session in subscription mode with price_id",
      "POST /api/billing-portal creates Stripe Customer Portal session for self-service cancel/upgrade",
      "Webhooks handled: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid",
      "profiles table tracks: plan, subscription_id, subscription_status, plan_period_end",
      "invoice.paid grants monthly credits or feature access; idempotent by billing_period_start"
    ],
    "imports": ["stripe"],
    "state": "Plan state in profiles table — read server-side on every request, never cached client-side"
  }',
  'handwritten',
  'active'
),

-- Resend Transactional Email
(
  'Resend Email',
  'email',
  'Transactional email via Resend — welcome emails, password resets, booking confirmations, notifications.',
  array['email', 'resend', 'transactional', 'notification', 'welcome', 'password-reset', 'confirmation', 'smtp'],
  '{
    "files": [
      "lib/email/client.ts",
      "lib/email/templates/welcome.tsx",
      "lib/email/templates/confirmation.tsx",
      "app/api/send-email/route.ts"
    ],
    "patterns": [
      "Email client initialized with RESEND_API_KEY from env",
      "Templates are React components returning HTML — use @react-email/components for layout",
      "Send from a verified domain address (e.g. hello@yourdomain.com)",
      "Always call from server-side API route — never expose RESEND_API_KEY to client",
      "Log send result (email, template, resend message_id) to a DB table for audit trail"
    ],
    "imports": ["resend", "@react-email/components"],
    "state": "Fire-and-forget from server; no client state needed"
  }',
  'handwritten',
  'active'
),

-- Supabase File Upload
(
  'File Upload',
  'file-upload',
  'File and image upload to Supabase Storage with signed URLs, access control, and progress tracking.',
  array['upload', 'file', 'image', 'storage', 'supabase', 'attachment', 'photo', 'document', 'media'],
  '{
    "files": [
      "lib/storage/upload.ts",
      "components/FileUpload.tsx",
      "components/ImagePicker.tsx",
      "app/api/storage/signed-url/route.ts"
    ],
    "patterns": [
      "Storage bucket created with RLS: users can only read/write their own folder (user_id/filename)",
      "Client uploads directly to Supabase Storage using supabase.storage.from(bucket).upload(path, file)",
      "File path pattern: {bucket}/{user_id}/{uuid}.{ext} to prevent collisions",
      "For private files: generate signed URL server-side via createSignedUrl (never expose service key to client)",
      "For public files: use getPublicUrl — simpler but no access control"
    ],
    "imports": ["@supabase/supabase-js"],
    "state": "Upload progress in useState (0-100). File URL stored in DB after successful upload."
  }',
  'handwritten',
  'active'
),

-- Search + Filters
(
  'Search & Filters',
  'search',
  'Server-side full-text search with debounced input, multi-filter dropdowns, and URL-param-driven state.',
  array['search', 'filter', 'query', 'find', 'lookup', 'sort', 'full-text', 'debounce', 'facets'],
  '{
    "files": [
      "components/SearchInput.tsx",
      "components/FilterBar.tsx",
      "components/SortDropdown.tsx",
      "lib/search/build-query.ts",
      "app/api/search/route.ts"
    ],
    "patterns": [
      "Search input debounced 300ms before writing to URL search params (useSearchParams + router.push)",
      "URL search params are the single source of truth — page is a server component that reads them",
      "Full-text search via Postgres: WHERE to_tsvector(title || description) @@ plainto_tsquery(query)",
      "Filters build WHERE clauses dynamically; empty filter = no WHERE clause added",
      "Pagination via LIMIT + OFFSET; total count returned separately for page count display"
    ],
    "imports": ["use-debounce"],
    "state": "All filter state lives in URL params — shareable, bookmarkable, no useState needed"
  }',
  'handwritten',
  'active'
)
on conflict do nothing;


-- ───────────────────────────────────────────────────────────────────────────
-- 019_scale_indexes.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 019: Scale indexes for hot read paths
-- These speed up the most common queries as project / agent_run / credit history grows.

create index if not exists messages_project_id_created_at_idx
  on public.messages(project_id, created_at);

create index if not exists agent_runs_project_id_idx
  on public.agent_runs(project_id);

create index if not exists agent_runs_user_id_idx
  on public.agent_runs(user_id);

-- agent_runs has no created_at column; started_at serves the same purpose.
create index if not exists agent_runs_status_started_at_desc_idx
  on public.agent_runs(status, started_at desc);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions(user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 020_chat_attachments.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 020: Chat attachments (images, CSVs, PDFs, files)
-- Pairs with the Supabase Storage bucket `chat-attachments` (created via Storage API).

create table if not exists  public.chat_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references public.messages(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  kind         text not null check (kind in ('image','csv','pdf','file')),
  storage_path text not null,
  filename     text not null,
  size_bytes   integer not null,
  mime_type    text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz default now()
);

create index if not exists chat_attachments_message_id_idx on public.chat_attachments(message_id);
create index if not exists chat_attachments_project_id_idx on public.chat_attachments(project_id);

alter table public.chat_attachments enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'users own their attachments'
      and tablename = 'chat_attachments'
  ) then
    create policy "users own their attachments"
  on public.chat_attachments for all
  using (auth.uid() = user_id);
  end if;
end
$policy$;


-- ───────────────────────────────────────────────────────────────────────────
-- 021_safety_violations.sql
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 021: Content safety violation log
-- Service-role only — populated by the chat route when prompts hit the
-- BLOCK_PATTERNS in lib/safety/content-check.ts.

create table if not exists  public.content_safety_violations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  project_id      uuid references public.projects(id) on delete set null,
  prompt_snippet  text not null,
  matched_pattern text not null,
  severity        text not null default 'block' check (severity in ('warn','block')),
  created_at      timestamptz default now()
);

create index if not exists content_safety_violations_user_id_idx
  on public.content_safety_violations(user_id);

alter table public.content_safety_violations enable row level security;
-- No policies — service-role only (admin-readable).


-- ───────────────────────────────────────────────────────────────────────────
-- 022_news_articles.sql
-- ───────────────────────────────────────────────────────────────────────────
-- ──────────────────────────────────────────────────────────────────────────────
-- 022 · news_articles
-- CMS table for the /news marketing page. Admin-managed, public-readable.
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists news_articles (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,
  slug            text        not null unique,
  category        text        not null
                    check (category in ('Community','Talents','FAQs','Updates','Policy')),
  excerpt         text        not null default '',
  cover_gradient  text        not null
                    default 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#a78bfa 100%)',
  is_published    boolean     not null default true,
  published_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- updated_at trigger
create or replace function update_news_articles_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_news_articles_updated_at on news_articles;
create trigger trg_news_articles_updated_at
  before update on news_articles
  for each row execute function update_news_articles_updated_at();

-- RLS
alter table news_articles enable row level security;

-- Anonymous / logged-in users can read published articles
do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'news_public_read'
      and tablename = 'news_articles'
  ) then
    create policy "news_public_read"
  on news_articles for select
  using (is_published = true);
  end if;
end
$policy$;

-- Service-role key (used by admin API) bypasses RLS automatically.
-- No extra policy needed for admin writes.

-- ── Seed existing mock articles ──────────────────────────────────────────────
insert into news_articles
  (title, slug, category, excerpt, cover_gradient, published_at)
values
  (
    'Launching SpringBloom: From Idea to Production in Minutes',
    'launching-springbloom',
    'Updates',
    'Today we''re publicly launching SpringBloom — the AI builder that briefs, builds, reviews, and ships alongside you. Here''s what we built and why.',
    'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#a78bfa 100%)',
    '2026-05-21 10:00:00+00'
  ),
  (
    'Meet Agent SP 1: Your AI Development Partner',
    'meet-agent-sp1',
    'Updates',
    'Agent SP 1 is not a chatbot — it''s a senior developer that briefs, builds, reviews, and ships production-ready code. Learn how it works under the hood.',
    'linear-gradient(135deg,#0c4a6e 0%,#0284c7 50%,#38bdf8 100%)',
    '2026-05-20 10:00:00+00'
  ),
  (
    'Guide for Independent Developers on SpringBloom',
    'guide-for-independent-developers',
    'Talents',
    'Everything a solo developer needs to go from blank canvas to shipped app — scaffolding, auth, payments, and analytics in one platform.',
    'linear-gradient(135deg,#064e3b 0%,#059669 50%,#34d399 100%)',
    '2026-05-19 10:00:00+00'
  ),
  (
    'How to Create Your Agency on SpringBloom',
    'create-your-agency',
    'Community',
    'Agencies can now onboard clients, share live previews, manage credit attribution, and export to GitHub — all from a single SpringBloom workspace.',
    'linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#fb923c 100%)',
    '2026-05-18 10:00:00+00'
  ),
  (
    'SpringBloom Help Center: Top 10 Questions Answered',
    'help-center-top-questions',
    'FAQs',
    'From credit estimates to Supabase RLS policies — the ten questions we get most from builders, answered in plain English.',
    'linear-gradient(135deg,#1e1b4b 0%,#4f46e5 50%,#818cf8 100%)',
    '2026-05-17 10:00:00+00'
  ),
  (
    'Security Scanning: What Gets Checked and When',
    'security-scanning-explained',
    'Updates',
    'A deep dive into how SpringBloom''s security pipeline checks every diff for exposed secrets, missing RLS policies, CORS issues, and unsafe API patterns.',
    'linear-gradient(135deg,#172554 0%,#1d4ed8 50%,#60a5fa 100%)',
    '2026-05-16 10:00:00+00'
  ),
  (
    'Acceptable Use Policy — What''s Allowed on SpringBloom',
    'acceptable-use-policy',
    'Policy',
    'Our acceptable use policy sets clear boundaries for what SpringBloom can be used to build — and what it can''t. Here''s the full breakdown.',
    'linear-gradient(135deg,#3f3f46 0%,#71717a 50%,#d4d4d8 100%)',
    '2026-05-15 10:00:00+00'
  ),
  (
    'Credit Receipts: Full Transparency on Every Generation',
    'credit-receipts-explained',
    'FAQs',
    'Every SpringBloom task shows an estimate before it runs and a receipt after. Learn exactly how credits are calculated and where they go.',
    'linear-gradient(135deg,#4a044e 0%,#a21caf 50%,#e879f9 100%)',
    '2026-05-14 10:00:00+00'
  ),
  (
    'Community Spotlight: Apps Built This Month',
    'community-spotlight-may',
    'Community',
    'A showcase of real apps shipped by the SpringBloom community this month — from SaaS dashboards to booking systems to e-commerce stores.',
    'linear-gradient(135deg,#052e16 0%,#16a34a 50%,#86efac 100%)',
    '2026-05-13 10:00:00+00'
  )
on conflict (slug) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
-- 023_context_summary_and_project_supabase.sql
-- ───────────────────────────────────────────────────────────────────────────
-- ──────────────────────────────────────────────────────────────────────────────
-- 023 · context_summary + per-project Supabase isolation
--
-- Part A: context_summary column on projects
--   Stores the LLM-generated summary of older chat messages so long sessions
--   don't balloon input token costs. Generated lazily by chat/route.ts via
--   Claude Haiku, cached here, invalidated when project files change.
--
-- Part B: project_supabase_instances
--   Tracks the dedicated Supabase project provisioned for each user project.
--   Each user project gets its own isolated Supabase project so their app's
--   DB/auth usage never touches our platform Supabase account.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Part A ────────────────────────────────────────────────────────────────────

alter table projects
  add column if not exists context_summary text default null;

comment on column projects.context_summary is
  'LLM-generated summary of older chat messages. Cached to keep context token costs flat in long sessions. Cleared on significant project changes.';

-- ── Part B ────────────────────────────────────────────────────────────────────

create table if not exists project_supabase_instances (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        not null unique references projects(id) on delete cascade,
  supabase_project_id text        not null,          -- Supabase management API project ref
  supabase_project_ref text       not null,           -- short ref, e.g. "abcdefghij"
  anon_key            text        not null,           -- injected into generated app env vars
  service_role_key    text        not null,           -- stored encrypted; used for migrations
  db_host             text        not null,           -- postgres connection host
  region              text        not null default 'us-east-1',
  status              text        not null default 'provisioning'
                        check (status in ('provisioning','active','paused','deleted')),
  provisioned_at      timestamptz default null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_project_supabase_instances_project_id
  on project_supabase_instances(project_id);

-- RLS: project owners can read their own instance metadata (but not secrets)
alter table project_supabase_instances enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'owner_read_supabase_instance'
      and tablename = 'project_supabase_instances'
  ) then
    create policy "owner_read_supabase_instance"
  on project_supabase_instances for select
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );
  end if;
end
$policy$;

-- Service-role key (admin API) bypasses RLS for writes — no extra policy needed.

-- updated_at trigger
create or replace function update_project_supabase_instances_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_project_supabase_instances_updated_at on project_supabase_instances;
create trigger trg_project_supabase_instances_updated_at
  before update on project_supabase_instances
  for each row execute function update_project_supabase_instances_updated_at();

-- ── Credit scale rebase: update platform_settings if already seeded ───────────
-- Safe upsert — only changes values, preserves any admin customisations.
insert into platform_settings (key, value) values
  ('credits.free_monthly',    '20'),
  ('credits.starter_monthly', '50'),
  ('credits.pro_monthly',     '150'),
  ('credits.teams_monthly',   '500'),
  ('billing.usd_per_credit',  '0.24')
on conflict (key) do update set value = excluded.value;


-- ───────────────────────────────────────────────────────────────────────────
-- 024_uiux_library_clusters.sql
-- ───────────────────────────────────────────────────────────────────────────
-- ──────────────────────────────────────────────────────────────────────────────
-- 024 · UI/UX Library Clusters
--
-- Adds a dedicated "UI/UX" cluster category to the library system.
-- These micro-modules are RAG-retrieved and injected into the generation
-- system prompt so Agent SP v1 produces polished, accessible, consistent UI
-- without fine-tuning — patterns are curated here and updated independently.
--
-- Categories seeded:
--   layout        — page structure patterns (sidebar, header, grid, stack)
--   components    — reusable UI components (cards, forms, tables, modals)
--   motion        — animation / transition recipes (fade, slide, spring)
--   typography    — type scale, hierarchy, responsive sizing
--   color         — dark mode, semantic tokens, gradient recipes
--   accessibility — ARIA patterns, focus management, keyboard nav
--   forms         — validation UX, error states, loading states
--   empty-states  — zero-data screens, skeleton loaders, error pages
-- ──────────────────────────────────────────────────────────────────────────────

-- Ensure the cluster_type column accepts 'uiux' (add to check constraint if it exists)
-- We use a soft approach: just insert — the library table uses text not enum.

-- ── Insert UI/UX cluster ──────────────────────────────────────────────────────

insert into library_clusters
  (name, description, cluster_type, tags, is_active)
values
  (
    'UI/UX Patterns',
    'Curated UI/UX micro-modules: layout patterns, component recipes, motion, typography, color tokens, accessibility, form UX, and empty states. RAG-retrieved and injected into generation prompts to produce polished, consistent UI on first generation.',
    'uiux',
    array['ui','ux','layout','components','motion','typography','color','accessibility','forms','design-system'],
    true
  )
on conflict do nothing;

-- ── Micro-modules ─────────────────────────────────────────────────────────────

with cluster as (
  select id from library_clusters where cluster_type = 'uiux' limit 1
)
insert into library_modules
  (cluster_id, name, description, category, tags, template, is_active)
select
  cluster.id,
  m.name,
  m.description,
  m.category,
  m.tags,
  m.template,
  true
from cluster, (values

  -- ── Layout patterns ────────────────────────────────────────────────────────
  (
    'App Shell Layout',
    'Responsive sidebar + main content shell. Sidebar collapses to icon rail on mobile. Uses CSS grid with named areas.',
    'layout',
    array['layout','sidebar','responsive','shell'],
    $tpl$
/* App Shell — sidebar + main content */
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 1fr;
  min-height: 100vh;
}
@media (max-width: 768px) {
  .app-shell { grid-template-columns: 1fr; }
  .app-shell-sidebar { display: none; }
  .app-shell-sidebar.open { display: flex; position: fixed; inset: 0; z-index: 50; }
}
$tpl$
  ),
  (
    'Dashboard Grid',
    'Responsive stat card grid. 4 cols on desktop, 2 on tablet, 1 on mobile. Equal-height cards.',
    'layout',
    array['layout','grid','dashboard','cards','responsive'],
    $tpl$
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
@media (max-width: 1024px) { .dashboard-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .dashboard-grid { grid-template-columns: 1fr; } }
.stat-card {
  background: var(--card-bg, #18181b);
  border: 1px solid var(--border, rgba(255,255,255,0.08));
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
$tpl$
  ),

  -- ── Components ────────────────────────────────────────────────────────────
  (
    'Data Table Pattern',
    'Accessible data table with sticky header, zebra rows, sortable columns indicator, and responsive scroll.',
    'components',
    array['table','data','accessible','sortable','responsive'],
    $tpl$
/* Accessible data table */
.data-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table thead { position: sticky; top: 0; background: var(--surface-2); z-index: 1; }
.data-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { padding: 0.75rem 1rem; border-top: 1px solid var(--border); }
.data-table tbody tr:hover { background: var(--surface-hover); }
/* Sortable header */
.data-table th[aria-sort] { cursor: pointer; user-select: none; }
.data-table th[aria-sort]:after { content: " ↕"; opacity: 0.4; }
.data-table th[aria-sort="ascending"]:after { content: " ↑"; opacity: 1; }
.data-table th[aria-sort="descending"]:after { content: " ↓"; opacity: 1; }
$tpl$
  ),
  (
    'Modal / Dialog Pattern',
    'Accessible modal using dialog element. Focus trap, scroll lock, backdrop blur, escape-to-close.',
    'components',
    array['modal','dialog','accessible','focus-trap','overlay'],
    $tpl$
/* Use <dialog> element for native focus trap + escape handling */
dialog.modal {
  position: fixed; inset: 0; margin: auto;
  max-width: min(560px, calc(100vw - 2rem));
  max-height: calc(100vh - 4rem);
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  overflow-y: auto;
  padding: 0;
}
dialog.modal::backdrop { background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
dialog.modal[open] { display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
.modal-body   { padding: 1.5rem; flex: 1; overflow-y: auto; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.5rem; }
$tpl$
  ),
  (
    'Command Palette',
    'Keyboard-triggered command palette (⌘K). Fuzzy search over actions/pages. Dark themed.',
    'components',
    array['command','palette','keyboard','search','cmdk'],
    $tpl$
/* Command palette — trigger with ⌘K / Ctrl+K */
.cmd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; }
.cmd-box { width: min(560px, calc(100vw - 2rem)); background: #1a1a1f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.5); }
.cmd-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 1rem 1.25rem; font-size: 1rem; color: #fff; outline: none; }
.cmd-results { max-height: 360px; overflow-y: auto; padding: 0.5rem; }
.cmd-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; color: rgba(255,255,255,0.75); }
.cmd-item[aria-selected="true"], .cmd-item:hover { background: rgba(124,58,237,0.15); color: #fff; }
$tpl$
  ),

  -- ── Motion ────────────────────────────────────────────────────────────────
  (
    'Entrance Animations',
    'Reusable CSS keyframe entrance animations: fade-in, slide-up, scale-in. Respects prefers-reduced-motion.',
    'motion',
    array['animation','motion','entrance','keyframes','accessible'],
    $tpl$
@media (prefers-reduced-motion: no-preference) {
  @keyframes fade-in    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-up   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @keyframes scale-in   { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
  @keyframes slide-right{ from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }

  .animate-fade-in  { animation: fade-in  0.22s ease both; }
  .animate-slide-up { animation: slide-up 0.28s ease both; }
  .animate-scale-in { animation: scale-in 0.22s ease both; }
  .animate-slide-right { animation: slide-right 0.22s ease both; }
}
/* Stagger utility */
.stagger > * { animation-delay: calc(var(--i, 0) * 60ms); }
$tpl$
  ),
  (
    'Skeleton Loader',
    'Shimmer skeleton loader for async content. Matches card, text, and avatar shapes.',
    'motion',
    array['skeleton','loader','shimmer','loading','placeholder'],
    $tpl$
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite ease-in-out;
  border-radius: 6px;
}
.skeleton-text  { height: 0.875rem; width: 100%; margin-bottom: 0.5rem; }
.skeleton-text:last-child { width: 65%; }
.skeleton-title { height: 1.25rem; width: 55%; margin-bottom: 0.75rem; }
.skeleton-avatar{ width: 2.5rem; height: 2.5rem; border-radius: 50%; flex-shrink: 0; }
.skeleton-card  { height: 120px; width: 100%; border-radius: 12px; }
$tpl$
  ),

  -- ── Typography ────────────────────────────────────────────────────────────
  (
    'Fluid Type Scale',
    'Responsive type scale using clamp(). 6 steps from caption to display. No breakpoints needed.',
    'typography',
    array['typography','type-scale','fluid','responsive','clamp'],
    $tpl$
:root {
  --text-xs:  clamp(0.64rem,  0.6rem  + 0.2vw,  0.75rem);
  --text-sm:  clamp(0.75rem,  0.7rem  + 0.25vw, 0.875rem);
  --text-base:clamp(0.875rem, 0.8rem  + 0.35vw, 1rem);
  --text-lg:  clamp(1rem,     0.9rem  + 0.5vw,  1.25rem);
  --text-xl:  clamp(1.125rem, 1rem    + 0.65vw, 1.5rem);
  --text-2xl: clamp(1.25rem,  1.05rem + 1vw,    1.875rem);
  --text-3xl: clamp(1.5rem,   1.1rem  + 2vw,    2.5rem);
  --text-4xl: clamp(2rem,     1.2rem  + 4vw,    3.5rem);
  --text-display: clamp(2.5rem, 1rem + 7vw, 5rem);
  --leading-tight: 1.1;
  --leading-snug:  1.3;
  --leading-normal:1.5;
  --leading-loose: 1.75;
  --tracking-tight:-0.04em;
  --tracking-normal: 0;
  --tracking-wide: 0.06em;
}
$tpl$
  ),

  -- ── Color / Dark mode ─────────────────────────────────────────────────────
  (
    'Semantic Color Tokens',
    'Dark-mode-first semantic color token system. Maps design intent (primary, surface, muted) to actual values. Override in :root for light mode.',
    'color',
    array['color','tokens','dark-mode','semantic','css-variables'],
    $tpl$
:root {
  /* Surfaces */
  --surface:    #0f0f13;
  --surface-2:  #18181d;
  --surface-3:  #222228;
  --surface-hover: rgba(255,255,255,0.04);
  /* Borders */
  --border:     rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.15);
  /* Text */
  --text:       rgba(255,255,255,0.92);
  --text-muted: rgba(255,255,255,0.45);
  --text-faint: rgba(255,255,255,0.22);
  /* Brand */
  --primary:    #7c3aed;
  --primary-hover: #6d28d9;
  --primary-faint: rgba(124,58,237,0.12);
  /* Status */
  --success: #4ade80; --success-bg: rgba(74,222,128,0.08);
  --warning: #fbbf24; --warning-bg: rgba(251,191,36,0.08);
  --danger:  #f87171; --danger-bg:  rgba(248,113,113,0.08);
  --info:    #60a5fa; --info-bg:    rgba(96,165,250,0.08);
}
[data-theme="light"] {
  --surface: #ffffff; --surface-2: #f4f4f5; --surface-3: #e4e4e7;
  --border: rgba(0,0,0,0.08); --border-strong: rgba(0,0,0,0.15);
  --text: rgba(0,0,0,0.9); --text-muted: rgba(0,0,0,0.45); --text-faint: rgba(0,0,0,0.22);
}
$tpl$
  ),

  -- ── Accessibility ─────────────────────────────────────────────────────────
  (
    'Focus Ring System',
    'Consistent focus-visible ring that works on both light and dark surfaces. No focus for mouse, ring for keyboard.',
    'accessibility',
    array['accessibility','focus','keyboard','a11y','outline'],
    $tpl$
/* Keyboard focus rings — hide for mouse, show for keyboard */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--primary, #7c3aed);
  outline-offset: 2px;
  border-radius: 4px;
}
/* High-contrast mode support */
@media (forced-colors: active) {
  :focus-visible { outline: 3px solid ButtonText; }
}
/* Skip-to-main link (screen readers + keyboard) */
.skip-link {
  position: fixed; top: -100%; left: 1rem; z-index: 999;
  background: var(--primary); color: #fff;
  padding: 0.5rem 1rem; border-radius: 0 0 8px 8px;
  font-weight: 600; text-decoration: none;
  transition: top 0.1s;
}
.skip-link:focus-visible { top: 0; }
$tpl$
  ),

  -- ── Forms ─────────────────────────────────────────────────────────────────
  (
    'Form Field States',
    'Complete form field state system: idle, focused, error, success, disabled. Consistent across input/select/textarea.',
    'forms',
    array['forms','input','validation','error','states','UX'],
    $tpl$
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.field-input {
  width: 100%; padding: 0.625rem 0.875rem;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 8px; font-size: 0.875rem; color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.field-input:focus         { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-faint); }
.field-input:disabled      { opacity: 0.45; cursor: not-allowed; }
.field-input[aria-invalid] { border-color: var(--danger); }
.field-input[aria-invalid]:focus { box-shadow: 0 0 0 3px var(--danger-bg); }
.field-hint   { font-size: 0.75rem; color: var(--text-faint); }
.field-error  { font-size: 0.75rem; color: var(--danger); display: flex; align-items: center; gap: 0.25rem; }
.field-success{ font-size: 0.75rem; color: var(--success); }
$tpl$
  ),

  -- ── Empty States ──────────────────────────────────────────────────────────
  (
    'Empty State Pattern',
    'Consistent empty state component: icon, title, description, optional CTA. Used for zero-data screens.',
    'empty-states',
    array['empty-state','zero-data','placeholder','UX','feedback'],
    $tpl$
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 0.75rem;
  padding: 4rem 2rem; text-align: center;
  min-height: 240px;
}
.empty-state-icon {
  width: 3.5rem; height: 3.5rem; border-radius: 12px;
  background: var(--surface-2); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-faint); margin-bottom: 0.5rem;
}
.empty-state-title { font-size: 0.9375rem; font-weight: 600; color: var(--text); }
.empty-state-desc  { font-size: 0.875rem; color: var(--text-muted); max-width: 28rem; line-height: 1.5; }
/* Usage: <div class="empty-state"><div class="empty-state-icon">…</div><p class="empty-state-title">…</p><p class="empty-state-desc">…</p><button>…</button></div> */
$tpl$
  )

) as m(name, description, category, tags, template)
on conflict do nothing;


-- ───────────────────────────────────────────────────────────────────────────
-- 025_tailwind_uiux_modules.sql
-- ───────────────────────────────────────────────────────────────────────────
-- ──────────────────────────────────────────────────────────────────────────────
-- 025 · Tailwind UI/UX Modules
--
-- Adds Tailwind v4 class-composition patterns to the uiux library cluster.
-- These complement the CSS token modules from 024 with ready-to-use Tailwind
-- recipes that Agent SP v1 can copy directly into generated components.
-- ──────────────────────────────────────────────────────────────────────────────

with cluster as (
  select id from library_clusters where cluster_type = 'uiux' limit 1
)
insert into library_modules
  (cluster_id, name, description, category, tags, template, is_active)
select
  cluster.id,
  m.name,
  m.description,
  m.category,
  m.tags,
  m.template,
  true
from cluster, (values

  (
    'Button Variants (Tailwind)',
    'Complete button variant system using Tailwind v4. Primary, secondary, outline, ghost, destructive — with disabled and loading states.',
    'tailwind',
    array['button','tailwind','variant','cta','interactive','disabled','loading'],
    $tpl$
TAILWIND BUTTON VARIANTS — use these class sets directly:

primary:     "bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
secondary:   "bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
outline:     "border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 text-zinc-200 font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
ghost:       "hover:bg-zinc-800/60 text-zinc-400 hover:text-white font-medium rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
destructive: "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
link:        "text-violet-400 hover:text-violet-300 underline-offset-4 hover:underline text-sm font-medium"

loading state: add "relative" + spinner child:
  <span className="absolute inset-0 flex items-center justify-center">
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  </span>

icon + text button: "inline-flex items-center gap-2"
full-width:          add "w-full justify-center"
small:               replace "px-4 py-2" with "px-3 py-1.5"
large:               replace "px-4 py-2 text-sm" with "px-6 py-3 text-base"
$tpl$
  ),

  (
    'Badge & Pill Variants (Tailwind)',
    'Status badges, category pills, count indicators — all Tailwind class sets for inline use.',
    'tailwind',
    array['badge','pill','tag','status','label','tailwind','chip'],
    $tpl$
TAILWIND BADGE VARIANTS:

default:   "inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300"
primary:   "inline-flex items-center rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/30"
success:   "inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25"
warning:   "inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/25"
danger:    "inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/25"
info:      "inline-flex items-center rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-400 ring-1 ring-sky-500/25"

dot badge (live/online indicator):
  <span className="inline-flex items-center gap-1.5 ...">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    Live
  </span>

count bubble: "flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white"
$tpl$
  ),

  (
    'Card Patterns (Tailwind)',
    'Card variants — flat, elevated, interactive hover, and stat cards. Dark-mode ready.',
    'tailwind',
    array['card','panel','container','tailwind','hover','interactive','stat'],
    $tpl$
TAILWIND CARD VARIANTS:

base card:       "rounded-xl border border-zinc-800 bg-zinc-900 p-5"
elevated:        "rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg shadow-black/20"
interactive:     "rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-zinc-600 hover:bg-zinc-800/60 cursor-pointer"
featured/glow:   "rounded-xl border border-violet-500/30 bg-violet-600/5 p-5 ring-1 ring-violet-500/10"

stat card anatomy:
  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Label</p>
    <p className="mt-2 text-3xl font-bold tabular-nums text-white">1,234</p>
    <p className="mt-1 text-xs text-emerald-400">↑ 12% vs last month</p>
  </div>

card header/body/footer pattern:
  header: "border-b border-zinc-800 px-5 py-4 flex items-center justify-between"
  body:   "p-5"
  footer: "border-t border-zinc-800 px-5 py-4 flex items-center justify-end gap-2"
$tpl$
  ),

  (
    'Navigation Patterns (Tailwind)',
    'Sidebar nav items, top nav bar, breadcrumbs — Tailwind class compositions for consistent navigation.',
    'tailwind',
    array['nav','navigation','sidebar','menu','breadcrumb','tabs','tailwind'],
    $tpl$
TAILWIND NAV PATTERNS:

sidebar nav item:
  active:   "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium bg-zinc-800 text-white"
  inactive: "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"

top nav bar:
  "flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sticky top-0 z-40"

nav link (top bar):
  active:   "text-sm font-semibold text-white border-b-2 border-violet-500 pb-0.5"
  inactive: "text-sm font-medium text-zinc-400 hover:text-white transition-colors"

tab bar:
  container: "flex border-b border-zinc-800 gap-1"
  tab active:   "px-4 py-2.5 text-sm font-semibold text-white border-b-2 border-violet-500 -mb-px"
  tab inactive: "px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-200 -mb-px transition-colors"

breadcrumb:
  "flex items-center gap-1.5 text-sm text-zinc-500"
  separator: <ChevronRight size={13} className="text-zinc-700" />
  current:   "text-zinc-200 font-medium"
$tpl$
  ),

  (
    'Alert & Notification (Tailwind)',
    'Alert banners, toast-style notifications, inline validation messages — Tailwind variants.',
    'tailwind',
    array['alert','notification','toast','warning','error','success','info','tailwind','banner'],
    $tpl$
TAILWIND ALERT VARIANTS:

info:    "flex items-start gap-3 rounded-lg border border-sky-500/25 bg-sky-500/8 px-4 py-3 text-sm text-sky-300"
success: "flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300"
warning: "flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-300"
danger:  "flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-300"

icon sizing in alerts: <Icon size={16} className="mt-0.5 shrink-0" />
title line: <p className="font-semibold">...</p>
body line:  <p className="mt-0.5 opacity-80">...</p>

dismissible alert — add:
  <button className="ml-auto -mr-1 rounded p-1 opacity-60 hover:opacity-100 transition-opacity">
    <X size={14} />
  </button>

inline field error: "mt-1 flex items-center gap-1 text-xs text-red-400"
  <AlertCircle size={12} /> <span>Error message here</span>
$tpl$
  ),

  (
    'Responsive Layout Utilities (Tailwind)',
    'Tailwind responsive container patterns, breakpoint-aware grid/flex recipes for common page structures.',
    'tailwind',
    array['responsive','layout','grid','flex','container','breakpoint','tailwind','mobile'],
    $tpl$
TAILWIND RESPONSIVE PATTERNS:

page container: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
narrow (forms/auth): "mx-auto w-full max-w-md px-4"
medium (content): "mx-auto w-full max-w-3xl px-4"

auto-fit card grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
2-col split:   "grid grid-cols-1 gap-6 lg:grid-cols-2"
3-col sidebar: "grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]"
dashboard:     "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"

stack → row on sm: "flex flex-col gap-3 sm:flex-row sm:items-center"
center on all:     "flex min-h-screen items-center justify-center"
space-between:     "flex items-center justify-between gap-4"

hide/show at breakpoints:
  "hidden sm:block"  — show from sm up
  "sm:hidden"        — hide from sm up (mobile only)
  "lg:hidden"        — hide on desktop
$tpl$
  ),

  (
    'Dark Mode Toggle Pattern (Tailwind)',
    'Dark/light theme toggle with next-themes. Class-based dark mode. Tailwind v4 compatible.',
    'tailwind',
    array['dark-mode','dark','light','theme','toggle','next-themes','tailwind','color-scheme'],
    $tpl$
DARK MODE TOGGLE (next-themes + Tailwind):

1. Wrap app in <ThemeProvider attribute="class" defaultTheme="dark"> in layout.tsx

2. Toggle button component:
  "use client"
  import { useTheme } from "next-themes"
  import { Sun, Moon } from "lucide-react"
  export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    return (
      <button
        className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        <Sun size={16} className="hidden dark:block" />
        <Moon size={16} className="dark:hidden" />
      </button>
    )
  }

3. Dark-aware Tailwind classes pattern:
  "bg-white dark:bg-zinc-900"
  "text-zinc-900 dark:text-zinc-100"
  "border-zinc-200 dark:border-zinc-800"
$tpl$
  )

) as m(name, description, category, tags, template)
on conflict do nothing;


-- ───────────────────────────────────────────────────────────────────────────
-- 026_enrich_uiux_tags.sql
-- ───────────────────────────────────────────────────────────────────────────
-- ──────────────────────────────────────────────────────────────────────────────
-- 026 · Enrich UI/UX Module Tags
--
-- Two fixes surfaced by scenario tests:
--
-- 1. Data Table had sparse tags ('table','data','accessible','sortable','responsive')
--    that missed common user intents like "list", "todo", "task", "checklist".
--    Users building list-based apps never matched this module.
--
-- 2. Dark Mode Toggle used hyphenated tag 'dark-mode' which never matched
--    "dark mode" (with space) in user prompts. Added 'dark' and 'light' as
--    separate tags so natural language prompts match correctly.
--
-- Both fixes also bring related modules in line (Semantic Color Tokens, Form
-- Field States, App Shell Layout) with more natural user vocabulary.
-- ──────────────────────────────────────────────────────────────────────────────

-- Data Table → add list, todo, task, checklist, kanban, filter, search, sort
update library_modules
set tags = array[
  'table','list','data','sort','filter','search','pagination',
  'todo','task','checklist','kanban','drag-drop','accessible','sortable','responsive'
]
where name = 'Data Table Pattern'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- App Shell Layout → add 'app', 'scaffold', 'structure', 'navigation' so
-- prompts like "TODO APP" or "checklist APP" surface this module
update library_modules
set tags = array[
  'layout','sidebar','responsive','shell','app','scaffold','structure','navigation'
]
where name = 'App Shell Layout'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Semantic Color Tokens → add 'palette', 'brand', 'theme', 'blue', 'dark'
-- so explicit color mentions ("blue and white") now match
update library_modules
set tags = array[
  'color','tokens','dark-mode','semantic','css-variables',
  'palette','brand','theme','scheme'
]
where name = 'Semantic Color Tokens'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Form Field States → add 'form', 'input', 'field', 'validation' (the
-- original tags used 'forms' with an 's' which never matched "form" prompts)
update library_modules
set tags = array[
  'form','forms','input','field','validation','error','success',
  'disabled','states','UX','signup','login','checkout'
]
where name = 'Form Field States'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Empty State Pattern → add 'empty', 'no-data', 'onboarding' natural vocab
update library_modules
set tags = array[
  'empty','empty-state','zero-data','no-data','placeholder',
  'UX','feedback','onboarding','first-time','null-state'
]
where name = 'Empty State Pattern'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Dark Mode Toggle (migration 025) → fix hyphen issue: add 'dark' and 'light'
-- as separate tags so "dark mode" (space) matches, not just "dark-mode" (hyphen)
update library_modules
set tags = array[
  'dark-mode','dark','light','theme','toggle','next-themes','tailwind','color-scheme'
]
where name = 'Dark Mode Toggle Pattern (Tailwind)'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

