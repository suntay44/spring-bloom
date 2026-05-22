/**
 * Tests for lib/credits/limits.ts
 *
 * Verifies that plan credit limits match industry scale,
 * action estimate ranges are internally consistent,
 * and planLimit() fallback behavior is correct.
 */

import { describe, it, expect } from 'vitest'
import {
  PLAN_CREDIT_LIMITS,
  PLAN_ORDER,
  ACTION_CREDIT_ESTIMATES,
  planLimit,
  type PlanId,
} from '@/lib/credits/limits'

// ── Plan credit limits ────────────────────────────────────────────────────────

describe('PLAN_CREDIT_LIMITS — values match product spec', () => {
  it('free plan = 20 credits', () => {
    expect(PLAN_CREDIT_LIMITS.free).toBe(20)
  })

  it('starter plan = 50 credits', () => {
    expect(PLAN_CREDIT_LIMITS.starter).toBe(50)
  })

  it('pro plan = 150 credits', () => {
    expect(PLAN_CREDIT_LIMITS.pro).toBe(150)
  })

  it('teams plan = 500 credits', () => {
    expect(PLAN_CREDIT_LIMITS.teams).toBe(500)
  })

  it('plans are in ascending order (free < starter < pro < teams)', () => {
    const values = PLAN_ORDER.map(p => PLAN_CREDIT_LIMITS[p])
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!)
    }
  })

  it('all 4 plans are defined', () => {
    const plans: PlanId[] = ['free', 'starter', 'pro', 'teams']
    for (const plan of plans) {
      expect(PLAN_CREDIT_LIMITS[plan]).toBeDefined()
      expect(PLAN_CREDIT_LIMITS[plan]).toBeGreaterThan(0)
    }
  })
})

// ── planLimit() helper ────────────────────────────────────────────────────────

describe('planLimit()', () => {
  it('returns correct limit for each valid plan', () => {
    expect(planLimit('free')).toBe(20)
    expect(planLimit('starter')).toBe(50)
    expect(planLimit('pro')).toBe(150)
    expect(planLimit('teams')).toBe(500)
  })

  it('falls back to free limit for unknown plan strings', () => {
    expect(planLimit('unknown')).toBe(20)
    expect(planLimit('')).toBe(20)
    expect(planLimit('enterprise')).toBe(20)
    expect(planLimit('STARTER')).toBe(20) // case-sensitive
  })
})

// ── PLAN_ORDER ────────────────────────────────────────────────────────────────

describe('PLAN_ORDER', () => {
  it('contains exactly 4 plans', () => {
    expect(PLAN_ORDER).toHaveLength(4)
  })

  it('starts with free and ends with teams', () => {
    expect(PLAN_ORDER[0]).toBe('free')
    expect(PLAN_ORDER[PLAN_ORDER.length - 1]).toBe('teams')
  })

  it('contains all plan IDs', () => {
    expect(PLAN_ORDER).toContain('free')
    expect(PLAN_ORDER).toContain('starter')
    expect(PLAN_ORDER).toContain('pro')
    expect(PLAN_ORDER).toContain('teams')
  })
})

// ── ACTION_CREDIT_ESTIMATES ───────────────────────────────────────────────────

describe('ACTION_CREDIT_ESTIMATES — range sanity', () => {
  const actions = Object.entries(ACTION_CREDIT_ESTIMATES) as [
    string,
    { min: number; max: number; label: string }
  ][]

  it('all actions have min < max', () => {
    for (const [name, { min, max }] of actions) {
      expect(min).toBeLessThan(max), `${name}: min must be less than max`
    }
  })

  it('all actions have min > 0', () => {
    for (const [name, { min }] of actions) {
      expect(min).toBeGreaterThan(0), `${name}: min must be > 0`
    }
  })

  it('all actions have a non-empty label', () => {
    for (const [name, { label }] of actions) {
      expect(label.length).toBeGreaterThan(0), `${name}: label must not be empty`
    }
  })

  it('simple_edit is cheaper than full_scaffold (max)', () => {
    expect(ACTION_CREDIT_ESTIMATES.simple_edit.max).toBeLessThan(
      ACTION_CREDIT_ESTIMATES.full_scaffold.min
    )
  })

  it('full_scaffold max is within a free user can afford over time', () => {
    // A single full scaffold should not exceed the entire free plan
    expect(ACTION_CREDIT_ESTIMATES.full_scaffold.max).toBeLessThanOrEqual(
      PLAN_CREDIT_LIMITS.free
    )
  })

  it('simple edits are affordable even on free plan', () => {
    // A free user (20 credits) should be able to do at least 10 simple edits
    const maxEdits = Math.floor(PLAN_CREDIT_LIMITS.free / ACTION_CREDIT_ESTIMATES.simple_edit.max)
    expect(maxEdits).toBeGreaterThanOrEqual(10)
  })

  it('all 8 action types are defined', () => {
    const expected = [
      'simple_edit', 'page_generation', 'full_scaffold',
      'auth_integration', 'payment_setup', 'security_scan',
      'code_review', 'deploy_assist',
    ]
    for (const key of expected) {
      expect(ACTION_CREDIT_ESTIMATES).toHaveProperty(key)
    }
  })
})
