import type { Metadata } from "next";
import { CheckCircle2, BarChart3, ShieldCheck, Smartphone, Sparkles, LayoutDashboard, GitBranch, Zap, Lock, Globe } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Features — SpringBloom",
  description:
    "SpringBloom gives you every tool a serious builder needs: AI code generation, built-in review, security scanning, Supabase managed backend, web and mobile support, and analytics from day one.",
  openGraph: {
    title: "Features — SpringBloom",
    description: "AI code generation, security scanning, analytics, and more. Everything you need to ship faster.",
    type: "website",
  },
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-powered generation",
    body: "Describe your app in plain English. Agent SP 1 scopes the build, confirms a brief, and generates production-ready code — web or mobile.",
  },
  {
    icon: ShieldCheck,
    title: "Security by default",
    body: "Every generated app is scanned for exposed secrets, missing RLS policies, CORS misconfigurations, and unsafe API patterns before deploy.",
  },
  {
    icon: CheckCircle2,
    title: "Built-in code review",
    body: "Every meaningful diff is reviewed for correctness, accessibility, and framework best practices. Approve, reject, or iterate in one click.",
  },
  {
    icon: BarChart3,
    title: "Analytics from day one",
    body: "Track build health, credit burn, product events, signups, funnels, and runtime errors — automatically, with no extra setup.",
  },
  {
    icon: Smartphone,
    title: "Web + mobile",
    body: "Generate Next.js web apps and Expo React Native mobile apps from the same prompt surface. Switch between project types instantly.",
  },
  {
    icon: LayoutDashboard,
    title: "Managed Supabase backend",
    body: "Every project gets a managed Supabase backend — auth, database, storage, and RLS. Bring your own or go frontend-first with mock data.",
  },
  {
    icon: GitBranch,
    title: "GitHub-ready handoff",
    body: "Clean commits, changelog, and pull-request-style diffs. Export your project to GitHub and own every line of code.",
  },
  {
    icon: Zap,
    title: "Instant previews",
    body: "Your app runs live inside the builder on a dedicated Fly.io machine. Changes stream in real time. No deploy step, no waiting.",
  },
  {
    icon: Lock,
    title: "Credit-aware agent runs",
    body: "See a cost estimate before the agent spends a single credit. Credit receipts keep every build accountable — no surprise bills.",
  },
  {
    icon: Globe,
    title: "Custom domains",
    body: "Attach a custom domain to any published project via Cloudflare for SaaS. SSL, routing, and renewals are fully managed.",
  },
];

const COMPARISON = [
  { feature: "AI code generation", springbloom: true, lovable: true, bolt: true },
  { feature: "Built-in code review", springbloom: true, lovable: false, bolt: false },
  { feature: "Security scanning", springbloom: true, lovable: false, bolt: false },
  { feature: "Analytics built in", springbloom: true, lovable: false, bolt: false },
  { feature: "Mobile (Expo/RN)", springbloom: true, lovable: false, bolt: true },
  { feature: "GitHub export", springbloom: true, lovable: true, bolt: true },
  { feature: "Credit cost estimate before build", springbloom: true, lovable: false, bolt: false },
  { feature: "Managed Supabase backend", springbloom: true, lovable: true, bolt: false },
  { feature: "Custom domains", springbloom: true, lovable: true, bolt: false },
] as const;

export default function FeaturesPage() {
  return (
    <main className="page-shell">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="container text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-purple-400">Everything you need</p>
          <h1 className="text-5xl font-bold md:text-6xl">Built for builders<br />who care about code.</h1>
          <p className="hero-copy mx-auto max-w-2xl">
            SpringBloom isn't a toy prototyper. It's a full development environment with AI generation,
            security scanning, code review, and real-time previews — all in one place.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="section">
        <div className="container">
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article className="card feature-card" key={title}>
                <Icon color="var(--purple-bright)" size={28} />
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-slate-400">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section bg-zinc-950">
        <div className="container">
          <h2 className="text-center">How SpringBloom compares</h2>
          <p className="section-lede text-center">
            Most AI builders stop at generation. SpringBloom adds the layer that matters after the first draft.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="px-6 py-4 text-left font-semibold text-white">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-purple-300">SpringBloom</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-400">Lovable</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-400">Bolt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {COMPARISON.map(({ feature, springbloom, lovable, bolt }) => (
                  <tr className="hover:bg-zinc-900/30" key={feature}>
                    <td className="px-6 py-4 font-medium text-slate-200">{feature}</td>
                    <td className="px-6 py-4 text-center">
                      {springbloom ? <span className="text-green-400">✓</span> : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {lovable ? <span className="text-green-400">✓</span> : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {bolt ? <span className="text-green-400">✓</span> : <span className="text-zinc-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-slate-600">
            Comparison based on publicly available feature documentation. Last updated May 2026.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section border-t border-zinc-800/60">
        <div className="container text-center">
          <h2>Ready to build?</h2>
          <p className="section-lede">Start for free — 100 credits, no credit card required.</p>
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
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
