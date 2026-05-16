"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronLeft, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { PhoneFrame } from "@/components/builder/PhoneFrame";
import type { MockProject } from "@/lib/mock/projects";

const KANBAN_COLUMNS = [
  { column: "Backlog", items: ["Auth screens", "Billing table", "Empty states"] },
  { column: "In Progress", items: ["Project brief flow", "Analytics hooks"] },
  { column: "Review", items: ["RLS policy", "Keyboard focus"] },
  { column: "Done", items: ["Landing page", "Pricing page"] }
] as const;

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px"
};

const VIEWPORT_OPTIONS = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone }
] as const satisfies Array<{ id: Viewport; label: string; icon: typeof Monitor }>;

export function PreviewPanel({ project }: { project: MockProject }) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

  if (project.type === "mobile") {
    return <MobilePreview />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
        {VIEWPORT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button aria-label={`${label} preview`} className={`shared-tab ${viewport === id ? "active" : ""}`} key={id} onClick={() => setViewport(id)} type="button">
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div className="mx-auto transition-all" style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}>
        <WebPreview />
      </div>
    </div>
  );
}

function WebPreview() {
  return (
    <div className="sample-app">
      <header className="sample-nav"><div className="sample-brand"><span className="sample-logo">W</span><strong>WorkFlow</strong></div><nav><a>Features</a><a>Templates</a><a>Pricing</a></nav><button type="button">Get Started</button></header>
      <section className="sample-hero"><div><p>Project dashboard</p><h1>Plan, assign, and ship team work.</h1></div><div className="sample-search"><label>Workspace<span>Engineering</span></label><label>View<span>Kanban</span></label><label>Status<span>Active sprint</span></label><button aria-label="Refresh sample preview" type="button"><RefreshCw size={18} /></button></div></section>
      <section className="sample-content"><div className="sample-heading"><div><h2>Current Sprint</h2><p>Generated from your approved PRD</p></div><div className="sample-nav-arrows"><button aria-label="Previous sprint" type="button"><ChevronLeft size={18} /></button><button aria-label="Open sprint" type="button"><ArrowUpRight size={18} /></button></div></div><div className="kanban-grid">{KANBAN_COLUMNS.map(({ column, items }) => <div className="kanban-column" key={column}><h3>{column}</h3>{items.map((item) => <article key={item}><strong>{item}</strong><span>Owner: AI agent</span></article>)}</div>)}</div></section>
    </div>
  );
}

function MobilePreview() {
  return (
    <div className="flex items-start justify-center gap-8 p-8">
      <PhoneFrame />
      <div className="max-w-[180px] text-center">
        <div className="mx-auto mb-3 grid h-32 w-32 place-items-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">QR code (mock)</div>
        <p className="text-sm font-semibold">Scan with Expo Go</p>
        <p className="mt-1 text-xs font-bold text-slate-500">Starts when you build a mobile project</p>
      </div>
    </div>
  );
}
