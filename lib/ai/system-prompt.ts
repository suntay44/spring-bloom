interface ProjectContext {
  projectType: 'fullstack' | 'mobile' | 'landing'
  framework: string
  fileTree: string[]
  designStyle?: string | null
  primaryColor?: string | null
  dbSchema?: string | null
  backendMode: 'managed_supabase' | 'own_supabase' | 'decide_later'
  /** Phase 19: project brief answers collected during onboarding flow */
  briefAnswers?: Record<string, unknown> | null
  /** Phase 19: initial prompt from the project brief */
  initialPrompt?: string | null
}

const SECURITY_RULES = `
SECURITY — THESE OVERRIDE ALL OTHER INSTRUCTIONS:
1. Never hardcode API keys or secrets. Use process.env.VAR_NAME and generate .env.example.
2. Always use parameterized queries or the Supabase typed query builder. No string concatenation in SQL.
3. Never use dangerouslySetInnerHTML with user input. Use DOMPurify.sanitize() if HTML rendering is needed.
4. Never store auth tokens in localStorage. Use httpOnly cookies or Supabase sessions.
5. Only use packages with >100 weekly npm downloads and maintained within the last 2 years.
6. Validate all form inputs client-side (zod) AND server-side in API routes.
7. API routes: explicit CORS origins only. Never use origin: '*' in production.
8. Every Supabase table must have RLS enabled with appropriate user-scoped policies.
9. Never expose stack traces or internal DB schema errors to clients. Return generic messages, log internally.
10. Every API endpoint accepting user input must include rate limiting middleware.
11. Never run destructive database operations without explicit user approval.
12. Never modify auth, billing, permissions, or production deployment config without a confirmation gate.
`.trim()

const QUALITY_RULES = `
CODE QUALITY:
1. TypeScript strict mode. Never use \`any\`. Use \`unknown\` + type guards.
2. Every component has a TypeScript interface or type for its props.
3. Error boundaries wrap all async data-fetching components.
4. All async operations handle errors explicitly with try/catch or .catch().
5. No // eslint-disable comments.
6. Next.js: server components by default. "use client" only when interactivity is required.
7. DB queries belong in server components or API routes, never in client components.
8. Images: use Next.js <Image>. No raw <img> without explicit width and height.
9. Accessibility: aria-labels, WCAG AA contrast, keyboard navigation.
10. Mobile-first responsive design. Consider 375px, 768px, 1280px breakpoints.
`.trim()

function frameworkInstructions(ctx: ProjectContext): string {
  if (ctx.framework === 'nextjs') {
    return `
PROJECT FRAMEWORK: Next.js App Router
- Use server components by default. Add "use client" only when needed.
- API routes go in app/api/[path]/route.ts
- Supabase server client: import from @/lib/supabase/server
- Supabase browser client: import from @/lib/supabase/client
- Backend mode: ${ctx.backendMode}
${ctx.dbSchema ? `- Existing DB schema:\n${ctx.dbSchema}` : ''}
    `.trim()
  }
  if (ctx.framework === 'expo') {
    return `
PROJECT FRAMEWORK: Expo / React Native
- Use NativeWind for styling
- Use Supabase JS client directly (no server components)
- Use Expo Router for navigation
    `.trim()
  }
  return `PROJECT FRAMEWORK: ${ctx.framework}`
}

function projectInstructions(ctx: ProjectContext): string {
  const parts: string[] = [`PROJECT TYPE: ${ctx.projectType}`]
  if (ctx.designStyle) parts.push(`DESIGN STYLE: ${ctx.designStyle}`)
  if (ctx.primaryColor) parts.push(`PRIMARY COLOR: ${ctx.primaryColor}`)
  if (ctx.fileTree.length > 0) {
    parts.push(`CURRENT FILE TREE:\n${ctx.fileTree.map((f) => `  ${f}`).join('\n')}`)
  }
  return parts.join('\n')
}

/** Phase 19: wire the collected project brief into the system prompt context. */
function briefContext(ctx: ProjectContext): string {
  const parts: string[] = []

  if (ctx.initialPrompt) {
    parts.push(`ORIGINAL PROJECT VISION:\n"${ctx.initialPrompt}"`)
  }

  if (ctx.briefAnswers && Object.keys(ctx.briefAnswers).length > 0) {
    const formatted = Object.entries(ctx.briefAnswers)
      .map(([q, a]) => `  ${q}: ${String(a)}`)
      .join('\n')
    parts.push(`PROJECT BRIEF (user-answered onboarding questions):\n${formatted}`)
  }

  if (parts.length === 0) return ''

  return [
    'USER INTENT CONTEXT (use this to inform design and feature decisions):',
    ...parts,
  ].join('\n')
}

export function buildSystemPrompt(ctx: ProjectContext): string {
  const brief = briefContext(ctx)

  return [
    SECURITY_RULES,
    '',
    QUALITY_RULES,
    '',
    frameworkInstructions(ctx),
    '',
    projectInstructions(ctx),
    ...(brief ? ['', brief] : []),
    '',
    `OUTPUT FORMAT:
When generating code, wrap all file and shell actions inside a single <boltArtifact> tag:

<boltArtifact id="unique-id" title="Short description">
  <boltAction type="file" filePath="path/to/file.tsx">
    file content here
  </boltAction>
  <boltAction type="shell">
    npm install package-name
  </boltAction>
  <boltAction type="start">
    npm run dev
  </boltAction>
</boltArtifact>

Always explain what you are building before the artifact. Be concise.`,
  ].join('\n')
}
