"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronLeft, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { PhoneFrame, DEVICES, type DeviceId } from "@/components/builder/PhoneFrame";
import type { MockProject } from "@/lib/mock/projects";

const KANBAN_COLUMNS = [
  { column: "Backlog",     items: ["Auth screens", "Billing table", "Empty states"] },
  { column: "In Progress", items: ["Project brief flow", "Analytics hooks"] },
  { column: "Review",      items: ["RLS policy", "Keyboard focus"] },
  { column: "Done",        items: ["Landing page", "Pricing page"] },
] as const;

// ─── Web viewport ────────────────────────────────────────────────────────────

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "390px",
};

const VIEWPORT_OPTIONS = [
  { id: "desktop", icon: Monitor    },
  { id: "tablet",  icon: Tablet     },
  { id: "mobile",  icon: Smartphone },
] as const satisfies Array<{ id: Viewport; icon: typeof Monitor }>;

// ─── Mobile devices ──────────────────────────────────────────────────────────

const IPHONE_IDS:  DeviceId[] = ["iphone-se", "iphone-15", "iphone-15-pro-max"];
const SAMSUNG_IDS: DeviceId[] = ["galaxy-s24", "galaxy-s24-ultra"];

// ─── Component ───────────────────────────────────────────────────────────────

export function PreviewPanel({
  project,
  machineId,
  provisioning,
}: {
  project: MockProject;
  machineId: string | null;
  provisioning: boolean;
}) {
  const [viewport,  setViewport]  = useState<Viewport>("desktop");
  const [deviceId,  setDeviceId]  = useState<DeviceId>("iphone-15");
  const isMobile = project.type === "mobile";

  if (provisioning) {
    return (
      <div className="grid min-h-[520px] place-items-center text-center">
        <div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="font-semibold">Warming up your environment...</p>
          <p className="mt-2 text-sm font-bold text-slate-500">Provisioning a Fly.io machine for this project.</p>
        </div>
      </div>
    );
  }

  if (machineId) {
    // Live preview — web gets viewport switcher, mobile gets device switcher
    return (
      <div>
        {isMobile ? (
          <DeviceToolbar deviceId={deviceId} onSelect={setDeviceId} />
        ) : (
          <ViewportToolbar viewport={viewport} onSelect={setViewport} />
        )}

        {isMobile ? (
          <div className="flex justify-center overflow-auto p-6">
            <PhoneFrame deviceId={deviceId}>
              <iframe
                className="h-full w-full border-none bg-white"
                src={`/api/fly/preview/${machineId}`}
                title={`${project.name} live preview`}
              />
            </PhoneFrame>
          </div>
        ) : (
          <div className="overflow-auto">
            <div className="mx-auto transition-all duration-300" style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}>
              <iframe
                className="h-[720px] w-full bg-white"
                src={`/api/fly/preview/${machineId}`}
                title={`${project.name} live preview`}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // No machine yet — mock preview for visual context
  if (isMobile) {
    return (
      <div>
        <DeviceToolbar deviceId={deviceId} onSelect={setDeviceId} />
        <MobilePreview deviceId={deviceId} />
      </div>
    );
  }

  return (
    <div>
      <ViewportToolbar viewport={viewport} onSelect={setViewport} />
      <div className="overflow-auto">
        <div className="mx-auto transition-all duration-300" style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}>
          <WebPreview />
        </div>
      </div>
    </div>
  );
}

// ─── Toolbars ─────────────────────────────────────────────────────────────────

function ViewportToolbar({ viewport, onSelect }: { viewport: Viewport; onSelect: (v: Viewport) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-zinc-800 px-4 py-2">
      {VIEWPORT_OPTIONS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          aria-label={`${id} view`}
          aria-pressed={viewport === id}
          className={`shared-tab ${viewport === id ? "active" : ""}`}
          onClick={() => onSelect(id)}
          type="button"
        >
          <Icon size={15} />
          <span className="capitalize">{id}</span>
        </button>
      ))}
    </div>
  );
}

function DeviceToolbar({ deviceId, onSelect }: { deviceId: DeviceId; onSelect: (d: DeviceId) => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2">
      {/* iPhones */}
      <span className="text-xs font-bold text-slate-500">iPhone</span>
      {IPHONE_IDS.map((id) => (
        <button
          key={id}
          aria-label={`iPhone ${DEVICES[id].label}`}
          aria-pressed={deviceId === id}
          className={`shared-tab ${deviceId === id ? "active" : ""}`}
          onClick={() => onSelect(id)}
          type="button"
        >
          {DEVICES[id].label}
        </button>
      ))}

      <span className="mx-1 h-4 w-px bg-zinc-700" />

      {/* Samsung */}
      <span className="text-xs font-bold text-slate-500">Samsung</span>
      {SAMSUNG_IDS.map((id) => (
        <button
          key={id}
          aria-label={`Samsung ${DEVICES[id].label}`}
          aria-pressed={deviceId === id}
          className={`shared-tab ${deviceId === id ? "active" : ""}`}
          onClick={() => onSelect(id)}
          type="button"
        >
          {DEVICES[id].label}
        </button>
      ))}
    </div>
  );
}

// ─── Mock previews ────────────────────────────────────────────────────────────

function MobilePreview({ deviceId }: { deviceId: DeviceId }) {
  return (
    <div className="flex items-start justify-center gap-8 p-8">
      <PhoneFrame deviceId={deviceId} />
      <div className="max-w-[180px] text-center">
        <div className="mx-auto mb-3 grid h-32 w-32 place-items-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">
          QR code (mock)
        </div>
        <p className="text-sm font-semibold">Scan with Expo Go</p>
        <p className="mt-1 text-xs font-bold text-slate-500">Starts when you build a mobile project</p>
      </div>
    </div>
  );
}

function WebPreview() {
  return (
    <div className="sample-app">
      <header className="sample-nav">
        <div className="sample-brand"><span className="sample-logo">W</span><strong>WorkFlow</strong></div>
        <nav><a>Features</a><a>Templates</a><a>Pricing</a></nav>
        <button type="button">Get Started</button>
      </header>
      <section className="sample-hero">
        <div>
          <p>Project dashboard</p>
          <h1>Plan, assign, and ship team work.</h1>
        </div>
        <div className="sample-search">
          <label>Workspace<span>Engineering</span></label>
          <label>View<span>Kanban</span></label>
          <label>Status<span>Active sprint</span></label>
          <button aria-label="Refresh sample preview" type="button"><RefreshCw size={18} /></button>
        </div>
      </section>
      <section className="sample-content">
        <div className="sample-heading">
          <div>
            <h2>Current Sprint</h2>
            <p>Generated from your approved PRD</p>
          </div>
          <div className="sample-nav-arrows">
            <button aria-label="Previous sprint" type="button"><ChevronLeft size={18} /></button>
            <button aria-label="Open sprint" type="button"><ArrowUpRight size={18} /></button>
          </div>
        </div>
        <div className="kanban-grid">
          {KANBAN_COLUMNS.map(({ column, items }) => (
            <div className="kanban-column" key={column}>
              <h3>{column}</h3>
              {items.map((item) => (
                <article key={item}><strong>{item}</strong><span>Owner: AI agent</span></article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
