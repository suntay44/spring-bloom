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
create policy "news_public_read"
  on news_articles for select
  using (is_published = true);

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
