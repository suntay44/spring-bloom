-- Ensure Stripe webhook retries don't create duplicate credit grants.
-- The webhook handler relies on error code 23505 (unique_violation) for idempotency.
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_stripe_session_id_unique
  UNIQUE (stripe_session_id);
