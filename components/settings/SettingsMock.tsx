"use client";

import { useState, type ReactNode } from "react";
import { TabBar } from "@/components/shared/TabBar";
import { AccountSection } from "@/components/settings/sections/AccountSection";
import { AnalyticsSection } from "@/components/settings/sections/AnalyticsSection";
import { BillingSection } from "@/components/settings/sections/BillingSection";
import { DangerSection } from "@/components/settings/sections/DangerSection";
import { DatabaseSection } from "@/components/settings/sections/DatabaseSection";
import { SecuritySection } from "@/components/settings/sections/SecuritySection";

const tabs = ["Account", "Credits & Billing", "Database", "Security", "Analytics", "Danger Zone"] as const;
type SettingsTab = (typeof tabs)[number];

const SETTINGS_PANELS: Record<SettingsTab, ReactNode> = {
  Account: <AccountSection />,
  "Credits & Billing": <BillingSection />,
  Database: <DatabaseSection />,
  Security: <SecuritySection />,
  Analytics: <AnalyticsSection />,
  "Danger Zone": <DangerSection />
};

export function SettingsMock() {
  const [tab, setTab] = useState<SettingsTab>("Credits & Billing");

  return (
    <section className="app-content">
      <h1 className="text-4xl font-semibold">Settings</h1>
      <p className="mt-2 text-slate-300">Mock settings and billing surfaces before backend wiring.</p>
      <TabBar tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-6">
        {SETTINGS_PANELS[tab]}
      </div>
    </section>
  );
}
