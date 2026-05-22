/**
 * Phase 19 — Mobile Prompt Enhancer
 *
 * Expands a vague mobile-app prompt into a precise technical spec.
 * Uses claude-haiku for speed (<400ms typical).
 *
 * Mobile knows:
 *  - Native navigation patterns (bottom tabs vs stack navigator)
 *  - Device APIs (camera, GPS, push notifications, haptics)
 *  - Touch gestures, swipe actions, pull-to-refresh
 *  - Expo / React Native / NativeWind conventions
 *  - App store considerations
 *
 * Rules:
 *  - Extract ONLY explicitly requested features — nothing assumed or added
 *  - Do not invent permissions, device APIs, or platform features not mentioned
 *  - Output is a replacement prompt, not a conversation reply
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MOBILE_ENHANCER_SYSTEM = `You are a technical prompt enhancer for a mobile app AI code generator using Expo / React Native.

Your job: take a user's vague prompt and expand it into a precise, actionable technical specification that a senior React Native developer would immediately understand.

RULES (strict):
1. Extract ONLY explicitly stated features. Never add "nice-to-haves" the user did not mention.
2. Do NOT assume device permissions (camera, location, notifications) unless the user stated them.
3. Do NOT add authentication, payments, or any feature not mentioned.
4. Output a single enhanced prompt string — no markdown headers, no bullet lists as output, no commentary.
5. The enhanced prompt must be plain prose that slots directly into a code generation context.
6. Keep it under 400 words.

WHAT TO EXPAND:
- Vague navigation → specific pattern (bottom tabs for 3+ top-level sections, stack for detail screens, drawer for settings-heavy apps)
- Vague UI → specific React Native components (FlatList, ScrollView, Pressable, Modal, ActionSheet)
- Touch interactions → specific gestures (swipe-to-delete on list items, pull-to-refresh on feed, long-press for context menu)
- Vague state → explicit shape (e.g. "messages" → "each message has: id, text: string, sentAt: Date, isRead: boolean")
- Device APIs only if stated: camera → expo-image-picker, GPS → expo-location, push → expo-notifications
- NativeWind for styling, Expo Router for navigation, Supabase JS client for data`

export async function enhanceMobilePrompt(
  userPrompt: string,
  context: {
    framework: string
    projectType: string
    briefAnswers?: Record<string, unknown> | null
  },
  scaffoldContext = '',
  designSystemContext = '',
  uiuxContext = '',
): Promise<string> {
  // If the prompt is already detailed, skip
  if (userPrompt.length > 200 && hasDetailedTerms(userPrompt)) {
    return userPrompt
  }

  try {
    const briefContext = context.briefAnswers
      ? `\n\nProject brief answers from user:\n${JSON.stringify(context.briefAnswers, null, 2)}`
      : ''

    const scaffoldBlock = scaffoldContext
      ? `\n\nLibrary scaffold for this app type (follow this structure):\n${scaffoldContext}`
      : ''

    const designBlock = designSystemContext
      ? `\n\n${designSystemContext}`
      : ''

    const uiuxBlock = uiuxContext
      ? `\n\nUI/UX PATTERNS TO APPLY:\n${uiuxContext}`
      : ''

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      system: MOBILE_ENHANCER_SYSTEM,
      prompt: `Framework: ${context.framework}\nProject type: ${context.projectType}${briefContext}${scaffoldBlock}${designBlock}${uiuxBlock}\n\nUser prompt to enhance:\n"${userPrompt}"\n\nReturn only the enhanced prompt string.`,
      maxOutputTokens: 512,
    })

    const enhanced = text.trim()

    // Safety: if the enhancement is empty or much shorter than original, fall back
    return enhanced.length > userPrompt.length * 0.5 ? enhanced : userPrompt

  } catch (err) {
    // Enhancer failure must never block generation
    console.error('[mobile-enhancer] Failed to enhance prompt:', err)
    return userPrompt
  }
}

function hasDetailedTerms(prompt: string): boolean {
  const technicalTerms = [
    'flatlist', 'scrollview', 'pressable', 'expo router', 'stack', 'tab',
    'react native', 'nativewind', 'stylesheet', 'gesture', 'swipe',
    'supabase', 'typescript', 'interface', 'props', 'usestate',
  ]
  const lower = prompt.toLowerCase()
  return technicalTerms.filter(t => lower.includes(t)).length >= 3
}
