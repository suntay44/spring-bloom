import type { Metadata } from "next";
import {
  Sparkles, ShieldCheck, CheckCircle2, BarChart3, Smartphone,
  LayoutDashboard, GitBranch, Zap, Lock, Globe, Database,
  FileCode2, Layers, CreditCard, Eye, MessageSquareCode,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Features — SpringBloom",
  description:
    "Every tool a serious builder needs: AI code generation, security scanning, built-in review, Supabase backend, web and mobile support, and analytics from day one.",
  openGraph: {
    title: "Features — SpringBloom",
    description: "AI code generation, security scanning, analytics, and more. Everything you need to ship faster.",
    type: "website",
  },
};

// ── Category data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "generation",
    label: "AI Generation",
    features: [
      {
        icon: Sparkles,
        title: "Agent SP 1",
        body: "SpringBloom's AI agent scopes your build with a 5-question brief, confirms cost, then generates production-ready web or mobile code.",
      },
      {
        icon: MessageSquareCode,
        title: "Chat-driven development",
        body: "Iterate in plain English. Describe a change in the chat panel and see it applied live in the preview — no forms, no config.",
      },
      {
        icon: FileCode2,
        title: "Full-stack code output",
        body: "Agent SP 1 writes real TypeScript, not pseudocode. Components, API routes, database queries, and types — all idiomatic and reviewable.",
      },
      {
        icon: Layers,
        title: "Scaffold library",
        body: "10+ scaffold templates (SaaS dashboard, booking system, e-commerce, habit tracker, and more) speed up the first generation for common app types.",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    features: [
      {
        icon: ShieldCheck,
        title: "Security scanning",
        body: "Every generated diff is scanned for exposed secrets, missing RLS policies, CORS issues, and unsafe API patterns before you see it.",
      },
      {
        icon: Lock,
        title: "RLS by default",
        body: "All Supabase projects include Row-Level Security policies. The agent blocks generation if policies are overly permissive.",
      },
      {
        icon: Eye,
        title: "Content safety filter",
        body: "All prompts are screened before reaching the AI model. Blocked requests are never billed and the user is notified immediately.",
      },
      {
        icon: Globe,
        title: "Security headers",
        body: "Every app ships with HSTS, CSP, COOP, and X-Frame-Options headers pre-configured — no additional setup required.",
      },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    features: [
      {
        icon: Zap,
        title: "Instant previews",
        body: "Your app runs live on a dedicated Fly.io machine. Changes stream in real time. The machine auto-suspends when idle to minimize cost.",
      },
      {
        icon: Database,
        title: "Managed Supabase",
        body: "Every project gets auth, database, storage, and RLS out of the box. Bring your own Supabase project or go frontend-first with mock data.",
      },
      {
        icon: Globe,
        title: "Custom domains",
        body: "Attach any domain to a published project via Cloudflare for SaaS. SSL, routing, and renewals are fully managed.",
      },
      {
        icon: CreditCard,
        title: "Stripe test sandboxes",
        body: "Activate a Stripe test sandbox inside any project in one click. Accept payments in your generated app without touching Stripe's dashboard.",
      },
    ],
  },
  {
    id: "quality",
    label: "Code Quality",
    features: [
      {
        icon: CheckCircle2,
        title: "Built-in code review",
        body: "Every meaningful diff is reviewed for correctness, accessibility, and framework best practices. Approve, reject, or iterate in one click.",
      },
      {
        icon: BarChart3,
        title: "Analytics from day one",
        body: "Build health, credit burn, product events, signups, and runtime errors are tracked automatically — no instrumentation needed.",
      },
      {
        icon: GitBranch,
        title: "GitHub export",
        body: "Export your project to GitHub with clean commits and PR-style diffs. Own every line of code and hand off to your team.",
      },
      {
        icon: Smartphone,
        title: "Web + mobile",
        body: "Generate Next.js web apps and Expo React Native mobile apps from the same prompt surface. Switch project types without re-learning the tool.",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    features: [
      {
        icon: LayoutDashboard,
        title: "Supabase",
        body: "Managed Postgres, auth, realtime, and storage. Bring your own project or use the one SpringBloom provisions for you.",
      },
      {
        icon: CreditCard,
        title: "Stripe",
        body: "Test sandbox keys injected automatically. Connect your live Stripe account via OAuth when you're ready to charge real users.",
      },
      {
        icon: GitBranch,
        title: "GitHub",
        body: "Push generated code to a GitHub repo with a single click. Works with personal repos and organization repos.",
      },
      {
        icon: Globe,
        title: "Cloudflare",
        body: "Custom domain provisioning via Cloudflare for SaaS. Wildcard SSL, CNAME routing, and renewal all managed for you.",
      },
    ],
  },
] as const;

// ── Comparison ───────────────────────────────────────────────────────────────

const COMPARISON = [
  { feature: "AI code generation",               sb: true,  lv: true,  bt: true  },
  { feature: "Built-in code review",             sb: true,  lv: false, bt: false },
  { feature: "Security scanning",                sb: true,  lv: false, bt: false },
  { feature: "Analytics built in",               sb: true,  lv: false, bt: false },
  { feature: "Mobile (Expo / React Native)",     sb: true,  lv: false, bt: true  },
  { feature: "GitHub export",                    sb: true,  lv: true,  bt: true  },
  { feature: "Cost estimate before build",       sb: true,  lv: false, bt: false },
  { feature: "Managed Supabase backend",         sb: true,  lv: true,  bt: false },
  { feature: "Stripe sandbox injection",         sb: true,  lv: false, bt: false },
  { feature: "Custom domains",                   sb: true,  lv: true,  bt: false },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <main className="page-shell">
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="container text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-purple-400">
            All features
          </p>
          <h1 className="text-5xl md:text-6xl">
            Built for builders<br className="hidden md:block" /> who care about code.
          </h1>
          <p className="hero-copy mx-auto max-w-2xl">
            SpringBloom isn't a prototype toy. It's a full development environment —
            AI generation, security scanning, code review, and instant previews in one place.
          </p>
        </div>
      </section>

      {/* ── Feature categories ── */}
      {CATEGORIES.map((cat, ci) => (
        <section
          className={`section ${ci % 2 === 1 ? "bg-zinc-950" : ""}`}
          id={cat.id}
          key={cat.id}
        >
          <div className="container">
            {/* Section header */}
            <div className="mb-10 flex items-center gap-4">
              <span className="h-px flex-1 bg-zinc-800" />
              <h2 className="text-xl text-white">{cat.label}</h2>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* Feature cards — icon + title + body, no border, clean */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cat.features.map(({ icon: Icon, title, body }) => (
                <article key={title} className="group rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-purple-800/60 hover:bg-zinc-900">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-950/60 text-purple-400 transition-colors group-hover:bg-purple-900/60">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-2 text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Comparison table ── */}
      <section className="section bg-zinc-950">
        <div className="container">
          <div className="mb-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-zinc-800" />
            <h2 className="text-xl text-white">How we compare</h2>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Feature</th>
                  <th className="px-6 py-4 text-center">
                    <span className="font-bold text-purple-300">SpringBloom</span>
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-500">Lovable</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-500">Bolt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {COMPARISON.map(({ feature, sb, lv, bt }) => (
                  <tr className="transition-colors hover:bg-zinc-900/40" key={feature}>
                    <td className="px-6 py-3.5 text-slate-300">{feature}</td>
                    <td className="px-6 py-3.5 text-center">
                      {sb
                        ? <span className="inline-flex items-center justify-center rounded-full bg-green-900/30 px-2 py-0.5 text-xs font-bold text-green-400">✓ Yes</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {lv
                        ? <span className="text-slate-400 text-xs font-semibold">✓</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {bt
                        ? <span className="text-slate-400 text-xs font-semibold">✓</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Based on publicly available feature documentation. Last updated May 2026.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section border-t border-zinc-800/60">
        <div className="container text-center">
          <h2>Ready to build?</h2>
          <p className="section-lede">Start for free — 100 credits, no credit card required.</p>
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-7 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            href="/"
          >
            Start building <span aria-hidden>→</span>
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
