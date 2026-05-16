import { Globe2, LayoutDashboard, Smartphone } from "lucide-react";

export type MockProjectType = "fullstack" | "mobile" | "landing";
export type MockProjectStatus = "building" | "live" | "draft" | "failed";

export type MockProject = {
  id: string;
  name: string;
  type: MockProjectType;
  framework: "nextjs" | "expo" | "static";
  status: MockProjectStatus;
  deployUrl?: string;
  lastUpdated: string;
  prompt: string;
  creditsUsed: number;
};

export const MOCK_PROJECTS: MockProject[] = [
  { id: "healthtech-proto", name: "healthtech-proto", type: "mobile", framework: "expo", status: "building", lastUpdated: "8 hrs ago", prompt: "Social-first nutrition and meal planning app for coaches.", creditsUsed: 120 },
  { id: "crm-counterpart", name: "counterpart-crm", type: "fullstack", framework: "nextjs", status: "draft", lastUpdated: "1 day ago", prompt: "Lightweight CRM with pipeline analytics and team notes.", creditsUsed: 85 },
  { id: "bill-generator", name: "bill-generator", type: "landing", framework: "static", status: "live", deployUrl: "https://bill-generator.vercel.app", lastUpdated: "3 days ago", prompt: "Invoice generator landing page with pricing and FAQ.", creditsUsed: 25 }
];

export const SIDEBAR_PROJECTS = MOCK_PROJECTS.map((project) => ({
  ...project,
  icon: project.type === "mobile" ? Smartphone : project.type === "landing" ? Globe2 : LayoutDashboard
}));
