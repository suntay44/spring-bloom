"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChevronDown, FileText, Loader2, Mic, Paintbrush, Paperclip, X, Zap } from "lucide-react";
import { MessageItem } from "@/components/builder/MessageItem";
import { parseArtifacts } from "@/lib/ai/artifact-parser";
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
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("claude-sonnet-4-6");
  const [running, setRunning] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
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
    [projectId, selectedModelId, attachmentIdsKey]
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

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming || running) return;
    // Don't send while uploads are still in-flight, otherwise the chat route
    // wouldn't see the attachment in the transport body.
    if (attachments.some((a) => a.uploading)) {
      toast.error("Wait for uploads to finish before sending.");
      return;
    }
    lastInputRef.current = text;
    setErrorState(null);
    clearError();
    await sendMessage({ text });
    setInputValue("");
    // Reset attachments after successful send; release any blob: URLs.
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl && a.previewUrl.startsWith('blob:')) URL.revokeObjectURL(a.previewUrl);
      }
      return [];
    });
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
        {messages.map((message) => <MessageItem key={message.id} message={message} />)}
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
        className={`agent-composer focus-within:ring-1 focus-within:ring-[var(--accent-cyan)]/30 ${isDragOver ? 'ring-2 ring-purple-400/60' : ''} ${isStreaming ? 'animate-pulse [box-shadow:0_0_0_1px_var(--accent-cyan)]' : ''}`}
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
          <div className="flex items-center gap-2"><button aria-label="Attach file" className="circle-btn" onClick={() => fileInputRef.current?.click()} type="button"><Paperclip size={15} /></button><button className={`chip-btn ${visualEdits ? "active" : ""}`} onClick={onVisualEditsToggle} type="button"><Paintbrush size={15} /> Visual edits</button></div>
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
