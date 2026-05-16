"use client";

import { ArrowRight, Github, Mic, Paperclip, SlidersHorizontal } from "lucide-react";
import { models, type AIModel } from "@/lib/mock/data";

interface PromptToolbarProps {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  onSend: () => void;
  canSend: boolean;
  instanceId?: string;
}

export function PromptToolbar({ model, onModelChange, onSend, canSend, instanceId = "prompt" }: PromptToolbarProps) {
  const selectId = `${instanceId}-model-select`;

  return (
    <div className="prompt-toolbar">
      <div className="toolbar-left">
        <button aria-label="Attach files" className="icon-btn" title="Attach files" type="button"><Paperclip size={18} /></button>
        <button aria-label="Connect GitHub" className="icon-btn" title="Connect GitHub" type="button"><Github size={18} /></button>
        <span className="pill">E-1</span>
        <label className="sr-only" htmlFor={selectId}>AI model</label>
        <select className="pill cursor-pointer" id={selectId} onChange={(event) => onModelChange(models.find((item) => item.id === event.target.value) ?? models[0])} value={model.id}>
          {models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <span className="pill">Maxx off</span>
      </div>
      <div className="toolbar-right">
        <button aria-label="Prompt settings" className="icon-btn" title="Prompt settings" type="button"><SlidersHorizontal size={18} /></button>
        <button aria-label="Voice input" className="icon-btn" title="Voice input" type="button"><Mic size={18} /></button>
        <button aria-label="Send prompt" className="send-btn" disabled={!canSend} onClick={onSend} title="Send prompt" type="button"><ArrowRight size={20} /></button>
      </div>
    </div>
  );
}
