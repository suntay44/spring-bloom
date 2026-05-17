"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings2 } from "lucide-react";
import { ProjectBriefModal, type BriefStep } from "@/components/new-project/ProjectBriefModal";
import { InteractivePromptCard } from "@/components/shared/InteractivePromptCard";
import { toast } from "@/lib/toast";
import { appTypes, models, type AIModel, type AppType } from "@/lib/mock/data";

const PROMPT_CHIPS = ["Wingman", "My Counter Part", "Bill Generator", "Word of the Day"] as const;
const HERO_STATS = [
  { label: "Brief first", value: "5 questions" },
  { label: "Model locked", value: "per run" },
  { label: "Credit aware", value: "before build" },
] as const;

// Map UI app type label → DB values
function resolveProjectType(label: string): { type: "fullstack" | "mobile" | "landing"; framework: "nextjs" | "expo" | "static" } {
  if (label.toLowerCase().includes("mobile")) return { type: "mobile", framework: "expo" };
  if (label.toLowerCase().includes("landing")) return { type: "landing", framework: "static" };
  return { type: "fullstack", framework: "nextjs" };
}

export function NewProjectClient() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<BriefStep>(1);
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastAppType, setLastAppType] = useState<AppType>(appTypes[0]);
  const [lastModel, setLastModel] = useState<AIModel>(models[0]);
  const [creating, setCreating] = useState(false);

  async function handleStartBuild(opts: { prompt: string; appType: AppType; model: AIModel }) {
    setLastPrompt(opts.prompt);
    setLastAppType(opts.appType);
    setLastModel(opts.model);
    setStep(1);
    setModalOpen(true);
  }

  async function handleBriefApproved(projectName: string) {
    if (creating) return;
    setCreating(true);
    setModalOpen(false);

    try {
      const { type, framework } = resolveProjectType(lastAppType.label);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, type, framework }),
      });

      const payload = await response.json() as { data?: { id: string }; error?: string };

      if (!response.ok || !payload.data) {
        toast.error(payload.error ?? "Failed to create project");
        return;
      }

      toast.success("Project created!");
      router.push(`/project/${payload.data.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <section className="hero min-h-0 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h1>What will you build today?</h1>
          <div className="mx-auto mb-8 grid max-w-3xl grid-cols-3 gap-3 text-center">
            {HERO_STATS.map(({ label, value }) => (
              <div className="card px-4 py-3" key={label}>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <InteractivePromptCard
            instanceId="new-project"
            onPromptChange={setPrompt}
            onSend={({ prompt: p, appType, model }) => { void handleStartBuild({ prompt: p, appType, model }); }}
            prompt={prompt}
          />
          <div className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-3">
            {PROMPT_CHIPS.map((chip) => (
              <button className="pill" key={chip} onClick={() => setPrompt(`Build ${chip} as a polished app.`)} type="button">
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="app-content">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Recent Tasks</h2>
            <span className="text-xl font-semibold text-slate-500">|</span>
            <h2 className="text-xl font-semibold text-slate-500">Deployed Apps</h2>
          </div>
          <button aria-label="Filter tasks" className="icon-btn" onClick={() => toast("Filter — coming soon")} type="button">
            <Settings2 size={18} />
          </button>
        </div>
        <div className="card overflow-hidden">
          <div className="project-table-row border-b border-zinc-800 bg-zinc-900/50 px-5 py-4 text-xs font-semibold uppercase tracking-normal text-slate-500">
            <span>ID</span><span>Task</span><span>Last Modified</span><span />
          </div>
          {/* TODO Phase 12: load real projects from /api/projects and link to /project/[id] */}
          <div className="px-5 py-8 text-center text-sm font-semibold text-slate-600">
            {creating ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> Creating project...</span>
            ) : (
              "No projects yet. Start by describing your app above."
            )}
          </div>
        </div>
      </section>

      {modalOpen ? (
        <ProjectBriefModal
          appType={lastAppType.label}
          model={lastModel.label}
          projectId="pending"
          prompt={lastPrompt}
          setOpen={setModalOpen}
          setStep={setStep}
          step={step}
          onApproved={handleBriefApproved}
        />
      ) : null}
    </div>
  );
}
