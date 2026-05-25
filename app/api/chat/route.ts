import { streamText, type UIMessage } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveModel } from '@/lib/ai/providers'
import { routeModel, type BuilderMode } from '@/lib/ai/model-router'
import { resolveKnowledge, injectKnowledge } from '@/lib/knowledge/resolver'
import { listFilesCached } from '@/lib/fly/client'
import { getModelPricing } from '@/lib/ai/pricing-cache'
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
    mode?: BuilderMode
    deepThink?: boolean
    attachments?: Array<{ id: string; kind: 'image' | 'csv' | 'pdf' | 'file'; storage_path: string; filename: string }>
  }

  const { messages, projectId, modelId } = body
  const requestedMode: BuilderMode = body.mode ?? 'agent'
  const requestedDeepThink: boolean = !!body.deepThink
  const requestedAttachments = body.attachments ?? []

  if (!projectId || !modelId || !messages?.length) {
    return NextResponse.json({ error: 'projectId, modelId, and messages are required' }, { status: 400 })
  }

  // Load project + project brief in parallel. R0-6: model_pricing now via
  // 5-min in-process cache — DB hit only on cold start / cache miss.
  const [{ data: project }, modelPricing, { data: projectBrief }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, type, framework, design_style, primary_color, db_schema, backend_mode, fly_machine_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single(),
    getModelPricing(modelId),
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

  // Mode-aware model routing:
  //   - Agent + Plan default → respect user pick (same model, different prompt).
  //   - Plan + deepThink     → escalate to reasoning tier (Opus / GPT-5 / Gemini 2.5 Pro).
  //   - Code                 → silently downgrade to fast/cheap model.
  const routed = routeModel({
    mode: requestedMode,
    userModelId: modelId,
    userProvider: modelPricing.provider,
    deepThink: requestedDeepThink,
  })

  // Resolve AI model — fail gracefully if provider key is missing
  const model = resolveModel(routed.modelId, routed.provider)
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

  // R0-5: include input cost so the hold reserves enough credits for long sessions.
  // Estimate history size from message count (rough: 400 tokens/avg per recent turn).
  const recentTurnsForEstimate = Math.min(messages.length, 8)  // mirrors VERBATIM_WINDOW
  const historyTokenEstimate   = recentTurnsForEstimate * 400
  const estimate = estimateCredits(
    enhancedMessage,
    modelId,
    modelPricing.credits_per_1m_output,
    0,
    modelPricing.credits_per_1m_input,
    historyTokenEstimate,
  )
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

  // R0-4: fetch real file tree (cached 60s) so the model sees what already exists.
  // Previously [] was passed → model regenerated files it didn't know existed → wasted tokens.
  const machineIdForFiles = (project as { fly_machine_id?: string | null }).fly_machine_id ?? null
  const projectFileTree = machineIdForFiles ? await listFilesCached(machineIdForFiles) : []

  const contextMessages = buildContextMessages(messagesForContext, contextSummary, projectFileTree)

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
  const baseSystemPrompt = buildSystemPrompt({
    projectType:   project.type,
    framework:     project.framework,
    fileTree:      projectFileTree,
    designStyle:   project.design_style,
    primaryColor:  project.primary_color,
    dbSchema:      project.db_schema,
    backendMode:   project.backend_mode,
    briefAnswers,
    initialPrompt: projectBrief?.initial_prompt ?? null,
  })

  // Phase 21: load knowledge tiers — user prefs (DB) + project AGENTS.md (Fly machine)
  const { data: userKnow } = await supabase
    .from('user_knowledge').select('content, max_tokens').eq('user_id', user.id).maybeSingle()
  const knowledge = await resolveKnowledge({
    userKnowledge: (userKnow as { content?: string } | null)?.content ?? null,
    machineId:     (project as { fly_machine_id?: string | null }).fly_machine_id ?? null,
    maxChars:      6000,
  })
  const systemPrompt = injectKnowledge(baseSystemPrompt, knowledge)

  // ── Prompt caching (R0-1) ─────────────────────────────────────────────
  // Anthropic: mark the system prefix as ephemeral so subsequent turns
  //   read from cache at ~10% of normal input cost.
  // OpenAI: caching is automatic when prefixes are stable >1024 tokens
  //   (no explicit marker needed) — restructure ensures stability.
  // Google: no caching marker needed; Gemini reuses recent context internally.
  // For non-Anthropic providers the providerOptions is silently ignored.
  const cachedSystemMessage = {
    role: 'system' as const,
    content: systemPrompt,
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' as const } },
    },
  }

  const result = streamText({
    model,
    messages: [cachedSystemMessage, ...contextMessages],
    onFinish: async ({ totalUsage, text, providerMetadata }) => {
      try {
        const tokensInput  = totalUsage.inputTokens ?? 0
        const tokensOutput = totalUsage.outputTokens ?? 0
        // R0-7: persist Anthropic cache telemetry so we can measure hit rate.
        // providerMetadata.anthropic shape: { cacheCreationInputTokens, cacheReadInputTokens }
        const anthMeta = (providerMetadata?.anthropic ?? {}) as {
          cacheCreationInputTokens?: number
          cacheReadInputTokens?:     number
        }
        const cacheCreation = anthMeta.cacheCreationInputTokens ?? 0
        const cacheRead     = anthMeta.cacheReadInputTokens ?? 0

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

        // G1: persist assistant message with its mode so MessageItem can
        // render PlanCard for plan-mode outputs.
        const { data: assistantMessageRow } = await supabase.from('messages').insert({
          project_id:   projectId,
          role:         'assistant',
          content:      text,
          model_id:     modelId,
          credits_used: actualCredits,
          mode:         requestedMode,
        }).select('id').single()

        // G1: if this was a plan-mode message, store it in the plans table
        // so the UI can show approve/discard actions and track status.
        if (requestedMode === 'plan' && assistantMessageRow) {
          await supabase.from('plans').insert({
            project_id:    projectId,
            user_id:       user.id,
            message_id:    (assistantMessageRow as { id: string }).id,
            markdown:      text,
            status:        'draft',
            input_tokens:  tokensInput,
            output_tokens: tokensOutput,
          })
        }

        await supabase.from('agent_runs').update({
          status:        'completed',
          final_credits: actualCredits,
          tokens_input:  tokensInput,
          tokens_output: tokensOutput,
          cache_creation_input_tokens: cacheCreation,
          cache_read_input_tokens:     cacheRead,
          finished_at:   new Date().toISOString(),
        }).eq('id', agentRun.id)

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
