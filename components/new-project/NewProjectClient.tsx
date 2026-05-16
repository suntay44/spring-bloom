"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { ProjectBriefModal, type BriefStep } from "@/components/new-project/ProjectBriefModal";
import { InteractivePromptCard } from "@/components/shared/InteractivePromptCard";
import { appTypes, models, type AIModel, type AppType } from "@/lib/mock/data";
import { MOCK_PROJECTS } from "@/lib/mock/projects";

const PROMPT_CHIPS = ["Wingman", "My Counter Part", "Bill Generator", "Word of the Day"] as const;
const HERO_STATS = [
  { label: "Brief first", value: "5 questions" },
  { label: "Model locked", value: "per run" },
  { label: "Credit aware", value: "before build" }
] as const;

export function NewProjectClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<BriefStep>(1);
  const [chipPrompt, setChipPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastAppType, setLastAppType] = useState<AppType>(appTypes[0]);
  const [lastModel, setLastModel] = useState<AIModel>(models[0]);
  const primaryProjectId = MOCK_PROJECTS[0]?.id ?? "healthtech-proto";

  return (
    <div>
      <section className="hero min-h-0 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-md border border-purple-500/30 bg-zinc-950/50 px-3 py-2 text-sm font-semibold text-white backdrop-blur">Christian&apos;s Project</div>
          <h1>What will you build today?</h1>
          <div className="mx-auto mb-8 grid max-w-3xl grid-cols-3 gap-3 text-center">
            {HERO_STATS.map(({ label, value }) => <div className="card px-4 py-3" key={label}><p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}
          </div>
          <InteractivePromptCard
            defaultPrompt={chipPrompt}
            instanceId="new-project"
            onPromptChange={setChipPrompt}
            onSend={({ prompt, appType, model }) => {
              setLastPrompt(prompt);
              setLastAppType(appType);
              setLastModel(model);
              setStep(1);
              setModalOpen(true);
            }}
          />
          <div className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-3">
            {PROMPT_CHIPS.map((chip) => <button className="pill" key={chip} onClick={() => setChipPrompt(`Build ${chip} as a polished app.`)} type="button">{chip}</button>)}
          </div>
        </div>
      </section>
      <section className="app-content">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><h2 className="text-xl font-semibold">Recent Tasks</h2><span className="text-xl font-semibold text-slate-500">|</span><h2 className="text-xl font-semibold text-slate-500">Deployed Apps</h2></div><button aria-label="Filter tasks" className="icon-btn" type="button"><Settings2 size={18} /></button></div>
        <div className="card overflow-hidden"><div className="grid grid-cols-[1fr_1.6fr_1fr_44px] gap-4 border-b border-zinc-800 bg-zinc-900/50 px-5 py-4 text-xs font-semibold uppercase tracking-normal text-slate-500"><span>ID</span><span>Task</span><span>Last Modified</span><span /></div>
          {MOCK_PROJECTS.map((project) => <Link className="grid grid-cols-[1fr_1.6fr_1fr_44px] gap-4 border-t border-zinc-900 px-5 py-5 transition-colors hover:bg-zinc-900/70" href={`/builder/${project.id}`} key={project.id}><span className="font-bold text-slate-500">EMT - {project.id.slice(0, 6)}</span><span><strong>{project.name}</strong><span className="mt-1 block text-sm text-slate-500">{project.prompt}</span></span><span className="font-bold text-slate-500">{project.lastUpdated}</span><span className="font-semibold">...</span></Link>)}
        </div>
      </section>
      {modalOpen ? <ProjectBriefModal appType={lastAppType.label} model={lastModel.label} projectId={primaryProjectId} prompt={lastPrompt} setOpen={setModalOpen} setStep={setStep} step={step} /> : null}
    </div>
  );
}
