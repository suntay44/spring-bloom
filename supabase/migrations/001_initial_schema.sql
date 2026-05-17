create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free','starter','pro','teams')),
  fly_machine_id text,
  fly_app_name text,
  supabase_project_ref text,
  supabase_project_url text,
  supabase_anon_key text,
  supabase_service_role_key text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "users own their profile"
  on public.profiles for all using (auth.uid() = id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  type text not null check (type in ('fullstack','mobile','landing')),
  framework text not null check (framework in ('nextjs','expo','static')),
  status text default 'draft' check (status in ('draft','building','live','error')),
  backend_mode text default 'managed_supabase'
    check (backend_mode in ('managed_supabase','own_supabase','decide_later')),
  fly_port integer,
  db_schema text,
  deploy_url text,
  github_url text,
  vercel_project_id text,
  design_style text,
  primary_color text,
  dark_mode text default 'light',
  forked_from uuid references public.projects(id),
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.projects enable row level security;
create policy "users own their projects"
  on public.projects for all using (auth.uid() = user_id);

create table public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  initial_prompt text not null,
  answers jsonb not null,
  prd jsonb not null,
  estimated_credits numeric(10,4) not null default 0,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.project_briefs enable row level security;
create policy "users own their project briefs"
  on public.project_briefs for all using (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  model_id text,
  credits_used numeric(10,4) default 0,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "users own their messages"
  on public.messages for all
  using (exists (
    select 1 from public.projects
    where id = messages.project_id and user_id = auth.uid()
  ));

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_brief_id uuid references public.project_briefs(id),
  parent_message_id uuid references public.messages(id),
  status text default 'queued'
    check (status in ('queued','planning','building','reviewing','scanning','completed','failed','cancelled')),
  prompt text not null,
  model_provider text not null default 'anthropic'
    check (model_provider in ('anthropic','openai','google')),
  model_id text not null default 'claude-sonnet-4-5',
  model_label text not null default 'Claude Sonnet 4.5',
  plan jsonb,
  changed_files jsonb default '[]'::jsonb,
  commands jsonb default '[]'::jsonb,
  estimated_credits numeric(10,4) not null default 0,
  held_credits numeric(10,4) not null default 0,
  final_credits numeric(10,4) not null default 0,
  tokens_input int,
  tokens_output int,
  started_at timestamptz default now(),
  finished_at timestamptz
);
alter table public.agent_runs enable row level security;
create policy "users own their agent runs"
  on public.agent_runs for all using (auth.uid() = user_id);

create table public.model_pricing (
  model_id               text primary key,
  display_name           text not null,
  provider               text not null check (provider in ('anthropic','openai','google')),
  credits_per_1m_input   numeric(8,4) not null,
  credits_per_1m_output  numeric(8,4) not null,
  min_plan               text not null check (min_plan in ('free','starter','pro','teams')),
  is_active              boolean default true
);
-- Public read (no auth required to fetch model list)
alter table public.model_pricing enable row level security;
create policy "anyone can read model pricing"
  on public.model_pricing for select using (true);

-- Seed: 1 credit = $0.17 USD
insert into public.model_pricing values
  ('claude-haiku-4-5',    'Claude Haiku 4.5',     'anthropic', 30.3,  151.5, 'free',    true),
  ('claude-sonnet-4-5',   'Claude Sonnet 4.5',    'anthropic', 60.6,  303.0, 'free',    true),
  ('claude-sonnet-4-6',   'Claude Sonnet 4.6',    'anthropic', 60.6,  303.0, 'free',    true),
  ('claude-opus-4-5',     'Claude Opus 4.5',      'anthropic', 90.9,  454.5, 'starter', true),
  ('gpt-4-1-nano',        'GPT-4.1 Nano',         'openai',    22.2,  88.9,  'free',    true),
  ('gpt-5-4-mini',        'GPT-5.4 Mini',         'openai',    25.6,  153.8, 'starter', true),
  ('gpt-5-4-standard',    'GPT-5.4 Standard',     'openai',    51.3,  307.7, 'pro',     true),
  ('gpt-5-5',             'GPT-5.5',              'openai',    76.9,  461.5, 'teams',   true),
  ('o3',                  'o3',                   'openai',    74.1,  296.3, 'pro',     true),
  ('gemini-2-5-flash',    'Gemini 2.5 Flash',     'google',    11.3,  94.4,  'free',    true),
  ('gemini-2-5-pro',      'Gemini 2.5 Pro',       'google',    39.2,  313.7, 'starter', true);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id),
  agent_run_id uuid references public.agent_runs(id),
  run_id uuid,
  type text not null
    check (type in ('purchase','hold','deduct','refund','bonus','expire','monthly_reset')),
  amount numeric(10,4) not null,
  model_id text,
  tokens_input int,
  tokens_output int,
  price_paid_usd numeric(8,2),
  stripe_session_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.credit_transactions enable row level security;
