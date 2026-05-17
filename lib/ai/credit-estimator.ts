export interface CreditEstimate {
  min: number
  max: number
  estimate: number
  modelId: string
}

// Fast heuristic — no AI call needed. Called before user sends a message.
// Uses word count + keyword signals + existing file count to bucket complexity.
export function estimateCredits(
  prompt: string,
  modelId: string,
  creditsPerMOutput: number, // from model_pricing table
  existingFileCount: number = 0
): CreditEstimate {
  if (!prompt.trim()) return { min: 0.1, max: 2.0, estimate: 0.5, modelId }
  const words = prompt.trim().split(/\s+/).length
  const heavyKeywords = ['new page', 'feature', 'redesign', 'migrate', 'add auth', 'add payment', 'database', 'schema']
  const isHeavy = heavyKeywords.some((kw) => prompt.toLowerCase().includes(kw))

  // Rough token estimates: 1 word ≈ 1.3 tokens; output is typically 3-8× input
  const estimatedOutputTokens = Math.round(words * 1.3 * (isHeavy ? 6 : 3))
  const fileOverhead = existingFileCount * 50 // tokens per existing file in context

  const baseCredits = ((estimatedOutputTokens + fileOverhead) / 1_000_000) * creditsPerMOutput

  return {
    min: Math.max(0.1, Math.round(baseCredits * 0.5 * 10) / 10),
    max: Math.round(baseCredits * 2.0 * 10) / 10,
    estimate: Math.max(0.1, Math.round(baseCredits * 10) / 10),
    modelId,
  }
}
