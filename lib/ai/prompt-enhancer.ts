/**
 * Phase 19 — Prompt Enhancer (main entry point)
 *
 * Routes to the web or mobile enhancer based on project type/framework.
 * Falls back to the original prompt on any error — generation must never block.
 *
 * Only enhances the FIRST message or messages that look like a fresh build
 * request (>20 chars, not a short refinement like "make it blue").
 */

import { enhanceWebPrompt } from './web-enhancer'
import { enhanceMobilePrompt } from './mobile-enhancer'
import { lookupTemplate } from '@/lib/library/template-lookup'

export interface EnhancerContext {
  framework: string
  projectType: string
  briefAnswers?: Record<string, unknown> | null
  messageIndex: number // 0 = first message in project
}

/**
 * Enhance the user prompt before passing it to the main generation model.
 * Returns the enhanced prompt, or the original if enhancement is skipped/fails.
 */
export async function enhancePrompt(
  userPrompt: string,
  context: EnhancerContext,
): Promise<string> {
  // Skip enhancement for very short messages (refinements, not builds)
  if (userPrompt.trim().length < 20) return userPrompt

  // Skip if clearly a refinement instruction (starts with action verb on existing UI)
  if (isRefinementMessage(userPrompt)) return userPrompt

  const isMobile =
    context.framework === 'expo' ||
    context.projectType === 'mobile' ||
    context.framework === 'react-native'

  // Look up a matching scaffold template from the library (fast, keyword-based)
  const { context: scaffoldContext, templateName } = await lookupTemplate(userPrompt, isMobile)
  if (templateName) {
    console.info(`[prompt-enhancer] Matched template: ${templateName}`)
  }

  if (isMobile) {
    return enhanceMobilePrompt(userPrompt, context, scaffoldContext)
  }

  return enhanceWebPrompt(userPrompt, context, scaffoldContext)
}

/** Heuristic: short imperative commands on existing UI don't need expansion. */
function isRefinementMessage(prompt: string): boolean {
  const lower = prompt.trim().toLowerCase()

  // Very short messages are refinements
  if (lower.length < 60) return true

  const refinementPrefixes = [
    'make the', 'change the', 'update the', 'fix the', 'move the',
    'rename the', 'delete the', 'remove the', 'add a button', 'add a link',
    'make it', 'change it', 'update it', 'fix it', 'the color',
  ]
  return refinementPrefixes.some(prefix => lower.startsWith(prefix))
}
