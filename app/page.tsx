import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { HeroCTAButtons } from "@/components/marketing/HeroCTAButtons";
import { Navbar } from "@/components/marketing/Navbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { HeroPromptSection } from "@/components/marketing/HeroPromptSection";
import { Footer } from "@/components/shared/Footer";
import { NewProjectClient } from "@/components/new-project/NewProjectClient";
import { Badge } from "@/components/ui/badge";
import { DEVELOPER_FEATURES, MARKETING_FEATURES, MOCK_STATS, MOCK_TESTIMONIALS } from "@/lib/mock/marketing";

const HERO_STATS = [
  { title: "Plan", body: "Brief before code — scope, stack, cost estimate." },
  { title: "Build", body: "Chat on the left. Live preview on the right." },
  { title: "Ship", body: "Review, security scan, analytics from day one." },
] as const;

const WORKFLOW_STEPS = [
  { step: "1", title: "Describe", body: "Choose full-stack web, mobile, or landing page. Write your first idea in plain English." },
  { step: "2", title: "Brief", body: "SpringBloom confirms your goal, stack, screens, and cost estimate — before writing a single line." },
  { step: "3", title: "Build", body: "Approve the scope and let Agent SP 1 generate, review, and iterate with you in real time." },
] as const;

const FEATURE_HIGHLIGHTS = ["Code review built in", "Security scans", "Analytics from day one"] as const;

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Logged-in users see the new project creation screen at root
  if (user) {
    const [{ data: profile }, { data: balanceRow }, { data: projects }] = await Promise.all([
      supabase.from("profiles").select("full_name, plan").eq("id", user.id).single(),
      supabase.from("user_credit_balance").select("balance").eq("user_id", user.id).single(),
      supabase
        .from("projects")
        .select("id, name, type, status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

    return (
      <AppShell balance={Number(balanceRow?.balance ?? 0)} profile={profile} projects={projects ?? []} user={user}>
        <NewProjectClient />
      </AppShell>
    );
  }

  // Logged-out users see the marketing landing page
  return (
    <main className="page-shell">
      <Navbar />
      <section className="hero">
        <div className="container">
          <h1>Build apps in plain English.</h1>
          <p className="hero-copy">
            Describe what you want. Confirm the project brief. SpringBloom generates production-ready web and mobile apps
            with real code, built-in review, security scanning, and credit receipts.
          </p>
          <HeroCTAButtons />
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
          <h2>From idea to shipped — in three steps.</h2>
          <p className="section-lede">
            Every project starts with a brief, not a blank canvas. Agent SP 1 scopes your build before spending a single credit on generation.
          </p>
          <div className="mt-8 grid-3">
            {WORKFLOW_STEPS.map(({ step, title, body }) => (
              <article className="card feature-card" key={title}>
                <Badge variant="secondary">{step}</Badge>
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
          <p className="section-lede">Developer-grade tools are always one click away.</p>
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

      {/* ── Meet Agent SP 1 ── */}
      <section className="section" id="agent">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-purple-400">Introducing</p>
            <h2 className="text-4xl font-bold md:text-5xl">Meet Agent SP&nbsp;1</h2>
            <p className="section-lede mt-4">
              SpringBloom's first AI agent isn't a chatbot — it's a senior developer that briefs, builds, reviews, and
              ships alongside you. It reads your intent, not just your words.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "🧠",
                title: "Understands intent",
                body: "Agent SP 1 asks five scoping questions before touching code — so the first generation is already close to what you want.",
              },
              {
                icon: "🔁",
                title: "Iterates with you",
                body: "Chat on the left, live preview on the right. Every change is applied instantly, diffed, and reviewable.",
              },
              {
                icon: "🔒",
                title: "Ships safely",
                body: "Built-in security scanning, dependency checks, and RLS validation happen before every deploy — not after.",
              },
            ].map(({ icon, title, body }) => (
              <div className="card feature-card" key={title}>
                <span className="text-3xl">{icon}</span>
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 overflow-hidden rounded-xl border border-purple-900/40 bg-zinc-950">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs font-semibold text-zinc-500">Agent SP 1 · Task Manager Pro</span>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="border-r border-zinc-800 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Chat</p>
                {[
                  { role: "user", msg: "Build me a task manager with drag-and-drop and team assignments." },
                  { role: "agent", msg: "Scoped. Stack: Next.js + Supabase + @dnd-kit. 3 screens: Board, Team, Settings. Est. 42 credits. Approve?" },
                  { role: "user", msg: "Yes, go." },
                  { role: "agent", msg: "Generating board layout with Kanban columns, drag handles, and task cards… done. Preview is live." },
                ].map(({ role, msg }, i) => (
                  <div className={`mb-3 flex gap-3 ${role === "user" ? "justify-end" : ""}`} key={i}>
                    {role === "agent" && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold">SP</span>}
                    <p className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${role === "user" ? "bg-purple-600 text-white" : "bg-zinc-800 text-slate-200"}`}>{msg}</p>
                  </div>
                ))}
              </div>
              <div className="p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Preview</p>
                <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Task Manager Pro</p>
                    <span className="rounded-md bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-400">Live</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Todo", "In Progress", "Done"].map((col) => (
                      <div className="rounded-md bg-zinc-800 p-2" key={col}>
                        <p className="mb-2 text-xs font-bold text-zinc-400">{col}</p>
                        <div className="space-y-1.5">
                          {[1, 2].map((n) => (
                            <div className="rounded bg-zinc-700 px-2 py-1.5 text-xs" key={n}>Task {n}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t border-zinc-800/60 bg-zinc-950">
        <div className="container">
          <h2>Everything a serious builder needs.</h2>
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
          <h2>Builders trust SpringBloom.</h2>
          <div className="mt-8 grid-3">
            {MOCK_TESTIMONIALS.map((testimonial) => (
              <article className="card feature-card" key={testimonial.name}>
                <p className="leading-7 text-slate-300">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">{testimonial.initials}</span>
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
