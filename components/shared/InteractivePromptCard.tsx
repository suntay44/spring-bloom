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

export function InteractivePromptCard({ prompt, onPromptChange, onSend, instanceId }: InteractivePromptCardProps) {
  const [appType, setAppType] = useState<AppType>(appTypes[0]);
  const [model, setModel] = useState<AIModel>(models[0]);
  const canSend = prompt.trim().length > 0;

  function handlePromptChange(value: string) {
    onPromptChange(value);
  }

  return (
    <PromptCard tabs={<PromptTabs activeId={appType.id} onSelect={setAppType} />}>
      <textarea className="prompt-textarea" onChange={(event) => handlePromptChange(event.target.value)} placeholder={appType.placeholder} value={prompt} />
      <PromptToolbar canSend={canSend} instanceId={instanceId} model={model} onModelChange={setModel} onSend={() => { if (canSend) onSend({ prompt, appType, model }); }} />
    </PromptCard>
  );
}
