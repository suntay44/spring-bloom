-- Atomic credit hold to prevent concurrent overdraft.
--
-- Previously app/api/chat/route.ts checked the balance with getBalance() and
-- THEN inserted a hold via holdCredits() in two separate round-trips. Two
-- concurrent requests for the same user could both pass the balance check and
-- both place holds, overdrawing the account.
--
-- This function does the balance check and the hold insert atomically inside a
-- single transaction, serialized per-user with a transaction-scoped advisory
-- lock (auto-released at COMMIT/ROLLBACK).

CREATE OR REPLACE FUNCTION public.place_credit_hold(
  p_user_id uuid,
  p_amount numeric,
  p_agent_run_id uuid,
  p_project_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_hold_id uuid;
BEGIN
  -- Serialize concurrent holds for the same user. The lock is keyed on the
  -- user id and auto-releases at transaction end, so two concurrent calls for
  -- the same user run their balance-check + insert strictly one after another.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Authoritative balance computed INSIDE the locked transaction.
  SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM public.credit_transactions
   WHERE user_id = p_user_id;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: balance % is less than requested hold %',
      v_balance, p_amount;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id,
    agent_run_id,
    project_id,
    type,
    amount
  ) VALUES (
    p_user_id,
    p_agent_run_id,
    p_project_id,
    'hold',
    -p_amount  -- negative = reservation
  )
  RETURNING id INTO v_hold_id;

  RETURN v_hold_id;
END;
$$;
