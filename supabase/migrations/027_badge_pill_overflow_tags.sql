-- Migration 027: Enrich Badge & Pill module with overflow/truncate/pill/ellipsis tags
--
-- Context: multi-turn conversation test discovered that turn 3 "fix the pills text overflow"
-- returns 0 RAG hits because 'overflow', 'truncate', 'pill', and 'ellipsis' were not in
-- the Badge & Pill Variants module tags array. This migration adds them.
--
-- Also adds 'max-w', 'nowrap', 'clamp', 'text-overflow' for completeness since these
-- are the actual Tailwind classes used to fix overflow in pill/badge components.

update public.library_modules
set
  tags = array[
    'badge', 'pill', 'tag', 'status', 'label', 'tailwind', 'chip',
    'overflow', 'truncate', 'ellipsis', 'text-overflow', 'nowrap',
    'max-w', 'clamp', 'long-text', 'pill-overflow', 'badge-overflow'
  ],
  updated_at = now()
where name = 'Badge & Pill Variants (Tailwind)';
