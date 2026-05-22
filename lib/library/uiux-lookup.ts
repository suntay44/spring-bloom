/**
 * UI/UX Library Module Retrieval
 *
 * Scores the user prompt against library_modules tags (uiux cluster only),
 * returns the top matching templates as a compact context block injected
 * into the generation system prompt.
 *
 * This is intentionally keyword-based (no vector/embedding call) so it adds
 * < 5ms latency and never blocks generation on a DB timeout.
 */

import { createAdminClient } from '@/lib/supabase/admin'

interface LibraryModuleRow {
  name: string
  category: string
  tags: string[]
  template: string
}

export interface UiuxLookupResult {
  /** Formatted context block to inject into the system prompt */
  context: string
  /** Names of matched modules (for logging / analytics) */
  matched: string[]
}

const NO_MATCH: UiuxLookupResult = { context: '', matched: [] }

// How many top-scoring modules to include (keeps prompt concise)
const MAX_MODULES = 4
// Minimum tag-match score to include a module
const MIN_SCORE = 1

// Category → keywords that signal relevance (supplements tag matching)
const CATEGORY_SIGNALS: Record<string, string[]> = {
  layout:        ['layout', 'page', 'dashboard', 'sidebar', 'shell', 'grid', 'admin', 'app'],
  components:    ['table', 'list', 'card', 'modal', 'dialog', 'command', 'search', 'menu', 'dropdown'],
  motion:        ['animation', 'loading', 'skeleton', 'transition', 'animate', 'fade', 'slide'],
  typography:    ['text', 'font', 'heading', 'copy', 'content', 'blog', 'article'],
  color:         ['theme', 'dark', 'light', 'color', 'brand', 'palette', 'token'],
  accessibility: ['accessible', 'a11y', 'screen reader', 'keyboard', 'focus', 'aria'],
  forms:         ['form', 'input', 'field', 'validation', 'signup', 'login', 'checkout', 'survey'],
  'empty-states':['empty', 'no data', 'zero', 'placeholder', 'onboarding', 'first time'],
  tailwind:      ['tailwind', 'button', 'badge', 'pill', 'nav', 'alert', 'notification', 'responsive'],
}

/**
 * Retrieve and rank UI/UX library modules relevant to the user prompt.
 * Returns at most MAX_MODULES modules formatted as a context block.
 */
export async function retrieveUiuxModules(
  userPrompt: string,
): Promise<UiuxLookupResult> {
  try {
    const db = createAdminClient()
    const lower = userPrompt.toLowerCase()

    // Load all active uiux modules in one query
    const { data: modules, error } = await db
      .from('library_modules')
      .select('name, category, tags, template')
      .eq('is_active', true)
      .returns<LibraryModuleRow[]>()

    if (error || !modules?.length) return NO_MATCH

    // Score each module
    const scored = modules
      .map((mod) => ({
        mod,
        score: scoreModule(lower, mod),
      }))
      .filter((x) => x.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MODULES)

    if (!scored.length) return NO_MATCH

    const matched = scored.map((x) => x.mod.name)
    const context = formatUiuxBlock(scored.map((x) => x.mod))

    return { context, matched }
  } catch (err) {
    // Never block generation on a lookup failure
    console.error('[uiux-lookup] Failed:', err)
    return NO_MATCH
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Score a module against the prompt.
 * Points:
 *   +2 per tag that appears verbatim in the prompt
 *   +1 per category signal keyword that appears in the prompt
 *   +0.5 if the module name (lowercased) appears in the prompt
 */
export function scoreModule(
  promptLower: string,
  mod: { name: string; category: string; tags: string[] },
): number {
  let score = 0

  // Tag matches (highest weight)
  for (const tag of mod.tags) {
    if (promptLower.includes(tag.toLowerCase())) score += 2
  }

  // Category signal matches
  const signals = CATEGORY_SIGNALS[mod.category] ?? []
  for (const signal of signals) {
    if (promptLower.includes(signal)) score += 1
  }

  // Name match bonus
  if (promptLower.includes(mod.name.toLowerCase())) score += 0.5

  return score
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatUiuxBlock(modules: LibraryModuleRow[]): string {
  if (!modules.length) return ''

  const lines: string[] = [
    'UI/UX PATTERNS (apply these to produce polished, consistent UI):',
    '',
  ]

  for (const mod of modules) {
    lines.push(`— ${mod.name} [${mod.category}]`)
    // Trim template to keep system prompt concise (first 20 lines max)
    const trimmed = mod.template
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0)
      .slice(0, 20)
      .join('\n')
    lines.push(trimmed)
    lines.push('')
  }

  return lines.join('\n')
}
