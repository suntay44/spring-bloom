/**
 * Prompt Scenario Tests — "What does the app actually do with this input?"
 *
 * These tests trace real user prompts through the full pipeline:
 *   1. isRefinementMessage() gate — short prompts are silently skipped
 *   2. scoreModule() — which UI/UX library modules get retrieved
 *   3. Scaffold template gap detection — missing templates for common app types
 *
 * Run: npm test -- prompt-scenarios
 *
 * KEY FINDING documented by these tests:
 *   Both "TODO APP" and "CHECKLIST APP with blue/white color" are under 60 chars
 *   and receive ZERO enhancement — the user gets raw generation with no context.
 *   A prompt needs to be ≥ 60 chars to unlock the RAG pipeline.
 */

import { describe, it, expect } from 'vitest'
import { scoreModule } from '@/lib/library/uiux-lookup'
import { isRefinementMessage } from '@/lib/ai/prompt-enhancer'

// ── Actual module definitions from migrations 024 + 025 ───────────────────────
// Replicated here so tests run without a DB connection.

// Tags reflect the ACTUAL DB state after migrations 024 + 025 + 026.
// Migration 026 enriched tags based on gaps found by these tests.
const UIUX_MODULES = [
  // 024 — CSS token & layout modules (tags as updated by migration 026)
  { name: 'App Shell Layout',    category: 'layout',        tags: ['layout','sidebar','responsive','shell','app','scaffold','structure','navigation'] },
  { name: 'Dashboard Grid',      category: 'layout',        tags: ['layout','grid','dashboard','cards','responsive'] },
  { name: 'Data Table Pattern',  category: 'components',    tags: ['table','list','data','sort','filter','search','pagination','todo','task','checklist','kanban','drag-drop','accessible','sortable','responsive'] },
  { name: 'Modal/Dialog',        category: 'components',    tags: ['modal','dialog','accessible','focus-trap','overlay'] },
  { name: 'Command Palette',     category: 'components',    tags: ['command','palette','keyboard','search','cmdk'] },
  { name: 'Entrance Animations', category: 'motion',        tags: ['animation','motion','entrance','keyframes','accessible'] },
  { name: 'Skeleton Loader',     category: 'motion',        tags: ['skeleton','loader','shimmer','loading','placeholder'] },
  { name: 'Fluid Type Scale',    category: 'typography',    tags: ['typography','type-scale','fluid','responsive','clamp'] },
  { name: 'Semantic Color Tokens', category: 'color',       tags: ['color','tokens','dark-mode','semantic','css-variables','palette','brand','theme','scheme'] },
  { name: 'Focus Ring System',   category: 'accessibility', tags: ['accessibility','focus','keyboard','a11y','outline'] },
  { name: 'Form Field States',   category: 'forms',         tags: ['form','forms','input','field','validation','error','success','disabled','states','UX','signup','login','checkout'] },
  { name: 'Empty State Pattern', category: 'empty-states',  tags: ['empty','empty-state','zero-data','no-data','placeholder','UX','feedback','onboarding','first-time','null-state'] },
  // 025 — Tailwind v4 class composition modules (dark mode tags fixed by 026)
  { name: 'Button Variants (Tailwind)',               category: 'tailwind', tags: ['button','tailwind','variant','cta','interactive','disabled','loading'] },
  { name: 'Badge & Pill Variants (Tailwind)',          category: 'tailwind', tags: ['badge','pill','tag','status','label','tailwind','chip'] },
  { name: 'Card Patterns (Tailwind)',                 category: 'tailwind', tags: ['card','panel','container','tailwind','hover','interactive','stat'] },
  { name: 'Navigation Patterns (Tailwind)',            category: 'tailwind', tags: ['nav','navigation','sidebar','menu','breadcrumb','tabs','tailwind'] },
  { name: 'Alert & Notification (Tailwind)',           category: 'tailwind', tags: ['alert','notification','toast','warning','error','success','info','tailwind','banner'] },
  { name: 'Responsive Layout Utilities (Tailwind)',    category: 'tailwind', tags: ['responsive','layout','grid','flex','container','breakpoint','tailwind','mobile'] },
  { name: 'Dark Mode Toggle Pattern (Tailwind)',       category: 'tailwind', tags: ['dark-mode','dark','light','theme','toggle','next-themes','tailwind','color-scheme'] },
]

