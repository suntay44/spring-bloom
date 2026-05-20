import { notFound } from "next/navigation"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/admin/require-admin"

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()
  const { id } = await params
  const db = createAdminClient()

  const [projectRes, messagesRes, runsRes] = await Promise.all([
    db.from("projects")
      .select("id, name, framework, user_id, created_at, updated_at, description")
      .eq("id", id)
      .single(),
    db.from("messages")
      .select("id, role, content, created_at, token_count")
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      .limit(100),
    db.from("agent_runs")
      .select("id, status, prompt, model, input_tokens, output_tokens, credits_used, created_at, completed_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (projectRes.error || !projectRes.data) notFound()

  const project  = projectRes.data
  const messages = messagesRes.data ?? []
  const runs     = runsRes.data ?? []

  const totalCredits = runs.reduce((sum, r) => sum + (r.credits_used ?? 0), 0)

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <Link href={`/backend-admin/users/${project.user_id}`} className="text-xs text-zinc-500 hover:text-white mb-2 block">
          ← Back to User
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            <p className="text-sm text-zinc-500">{project.framework} · Created {new Date(project.created_at).toLocaleDateString()}</p>
            {project.description && (
              <p className="mt-1 text-sm text-zinc-400">{project.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Total Credits Used</p>
            <p className="text-2xl font-bold text-white">{totalCredits}</p>
          </div>
        </div>
      </div>

      {/* Agent Runs */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Agent Runs ({runs.length})</h2>
        <div className="space-y-2">
          {runs.length === 0 && <p className="text-sm text-zinc-500">No runs yet</p>}
          {runs.map(run => (
            <div key={run.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={run.status} />
                    <span className="text-xs text-zinc-500">{run.model ?? "—"}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span className="text-xs text-zinc-500">{new Date(run.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{run.prompt ?? "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-500">Credits</p>
                  <p className="text-sm font-semibold text-white">{run.credits_used ?? 0}</p>
                  {run.input_tokens != null && (
                    <p className="text-xs text-zinc-600">{run.input_tokens}in / {run.output_tokens}out</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Message Thread */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Message Thread ({messages.length})</h2>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {messages.length === 0 && <p className="text-sm text-zinc-500">No messages</p>}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`rounded-lg px-4 py-3 ${
                msg.role === "user"
                  ? "bg-zinc-800 border border-zinc-700"
                  : "bg-zinc-900 border border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${msg.role === "user" ? "text-purple-400" : "text-zinc-400"}`}>
                  {msg.role}
                </span>
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  {msg.token_count != null && <span>{msg.token_count} tokens</span>}
                  <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-4 whitespace-pre-wrap">
                {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    completed: "bg-green-900/50 text-green-400",
    running:   "bg-blue-900/50 text-blue-400",
    failed:    "bg-red-900/50 text-red-400",
    pending:   "bg-zinc-700 text-zinc-300",
  }
  const cls = map[status ?? "pending"] ?? "bg-zinc-700 text-zinc-300"
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status ?? "pending"}
    </span>
  )
}
