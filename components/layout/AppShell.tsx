"use client";

import Link from "next/link";
import type { Route } from "next";
import { CreditCard, HelpCircle, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { useMockAuth } from "@/context/MockAuthContext";
import { SIDEBAR_PROJECTS } from "@/lib/mock/projects";
import { MOCK_USER } from "@/lib/mock/user";

const BOTTOM_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: HelpCircle, label: "Help" }
] satisfies Array<{ href: Route; icon: typeof Settings; label: string }>;

const baseLink = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors";
const inactiveLink = "hover:bg-zinc-800";
const activeLink = "bg-zinc-800 text-white";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { signOut } = useMockAuth();

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <Link href="/new"><Logo /></Link>
        <Link className="button blue mt-8 w-full" href="/new"><Plus size={17} /> New Project</Link>
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
          <p className="font-semibold">{MOCK_USER.name}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{MOCK_USER.credits.toLocaleString()} credits remaining</p>
          <Link className="button secondary mt-4 w-full" href="/settings"><CreditCard size={17} /> Buy Credits</Link>
        </div>
        <button className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-zinc-800 hover:text-white" onClick={signOut} type="button">
          <LogOut size={17} /> Sign out
        </button>
      </aside>
      <section className="app-main">
        <header className="topbar">
          <span className="font-semibold">Wild Cupcake</span>
          <div className="flex items-center gap-3"><span className="pill">{MOCK_USER.plan} plan</span><span className="pill">{MOCK_USER.credits.toLocaleString()} credits</span></div>
        </header>
        {children}
      </section>
    </main>
  );
}
