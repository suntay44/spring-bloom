/**
 * Phase 19 — Template Lookup
 *
 * Matches a user prompt against scaffold_templates and scaffold_modules using
 * keyword scoring against their tags arrays. Fast, zero-latency, no LLM call.
 *
 * Returns a formatted scaffold context string (< 300 tokens) ready to inject
 * into the prompt enhancer system prompt.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { TemplateScaffold, ModuleScaffold } from './types'

interface LookupResult {
  /** Formatted context string to prepend to the enhancer prompt */
  context: string
  /** Name of the matched template (for logging) */
  templateName: string | null
}

interface ScaffoldTemplateRow {
  name: string
  category: string
  tags: string[]
  scaffold: TemplateScaffold & {
    file_structure?: string[]
    component_architecture?: string
    state_pattern?: string
    db_schema?: string
    key_patterns?: string[]
    default_modules?: string[]
  }
}

interface ScaffoldModuleRow {
  name: string
  module_type: string
  tags: string[]
  scaffold: ModuleScaffold & { patterns?: string[] }
}

/**
 * Find the best matching scaffold template + relevant modules for a prompt.
 * Returns null context if no confident match (score < threshold).
 */
export async function lookupTemplate(
  userPrompt: string,
  isMobile: boolean,
): Promise<LookupResult> {
  const noMatch: LookupResult = { context: '', templateName: null }

  try {
    const db = createAdminClient()
    const lower = userPrompt.toLowerCase()

    // Load all active templates filtered by platform type
    const { data: templates } = await db
      .from('scaffold_templates')
      .select('name, category, tags, scaffold')
      .eq('status', 'active')
      .returns<ScaffoldTemplateRow[]>()

    if (!templates?.length) return noMatch

    // Score each template by keyword overlap with the prompt
    const scored = templates
      .filter(t => {
        // Pre-filter: mobile templates end with "(Mobile)" in name
        const isMobileTemplate = t.name.includes('Mobile') || t.category === 'habit-tracker' ||
          t.category === 'fitness' || t.category === 'food' || t.category === 'social' && t.name.includes('Mobile')
        return isMobile ? isMobileTemplate : !isMobileTemplate
      })
      .map(t => ({
        template: t,
        score: scoreAgainstTags(lower, t.tags),
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)

    if (!scored.length || (scored[0]?.score ?? 0) < 2) return noMatch

    const best = scored[0]!.template

    // Load relevant modules (those listed in default_modules + any matching prompt)
    const defaultModules: string[] = best.scaffold.default_modules ?? []
    const { data: modules } = await db
      .from('scaffold_modules')
      .select('name, module_type, tags, scaffold')
      .eq('status', 'active')
      .returns<ScaffoldModuleRow[]>()

    const relevantModules = (modules ?? []).filter(m =>
      defaultModules.includes(m.module_type) ||
      scoreAgainstTags(lower, m.tags) >= 2
    )

    const context = formatContext(best, relevantModules)
    return { context, templateName: best.name }

  } catch (err) {
    // Lookup failure must never block generation
    console.error('[template-lookup] Failed:', err)
    return noMatch
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Count how many tags appear in the prompt (each match = 1 point). */
function scoreAgainstTags(promptLower: string, tags: string[]): number {
  return tags.filter(tag => promptLower.includes(tag.toLowerCase())).length
}

/** Format the scaffold into a compact context block for the enhancer. */
function formatContext(
  template: ScaffoldTemplateRow,
  modules: ScaffoldModuleRow[],
): string {
  const s = template.scaffold
  const lines: string[] = [
    `PROVEN SCAFFOLD — ${template.name.toUpperCase()}`,
    '',
  ]

  if (s.file_structure?.length) {
    lines.push(`Key files: ${s.file_structure.slice(0, 6).join(', ')}`)
  }

  if (s.component_architecture) {
    lines.push(`Architecture: ${s.component_architecture}`)
  }

  if (s.state_pattern) {
    lines.push(`State: ${s.state_pattern}`)
  }

  if (s.db_schema) {
    lines.push(`DB schema: ${s.db_schema}`)
  }

  if (s.key_patterns?.length) {
    lines.push(`Key patterns:`)
    s.key_patterns.forEach(p => lines.push(`  - ${p}`))
  }

  if (modules.length) {
    lines.push(`Include modules: ${modules.map(m => m.name).join(', ')}`)
    for (const m of modules) {
      if (m.scaffold.patterns?.length) {
        lines.push(`  ${m.name}: ${m.scaffold.patterns[0]}`)
      }
    }
  }

  return lines.join('\n')
}
