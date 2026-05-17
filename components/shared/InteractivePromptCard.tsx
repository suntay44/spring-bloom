"use client";

import { useState } from "react";
import { PromptCard } from "@/components/shared/PromptCard";
import { PromptTabs } from "@/components/shared/PromptTabs";
import { PromptToolbar } from "@/components/shared/PromptToolbar";
import { appTypes, models, type AIModel, type AppType } from "@/lib/mock/data";

interface InteractivePromptCardProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSend: (opts: { prompt: string; appType: AppType; model: AIModel }) => void;
  instanceId?: string;
}

// Default to Claude Sonnet 4.6 — good balance of capability and cost
const DEFAULT_MODEL = models.find((m) => m.id === "claude-sonnet-4-6") ?? models[0];

export function InteractivePromptCard({ prompt, onPromptChange, onSend, instanceId }: InteractivePromptCardProps) {
  const [appType, setAppType] = useState<AppType>(appTypes[0]);
  const [model, setModel] = useState<AIModel>(DEFAULT_MODEL);

  return (
    <PromptCard tabs={<PromptTabs activeId={appType.id} onSelect={setAppType} />}>
      <textarea
        className="prompt-textarea"
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={appType.placeholder}
        value={prompt}
      />
      <PromptToolbar
        canSend={prompt.trim().length > 0}
        instanceId={instanceId}
        model={model}
        models={models}
        onModelChange={setModel}
        onSend={() => { if (prompt.trim()) onSend({ prompt, appType, model }); }}
      />
    </PromptCard>
  );
}
