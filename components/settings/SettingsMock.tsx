"use client";

import { useState } from "react";
import { TabBar } from "@/components/shared/TabBar";
import { AccountSection } from "@/components/settings/sections/AccountSection";
import { AnalyticsSection } from "@/components/settings/sections/AnalyticsSection";
import { BillingSection } from "@/components/settings/sections/BillingSection";
import { DangerSection } from "@/components/settings/sections/DangerSection";
import { DatabaseSection } from "@/components/settings/sections/DatabaseSection";
import { SecuritySection } from "@/components/settings/sections/SecuritySection";

const tabs = ["Account", "Credits & Billing", "Database", "Security", "Analytics", "Danger Zone"] as const;
type SettingsTab = (typeof tabs)[number];

export type CreditTransaction = {
  id: string;
  type: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SettingsMockProps = {
  name: string;
  email: string;
  plan: string;
  credits: number;
  maxCredits: number;
  spent: number;
  bonusEarned: number;
  transactions: CreditTransaction[];
};

export function SettingsMock({ name, email, plan, credits, maxCredits, spent, bonusEarned, transactions }: SettingsMockProps) {
  const [tab, setTab] = useState<SettingsTab>("Credits & Billing");

  return (
    <section className="app-content">
      <h1 className="text-4xl font-semibold">Settings</h1>
      <p className="mt-2 text-slate-300">Manage your account, billing, and project preferences.</p>
      <TabBar tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === "Account" ? <AccountSection email={email} maxCredits={maxCredits} name={name} plan={plan} /> : null}
        {tab === "Credits & Billing" ? (
          <BillingSection
            bonusEarned={bonusEarned}
            credits={credits}
            maxCredits={maxCredits}
            plan={plan}
            spent={spent}
            transactions={transactions}
          />
        ) : null}
        {tab === "Database" ? <DatabaseSection /> : null}
        {tab === "Security" ? <SecuritySection /> : null}
        {tab === "Analytics" ? <AnalyticsSection /> : null}
        {tab === "Danger Zone" ? <DangerSection /> : null}
      </div>
    </section>
  );
}
