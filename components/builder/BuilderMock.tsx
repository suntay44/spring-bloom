"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { UIMessage } from "ai";
import { ArrowUpRight, BarChart3, Check, ChevronDown, Cloud, Code2, FileText, Github, Globe2, History, KeyRound, MessageSquare, MoreHorizontal, PanelLeft, RefreshCw, Share2, ShieldCheck, Smartphone, Sparkles, Upload, type LucideIcon } from "lucide-react";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { ProjectMenu, MoreToolsMenu, type BuilderTab, type ProjectMenuUser } from "@/components/builder/ProjectMenu";
import { AnalyticsPanel } from "@/components/builder/panels/AnalyticsPanel";
import { DiffPanel } from "@/components/builder/panels/DiffPanel";
import { FilesPanel } from "@/components/builder/panels/FilesPanel";
import { FindingsPanel } from "@/components/builder/panels/FindingsPanel";
import { IntegrationsPanel } from "@/components/builder/panels/IntegrationsPanel";
import { AuthProvidersPanel } from "@/components/builder/panels/AuthProvidersPanel";
import { PreviewPanel } from "@/components/builder/panels/PreviewPanel";
import { PublishModal } from "@/components/builder/PublishModal";
import { UpgradeModal } from "@/components/builder/UpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMachineProvisioner } from "@/hooks/useMachineProvisioner";
import { toast } from "@/lib/toast";
import type { MockProject, MockProjectType } from "@/lib/mock/projects";
import { MOCK_REVIEW_RUN } from "@/lib/mock/reviews";
import { MOCK_SECURITY_RUN } from "@/lib/mock/security";

const visibleToolbarTabs = ["Preview", "Files", "Diff", "Review", "Security", "Analytics", "Integrations", "Auth"] as const;

const TAB_ICONS: Record<BuilderTab, LucideIcon> = {
  Preview: Globe2,
  Files: FileText,
  Diff: Code2,
  Review: ShieldCheck,
  Security: Cloud,
  Analytics: BarChart3,
  Integrations: Sparkles,
  Auth: KeyRound,
};

const TYPE_LABELS: Record<MockProjectType, string> = {
  mobile: "Expo · Mobile",
  fullstack: "Next.js · Fullstack",
  landing: "Static · Landing"
};

type BuilderMockProps = {
  project: MockProject;
  initialMessages?: UIMessage[];
  machineId: string | null;
  user: ProjectMenuUser;
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

type ViewMode = "desktop" | "mobile";

const PREVIEW_ROUTES = ["/", "/dashboard", "/login", "/signup", "/settings", "/pricing"];

export function BuilderMock({ project, initialMessages = [], machineId, user }: BuilderMockProps) {
  const [tab, setTab] = useState<BuilderTab>("Preview");
  const [publishOpen, setPublishOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [visualEdits, setVisualEdits] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [currentRoute, setCurrentRoute] = useState("/");
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // In production, derive from user profile: plan === "free"
  const isFreePlan = true;
  const machine = useMachineProvisioner(project.id, machineId);
  const TAB_PANELS: Record<BuilderTab, () => ReactNode> = {
    Preview:      () => <PreviewPanel machineId={machine.machineId} project={project} provisioning={machine.provisioning} />,
    Files:        () => <FilesPanel machineId={machine.machineId} />,
    Diff:         () => <DiffPanel />,
    Review:       () => <FindingsPanel key="review" title="Code Review" items={MOCK_REVIEW_RUN.findings} />,
    Security:     () => <FindingsPanel key="security" title="Security Scan" items={MOCK_SECURITY_RUN.findings} />,
    Analytics:    () => <AnalyticsPanel />,
    Integrations: () => <IntegrationsPanel projectId={project.id} />,
    Auth:         () => <AuthProvidersPanel projectId={project.id} />,
  };

  function toggleVisualEdits() {
    setVisualEdits((current) => {
      const next = !current;
      toast(next ? "Visual edits on" : "Visual edits off");
      return next;
    });
  }

  useEffect(() => {
    if (!machine.machineId) return
    function onUnload() {
      navigator.sendBeacon(`/api/fly/machine/${machine.machineId}/stop`)
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [machine.machineId])

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
          {menuOpen ? <ProjectMenu projectId={project.id} user={user} /> : null}
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
          <div className="preview-url-pill">
            <Tooltip>
              <TooltipTrigger render={
                <button
                  className={`preview-device-toggle ${viewMode === "mobile" ? "active" : ""}`}
                  onClick={() => setViewMode(viewMode === "mobile" ? "desktop" : "mobile")}
                  type="button"
                />
              }>
                <Smartphone size={14} />
              </TooltipTrigger>
              <TooltipContent>{viewMode === "mobile" ? "Show desktop preview" : "Show mobile preview"}</TooltipContent>
            </Tooltip>

            <button
              className="preview-route-trigger"
              onClick={() => setRoutePickerOpen((v) => !v)}
              type="button"
            >
              {currentRoute}
            </button>

            {routePickerOpen && (
              <div className="preview-route-dropdown">
                {PREVIEW_ROUTES.map((route) => (
                  <button
                    className={`preview-route-item ${route === currentRoute ? "active" : ""}`}
                    key={route}
                    onClick={() => { setCurrentRoute(route); setRoutePickerOpen(false); }}
                    type="button"
                  >
                    <span>{route}</span>
                    {route === currentRoute && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="preview-url-actions">
            <Tooltip>
              <TooltipTrigger render={<button className="tool-btn" onClick={() => { window.open("/", "_blank"); toast("Opening preview in new tab..."); }} type="button" />}>
                <ArrowUpRight size={15} />
              </TooltipTrigger>
              <TooltipContent>Open preview in new tab</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<button className="tool-btn" onClick={() => toast("Preview refreshed")} type="button" />}>
                <RefreshCw size={15} />
              </TooltipTrigger>
              <TooltipContent>Refresh page</TooltipContent>
            </Tooltip>
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
            <TooltipTrigger render={<Button onClick={() => isFreePlan ? setUpgradeOpen(true) : setPublishOpen(true)} type="button" variant="default" />}>
              <Upload size={16} /> Publish
            </TooltipTrigger>
            <TooltipContent>{isFreePlan ? "Upgrade to publish" : "Publish"}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <PublishModal open={publishOpen} onOpenChange={setPublishOpen} projectId={project.id} />
      {upgradeOpen && <UpgradeModal feature="Publish to live URL" requiredPlan="Starter" onClose={() => setUpgradeOpen(false)} />}

      <main className="builder-workspace">
        {!sidebarCollapsed ? <ChatPanel initialMessages={initialMessages} machineId={machine.machineId} projectId={project.id} onTabChange={setTab} onToolsOpen={() => setToolsOpen(true)} onVisualEditsToggle={toggleVisualEdits} visualEdits={visualEdits} /> : null}
        <section className={`preview-pane${viewMode === "mobile" ? " view-mobile" : ""}`}>
          <div className="preview-browser">
            {TAB_PANELS[tab]()}
          </div>
        </section>
      </main>
      </div>
    </TooltipProvider>
  );
}
