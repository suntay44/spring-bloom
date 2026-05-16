"use client";

import { ChevronDown, Mic, Paintbrush, Zap } from "lucide-react";
import { MessageItem } from "@/components/builder/MessageItem";
import type { BuilderTab } from "@/components/builder/ProjectMenu";
import type { MockMessage } from "@/lib/mock/messages";

type ChatPanelProps = {
  messages: MockMessage[];
  onTabChange: (tab: BuilderTab) => void;
  onToolsOpen: () => void;
};

export function ChatPanel({ messages, onTabChange, onToolsOpen }: ChatPanelProps) {
  return (
    <aside className="conversation-pane">
      <div className="conversation-scroll">
        <div className="build-stamp"><span>May 15 at 2:45 PM</span><div className="mini-preview">PRD approved</div></div>
        {messages.map((message) => <MessageItem key={message.id} message={message} />)}
        <div className="quick-actions">
          <button onClick={() => onTabChange("Review")} type="button">Run review</button>
          <button onClick={onToolsOpen} type="button">Add billing</button>
          <button onClick={() => onTabChange("Security")} type="button">Connect Supabase</button>
        </div>
      </div>
      <div className="agent-composer">
        <textarea placeholder="Ask Wild Cupcake..." />
        <div className="composer-actions">
          <div className="flex items-center gap-2"><button aria-label="Attach file" className="circle-btn" type="button">+</button><button className="chip-btn" type="button"><Paintbrush size={15} /> Visual edits</button></div>
          <div className="flex items-center gap-2"><button className="chip-btn" type="button">Build <ChevronDown size={14} /></button><button aria-label="Voice input" className="circle-btn" type="button"><Mic size={15} /></button><button aria-label="Send message" className="circle-btn primary" type="button"><Zap size={15} /></button></div>
        </div>
      </div>
    </aside>
  );
}
