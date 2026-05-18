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
