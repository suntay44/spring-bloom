import { describe, it, expect } from 'vitest'
import { routeModel, modeCostHint } from '@/lib/ai/model-router'

describe('routeModel', () => {
  it('agent mode always respects user choice', () => {
    const result = routeModel({
      mode: 'agent', userModelId: 'claude-sonnet-4-7', userProvider: 'anthropic',
    })
    expect(result).toEqual({ modelId: 'claude-sonnet-4-7', provider: 'anthropic' })
  })

  it('agent mode respects exotic user choices too', () => {
    const result = routeModel({
      mode: 'agent', userModelId: 'gpt-5', userProvider: 'openai',
    })
    expect(result.modelId).toBe('gpt-5')
    expect(result.provider).toBe('openai')
  })

  it('plan mode defaults to user pick (no silent Opus upgrade)', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'claude-haiku-4-5', userProvider: 'anthropic',
    })
    expect(result.modelId).toBe('claude-haiku-4-5')
    expect(result.provider).toBe('anthropic')
  })

  it('plan mode + deepThink upgrades to reasoning model (anthropic)', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'claude-haiku-4-5', userProvider: 'anthropic',
      deepThink: true,
    })
    expect(result.provider).toBe('anthropic')
    expect(result.modelId).toContain('opus')
  })

  it('plan mode + deepThink upgrades for openai user', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'gpt-5-nano', userProvider: 'openai',
      deepThink: true,
    })
    expect(result.provider).toBe('openai')
    expect(result.modelId).toBe('gpt-5')
  })

  it('plan mode + deepThink upgrades for google user', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'gemini-2.5-flash-lite', userProvider: 'google',
      deepThink: true,
    })
    expect(result.provider).toBe('google')
    expect(result.modelId).toContain('pro')
  })

  it('plan mode WITHOUT deepThink uses user pick even on opus', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'claude-opus-4-5', userProvider: 'anthropic',
    })
    expect(result.modelId).toBe('claude-opus-4-5')
  })

  it('code mode downgrades to fast/cheap in same family', () => {
    const result = routeModel({
      mode: 'code', userModelId: 'claude-opus-4-5', userProvider: 'anthropic',
    })
    expect(result.provider).toBe('anthropic')
    expect(result.modelId).toContain('haiku')
  })

  it('respectUserPick override stops code-mode downgrade', () => {
    const result = routeModel({
      mode: 'code', userModelId: 'claude-opus-4-5', userProvider: 'anthropic',
      respectUserPick: true,
    })
    expect(result.modelId).toBe('claude-opus-4-5')
  })

  it('plan + deepThink + respectUserPick: deepThink still wins for plan', () => {
    // respectUserPick only applies to code-mode override; plan opt-in is explicit.
    const result = routeModel({
      mode: 'plan', userModelId: 'claude-haiku-4-5', userProvider: 'anthropic',
      deepThink: true, respectUserPick: true,
    })
    expect(result.modelId).toContain('opus')
  })

  it('falls back to user pick for unknown provider in plan deepThink', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'custom-model', userProvider: 'unknown' as 'anthropic',
      deepThink: true,
    })
    expect(result.modelId).toBe('custom-model')
  })
})

describe('modeCostHint', () => {
  it('plan default is the same as agent (1×)', () => {
    expect(modeCostHint('plan').multiplier).toBe(1)
    expect(modeCostHint('agent').multiplier).toBe(1)
  })

  it('plan + deepThink is much more expensive', () => {
    expect(modeCostHint('plan', true).multiplier).toBeGreaterThan(modeCostHint('plan').multiplier)
    expect(modeCostHint('plan', true).label).toMatch(/reasoning/i)
  })

  it('code is cheaper than agent', () => {
    expect(modeCostHint('code').multiplier).toBeLessThan(modeCostHint('agent').multiplier)
  })

  it('returns human-readable labels', () => {
    expect(modeCostHint('plan').label).toMatch(/normal/i)
    expect(modeCostHint('agent').label).toMatch(/normal/i)
    expect(modeCostHint('code').label).toMatch(/cost/i)
  })
})
