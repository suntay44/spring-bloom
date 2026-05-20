/**
 * Phase 19 — Web Prompt Enhancer
 *
 * Expands a vague web-app prompt into a precise technical spec before the
 * main generation model sees it. Uses claude-haiku for speed (<400ms typical).
 *
 * Web knows:
 *  - Responsive breakpoints (375px / 768px / 1280px)
 *  - Desktop + tablet + mobile views
 *  - Browser APIs, SEO, hover states
 *  - Next.js App Router patterns
 *
 * Rules:
 *  - Extract ONLY explicitly requested features — nothing assumed or added
 *  - Do not invent business logic, colors, or branding
 *  - Output is a replacement prompt, not a conversation reply
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const WEB_ENHANCER_SYSTEM = `You are a technical prompt enhancer for a web app AI code generator.

Your job: take a user's vague prompt and expand it into a precise, actionable technical specification that a senior Next.js developer would immediately understand.

RULES (strict):
1. Extract ONLY explicitly stated features. Never add "nice-to-haves" the user did not mention.
2. Do NOT assume a color scheme, branding, or business logic unless the user stated it.
3. Do NOT add authentication, payments, or any feature not mentioned.
4. Output a single enhanced prompt string — no markdown headers, no bullet lists as output, no commentary.
5. The enhanced prompt must be plain prose that slots directly into a code generation context.
6. Keep it under 400 words.

WHAT TO EXPAND:
- Vague UI terms → specific component names (e.g. "a list" → "a scrollable list of cards with title, subtitle, and a delete icon")
- Vague actions → specific interactions (e.g. "can edit items" → "clicking an item opens an inline edit form with a Save and Cancel button")
- Implied responsiveness → explicit breakpoints (375px mobile-first, 768px tablet, 1280px desktop)
- Implied state → explicit state shape (e.g. "todo items" → "each item has: id, title: string, completed: boolean, createdAt: Date")
- Framework context → Next.js App Router: server components by default, client components only for interactivity, Tailwind CSS + shadcn/ui for UI`

export async function enhanceWebPrompt(
  userPrompt: string,
  context: {
    framework: string
    projectType: string
    briefAnswers?: Record<string, unknown> | null
  },
): Promise<string> {
  // If the prompt is already detailed (>200 chars with specific technical terms), skip
  if (userPrompt.length > 200 && hasDetailedTerms(userPrompt)) {
    return userPrompt
  }

  try {
    const briefContext = context.briefAnswers
      ? `\n\nProject brief answers from user:\n${JSON.stringify(context.briefAnswers, null, 2)}`
      : ''

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      system: WEB_ENHANCER_SYSTEM,
      prompt: `Framework: ${context.framework}\nProject type: ${context.projectType}${briefContext}\n\nUser prompt to enhance:\n"${userPrompt}"\n\nReturn only the enhanced prompt string.`,
      maxOutputTokens: 512,
    })

    const enhanced = text.trim()

    // Safety: if the enhancement is empty or much shorter than original, fall back
    return enhanced.length > userPrompt.length * 0.5 ? enhanced : userPrompt

  } catch (err) {
    // Enhancer failure must never block generation
    console.error('[web-enhancer] Failed to enhance prompt:', err)
    return userPrompt
  }
}

function hasDetailedTerms(prompt: string): boolean {
  const technicalTerms = [
    'component', 'usestate', 'useeffect', 'server component', 'api route',
    'supabase', 'schema', 'tailwind', 'shadcn', 'responsive', 'breakpoint',
    'typescript', 'interface', 'type', 'props', 'state', 'hook',
  ]
  const lower = prompt.toLowerCase()
  return technicalTerms.filter(t => lower.includes(t)).length >= 3
}
