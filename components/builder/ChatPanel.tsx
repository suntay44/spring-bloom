"use client";

import { useState } from "react";
import { ChevronDown, Mic, Paintbrush, Zap } from "lucide-react";
import { MessageItem } from "@/components/builder/MessageItem";
import { toast } from "@/lib/toast";
import type { BuilderTab } from "@/components/builder/ProjectMenu";
import type { MockMessage } from "@/lib/mock/messages";

type ChatPanelProps = {
  messages: MockMessage[];
  onSend: () => void;
  onTabChange: (tab: BuilderTab) => void;
  onToolsOpen: () => void;
  onVisualEditsToggle: () => void;
  visualEdits: boolean;
};

const QUICK_ACTIONS = [
  { label: "Run review", action: "tab", tab: "Review" as const },
  { label: "Add billing", action: "tools" },
  { label: "Connect Supabase", action: "tab", tab: "Security" as const }
] as const;

const BUILD_OPTIONS = ["Build", "Preview only", "Deploy"] as const;

export function ChatPanel({ messages, onSend, onTabChange, onToolsOpen, onVisualEditsToggle, visualEdits }: ChatPanelProps) {
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);

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
        <textarea placeholder="Ask Wild Cupcake..." />
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
            <button aria-label="Send message" className="circle-btn primary" onClick={onSend} type="button"><Zap size={15} /></button>
          </div>
        </div>
      </div>
    </aside>
  );
}
