"use client";

import { useEffect, useState } from "react";
import { PromptCard } from "@/components/shared/PromptCard";
import { PromptTabs } from "@/components/shared/PromptTabs";
import { PromptToolbar } from "@/components/shared/PromptToolbar";
import { appTypes, models, type AIModel, type AppType } from "@/lib/mock/data";

interface InteractivePromptCardProps {
  onSend: (opts: { prompt: string; appType: AppType; model: AIModel }) => void;
  defaultPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  instanceId?: string;
}

export function InteractivePromptCard({ onSend, defaultPrompt = "", onPromptChange, instanceId }: InteractivePromptCardProps) {
  const [appType, setAppType] = useState<AppType>(appTypes[0]);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [model, setModel] = useState<AIModel>(models[0]);
  const canSend = prompt.trim().length > 0;

  useEffect(() => {
    setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  function handlePromptChange(value: string) {
    setPrompt(value);
    onPromptChange?.(value);
  }

  return (
    <PromptCard tabs={<PromptTabs activeId={appType.id} onSelect={setAppType} />}>
      <textarea className="prompt-textarea" onChange={(event) => handlePromptChange(event.target.value)} placeholder={appType.placeholder} value={prompt} />
      <PromptToolbar canSend={canSend} instanceId={instanceId} model={model} onModelChange={setModel} onSend={() => { if (canSend) onSend({ prompt, appType, model }); }} />
    </PromptCard>
  );
}
