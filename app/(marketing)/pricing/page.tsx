import type { Metadata } from "next";
import { Zap, ShieldCheck, GitBranch, BarChart3, Users, CreditCard, HelpCircle, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { Footer } from "@/components/shared/Footer";
import { AnimateIn } from "@/components/shared/AnimateIn";

export const metadata: Metadata = {
  title: "Pricing — SpringBloom",
  description:
    "Transparent credit pricing. See estimates before work starts, holds while the agent runs, and receipts after every generation.",
  openGraph: {
    title: "Pricing — SpringBloom",
    description: "Transparent, usage-based pricing with no surprise bills.",
    type: "website",
  },
};

// ── Credit usage examples ────────────────────────────────────────────────────

const CREDIT_EXAMPLES = [
  { icon: Zap,          label: "Initial app build",       range: "50–150",  unit: "credits", note: "Full scaffold + DB schema + auth" },
  { icon: ShieldCheck,  label: "Security scan",           range: "10–40",   unit: "credits", note: "RLS check + secrets + headers" },
  { icon: CheckCircle2, label: "AI code review",          range: "5–25",    unit: "credits", note: "Per meaningful diff" },
  { icon: GitBranch,    label: "GitHub export",           range: "2–8",     unit: "credits", note: "Clean commits, PR-style diffs" },
  { icon: BarChart3,    label: "Analytics dashboard",     range: "15–45",   unit: "credits", note: "Event setup + visualizations" },
  { icon: Users,        label: "Auth + team invite flow", range: "20–60",   unit: "credits", note: "OAuth, invites, role management" },
] as const;

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "What counts as a credit?",
    a: "Each AI task — code generation, security scan, code review, deploy assist — consumes credits based on complexity. You always see an estimate before the agent starts.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Yes. Unused credits carry forward month to month for as long as your plan is active. They never expire and there's no cap on how many you can accumulate — save credits from a quiet month and spend them when you're building intensely.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Generation pauses and you're notified. You can purchase a credit top-up anytime or upgrade your plan — no work is lost.",
  },
  {
    q: "Can I try SpringBloom for free?",
    a: "Every new account starts with 100 free credits — no credit card required. Enough to build and preview a real app.",
  },
  {
    q: "Is there a limit on projects?",
    a: "Free accounts get 1 active project. Starter gets 3, and Pro gets unlimited. You can archive projects at any time — archived projects don't count toward your limit.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes. Upgrades take effect immediately and you're charged pro-rata. Downgrades apply at the next billing cycle.",
  },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <main className="page-shell">
      <Navbar />

      {/* ── Hero ── */}
      <section className="security-hero mesh-hero">
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <AnimateIn from="fade">
            <div className="security-hero-badge">
              <CreditCard size={14} />
              Pricing
            </div>
          </AnimateIn>
          <AnimateIn from="bottom" delay={80}>
            <h1 className="security-hero-h1">
              Plans that make AI<br />work measurable.
            </h1>
          </AnimateIn>
          <AnimateIn from="bottom" delay={160}>
            <p className="security-hero-sub">
              See estimates before work starts, holds while the agent runs, and receipts
              after every generation, review, security scan, and deploy task.
            </p>
          </AnimateIn>
          <AnimateIn from="fade" delay={220}>
            <div className="pricing-hero-trust">
              <span>100 free credits to start</span>
              <span>No credit card required</span>
              <span>Unused credits roll over</span>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Plans ── */}
      <PricingSection expanded />

      {/* ── Credit examples ── */}
      <section className="section pricing-examples-section">
        <div className="container">
          <AnimateIn from="bottom">
            <h2 className="text-center">How credits are spent.</h2>
            <p className="section-lede text-center">
              Every task shows an estimate before it runs — no guesswork, no surprise bills.
            </p>
          </AnimateIn>
          <div className="pricing-examples-grid">
            {CREDIT_EXAMPLES.map(({ icon: Icon, label, range, unit, note }, i) => (
              <AnimateIn from="bottom" delay={i * 50} key={label}>
                <div className="pricing-example-card">
                  <div className="pricing-example-icon">
                    <Icon size={18} />
                  </div>
                  <div className="pricing-example-body">
                    <p className="pricing-example-label">{label}</p>
                    <p className="pricing-example-note">{note}</p>
                  </div>
                  <div className="pricing-example-range">
                    <span className="pricing-example-num">{range}</span>
                    <span className="pricing-example-unit">{unit}</span>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section pricing-faq-section">
        <div className="container">
          <AnimateIn from="bottom">
            <div className="pricing-faq-header">
              <HelpCircle size={20} className="pricing-faq-icon" />
              <h2>Frequently asked questions.</h2>
            </div>
          </AnimateIn>
          <div className="pricing-faq-grid">
            {FAQ.map(({ q, a }, i) => (
              <AnimateIn from="bottom" delay={i * 50} key={q}>
                <div className="pricing-faq-item">
                  <p className="pricing-faq-q">{q}</p>
                  <p className="pricing-faq-a">{a}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section border-t border-zinc-800/40">
        <div className="container text-center">
          <AnimateIn from="bottom">
            <h2>Start with 100 free credits.</h2>
            <p className="section-lede">No credit card. No commitment. Just build.</p>
            <a
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-7 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              href="/"
            >
              Start building free →
            </a>
          </AnimateIn>
        </div>
      </section>

      <Footer />
    </main>
  );
}
