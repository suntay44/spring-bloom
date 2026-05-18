"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChevronDown, Loader2, Mic, Paintbrush, Zap } from "lucide-react";
import { MessageItem } from "@/components/builder/MessageItem";
import { parseArtifacts } from "@/lib/ai/artifact-parser";
import { estimateCredits } from "@/lib/ai/credit-estimator";
import { runArtifactActions } from "@/lib/fly/action-runner";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import type { BuilderTab } from "@/components/builder/ProjectMenu";

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

export function ChatPanel({ projectId, machineId, initialMessages = [], onTabChange, onToolsOpen, onVisualEditsToggle, visualEdits }: ChatPanelProps) {
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("claude-sonnet-4-6");
  const [running, setRunning] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState>(null);
  // Keep a ref to the last input so the retry fn can re-send it
  const lastInputRef = useRef<string>("");
  // AbortController for in-flight action-runner calls
  const actionAbortRef = useRef<AbortController | null>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: { projectId, modelId: selectedModelId },
    }),
    [projectId, selectedModelId]
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

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming || running) return;
    lastInputRef.current = text;
    setErrorState(null);
    clearError();
    await sendMessage({ text });
    setInputValue("");
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
      <div className="agent-composer">
        {running ? <div className="mb-2 text-xs font-semibold text-purple-300">Applying changes...</div> : null}
        <select className="chip-btn" disabled={isStreaming} onChange={(event) => setSelectedModelId(event.target.value)} value={selectedModelId}>
          {models.length > 0 ? models.map((model) => <option key={model.model_id} value={model.model_id}>{model.display_name}</option>) : <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>}
        </select>
        <p className="text-xs text-slate-500">est. ~{creditEstimate.estimate} credits</p>
        <textarea onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} placeholder="Ask Wild Cupcake..." value={inputValue} />
        <div className="composer-actions">
          <div className="flex items-center gap-2"><button aria-label="Attach file" className="circle-btn" onClick={() => toast("File upload — coming soon")} type="button">+</button><button className={`chip-btn ${visualEdits ? "active" : ""}`} onClick={onVisualEditsToggle} type="button"><Paintbrush size={15} /> Visual edits</button></div>
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
