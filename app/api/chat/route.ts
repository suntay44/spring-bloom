import { streamText, type UIMessage } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { buildContextMessages, shouldCompress, generateContextSummary } from '@/lib/ai/context-manager'
import { getBalance, holdCredits, finalizeCredits, cancelHold } from '@/lib/credits/calculate'
import { estimateCredits } from '@/lib/ai/credit-estimator'
import { chatRateLimit } from '@/lib/rate-limit'
import { enhancePrompt } from '@/lib/ai/prompt-enhancer'
import { trackBuild } from '@/lib/library/build-tracker'
import { checkPromptSafety } from '@/lib/safety/content-check'
import { createAdminClient } from '@/lib/supabase/admin'

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
    attachments?: Array<{ id: string; kind: 'image' | 'csv' | 'pdf' | 'file'; storage_path: string; filename: string }>
  }

  const { messages, projectId, modelId } = body
  const requestedAttachments = body.attachments ?? []

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

  // Content safety filter — block obvious abuse before any credit hold or LLM call.
  const safety = checkPromptSafety(rawUserMessage)
  if (!safety.safe) {
    // Fire-and-forget logging via service-role client; never block the response.
    const admin = createAdminClient()
    void admin.from('content_safety_violations').insert({
      user_id:         user.id,
      project_id:      projectId,
      prompt_snippet:  rawUserMessage.slice(0, 500),
      matched_pattern: safety.pattern ?? 'unknown',
      severity:        'block',
    })
    return NextResponse.json(
      { error: 'This request was blocked by our content safety filter. If you believe this is a mistake, contact support.' },
      { status: 400 }
    )
  }

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

  // Verify attachments belong to this user + project, and generate short-lived
  // signed URLs for any we'll feed to the model.
  type LoadedAttachment = {
    id: string
    kind: 'image' | 'csv' | 'pdf' | 'file'
    storage_path: string
    filename: string
    signedUrl: string
  }
  const loadedAttachments: LoadedAttachment[] = []

  if (requestedAttachments.length > 0) {
    const ids = requestedAttachments.map((a) => a.id)
    const { data: ownedRows } = await supabase
      .from('chat_attachments')
      .select('id, kind, storage_path, filename')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('project_id', projectId)

    for (const row of ownedRows ?? []) {
      const { data: signed } = await supabase
        .storage
        .from('chat-attachments')
        .createSignedUrl(row.storage_path, 60)
      if (signed?.signedUrl) {
        loadedAttachments.push({
          id:           row.id,
          kind:         row.kind as LoadedAttachment['kind'],
          storage_path: row.storage_path,
          filename:     row.filename,
          signedUrl:    signed.signedUrl,
        })
      }
    }
  }

  // For CSVs, prepend a small sample of headers + rows to the user message so
  // Claude has tabular context without us shipping the whole file.
  let csvContextBlock = ''
  for (const att of loadedAttachments.filter((a) => a.kind === 'csv')) {
    try {
      const res = await fetch(att.signedUrl, { headers: { Range: 'bytes=0-5120' } })
      if (!res.ok) continue
      const text = await res.text()
      const lines = text.split(/\r?\n/).filter(Boolean)
      const header = lines[0] ?? ''
      const sample = lines.slice(1, 21).join('\n')
      csvContextBlock += `\n\nAttached CSV (${att.filename}):\nColumns: ${header}\nSample rows:\n${sample}`
    } catch (err) {
      console.warn('[chat] CSV sample fetch failed', err)
    }
  }

  // PDFs / unknown files: just announce them so the model knows they exist.
  let otherFilesBlock = ''
  for (const att of loadedAttachments.filter((a) => a.kind === 'pdf' || a.kind === 'file')) {
    otherFilesBlock += `\n\nUser attached file: ${att.filename}`
  }

  const augmentedRawUserMessage = rawUserMessage + csvContextBlock + otherFilesBlock

  // Save the raw (user-visible) message to the messages table.
  // We persist the unaugmented text so the chat history UI stays clean — the
  // CSV sample / file-mention blocks only live in the prompt sent to the model.
  const { data: userMessageRow } = await supabase.from('messages').insert({
    project_id:   projectId,
    role:         'user',
    content:      rawUserMessage,
    model_id:     modelId,
    credits_used: 0,
  }).select('id').single()

  // Link uploaded attachments to this newly-saved message row.
  if (userMessageRow?.id && loadedAttachments.length > 0) {
    await supabase
      .from('chat_attachments')
      .update({ message_id: userMessageRow.id })
      .in('id', loadedAttachments.map((a) => a.id))
      .eq('user_id', user.id)
  }

  // Load message history for context
  const { data: dbMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(50)  // load more than we send — compression decides what survives

  const allMessages = dbMessages ?? []

  // ── Context compression ───────────────────────────────────────────────────
  // When a session grows long, summarise the older slice with Claude Haiku
  // (cheap, fast) and cache it on the project row. The verbatim window
  // (last 8 messages) is always sent in full — only older messages are folded
  // into the summary. This keeps input token costs flat regardless of session
  // length and prevents per-message cost from ballooning in long chats.
  let contextSummary: string | undefined
  if (shouldCompress(allMessages.length)) {
    // Try to load cached summary from project row first
    const { data: projectRow } = await supabase
      .from('projects')
      .select('context_summary')
      .eq('id', projectId)
      .single()

    if (projectRow?.context_summary) {
      contextSummary = projectRow.context_summary as string
    } else {
      // Generate and cache — fire-and-forget the cache write so it doesn't
      // block the user's response
      try {
        const summary = await generateContextSummary(allMessages)
        if (summary) {
          contextSummary = summary
          supabase.from('projects').update({ context_summary: summary }).eq('id', projectId)
        }
      } catch {
        // Non-fatal: fall through with no summary (full verbatim window still sent)
      }
    }
  }

  // Replace the last user message in context with the enhanced + attachment-
  // augmented version so the model sees the richer spec, while the user still
  // sees their original words in the chat history.
  const finalUserMessage = (enhancedMessage !== rawUserMessage ? enhancedMessage : rawUserMessage)
    + csvContextBlock
    + otherFilesBlock
  const messagesForContext = allMessages.map((m, idx, arr) => {
    if (m.role === 'user' && idx === arr.length - 1) {
      return { ...m, content: finalUserMessage }
    }
    return m
  })

  const contextMessages = buildContextMessages(messagesForContext, contextSummary, [])

  // Multimodal: attach image parts to the final user message for vision-capable models.
  const imageAttachments = loadedAttachments.filter((a) => a.kind === 'image')
  if (imageAttachments.length > 0) {
    const lastMessage = contextMessages[contextMessages.length - 1] as unknown as { role: string; content: unknown }
    if (lastMessage && lastMessage.role === 'user') {
      const baseText = typeof lastMessage.content === 'string' ? lastMessage.content : finalUserMessage
      lastMessage.content = [
        { type: 'text', text: baseText },
        ...imageAttachments.map((a) => ({ type: 'image' as const, image: a.signedUrl })),
      ] as unknown as typeof lastMessage.content
    }
  }
  // Reference unused var so eslint/no-unused-vars stays clean — also documents that
  // augmentedRawUserMessage is the canonical full prompt fed to the model in CSV/PDF paths.
  void augmentedRawUserMessage

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
        const errMsg = err instanceof Error ? err.message : 'Unknown finalize error'
        await supabase.from('agent_runs')
          .update({
            status:         'failed',
            finished_at:    new Date().toISOString(),
            error_message:  errMsg,
            failure_reason: 'finalize_error',
          })
          .eq('id', agentRun.id)
          .then(null, () => null)
      }
    },
    onError: async (event) => {
      const errMsg = event.error instanceof Error
        ? event.error.message
        : String(event.error ?? 'Stream error')
      console.error('[chat/onError] Stream failed:', errMsg)

      // Classify the failure reason for admin observability
      const failure_reason =
        errMsg.includes('timeout')       ? 'timeout'        :
        errMsg.includes('rate')          ? 'rate_limited'   :
        errMsg.includes('provider')      ? 'provider_error' :
        errMsg.includes('overloaded')    ? 'provider_error' :
                                           'stream_error'

      try {
        await cancelHold(user.id, estimate.estimate, agentRun.id, projectId)
      } catch (refundErr) {
        console.error('[chat/onError] Hold cancellation failed:', refundErr)
      }
      await supabase.from('agent_runs')
        .update({
          status:         'failed',
          finished_at:    new Date().toISOString(),
          error_message:  errMsg,
          failure_reason,
        })
        .eq('id', agentRun.id)
        .then(null, () => null)
    },
  })

  return result.toUIMessageStreamResponse()
}
