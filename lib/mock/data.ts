import type { ComponentType } from "react";
import { Braces, FileText, Smartphone } from "lucide-react";

export type AppType = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  placeholder: string;
};

export type AIModel = {
  id: string;
  label: string;
  caption: string;
  provider: string;
};

export type PricingPlan = {
  name: string;
  price: string;
  credits: string;
  projects: string;
  cta: string;
  featured?: boolean;
};

export const appTypes: [AppType, ...AppType[]] = [
  { id: "fullstack", label: "Full Stack App", icon: Braces, placeholder: "Build me a CRM system with..." },
  { id: "mobile", label: "Mobile App", icon: Smartphone, placeholder: "Build me a fitness tracking app for..." },
  { id: "landing", label: "Landing Page", icon: FileText, placeholder: "Create a launch page for..." }
];

export const models: [AIModel, ...AIModel[]] = [
  // Anthropic — strongest → fastest
  { id: "claude-opus-4-7",   label: "Claude Opus 4.7",   caption: "Most Capable",      provider: "anthropic" },
  { id: "claude-opus-4-6",   label: "Claude Opus 4.6",   caption: "Highly Capable",    provider: "anthropic" },
  { id: "claude-opus-4-5",   label: "Claude Opus 4.5",   caption: "Capable",           provider: "anthropic" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", caption: "Latest",            provider: "anthropic" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", caption: "Balanced",          provider: "anthropic" },
  { id: "claude-haiku-4-5",  label: "Claude Haiku 4.5",  caption: "Fast",              provider: "anthropic" },
  // OpenAI — strongest → fastest
  { id: "gpt-5-5",           label: "GPT-5.5",           caption: "Most Capable",      provider: "openai" },
  { id: "gpt-5-4",           label: "GPT-5.4",           caption: "Balanced",          provider: "openai" },
  { id: "gpt-5-3-codex",     label: "GPT-5.3 Codex",     caption: "Code Optimized",    provider: "openai" },
  // Gemini — strongest → fastest
  { id: "gemini-3-1-pro",    label: "Gemini 3.1 Pro",    caption: "Most Capable",      provider: "google" },
];

export const pricingPlans: PricingPlan[] = [
  { name: "Free",    price: "$0",  credits: "5 credits",   projects: "1 active project",    cta: "Get started" },
  { name: "Starter", price: "$16", credits: "100 credits", projects: "5 active projects",   cta: "Start building" },
  { name: "Pro",     price: "$20", credits: "175 credits", projects: "Unlimited projects",  cta: "Go Pro",           featured: true },
  { name: "Teams",   price: "$60", credits: "500 credits", projects: "Unlimited projects",  cta: "Start free trial" },
];
