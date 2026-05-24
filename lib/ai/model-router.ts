/**
 * Mode-aware model router.
 *
 * Different builder modes have different cost/quality tradeoffs:
 *   plan  → biggest reasoning model (Opus / GPT-5-pro / Gemini Ultra)
 *   agent → user's selected model (default Sonnet-tier)
 *   code  → smallest fast model (Haiku / GPT-5-mini / Gemini Flash)
 *
 * Callers pass:
 *   - mode (what they're doing)
 *   - userModelId + userProvider (what the user picked in the model selector)
 *
 * The router returns the model + provider the chat route should actually use.
 *
 * The user's model selection is RESPECTED unless the mode demands a different
 * tier for cost or quality reasons. The override behavior is configurable per
 * mode — we always defer to user choice for `agent`, override the tier for
 * `plan` and `code`.
 */

export type BuilderMode = 'plan' | 'agent' | 'code'

export interface ModelChoice {
  modelId:  string
  provider: 'anthropic' | 'openai' | 'google'
}

// Default model per (mode, user-selected provider). Picked to match the
// user's chosen provider so we don't surprise them by switching ecosystems.
const MODE_DEFAULTS: Record<BuilderMode, Record<ModelChoice['provider'], ModelChoice>> = {
  plan: {
    anthropic: { modelId: 'claude-opus-4-5',          provider: 'anthropic' },
    openai:    { modelId: 'gpt-5',                    provider: 'openai'    },
    google:    { modelId: 'gemini-2.5-pro',           provider: 'google'    },
  },
  agent: {
    anthropic: { modelId: 'claude-sonnet-4-7',        provider: 'anthropic' },
    openai:    { modelId: 'gpt-5-mini',               provider: 'openai'    },
    google:    { modelId: 'gemini-2.5-flash',         provider: 'google'    },
  },
  code: {
    anthropic: { modelId: 'claude-haiku-4-5',         provider: 'anthropic' },
    openai:    { modelId: 'gpt-5-nano',               provider: 'openai'    },
    google:    { modelId: 'gemini-2.5-flash-lite',    provider: 'google'    },
  },
}

export interface RouteInput {
  mode:           BuilderMode
  userModelId:    string
  userProvider:   string
  /** If true, never override the user's model — even for plan/code modes */
  respectUserPick?: boolean
}

/**
 * Returns the model + provider to use for this turn.
 *
 * Rules:
 *  - Agent mode always uses the user's pick.
 *  - Plan mode upgrades to a reasoning-grade model in the same provider family.
 *  - Code mode downgrades to a fast/cheap model in the same provider family.
 *  - If `respectUserPick` is set, the user's pick wins regardless of mode.
 *  - Unknown providers fall back to the user's pick verbatim.
 */
export function routeModel(input: RouteInput): ModelChoice {
  const userPick: ModelChoice = {
    modelId:  input.userModelId,
    provider: (input.userProvider as ModelChoice['provider']) ?? 'anthropic',
  }

  if (input.mode === 'agent' || input.respectUserPick) {
    return userPick
  }

  const providerKey = userPick.provider
  const defaults = MODE_DEFAULTS[input.mode]
  return defaults[providerKey] ?? userPick
}

/**
 * Returns the cost multiplier (vs the user's normal model) for this mode.
 * Used by the credit estimator to show users what each mode roughly costs.
 *
 *   plan  → ~3-5x  (bigger model, but usually fewer tokens than full code gen)
 *   agent → 1x     (baseline)
 *   code  → ~0.2x  (small model, small output)
 */
export function modeCostHint(mode: BuilderMode): { multiplier: number; label: string } {
  switch (mode) {
    case 'plan':  return { multiplier: 4,    label: '~4x normal cost' }
    case 'agent': return { multiplier: 1,    label: 'normal cost'      }
    case 'code':  return { multiplier: 0.2,  label: '~1/5 normal cost' }
  }
}
