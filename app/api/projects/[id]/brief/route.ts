/**
 * POST /api/projects/[id]/brief
 *
 * Called after the user's FIRST message before generation starts.
 * Generates 3–5 dynamic planning questions using the same model the user
 * selected — not hardcoded. Works with GPT-4o, Claude, Gemini, or any
 * model in the model_pricing table.
 *
 * Flow:
 *   1. Authenticate + validate project ownership
 *   2. Match scaffold template for the prompt (same lookup used by enhancer)
 *   3. Generate questions via planning-agent.ts using the selected model
 *   4. Upsert project_briefs row with initial_prompt + questions
 *   5. Return questions to the client
 *
 * PATCH /api/projects/[id]/brief
 *   Saves answers + marks brief approved_at = now().
 *
 * GET /api/projects/[id]/brief
 *   Returns the stored brief (questions + answers) for a project.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generatePlanningQuestions } from '@/lib/ai/planning-agent'
import { lookupTemplate } from '@/lib/library/template-lookup'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: brief } = await supabase
    .from('project_briefs')
    .select('initial_prompt, questions, answers, approved_at')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ brief })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  const body = await req.json() as {
    prompt?: string
    modelId?: string
    trigger?: 'first_message' | 'ambiguous_feature'
  }
  const { prompt, modelId, trigger = 'first_message' } = body

  if (!prompt || !modelId) {
    return NextResponse.json({ error: 'prompt and modelId are required' }, { status: 400 })
  }

  // Verify project ownership + get type/framework for scaffold lookup
  const { data: project } = await supabase
    .from('projects')
    .select('id, type, framework')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Resolve provider for the selected model (needed by planning-agent)
  const { data: modelPricing } = await supabase
    .from('model_pricing')
    .select('provider')
    .eq('model_id', modelId)
    .eq('is_active', true)
    .single()

  const provider = modelPricing?.provider ?? 'anthropic'

  // Match scaffold — same function used by the prompt enhancer
  const isMobile =
    project.framework === 'expo' ||
    project.type === 'mobile' ||
    project.framework === 'react-native'

  const { templateName } = await lookupTemplate(prompt, isMobile)

  // Generate questions using the user's own selected model
  const questions = await generatePlanningQuestions(prompt, modelId, provider, templateName, trigger)

  // Upsert brief — safe to re-call if user goes back and changes their prompt
  await supabase
    .from('project_briefs')
    .upsert(
      {
        project_id:     projectId,
        user_id:        user.id,
        initial_prompt: prompt,
        questions,
        answers:        {},
        prd:            {},
        approved_at:    null,
      },
      { onConflict: 'project_id,user_id', ignoreDuplicates: false },
    )

  return NextResponse.json({ questions, templateName })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const body = await req.json() as { answers?: Record<string, string> }

  if (!body.answers) {
    return NextResponse.json({ error: 'answers are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('project_briefs')
    .update({
      answers:     body.answers,
      approved_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
