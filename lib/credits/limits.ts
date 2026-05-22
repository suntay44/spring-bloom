// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for plan credit limits.
// Scale: ~$0.24/credit (inline with Lovable / Emergent industry standard).
// Update HERE only — all pages/components/API routes import from this file.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = "free" | "starter" | "pro" | "teams";

/**
 * Monthly credit allocation per plan.
 * Free is a one-time lifetime grant (not monthly) — stored here so
 * planLimit() works uniformly across all callers.
 */
export const PLAN_CREDIT_LIMITS: Record<PlanId, number> = {
  free:    20,   // 20 one-time credits  (try the product, ~8–20 small actions)
  starter: 50,   // 50 / month @ $12  →  $0.24 / credit
  pro:     150,  // 150 / month @ $29  → $0.19 / credit
  teams:   500,  // 500 / month @ custom pricing
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "teams"];

/** Returns the monthly credit limit for a plan string, defaulting to free. */
export function planLimit(plan: string): number {
  return PLAN_CREDIT_LIMITS[plan as PlanId] ?? PLAN_CREDIT_LIMITS.free;
}

// ── Rough credit cost per action type (for UI estimates only) ─────────────────
// Actual deduction is always token-based via model_pricing table.
export const ACTION_CREDIT_ESTIMATES = {
  simple_edit:      { min: 0.2, max: 1,   label: "Simple edit / tweak" },
  page_generation:  { min: 1,   max: 4,   label: "New page or component" },
  full_scaffold:    { min: 5,   max: 20,  label: "Full app scaffold" },
  auth_integration: { min: 3,   max: 8,   label: "Auth + invite flow" },
  payment_setup:    { min: 3,   max: 8,   label: "Payment integration" },
  security_scan:    { min: 0.5, max: 2,   label: "Security scan" },
  code_review:      { min: 0.3, max: 1.5, label: "AI code review" },
  deploy_assist:    { min: 0.2, max: 1,   label: "Deploy assist" },
} as const;
