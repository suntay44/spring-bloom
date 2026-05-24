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

  it('plan mode upgrades to reasoning-grade in same provider family', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'claude-haiku-4-5', userProvider: 'anthropic',
    })
    expect(result.provider).toBe('anthropic')
    expect(result.modelId).toContain('opus')
  })

  it('plan mode upgrades for openai user', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'gpt-5-nano', userProvider: 'openai',
    })
    expect(result.provider).toBe('openai')
    expect(result.modelId).toBe('gpt-5')
  })

  it('plan mode upgrades for google user', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'gemini-2.5-flash-lite', userProvider: 'google',
    })
    expect(result.provider).toBe('google')
    expect(result.modelId).toContain('pro')
  })

  it('code mode downgrades to fast/cheap in same family', () => {
    const result = routeModel({
      mode: 'code', userModelId: 'claude-opus-4-5', userProvider: 'anthropic',
    })
    expect(result.provider).toBe('anthropic')
    expect(result.modelId).toContain('haiku')
  })

  it('respectUserPick override beats mode override', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'claude-haiku-4-5', userProvider: 'anthropic',
      respectUserPick: true,
    })
    expect(result.modelId).toBe('claude-haiku-4-5')
  })

  it('falls back to user pick for unknown provider', () => {
    const result = routeModel({
      mode: 'plan', userModelId: 'custom-model', userProvider: 'unknown' as 'anthropic',
    })
    expect(result.modelId).toBe('custom-model')
  })
})

describe('modeCostHint', () => {
  it('plan is more expensive than agent', () => {
    expect(modeCostHint('plan').multiplier).toBeGreaterThan(modeCostHint('agent').multiplier)
  })
  it('code is cheaper than agent', () => {
    expect(modeCostHint('code').multiplier).toBeLessThan(modeCostHint('agent').multiplier)
  })
  it('returns human-readable labels', () => {
    expect(modeCostHint('plan').label).toMatch(/cost/i)
    expect(modeCostHint('agent').label).toMatch(/normal/i)
    expect(modeCostHint('code').label).toMatch(/cost/i)
  })
})
