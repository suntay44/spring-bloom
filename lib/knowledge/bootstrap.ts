/**
 * G2: bootstrap a project's AGENTS.md the first time its Fly machine is created.
 *
 * The file is the project's single source of truth for AI context. It's read
 * by the builder on every turn (via lib/knowledge/resolver.ts) AND by any
 * external tool the user opens the repo in (Cursor, Claude Code, Copilot).
 *
 * Strategy:
 *   1. Fetch project metadata + brief answers (if any).
 *   2. Generate AGENTS.md from buildAgentsMd().
 *   3. Write to /app/AGENTS.md on the machine, ONLY if no AGENTS.md already
 *      exists (we never clobber user edits).
 *
 * Best-effort: any failure is logged + swallowed so machine provisioning
 * still succeeds.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { execOnMachine, writeFile } from '@/lib/fly/client'
import { buildAgentsMd } from './agents-md'
import { invalidateKnowledgeCache } from './resolver'

export async function bootstrapProjectKnowledge(
  supabase: SupabaseClient,
  machineId: string,
  projectId: string,
): Promise<{ written: boolean; reason?: string }> {
  try {
    // 1. Don't clobber an existing AGENTS.md
    const existing = await execOnMachine(
      machineId,
      ['sh', '-c', 'test -s /app/AGENTS.md && echo present || echo absent'],
      '/app',
      5,
    )
    if (existing.stdout.trim() === 'present') {
      return { written: false, reason: 'AGENTS.md already exists' }
    }

    // 2. Pull project + brief
    const [{ data: project }, { data: brief }] = await Promise.all([
      supabase
        .from('projects')
        .select('name, type, framework, design_style, primary_color')
        .eq('id', projectId)
        .maybeSingle(),
      supabase
        .from('project_briefs')
        .select('answers')
        .eq('project_id', projectId)
        .maybeSingle(),
    ])
    if (!project) return { written: false, reason: 'project row missing' }

    const proj = project as {
      name?: string
      type?: string
      framework?: string | null
      design_style?: string | null
      primary_color?: string | null
    }

    // 3. Build markdown
    const md = buildAgentsMd({
      projectName:    proj.name ?? 'Untitled Project',
      projectType:    proj.type ?? 'fullstack',
      framework:      proj.framework ?? undefined,
      designStyle:    proj.design_style ?? undefined,
      primaryColor:   proj.primary_color ?? undefined,
      briefAnswers:   ((brief as { answers?: Record<string, string> } | null)?.answers) ?? undefined,
    })

    // 4. Write to machine
    await writeFile(machineId, '/app/AGENTS.md', md)

    // 5. Invalidate the in-process knowledge cache so the NEXT chat turn
    //    reads the fresh AGENTS.md instead of stale ''.
    invalidateKnowledgeCache(machineId)

    return { written: true }
  } catch (err) {
    return {
      written: false,
      reason: err instanceof Error ? err.message : 'unknown error',
    }
  }
}
