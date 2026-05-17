import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

// Maps model_id (from model_pricing table) → SDK LanguageModel instance
// Returns null if the provider API key is not set — caller must handle gracefully
export function resolveModel(modelId: string, provider: string): LanguageModel | null {
  try {
    if (provider === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) return null
      return anthropic(modelId)
    }
    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) return null
      return openai(modelId)
    }
    if (provider === 'google') {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null
      return google(modelId)
    }
    return null
  } catch {
    return null
  }
}
