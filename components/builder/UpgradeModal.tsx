"use client";

import { X, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  feature: string;          // e.g. "Publish to live URL"
  requiredPlan: "Starter" | "Pro";
  onClose: () => void;
}

const PLAN_HIGHLIGHTS: Record<"Starter" | "Pro", string[]> = {
  Starter: [
    "500 credits / month",
    "Publish to springbloom.app",
    "GitHub export",
    "Credit top-ups",
    "Credits roll over",
  ],
  Pro: [
    "1,500 credits / month",
    "Unlimited projects",
    "Custom domain",
    "Priority support",
    "Early access to new features",
  ],
};

const PLAN_PRICE: Record<"Starter" | "Pro", string> = {
  Starter: "$12",
  Pro: "$29",
};

export function UpgradeModal({ feature, requiredPlan, onClose }: UpgradeModalProps) {
  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className="upgrade-modal-close" onClick={onClose} type="button">
          <X size={16} />
        </button>

        {/* Icon + heading */}
        <div className="upgrade-modal-icon">
          <Sparkles size={20} />
        </div>
        <h3 className="upgrade-modal-title">
          {requiredPlan} required
        </h3>
        <p className="upgrade-modal-desc">
          <strong>{feature}</strong> is available on the {requiredPlan} plan and above.
          Upgrade to unlock it instantly.
        </p>

        {/* Plan highlights */}
        <div className="upgrade-modal-plan">
          <div className="upgrade-modal-plan-header">
            <span className="upgrade-modal-plan-name">{requiredPlan}</span>
            <span className="upgrade-modal-plan-price">{PLAN_PRICE[requiredPlan]}<small>/mo</small></span>
          </div>
          <ul className="upgrade-modal-features">
            {PLAN_HIGHLIGHTS[requiredPlan].map((item) => (
              <li key={item}>
                <Check size={13} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="upgrade-modal-actions">
          <Button className="w-full" render={<Link href="/pricing" />} nativeButton={false}>
            Upgrade to {requiredPlan} →
          </Button>
          <button className="upgrade-modal-cancel" onClick={onClose} type="button">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
