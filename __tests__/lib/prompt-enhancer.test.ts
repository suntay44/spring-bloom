/**
 * Tests for lib/ai/prompt-enhancer.ts
 *
 * isRefinementMessage() is a pure heuristic — fully testable without mocks.
 * enhancePrompt() requires DB + AI so it is excluded from unit tests.
 */

import { describe, it, expect } from 'vitest'
import { isRefinementMessage } from '@/lib/ai/prompt-enhancer'

// ── Short messages ────────────────────────────────────────────────────────────

describe('isRefinementMessage — short messages', () => {
  it('treats messages under 60 chars as refinements', () => {
    expect(isRefinementMessage('make it blue')).toBe(true)
    expect(isRefinementMessage('fix the button')).toBe(true)
    expect(isRefinementMessage('change the color')).toBe(true)
  })

  it('treats empty string as refinement', () => {
    expect(isRefinementMessage('')).toBe(true)
  })

  it('treats messages of exactly 59 chars as refinements', () => {
    const msg = 'a'.repeat(59)
    expect(isRefinementMessage(msg)).toBe(true)
  })
})

// ── Refinement prefixes ───────────────────────────────────────────────────────

describe('isRefinementMessage — refinement prefix detection', () => {
  // Construct messages >= 60 chars to bypass length check
  const pad = (s: string) => s + ' '.repeat(Math.max(0, 62 - s.length)) + 'x'

  it('detects "make the" prefix', () => {
    expect(isRefinementMessage(pad('make the header larger and more visible'))).toBe(true)
  })

  it('detects "change the" prefix', () => {
    expect(isRefinementMessage(pad('change the background color to dark blue please'))).toBe(true)
  })

  it('detects "update the" prefix', () => {
    expect(isRefinementMessage(pad('update the footer to include social media links'))).toBe(true)
  })

  it('detects "fix the" prefix', () => {
    expect(isRefinementMessage(pad('fix the navigation menu so items are centered'))).toBe(true)
  })

  it('detects "move the" prefix', () => {
    expect(isRefinementMessage(pad('move the sidebar to the right side of the page'))).toBe(true)
  })

  it('detects "rename the" prefix', () => {
    expect(isRefinementMessage(pad('rename the submit button to send message instead'))).toBe(true)
  })

  it('detects "delete the" prefix', () => {
    expect(isRefinementMessage(pad('delete the hero section from the landing page'))).toBe(true)
  })

  it('detects "remove the" prefix', () => {
    expect(isRefinementMessage(pad('remove the top navigation bar from the layout'))).toBe(true)
  })

  it('detects "make it" prefix', () => {
    expect(isRefinementMessage(pad('make it look more modern with rounded corners and shadows'))).toBe(true)
  })

  it('detects "change it" prefix', () => {
    expect(isRefinementMessage(pad('change it to use a white background with dark text'))).toBe(true)
  })

  it('detects "update it" prefix', () => {
    expect(isRefinementMessage(pad('update it so the form validates on submit not on blur'))).toBe(true)
  })

  it('detects "fix it" prefix', () => {
    expect(isRefinementMessage(pad('fix it so the dropdown closes when clicking outside it'))).toBe(true)
  })

  it('detects "the color" prefix', () => {
    expect(isRefinementMessage(pad('the color of the primary button should be indigo not violet'))).toBe(true)
  })

  it('detects "add a button" prefix', () => {
    expect(isRefinementMessage(pad('add a button to the top right that opens the user settings'))).toBe(true)
  })

  it('detects "add a link" prefix', () => {
    expect(isRefinementMessage(pad('add a link to the footer pointing to the privacy policy page'))).toBe(true)
  })
})

// ── Build requests (should NOT be refinements) ────────────────────────────────

describe('isRefinementMessage — build prompts are not refinements', () => {
  it('does not flag a full scaffold request', () => {
    const prompt = 'Build a SaaS dashboard with user auth, usage analytics charts, and a subscription billing page with Stripe integration'
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('does not flag an e-commerce build request', () => {
    const prompt = 'Create an e-commerce store with product listings, a shopping cart, and a checkout flow that supports PayPal'
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('does not flag a mobile app scaffold request', () => {
    const prompt = 'I want a habit tracking mobile app where users can log their daily habits and see their progress over time'
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('does not flag a landing page build request', () => {
    const prompt = 'Design a marketing landing page for a B2B SaaS product with hero, features, pricing, and CTA sections'
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('does not flag a long architectural request', () => {
    const prompt = 'Build a real-time collaborative document editor with user presence indicators, comments, and version history'
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('does not flag requests starting with "I want"', () => {
    const prompt = 'I want a portfolio website showcasing my projects, skills, and a contact form with email notifications'
    expect(isRefinementMessage(prompt)).toBe(false)
  })

  it('does not flag requests starting with "Create"', () => {
    const prompt = 'Create a job board platform where companies can post listings and candidates can apply and track status'
    expect(isRefinementMessage(prompt)).toBe(false)
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('isRefinementMessage — edge cases', () => {
  it('is case-insensitive for prefix matching', () => {
    const prompt = 'MAKE THE header bigger and more prominent across the whole site'
    expect(isRefinementMessage(prompt)).toBe(true)
  })

  it('trims leading whitespace before checking', () => {
    // Leading whitespace should be trimmed before length/prefix check
    const prompt = '  make it dark mode everywhere on the site and all components'
    expect(isRefinementMessage(prompt)).toBe(true)
  })

  it('does not false-positive on "add a button" buried in middle of prompt', () => {
    // "add a button" is only a refinement if it starts the message
    const prompt = 'Build a complete form page and add a button at the bottom to submit the form to the API endpoint'
    // Starts with "Build" — not a refinement prefix → false (not refinement)
    expect(isRefinementMessage(prompt)).toBe(false)
  })
})
