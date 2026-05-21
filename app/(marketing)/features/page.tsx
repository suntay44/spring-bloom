import type { Metadata } from "next";
import {
  Sparkles, ShieldCheck, CheckCircle2, BarChart3, Smartphone,
  LayoutDashboard, GitBranch, Zap, Lock, Globe, Database,
  FileCode2, Layers, CreditCard, Eye, MessageSquareCode,
  KeyRound, FileSearch, Users, Webhook,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AnimateIn } from "@/components/shared/AnimateIn";

export const metadata: Metadata = {
  title: "Features — SpringBloom",
  description:
    "Every tool a serious builder needs: AI code generation, security scanning, built-in review, Supabase backend, web and mobile support, and analytics from day one.",
  openGraph: {
    title: "Features — SpringBloom",
    description: "AI code generation, security scanning, analytics, and more.",
    type: "website",
  },
};

// ── Scrolling ticker logos ────────────────────────────────────────────────────

const TICKER = [
  { label: "Supabase",   color: "#3ECF8E" },
  { label: "Stripe",     color: "#635BFF" },
  { label: "Anthropic",  color: "#D97757" },
  { label: "OpenAI",     color: "#ffffff" },
  { label: "GitHub",     color: "#ffffff" },
  { label: "Cloudflare", color: "#F38020" },
  { label: "Expo",       color: "#ffffff" },
  { label: "Fly.io",     color: "#8B5CF6" },
  { label: "Vercel",     color: "#ffffff" },
  { label: "Gemini",     color: "#4285F4" },
];

// ── Category sections — mirrors Replit integrations layout ───────────────────

