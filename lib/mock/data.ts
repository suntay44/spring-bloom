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
  { id: "claude-sonnet-4-5", label: "Claude 4.5 Sonnet", caption: "200k context", provider: "Anthropic" },
  { id: "claude-opus-4-7", label: "Claude 4.7 Opus", caption: "Most capable planning", provider: "Anthropic" },
  { id: "gpt-5-5", label: "GPT 5.5", caption: "Strong coding and review", provider: "OpenAI" }
];

export const pricingPlans: PricingPlan[] = [
  { name: "Free", price: "$0", credits: "100 credits", projects: "1 project", cta: "Start free" },
  { name: "Starter", price: "$12", credits: "500 credits", projects: "2 simultaneous previews", cta: "Choose Starter" },
  { name: "Pro", price: "$29", credits: "1,500 credits", projects: "4 simultaneous previews", cta: "Choose Pro", featured: true },
  { name: "Agency", price: "$79", credits: "5,000 credits", projects: "Unlimited previews", cta: "Choose Agency" }
];
