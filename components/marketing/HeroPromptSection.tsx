"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InteractivePromptCard } from "@/components/shared/InteractivePromptCard";
import type { AIModel, AppType } from "@/lib/mock/data";

export function HeroPromptSection() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  function handleSend(_opts: { prompt: string; appType: AppType; model: AIModel }) {
    router.push("/");
  }

  return (
    <InteractivePromptCard instanceId="hero" onPromptChange={setPrompt} onSend={handleSend} prompt={prompt} />
  );
}
