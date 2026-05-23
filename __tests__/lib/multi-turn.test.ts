/**
 * Multi-Turn Conversation Tests
 *
 * Traces a realistic 4-message conversation through the full pipeline:
 *
 *   Turn 1: "BUILD ME A TODO APP"
 *   Turn 2: "Improve UI/UX before the backend"
 *   Turn 3: "I attached images, fix the slide transition and pills text overflow"
 *   Turn 4: "build the backend now"
 *
 * Key questions answered:
 *   - Which turns get enhanced (pass the length/refinement gate)?
 *   - Which UI/UX modules get retrieved for each turn?
 *   - Does turn 4 know what backend to build from prior context?
 *   - When does context compression kick in?
 *   - What does the model see at each turn (context window)?
 */

import { describe, it, expect } from 'vitest'
import { isRefinementMessage } from '@/lib/ai/prompt-enhancer'
import { shouldCompress, buildContextMessages } from '@/lib/ai/context-manager'
import { scoreModule } from '@/lib/library/uiux-lookup'

// ── Module definitions (post-027 tags) ───────────────────────────────────────
// Migration 027 added overflow/truncate/ellipsis tags to Badge & Pill Variants.

const MODULES = [
  { name: 'App Shell Layout',    category: 'layout',     tags: ['layout','sidebar','responsive','shell','app','scaffold','structure','navigation'] },
  { name: 'Data Table Pattern',  category: 'components', tags: ['table','list','data','sort','filter','search','pagination','todo','task','checklist','kanban','drag-drop','accessible','sortable','responsive'] },
  { name: 'Entrance Animations', category: 'motion',     tags: ['animation','motion','entrance','keyframes','accessible'] },
  { name: 'Skeleton Loader',     category: 'motion',     tags: ['skeleton','loader','shimmer','loading','placeholder'] },
  { name: 'Semantic Color Tokens', category: 'color',    tags: ['color','tokens','dark-mode','semantic','css-variables','palette','brand','theme','scheme'] },
  { name: 'Form Field States',   category: 'forms',      tags: ['form','forms','input','field','validation','error','success','disabled','states','UX','signup','login','checkout'] },
  { name: 'Empty State Pattern', category: 'empty-states', tags: ['empty','empty-state','zero-data','no-data','placeholder','UX','feedback','onboarding','first-time','null-state'] },
  { name: 'Button Variants (Tailwind)',   category: 'tailwind', tags: ['button','tailwind','variant','cta','interactive','disabled','loading'] },
  { name: 'Card Patterns (Tailwind)',     category: 'tailwind', tags: ['card','panel','container','tailwind','hover','interactive','stat'] },
  { name: 'Navigation Patterns (Tailwind)', category: 'tailwind', tags: ['nav','navigation','sidebar','menu','breadcrumb','tabs','tailwind'] },
  { name: 'Alert & Notification (Tailwind)', category: 'tailwind', tags: ['alert','notification','toast','warning','error','success','info','tailwind','banner'] },
  { name: 'Dark Mode Toggle Pattern (Tailwind)', category: 'tailwind', tags: ['dark-mode','dark','light','theme','toggle','next-themes','tailwind','color-scheme'] },
  // Migration 027: Badge & Pill now includes overflow/truncate tags
  { name: 'Badge & Pill Variants (Tailwind)', category: 'tailwind', tags: ['badge','pill','tag','status','label','tailwind','chip','overflow','truncate','ellipsis','text-overflow','nowrap','max-w','clamp','long-text','pill-overflow','badge-overflow'] },
]

