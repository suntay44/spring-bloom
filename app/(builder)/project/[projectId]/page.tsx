import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { BuilderMock } from "@/components/builder/BuilderMock";
import { createClient } from "@/lib/supabase/server";
import type { MockProject } from "@/lib/mock/projects";
import type { ProjectMenuUser } from "@/components/builder/ProjectMenu";

const PLAN_MAX_CREDITS: Record<string, number> = {
  free: 100,
  pro: 1500,
  agency: 5000,
};

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [
    { data: project },
    { data: messages },
    { data: profile },
    { data: balanceRow },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, type, framework, status, fly_machine_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("messages")
      .select("id, role, content")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("profiles")
      .select("full_name, plan")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_credit_balance")
      .select("balance")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!project) notFound();

  const initialMessages: UIMessage[] = (messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));

  // Adapt real project to MockProject shape for BuilderMock (temporary until BuilderMock is refactored)
  const mockProject: MockProject = {
    id: project.id,
    name: project.name,
    type: project.type as MockProject["type"],
    framework: project.framework as MockProject["framework"],
    status: (project.status ?? "draft") as MockProject["status"],
    lastUpdated: "just now",
    creditsUsed: 0,
    prompt: "",
  };

  const plan = profile?.plan ?? "free";
  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? "User";
  const credits = Math.max(0, Number(balanceRow?.balance ?? 0));
  const maxCredits = PLAN_MAX_CREDITS[plan] ?? 100;

  const menuUser: ProjectMenuUser = {
    initials: fullName.charAt(0).toUpperCase(),
    workspace: `${fullName}'s Workspace`,
    plan,
    credits,
    maxCredits,
  };

  return <BuilderMock initialMessages={initialMessages} machineId={project.fly_machine_id ?? null} project={mockProject} user={menuUser} />;
}
