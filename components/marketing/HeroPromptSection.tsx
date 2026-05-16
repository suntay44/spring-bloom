"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/auth/AuthModal";
import { InteractivePromptCard } from "@/components/shared/InteractivePromptCard";
import { useMockAuth } from "@/context/MockAuthContext";
import type { AIModel, AppType } from "@/lib/mock/data";

export function HeroPromptSection() {
  const { isAuthenticated } = useMockAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();

  function handleSend(_opts: { prompt: string; appType: AppType; model: AIModel }) {
    if (isAuthenticated) {
      router.push("/new");
    } else {
      setAuthOpen(true);
    }
  }

  return (
    <>
      <InteractivePromptCard instanceId="hero" onSend={handleSend} />
      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} defaultTab="signup" /> : null}
    </>
  );
}
