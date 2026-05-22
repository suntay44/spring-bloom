import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Navbar } from "@/components/marketing/Navbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { HeroPromptSection } from "@/components/marketing/HeroPromptSection";
import { Footer } from "@/components/shared/Footer";
import { NewProjectClient } from "@/components/new-project/NewProjectClient";
import { AnimateIn } from "@/components/shared/AnimateIn";
import { DEVELOPER_FEATURES, MOCK_STATS, MOCK_TESTIMONIALS } from "@/lib/mock/marketing";
import { CheckCircle2 } from "lucide-react";

const AGENT_CARDS = [
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
] as const;

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

      {/* ── Hero ── */}
      <section className="hero mesh-hero">
        <div className="container" style={{ position: "relative", zIndex: 1, paddingTop: "80px", paddingBottom: "80px", width: "100%" }}>

          {/* Single announcement pill — like Base44/Lovable */}
          <AnimateIn from="fade">
            <a className="hero-announce" href="#agent">
              <span className="hero-announce-badge">New</span>
              Meet Agent SP 1 →
            </a>
          </AnimateIn>

          <AnimateIn from="bottom" delay={60}>
            <h1 className="hero-h1-oneliner">Spring: where flowers bloom.</h1>
          </AnimateIn>

          <AnimateIn from="bottom" delay={120}>
            <p className="hero-copy mx-auto max-w-lg">
              Web &amp; Mobile same backend, dev-centric internal tools.
            </p>
          </AnimateIn>

          {/* Prompt IS the CTA */}
          <AnimateIn from="bottom" delay={180}>
            <HeroPromptSection />
          </AnimateIn>

          {/* Minimal trust row below input */}
          <AnimateIn from="fade" delay={260}>
            <div className="hero-trust-row">
              <span><strong>{MOCK_STATS.builders}</strong> builders</span>
              <span className="hero-trust-sep" />
              <span><strong>{MOCK_STATS.appsBuilt}</strong> apps built</span>
              <span className="hero-trust-sep" />
              <span>⭐ {MOCK_STATS.rating} rating</span>
            </div>
          </AnimateIn>

        </div>
      </section>

      {/* ── Meet Agent SP 1 ── */}
      <section className="section home-agent-section" id="agent">
        <div className="container">
          <AnimateIn from="bottom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="home-eyebrow">Introducing</p>
              <h2>Meet Agent SP&nbsp;1</h2>
              <p className="section-lede mt-4">
                SpringBloom's first AI agent isn't a chatbot — it's a senior developer that briefs, builds, reviews, and
                ships alongside you. It reads your intent, not just your words.
              </p>
            </div>
          </AnimateIn>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AGENT_CARDS.map(({ icon, title, body }, i) => (
              <AnimateIn from="bottom" delay={i * 80} key={title}>
                <div className="card home-agent-card">
                  <span className="home-agent-icon">{icon}</span>
                  <h3 className="mt-5 text-xl">{title}</h3>
                  <p className="mt-3 text-slate-400">{body}</p>
                </div>
              </AnimateIn>
            ))}
          </div>

          {/* Agent demo window */}
          <AnimateIn from="bottom" delay={120}>
            <div className="mt-10 home-agent-window">
              <div className="home-agent-window-bar">
                <span className="home-agent-dot dot-red" />
                <span className="home-agent-dot dot-yellow" />
                <span className="home-agent-dot dot-green" />
                <span className="home-agent-window-label">Agent SP 1 · Task Manager Pro</span>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="home-agent-chat">
                  <p className="home-agent-pane-label">Chat</p>
                  {[
                    { role: "user",  msg: "Build me a task manager with drag-and-drop and team assignments." },
                    { role: "agent", msg: "Scoped. Stack: Next.js + Supabase + @dnd-kit. 3 screens: Board, Team, Settings. Est. 42 credits. Approve?" },
                    { role: "user",  msg: "Yes, go." },
                    { role: "agent", msg: "Generating board layout with Kanban columns, drag handles, and task cards… done. Preview is live." },
                  ].map(({ role, msg }, i) => (
                    <div className={`mb-3 flex gap-3 ${role === "user" ? "justify-end" : ""}`} key={i}>
                      {role === "agent" && (
                        <span className="home-agent-avatar">SP</span>
                      )}
                      <p className={`home-agent-bubble ${role === "user" ? "home-agent-bubble--user" : "home-agent-bubble--agent"}`}>
                        {msg}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="home-agent-preview">
                  <p className="home-agent-pane-label">Preview</p>
                  <div className="home-preview-frame">
                    <div className="home-preview-topbar">
                      <p className="text-sm font-semibold">Task Manager Pro</p>
                      <span className="home-preview-live">Live</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["Todo", "In Progress", "Done"].map((col) => (
                        <div className="home-preview-col" key={col}>
                          <p className="mb-2 text-xs font-bold text-zinc-400">{col}</p>
                          <div className="space-y-1.5">
                            {[1, 2].map((n) => (
                              <div className="home-preview-task" key={n}>Task {n}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Everything a serious builder needs ── */}
      <section className="section home-features-section">
        <div className="container">
          <AnimateIn from="bottom">
            <h2>Everything a serious builder needs.</h2>
            <p className="section-lede">
              No stitching tools together. SpringBloom handles every layer of a production app.
            </p>
          </AnimateIn>
          <AnimateIn from="bottom" delay={80}>
            <div className="mt-10 home-features-table">
              {DEVELOPER_FEATURES.map((item, i) => (
                <div className="home-features-row" key={item.title}>
                  <div className="home-features-row-icon">
                    <CheckCircle2 size={16} color="var(--primary)" />
                  </div>
                  <p className="home-features-row-title">{item.title}</p>
                  <p className="home-features-row-body">{item.body}</p>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section home-testimonials-section">
        <div className="container">
          <AnimateIn from="bottom">
            <h2>Builders trust SpringBloom.</h2>
            <p className="section-lede">From first prototype to production — teams use SpringBloom daily.</p>
          </AnimateIn>
          <div className="mt-8 grid-3">
            {MOCK_TESTIMONIALS.map((testimonial, i) => (
              <AnimateIn from="bottom" delay={i * 80} key={testimonial.name}>
                <article className="home-testimonial-card">
                  <div className="home-testimonial-stars">{"★".repeat(5)}</div>
                  <p className="mt-4 leading-7 text-slate-300">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <span className="home-testimonial-avatar">{testimonial.initials}</span>
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm font-medium text-slate-500">{testimonial.role} · {testimonial.company}</p>
                    </div>
                  </div>
                </article>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />
      <Footer />
    </main>
  );
}
