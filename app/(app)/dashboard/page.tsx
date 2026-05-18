import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard — SpringBloom" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, type, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const list = projects ?? [];

  return (
    <section className="app-content">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Your Projects</h1>
          <p className="mt-2 text-slate-300">All your projects in one place.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/" />}>
          <Plus size={17} /> New Project
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">No projects yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            <Link className="underline hover:text-slate-300" href="/">Describe your app</Link> to get started.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {list.map((project) => (
            <article className="card project-card" key={project.id}>
              <div className="mb-5 h-36 rounded-lg bg-[linear-gradient(135deg,#1f1235,#09090e)]" />
              <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{project.type}</p>
              <h2 className="mt-2 text-2xl font-semibold">{project.name}</h2>
              <div className="mt-5 flex items-center justify-between">
                <Badge variant="secondary">{project.status}</Badge>
                <Button nativeButton={false} render={<Link href={`/project/${project.id}`} />} variant="outline">
                  Open <ArrowUpRight size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
