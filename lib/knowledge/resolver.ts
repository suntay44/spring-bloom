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

// ── In-process cache for project-level knowledge ──
// R0-3: avoid waking the Fly machine on every chat turn just to cat AGENTS.md.
// TTL kept short (60s) so edits flow through quickly; can be invalidated
// explicitly via invalidateKnowledgeCache(machineId) when files change.
interface CacheEntry { content: string; fetchedAt: number }
const KNOWLEDGE_CACHE = new Map<string, CacheEntry>()
const KNOWLEDGE_TTL_MS = 60_000   // 60 seconds

export function invalidateKnowledgeCache(machineId: string): void {
  KNOWLEDGE_CACHE.delete(machineId)
}

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
  // ── R0-3: serve from cache if fresh ──
  const cached = KNOWLEDGE_CACHE.get(machineId)
  if (cached && Date.now() - cached.fetchedAt < KNOWLEDGE_TTL_MS) {
    return cached.content
  }

  // Cache miss: do ONE Fly exec that tries all candidate paths in one round-trip
  // (was previously a loop of up to 5 separate exec calls — each wakes the suspended VM).
  const tryScript = KNOWLEDGE_FILE_CANDIDATES
    .map(p => `[ -s /app/"${p}" ] && cat /app/"${p}" && exit 0`)
    .join('; ') + '; exit 0'

  let content = ''
  try {
    const result = await execOnMachine(machineId, ['sh', '-c', tryScript], '/app', 5)
    content = result.stdout ?? ''
  } catch {
    content = ''
  }

  KNOWLEDGE_CACHE.set(machineId, { content, fetchedAt: Date.now() })
  return content
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 32) + '\n…[knowledge truncated]'
}
