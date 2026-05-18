ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS published_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS cloudflare_deployment_id TEXT,
  ADD COLUMN IF NOT EXISTS cloudflare_project_name TEXT,
  ADD COLUMN IF NOT EXISTS publish_slug TEXT UNIQUE;
