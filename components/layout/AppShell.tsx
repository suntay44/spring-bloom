"use client";

import Link from "next/link";
import type { Route } from "next";
import type { User } from "@supabase/supabase-js";
import { CreditCard, HelpCircle, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SIDEBAR_PROJECTS } from "@/lib/mock/projects";
import { createClient } from "@/lib/supabase/client";

interface AppShellProfile {
  full_name: string | null;
  plan: "free" | "starter" | "pro" | "teams";
}

interface AppShellProps {
  children: React.ReactNode;
  user: User;
  profile: AppShellProfile | null;
  balance: number;
}

const BOTTOM_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: HelpCircle, label: "Help" }
] satisfies Array<{ href: Route; icon: typeof Settings; label: string }>;

const baseLink = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors";
const inactiveLink = "hover:bg-zinc-800";
const activeLink = "bg-zinc-800 text-white";

const PLAN_CREDIT_LIMITS: Record<AppShellProfile["plan"], number> = {
  free: 5,
  starter: 100,
  pro: 175,
  teams: 500
};

export function AppShell({ children, user, profile, balance }: Readonly<AppShellProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const plan = profile?.plan ?? "free";
  const creditLimit = PLAN_CREDIT_LIMITS[plan];
  const displayName = profile?.full_name || user.email || "Setting up profile...";
  const creditProgress = Math.min((balance / creditLimit) * 100, 100);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <Link href="/new"><Logo /></Link>
        <Button className="mt-8 w-full" render={<Link href="/new" />}><Plus size={17} /> New Project</Button>
        <nav aria-label="Application navigation" className="mt-8">
          <Link className={`${baseLink} ${pathname === "/dashboard" ? activeLink : inactiveLink}`} href="/dashboard">
            <LayoutDashboard size={17} /> Dashboard
          </Link>
          <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-normal text-slate-500">Projects</p>
          <div className="space-y-2">
            {SIDEBAR_PROJECTS.map((project) => {
              const Icon = project.icon;
              const href = `/builder/${project.id}` as Route;
              return (
                <Link className={`${baseLink} ${pathname === href ? activeLink : inactiveLink}`} href={href} key={project.id}>
                  <Icon size={17} /> <span className="truncate">{project.name}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 space-y-2">
            {BOTTOM_NAV.map((item) => {
              const Icon = item.icon;
              return <Link className={`${baseLink} ${pathname.startsWith(item.href) ? activeLink : inactiveLink}`} href={item.href} key={item.href}><Icon size={17} /> {item.label}</Link>;
            })}
          </div>
        </nav>
        <div className="mt-8 rounded-lg border border-zinc-800 p-4">
          <p className="font-semibold">{displayName}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{balance.toLocaleString()} credits remaining</p>
          <Progress className="mt-2 h-1.5" value={creditProgress} />
          <Button className="mt-4 w-full" render={<Link href="/settings" />} variant="outline"><CreditCard size={17} /> Buy Credits</Button>
        </div>
        <button className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-zinc-800 hover:text-white" onClick={() => void handleSignOut()} type="button">
          <LogOut size={17} /> Sign out
        </button>
      </aside>
      <section className="app-main">
        <header className="topbar">
          <span className="font-semibold">Wild Cupcake</span>
          <div className="flex items-center gap-3"><Badge variant="secondary">{plan} plan</Badge><Badge variant="secondary">{balance.toLocaleString()} credits</Badge></div>
        </header>
        {children}
      </section>
    </main>
  );
}
