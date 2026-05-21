// Returns { safe: false, pattern: "weapons-mass-destruction" } when prompt matches.
// Patterns are intentionally simple — catch obvious abuse, not nuanced cases.
// Sophisticated moderation can be added later via Anthropic prompt-shield or OpenAI Moderation API.
export interface SafetyResult {
  safe: boolean
  pattern?: string
  severity?: 'warn' | 'block'
}

const BLOCK_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'weapons-mass-destruction', regex: /\b(bioweapon|nerve agent|nuclear weapon|sarin|anthrax|dirty bomb|chemical weapon)\b/i },
  { name: 'terrorism-planning',       regex: /\b(plan(ning)? a (terror|bomb)|attack (plan|on) (school|crowd|government))\b/i },
  { name: 'csam',                     regex: /\b(child (sexual|porn|nude)|cp link|underage (sex|nude))\b/i },
  { name: 'malware-infrastructure',   regex: /\b(ddos (a |an |the )?(government|hospital|infrastructure)|ransomware (target|deploy))\b/i },
]

export function checkPromptSafety(prompt: string): SafetyResult {
  for (const { name, regex } of BLOCK_PATTERNS) {
    if (regex.test(prompt)) return { safe: false, pattern: name, severity: 'block' }
  }
  return { safe: true }
}