const SECTIONS = [
  {
    label: "AI generation",
    cards: [
      { icon: Sparkles,        title: "Agent SP 1",              body: "SpringBloom's AI agent scopes your build with a 5-question brief, confirms cost estimate, then generates production-ready code." },
      { icon: MessageSquareCode, title: "Chat-driven development", body: "Iterate in plain English. Describe a change and see it applied live in the preview — no forms, no config files." },
      { icon: FileCode2,       title: "Real TypeScript output",  body: "Agent SP 1 writes idiomatic TypeScript — components, API routes, database queries, and types — not pseudocode." },
      { icon: Layers,          title: "Scaffold library",        body: "10+ scaffold templates for common app types speed up the first generation: SaaS dashboard, booking, e-commerce, and more." },
    ],
  },
  {
    label: "Security",
    cards: [
      { icon: ShieldCheck,  title: "Security scanning",       body: "Every generated diff is scanned for exposed secrets, missing RLS policies, CORS issues, and unsafe API patterns before you see it." },
      { icon: Lock,         title: "RLS by default",          body: "All Supabase projects include Row-Level Security policies. The agent blocks generation if policies are overly permissive." },
      { icon: KeyRound,     title: "Secrets detection",       body: "Hardcoded API keys and tokens in generated code are caught and flagged before they reach your preview or repository." },
      { icon: Eye,          title: "Content safety filter",   body: "All prompts are screened before reaching the AI model. Blocked requests are never billed and the user is notified immediately." },
      { icon: FileSearch,   title: "Dependency auditing",     body: "New packages added by the agent are checked against known CVE databases. High-severity issues surface before you approve." },
      { icon: Globe,        title: "Security headers",        body: "Every app ships with HSTS, Content-Security-Policy, COOP, and X-Frame-Options pre-configured — no setup required." },
    ],
  },
  {
    label: "Infrastructure",
    cards: [
      { icon: Zap,          title: "Instant live previews",   body: "Your app runs on a dedicated Fly.io machine. Changes stream in real time. Machines auto-suspend when idle." },
      { icon: Database,     title: "Managed Supabase",        body: "Every project gets auth, Postgres, storage, and RLS out of the box. Bring your own project or go frontend-first." },
      { icon: Globe,        title: "Custom domains",          body: "Attach any domain via Cloudflare for SaaS. SSL provisioning, CNAME routing, and renewals are fully managed." },
      { icon: CreditCard,   title: "Stripe test sandboxes",   body: "Activate a Stripe test sandbox in one click. Accept payments in generated apps without touching the Stripe dashboard." },
    ],
  },
  {
    label: "Code quality",
    cards: [
      { icon: CheckCircle2, title: "Built-in code review",    body: "Every meaningful diff is reviewed for correctness, accessibility, and framework best practices — automatically." },
      { icon: BarChart3,    title: "Analytics from day one",  body: "Build health, credit burn, product events, and runtime errors are tracked automatically with no instrumentation." },
      { icon: GitBranch,    title: "GitHub export",           body: "Export to GitHub with clean commits and PR-style diffs. Own every line of code and hand off to your team." },
      { icon: Smartphone,   title: "Web + mobile",            body: "Generate Next.js web apps and Expo React Native apps from the same surface. Switch project types without re-learning." },
    ],
  },
  {
    label: "Collaboration & billing",
    cards: [
      { icon: Users,        title: "Team projects",           body: "Multiple collaborators on the same project — shared preview, shared history, individual credit attribution." },
      { icon: CreditCard,   title: "Credit receipts",         body: "Every generation shows a cost estimate before it runs. Credit receipts keep your team accountable with no surprise bills." },
      { icon: Webhook,      title: "Webhook events",          body: "Subscribe to build events, deploy completions, and agent run outcomes via webhooks to plug into your existing workflow." },
      { icon: LayoutDashboard, title: "Admin dashboard",      body: "Built-in admin panel tracks user analytics, cost margins, failed runs, and platform settings — no third-party BI tool needed." },
    ],
  },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <main className="page-shell">
      <Navbar />

      {/* ── Hero with floating cards ── */}
      <section className="hero features-hero">
        <div className="container text-center" style={{ position: "relative", zIndex: 1 }}>
          <AnimateIn from="fade">
            <p className="features-hero-eyebrow">All features</p>
          </AnimateIn>
          <AnimateIn from="bottom" delay={60}>
            <h1>
              Everything to go<br className="hidden md:block" /> from idea to shipped.
            </h1>
          </AnimateIn>
          <AnimateIn from="bottom" delay={140}>
            <p className="hero-copy mx-auto max-w-xl">
              Agent SP 1 supports every layer of a production app — code generation,
              security, review, analytics, and deployment.
            </p>
            <a
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              href="/"
            >
              Start building free →
            </a>
          </AnimateIn>
        </div>

        {/* Floating ambient cards — CSS animation, no JS */}
        <div className="features-floaters" aria-hidden>
          <div className="floater floater-1"><Sparkles size={16} /><span>AI Generation</span></div>
          <div className="floater floater-2"><ShieldCheck size={16} /><span>Security scan</span></div>
          <div className="floater floater-3"><Zap size={16} /><span>Live preview</span></div>
          <div className="floater floater-4"><CheckCircle2 size={16} /><span>Code review</span></div>
          <div className="floater floater-5"><GitBranch size={16} /><span>GitHub export</span></div>
          <div className="floater floater-6"><BarChart3 size={16} /><span>Analytics</span></div>
        </div>
      </section>

      {/* ── Scrolling ticker ── */}
      <div className="features-ticker-wrap border-y border-zinc-800/50 py-5">
        <div className="features-ticker">
          {[...TICKER, ...TICKER].map(({ label, color }, i) => (
            <span
              className="features-ticker-item"
              key={`${label}-${i}`}
              style={{ color }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Feature sections ── */}
      <div className="container py-20 space-y-20">
        {SECTIONS.map(({ label, cards }) => (
          <section key={label}>
            <AnimateIn from="bottom">
              <h2 className="features-section-label">{label}</h2>
            </AnimateIn>

            <div className="features-grid">
              {cards.map(({ icon: Icon, title, body }, ci) => (
                <AnimateIn from="bottom" delay={ci * 60} key={title}>
                  <article className="features-card">
                    <div className="features-card-header">
                      <span className="features-icon-box">
                        <Icon size={18} />
                      </span>
                      <h3 className="features-card-title">{title}</h3>
                    </div>
                    <p className="features-card-body">{body}</p>
                  </article>
                </AnimateIn>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── CTA ── */}
      <section className="section border-t border-zinc-800/40">
        <div className="container text-center">
          <h2>Ready to build?</h2>
          <p className="section-lede">100 free credits. No credit card required.</p>
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-7 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            href="/"
          >
            Start building →
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
