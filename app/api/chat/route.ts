import { streamText, type UIMessage } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { buildContextMessages } from '@/lib/ai/context-manager'
import { getBalance, holdCredits, finalizeCredits, cancelHold } from '@/lib/credits/calculate'
import { estimateCredits } from '@/lib/ai/credit-estimator'
import { chatRateLimit } from '@/lib/rate-limit'
import { enhancePrompt } from '@/lib/ai/prompt-enhancer'
import { trackBuild } from '@/lib/library/build-tracker'

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

  // Per-user rate limit — runs before any credit hold / LLM call so a user
  // can't hammer the expensive streaming endpoint.
  const { success } = await chatRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 })
  }

  const body = await req.json() as {
    messages: UIMessage[]
    projectId: string
    modelId: string
  }

  const { messages, projectId, modelId } = body

  if (!projectId || !modelId || !messages?.length) {
    return NextResponse.json({ error: 'projectId, modelId, and messages are required' }, { status: 400 })
  }

  // Load project + project brief in parallel
  const [{ data: project }, { data: modelPricing }, { data: projectBrief }] = await Promise.all([
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
    // Phase 19: load brief answers to wire into system prompt + enhancer
    supabase
      .from('project_briefs')
      .select('initial_prompt, answers')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle(),
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
  const rawUserMessage = extractText(messages[messages.length - 1])

  // Phase 19: enhance prompt before credit estimation and generation.
  // Falls back to the original message on any error — generation never blocks.
  const briefAnswers = (projectBrief?.answers as Record<string, unknown> | null) ?? null
  const enhancedMessage = await enhancePrompt(rawUserMessage, {
    framework:    project.framework,
    projectType:  project.type,
    briefAnswers,
    messageIndex: messages.length - 1,
  })

  const estimate = estimateCredits(enhancedMessage, modelId, modelPricing.credits_per_1m_output)
  if (balance < estimate.min) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  // Create agent run row (store the enhanced prompt so we can replay it)
  const { data: agentRun, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      project_id:        projectId,
      user_id:           user.id,
      prompt:            enhancedMessage,
      model_provider:    modelPricing.provider,
      model_id:          modelId,
      model_label:       modelPricing.display_name,
      estimated_credits: estimate.estimate,
      held_credits:      estimate.estimate,
      status:            'building',
    })
    .select('id')
    .single()

  if (runError || !agentRun) {
    return NextResponse.json({ error: 'Failed to create agent run' }, { status: 500 })
  }

  // Place credit hold before saving user message
  await holdCredits(user.id, estimate.estimate, agentRun.id, projectId)

  // Save the raw (user-visible) message to the messages table
  await supabase.from('messages').insert({
    project_id:   projectId,
    role:         'user',
    content:      rawUserMessage,
    model_id:     modelId,
    credits_used: 0,
  })

  // Load message history for context
  const { data: dbMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(30)

  // Replace the last user message in context with the enhanced version so the
  // model sees the richer spec, while the user still sees their original words.
  const messagesForContext = (dbMessages ?? []).map((m, idx, arr) => {
    if (m.role === 'user' && idx === arr.length - 1 && enhancedMessage !== rawUserMessage) {
      return { ...m, content: enhancedMessage }
    }
    return m
  })

  const contextMessages = buildContextMessages(messagesForContext, undefined, [])

  // Phase 19: system prompt now includes brief context
  const systemPrompt = buildSystemPrompt({
    projectType:   project.type,
    framework:     project.framework,
    fileTree:      [],
    designStyle:   project.design_style,
    primaryColor:  project.primary_color,
    dbSchema:      project.db_schema,
    backendMode:   project.backend_mode,
    briefAnswers,
    initialPrompt: projectBrief?.initial_prompt ?? null,
  })

  const result = streamText({
    model,
    system: systemPrompt,
    messages: contextMessages,
    onFinish: async ({ totalUsage, text }) => {
      try {
        const tokensInput  = totalUsage.inputTokens ?? 0
        const tokensOutput = totalUsage.outputTokens ?? 0

        const actualCredits = await finalizeCredits(
          user.id,
          agentRun.id,
          projectId,
          modelId,
          {
            tokensInput,
            tokensOutput,
            creditsPerMInput:  modelPricing.credits_per_1m_input,
            creditsPerMOutput: modelPricing.credits_per_1m_output,
          },
          estimate.estimate
        )

        await Promise.all([
          supabase.from('messages').insert({
            project_id:   projectId,
            role:         'assistant',
            content:      text,
            model_id:     modelId,
            credits_used: actualCredits,
          }),
          supabase.from('agent_runs').update({
            status:        'completed',
            final_credits: actualCredits,
            tokens_input:  tokensInput,
            tokens_output: tokensOutput,
            finished_at:   new Date().toISOString(),
          }).eq('id', agentRun.id),
        ])

        // Phase 19: fire-and-forget fingerprinting — never blocks the response
        void trackBuild({
          projectId,
          agentRunId:   agentRun.id,
          userId:       user.id,
          userPrompt:   enhancedMessage,
          artifactText: text,
          projectType:  project.type,
        })

      } catch (err) {
        console.error('[chat/onFinish] Failed to finalize run:', err)
        try {
          await cancelHold(user.id, estimate.estimate, agentRun.id, projectId)
        } catch (refundErr) {
          console.error('[chat/onFinish] Hold cancellation also failed:', refundErr)
        }
        await supabase.from('agent_runs')
          .update({ status: 'failed', finished_at: new Date().toISOString() })
          .eq('id', agentRun.id)
          .then(null, () => null)
      }
    },
    onError: async (event) => {
      console.error('[chat/onError] Stream failed:', event.error)
      try {
        await cancelHold(user.id, estimate.estimate, agentRun.id, projectId)
      } catch (refundErr) {
        console.error('[chat/onError] Hold cancellation failed:', refundErr)
      }
      await supabase.from('agent_runs')
        .update({ status: 'failed', finished_at: new Date().toISOString() })
        .eq('id', agentRun.id)
        .then(null, () => null)
    },
  })

  return result.toUIMessageStreamResponse()
}
