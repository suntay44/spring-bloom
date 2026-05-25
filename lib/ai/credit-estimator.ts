export interface CreditEstimate {
  min: number
  max: number
  estimate: number
  modelId: string
}

// Fast heuristic — no AI call needed. Called before user sends a message.
// Uses word count + keyword signals + existing file count to bucket complexity.
//
// R0-5: previously this estimated output cost only. Long sessions with big
// history blocks have HUGE input costs that were silently undercounted —
// the hold then under-reserved credits and the UI showed an artificially
// low cost to the user. Now we factor in input price + history overhead.
export function estimateCredits(
  prompt: string,
  modelId: string,
  creditsPerMOutput: number,           // from model_pricing table
  existingFileCount: number = 0,
  // R0-5: optional input-side fields. If omitted (legacy callers), we fall
  // back to output-only behavior so existing tests still pass.
  creditsPerMInput?: number,
  historyTokenEstimate?: number,       // estimated tokens already in conversation context
): CreditEstimate {
  if (!prompt.trim()) return { min: 0.1, max: 2.0, estimate: 0.5, modelId }
  const words = prompt.trim().split(/\s+/).length
  const heavyKeywords = ['new page', 'feature', 'redesign', 'migrate', 'add auth', 'add payment', 'database', 'schema']
  const isHeavy = heavyKeywords.some((kw) => prompt.toLowerCase().includes(kw))

  // Rough token estimates: 1 word ≈ 1.3 tokens; output is typically 3-8× input
  const userPromptTokens     = Math.round(words * 1.3)
  const estimatedOutputTokens = Math.round(userPromptTokens * (isHeavy ? 6 : 3))
  const fileOverhead          = existingFileCount * 50   // tokens per existing file in context

  // OUTPUT cost (existing behavior)
  const outputCredits = ((estimatedOutputTokens + fileOverhead) / 1_000_000) * creditsPerMOutput

  // INPUT cost (R0-5): system prompt (~3k) + knowledge (~1.5k) + history + user msg.
  // We pay for input on every turn — caching reduces it (R0-1) but doesn't eliminate it.
  // Use a 50% effective rate to credit Anthropic ephemeral cache hits on warm turns.
  const SYSTEM_TOKENS         = 3000
  const KNOWLEDGE_TOKENS_EST  = 1500
  const totalInputTokens      = SYSTEM_TOKENS + KNOWLEDGE_TOKENS_EST + (historyTokenEstimate ?? 0) + userPromptTokens
  const cacheDiscount         = 0.5  // assume ~50% of input is cache-read on average
  const effectiveInputTokens  = totalInputTokens * cacheDiscount
  const inputCredits = creditsPerMInput
    ? (effectiveInputTokens / 1_000_000) * creditsPerMInput
    : 0

  const baseCredits = outputCredits + inputCredits

  return {
    min: Math.max(0.1, Math.round(baseCredits * 0.5 * 10) / 10),
    max: Math.round(baseCredits * 2.0 * 10) / 10,
    estimate: Math.max(0.1, Math.round(baseCredits * 10) / 10),
    modelId,
  }
}
