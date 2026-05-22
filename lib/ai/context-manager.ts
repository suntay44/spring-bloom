import type { CoreMessage } from 'ai'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'

const VERBATIM_WINDOW = 8   // last N messages sent verbatim
const COMPRESS_AFTER  = 12  // once history exceeds this, compress older msgs
const MAX_MESSAGES    = 30  // hard cap — messages beyond this are dropped

// ─────────────────────────────────────────────────────────────────────────────
// buildContextMessages
// Assembles the context window sent to the LLM from the full DB message list.
// - Last VERBATIM_WINDOW messages → sent verbatim
// - Older messages → replaced by a single compressed summary system message
// - Messages beyond MAX_MESSAGES → silently dropped before summarising
// ─────────────────────────────────────────────────────────────────────────────
export function buildContextMessages(
  dbMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  summary?: string,
  fileTree?: string[]
): CoreMessage[] {
  const result: CoreMessage[] = []

  // If caller already has a precomputed summary, inject it
  if (summary) {
    result.push({
      role: 'system',
      content: `Previous conversation summary:\n${summary}`,
    })
  }

  // Hard cap to avoid runaway context
  const capped = dbMessages.slice(-MAX_MESSAGES)
  const window = capped.slice(-VERBATIM_WINDOW)

  for (const msg of window) {
    result.push({ role: msg.role, content: msg.content })
  }

  if (fileTree && fileTree.length > 0) {
    result.push({
      role: 'system',
      content: `Current project files:\n${fileTree.map((f) => `  ${f}`).join('\n')}`,
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// shouldCompress
// Returns true when the message history is long enough to warrant compression.
// ─────────────────────────────────────────────────────────────────────────────
export function shouldCompress(messageCount: number): boolean {
  return messageCount > COMPRESS_AFTER
}

// ─────────────────────────────────────────────────────────────────────────────
// generateContextSummary
// Summarises the "older" slice of a conversation using Claude Haiku (cheap).
// Only summarises messages OUTSIDE the verbatim window to preserve recency.
// Returns a plain-text technical summary ≤ 300 words.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateContextSummary(
  dbMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  // Only summarise the older portion — the verbatim window is sent as-is
  const olderMessages = dbMessages.slice(0, -VERBATIM_WINDOW)
  if (olderMessages.length === 0) return ''

  const transcript = olderMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5'),
    maxOutputTokens: 512,
    system: `You are a technical scribe summarising a software development conversation.
Produce a concise, factual summary (max 250 words) covering:
- What the user is building (app type, stack, key features)
- What has already been built and is working
- Any constraints, preferences, or design decisions made
- The current state the codebase is in
Write in past tense. Be specific about technology choices and file names.
Never include opinions. Output plain text only.`,
    messages: [
      { role: 'user', content: `Summarise this conversation:\n\n${transcript}` },
    ],
  })

  return text.trim()
}
