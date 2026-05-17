import type { ParsedArtifact, ParsedAction } from '@/lib/ai/artifact-parser'

export type ActionResult = {
  action: ParsedAction
  ok: boolean
  output?: string
  error?: string
}

// Runs all actions from parsed artifacts against the user's machine via API routes.
// Returns results for each action so the UI can display progress.
export async function runArtifactActions(
  machineId: string,
  artifacts: ParsedArtifact[],
  onProgress?: (result: ActionResult) => void
): Promise<ActionResult[]> {
  const results: ActionResult[] = []

  for (const artifact of artifacts) {
    // Batch file writes — send in one request
    const fileActions = artifact.actions.filter((a) => a.type === 'file')
    if (fileActions.length > 0) {
      try {
        const res = await fetch(`/api/fly/machine/${machineId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileActions.map((a) => ({ path: a.filePath ?? 'unknown', content: a.content })),
          }),
        })
        for (const action of fileActions) {
          const result: ActionResult = { action, ok: res.ok }
          results.push(result)
          onProgress?.(result)
        }
      } catch (err) {
        for (const action of fileActions) {
          const result: ActionResult = { action, ok: false, error: String(err) }
          results.push(result)
          onProgress?.(result)
        }
      }
    }

    // Shell + start commands — run sequentially
    const shellActions = artifact.actions.filter((a) => a.type === 'shell' || a.type === 'start')
    for (const action of shellActions) {
      try {
        const res = await fetch(`/api/fly/machine/${machineId}/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: action.content }),
        })
        const json = await res.json() as { data?: { stdout: string; stderr: string; exit_code: number } }
        const result: ActionResult = {
          action,
          ok: res.ok && (json.data?.exit_code ?? 0) === 0,
          output: json.data?.stdout,
          error: json.data?.stderr,
        }
        results.push(result)
        onProgress?.(result)
      } catch (err) {
        const result: ActionResult = { action, ok: false, error: String(err) }
        results.push(result)
        onProgress?.(result)
      }
    }
  }

  return results
}
