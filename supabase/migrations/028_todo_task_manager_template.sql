-- Migration 028: Add Task Manager / Todo App scaffold template
--
-- "TODO APP" and "CHECKLIST APP" are among the most common first prompts.
-- None of the existing 10 templates scored against those keywords (score = 0).
-- This adds an 11th template specifically for task management / todo / checklist apps.
--
-- Safe to re-run: ON CONFLICT DO NOTHING.

insert into public.scaffold_templates
  (name, description, category, tags, scaffold, status)
values
(
  'Task Manager / Todo App',
  'Full-featured task management app with lists, priorities, due dates, tags, and completion tracking.',
  'productivity',
  array[
    'todo', 'task', 'tasks', 'checklist', 'check', 'list', 'productivity',
    'reminder', 'priority', 'due-date', 'deadline', 'kanban', 'board',
    'project', 'notes', 'planner', 'organizer', 'tracker', 'manager',
    'complete', 'done', 'inbox', 'today', 'upcoming', 'label', 'tag'
  ],
  '{
    "file_structure": [
      "app/(app)/layout.tsx",
      "app/(app)/page.tsx",
      "app/(app)/today/page.tsx",
      "app/(app)/upcoming/page.tsx",
      "app/(app)/list/[id]/page.tsx",
      "components/TaskItem.tsx",
      "components/TaskList.tsx",
      "components/AddTaskBar.tsx",
      "components/TaskDetail.tsx",
      "components/ListSidebar.tsx",
      "lib/tasks.ts"
    ],
    "component_architecture": "Sidebar (collapsible on mobile) with smart lists (Inbox, Today, Upcoming) + user-created lists. Main area: TaskList with sorted TaskItem rows (checkbox, title, due date badge, priority dot, tag pills). Click task → TaskDetail slide-over panel (title edit, description, due date picker, priority selector, sub-tasks checklist). Bottom AddTaskBar always visible: quick-add with natural language parsing (''buy milk tomorrow'' → title + due date).",
    "state_pattern": "Optimistic UI: mark complete immediately in local state, sync to Supabase in background. Revert on error with toast. useState for selected task + panel open. URL param for active list. useEffect to auto-focus AddTaskBar on list change.",
    "db_schema": "lists(id, user_id, name, color text, icon text, sort_order int, is_smart bool, created_at) | tasks(id, user_id, list_id, title, description, is_completed bool, completed_at timestamptz, priority TEXT CHECK priority IN none low medium high urgent, due_date date, sort_order int, created_at, updated_at) | subtasks(id, task_id, title, is_completed bool, sort_order int) | task_tags(task_id, tag text, primary key(task_id, tag))",
    "key_patterns": [
      "Optimistic completion: toggle is_completed locally → update Supabase → revert + toast on failure",
      "Smart lists are views not tables: Today = tasks where due_date = today AND NOT is_completed, Upcoming = due_date > today",
      "Drag-to-reorder tasks via @dnd-kit/sortable, persist sort_order on drop",
      "Priority colors: urgent=red-500, high=orange-400, medium=blue-400, low=zinc-400, none=transparent",
      "Natural language due date parsing: ''tomorrow'', ''next friday'', ''in 3 days'' → parsed client-side before insert",
      "Keyboard shortcut: press space on focused TaskItem to toggle complete, Enter to open detail"
    ],
    "default_modules": ["auth"]
  }',
  'active'
)
on conflict (name) do nothing;
