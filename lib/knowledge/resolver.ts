/**
 * Knowledge Resolver — three-tier context loading for the builder.
 *
 * On every chat turn we want to inject:
 *
 *   1. user_knowledge.content     (from DB, user-level preferences)
 *   2. The project's AGENTS.md    (from Fly machine filesystem, project-level)
 *   3. (Future) Top-K RAG chunks from knowledge_docs
 *
 * Project file wins over user knowledge for conflicting rules — the project's
 * AGENTS.md is closer to the work and more specific.
 *
 * We cap the total token budget so we don't blow out the context window.
 * Anything beyond the budget gets routed through RAG later.
 */

import { execOnMachine } from '@/lib/fly/client'

export interface ResolvedKnowledge {
  userBlock:    string         // tagged user-level prefs
  projectBlock: string         // tagged project AGENTS.md content
  totalChars:   number
}

export interface ResolveInput {
  userKnowledge?: string | null
  machineId?:    string | null
  maxChars?:     number          // default 6000 chars (~1500 tokens)
}

const DEFAULT_MAX_CHARS = 6000

// Candidate paths to look for in the project repo, in priority order
const KNOWLEDGE_FILE_CANDIDATES = [
  'AGENTS.md',
  '.springbloom/AGENTS.md',
  'CLAUDE.md',
  '.cursor/rules/main.mdc',
  '.cursorrules',
]

export async function resolveKnowledge(input: ResolveInput): Promise<ResolvedKnowledge> {
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS

  const userContent    = (input.userKnowledge ?? '').trim()
  const projectContent = input.machineId
    ? await fetchProjectKnowledge(input.machineId)
    : ''

  // Allocate budget: project gets 60%, user gets 40% (project is more specific)
  const projectBudget = Math.floor(maxChars * 0.6)
  const userBudget    = maxChars - projectBudget

  const trimmedProject = truncate(projectContent, projectBudget)
  const trimmedUser    = truncate(userContent,    userBudget)

  const userBlock = trimmedUser
    ? `USER PREFERENCES (apply to every project this user builds):\n${trimmedUser}`
    : ''
  const projectBlock = trimmedProject
    ? `PROJECT KNOWLEDGE (from this project's AGENTS.md):\n${trimmedProject}`
    : ''

  return {
    userBlock,
    projectBlock,
    totalChars: trimmedUser.length + trimmedProject.length,
  }
}

/**
 * Merge resolved knowledge into a system prompt. Order matters: user prefs
 * first (general), then project (specific) so the project section overrides
 * conflicting rules through recency bias.
 */
export function injectKnowledge(systemPrompt: string, k: ResolvedKnowledge): string {
  const blocks = [k.userBlock, k.projectBlock].filter(Boolean)
  if (blocks.length === 0) return systemPrompt
  return [systemPrompt, '', ...blocks].join('\n\n')
}

// ─── Project-level fetch ────────────────────────────────────────────────────

async function fetchProjectKnowledge(machineId: string): Promise<string> {
  for (const candidate of KNOWLEDGE_FILE_CANDIDATES) {
    try {
      // Note: execOnMachine has a 30s default timeout; cat is instant. Use 5s.
      const result = await execOnMachine(
        machineId,
        ['sh', '-c', `cat /app/"$1" 2>/dev/null || true`, '--', candidate],
        '/app',
        5,
      )
      if (result.stdout && result.stdout.trim().length > 0) {
        return result.stdout
      }
    } catch {
      // Try next candidate
    }
  }
  return ''
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 32) + '\n…[knowledge truncated]'
}
