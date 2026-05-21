"use client";

import { ArrowRight, Github, Mic, Paperclip, SlidersHorizontal } from "lucide-react";
import { ModelPicker } from "@/components/shared/ModelPicker";
import { toast } from "@/lib/toast";
import type { AIModel } from "@/lib/mock/data";

interface PromptToolbarProps {
  model: AIModel;
  models: AIModel[];
  onModelChange: (model: AIModel) => void;
  onSend: () => void;
  canSend: boolean;
  instanceId?: string;
}

export function PromptToolbar({ model, models, onModelChange, onSend, canSend }: PromptToolbarProps) {
  return (
    <div className="prompt-toolbar">
      <div className="toolbar-left">
        <button aria-label="Attach files" className="icon-btn" onClick={() => toast("File upload — coming soon")} title="Attach files" type="button">
          <Paperclip size={18} />
        </button>
        <button aria-label="Connect GitHub" className="icon-btn" onClick={() => toast("Connect GitHub in Settings → Integrations")} title="Connect GitHub" type="button">
          <Github size={18} />
        </button>
        <ModelPicker model={model} models={models} onChange={onModelChange} />
      </div>
      <div className="toolbar-right">
        <button aria-label="Prompt settings" className="icon-btn" onClick={() => toast("Prompt settings — coming soon")} title="Prompt settings" type="button">
          <SlidersHorizontal size={18} />
        </button>
        <button aria-label="Voice input" className="icon-btn" onClick={() => toast("Voice input — coming soon")} title="Voice input" type="button">
          <Mic size={18} />
        </button>
        <button aria-label="Send prompt" className="send-btn" disabled={!canSend} onClick={onSend} title="Send prompt" type="button">
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
