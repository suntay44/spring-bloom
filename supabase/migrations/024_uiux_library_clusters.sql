-- ──────────────────────────────────────────────────────────────────────────────
-- 024 · UI/UX Library Clusters
--
-- Adds a dedicated "UI/UX" cluster category to the library system.
-- These micro-modules are RAG-retrieved and injected into the generation
-- system prompt so Agent SP v1 produces polished, accessible, consistent UI
-- without fine-tuning — patterns are curated here and updated independently.
--
-- Categories seeded:
--   layout        — page structure patterns (sidebar, header, grid, stack)
--   components    — reusable UI components (cards, forms, tables, modals)
--   motion        — animation / transition recipes (fade, slide, spring)
--   typography    — type scale, hierarchy, responsive sizing
--   color         — dark mode, semantic tokens, gradient recipes
--   accessibility — ARIA patterns, focus management, keyboard nav
--   forms         — validation UX, error states, loading states
--   empty-states  — zero-data screens, skeleton loaders, error pages
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Create tables if they don't exist yet ────────────────────────────────────

create table if not exists public.library_clusters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  cluster_type text not null,
  tags         text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.library_clusters enable row level security;

create table if not exists public.library_modules (
  id           uuid primary key default gen_random_uuid(),
  cluster_id   uuid references public.library_clusters(id) on delete cascade,
  name         text not null,
  description  text,
  category     text not null,
  tags         text[] not null default '{}',
  template     text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.library_modules enable row level security;

create index if not exists library_modules_cluster_id_idx on public.library_modules(cluster_id);
create index if not exists library_modules_category_idx   on public.library_modules(category);
create index if not exists library_modules_is_active_idx  on public.library_modules(is_active);

-- ── Insert UI/UX cluster ──────────────────────────────────────────────────────

insert into library_clusters
  (name, description, cluster_type, tags, is_active)
values
  (
    'UI/UX Patterns',
    'Curated UI/UX micro-modules: layout patterns, component recipes, motion, typography, color tokens, accessibility, form UX, and empty states. RAG-retrieved and injected into generation prompts to produce polished, consistent UI on first generation.',
    'uiux',
    array['ui','ux','layout','components','motion','typography','color','accessibility','forms','design-system'],
    true
  )
on conflict do nothing;

-- ── Micro-modules ─────────────────────────────────────────────────────────────

with cluster as (
  select id from library_clusters where cluster_type = 'uiux' limit 1
)
insert into library_modules
  (cluster_id, name, description, category, tags, template, is_active)
select
  cluster.id,
  m.name,
  m.description,
  m.category,
  m.tags,
  m.template,
  true
from cluster, (values

  -- ── Layout patterns ────────────────────────────────────────────────────────
  (
    'App Shell Layout',
    'Responsive sidebar + main content shell. Sidebar collapses to icon rail on mobile. Uses CSS grid with named areas.',
    'layout',
    array['layout','sidebar','responsive','shell'],
    $tpl$
/* App Shell — sidebar + main content */
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 1fr;
  min-height: 100vh;
}
@media (max-width: 768px) {
  .app-shell { grid-template-columns: 1fr; }
  .app-shell-sidebar { display: none; }
  .app-shell-sidebar.open { display: flex; position: fixed; inset: 0; z-index: 50; }
}
$tpl$
  ),
  (
    'Dashboard Grid',
    'Responsive stat card grid. 4 cols on desktop, 2 on tablet, 1 on mobile. Equal-height cards.',
    'layout',
    array['layout','grid','dashboard','cards','responsive'],
    $tpl$
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
@media (max-width: 1024px) { .dashboard-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .dashboard-grid { grid-template-columns: 1fr; } }
.stat-card {
  background: var(--card-bg, #18181b);
  border: 1px solid var(--border, rgba(255,255,255,0.08));
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
$tpl$
  ),

  -- ── Components ────────────────────────────────────────────────────────────
  (
    'Data Table Pattern',
    'Accessible data table with sticky header, zebra rows, sortable columns indicator, and responsive scroll.',
    'components',
    array['table','data','accessible','sortable','responsive'],
    $tpl$
/* Accessible data table */
.data-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table thead { position: sticky; top: 0; background: var(--surface-2); z-index: 1; }
.data-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { padding: 0.75rem 1rem; border-top: 1px solid var(--border); }
.data-table tbody tr:hover { background: var(--surface-hover); }
/* Sortable header */
.data-table th[aria-sort] { cursor: pointer; user-select: none; }
.data-table th[aria-sort]:after { content: " ↕"; opacity: 0.4; }
.data-table th[aria-sort="ascending"]:after { content: " ↑"; opacity: 1; }
.data-table th[aria-sort="descending"]:after { content: " ↓"; opacity: 1; }
$tpl$
  ),
  (
    'Modal / Dialog Pattern',
    'Accessible modal using dialog element. Focus trap, scroll lock, backdrop blur, escape-to-close.',
    'components',
    array['modal','dialog','accessible','focus-trap','overlay'],
    $tpl$
/* Use <dialog> element for native focus trap + escape handling */
dialog.modal {
  position: fixed; inset: 0; margin: auto;
  max-width: min(560px, calc(100vw - 2rem));
  max-height: calc(100vh - 4rem);
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  overflow-y: auto;
  padding: 0;
}
dialog.modal::backdrop { background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
dialog.modal[open] { display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
.modal-body   { padding: 1.5rem; flex: 1; overflow-y: auto; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.5rem; }
$tpl$
  ),
  (
    'Command Palette',
    'Keyboard-triggered command palette (⌘K). Fuzzy search over actions/pages. Dark themed.',
    'components',
    array['command','palette','keyboard','search','cmdk'],
    $tpl$
/* Command palette — trigger with ⌘K / Ctrl+K */
.cmd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; }
.cmd-box { width: min(560px, calc(100vw - 2rem)); background: #1a1a1f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.5); }
.cmd-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 1rem 1.25rem; font-size: 1rem; color: #fff; outline: none; }
.cmd-results { max-height: 360px; overflow-y: auto; padding: 0.5rem; }
.cmd-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; color: rgba(255,255,255,0.75); }
.cmd-item[aria-selected="true"], .cmd-item:hover { background: rgba(124,58,237,0.15); color: #fff; }
$tpl$
  ),

  -- ── Motion ────────────────────────────────────────────────────────────────
  (
    'Entrance Animations',
    'Reusable CSS keyframe entrance animations: fade-in, slide-up, scale-in. Respects prefers-reduced-motion.',
    'motion',
    array['animation','motion','entrance','keyframes','accessible'],
    $tpl$
@media (prefers-reduced-motion: no-preference) {
  @keyframes fade-in    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-up   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @keyframes scale-in   { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
  @keyframes slide-right{ from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }

  .animate-fade-in  { animation: fade-in  0.22s ease both; }
  .animate-slide-up { animation: slide-up 0.28s ease both; }
  .animate-scale-in { animation: scale-in 0.22s ease both; }
  .animate-slide-right { animation: slide-right 0.22s ease both; }
}
/* Stagger utility */
.stagger > * { animation-delay: calc(var(--i, 0) * 60ms); }
$tpl$
  ),
  (
    'Skeleton Loader',
    'Shimmer skeleton loader for async content. Matches card, text, and avatar shapes.',
    'motion',
    array['skeleton','loader','shimmer','loading','placeholder'],
    $tpl$
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite ease-in-out;
  border-radius: 6px;
}
.skeleton-text  { height: 0.875rem; width: 100%; margin-bottom: 0.5rem; }
.skeleton-text:last-child { width: 65%; }
.skeleton-title { height: 1.25rem; width: 55%; margin-bottom: 0.75rem; }
.skeleton-avatar{ width: 2.5rem; height: 2.5rem; border-radius: 50%; flex-shrink: 0; }
.skeleton-card  { height: 120px; width: 100%; border-radius: 12px; }
$tpl$
  ),

  -- ── Typography ────────────────────────────────────────────────────────────
  (
    'Fluid Type Scale',
    'Responsive type scale using clamp(). 6 steps from caption to display. No breakpoints needed.',
    'typography',
    array['typography','type-scale','fluid','responsive','clamp'],
    $tpl$
:root {
  --text-xs:  clamp(0.64rem,  0.6rem  + 0.2vw,  0.75rem);
  --text-sm:  clamp(0.75rem,  0.7rem  + 0.25vw, 0.875rem);
  --text-base:clamp(0.875rem, 0.8rem  + 0.35vw, 1rem);
  --text-lg:  clamp(1rem,     0.9rem  + 0.5vw,  1.25rem);
  --text-xl:  clamp(1.125rem, 1rem    + 0.65vw, 1.5rem);
  --text-2xl: clamp(1.25rem,  1.05rem + 1vw,    1.875rem);
  --text-3xl: clamp(1.5rem,   1.1rem  + 2vw,    2.5rem);
  --text-4xl: clamp(2rem,     1.2rem  + 4vw,    3.5rem);
  --text-display: clamp(2.5rem, 1rem + 7vw, 5rem);
  --leading-tight: 1.1;
  --leading-snug:  1.3;
  --leading-normal:1.5;
  --leading-loose: 1.75;
  --tracking-tight:-0.04em;
  --tracking-normal: 0;
  --tracking-wide: 0.06em;
}
$tpl$
  ),

  -- ── Color / Dark mode ─────────────────────────────────────────────────────
  (
    'Semantic Color Tokens',
    'Dark-mode-first semantic color token system. Maps design intent (primary, surface, muted) to actual values. Override in :root for light mode.',
    'color',
    array['color','tokens','dark-mode','semantic','css-variables'],
    $tpl$
:root {
  /* Surfaces */
  --surface:    #0f0f13;
  --surface-2:  #18181d;
  --surface-3:  #222228;
  --surface-hover: rgba(255,255,255,0.04);
  /* Borders */
  --border:     rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.15);
  /* Text */
  --text:       rgba(255,255,255,0.92);
  --text-muted: rgba(255,255,255,0.45);
  --text-faint: rgba(255,255,255,0.22);
  /* Brand */
  --primary:    #7c3aed;
  --primary-hover: #6d28d9;
  --primary-faint: rgba(124,58,237,0.12);
  /* Status */
  --success: #4ade80; --success-bg: rgba(74,222,128,0.08);
  --warning: #fbbf24; --warning-bg: rgba(251,191,36,0.08);
  --danger:  #f87171; --danger-bg:  rgba(248,113,113,0.08);
  --info:    #60a5fa; --info-bg:    rgba(96,165,250,0.08);
}
[data-theme="light"] {
  --surface: #ffffff; --surface-2: #f4f4f5; --surface-3: #e4e4e7;
  --border: rgba(0,0,0,0.08); --border-strong: rgba(0,0,0,0.15);
  --text: rgba(0,0,0,0.9); --text-muted: rgba(0,0,0,0.45); --text-faint: rgba(0,0,0,0.22);
}
$tpl$
  ),

  -- ── Accessibility ─────────────────────────────────────────────────────────
  (
    'Focus Ring System',
    'Consistent focus-visible ring that works on both light and dark surfaces. No focus for mouse, ring for keyboard.',
    'accessibility',
    array['accessibility','focus','keyboard','a11y','outline'],
    $tpl$
/* Keyboard focus rings — hide for mouse, show for keyboard */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--primary, #7c3aed);
  outline-offset: 2px;
  border-radius: 4px;
}
/* High-contrast mode support */
@media (forced-colors: active) {
  :focus-visible { outline: 3px solid ButtonText; }
}
/* Skip-to-main link (screen readers + keyboard) */
.skip-link {
  position: fixed; top: -100%; left: 1rem; z-index: 999;
  background: var(--primary); color: #fff;
  padding: 0.5rem 1rem; border-radius: 0 0 8px 8px;
  font-weight: 600; text-decoration: none;
  transition: top 0.1s;
}
.skip-link:focus-visible { top: 0; }
$tpl$
  ),

  -- ── Forms ─────────────────────────────────────────────────────────────────
  (
    'Form Field States',
    'Complete form field state system: idle, focused, error, success, disabled. Consistent across input/select/textarea.',
    'forms',
    array['forms','input','validation','error','states','UX'],
    $tpl$
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.field-input {
  width: 100%; padding: 0.625rem 0.875rem;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 8px; font-size: 0.875rem; color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.field-input:focus         { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-faint); }
.field-input:disabled      { opacity: 0.45; cursor: not-allowed; }
.field-input[aria-invalid] { border-color: var(--danger); }
.field-input[aria-invalid]:focus { box-shadow: 0 0 0 3px var(--danger-bg); }
.field-hint   { font-size: 0.75rem; color: var(--text-faint); }
.field-error  { font-size: 0.75rem; color: var(--danger); display: flex; align-items: center; gap: 0.25rem; }
.field-success{ font-size: 0.75rem; color: var(--success); }
$tpl$
  ),

  -- ── Empty States ──────────────────────────────────────────────────────────
  (
    'Empty State Pattern',
    'Consistent empty state component: icon, title, description, optional CTA. Used for zero-data screens.',
    'empty-states',
    array['empty-state','zero-data','placeholder','UX','feedback'],
    $tpl$
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 0.75rem;
  padding: 4rem 2rem; text-align: center;
  min-height: 240px;
}
.empty-state-icon {
  width: 3.5rem; height: 3.5rem; border-radius: 12px;
  background: var(--surface-2); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-faint); margin-bottom: 0.5rem;
}
.empty-state-title { font-size: 0.9375rem; font-weight: 600; color: var(--text); }
.empty-state-desc  { font-size: 0.875rem; color: var(--text-muted); max-width: 28rem; line-height: 1.5; }
/* Usage: <div class="empty-state"><div class="empty-state-icon">…</div><p class="empty-state-title">…</p><p class="empty-state-desc">…</p><button>…</button></div> */
$tpl$
  )

) as m(name, description, category, tags, template)
on conflict do nothing;
