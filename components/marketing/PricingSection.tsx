"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/lib/mock/data";

const CREDIT_EXAMPLES = [
  { label: "Initial app build", value: "50-150 credits" },
  { label: "AI code review", value: "5-25 credits" },
  { label: "Security scan", value: "10-40 credits" }
] as const;

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
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2>Credit pricing that stays visible.</h2>
            <p className="section-lede">Credits map to real work: planning, building, review, security, analytics, and deploy assistance.</p>
          </div>
          {expanded ? <Button onClick={() => openPlan("Pro")} type="button">Start with selected plan</Button> : <Button render={<Link href="/pricing" />} variant="outline">Compare plans</Button>}
        </div>
        <div className="grid-4">
          {pricingPlans.map((plan) => (
            <article className={`card price-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
              <div className="mb-5"><p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{plan.name}</p><h3 className="mt-2 text-4xl font-semibold">{plan.price}</h3><p className="mt-1 text-sm font-bold text-slate-500">per month</p></div>
              <div className="mb-6 space-y-3 text-sm font-bold text-slate-300">
                <p className="flex items-center gap-2"><CheckCircle2 color="var(--green)" size={17} /> {plan.credits}</p>
                <p className="flex items-center gap-2"><CheckCircle2 color="var(--green)" size={17} /> {plan.projects}</p>
                <p className="flex items-center gap-2"><CheckCircle2 color="var(--green)" size={17} /> Review and security tools</p>
              </div>
              <Button className="w-full" onClick={() => openPlan(plan.name)} type="button" variant={plan.featured ? "default" : "outline"}>{plan.cta}</Button>
            </article>
          ))}
        </div>
        {expanded ? <div className="mt-8 grid-3">{CREDIT_EXAMPLES.map(({ label, value }) => <div className="card feature-card" key={label}><p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div> : null}
      </div>
      {authOpen ? <AuthModal defaultTab="signup" onClose={() => setAuthOpen(false)} selectedPlan={selectedPlan ?? undefined} /> : null}
    </section>
  );
}
