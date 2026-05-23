/**
 * Ambiguity Detector
 *
 * Determines whether to show planning questions before generating.
 * Two triggers:
 *
 *   1. FIRST MESSAGE (always) — any prompt ≥ 20 chars on a blank project
 *      gets questions because the model has zero context about what to build.
 *
 *   2. MID-CONVERSATION AMBIGUOUS PROMPT — a follow-up that names a feature
 *      but gives no detail about how it should work. Examples:
 *        "add authentication"        ← who can sign up? social login? email only?
 *        "build a dashboard"         ← what metrics? what time range? which users?
 *        "add payments"              ← one-time or subscription? which currency?
 *        "add a settings page"       ← settings for what? profile? billing? notifications?
 *        "add notifications"         ← in-app? email? push? what triggers them?
 *
 *   NOT triggered for:
 *     - Known refinements ("make it blue", "fix the button") — handled by isRefinementMessage()
 *     - Long descriptive prompts (≥ 100 chars) — user already gave enough detail
 *     - Prompts with specific implementation words (exact column names, specific counts, etc.)
 *
 * Zero cost — pure string matching, runs synchronously in the browser.
 */

/** Features/areas that need clarification when mentioned alone */
const AMBIGUOUS_FEATURE_PATTERNS: RegExp[] = [
  // Auth
  /\b(add|build|create|implement|include)\s+(auth|authentication|login|sign.?up|sign.?in|register|accounts?)\b/i,
  // Payments / billing
  /\b(add|build|create|implement|include)\s+(payment|billing|checkout|stripe|subscription|pricing)\b/i,
  // Data views
  /\b(add|build|create|implement|include)\s+(a\s+)?(dashboard|analytics|charts?|graphs?|reports?|metrics|stats)\b/i,
  // CRUD / management pages
  /\b(add|build|create|implement|include)\s+(a\s+)?(settings?|profile|account)\s+(page|screen|section|tab)?\b/i,
  /\b(add|build|create|implement|include)\s+(a\s+)?(admin|management|back.?office)\b/i,
  // Notifications
  /\b(add|build|create|implement|include)\s+(notifications?|alerts?|emails?|push)\b/i,
  // Search
  /\b(add|build|create|implement|include)\s+(search|filter|sort)\b/i,
  // Generic "add a X" where X is a single feature noun
  /^(add|build|create|implement)\s+(a\s+|the\s+)?[a-z\-]+\s*(page|screen|section|feature|component|tab|modal|panel|flow)?\.?$/i,
]

/** Words that indicate the user gave enough detail — don't ask questions */
const SPECIFIC_DETAIL_SIGNALS: RegExp[] = [
  /\d+/,                          // any number ("show last 30 days", "3 columns")
  /\b(with|using|that|so that|where|when|if)\b/i,  // descriptive clauses
  /\b(google|github|email|sms|stripe|twilio|supabase)\b/i, // named integrations
  /\b(table|column|row|field|schema|database|api)\b/i,     // technical specifics
]

export interface AmbiguityResult {
  shouldAsk: boolean
  reason: 'first_message' | 'ambiguous_feature' | 'none'
}

/**
 * Decide whether to show planning questions for this prompt.
 *
 * @param prompt      The user's raw message
 * @param messageCount  Number of messages already in the conversation (0 = blank project)
 */
export function shouldAskQuestions(
  prompt: string,
  messageCount: number,
): AmbiguityResult {
  const trimmed = prompt.trim()
  const len = trimmed.length

  // Too short to act on
  if (len < 20) return { shouldAsk: false, reason: 'none' }

  // ── Trigger 1: First message ─────────────────────────────────────────────
  if (messageCount === 0) {
    return { shouldAsk: true, reason: 'first_message' }
  }

  // ── Trigger 2: Mid-conversation ambiguous feature request ────────────────
  // Long prompts are almost always specific enough — skip
  if (len >= 100) return { shouldAsk: false, reason: 'none' }

  // If the user gave specific detail signals, they don't need clarification
  const hasDetail = SPECIFIC_DETAIL_SIGNALS.some((r) => r.test(trimmed))
  if (hasDetail) return { shouldAsk: false, reason: 'none' }

  // Check for ambiguous feature patterns
  const isAmbiguous = AMBIGUOUS_FEATURE_PATTERNS.some((r) => r.test(trimmed))
  if (isAmbiguous) {
    return { shouldAsk: true, reason: 'ambiguous_feature' }
  }

  return { shouldAsk: false, reason: 'none' }
}
