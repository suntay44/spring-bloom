/**
 * POST /api/enhance-prompt
 *   Body: { prompt: string }
 *   Returns: { enhanced: string }
 *
 * User-facing, explicit prompt improvement (the Enhance button in the
 * composer). Distinct from the SILENT server-side enhancer in the chat route:
 * this one returns a sharper rewrite for the user to see + accept/undo.
 *
 * Uses Claude Haiku — ~$0.001 per click. Opt-in only (button press).
 * Falls back to the original prompt on any error so the UI never breaks.
 */

import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { resolveModel } from '@/lib/ai/providers'

const SYSTEM = `You rewrite a user's app-building prompt to be clearer and more specific, so an AI app builder produces a better result.

Rules:
- Keep the user's ORIGINAL intent. Don't invent features they didn't ask for.
- Make it concrete: clarify the WHAT (features, pages, data) and the HOW (behavior, layout, key states).
- Keep it concise — 1-3 sentences, not an essay. No preamble, no markdown, no bullet lists.
- Don't add tech-stack choices unless the user implied them.
- Output ONLY the improved prompt text. Nothing else.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { prompt?: string }
  const prompt = (body.prompt ?? '').trim()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })
  if (prompt.length > 2000) {
    // Already long — nothing to enhance; return as-is.
    return NextResponse.json({ enhanced: prompt, unchanged: true })
  }

  try {
    const model = resolveModel('claude-haiku-4-5', 'anthropic')
    if (!model) return NextResponse.json({ enhanced: prompt, unchanged: true })

    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: `Improve this prompt:\n\n"${prompt}"`,
      maxOutputTokens: 300,
      temperature: 0.4,
    })

    const enhanced = text.trim().replace(/^["']|["']$/g, '')  // strip wrapping quotes
    if (!enhanced || enhanced.length < 3) {
      return NextResponse.json({ enhanced: prompt, unchanged: true })
    }
    return NextResponse.json({ enhanced })
  } catch (err) {
    console.warn('[enhance-prompt] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ enhanced: prompt, unchanged: true })
  }
}
