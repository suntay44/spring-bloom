"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, BarChart3, ChevronDown, Cloud, Code2, FileText, Github, Globe2, History, Laptop, MessageSquare, MoreHorizontal, PanelLeft, RefreshCw, Share2, ShieldCheck, Sparkles, Upload, type LucideIcon } from "lucide-react";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { ProjectMenu, MoreToolsMenu, type BuilderTab } from "@/components/builder/ProjectMenu";
import { AnalyticsPanel } from "@/components/builder/panels/AnalyticsPanel";
import { DiffPanel } from "@/components/builder/panels/DiffPanel";
import { FilesPanel } from "@/components/builder/panels/FilesPanel";
import { FindingsPanel } from "@/components/builder/panels/FindingsPanel";
import { PreviewPanel } from "@/components/builder/panels/PreviewPanel";
import { MOCK_MESSAGES } from "@/lib/mock/messages";
import { MOCK_REVIEW_RUN } from "@/lib/mock/reviews";
import { MOCK_SECURITY_RUN } from "@/lib/mock/security";

const visibleToolbarTabs = ["Preview", "Files", "Diff", "Review", "Security", "Analytics"] as const;

const TAB_ICONS: Record<BuilderTab, LucideIcon> = {
  Preview: Globe2,
  Files: FileText,
  Diff: Code2,
  Review: ShieldCheck,
  Security: Cloud,
  Analytics: BarChart3
};

const TAB_PANELS: Record<BuilderTab, ReactNode> = {
  Preview: <PreviewPanel />,
  Files: <FilesPanel />,
  Diff: <DiffPanel />,
  Review: <FindingsPanel title="Code Review" items={MOCK_REVIEW_RUN.findings} />,
  Security: <FindingsPanel title="Security Scan" items={MOCK_SECURITY_RUN.findings} />,
  Analytics: <AnalyticsPanel />
};

export function BuilderMock() {
  const [tab, setTab] = useState<BuilderTab>("Preview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className={`builder-page ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <header className="builder-chrome">
        <div className="builder-project">
          <button className="project-trigger" onClick={() => setMenuOpen((value) => !value)} type="button">
            <span className="project-mark"><Sparkles size={15} /></span>
            <span><strong>Task Manager Pro</strong><small>Claude 4.5 Sonnet · model locked</small></span>
            <ChevronDown size={15} />
          </button>
          {menuOpen ? <ProjectMenu /> : null}
        </div>

        <div className="builder-toolbar-cluster">
          <div className="chat-header-tools" aria-label="Conversation controls">
            <button aria-label="View run history" className="tool-btn" title="Run history" type="button"><History size={16} /></button>
            <button aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="tool-btn" onClick={() => setSidebarCollapsed((value) => !value)} title={sidebarCollapsed ? "Show sidebar" : "Collapse sidebar"} type="button"><PanelLeft size={16} /></button>
          </div>

          <nav className="builder-top-tools" aria-label="Builder tools">
            {visibleToolbarTabs.map((item) => {
              const Icon = TAB_ICONS[item];
              return (
                <button aria-label={item} className={`tool-tab ${item === tab ? "active" : ""}`} key={item} onClick={() => setTab(item)} title={item} type="button">
                  <Icon size={16} />
                  <span>{item}</span>
                </button>
              );
            })}
            <div className="tools-menu-wrap">
              <button aria-label="More tools" className="tool-btn" onClick={() => setToolsOpen((value) => !value)} title="More tools" type="button"><MoreHorizontal size={17} /></button>
              {toolsOpen ? <MoreToolsMenu setTab={setTab} /> : null}
            </div>
          </nav>
        </div>

        <div className="preview-addressbar">
          <div className="device-pill"><Laptop size={16} /><span>/</span></div>
          <div className="flex items-center gap-2">
            <button aria-label="Open preview in new tab" className="tool-btn" title="Open preview" type="button"><ArrowUpRight size={16} /></button>
            <button aria-label="Refresh preview" className="tool-btn" title="Refresh preview" type="button"><RefreshCw size={16} /></button>
          </div>
        </div>

        <div className="builder-actions">
          <button aria-label="Comments" className="tool-btn" title="Comments" type="button"><MessageSquare size={16} /></button>
          <button className="button secondary" type="button"><Share2 size={16} /> Share</button>
          <button aria-label="Connect GitHub" className="tool-btn" title="GitHub" type="button"><Github size={17} /></button>
          <button className="button blue" onClick={() => setTab("Security")} type="button"><Upload size={16} /> Publish</button>
        </div>
      </header>

      <main className="builder-workspace">
        {!sidebarCollapsed ? <ChatPanel messages={MOCK_MESSAGES} onTabChange={setTab} onToolsOpen={() => setToolsOpen(true)} /> : null}
        <section className="preview-pane">
          <div className="preview-browser">
            {TAB_PANELS[tab]}
          </div>
        </section>
      </main>
    </div>
  );
}
