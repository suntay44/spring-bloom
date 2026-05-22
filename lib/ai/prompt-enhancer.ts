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
import { retrieveUiuxModules } from '@/lib/library/uiux-lookup'
import { matchDesignSystem, type DesignSystem } from '@/lib/library/design-matcher'

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

  // Run scaffold lookup + UI/UX module retrieval in parallel — both are fast
  // keyword-based DB queries that must never block generation
  const [
    { context: scaffoldContext, templateName },
    { context: uiuxContext, matched: uiuxMatched },
  ] = await Promise.all([
    lookupTemplate(userPrompt, isMobile),
    retrieveUiuxModules(userPrompt),
  ])

  if (templateName) {
    console.info(`[prompt-enhancer] Matched scaffold: ${templateName}`)
  }
  if (uiuxMatched.length) {
    console.info(`[prompt-enhancer] Matched UI/UX modules: ${uiuxMatched.join(', ')}`)
  }

  // Match a design system (colors / style / typography) from the vendored data
  let designSystemContext = ''
  try {
    const ds = matchDesignSystem(userPrompt)
    if (ds) {
      console.info(`[prompt-enhancer] Matched design system: ${ds.productType}`)
      designSystemContext = formatDesignSystemBlock(ds)
    }
  } catch (err) {
    console.error('[prompt-enhancer] design-matcher failed:', err)
  }

  if (isMobile) {
    return enhanceMobilePrompt(userPrompt, context, scaffoldContext, designSystemContext, uiuxContext)
  }

  return enhanceWebPrompt(userPrompt, context, scaffoldContext, designSystemContext, uiuxContext)
}

/** Compact (~150 token) design system block injected into the enhancer prompt. */
function formatDesignSystemBlock(ds: DesignSystem): string {
  const c = ds.colors
  return [
    `DESIGN SYSTEM (matched: ${ds.productType}):`,
    `Colors → primary: ${c.primary}, secondary: ${c.secondary}, accent: ${c.accent}, bg: ${c.background}`,
    `Style → ${ds.style.name}`,
    `Font → Heading: ${ds.typography.heading}, Body: ${ds.typography.body}`,
    `UX rule → ${ds.keyConsiderations}`,
  ].join('\n')
}

/** Heuristic: short imperative commands on existing UI don't need expansion. */
export function isRefinementMessage(prompt: string): boolean {
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
