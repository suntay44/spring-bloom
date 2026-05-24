/**
 * AGENTS.md generator
 *
 * Produces a project-level knowledge file that:
 *   - The SpringBloom builder reads on every turn
 *   - Cursor, Claude Code, Copilot, and other tools read by convention
 *   - Lives in the user's repo (portable, version-controlled)
 *
 * This is THE differentiating choice vs Lovable, which stores knowledge in
 * a SaaS-locked textarea. Ours travels with the code.
 */

export interface AgentsMdInput {
  projectName:    string
  projectType:    'mobile' | 'fullstack' | 'landing' | string
  framework?:     string                          // 'Next.js', 'Expo', 'Vite'
  primaryColor?:  string                          // hex
  designStyle?:   string                          // 'minimal', 'playful', 'editorial'
  scaffoldName?:  string                          // matched template name
  briefAnswers?:  Record<string, string>          // from project_briefs Q&A
  techStack?:     string[]                        // ['TypeScript','Tailwind','Supabase']
}

export function buildAgentsMd(input: AgentsMdInput): string {
  const lines: string[] = []

  lines.push(`# ${input.projectName}`)
  lines.push('')
  lines.push('> This file is read by SpringBloom on every build turn. It is also compatible with Cursor, Claude Code, and Copilot.')
  lines.push('> Update it as your project conventions evolve.')
  lines.push('')

  // ── Project facts ──
  lines.push('## Project')
  lines.push(`- Type: ${input.projectType}`)
  if (input.framework)    lines.push(`- Framework: ${input.framework}`)
  if (input.designStyle)  lines.push(`- Design style: ${input.designStyle}`)
  if (input.primaryColor) lines.push(`- Primary color: \`${input.primaryColor}\``)
  if (input.scaffoldName) lines.push(`- Started from scaffold: **${input.scaffoldName}**`)
  lines.push('')

  // ── Tech stack ──
  if (input.techStack && input.techStack.length > 0) {
    lines.push('## Tech Stack')
    for (const t of input.techStack) lines.push(`- ${t}`)
    lines.push('')
  }

  // ── Brief answers (user intent) ──
  if (input.briefAnswers && Object.keys(input.briefAnswers).length > 0) {
    lines.push('## Intent (from planning Q&A)')
    for (const [q, a] of Object.entries(input.briefAnswers)) {
      const cleanQ = q.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      lines.push(`- **${cleanQ}:** ${a}`)
    }
    lines.push('')
  }

  // ── Default conventions ──
  lines.push('## Conventions')
  lines.push('- Use TypeScript strict mode. No `any` without a `// reason:` comment.')
  lines.push('- Prefer named exports. Default exports only for Next.js page/layout files.')
  lines.push('- Keep components under 250 lines. Extract sub-components above that.')
  lines.push('- Validate all API inputs with Zod (or similar). Never trust the client.')
  lines.push('- Database access goes through a typed client — no raw SQL strings in components.')
  lines.push('')

  // ── Security baseline ──
  lines.push('## Security Baseline')
  lines.push('- Every table must have RLS enabled and at least one policy.')
  lines.push('- Webhook routes must verify signatures before processing.')
  lines.push('- Never log secrets, tokens, or PII.')
  lines.push('- Use the service-role key only in server-only files (never in `"use client"` components).')
  lines.push('')

  // ── Editing rules ──
  lines.push('## Editing Rules')
  lines.push('- Prefer minimal diffs. Don\'t reformat unrelated code.')
  lines.push('- Keep one concept per commit message.')
  lines.push('- If adding a dependency, justify it in the chat reply.')
  lines.push('')

  return lines.join('\n')
}
