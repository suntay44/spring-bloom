/**
 * Phase 19 — Library System Types
 *
 * The library is modelled as a collection of Books and Chapters:
 *   Book    = a scaffold_template (proven structural pattern for a whole app)
 *   Chapter = a scaffold_module   (self-contained, reusable feature module)
 *
 * Templates are NEVER pre-built — they emerge from real usage (≥10 builds,
 * ≥3 distinct app types, avg success score >70).
 */

/** Structural fingerprint extracted from a user prompt + generated artifact. */
export interface BuildFingerprint {
  /** High-level UI component patterns detected (e.g. list-view, kanban, form) */
  ui_patterns: string[]
  /** Shape of the primary data entity (e.g. id, text, boolean-state, timestamp) */
  data_shape: string[]
  /** CRUD-style operations present (e.g. create, read, toggle, delete, search) */
  operations: string[]
  /** Navigation pattern (e.g. single-screen, tab-bar, stack, drawer) */
  navigation: string
  /** Primary persistence mechanism (e.g. supabase, local-storage, api, none) */
  persistence: string
  /** Optional: detected feature modules (e.g. auth, payments, notifications) */
  modules: string[]
}

/** A single recorded AI generation for clustering purposes. */
export interface AppBuild {
  id: string
  project_id: string
  agent_run_id: string | null
  user_id: string
  fingerprint: BuildFingerprint
  success_score: number
  user_continued: boolean
  was_published: boolean
  edits_after: number
  cluster_id: string | null
  created_at: string
}

/** A group of builds sharing a structural fingerprint pattern. */
export interface TemplateCluster {
  id: string
  fingerprint: BuildFingerprint
  build_count: number
  distinct_app_types: number
  avg_success_score: number
  status: 'candidate' | 'canonical' | 'deprecated'
  promoted_at: string | null
  created_at: string
  updated_at: string
}

/** A promoted canonical template (a Book in the library). */
export interface ScaffoldTemplate {
  id: string
  cluster_id: string | null
  name: string
  description: string | null
  category: string
  tags: string[]
  scaffold: TemplateScaffold
  version: number
  times_used: number
  last_used_at: string | null
  status: 'active' | 'deprecated'
}

/** The structural scaffold for a template (NOT content/colors/specifics). */
export interface TemplateScaffold {
  /** Suggested directory/file layout */
  file_structure?: string[]
  /** React state management pattern */
  state_pattern?: string
  /** Key component architecture notes */
  component_architecture?: string[]
  /** Recommended modules to include by default */
  default_modules?: string[]
}

/** A proven micro-module (a Chapter in the library). */
export interface ScaffoldModule {
  id: string
  name: string
  module_type: string
  description: string | null
  tags: string[]
  scaffold: ModuleScaffold
  version: number
  times_used: number
  success_rate: number
  source: 'extracted' | 'handwritten'
  status: 'active' | 'deprecated'
}

/** The scaffold for a single micro-module. */
export interface ModuleScaffold {
  files?: string[]
  patterns?: string[]
  imports?: string[]
  state?: string
}

/** Promotion thresholds — a cluster must meet ALL to become a canonical template. */
export const PROMOTION_THRESHOLDS = {
  min_build_count: 10,
  min_distinct_app_types: 3,
  min_avg_success_score: 70,
} as const

/** Fingerprint similarity threshold for clustering (0–1). */
export const CLUSTER_SIMILARITY_THRESHOLD = 0.6
