-- Migration 043: free signup credit grant setting
--
-- R6-1: the user-created webhook grants this many credits as a one-time
-- 'bonus' transaction on signup. Adjust the value any time to change your
-- customer-acquisition spend without a deploy.

insert into public.platform_settings (key, value)
values ('free_signup_credits', '20')
on conflict (key) do nothing;

comment on table public.platform_settings is
  'Internal key/value config. free_signup_credits controls the one-time signup grant (R6-1).';
