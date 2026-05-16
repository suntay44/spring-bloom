import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Badge } from "@/components/ui/badge";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-shell">
      <section className="auth-form">
        <Link className="mb-10" href="/">
          <Logo />
        </Link>
        {children}
      </section>
      <aside className="auth-panel">
        <div className="w-full max-w-xl rounded-lg border border-purple-900/60 bg-zinc-950/75 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="secondary">Approved PRD</Badge>
            <Badge variant="secondary">85 credits</Badge>
          </div>
          <div className="rounded-lg bg-black p-5 text-white">
            <p className="text-sm font-semibold text-purple-200">Builder preview</p>
            <h2 className="mt-3 text-3xl font-semibold">Task Manager Pro</h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {["Review", "Security", "Analytics"].map((item) => (
                <div className="rounded-md bg-white/10 p-3 text-sm font-bold" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
