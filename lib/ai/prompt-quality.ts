/**
 * Prompt Quality Scorer (client-safe, zero cost).
 *
 * Powers the orange "weak prompt" warning + the Enhance button hint in the
 * chat composer. Runs synchronously in the browser on every keystroke — NO
 * API calls, NO server imports.
 *
 * It's intentionally conservative: only flags genuinely vague prompts so we
 * don't nag users who already wrote something specific. Refinements like
 * "make it blue" are NOT flagged (those are valid short prompts mid-build).
 */

export type PromptQualityLevel = 'empty' | 'weak' | 'ok' | 'strong'

export interface PromptQuality {
  level:   PromptQualityLevel
  /** 0-100 — rough confidence the prompt is detailed enough. */
  score:   number
  /** Short human reasons, surfaced in the tooltip. */
  reasons: string[]
}

// Signals that the prompt already has useful detail (each adds to the score)
const DETAIL_SIGNALS: Array<{ re: RegExp; weight: number; label: string }> = [
  { re: /\d+/,                                              weight: 15, label: 'has specifics (numbers)' },
  { re: /\b(with|using|that|so that|where|when|if|including)\b/i, weight: 20, label: 'descriptive clauses' },
  { re: /\b(google|github|apple|facebook|email|sms|stripe|twilio|supabase|resend|postgres|openai)\b/i, weight: 20, label: 'names a service' },
  { re: /\b(table|column|row|field|schema|database|api|endpoint|route|component|page|modal|form)\b/i, weight: 15, label: 'technical detail' },
  { re: /\b(red|blue|green|dark|light|gradient|rounded|shadow|grid|flex|column|sidebar|navbar|hero)\b/i, weight: 10, label: 'design detail' },
]

// Refinement prefixes — short but VALID; never flag these as weak.
const REFINEMENT_PREFIXES = [
  'make it', 'change it', 'change the', 'update the', 'fix the', 'fix it',
  'move the', 'rename', 'delete the', 'remove the', 'the color', 'the button',
  'make the', 'add a button', 'add a link', 'smaller', 'bigger', 'darker', 'lighter',
]

// Pure-vague openers that signal a thin prompt when nothing else is present.
const VAGUE_OPENERS = /^(make|build|create|do|add|implement|help|i want|i need|can you)\b/i

export function scorePrompt(raw: string): PromptQuality {
  const text = raw.trim()

  if (text.length === 0) {
    return { level: 'empty', score: 0, reasons: [] }
  }

  const lower = text.toLowerCase()

  // Refinements are always fine — don't nag.
  if (REFINEMENT_PREFIXES.some((p) => lower.startsWith(p))) {
    return { level: 'ok', score: 70, reasons: ['looks like a refinement'] }
  }

  let score = 0
  const reasons: string[] = []
  const positives: string[] = []

  // Length contributes up to ~30 points
  const lengthPts = Math.min(30, Math.floor(text.length / 4))
  score += lengthPts

  // Word count: very short prompts are suspicious
  const words = text.split(/\s+/).filter(Boolean).length
  if (words >= 8) score += 10

  // Detail signals
  for (const sig of DETAIL_SIGNALS) {
    if (sig.re.test(text)) { score += sig.weight; positives.push(sig.label) }
  }

  // Penalty: starts vague AND short AND no detail signals
  const hasAnyDetail = positives.length > 0
  if (VAGUE_OPENERS.test(text) && text.length < 40 && !hasAnyDetail) {
    score -= 25
    reasons.push('vague verb with no specifics')
  }

  // Penalty: extremely short
  if (text.length < 20) reasons.push('quite short — add what & how')

  score = Math.max(0, Math.min(100, score))

  let level: PromptQualityLevel
  if (score < 35)      level = 'weak'
  else if (score < 65) level = 'ok'
  else                 level = 'strong'

  // Surface up to 2 positives when ok/strong, reasons when weak
  if (level === 'weak') {
    if (reasons.length === 0) reasons.push('could be more specific about features & behavior')
  } else {
    reasons.length = 0
    reasons.push(...positives.slice(0, 2))
  }

  return { level, score, reasons }
}
