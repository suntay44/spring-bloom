"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChevronDown, FileText, Loader2, Mic, Paintbrush, Paperclip, X, Zap } from "lucide-react";
import { MessageItem } from "@/components/builder/MessageItem";
import { ScopingQuestionsCard } from "@/components/builder/ScopingQuestionsCard";
import { ModeToggle } from "@/components/builder/ModeToggle";
import type { BuilderMode } from "@/lib/ai/model-router";
import { parseArtifacts } from "@/lib/ai/artifact-parser";
import { shouldAskQuestions } from "@/lib/ai/ambiguity-detector";
import type { ScopingQuestion } from "@/lib/mock/messages";
import { estimateCredits } from "@/lib/ai/credit-estimator";
import { runArtifactActions } from "@/lib/fly/action-runner";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import type { BuilderTab } from "@/components/builder/ProjectMenu";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

type ChatPanelProps = {
  projectId: string;
  machineId: string | null;
  initialMessages?: UIMessage[];
  onTabChange: (tab: BuilderTab) => void;
  onToolsOpen: () => void;
  onVisualEditsToggle: () => void;
  visualEdits: boolean;
};

interface ModelOption {
  model_id: string;
  display_name: string;
  provider: string;
  min_plan: string;
  credits_per_1m_output: number;
}

const QUICK_ACTIONS = [
  { label: "Run review", action: "tab", tab: "Review" as const },
  { label: "Add billing", action: "tools" },
  { label: "Connect Supabase", action: "tab", tab: "Security" as const }
] as const;

const BUILD_OPTIONS = ["Build", "Preview only", "Deploy"] as const;

type ErrorState = { type: 'credits' | 'connection'; retryFn?: () => void } | null;

type AttachmentKind = 'image' | 'csv' | 'pdf' | 'file';

interface PendingAttachment {
  id: string;             // server-side chat_attachments.id
  kind: AttachmentKind;
  filename: string;
  storagePath: string;
  previewUrl: string | null;
  uploading?: boolean;
}

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/csv', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB matches bucket file_size_limit

function classifyKind(mime: string, filename: string): AttachmentKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'text/csv' || filename.toLowerCase().endsWith('.csv')) return 'csv';
  if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'file';
}

