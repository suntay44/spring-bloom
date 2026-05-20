import { Navbar } from "@/components/marketing/Navbar"
import { Footer } from "@/components/shared/Footer"

interface LegalPageProps {
  title: string
  subtitle: string
  effectiveDate: string
  children: React.ReactNode
}

export function LegalPage({ title, subtitle, effectiveDate, children }: LegalPageProps) {
  return (
    <main className="page-shell bg-zinc-950">
      <Navbar />
      <section className="section">
        <div className="container max-w-4xl">
          <p className="text-sm font-semibold text-purple-400">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">{title}</h1>
          <p className="mt-3 text-slate-400">{subtitle}</p>
          <p className="mt-2 text-sm text-slate-500">Effective date: {effectiveDate}</p>
          <hr className="mt-8 border-zinc-800" />
          <div className="legal-content mt-10 text-slate-300">
            {children}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