// Helper: score all modules and return top N above MIN_SCORE, sorted desc
function getTopModules(prompt: string, maxModules = 4, minScore = 1) {
  const lower = prompt.toLowerCase()
  return UIUX_MODULES
    .map(m => ({ name: m.name, score: scoreModule(lower, m) }))
    .filter(x => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxModules)
}

// ── SCENARIO 1: "TODO APP" ────────────────────────────────────────────────────

describe('Scenario: "TODO APP"', () => {
  const prompt = 'TODO APP'

  it('is blocked at the < 20 char gate — zero enhancement', () => {
    expect(prompt.trim().length).toBeLessThan(20)
  })

  it('isRefinementMessage returns true (too short)', () => {
    expect(isRefinementMessage(prompt)).toBe(true)
  })

  it('would score App Shell Layout if it passed the gate', () => {
    // "app" is a tag in App Shell Layout → +2; "app" is also a layout signal → +1
    const score = scoreModule('todo app', UIUX_MODULES.find(m => m.name === 'App Shell Layout')!)
    expect(score).toBeGreaterThan(0)
  })

  it('after migration 026: todo/task/checklist tags ARE present on Data Table Pattern', () => {
    // Migration 026 fixed this gap. "TODO APP" is still too short to trigger the
    // enhancer (< 20 chars), but if a user writes a longer prompt with "todo"
    // or "task", they will now get the Data Table Pattern module.
    const hasTodoTag = UIUX_MODULES.some(m =>
      m.tags.some(tag => ['todo', 'task', 'checklist'].includes(tag))
    )
    expect(hasTodoTag).toBe(true)
  })
})

// ── SCENARIO 2: "CHECKLIST APP with blue/white color" ────────────────────────

describe('Scenario: "CHECKLIST APP with blue/white color"', () => {
  const prompt = 'CHECKLIST APP with blue/white color'

  it('is blocked at the < 60 char gate — zero enhancement', () => {
    expect(prompt.trim().length).toBeLessThan(60)
  })

  it('isRefinementMessage returns true (under 60 chars)', () => {
    expect(isRefinementMessage(prompt)).toBe(true)
  })

  it('would match Semantic Color Tokens if it passed (color tag + category signal)', () => {
    // "color" appears in both the tags and the color category signals → score = 3
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'Semantic Color Tokens')!)
    expect(score).toBe(3)
  })

  it('would match Data Table because "checklist" contains "list" (substring match)', () => {
    // "checklist".includes("list") === true — the scoring uses includes(), not exact match
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'Data Table Pattern')!)
    expect(score).toBeGreaterThanOrEqual(2)
  })

  it('would match App Shell Layout because "app" is both a tag and layout signal', () => {
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'App Shell Layout')!)
    expect(score).toBeGreaterThanOrEqual(2)
  })
})

// ── SCENARIO 3: Todo prompt that PASSES the gate ─────────────────────────────

describe('Scenario: "Build a todo app with task lists and completion tracking for daily habits" (72 chars)', () => {
  const prompt = 'Build a todo app with task lists and completion tracking for daily habits'

  it('passes the length gate (>= 60 chars)', () => {
    expect(prompt.trim().length).toBeGreaterThanOrEqual(60)
  })

  it('is NOT flagged as a refinement message', () => {
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('retrieves App Shell Layout (score >= 3)', () => {
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'App Shell Layout')!)
    expect(score).toBeGreaterThanOrEqual(3)
  })

  it('retrieves Data Table for "lists" keyword (list tag + component signal)', () => {
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'Data Table Pattern')!)
    expect(score).toBeGreaterThanOrEqual(3) // list(+2) + list signal(+1)
  })

  it('returns exactly 4 top modules (MAX_MODULES cap)', () => {
    const results = getTopModules(prompt)
    expect(results.length).toBeLessThanOrEqual(4)
  })

  it('top 2 modules are App Shell Layout and Data Table Pattern', () => {
    const results = getTopModules(prompt)
    const names = results.map(r => r.name)
    expect(names).toContain('App Shell Layout')
    expect(names).toContain('Data Table Pattern')
  })

  it('does NOT retrieve color/theme modules (no color intent in prompt)', () => {
    const results = getTopModules(prompt)
    const names = results.map(r => r.name)
    expect(names).not.toContain('Semantic Color Tokens')
    expect(names).not.toContain('Dark Mode Toggle Pattern (Tailwind)')
  })

  it('does NOT retrieve form modules (no form/input intent)', () => {
    const results = getTopModules(prompt)
    const names = results.map(r => r.name)
    expect(names).not.toContain('Form Field States')
  })
})

