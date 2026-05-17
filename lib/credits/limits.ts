// Single source of truth for plan credit limits.
// Update here only — all pages/components import from this file.

export type PlanId = "free" | "starter" | "pro" | "teams";

export const PLAN_CREDIT_LIMITS: Record<PlanId, number> = {
  free:    5,
  starter: 100,
  pro:     175,
  teams:   500,
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "teams"];

/** Returns the credit limit for a plan, defaulting to free. */
export function planLimit(plan: string): number {
  return PLAN_CREDIT_LIMITS[plan as PlanId] ?? PLAN_CREDIT_LIMITS.free;
}
