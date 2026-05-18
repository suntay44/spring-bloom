-- 012_credit_type_plan_reset.sql
-- Fixes P1-6: app/api/webhooks/stripe/route.ts inserts credit_transactions rows
-- with type='plan_reset' on invoice.paid, but the original CHECK constraint from
-- 001_initial_schema.sql only allowed
-- ('purchase','hold','deduct','refund','bonus','expire','monthly_reset').
-- Every subscription renewal credit grant therefore failed the CHECK.
--
-- The webhook intent ('plan_reset') is correct; the schema is what is wrong.
-- The constraint was auto-named by Postgres as credit_transactions_type_check.

alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in (
    'purchase','hold','deduct','refund','bonus','expire','monthly_reset','plan_reset'
  ));
