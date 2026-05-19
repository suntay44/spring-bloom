# Production Migration Runbook — Migrations 007–009

**Open Supabase Dashboard → SQL Editor → run each block in numeric order → run verification query → confirm result before proceeding to next.**

## Scope

Production Supabase has already run migrations **001–006**. This runbook covers the pending migrations **007–009**, which must be applied manually in the order below.

> **Safety:** Every migration uses `IF NOT EXISTS` / `CREATE OR REPLACE` / conditional guards (`cron.unschedule` is a no-op when the job is absent), so each block is **safe to re-run**. Running a block twice will not duplicate columns, functions, or grants.

> **Security:** This is a **manual, dashboard-only** runbook. Do **not** paste any service role key, database password, or connection string anywhere. Use only the Supabase Dashboard SQL Editor while authenticated as a project owner.

---

## Migration 007 — `007_subscription_columns.sql`

**Purpose:** Add subscription tracking columns to `profiles` and ensure RLS is enabled.

```sql
alter table public.profiles
  add column if not exists subscription_id text,
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists plan_period_end timestamptz;

-- Idempotent: ensure RLS is enabled on profiles
alter table public.profiles enable row level security;
```

**Verification query:**

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('subscription_id', 'subscription_status', 'plan_period_end')
order by column_name;
```

**Expected result:** 3 rows —

| column_name |
| --- |
| plan_period_end |
| subscription_id |
| subscription_status |

---

## Migration 008 — `008_publish_columns.sql`

**Purpose:** Add publish/deployment tracking columns to `projects` (Cloudflare Pages publish pipeline).

```sql
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS published_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS cloudflare_deployment_id TEXT,
  ADD COLUMN IF NOT EXISTS cloudflare_project_name TEXT,
  ADD COLUMN IF NOT EXISTS publish_slug TEXT UNIQUE;
```

**Verification query:**

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'projects'
  and column_name in (
    'published_url', 'published_at', 'custom_domain',
    'cloudflare_deployment_id', 'cloudflare_project_name', 'publish_slug'
  )
order by column_name;
```

**Expected result:** 6 rows —

| column_name |
| --- |
| cloudflare_deployment_id |
| cloudflare_project_name |
| custom_domain |
| published_at |
| published_url |
| publish_slug |

---

## Migration 009 — `009_monthly_reset_idempotency.sql`

**Purpose:** Replace the inline pg_cron monthly credit-reset SQL with an idempotent `public.monthly_credit_reset()` function guarded against double-firing in the same calendar month, and re-schedule the cron job to call it.

```sql
-- Make the monthly credit reset idempotent so double-fires don't grant double credits.
-- Replaces the inline pg_cron SQL from 005_monthly_credit_reset.sql with a proper
-- function that guards against re-running in the same calendar month.

-- Step 1: Create (or replace) the function that performs the reset
CREATE OR REPLACE FUNCTION public.monthly_credit_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.credit_transactions (user_id, type, amount, metadata)
  SELECT
    p.id,
    'monthly_reset',
    CASE p.plan
      WHEN 'starter' THEN 100
      WHEN 'pro'     THEN 175
      WHEN 'teams'   THEN 500
      ELSE 0
    END,
    jsonb_build_object('reason', 'monthly_reset', 'month', to_char(now(), 'YYYY-MM'))
  FROM public.profiles p
  WHERE p.plan != 'free'
    -- Idempotency guard: skip if a reset was already issued this calendar month
    AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions ct
      WHERE ct.user_id = p.id
        AND ct.type = 'monthly_reset'
        AND date_trunc('month', ct.created_at) = date_trunc('month', now())
    );
END;
$$;

-- Step 2: Drop the old inline-SQL cron job and replace it with one that calls the function.
-- cron.unschedule is safe to call even if the job doesn't exist (returns false, not an error).
SELECT cron.unschedule('monthly-credit-reset');

SELECT cron.schedule(
  'monthly-credit-reset',
  '0 0 1 * *',
  $$ SELECT public.monthly_credit_reset(); $$
);
```

**Verification query:**

```sql
select
  (select count(*) from pg_proc
     where proname = 'monthly_credit_reset'
       and pronamespace = 'public'::regnamespace) as fn_count,
  (select count(*) from cron.job
     where jobname = 'monthly-credit-reset'
       and schedule = '0 0 1 * *') as cron_count;
```

**Expected result:** 1 row —

| fn_count | cron_count |
| --- | --- |
| 1 | 1 |

---

## Completion checklist

- [ ] 007 applied — `profiles` has 3 new columns
- [ ] 008 applied — `projects` has 6 new columns
- [ ] 009 applied — function + cron job both present

Once all three verification queries return the expected results, production schema is at parity with migrations 001–009.
