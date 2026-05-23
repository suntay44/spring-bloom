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

const PLANNING_SYSTEM_PROMPT = `You are a planning agent for a no-code app builder called SpringBloom.
Your job is to generate 3–5 clarifying questions before building an app.

RULES:
- Each question must affect the architecture, schema, or core features — not just styling
- Write for non-developers. No tech jargon (say "user accounts" not "auth", "save to database" not "persist to Supabase")
- Prefer multiple-choice questions with 2–4 options. Each option needs a short description (1 sentence)
- Always include an "Other" option for choice questions so users can type freely
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

/**
 * Generate planning questions for the user's first prompt.
 * Falls back to an empty array on any error — generation must never block.
 */
export async function generatePlanningQuestions(
  userPrompt: string,
  modelId: string,
  provider: string,
  scaffoldName: string | null,
): Promise<ScopingQuestion[]> {
  try {
    const model = resolveModel(modelId, provider)
    if (!model) {
      console.warn('[planning-agent] Model not available, skipping questions')
      return []
    }

    const scaffoldContext = scaffoldName
      ? `The user's prompt matched this scaffold template: "${scaffoldName}".
Use this to ask questions specific to that app type.`
      : 'No specific scaffold template was matched. Ask general purpose questions.'

    const userContext = `User's first prompt: "${userPrompt}"\n\n${scaffoldContext}`

    const { text } = await generateText({
      model,
      system: PLANNING_SYSTEM_PROMPT,
      prompt: userContext,
      maxOutputTokens: 800,
      temperature: 0.3, // low temp = consistent, structured output
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
