import { streamText, type UIMessage } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { buildContextMessages } from '@/lib/ai/context-manager'
import { getBalance, holdCredits, finalizeCredits } from '@/lib/credits/calculate'
import { estimateCredits } from '@/lib/ai/credit-estimator'

export const maxDuration = 60

function extractText(message: UIMessage | undefined): string {
  return message?.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n') ?? ''
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    messages: UIMessage[]
    projectId: string
    modelId: string
  }

  const { messages, projectId, modelId } = body

  if (!projectId || !modelId || !messages?.length) {
    return NextResponse.json({ error: 'projectId, modelId, and messages are required' }, { status: 400 })
  }

  // Load project (select only what's needed — never select *)
  const [{ data: project }, { data: modelPricing }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, type, framework, design_style, primary_color, db_schema, backend_mode')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('model_pricing')
      .select('model_id, display_name, provider, min_plan, credits_per_1m_input, credits_per_1m_output')
      .eq('model_id', modelId)
      .eq('is_active', true)
      .single(),
  ])

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!modelPricing) return NextResponse.json({ error: 'Model not available' }, { status: 400 })

  // Load user plan for model gate check
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single() as { data: { plan: string } | null; error: unknown }

  const planOrder = ['free', 'starter', 'pro', 'teams']
  const userPlanIndex = planOrder.indexOf(profile?.plan ?? 'free')
  const requiredPlanIndex = planOrder.indexOf(modelPricing.min_plan ?? 'free')

  if (userPlanIndex < requiredPlanIndex) {
    return NextResponse.json(
      { error: `This model requires the ${modelPricing.min_plan} plan or higher` },
      { status: 403 }
    )
  }

  // Resolve AI model — fail gracefully if provider key is missing
  const model = resolveModel(modelId, modelPricing.provider)
  if (!model) {
    return NextResponse.json(
      { error: `Provider ${modelPricing.provider} is not configured on this server` },
      { status: 503 }
    )
  }

  // Credit check
  const balance = await getBalance(user.id)
  const lastUserMessage = extractText(messages[messages.length - 1])
  const estimate = estimateCredits(lastUserMessage, modelId, modelPricing.credits_per_1m_output)
  if (balance < estimate.min) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  // Create agent run row
  const { data: agentRun, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      project_id: projectId,
      user_id: user.id,
      prompt: lastUserMessage,
      model_provider: modelPricing.provider,
      model_id: modelId,
      model_label: modelPricing.display_name,
      estimated_credits: estimate.estimate,
      held_credits: estimate.estimate,
      status: 'building',
    })
    .select('id')
    .single()

  if (runError || !agentRun) {
    return NextResponse.json({ error: 'Failed to create agent run' }, { status: 500 })
  }

  // Place credit hold — do this before saving the user message so that if it
  // fails we don't leave orphaned messages in the DB.
  await holdCredits(user.id, estimate.estimate, agentRun.id, projectId)

  // Save user message only after hold succeeds
  await supabase.from('messages').insert({
    project_id: projectId,
    role: 'user',
    content: lastUserMessage,
    model_id: modelId,
    credits_used: 0,
  })

  // Load message history for context (after saving so the new message is included)
  const { data: dbMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(30)

  const contextMessages = buildContextMessages(dbMessages ?? [], undefined, [])

  const systemPrompt = buildSystemPrompt({
    projectType: project.type,
    framework: project.framework,
    fileTree: [],
    designStyle: project.design_style,
    primaryColor: project.primary_color,
    dbSchema: project.db_schema,
    backendMode: project.backend_mode,
  })

  const result = streamText({
    model,
    system: systemPrompt,
    messages: contextMessages,
    onFinish: async ({ totalUsage, text }) => {
      // Wrap in try/catch — if finalization fails the stream has already completed
      // successfully for the user; we log the error but don't crash.
      try {
        const tokensInput = totalUsage.inputTokens ?? 0
        const tokensOutput = totalUsage.outputTokens ?? 0

        const actualCredits = await finalizeCredits(
          user.id,
          agentRun.id,
          projectId,
          modelId,
          {
            tokensInput,
            tokensOutput,
            creditsPerMInput: modelPricing.credits_per_1m_input,
            creditsPerMOutput: modelPricing.credits_per_1m_output,
          },
          estimate.estimate
        )

        await Promise.all([
          supabase.from('messages').insert({
            project_id: projectId,
            role: 'assistant',
            content: text,
            model_id: modelId,
            credits_used: actualCredits,
          }),
          supabase.from('agent_runs').update({
            status: 'completed',
            final_credits: actualCredits,
            tokens_input: tokensInput,
            tokens_output: tokensOutput,
            finished_at: new Date().toISOString(),
          }).eq('id', agentRun.id),
        ])
      } catch (err) {
        // Log server-side only — never expose internal errors to the client
        console.error('[chat/onFinish] Failed to finalize run:', err)
        // Mark agent run as failed so credits aren't silently held
        await supabase.from('agent_runs')
          .update({ status: 'failed', finished_at: new Date().toISOString() })
          .eq('id', agentRun.id)
          .then(null, () => null) // best-effort
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
