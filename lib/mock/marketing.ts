import type { ComponentType } from "react";
import { BarChart3, CheckCircle2, LayoutDashboard, ShieldCheck, Smartphone, Sparkles } from "lucide-react";

export type MarketingFeature = {
  title: string;
  body: string;
  icon: ComponentType<{ size?: number; color?: string }>;
};

export const MOCK_STATS = {
  builders: "2,400+",
  appsBuilt: "18,000+",
  rating: "4.9 / 5"
};

export type Testimonial = {
  name: string;
  role: string;
  company: string;
  text: string;
  initials: string;
};

export const MOCK_TESTIMONIALS: Testimonial[] = [
  { name: "Sarah K.", role: "Founder", company: "Stackwise", text: "Built my SaaS MVP in a weekend. The review step caught two auth issues I would have shipped.", initials: "SK" },
  { name: "Marcus T.", role: "Lead Engineer", company: "Novaflow", text: "The credit receipts keep our whole team accountable. Finally know what AI work actually costs.", initials: "MT" },
  { name: "Priya R.", role: "Technical Founder", company: "Lumi", text: "Generated a full Expo app in 40 minutes. Opened it in Expo Go with the QR code immediately.", initials: "PR" }
];

export const MARKETING_FEATURES: MarketingFeature[] = [
  { title: "AI-powered generation", body: "Prompt, confirm a project brief, then let the agent create the first version.", icon: Sparkles },
  { title: "Secure by default", body: "RLS, auth, API validation, secret checks, and deploy blockers are part of the workflow.", icon: ShieldCheck },
  { title: "Web + mobile", body: "Generate Next.js apps, Expo apps, and landing pages from one creation surface.", icon: Smartphone },
  { title: "Managed Supabase", body: "Use our managed backend, connect your own, or build frontend-first with mock data.", icon: LayoutDashboard },
  { title: "Code review built in", body: "Every meaningful generated diff can be reviewed before it becomes accepted work.", icon: CheckCircle2 },
  { title: "Analytics from day one", body: "Track build health, credit burn, product events, signups, funnels, and runtime errors.", icon: BarChart3 }
];

export const DEVELOPER_FEATURES = [
  { title: "Code review built in", body: "AI reviews every generated diff for correctness, maintainability, accessibility, and framework usage." },
  { title: "Security scans", body: "Secrets, dependencies, auth patterns, RLS, CORS, and API validation scanned before deploy." },
  { title: "Analytics from day one", body: "Product events, build health, credit burn, and runtime errors tracked automatically." },
  { title: "GitHub-ready handoff", body: "Clean commits, changelog, and pull-request-style diffs your team can inspect and own." }
] as const;
