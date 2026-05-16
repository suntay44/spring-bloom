import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Play } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { HeroPromptSection } from "@/components/marketing/HeroPromptSection";
import { Footer } from "@/components/shared/Footer";
import { DEVELOPER_FEATURES, MARKETING_FEATURES, MOCK_STATS, MOCK_TESTIMONIALS } from "@/lib/mock/marketing";

const HERO_STATS = [
  { title: "Plan", body: "5-question brief before code" },
  { title: "Build", body: "chat left, preview right" },
  { title: "Trust", body: "review, security, analytics" }
] as const;

const WORKFLOW_STEPS = [
  { step: "1", title: "Describe your app", body: "Choose full-stack, mobile, or landing page and write the first idea." },
  { step: "2", title: "Answer five questions", body: "Clarify product goal, frontend, backend, screens, and constraints." },
  { step: "3", title: "Approve the PRD", body: "See scope, backend choice, model, and credit estimate before building." }
] as const;

const FEATURE_HIGHLIGHTS = ["Code review built in", "Security scans", "Analytics from day one"] as const;

export default function MarketingPage() {
  return (
    <main className="page-shell">
      <Navbar />
      <section className="hero">
        <div className="container">
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-md border border-purple-500/30 bg-zinc-950/50 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
            <Bot size={18} /> Programmer-centric AI app builder
          </div>
          <h1>Build apps in plain English.</h1>
          <p className="hero-copy">
            Describe what you want. Confirm the project brief. Wild Cupcake generates web and mobile apps with real
            code, review, security, analytics, and credit receipts.
          </p>
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            <Link className="button" href="/signup">
              Start Building <ArrowRight size={17} />
            </Link>
            <Link className="button secondary" href="#workflow">
              <Play size={17} /> Watch flow
            </Link>
          </div>
          <div className="mx-auto mb-6 flex flex-wrap justify-center gap-8 text-sm font-bold text-slate-400">
            <span><strong className="text-white">{MOCK_STATS.builders}</strong> builders</span>
            <span><strong className="text-white">{MOCK_STATS.appsBuilt}</strong> apps built</span>
            <span><strong className="text-white">{MOCK_STATS.rating}</strong> rating</span>
          </div>
          <HeroPromptSection />
          <div className="mx-auto mt-6 grid max-w-4xl grid-cols-3 gap-3">
            {HERO_STATS.map(({ title, body }) => (
              <div className="card px-4 py-3" key={title}>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="workflow">
        <div className="container">
          <h2>Prompt, brief, approve, build.</h2>
          <p className="section-lede">
            The first prompt starts discovery, not coding. Every new project gets a 5-question brief and a simple PRD
            before the agent spends credits on generation.
          </p>
          <div className="mt-8 grid-3">
            {WORKFLOW_STEPS.map(({ step, title, body }) => (
              <article className="card feature-card" key={title}>
                <span className="pill">{step}</span>
                <h3 className="mt-5 text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-zinc-950" id="features">
        <div className="container">
          <h2>Built for users who still care about code.</h2>
          <p className="section-lede">
            The default view is simple, but developer-grade tools are always one click away.
          </p>
          <div className="mt-8 grid-3">
            {MARKETING_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="card feature-card" key={feature.title}>
                  <Icon color="var(--blue)" size={28} />
                  <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-slate-300">{feature.body}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-8 rounded-lg border border-purple-900 bg-black p-6 text-white">
            <div className="grid-3">
              {FEATURE_HIGHLIGHTS.map((item) => (
                <p className="flex items-center gap-3 font-semibold" key={item}>
                  <CheckCircle2 color="#5ee0a0" /> {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t border-zinc-800/60 bg-zinc-950">
        <div className="container">
          <h2>Everything a serious builder needs.</h2>
          <p className="section-lede">Developer-grade tools are always one click away, never hidden behind a paywall.</p>
          <div className="mt-10 grid gap-0 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {DEVELOPER_FEATURES.map((item) => (
              <div className="flex flex-wrap items-start gap-6 px-6 py-5" key={item.title}>
                <p className="min-w-[200px] font-semibold text-white">{item.title}</p>
                <p className="text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Builders trust Wild Cupcake.</h2>
          <div className="mt-8 grid-3">
            {MOCK_TESTIMONIALS.map((testimonial) => (
              <article className="card feature-card" key={testimonial.name}>
                <p className="leading-7 text-slate-300">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-purple-700 text-sm font-bold text-white">{testimonial.initials}</span>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm font-bold text-slate-500">{testimonial.role} · {testimonial.company}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <Footer />
    </main>
  );
}
