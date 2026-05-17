import type { CoreMessage } from 'ai'

const VERBATIM_WINDOW = 8      // keep last N messages in full
const MAX_MESSAGES = 30        // messages beyond this are dropped from context

// Takes the full message history from DB and returns the context window to send to the AI.
// - Last 8 messages: verbatim
// - Messages 9-30: summarized as a single system message (summary passed in, caller generates it)
// - Messages beyond 30: dropped
export function buildContextMessages(
  dbMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  summary?: string,
  fileTree?: string[]
): CoreMessage[] {
  const result: CoreMessage[] = []

  // Optional summary of older messages
  if (summary) {
    result.push({
      role: 'system',
      content: `Previous conversation summary:\n${summary}`,
    })
  }

  // Verbatim last N messages (up to MAX_MESSAGES total window)
  const window = dbMessages.slice(-Math.min(VERBATIM_WINDOW, MAX_MESSAGES))
  for (const msg of window) {
    result.push({ role: msg.role, content: msg.content })
  }

  // Always append current file tree as last system message
  if (fileTree && fileTree.length > 0) {
    result.push({
      role: 'system',
      content: `Current project files:\n${fileTree.map((f) => `  ${f}`).join('\n')}`,
    })
  }

  return result
}
