/**
 * Phase 19 — Structural Fingerprinter
 *
 * Extracts a BuildFingerprint from a user prompt + generated artifact text.
 * The fingerprint captures STRUCTURAL intent (what kind of app, what operations,
 * what data shape) — NOT content, colors, or specifics.
 *
 * Used silently in onFinish after each generation. Runs in the background and
 * never blocks the user-facing stream.
 */

import type { BuildFingerprint } from './types'

// ── Keyword maps ──────────────────────────────────────────────────────────────

const UI_PATTERN_KEYWORDS: Record<string, string[]> = {
  'list-view':       ['list', 'items', 'row', 'table', 'feed', 'timeline', 'entries', 'records'],
  'kanban':          ['kanban', 'board', 'column', 'drag', 'drop', 'card', 'lane', 'stage'],
  'form':            ['form', 'input', 'submit', 'field', 'fill', 'enter', 'create new'],
  'detail-view':     ['detail', 'profile', 'page', 'view', 'show', 'expand', 'open'],
  'grid':            ['grid', 'gallery', 'tiles', 'mosaic', 'masonry'],
  'chart':           ['chart', 'graph', 'analytics', 'stats', 'metric', 'dashboard'],
  'map':             ['map', 'location', 'marker', 'geolocation', 'coordinates', 'nearby'],
  'calendar':        ['calendar', 'schedule', 'event', 'booking', 'date picker', 'availability'],
  'item-toggle':     ['toggle', 'check', 'checkbox', 'complete', 'done', 'mark'],
  'add-form':        ['add', 'new', 'create', 'insert', 'plus', 'append'],
  'search':          ['search', 'filter', 'find', 'query', 'lookup'],
  'modal':           ['modal', 'dialog', 'popup', 'overlay', 'sheet'],
  'infinite-scroll': ['infinite', 'load more', 'pagination', 'scroll'],
  'upload':          ['upload', 'file', 'image', 'attachment', 'drag and drop'],
}

const DATA_SHAPE_KEYWORDS: Record<string, string[]> = {
  'id':               ['id', 'identifier', 'uuid'],
  'text':             ['title', 'name', 'description', 'note', 'content', 'message', 'text'],
  'boolean-state':    ['done', 'complete', 'active', 'enabled', 'toggle', 'checked', 'status'],
  'timestamp':        ['date', 'time', 'created', 'updated', 'due', 'deadline', 'timestamp'],
  'user-ref':         ['user', 'author', 'owner', 'assigned', 'created by', 'member'],
  'amount':           ['price', 'amount', 'cost', 'balance', 'total', 'quantity', 'count'],
  'category':         ['category', 'tag', 'label', 'type', 'group', 'collection'],
  'url':              ['url', 'link', 'image url', 'avatar', 'photo'],
  'location':         ['location', 'address', 'city', 'lat', 'lng', 'coordinates'],
  'rich-content':     ['markdown', 'html', 'rich text', 'editor', 'wysiwyg'],
}

const OPERATION_KEYWORDS: Record<string, string[]> = {
  'create':   ['create', 'add', 'new', 'insert', 'post', 'write', 'submit', 'save'],
  'read':     ['list', 'view', 'show', 'display', 'fetch', 'load', 'get', 'browse'],
  'update':   ['edit', 'update', 'change', 'modify', 'rename', 'move', 'reorder'],
  'delete':   ['delete', 'remove', 'clear', 'trash', 'archive', 'discard'],
  'toggle':   ['toggle', 'mark', 'check', 'complete', 'enable', 'disable', 'activate'],
  'search':   ['search', 'filter', 'find', 'query', 'sort', 'lookup'],
  'share':    ['share', 'invite', 'collaborate', 'export', 'send'],
  'upload':   ['upload', 'import', 'attach', 'drag', 'file'],
  'download': ['download', 'export', 'save', 'pdf', 'csv'],
  'auth':     ['login', 'signup', 'register', 'authenticate', 'sign in', 'sign out'],
}

const NAVIGATION_KEYWORDS: Record<string, string[]> = {
  'single-screen': ['single', 'one page', 'simple', 'basic', 'minimal', 'todo', 'list'],
  'tab-bar':       ['tabs', 'tab bar', 'bottom nav', 'sections', 'home feed settings'],
  'stack':         ['detail', 'drill down', 'back', 'nested', 'navigate to'],
  'drawer':        ['drawer', 'sidebar', 'menu', 'hamburger'],
  'modal-flow':    ['wizard', 'steps', 'onboarding', 'flow', 'multi-step'],
}

