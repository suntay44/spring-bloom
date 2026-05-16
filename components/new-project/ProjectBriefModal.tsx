"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefFields } from "./BriefStep";

export type BriefStep = 1 | 2 | 3 | 4 | 5 | 6;

type ProjectBriefModalProps = {
  appType: string;
  model: string;
  prompt: string;
  projectId?: string;
  setOpen: (value: boolean) => void;
  setStep: (value: BriefStep) => void;
  step: BriefStep;
};

const BACKEND_OPTIONS = [
  { id: "managed", label: "Managed Supabase - we handle it", defaultChecked: true },
  { id: "byo", label: "Connect my own Supabase", defaultChecked: false },
  { id: "later", label: "Decide later - frontend/mock data first", defaultChecked: false }
] as const;

export function ProjectBriefModal({ appType, model, prompt, projectId = "healthtech-proto", setOpen, setStep, step }: ProjectBriefModalProps) {
  const next = () => setStep(step < 6 ? ((step + 1) as BriefStep) : step);
  const back = () => setStep(step > 1 ? ((step - 1) as BriefStep) : step);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [setOpen]);

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{step < 6 ? `Step ${step} of 5` : "Simple PRD"}</p>
            <h2 className="text-2xl font-semibold">{step < 6 ? "Project brief" : "Review before building"}</h2>
          </div>
          <button aria-label="Close brief" className="icon-btn" onClick={() => setOpen(false)} type="button">×</button>
        </div>
        <div className="modal-body">
          {step === 1 ? <BriefFields title="Product goal" fields={["App name", "Who is this for?", "What should v1 accomplish?"]} values={["Task Manager Pro", "Teams managing shared tasks", "Create, assign, and track work"]} /> : null}
          {step === 2 ? <BriefFields title="Frontend and design" fields={["Visual style", "Theme", "Device priority"]} values={["Clean SaaS dashboard", "Light mode with blue accent", "Desktop and mobile"]} /> : null}
          {step === 3 ? (
            <div>
              <h3 className="text-xl font-semibold">Backend and data</h3>
              <div className="mt-5 grid gap-3">
                {BACKEND_OPTIONS.map((option) => (
                  <label className="card flex items-center gap-3 p-4 font-bold" key={option.id}>
                    <input defaultChecked={option.defaultChecked} name="backend" type="radio" /> {option.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {step === 4 ? <BriefFields title="Core features and screens" fields={["Required screens", "Required user actions"]} values={["Landing, auth, dashboard, kanban, settings", "Create tasks, assign owners, move status"]} /> : null}
          {step === 5 ? <BriefFields title="Rules, integrations, and constraints" fields={["Integrations", "Roles/security", "Avoid in v1"]} values={["Analytics enabled, email later", "Workspace members only see their workspace", "Payments and advanced reporting"]} /> : null}
          {step === 6 ? <PrdReview appType={appType} model={model} prompt={prompt} /> : null}
        </div>
        <div className="modal-footer">
          <Button disabled={step === 1} onClick={back} type="button" variant="outline">Back</Button>
          {step < 6 ? <Button onClick={next} type="button">{step === 5 ? "Generate PRD" : "Next"}</Button> : <Button render={<Link href={`/builder/${projectId}`} />}>Start Building <ArrowRight size={17} /></Button>}
        </div>
      </div>
    </div>
  );
}

function PrdReview({ appType, model, prompt }: { appType: string; model: string; prompt: string }) {
  const derivedName = prompt.split(".")[0]?.trim().slice(0, 50) || "My App";
  const summary = [
    { label: "Main flow", value: "Sign up → workspace → tasks → board" },
    { label: "Backend", value: "Managed Supabase" },
    { label: "Estimate", value: "85 credits" }
  ] as const;

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-black p-5 text-white">
        <p className="text-sm font-semibold text-purple-200">{appType} · {model}</p>
        <h3 className="mt-2 text-3xl font-semibold">{derivedName}</h3>
        <p className="mt-3 text-slate-300">{prompt}</p>
      </div>
      <div className="grid-3">
        {summary.map(({ label, value }) => (
          <div className="card p-4" key={label}>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
            <p className="mt-2 font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <p className="font-semibold">V1 scope</p>
        <p className="mt-2 text-slate-300">Landing page, auth screens, dashboard, Kanban board, team settings, analytics hooks, review/security surfaces.</p>
      </div>
    </div>
  );
}
