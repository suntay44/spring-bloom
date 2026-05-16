export type MockArtifact = {
  type: "file" | "shell" | "start";
  path?: string;
  command?: string;
  status: "complete" | "streaming" | "queued" | "error";
};

export type MockMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifacts?: MockArtifact[];
};

export const MOCK_MESSAGES: MockMessage[] = [
  { id: "m1", role: "user", content: "Build a team task manager with a Kanban board, auth, and analytics." },
  {
    id: "m2",
    role: "assistant",
    content: "I checked the project brief, locked Claude 4.5 Sonnet for this run, and generated the first preview from the approved v1 scope.",
    artifacts: [
      { type: "file", path: "app/page.tsx", status: "complete" },
      { type: "file", path: "app/dashboard/page.tsx", status: "complete" },
      { type: "file", path: "components/KanbanBoard.tsx", status: "complete" },
      { type: "shell", command: "npm install @dnd-kit/core", status: "complete" },
      { type: "file", path: "components/TeamManagement.tsx", status: "streaming" }
    ]
  },
  { id: "m3", role: "assistant", content: "Review pass: 86/100. Security scan found one high-priority RLS item to fix before deploy." }
];

export const MOCK_FILE_TREE: Array<{ path: string; type: "file" | "folder" }> = [
  { path: "app/page.tsx", type: "file" },
  { path: "app/dashboard/page.tsx", type: "file" },
  { path: "app/layout.tsx", type: "file" },
  { path: "components/KanbanBoard.tsx", type: "file" },
  { path: "components/TaskCard.tsx", type: "file" },
  { path: "lib/supabase/client.ts", type: "file" },
  { path: "package.json", type: "file" }
];

export const MOCK_FILE_CONTENT = `// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:users(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {/* task list */}
    </div>
  )
}`;