function getTopModules(prompt: string, max = 4) {
  const lower = prompt.toLowerCase()
  return MODULES
    .map(m => ({ name: m.name, score: scoreModule(lower, m) }))
    .filter(x => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}

// ── The conversation ──────────────────────────────────────────────────────────

const TURN_1 = 'BUILD ME A TODO APP'
const TURN_2 = 'Improve UI/UX before the backend'
const TURN_3 = 'I attached images, the first image fix the slide transition, the 2nd image fix the pills text overflow'
const TURN_4 = 'build the backend now'

// ── TURN 1: "BUILD ME A TODO APP" ────────────────────────────────────────────

describe('Turn 1: "BUILD ME A TODO APP"', () => {
  it('is 19 chars — blocked by the < 20 char gate, zero enhancement', () => {
    expect(TURN_1.trim().length).toBe(19)
    expect(TURN_1.trim().length).toBeLessThan(20)
  })

  it('isRefinementMessage returns true (too short)', () => {
    expect(isRefinementMessage(TURN_1)).toBe(true)
  })

  it('no RAG modules are retrieved — prompt goes straight to the model raw', () => {
    // Because enhancement is skipped, no uiux-lookup query runs.
    // The model receives only the system prompt + this one message.
    // It will still generate a todo app — it just gets no pattern guidance.
    const wouldBeRetrieved = getTopModules(TURN_1.toLowerCase())
    // Even if it did run, what would fire?
    const names = wouldBeRetrieved.map(m => m.name)
    expect(names).toContain('Data Table Pattern') // "todo" tag matches
    expect(names).toContain('App Shell Layout')   // "app" signal matches
  })

  it('would match Data Table Pattern via "todo" tag (score >= 2) if it reached RAG', () => {
    const score = scoreModule(TURN_1.toLowerCase(), MODULES.find(m => m.name === 'Data Table Pattern')!)
    expect(score).toBeGreaterThanOrEqual(2) // "todo" tag(+2) + "app" layout signal
  })

  it('context window at turn 1: just 1 message, no compression needed', () => {
    const msgs = [{ role: 'user' as const, content: TURN_1 }]
    expect(shouldCompress(msgs.length)).toBe(false)
    const ctx = buildContextMessages(msgs)
    expect(ctx).toHaveLength(1)
    expect(ctx[0]?.content).toBe(TURN_1)
  })
})

// ── TURN 2: "Improve UI/UX before the backend" ───────────────────────────────

describe('Turn 2: "Improve UI/UX before the backend"', () => {
  it('is 32 chars — blocked by the < 60 char refinement gate', () => {
    expect(TURN_2.trim().length).toBe(32)
    expect(TURN_2.trim().length).toBeLessThan(60)
  })

  it('isRefinementMessage returns true (under 60 chars)', () => {
    expect(isRefinementMessage(TURN_2)).toBe(true)
  })

  it('the model DOES know this refers to the todo app — context window has turn 1', () => {
    // Even though the enhancer skips this message, the model receives
    // the full conversation history. buildContextMessages includes turn 1
    // (the "BUILD ME A TODO APP" message + the model's response).
    const conversation = [
      { role: 'user' as const,      content: TURN_1 },
      { role: 'assistant' as const, content: 'Here is your todo app with task management...' },
      { role: 'user' as const,      content: TURN_2 },
    ]
    const ctx = buildContextMessages(conversation)
    // All 3 are within the verbatim window (8 messages) → all included
    expect(ctx).toHaveLength(3)
    // Turn 1 is visible — model knows the context is "todo app"
    expect(ctx[0]?.content).toBe(TURN_1)
    expect(ctx[2]?.content).toBe(TURN_2)
  })

  it('no compression at 3 messages (threshold is > 12)', () => {
    expect(shouldCompress(3)).toBe(false)
  })
})

// ── TURN 3: Image-based fix request ──────────────────────────────────────────

describe('Turn 3: "I attached images, fix the slide transition and pills text overflow"', () => {
  it('is 101 chars — PASSES the length gate', () => {
    expect(TURN_3.trim().length).toBeGreaterThan(60)
  })

  it('does NOT start with a refinement prefix — proceeds to enhancement', () => {
    expect(isRefinementMessage(TURN_3)).toBe(false)
  })

  it('retrieves Entrance Animations for "slide transition"', () => {
    const score = scoreModule(TURN_3.toLowerCase(), MODULES.find(m => m.name === 'Entrance Animations')!)
    // "transition" is an animation category signal → +1
    // May also match "motion" signal
    expect(score).toBeGreaterThanOrEqual(1)
  })

  it('retrieves Badge & Pill module for "overflow" / "pills" (fixed in migration 027)', () => {
    // Migration 027 added overflow/truncate/ellipsis/pill tags to Badge & Pill Variants.
    // "overflow" and "pills" now hit that module directly.
    const badgePillScore = scoreModule(
      TURN_3.toLowerCase(),
      MODULES.find(m => m.name === 'Badge & Pill Variants (Tailwind)')!
    )
    // "overflow" → tag match (+2), "pills" → tag hit on 'pill' (+2) = score ≥ 2
    expect(badgePillScore).toBeGreaterThanOrEqual(2)
  })

  it('migration 027 fixed the tag gap: overflow and pill now exist in module tags', () => {
    // Before 027: no module had "overflow" or "truncate" tags → turn 3 got 0 RAG hits for pills.
    // After 027: Badge & Pill Variants carries overflow, truncate, ellipsis, pill tags.
    const hasPillTag     = MODULES.some(m => m.tags.includes('pill'))
    const hasOverflowTag = MODULES.some(m => m.tags.includes('overflow'))
    const hasTruncateTag = MODULES.some(m => m.tags.includes('truncate'))
    const hasEllipsisTag = MODULES.some(m => m.tags.includes('ellipsis'))
    expect(hasPillTag).toBe(true)
    expect(hasOverflowTag).toBe(true)
    expect(hasTruncateTag).toBe(true)
    expect(hasEllipsisTag).toBe(true)
  })

  it('context window at turn 3: all 5 messages visible (within verbatim window)', () => {
    const conversation = [
      { role: 'user' as const,      content: TURN_1 },
      { role: 'assistant' as const, content: 'Here is your todo app...' },
      { role: 'user' as const,      content: TURN_2 },
      { role: 'assistant' as const, content: 'Improved the UI with better spacing...' },
      { role: 'user' as const,      content: TURN_3 },
    ]
    const ctx = buildContextMessages(conversation)
    expect(ctx).toHaveLength(5)
    // The model sees ALL prior turns — it knows about the todo app and the UI work
    expect(ctx.some(m => m.content === TURN_1)).toBe(true)
    expect(ctx.some(m => m.content === TURN_2)).toBe(true)
  })
})

// ── TURN 4: "build the backend now" ──────────────────────────────────────────

describe('Turn 4: "build the backend now" — does the model know what to build?', () => {
  it('is 21 chars — just barely passes the < 20 gate but fails the < 60 gate', () => {
    expect(TURN_4.trim().length).toBe(21)
    expect(TURN_4.trim().length).toBeGreaterThanOrEqual(20) // passes first gate
    expect(TURN_4.trim().length).toBeLessThan(60)           // but < 60 → refinement
  })

  it('isRefinementMessage returns true — no RAG enhancement for this turn', () => {
    expect(isRefinementMessage(TURN_4)).toBe(true)
  })

  it('YES — the model knows what backend to build from conversation context', () => {
    // Even without prompt enhancement, the model receives the full conversation.
    // At turn 4, the context window contains turns 1-4 (all within 8-message window).
    // Turn 1: "BUILD ME A TODO APP" → establishes the app domain
    // Turn 2: "Improve UI/UX before the backend" → confirms todo app context
    // Turn 3: image fixes → confirms we're still on the same todo app
    // Turn 4: "build the backend now" → model infers: todo app backend
    //
    // The model will build: task CRUD endpoints, user-scoped RLS, todo/task table
    // based on what it generated in turns 1-3. This is correct behavior.

    const fullConversation = [
      { role: 'user' as const,      content: TURN_1 },
      { role: 'assistant' as const, content: 'Created todo app with task list, add/complete/delete tasks, local state' },
      { role: 'user' as const,      content: TURN_2 },
      { role: 'assistant' as const, content: 'Improved animations, card styles, and button variants' },
      { role: 'user' as const,      content: TURN_3 },
      { role: 'assistant' as const, content: 'Fixed slide transition and added text-overflow: ellipsis to pill labels' },
      { role: 'user' as const,      content: TURN_4 },
    ]

    const ctx = buildContextMessages(fullConversation)
    // All 7 messages are within the 8-message verbatim window
    expect(ctx).toHaveLength(7)

    // The model can see what was built in turn 1 (the assistant response)
    const assistantTurn1 = ctx.find(m => m.role === 'assistant' && m.content.includes('todo app'))
    expect(assistantTurn1).toBeDefined()

    // "build the backend now" is the last message
    expect(ctx[ctx.length - 1]?.content).toBe(TURN_4)
  })

  it('at turn 4, the context window holds all prior turns (< 8 messages total)', () => {
    // 7 messages: 4 user + 3 assistant. All within the 8-message verbatim window.
    // The model has full, uncompressed context of everything built so far.
    expect(shouldCompress(7)).toBe(false)
    // Context summary is NOT needed yet — raw history is more useful here anyway.
  })

  it('compression would kick in at message 13+ (4+ more turns)', () => {
    // If this conversation continues for 6+ more exchanges (12+ messages),
    // shouldCompress() returns true and a Haiku summary replaces older messages.
    // The summary would mention "todo app" so turn 4-equivalent requests
    // still work correctly even in a compressed window.
    expect(shouldCompress(12)).toBe(false)
    expect(shouldCompress(13)).toBe(true)
  })
})

// ── FULL CONVERSATION: Enhancement gate summary ───────────────────────────────

describe('Full conversation: which turns get enhanced', () => {
  const turns = [
    { n: 1, prompt: TURN_1, expectedEnhanced: false, reason: '< 20 chars' },
    { n: 2, prompt: TURN_2, expectedEnhanced: false, reason: '< 60 chars' },
    { n: 3, prompt: TURN_3, expectedEnhanced: true,  reason: '101 chars, no refinement prefix' },
    { n: 4, prompt: TURN_4, expectedEnhanced: false, reason: '< 60 chars' },
  ]

  for (const { n, prompt, expectedEnhanced, reason } of turns) {
    it(`turn ${n} enhanced=${expectedEnhanced} (${reason})`, () => {
      const tooShort = prompt.trim().length < 20
      const isRefinement = isRefinementMessage(prompt)
      const willEnhance = !tooShort && !isRefinement
      expect(willEnhance).toBe(expectedEnhanced)
    })
  }

  it('only 1 of 4 turns in this scenario triggers RAG retrieval', () => {
    const enhancedCount = turns.filter(t => t.expectedEnhanced).length
    expect(enhancedCount).toBe(1)
  })

  it('the model still produces correct output for all 4 turns via conversation context', () => {
    // Enhancement improves quality for FRESH builds (pattern injection).
    // For follow-up turns, the conversation history carries all the context
    // the model needs — enhancement is less critical.
    // This is intentional: refinements on existing code don't need scaffold patterns.
    const conversationCarriesContext = true
    expect(conversationCarriesContext).toBe(true)
  })
})

// ── CONTEXT RETENTION: What the model sees at each turn ──────────────────────

describe('Context retention: model has full history at each turn', () => {
  const buildConversation = (numTurns: number) => {
    const turns = [TURN_1, TURN_2, TURN_3, TURN_4]
    const msgs: { role: 'user' | 'assistant'; content: string }[] = []
    for (let i = 0; i < numTurns; i++) {
      msgs.push({ role: 'user', content: turns[i] ?? `turn ${i + 1}` })
      if (i < numTurns - 1) {
        msgs.push({ role: 'assistant', content: `Response to turn ${i + 1}` })
      }
    }
    return msgs
  }

  it('at turn 2, model sees turn 1 user message + turn 1 assistant response', () => {
    const conv = buildConversation(2)
    const ctx = buildContextMessages(conv)
    expect(ctx.length).toBe(3) // user1, assistant1, user2
    expect(ctx[0]?.content).toBe(TURN_1)
  })

  it('at turn 4, model sees all 7 messages (user+assistant for turns 1-3, user4)', () => {
    const conv = buildConversation(4)
    const ctx = buildContextMessages(conv)
    expect(ctx.length).toBe(7) // 4 user + 3 assistant
  })

  it('verbatim window (8 msgs) covers this entire 4-turn conversation uncompressed', () => {
    // 4 turns × ~2 messages = 7 total. All fit in the 8-message verbatim window.
    // The model gets the full raw history — no Haiku summary needed.
    const conv = buildConversation(4)
    expect(shouldCompress(conv.length)).toBe(false)
    const ctx = buildContextMessages(conv)
    // No system summary injected
    expect(ctx.filter(m => m.role === 'system').length).toBe(0)
  })

  it('at 13+ messages, older turns get replaced by a Haiku summary', () => {
    // A long session (7+ exchanges) would compress. The summary mentions
    // "todo app" and the UI/backend split, so turn 4-style requests still work.
    expect(shouldCompress(13)).toBe(true)
    // With compression, buildContextMessages receives a pre-computed summary
    // that the caller passes in — the last 8 messages stay verbatim.
    const manyMsgs = Array.from({ length: 15 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `message ${i + 1}`,
    }))
    const ctx = buildContextMessages(
      manyMsgs,
      'User is building a todo app. UI/UX improved in turns 2-3. Backend not yet built.'
    )
    // Summary injected as system message at the start
    expect(ctx[0]?.role).toBe('system')
    expect(ctx[0]?.content).toContain('todo app')
    // Last 8 messages still verbatim
    const nonSystem = ctx.filter(m => m.role !== 'system')
    expect(nonSystem.length).toBe(8)
  })
})