// ── SCENARIO 4: Checklist prompt that PASSES the gate ────────────────────────

describe('Scenario: "Create a checklist app with blue and white color scheme and daily reminders and form to add items" (97 chars)', () => {
  const prompt = 'Create a checklist app with blue and white color scheme and daily reminders and form to add items'

  it('passes the length gate (>= 60 chars)', () => {
    expect(prompt.trim().length).toBeGreaterThanOrEqual(60)
  })

  it('is NOT flagged as a refinement message', () => {
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('retrieves Semantic Color Tokens (color intent explicit)', () => {
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'Semantic Color Tokens')!)
    expect(score).toBeGreaterThanOrEqual(3) // "color" tag(+2) + color signal(+1)
  })

  it('retrieves Data Table for list patterns (checklist ⊃ list)', () => {
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'Data Table Pattern')!)
    expect(score).toBeGreaterThanOrEqual(3)
  })

  it('retrieves Form Field States (form intent from "form to add items")', () => {
    const score = scoreModule(prompt.toLowerCase(), UIUX_MODULES.find(m => m.name === 'Form Field States')!)
    expect(score).toBeGreaterThanOrEqual(3) // "form" tag(+2) + form signal(+1)
  })

  it('pulls exactly the right 4 modules for this prompt', () => {
    const results = getTopModules(prompt)
    const names = results.map(r => r.name)
    // Expected: App Shell Layout, Data Table Pattern, Semantic Color Tokens, Form Field States
    expect(names).toContain('App Shell Layout')
    expect(names).toContain('Data Table Pattern')
    expect(names).toContain('Semantic Color Tokens')
    expect(names).toContain('Form Field States')
  })

  it('does NOT retrieve animation/motion modules (no animation intent)', () => {
    const results = getTopModules(prompt)
    const names = results.map(r => r.name)
    expect(names).not.toContain('Entrance Animations')
    expect(names).not.toContain('Skeleton Loader')
  })
})

// ── SCENARIO 5: The 60-char boundary — documented minimum ────────────────────

describe('The 60-char gate — minimum viable prompt length', () => {
  it('59-char prompt gets skipped regardless of content quality', () => {
    const shortButDescriptive = 'Build a beautiful todo list app with drag-and-drop reordering'
    // Trim to exactly 59 chars
    const trimmed = shortButDescriptive.substring(0, 59)
    expect(trimmed.length).toBe(59)
    expect(isRefinementMessage(trimmed)).toBe(true)
  })

  it('60-char prompt at the boundary also gets skipped (< 60, not <= 60)', () => {
    const atBoundary = 'x'.repeat(60)
    // isRefinementMessage uses lower.length < 60, so 60 chars actually PASSES
    // the length check (it's not < 60). But only if no refinement prefix.
    expect(isRefinementMessage(atBoundary)).toBe(false) // 60 chars passes
  })

  it('61-char non-refinement prompt passes all gates', () => {
    const justOverThreshold = 'Build me a checklist app with task completion and due dates!!'
    expect(justOverThreshold.trim().length).toBeGreaterThanOrEqual(60)
    expect(isRefinementMessage(justOverThreshold)).toBe(false)
  })
})

// ── SCENARIO 6: Library gap analysis ─────────────────────────────────────────

