-- ──────────────────────────────────────────────────────────────────────────────
-- 025 · Tailwind UI/UX Modules
--
-- Adds Tailwind v4 class-composition patterns to the uiux library cluster.
-- These complement the CSS token modules from 024 with ready-to-use Tailwind
-- recipes that Agent SP v1 can copy directly into generated components.
-- ──────────────────────────────────────────────────────────────────────────────

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

  (
    'Button Variants (Tailwind)',
    'Complete button variant system using Tailwind v4. Primary, secondary, outline, ghost, destructive — with disabled and loading states.',
    'tailwind',
    array['button','tailwind','variant','cta','interactive','disabled','loading'],
    $tpl$
TAILWIND BUTTON VARIANTS — use these class sets directly:

primary:     "bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
secondary:   "bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
outline:     "border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 text-zinc-200 font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
ghost:       "hover:bg-zinc-800/60 text-zinc-400 hover:text-white font-medium rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
destructive: "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
link:        "text-violet-400 hover:text-violet-300 underline-offset-4 hover:underline text-sm font-medium"

loading state: add "relative" + spinner child:
  <span className="absolute inset-0 flex items-center justify-center">
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  </span>

icon + text button: "inline-flex items-center gap-2"
full-width:          add "w-full justify-center"
small:               replace "px-4 py-2" with "px-3 py-1.5"
large:               replace "px-4 py-2 text-sm" with "px-6 py-3 text-base"
$tpl$
  ),

  (
    'Badge & Pill Variants (Tailwind)',
    'Status badges, category pills, count indicators — all Tailwind class sets for inline use.',
    'tailwind',
    array['badge','pill','tag','status','label','tailwind','chip'],
    $tpl$
TAILWIND BADGE VARIANTS:

default:   "inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300"
primary:   "inline-flex items-center rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/30"
success:   "inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25"
warning:   "inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/25"
danger:    "inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/25"
info:      "inline-flex items-center rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-400 ring-1 ring-sky-500/25"

dot badge (live/online indicator):
  <span className="inline-flex items-center gap-1.5 ...">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    Live
  </span>

count bubble: "flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white"
$tpl$
  ),

  (
    'Card Patterns (Tailwind)',
    'Card variants — flat, elevated, interactive hover, and stat cards. Dark-mode ready.',
    'tailwind',
    array['card','panel','container','tailwind','hover','interactive','stat'],
    $tpl$
TAILWIND CARD VARIANTS:

base card:       "rounded-xl border border-zinc-800 bg-zinc-900 p-5"
elevated:        "rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg shadow-black/20"
interactive:     "rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-zinc-600 hover:bg-zinc-800/60 cursor-pointer"
featured/glow:   "rounded-xl border border-violet-500/30 bg-violet-600/5 p-5 ring-1 ring-violet-500/10"

stat card anatomy:
  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Label</p>
    <p className="mt-2 text-3xl font-bold tabular-nums text-white">1,234</p>
    <p className="mt-1 text-xs text-emerald-400">↑ 12% vs last month</p>
  </div>

card header/body/footer pattern:
  header: "border-b border-zinc-800 px-5 py-4 flex items-center justify-between"
  body:   "p-5"
  footer: "border-t border-zinc-800 px-5 py-4 flex items-center justify-end gap-2"
$tpl$
  ),

  (
    'Navigation Patterns (Tailwind)',
    'Sidebar nav items, top nav bar, breadcrumbs — Tailwind class compositions for consistent navigation.',
    'tailwind',
    array['nav','navigation','sidebar','menu','breadcrumb','tabs','tailwind'],
    $tpl$
TAILWIND NAV PATTERNS:

sidebar nav item:
  active:   "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium bg-zinc-800 text-white"
  inactive: "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"

top nav bar:
  "flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sticky top-0 z-40"

nav link (top bar):
  active:   "text-sm font-semibold text-white border-b-2 border-violet-500 pb-0.5"
  inactive: "text-sm font-medium text-zinc-400 hover:text-white transition-colors"

tab bar:
  container: "flex border-b border-zinc-800 gap-1"
  tab active:   "px-4 py-2.5 text-sm font-semibold text-white border-b-2 border-violet-500 -mb-px"
  tab inactive: "px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-200 -mb-px transition-colors"

breadcrumb:
  "flex items-center gap-1.5 text-sm text-zinc-500"
  separator: <ChevronRight size={13} className="text-zinc-700" />
  current:   "text-zinc-200 font-medium"
$tpl$
  ),

  (
    'Alert & Notification (Tailwind)',
    'Alert banners, toast-style notifications, inline validation messages — Tailwind variants.',
    'tailwind',
    array['alert','notification','toast','warning','error','success','info','tailwind','banner'],
    $tpl$
TAILWIND ALERT VARIANTS:

info:    "flex items-start gap-3 rounded-lg border border-sky-500/25 bg-sky-500/8 px-4 py-3 text-sm text-sky-300"
success: "flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300"
warning: "flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-300"
danger:  "flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-300"

icon sizing in alerts: <Icon size={16} className="mt-0.5 shrink-0" />
title line: <p className="font-semibold">...</p>
body line:  <p className="mt-0.5 opacity-80">...</p>

dismissible alert — add:
  <button className="ml-auto -mr-1 rounded p-1 opacity-60 hover:opacity-100 transition-opacity">
    <X size={14} />
  </button>

inline field error: "mt-1 flex items-center gap-1 text-xs text-red-400"
  <AlertCircle size={12} /> <span>Error message here</span>
$tpl$
  ),

  (
    'Responsive Layout Utilities (Tailwind)',
    'Tailwind responsive container patterns, breakpoint-aware grid/flex recipes for common page structures.',
    'tailwind',
    array['responsive','layout','grid','flex','container','breakpoint','tailwind','mobile'],
    $tpl$
TAILWIND RESPONSIVE PATTERNS:

page container: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
narrow (forms/auth): "mx-auto w-full max-w-md px-4"
medium (content): "mx-auto w-full max-w-3xl px-4"

auto-fit card grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
2-col split:   "grid grid-cols-1 gap-6 lg:grid-cols-2"
3-col sidebar: "grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]"
dashboard:     "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"

stack → row on sm: "flex flex-col gap-3 sm:flex-row sm:items-center"
center on all:     "flex min-h-screen items-center justify-center"
space-between:     "flex items-center justify-between gap-4"

hide/show at breakpoints:
  "hidden sm:block"  — show from sm up
  "sm:hidden"        — hide from sm up (mobile only)
  "lg:hidden"        — hide on desktop
$tpl$
  ),

  (
    'Dark Mode Toggle Pattern (Tailwind)',
    'Dark/light theme toggle with next-themes. Class-based dark mode. Tailwind v4 compatible.',
    'tailwind',
    array['dark-mode','theme','toggle','next-themes','tailwind','light','color-scheme'],
    $tpl$
DARK MODE TOGGLE (next-themes + Tailwind):

1. Wrap app in <ThemeProvider attribute="class" defaultTheme="dark"> in layout.tsx

2. Toggle button component:
  "use client"
  import { useTheme } from "next-themes"
  import { Sun, Moon } from "lucide-react"
  export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    return (
      <button
        className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        <Sun size={16} className="hidden dark:block" />
        <Moon size={16} className="dark:hidden" />
      </button>
    )
  }

3. Dark-aware Tailwind classes pattern:
  "bg-white dark:bg-zinc-900"
  "text-zinc-900 dark:text-zinc-100"
  "border-zinc-200 dark:border-zinc-800"
$tpl$
  )

) as m(name, description, category, tags, template)
on conflict do nothing;