create policy "users own their transactions"
  on public.credit_transactions for all using (auth.uid() = user_id);

create view public.user_credit_balance as
  select user_id, sum(amount) as balance
  from public.credit_transactions
  group by user_id;

create table public.review_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  score integer check (score between 0 and 100),
  status text default 'pending'
    check (status in ('pending','passed','passed_with_risks','failed')),
  summary text,
  credits_used numeric(10,4) default 0,
  created_at timestamptz default now()
);
alter table public.review_runs enable row level security;
create policy "users own their review runs"
  on public.review_runs for all
  using (exists (select 1 from public.projects where id = review_runs.project_id and user_id = auth.uid()));

create table public.review_findings (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid references public.review_runs(id) on delete cascade not null,
  severity text not null check (severity in ('blocker','risk','suggestion','passed')),
  category text not null,
  file_path text,
  line_number integer,
  title text not null,
  details text,
  status text default 'open' check (status in ('open','fixed','accepted','dismissed')),
  created_at timestamptz default now()
);
alter table public.review_findings enable row level security;
create policy "users own their review findings"
  on public.review_findings for all
  using (exists (
    select 1 from public.review_runs rr
    join public.projects p on p.id = rr.project_id
    where rr.id = review_findings.review_run_id and p.user_id = auth.uid()
  ));

create table public.security_scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  status text default 'pending'
    check (status in ('pending','clean','needs_attention','blocked','failed')),
  scanner_version text,
  credits_used numeric(10,4) default 0,
  created_at timestamptz default now()
);
alter table public.security_scans enable row level security;
create policy "users own their security scans"
  on public.security_scans for all
  using (exists (select 1 from public.projects where id = security_scans.project_id and user_id = auth.uid()));

create table public.security_findings (
  id uuid primary key default gen_random_uuid(),
  security_scan_id uuid references public.security_scans(id) on delete cascade not null,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  category text not null,
  file_path text,
  line_number integer,
  title text not null,
  details text,
  fix_prompt text,
  status text default 'open' check (status in ('open','fixed','accepted_risk','dismissed')),
  created_at timestamptz default now()
);
alter table public.security_findings enable row level security;
create policy "users own their security findings"
  on public.security_findings for all
  using (exists (
    select 1 from public.security_scans ss
    join public.projects p on p.id = ss.project_id
    where ss.id = security_findings.security_scan_id and p.user_id = auth.uid()
  ));

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  source text not null check (source in ('platform','generated_app')),
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  session_id text,
  created_at timestamptz default now()
);
alter table public.analytics_events enable row level security;
create policy "users own their analytics events"
  on public.analytics_events for all
  using (
    auth.uid() = user_id or
    exists (select 1 from public.projects where id = analytics_events.project_id and user_id = auth.uid())
  );

create table public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  file_tree jsonb not null,
  taken_at timestamptz default now()
);
alter table public.project_snapshots enable row level security;
create policy "users own their snapshots"
  on public.project_snapshots for all
  using (exists (select 1 from public.projects where id = project_snapshots.project_id and user_id = auth.uid()));

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  -- Give new users 5 free credits
  insert into public.credit_transactions (user_id, type, amount, metadata)
  values (new.id, 'bonus', 5, '{"reason": "signup_bonus"}'::jsonb);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