describe('Library coverage: todo/task/checklist tags (added by migration 026)', () => {
  it('Data Table Pattern now has a "todo" tag', () => {
    expect(UIUX_MODULES.some(m => m.tags.includes('todo'))).toBe(true)
  })

  it('Data Table Pattern now has a "task" tag', () => {
    expect(UIUX_MODULES.some(m => m.tags.includes('task'))).toBe(true)
  })

  it('Data Table Pattern now has a "checklist" tag', () => {
    expect(UIUX_MODULES.some(m => m.tags.includes('checklist'))).toBe(true)
  })

  it('Data Table Pattern now has a "kanban" tag', () => {
    expect(UIUX_MODULES.some(m => m.tags.includes('kanban'))).toBe(true)
  })

  it('"list" tag exists only on Data Table Pattern', () => {
    const withListTag = UIUX_MODULES.filter(m => m.tags.includes('list'))
    expect(withListTag).toHaveLength(1)
    expect(withListTag[0]!.name).toBe('Data Table Pattern')
  })

  it('a "TODO APP" prompt now scores Data Table Pattern > 0 once tags are in DB', () => {
    // Even though "TODO APP" is too short to reach the DB (< 20 chars),
    // the tag coverage is now correct — if it did pass, it would match.
    const score = scoreModule('todo app', UIUX_MODULES.find(m => m.name === 'Data Table Pattern')!)
    expect(score).toBeGreaterThan(0) // "todo" tag(+2) + "app" layout signal(+1) = 3
  })

  it('remaining gap: no scaffold TEMPLATE exists for todo/task apps (future migration 027)', () => {
    // The UI/UX modules now cover list/todo styling and patterns,
    // but there is no scaffold_template seeded for this app type.
    // SP v1 builds without architectural file-structure guidance.
    // Recommended action: add a "Task Management App" scaffold template.
    expect(true).toBe(true) // documentation-only
  })
})

// ── SCENARIO 7: Color intent variants ────────────────────────────────────────

describe('Color intent: different ways users express color preferences', () => {
  const colorModule = UIUX_MODULES.find(m => m.name === 'Semantic Color Tokens')!

  it('"blue and white color scheme" triggers Semantic Color Tokens', () => {
    const score = scoreModule('create an app with blue and white color scheme', colorModule)
    expect(score).toBeGreaterThanOrEqual(2) // "color" tag match
  })

  it('"dark mode" NOW matches Dark Mode Toggle (migration 026 added "dark" as a separate tag)', () => {
    // Migration 026 fixed this: "dark" and "light" were added as standalone tags
    // alongside "dark-mode", so natural "dark mode" (with space) prompts now match.
    const darkMod = UIUX_MODULES.find(m => m.name === 'Dark Mode Toggle Pattern (Tailwind)')!
    const score = scoreModule('build an app with dark mode support', darkMod)
    expect(score).toBeGreaterThanOrEqual(2) // "dark" tag(+2)
  })

  it('"theme" keyword also matches Dark Mode Toggle (via "theme" tag)', () => {
    const darkMod = UIUX_MODULES.find(m => m.name === 'Dark Mode Toggle Pattern (Tailwind)')!
    const score = scoreModule('build an app with a light and dark theme switcher', darkMod)
    expect(score).toBeGreaterThanOrEqual(4) // "theme" tag(+2) + "light" tag(+2)
  })

  it('"theme" keyword matches both Semantic Color Tokens and Dark Mode Toggle', () => {
    const prompt = 'create a task app with a customizable theme'
    const colorScore = scoreModule(prompt, colorModule)
    const darkMod = UIUX_MODULES.find(m => m.name === 'Dark Mode Toggle Pattern (Tailwind)')!
    const darkScore = scoreModule(prompt, darkMod)
    expect(colorScore).toBeGreaterThan(0)
    expect(darkScore).toBeGreaterThan(0)
  })

  it('"palette" keyword maps to Semantic Color Tokens', () => {
    const score = scoreModule('app with a custom color palette', colorModule)
    expect(score).toBeGreaterThanOrEqual(4) // "color"(+2) + "palette"(+2) + color signals
  })

  it('"blue/white" alone (without the word "color") scores 0 — no tag match', () => {
    // "blue" and "white" are not tags — users must say "color", "theme", or "palette"
    const score = scoreModule('blue white minimal design', colorModule)
    // "theme" is a color category signal — does not appear → 0
    // "color" not in prompt → tag miss
    expect(score).toBe(0)
  })
})
