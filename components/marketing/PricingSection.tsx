"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/lib/mock/data";

export function PricingSection({ expanded = false }: { expanded?: boolean }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  function openPlan(planName: string) {
    setSelectedPlan(planName);
    setAuthOpen(true);
  }

  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2>Simple, transparent pricing.</h2>
            <p className="section-lede">Start free. Upgrade when you're ready to ship.</p>
          </div>
          {!expanded && (
            <Button nativeButton={false} render={<Link href="/pricing" />} variant="outline">
              See full pricing
            </Button>
          )}
        </div>

        <div className="pricing-grid-3">
          {pricingPlans.map((plan) => (
            <article
              className={`pricing-plan-card ${plan.featured ? "pricing-plan-card--featured" : ""}`}
              key={plan.name}
            >
              {/* Header */}
              <div className="pricing-plan-header">
                <div className="flex items-center justify-between gap-2">
                  <p className="pricing-plan-name">{plan.name}</p>
                  {plan.featured && <span className="price-popular-badge">Popular</span>}
                </div>
                {plan.description && (
                  <p className="pricing-plan-desc">{plan.description}</p>
                )}
                <div className="pricing-plan-price">
                  <span className="pricing-plan-amount">{plan.price}</span>
                  <span className="pricing-plan-period">/ month</span>
                </div>
              </div>

              {/* CTA */}
              <Button
                className="w-full"
                onClick={() => openPlan(plan.name)}
                type="button"
                variant={plan.featured ? "default" : "outline"}
              >
                {plan.cta}
              </Button>

              {/* Feature list */}
              {plan.features && plan.features.length > 0 && (
                <ul className="pricing-feature-list">
                  {plan.features.map((f) => (
                    <li
                      className={`pricing-feature-item ${f.included ? "" : "pricing-feature-item--locked"}`}
                      key={f.text}
                    >
                      {f.included
                        ? <Check size={14} className="pricing-feature-check" />
                        : <X size={14} className="pricing-feature-x" />
                      }
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>

      {authOpen && (
        <AuthModal
          defaultTab="signup"
          onClose={() => setAuthOpen(false)}
          selectedPlan={selectedPlan ?? undefined}
        />
      )}
    </section>
  );
}
