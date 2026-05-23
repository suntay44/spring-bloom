export type MockArtifact = {
  type: "file" | "shell" | "start";
  path?: string;
  command?: string;
  status: "complete" | "streaming" | "queued" | "error";
};

export type ScopingQuestionOption = {
  value: string;
  label: string;
  description?: string;
};

export type ScopingQuestion = {
  id: string;
  text: string;
  type?: 'choice' | 'text'; // default 'text' for backwards compat
  options?: ScopingQuestionOption[];
};

export type MockMessage =
  | {
      id: string;
      role: "user" | "assistant";
      content: string;
      artifacts?: MockArtifact[];
      questions?: never;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      questions: ScopingQuestion[];
      artifacts?: never;
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
  { id: "m3", role: "assistant", content: "Review pass: 86/100. Security scan found one high-priority RLS item to fix before deploy." },
  {
    id: "m4",
    role: "assistant",
    content: "Before I start the next phase, I have a few scoping questions:",
    questions: [
      { id: "q1", text: "Shall I proceed with the P0 → P1 → P2 plan above in this run?" },
      { id: "q2", text: "For the Kanban filters, is \"date range + assignee + priority\" sufficient, or do you want a status filter too (e.g. Blocked / In Review)?" },
      { id: "q3", text: "Any other tweaks before I generate?" },
    ],
  }
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