const PERSISTENCE_KEYWORDS: Record<string, string[]> = {
  'supabase':      ['supabase', 'postgres', 'database', 'backend', 'api', 'server', 'db'],
  'local-storage': ['local', 'offline', 'device', 'localStorage', 'no backend', 'client'],
  'api':           ['rest api', 'fetch', 'endpoint', 'external api', 'third-party'],
  'firebase':      ['firebase', 'firestore', 'realtime database'],
  'none':          ['static', 'hardcoded', 'mockdata', 'no data', 'display only'],
}

const MODULE_KEYWORDS: Record<string, string[]> = {
  'auth':          ['login', 'signup', 'auth', 'user account', 'password', 'session'],
  'payments':      ['payment', 'stripe', 'checkout', 'subscribe', 'billing', 'purchase'],
  'notifications': ['notification', 'push', 'alert', 'email', 'reminder', 'message'],
  'search':        ['search bar', 'full-text', 'filter panel', 'search results'],
  'analytics':     ['analytics', 'chart', 'dashboard', 'metrics', 'stats', 'insights'],
  'profile':       ['profile', 'account settings', 'avatar', 'bio', 'preferences'],
  'file-upload':   ['upload', 'file manager', 'storage', 'image picker', 'attachment'],
  'maps':          ['map', 'location', 'geolocation', 'directions', 'nearby'],
  'social':        ['follow', 'like', 'comment', 'share', 'social', 'feed', 'reactions'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

function matchKeywords(
  text: string,
  keywordMap: Record<string, string[]>,
  maxResults = 5,
): string[] {
  const matches: string[] = []
  for (const [pattern, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      matches.push(pattern)
      if (matches.length >= maxResults) break
    }
  }
  return matches
}

function bestMatch(
  text: string,
  keywordMap: Record<string, string[]>,
  fallback: string,
): string {
  for (const [pattern, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => text.includes(kw))) return pattern
  }
  return fallback
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Extract a structural fingerprint from the user prompt and (optionally) the
 * generated artifact text. This is a fast, in-process, keyword-based extraction
 * suitable for Day 0 with zero latency cost.
 *
 * Future upgrade path: replace with a haiku LLM call once traffic justifies it.
 */
export function extractFingerprint(
  userPrompt: string,
  artifactText?: string,
): BuildFingerprint {
  // Combine prompt + artifact snippet for richer signal
  const corpus = normalise(
    [userPrompt, artifactText?.slice(0, 3000) ?? ''].join(' ')
  )

  return {
    ui_patterns: matchKeywords(corpus, UI_PATTERN_KEYWORDS, 5),
    data_shape:  matchKeywords(corpus, DATA_SHAPE_KEYWORDS, 6),
    operations:  matchKeywords(corpus, OPERATION_KEYWORDS, 6),
    navigation:  bestMatch(corpus, NAVIGATION_KEYWORDS, 'single-screen'),
    persistence: bestMatch(corpus, PERSISTENCE_KEYWORDS, 'supabase'),
    modules:     matchKeywords(corpus, MODULE_KEYWORDS, 8),
  }
}

/**
 * Compute a similarity score between two fingerprints (0 = no overlap, 1 = identical).
 *
 * Uses Jaccard similarity on the set fields and exact match on the scalar fields.
 */
export function fingerprintSimilarity(a: BuildFingerprint, b: BuildFingerprint): number {
  function jaccard(setA: string[], setB: string[]): number {
    if (setA.length === 0 && setB.length === 0) return 1
    const sa = new Set(setA)
    const sb = new Set(setB)
    const intersection = [...sa].filter(x => sb.has(x)).length
    const union = new Set([...sa, ...sb]).size
    return union === 0 ? 0 : intersection / union
  }

  const scores = [
    jaccard(a.ui_patterns, b.ui_patterns) * 0.25,
    jaccard(a.data_shape,  b.data_shape)  * 0.20,
    jaccard(a.operations,  b.operations)  * 0.20,
    (a.navigation  === b.navigation  ? 1 : 0) * 0.15,
    (a.persistence === b.persistence ? 1 : 0) * 0.10,
    jaccard(a.modules, b.modules)          * 0.10,
  ]

  return scores.reduce((acc, s) => acc + s, 0)
}
