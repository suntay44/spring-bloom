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

export type PlanFeature = { text: string; included: boolean };

export type PricingPlan = {
  name: string;
  price: string;
  credits: string;
  projects: string;
  cta: string;
  featured?: boolean;
  description?: string;
  features?: PlanFeature[];
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
  {
    name: "Free",
    price: "$0",
    credits: "20 credits to start",
    projects: "1 project",
    cta: "Start free",
    description: "Try SpringBloom and build your first app.",
    features: [
      { text: "20 one-time credits", included: true },
      { text: "1 active project", included: true },
      { text: "Live preview in builder", included: true },
      { text: "Community support", included: true },
      { text: "Publish to springbloom.app", included: false },
      { text: "GitHub export", included: false },
      { text: "Credit top-ups", included: false },
      { text: "Custom domain", included: false },
    ],
  },
  {
    name: "Starter",
    price: "$12",
    credits: "50 credits / month",
    projects: "3 projects",
    cta: "Choose Starter",
    description: "For builders shipping real projects.",
    features: [
      { text: "50 credits / month", included: true },
      { text: "3 active projects", included: true },
      { text: "Publish to springbloom.app", included: true },
      { text: "GitHub export", included: true },
      { text: "Credit top-ups", included: true },
      { text: "Credits roll over", included: true },
      { text: "Custom domain", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$29",
    credits: "150 credits / month",
    projects: "Unlimited projects",
    cta: "Choose Pro",
    featured: true,
    description: "For professionals who build daily.",
    features: [
      { text: "150 credits / month", included: true },
      { text: "Unlimited projects", included: true },
      { text: "Publish + custom domain", included: true },
      { text: "GitHub export", included: true },
      { text: "Credit top-ups", included: true },
      { text: "Credits roll over", included: true },
      { text: "Priority support", included: true },
      { text: "Early access to new features", included: true },
    ],
  }
];
