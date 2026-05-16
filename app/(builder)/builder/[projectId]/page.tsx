import { BuilderMock } from "@/components/builder/BuilderMock";
import { MOCK_PROJECTS } from "@/lib/mock/projects";

export default async function BuilderPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = MOCK_PROJECTS.find((item) => item.id === projectId);

  if (!project) {
    return <div className="grid h-screen place-items-center text-slate-500">Project not found</div>;
  }

  return <BuilderMock project={project} />;
}
