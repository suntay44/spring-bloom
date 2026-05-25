/**
 * Mode-aware model router.
 *
 * Different builder modes have different cost/quality tradeoffs:
 *   plan  → SAME model as agent (default). Just a different prompt asking for
 *           a plan instead of code. Opt in to deepThink to upgrade to a
 *           reasoning-grade model (Opus/GPT-5-Pro/Gemini-Pro) — ~5x cost.
 *   agent → user's selected model (default Sonnet-tier)
 *   code  → smallest fast model (Haiku/GPT-5-Nano/Gemini-Flash-Lite)
 *
 * Callers pass:
 *   - mode (what they're doing)
 *   - userModelId + userProvider (what the user picked in the model selector)
 *   - deepThink (opt-in for plan mode to escalate to the reasoning tier)
 *
 * The router returns the model + provider the chat route should actually use.
 *
 * Defaults respect the user's pick. Only Code mode silently downgrades
 * (because users wouldn't want to pay full price for a one-line edit).
 * Plan mode never silently upgrades — that's an explicit opt-in.
 */

export type BuilderMode = 'plan' | 'agent' | 'code'

export interface ModelChoice {
  modelId:  string
  provider: 'anthropic' | 'openai' | 'google'
}

// Reasoning-grade models per provider — used when deepThink=true in plan mode.
const DEEP_THINK_MODELS: Record<ModelChoice['provider'], ModelChoice> = {
  anthropic: { modelId: 'claude-opus-4-5',       provider: 'anthropic' },
  openai:    { modelId: 'gpt-5',                 provider: 'openai'    },
  google:    { modelId: 'gemini-2.5-pro',        provider: 'google'    },
}

// Fast/cheap models per provider — used by code mode to keep edits snappy.
const CODE_MODELS: Record<ModelChoice['provider'], ModelChoice> = {
  anthropic: { modelId: 'claude-haiku-4-5',      provider: 'anthropic' },
  openai:    { modelId: 'gpt-5-nano',            provider: 'openai'    },
  google:    { modelId: 'gemini-2.5-flash-lite', provider: 'google'    },
}

export interface RouteInput {
  mode:           BuilderMode
  userModelId:    string
  userProvider:   string
  /** Opt-in: escalate plan mode to a reasoning-grade model (~5x cost) */
  deepThink?:     boolean
  /** If true, never override the user's model — even for code mode */
  respectUserPick?: boolean
}

/**
 * Returns the model + provider to use for this turn.
 *
 * Rules:
 *  - Agent mode → always user's pick.
 *  - Plan mode  → user's pick, UNLESS deepThink=true → reasoning model.
 *  - Code mode  → fast/cheap model in same provider family, unless
 *                  respectUserPick=true.
 *  - Unknown provider → fall back to user's pick verbatim.
 */
export function routeModel(input: RouteInput): ModelChoice {
  const userPick: ModelChoice = {
    modelId:  input.userModelId,
    provider: (input.userProvider as ModelChoice['provider']) ?? 'anthropic',
  }

  if (input.mode === 'plan') {
    if (input.deepThink) {
      return DEEP_THINK_MODELS[userPick.provider] ?? userPick
    }
    return userPick
  }

  if (input.mode === 'code') {
    if (input.respectUserPick) return userPick
    return CODE_MODELS[userPick.provider] ?? userPick
  }

  // agent
  return userPick
}

/**
 * Returns the cost multiplier (vs the user's normal model) for this mode.
 *
 *   plan + deepThink → ~5x  (reasoning-tier model, e.g. Opus)
 *   plan             → 1x   (same model, just a planning prompt)
 *   agent            → 1x   (baseline)
 *   code             → ~0.2x (small model, small output)
 */
export function modeCostHint(
  mode: BuilderMode,
  deepThink = false,
): { multiplier: number; label: string } {
  if (mode === 'plan' && deepThink) return { multiplier: 5,   label: '~5× normal cost (reasoning tier)' }
  if (mode === 'plan')              return { multiplier: 1,   label: 'normal cost' }
  if (mode === 'code')              return { multiplier: 0.2, label: '~1/5 normal cost' }
  return { multiplier: 1, label: 'normal cost' }
}