export function ChatPanel({ projectId, machineId, initialMessages = [], onTabChange, onToolsOpen, onVisualEditsToggle, visualEdits }: ChatPanelProps) {
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<BuilderMode>("agent");
  const [deepThink, setDeepThink] = useState(false);
  // G1: tracks plans for plan-mode messages so MessageItem can render PlanCard.
  // Keyed by message_id; populated after streaming completes for plan-mode runs.
  const [planMap, setPlanMap] = useState<Record<string, { planId: string; status: 'draft' | 'approved' | 'discarded' | 'executed' }>>({});
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("claude-sonnet-4-6");
  const [running, setRunning] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Planning / scoping questions state ───────────────────────────────────────
  // 'idle'      — normal chat, no questions pending
  // 'loading'   — calling /api/projects/[id]/brief to generate questions
  // 'questions' — showing ScopingQuestionsCard, waiting for answers
  type PlanningState = 'idle' | 'loading' | 'questions';
  const [planningState, setPlanningState] = useState<PlanningState>('idle');
  const [planningQuestions, setPlanningQuestions] = useState<ScopingQuestion[]>([]);
  // Hold the pending prompt while questions are shown, send after answers
  const pendingPromptRef = useRef<string>("");
  const pendingTriggerRef = useRef<'first_message' | 'ambiguous_feature'>('first_message');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  if (!supabaseClientRef.current) {
    supabaseClientRef.current = createSupabaseBrowserClient();
  }
  // Keep a ref to the last input so the retry fn can re-send it
  const lastInputRef = useRef<string>("");
  // AbortController for in-flight action-runner calls
  const actionAbortRef = useRef<AbortController | null>(null);
  // Snapshot attachments into the transport body. We re-create the transport
  // whenever the set of attachment IDs changes so each send carries the
  // current attachments to /api/chat.
  const attachmentIdsKey = attachments.filter((a) => !a.uploading).map((a) => a.id).join(',');
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: {
        projectId,
        modelId: selectedModelId,
        mode,
        deepThink,
        attachments: attachments
          .filter((a) => !a.uploading)
          .map((a) => ({
            id:           a.id,
            kind:         a.kind,
            storage_path: a.storagePath,
            filename:     a.filename,
          })),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, selectedModelId, mode, deepThink, attachmentIdsKey]
  );
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({
    messages: initialMessages,
    transport,
  });
  const isStreaming = status === "streaming" || status === "submitted";
  const selectedModel = models.find((model) => model.model_id === selectedModelId);
  const creditEstimate = estimateCredits(inputValue, selectedModelId, selectedModel?.credits_per_1m_output ?? 303);

  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch("/api/models");
        const payload = await response.json() as { data?: ModelOption[] };
        const nextModels = payload.data ?? [];
        setModels(nextModels);
        if (!nextModels.some((model) => model.model_id === "claude-sonnet-4-5") && nextModels[0]) {
          setSelectedModelId(nextModels[0].model_id);
        }
      } catch {
        toast.error("Could not load models.");
      }
    }

    void loadModels();
  }, []);

  useEffect(() => {
    if (!error) return;
    // APICallError exposes statusCode — cast via unknown to avoid importing from provider
    const statusCode = (error as unknown as { statusCode?: number }).statusCode;
    if (statusCode === 402) {
      toast.error("Not enough credits to continue.");
      setErrorState({ type: 'credits' });
    } else {
      toast.error("Generation failed. Please try again.");
      const lastInput = lastInputRef.current;
      setErrorState({
        type: 'connection',
        retryFn: lastInput
          ? () => {
              clearError();
              setErrorState(null);
              setInputValue(lastInput);
              void sendMessage({ text: lastInput });
            }
          : undefined,
      });
    }
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  // G1: after a plan-mode message finishes streaming, fetch the persisted
  // plan rows and map them by message_id so MessageItem can render PlanCard.
  useEffect(() => {
    if (status !== 'ready' || mode !== 'plan' || !messages.length) return
    const last = messages[messages.length - 1]
    if (last?.role !== 'assistant') return
    // Skip if we already have a plan mapped for this message id
    if (planMap[last.id]) return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/plans?limit=10`)
        if (!res.ok) return
        const data = await res.json() as { plans?: Array<{ id: string; message_id: string | null; status: 'draft' | 'approved' | 'discarded' | 'executed' }> }
        if (cancelled) return
        // Build the full map from server truth (covers reloads + multi-plan history)
        const next: typeof planMap = {}
        for (const p of data.plans ?? []) {
          if (p.message_id) next[p.message_id] = { planId: p.id, status: p.status }
        }
        setPlanMap(next)
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [status, mode, messages, projectId])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprovePlan(planId: string, edited: string) {
    try {
      await fetch(`/api/projects/${projectId}/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_markdown: edited, status: 'approved' }),
      })
      setPlanMap((prev) => {
        const out = { ...prev }
        for (const [msgId, info] of Object.entries(out)) {
          if (info.planId === planId) out[msgId] = { ...info, status: 'approved' }
        }
        return out
      })
      // Auto-switch to Agent mode and resend the (possibly edited) plan
      // as the next user prompt so execution kicks off immediately.
      setMode('agent')
      const prompt = `Implement this plan:\n\n${edited}`
      void sendMessage({ text: prompt })
    } catch {
      toast.error('Could not approve plan')
    }
  }

  function handleDiscardPlan(planId: string) {
    void fetch(`/api/projects/${projectId}/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'discarded' }),
    })
    setPlanMap((prev) => {
      const out = { ...prev }
      for (const [msgId, info] of Object.entries(out)) {
        if (info.planId === planId) out[msgId] = { ...info, status: 'discarded' }
      }
      return out
    })
  }

  useEffect(() => {
    if (status !== 'ready' || !machineId || !messages.length) return
    const last = messages[messages.length - 1]
    if (last?.role !== 'assistant') return
    const text = last.parts.find((p) => p.type === 'text')?.text ?? ''
    const artifacts = parseArtifacts(text)
    if (!artifacts.length) return

    setRunning(true)
    const abortController = new AbortController()
    actionAbortRef.current = abortController
    runArtifactActions(machineId, artifacts, undefined, abortController.signal).then((results) => {
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        toast.error(`${failed.length} action${failed.length > 1 ? 's' : ''} failed — check the Files panel for details.`)
      } else {
        onTabChange('Preview') // switch to preview only when all actions succeed
      }
    }).finally(() => {
      setRunning(false)
    })
  }, [status, machineId, messages, onTabChange])

  async function uploadFile(file: File): Promise<void> {
    if (!ACCEPTED_MIME.includes(file.type) && !/\.(png|jpe?g|webp|gif|csv|pdf)$/i.test(file.name)) {
      toast.error(`Unsupported file: ${file.name}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is too large (max 10MB)`);
      return;
    }

    const kind = classifyKind(file.type, file.name);
    const supabase = supabaseClientRef.current!;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in to attach files.");
      return;
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const uuid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${user.id}/${projectId}/${uuid}.${ext}`;

    // Optimistic chip while the upload is in flight.
    const tempId = `tmp-${uuid}`;
    const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;
    setAttachments((prev) => [
      ...prev,
      { id: tempId, kind, filename: file.name, storagePath, previewUrl, uploading: true },
    ]);

    try {
      const { error: uploadErr } = await supabase
        .storage
        .from('chat-attachments')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);

      const res = await fetch(`/api/projects/${projectId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          storage_path: storagePath,
          filename:     file.name,
          size_bytes:   file.size,
          mime_type:    file.type || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload metadata save failed' }));
        throw new Error(err.error ?? 'Upload metadata save failed');
      }
      const json = await res.json() as { id: string; signed_url: string | null };

      setAttachments((prev) => prev.map((a) =>
        a.id === tempId
          ? { ...a, id: json.id, uploading: false, previewUrl: previewUrl ?? json.signed_url }
          : a
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
      setAttachments((prev) => prev.filter((a) => a.id !== tempId));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  }

  async function handleFilesPicked(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      // Sequential to keep ordering deterministic and not blow up the bucket.
      // eslint-disable-next-line no-await-in-loop
      await uploadFile(file);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    void handleFilesPicked(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }
  function onDragLeave() {
    setIsDragOver(false);
  }

  /** Actually sends the message to /api/chat — called directly or after answers */
  async function dispatchSend(text: string) {
    lastInputRef.current = text;
    setErrorState(null);
    clearError();
    await sendMessage({ text });
    setInputValue("");
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl && a.previewUrl.startsWith('blob:')) URL.revokeObjectURL(a.previewUrl);
      }
      return [];
    });
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming || running) return;
    if (attachments.some((a) => a.uploading)) {
      toast.error("Wait for uploads to finish before sending.");
      return;
    }

    // ── Planning questions: first message OR ambiguous mid-conversation prompt ─
    const ambiguity = shouldAskQuestions(text, messages.length);
    if (ambiguity.shouldAsk) {
      pendingPromptRef.current = text;
      pendingTriggerRef.current = ambiguity.reason === 'none' ? 'first_message' : ambiguity.reason;
      setInputValue("");
      setPlanningState('loading');

      try {
        const res = await fetch(`/api/projects/${projectId}/brief`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            modelId: selectedModelId,
            trigger: ambiguity.reason,
          }),
        });

        if (res.ok) {
          const json = await res.json() as { questions: ScopingQuestion[] };
          if (json.questions?.length > 0) {
            setPlanningQuestions(json.questions);
            setPlanningState('questions');
            return; // Wait for answers before sending
          }
        }
      } catch (err) {
        console.warn('[ChatPanel] Brief generation failed, proceeding without questions:', err);
      }

      // If brief call failed or returned no questions, just build immediately
      setPlanningState('idle');
      await dispatchSend(text);
      return;
    }

    await dispatchSend(text);
  }

  /** User answered all questions — save answers then fire the generation */
  async function handlePlanningSubmit(answers: Record<string, string>) {
    const prompt = pendingPromptRef.current;
    setPlanningState('idle');

    // Save answers to project_briefs (fire-and-forget — don't block generation)
    void fetch(`/api/projects/${projectId}/brief`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    await dispatchSend(prompt);
  }

  /** User skipped questions — build immediately */
  async function handlePlanningSkip() {
    const prompt = pendingPromptRef.current;
    setPlanningState('idle');
    await dispatchSend(prompt);
  }

  function handleStop() {
    stop();
    // Abort any in-flight machine actions (file writes / exec calls)
    actionAbortRef.current?.abort();
    actionAbortRef.current = null;
    // Clean up partial assistant message if it's very short (< 20 chars)
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== 'assistant') return prev;
      const textPart = last.parts.find((p) => p.type === 'text');
      const currentText = textPart && 'text' in textPart ? (textPart.text as string) : '';
      if (currentText.length < 20) {
        const updated: UIMessage = {
          ...last,
          parts: last.parts.map((p) =>
            p.type === 'text' ? { ...p, text: '[Generation stopped]' } : p
          ),
        };
        return [...prev.slice(0, -1), updated];
      }
      return prev;
    });
  }

  return (
    <aside className="conversation-pane">
      <div className="conversation-scroll">
        <div className="build-stamp"><span>May 15 at 2:45 PM</span><div className="mini-preview">PRD approved</div></div>
        {messages.map((message) => {
          const plan = planMap[message.id]
          // G1: when this message has a tracked plan, wrap it with mode/planId
          // so MessageItem renders <PlanCard> instead of plain text.
          if (plan && message.role === 'assistant') {
            const text = message.parts.find((p) => p.type === 'text')?.text ?? ''
            const decorated = {
              id:          message.id,
              role:        'assistant' as const,
              content:     text,
              mode:        'plan' as const,
              planId:      plan.planId,
              planStatus:  plan.status,
            }
            return (
              <MessageItem
                key={message.id}
                message={decorated}
                onApprovePlan={handleApprovePlan}
                onDiscardPlan={handleDiscardPlan}
              />
            )
          }
          return <MessageItem key={message.id} message={message} />
        })}

        {/* Planning state — shown when generating or displaying questions */}
        {planningState === 'loading' && (
          <div className="mx-3 my-2 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="animate-spin" size={14} />
            <span>Let me ask a few things first…</span>
          </div>
        )}
        {planningState === 'questions' && planningQuestions.length > 0 && (
          <div className="mx-3 my-2">
            <ScopingQuestionsCard
              content={
                pendingTriggerRef.current === 'first_message'
                  ? "To make sure I build exactly what you need, I have a few questions."
                  : "Before I add this, a few quick questions to make sure I build it right."
              }
              questions={planningQuestions}
              onSubmit={handlePlanningSubmit}
              onSkip={handlePlanningSkip}
            />
          </div>
        )}
        {errorState?.type === 'credits' && (
          <div className="mx-3 my-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            <p className="mb-2 font-medium">Not enough credits</p>
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/20"
              render={<a href="/settings#billing" />}
            >
              Buy Credits &rarr;
            </Button>
          </div>
        )}
        {errorState?.type === 'connection' && (
          <div className="mx-3 my-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <p className="mb-2 font-medium">Connection lost — check your internet</p>
            {errorState.retryFn && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/50 text-red-200 hover:bg-red-500/20"
                onClick={errorState.retryFn}
                type="button"
              >
                Retry
              </Button>
            )}
          </div>
        )}
        <div className="quick-actions">
          {QUICK_ACTIONS.map((item) => (
            <button className="chip-btn" key={item.label} onClick={() => item.action === "tab" ? onTabChange(item.tab) : onToolsOpen()} type="button">
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`agent-composer focus-within:ring-1 focus-within:ring-[var(--accent-cyan)]/30 ${isDragOver ? 'ring-2 ring-purple-400/60' : ''} ${isStreaming ? 'animate-pulse [box-shadow:0_0_0_1px_var(--accent-cyan)]' : ''} ${planningState !== 'idle' ? 'pointer-events-none opacity-40' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {running ? <div className="mb-2 text-xs font-semibold text-purple-300">Applying changes...</div> : null}
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-xs"
              >
                {a.kind === 'image' && a.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={a.filename} className="h-8 w-8 rounded object-cover" src={a.previewUrl} />
                ) : (
                  <FileText size={14} />
                )}
                <span className="max-w-[160px] truncate">{a.filename}</span>
                {a.uploading ? <Loader2 className="animate-spin" size={12} /> : null}
                <button
                  aria-label={`Remove ${a.filename}`}
                  className="text-slate-400 hover:text-slate-100"
                  onClick={() => removeAttachment(a.id)}
                  type="button"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <input
          accept={ACCEPTED_MIME.join(',')}
          className="hidden"
          multiple
          onChange={(e) => { void handleFilesPicked(e.target.files); e.target.value = ''; }}
          ref={fileInputRef}
          type="file"
        />
        <select className="chip-btn" disabled={isStreaming} onChange={(event) => setSelectedModelId(event.target.value)} value={selectedModelId}>
          {models.length > 0 ? models.map((model) => <option key={model.model_id} value={model.model_id}>{model.display_name}</option>) : <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>}
        </select>
        <p className="text-xs text-slate-500">est. ~{creditEstimate.estimate} credits</p>
        <textarea onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} placeholder="Ask Wild Cupcake..." value={inputValue} />
        <div className="composer-actions">
          <div className="flex items-center gap-2"><button aria-label="Attach file" className="circle-btn" onClick={() => fileInputRef.current?.click()} type="button"><Paperclip size={15} /></button><ModeToggle mode={mode} onChange={setMode} deepThink={deepThink} onDeepThinkChange={setDeepThink} disabled={isStreaming || running} /><button className={`chip-btn ${visualEdits ? "active" : ""}`} onClick={onVisualEditsToggle} type="button"><Paintbrush size={15} /> Visual edits</button></div>
          <div className="relative flex items-center gap-2">
            <button className="chip-btn" onClick={() => setBuildMenuOpen((current) => !current)} type="button">Build <ChevronDown size={14} /></button>
            {buildMenuOpen ? (
              <div className="build-mode-menu">
                {BUILD_OPTIONS.map((option) => <button key={option} onClick={() => { toast(`Starting ${option}...`); setBuildMenuOpen(false); }} type="button">{option}</button>)}
              </div>
            ) : null}
            <button aria-label="Voice input" className="circle-btn" onClick={() => toast("Voice input — coming soon")} type="button"><Mic size={15} /></button>
            <button aria-label={isStreaming ? "Stop generation" : "Send message"} className="circle-btn primary" disabled={running || (!inputValue.trim() && !isStreaming)} onClick={() => isStreaming ? handleStop() : void handleSend()} type="button">{isStreaming || running ? <Loader2 className="animate-spin" size={15} /> : <Zap size={15} />}</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
