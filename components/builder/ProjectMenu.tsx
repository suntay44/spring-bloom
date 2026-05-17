"use client";

import type { ComponentType } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Cloud, Code2, CreditCard, FileText, Gift, Globe2, HelpCircle, Pin, Search, Settings, ShieldCheck } from "lucide-react";
import { toast } from "@/lib/toast";

export type BuilderTab = "Preview" | "Files" | "Diff" | "Review" | "Security" | "Analytics";

export type ProjectMenuUser = {
  initials: string;
  workspace: string;
  plan: string;
  credits: number;
  maxCredits: number;
};

const MENU_ITEMS = [
  { label: "Dashboard", icon: Globe2, href: "/dashboard" },
  { label: "Settings", icon: Settings, meta: "Cmd .", href: "/settings" },
  { label: "Details", icon: HelpCircle }
] satisfies Array<{ label: string; icon: ComponentType<{ size?: number }>; href?: Route; meta?: string }>;

const TOOL_ITEMS = [
  { label: "Analytics", icon: BarChart3, pinned: true, tab: "Analytics" },
  { label: "Cloud", icon: Cloud, pinned: true, tab: "Security" },
  { label: "Code", icon: Code2, pinned: true, tab: "Diff" },
  { label: "Files", icon: FileText, pinned: true, tab: "Files" },
  { label: "Payments", icon: CreditCard, pinned: false, active: true },
  { label: "Security", icon: ShieldCheck, pinned: false, tab: "Security" },
  { label: "SEO & AI search", icon: Search, pinned: false }
] satisfies Array<{ label: string; icon: ComponentType<{ size?: number }>; pinned: boolean; tab?: BuilderTab; active?: boolean }>;

export function MoreToolsMenu({ setTab }: { setTab: (tab: BuilderTab) => void }) {
  return (
    <div className="more-tools-menu">
      {TOOL_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button className={item.active ? "active" : ""} key={item.label} onClick={() => item.tab ? setTab(item.tab) : toast(`${item.label} — coming soon`)} type="button">
            <Icon size={16} />
            <span>{item.label}</span>
            <Pin size={14} />
          </button>
        );
      })}
    </div>
  );
}

export function ProjectMenu({ user }: { user: ProjectMenuUser }) {
  const creditPercent = user.maxCredits > 0
    ? `${Math.round((user.credits / user.maxCredits) * 100)}%`
    : "0%";

  return (
    <div className="project-menu">
      <div className="menu-account">
        <span className="avatar">{user.initials}</span>
        <strong>{user.workspace}</strong>
        <span className="pro-badge">{user.plan.toUpperCase()}</span>
      </div>
      <div className="project-health">
        <div>
          <span>Project health</span>
          <strong>86</strong>
        </div>
        <div>
          <span>Security</span>
          <strong>1 high</strong>
        </div>
      </div>
      <div className="credits-card">
        <div className="flex items-center justify-between">
          <strong>Credits</strong>
          <span>{user.credits.toLocaleString()} left</span>
        </div>
        <div className="credit-meter">
          <span style={{ width: creditPercent }} />
        </div>
      </div>
      <button className="menu-row accent" onClick={() => toast("Free credits — coming soon")} type="button">
        <Gift size={16} /> Get free credits
      </button>
      <div className="menu-section">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon size={16} />
              <span>{item.label}</span>
              {item.meta ? <small>{item.meta}</small> : null}
            </>
          );

          return item.href ? (
            <Link className="menu-row" href={item.href} key={item.label}>
              {content}
            </Link>
          ) : (
            <button className="menu-row" key={item.label} onClick={() => toast(`${item.label} — coming soon`)} type="button">
              {content}
            </button>
          );
        })}
      </div>
      <div className="menu-section">
        <button className="menu-row" onClick={() => toast("Help center — coming soon")} type="button">
          <HelpCircle size={16} /> Help <ArrowUpRight className="ml-auto" size={15} />
        </button>
      </div>
    </div>
  );
}
