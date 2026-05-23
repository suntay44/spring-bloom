/**
 * Planning Agent — Dynamic First-Prompt Question Generator
 *
 * Generates 3–5 clarifying questions before the first code generation.
 * Questions are tailored to the user's prompt AND the matched scaffold template,
 * so a todo app gets different questions than a marketplace.
 *
 * IMPORTANT: Uses the same model the user selected — not a hardcoded model.
 * This means it works with GPT-4o, Claude Sonnet, Gemini Pro, or any model
 * in the model_pricing table. The caller passes modelId + provider.
 *
 * Questions are returned as structured JSON with radio options + descriptions
 * matching the Lovable-style card UI in ScopingQuestionsCard.tsx.
 */

import { generateText } from 'ai'
import { resolveModel } from '@/lib/ai/providers'
import type { ScopingQuestion } from '@/lib/mock/messages'

const FIRST_MESSAGE_SYSTEM_PROMPT = `You are a planning agent for a no-code app builder called SpringBloom.
Your job is to generate 3–5 clarifying questions before building an app from scratch.

RULES:
- Each question must affect the architecture, schema, or core features — not just styling
- Write for non-developers. No tech jargon (say "user accounts" not "auth", "save to database" not "persist to Supabase")
- Prefer multiple-choice questions with 2–4 options. Each option needs a short description (1 sentence)
- Never ask about colors, fonts, or visual style — that's handled separately
- Never ask more than 5 questions
- Return ONLY valid JSON — no markdown, no explanation, no preamble

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here?",
      "type": "choice",
      "options": [
        { "value": "option-a", "label": "Short Label", "description": "One sentence explaining this choice." },
        { "value": "option-b", "label": "Short Label", "description": "One sentence explaining this choice." }
      ]
    },
    {
      "id": "q2",
      "text": "Open-ended question?",
      "type": "text"
    }
  ]
}`

const MID_CONVERSATION_SYSTEM_PROMPT = `You are a planning agent for a no-code app builder called SpringBloom.
The user is mid-conversation and just requested a new feature that needs clarification.
Generate 2–3 focused questions specifically about THIS feature — not the whole app.

RULES:
- Ask only about THIS specific feature, not general app questions
- Each question must change how the feature is built (not just styled)
- Write for non-developers. No tech jargon
- Prefer multiple-choice with 2–3 options + short description each
- Keep it short — max 3 questions. The user already has a running app
- Return ONLY valid JSON — no markdown, no explanation, no preamble

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here?",
      "type": "choice",
      "options": [
        { "value": "option-a", "label": "Short Label", "description": "One sentence." },
        { "value": "option-b", "label": "Short Label", "description": "One sentence." }
      ]
    }
  ]
}`

export type QuestionTrigger = 'first_message' | 'ambiguous_feature'

/**
 * Generate planning questions for a prompt.
 * Uses different system prompts depending on whether this is the first message
 * or a mid-conversation ambiguous feature request.
 * Falls back to an empty array on any error — generation must never block.
 */
export async function generatePlanningQuestions(
  userPrompt: string,
  modelId: string,
  provider: string,
  scaffoldName: string | null,
  trigger: QuestionTrigger = 'first_message',
): Promise<ScopingQuestion[]> {
  try {
    const model = resolveModel(modelId, provider)
    if (!model) {
      console.warn('[planning-agent] Model not available, skipping questions')
      return []
    }

    const systemPrompt = trigger === 'first_message'
      ? FIRST_MESSAGE_SYSTEM_PROMPT
      : MID_CONVERSATION_SYSTEM_PROMPT

    const scaffoldContext = scaffoldName
      ? `Matched scaffold template: "${scaffoldName}".`
      : ''

    const userContext = trigger === 'first_message'
      ? `User's first prompt: "${userPrompt}"\n\n${scaffoldContext}`
      : `User's feature request: "${userPrompt}"\n\n${scaffoldContext}`

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userContext,
      maxOutputTokens: 800,
      temperature: 0.3,
    })

    // Extract JSON — the model might wrap it in backticks despite instructions
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[planning-agent] No JSON found in response')
      return []
    }

    const parsed = JSON.parse(jsonMatch[0]) as { questions?: ScopingQuestion[] }
    const questions = parsed.questions ?? []

    // Validate structure — filter out any malformed questions
    return questions.filter(
      (q) =>
        typeof q.id === 'string' &&
        typeof q.text === 'string' &&
        (q.type === 'choice' || q.type === 'text' || q.type === undefined),
    )
  } catch (err) {
    // Planning errors must never block generation — log only
    console.error('[planning-agent] Failed to generate questions:', err)
    return []
  }
}
