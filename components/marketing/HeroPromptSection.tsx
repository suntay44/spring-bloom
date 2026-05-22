"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { InteractivePromptCard } from "@/components/shared/InteractivePromptCard";
import type { AIModel, AppType } from "@/lib/mock/data";

type ExamplePrompt = {
  label: string;   // short chip text (2-3 words)
  prompt: string;  // detailed text filled into the textarea on click
};

const ALL_EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: "SaaS Dashboard",
    prompt: "Build a SaaS dashboard with user auth, usage analytics charts, and a subscription billing page",
  },
  {
    label: "Habit Tracker",
    prompt: "Create a habit-tracking app where users log daily habits, build streaks, and view weekly progress",
  },
  {
    label: "Agency Landing",
    prompt: "Design a landing page for a design agency with a portfolio grid, services section, and contact form",
  },
  {
    label: "Task Manager",
    prompt: "Build a team task manager with drag-and-drop Kanban boards, user assignments, and due date tracking",
  },
  {
    label: "Restaurant Booking",
    prompt: "Create a restaurant reservation system with date picker, table availability, and email confirmations",
  },
  {
    label: "E-commerce Store",
    prompt: "Build an e-commerce store with product catalog, shopping cart, checkout flow, and order history",
  },
  {
    label: "Real-time Chat",
    prompt: "Build a real-time chat app with rooms, online presence indicators, and push notifications",
  },
  {
    label: "Finance Tracker",
    prompt: "Create a personal finance tracker with expense categories, monthly budgets, and spending charts",
  },
  {
    label: "Admin Panel",
    prompt: "Build an admin panel for managing users, viewing platform analytics, and handling support tickets",
  },
];

const VISIBLE = 3;

export function HeroPromptSection() {
  const [prompt, setPrompt] = useState("");
  const [exampleOffset, setExampleOffset] = useState(0);
  const router = useRouter();

  const visiblePrompts = ALL_EXAMPLE_PROMPTS.slice(
    exampleOffset,
    exampleOffset + VISIBLE
  );

  function rotateExamples() {
    setExampleOffset((o) => (o + VISIBLE) % ALL_EXAMPLE_PROMPTS.length);
  }

  function handleSend(_opts: { prompt: string; appType: AppType; model: AIModel }) {
    router.push("/");
  }

  return (
    <div>
      <InteractivePromptCard instanceId="hero" onPromptChange={setPrompt} onSend={handleSend} prompt={prompt} />
      <div className="hero-examples">
        <span className="hero-examples-label">Try an example prompt</span>
        <div className="hero-examples-chips">
          {visiblePrompts.map((ex) => (
            <button
              className="hero-example-chip"
              key={ex.label}
              onClick={() => setPrompt(ex.prompt)}
              type="button"
            >
              {ex.label}
            </button>
          ))}
          <button
            aria-label="Refresh suggestions"
            className="hero-example-refresh"
            onClick={rotateExamples}
            type="button"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
