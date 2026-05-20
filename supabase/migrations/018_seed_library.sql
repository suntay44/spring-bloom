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
