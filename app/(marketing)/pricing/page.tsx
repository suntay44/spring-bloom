import { Navbar } from "@/components/marketing/Navbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { Footer } from "@/components/shared/Footer";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  return (
    <main className="page-shell bg-zinc-950">
      <Navbar />
      <section className="section">
        <div className="container">
          <Badge variant="secondary">Pricing</Badge>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-none">Plans that make AI work measurable.</h1>
          <p className="section-lede mt-5">
            Users see estimates before work starts, holds while the agent runs, and receipts after generation, review,
            security, analytics, and deploy tasks.
          </p>
        </div>
      </section>
      <PricingSection expanded />
      <Footer />
    </main>
  );
}
