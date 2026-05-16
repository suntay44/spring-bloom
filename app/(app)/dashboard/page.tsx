import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_PROJECTS } from "@/lib/mock/projects";

export default function DashboardPage() {
  return (
    <section className="app-content">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Your Projects</h1>
          <p className="mt-2 text-slate-300">Mock project grid for the UI-first gate.</p>
        </div>
        <Button render={<Link href="/new" />}>
          <Plus size={17} /> New Project
        </Button>
      </div>
      <div className="grid-3">
        {MOCK_PROJECTS.map((project) => (
          <article className="card project-card" key={project.id}>
            <div className="mb-5 h-36 rounded-lg bg-[linear-gradient(135deg,#1f1235,#09090e)]" />
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{project.type}</p>
            <h2 className="mt-2 text-2xl font-semibold">{project.name}</h2>
            <p className="mt-2 text-slate-300">{project.prompt}</p>
            <div className="mt-5 flex items-center justify-between">
              <Badge variant="secondary">{project.status}</Badge>
              <Button render={<Link href={`/builder/${project.id}`} />} variant="outline">
                Open <ArrowUpRight size={16} />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
