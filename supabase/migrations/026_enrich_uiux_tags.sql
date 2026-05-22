-- ──────────────────────────────────────────────────────────────────────────────
-- 026 · Enrich UI/UX Module Tags
--
-- Two fixes surfaced by scenario tests:
--
-- 1. Data Table had sparse tags ('table','data','accessible','sortable','responsive')
--    that missed common user intents like "list", "todo", "task", "checklist".
--    Users building list-based apps never matched this module.
--
-- 2. Dark Mode Toggle used hyphenated tag 'dark-mode' which never matched
--    "dark mode" (with space) in user prompts. Added 'dark' and 'light' as
--    separate tags so natural language prompts match correctly.
--
-- Both fixes also bring related modules in line (Semantic Color Tokens, Form
-- Field States, App Shell Layout) with more natural user vocabulary.
-- ──────────────────────────────────────────────────────────────────────────────

-- Data Table → add list, todo, task, checklist, kanban, filter, search, sort
update library_modules
set tags = array[
  'table','list','data','sort','filter','search','pagination',
  'todo','task','checklist','kanban','drag-drop','accessible','sortable','responsive'
]
where name = 'Data Table Pattern'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- App Shell Layout → add 'app', 'scaffold', 'structure', 'navigation' so
-- prompts like "TODO APP" or "checklist APP" surface this module
update library_modules
set tags = array[
  'layout','sidebar','responsive','shell','app','scaffold','structure','navigation'
]
where name = 'App Shell Layout'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Semantic Color Tokens → add 'palette', 'brand', 'theme', 'blue', 'dark'
-- so explicit color mentions ("blue and white") now match
update library_modules
set tags = array[
  'color','tokens','dark-mode','semantic','css-variables',
  'palette','brand','theme','scheme'
]
where name = 'Semantic Color Tokens'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Form Field States → add 'form', 'input', 'field', 'validation' (the
-- original tags used 'forms' with an 's' which never matched "form" prompts)
update library_modules
set tags = array[
  'form','forms','input','field','validation','error','success',
  'disabled','states','UX','signup','login','checkout'
]
where name = 'Form Field States'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Empty State Pattern → add 'empty', 'no-data', 'onboarding' natural vocab
update library_modules
set tags = array[
  'empty','empty-state','zero-data','no-data','placeholder',
  'UX','feedback','onboarding','first-time','null-state'
]
where name = 'Empty State Pattern'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');

-- Dark Mode Toggle (migration 025) → fix hyphen issue: add 'dark' and 'light'
-- as separate tags so "dark mode" (space) matches, not just "dark-mode" (hyphen)
update library_modules
set tags = array[
  'dark-mode','dark','light','theme','toggle','next-themes','tailwind','color-scheme'
]
where name = 'Dark Mode Toggle Pattern (Tailwind)'
  and exists (select 1 from library_clusters lc where lc.id = library_modules.cluster_id and lc.cluster_type = 'uiux');
