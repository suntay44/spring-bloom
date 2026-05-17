"use client";

import { useEffect, useMemo, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChevronDown, Loader2, Mic, Paintbrush, Zap } from "lucide-react";
import { MessageItem } from "@/components/builder/MessageItem";
import { estimateCredits } from "@/lib/ai/credit-estimator";
import { toast } from "@/lib/toast";
import type { BuilderTab } from "@/components/builder/ProjectMenu";

type ChatPanelProps = {
  projectId: string;
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

export function ChatPanel({ projectId, initialMessages = [], onTabChange, onToolsOpen, onVisualEditsToggle, visualEdits }: ChatPanelProps) {
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("claude-sonnet-4-6");
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: { projectId, modelId: selectedModelId },
    }),
    [projectId, selectedModelId]
  );
  const { messages, sendMessage, status, stop, error } = useChat({
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
    if (error) toast.error("Generation failed. Please try again.");
  }, [error]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    await sendMessage({ text });
    setInputValue("");
  }

  return (
    <aside className="conversation-pane">
      <div className="conversation-scroll">
        <div className="build-stamp"><span>May 15 at 2:45 PM</span><div className="mini-preview">PRD approved</div></div>
        {messages.map((message) => <MessageItem key={message.id} message={message} />)}
        <div className="quick-actions">
          {QUICK_ACTIONS.map((item) => (
            <button className="chip-btn" key={item.label} onClick={() => item.action === "tab" ? onTabChange(item.tab) : onToolsOpen()} type="button">
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="agent-composer">
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
            <button aria-label={isStreaming ? "Stop generation" : "Send message"} className="circle-btn primary" disabled={!inputValue.trim() && !isStreaming} onClick={() => isStreaming ? stop() : void handleSend()} type="button">{isStreaming ? <Loader2 className="animate-spin" size={15} /> : <Zap size={15} />}</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
