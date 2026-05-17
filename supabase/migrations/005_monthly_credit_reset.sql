-- Enable pg_cron extension (only needs to be done once per project)
create extension if not exists pg_cron;

-- Reset credits on the 1st of every month at midnight UTC
-- Uses user_credit_balance view's monthly allocation from plan
select cron.schedule(
  'monthly-credit-reset',
  '0 0 1 * *',
  $$
    insert into public.credit_transactions (user_id, type, amount, metadata)
    select
      p.id,
      'monthly_reset',
      case p.plan
        when 'free'    then 5
        when 'starter' then 100
        when 'pro'     then 175
        when 'teams'   then 500
        else 0
      end,
      '{"reason": "monthly_reset"}'::jsonb
    from public.profiles p
    where p.plan != 'free' or (
      -- Free users only get reset if balance is below 5
      select coalesce(sum(amount), 0)
      from public.credit_transactions
      where user_id = p.id
    ) < 5;
  $$
);
