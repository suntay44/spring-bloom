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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { MOCK_MESSAGES, type MockMessage } from "@/lib/mock/messages";
import type { MockProject, MockProjectType } from "@/lib/mock/projects";
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

const TYPE_LABELS: Record<MockProjectType, string> = {
  mobile: "Expo · Mobile",
  fullstack: "Next.js · Fullstack",
  landing: "Static · Landing"
};

const MOCK_AI_RESPONSES = [
  "Done! I've updated the component. Check the Files tab for the diff.",
  "The Kanban board now supports drag-and-drop. Preview refreshed.",
  "Added the billing table to the dashboard. 3 files updated."
] as const;

type BuilderMockProps = {
  project: MockProject;
};

function TooltipButton({ label, ariaLabel = label, children, onClick }: { label: string; ariaLabel?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<button aria-label={ariaLabel} className="tool-btn" onClick={onClick} type="button" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function BuilderMock({ project }: BuilderMockProps) {
  const [tab, setTab] = useState<BuilderTab>("Preview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [messages, setMessages] = useState<MockMessage[]>(MOCK_MESSAGES);
  const [responseIndex, setResponseIndex] = useState(0);
  const [visualEdits, setVisualEdits] = useState(false);
  const TAB_PANELS: Record<BuilderTab, () => ReactNode> = {
    Preview: () => <PreviewPanel project={project} />,
    Files: () => <FilesPanel />,
    Diff: () => <DiffPanel />,
    Review: () => <FindingsPanel key="review" title="Code Review" items={MOCK_REVIEW_RUN.findings} />,
    Security: () => <FindingsPanel key="security" title="Security Scan" items={MOCK_SECURITY_RUN.findings} />,
    Analytics: () => <AnalyticsPanel />
  };

  function handleSendMessage() {
    const response = MOCK_AI_RESPONSES[responseIndex % MOCK_AI_RESPONSES.length] ?? MOCK_AI_RESPONSES[0];
    setMessages((current) => [...current, { id: `mock-response-${current.length + 1}`, role: "assistant", content: response }]);
    setResponseIndex((current) => current + 1);
  }

  function toggleVisualEdits() {
    setVisualEdits((current) => {
      const next = !current;
      toast(next ? "Visual edits on" : "Visual edits off");
      return next;
    });
  }

  return (
    <TooltipProvider>
      <div className={`builder-page ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <header className="builder-chrome">
        <div className="builder-project">
          <button className="project-trigger" onClick={() => setMenuOpen((value) => !value)} type="button">
            <span className="project-mark"><Sparkles size={15} /></span>
            <span><strong>{project.name}</strong><small>Claude 4.5 Sonnet · model locked</small></span>
            <Badge variant="secondary">{TYPE_LABELS[project.type]}</Badge>
            <ChevronDown size={15} />
          </button>
          {menuOpen ? <ProjectMenu /> : null}
        </div>

        <div className="builder-toolbar-cluster">
          <div className="chat-header-tools" aria-label="Conversation controls">
            <TooltipButton ariaLabel="View run history" label="Run history" onClick={() => toast("Run history — coming soon")}><History size={16} /></TooltipButton>
            <TooltipButton ariaLabel={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} label={sidebarCollapsed ? "Show sidebar" : "Collapse sidebar"} onClick={() => setSidebarCollapsed((value) => !value)}><PanelLeft size={16} /></TooltipButton>
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
              <TooltipButton ariaLabel="More tools" label="More tools" onClick={() => setToolsOpen((value) => !value)}><MoreHorizontal size={17} /></TooltipButton>
              {toolsOpen ? <MoreToolsMenu setTab={setTab} /> : null}
            </div>
          </nav>
        </div>

        <div className="preview-addressbar">
          <div className="device-pill"><Laptop size={16} /><span>/</span></div>
          <div className="flex items-center gap-2">
            <TooltipButton ariaLabel="Open preview in new tab" label="Open preview" onClick={() => { window.open("/", "_blank"); toast("Opening preview in new tab..."); }}><ArrowUpRight size={16} /></TooltipButton>
            <TooltipButton ariaLabel="Refresh preview" label="Refresh preview" onClick={() => toast("Preview refreshed")}><RefreshCw size={16} /></TooltipButton>
          </div>
        </div>

        <div className="builder-actions">
          <TooltipButton ariaLabel="Comments" label="Comments" onClick={() => toast("Comments — coming soon")}><MessageSquare size={16} /></TooltipButton>
          <Tooltip>
            <TooltipTrigger render={<Button onClick={() => toast("Share link copied: https://wildca.ke/share/demo123")} type="button" variant="outline" />}>
              <Share2 size={16} /> Share
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
          <TooltipButton ariaLabel="Connect GitHub" label="GitHub" onClick={() => toast("Connect GitHub in Settings → Integrations")}><Github size={17} /></TooltipButton>
          <Tooltip>
            <TooltipTrigger render={<Button onClick={() => toast("Deploying to Vercel... (mock)")} type="button" />}>
              <Upload size={16} /> Publish
            </TooltipTrigger>
            <TooltipContent>Publish</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <main className="builder-workspace">
        {!sidebarCollapsed ? <ChatPanel messages={messages} onSend={handleSendMessage} onTabChange={setTab} onToolsOpen={() => setToolsOpen(true)} onVisualEditsToggle={toggleVisualEdits} visualEdits={visualEdits} /> : null}
        <section className="preview-pane">
          <div className="preview-browser">
            {TAB_PANELS[tab]()}
          </div>
        </section>
      </main>
      </div>
    </TooltipProvider>
  );
}
