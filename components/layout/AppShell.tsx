"use client";

import Link from "next/link";
import type { Route } from "next";
import type { User } from "@supabase/supabase-js";
import { CreditCard, Globe2, HelpCircle, LayoutDashboard, LogOut, Plus, Settings, Smartphone } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { planLimit } from "@/lib/credits/limits";

interface AppShellProfile {
  full_name: string | null;
  plan: "free" | "starter" | "pro" | "teams";
}

interface AppShellProps {
  children: React.ReactNode;
  user: User;
  profile: AppShellProfile | null;
  balance: number;
  projects?: AppShellProject[];
}

interface AppShellProject {
  id: string;
  name: string;
  type: "fullstack" | "mobile" | "landing";
  status: "draft" | "building" | "live" | "error" | string | null;
}

const BOTTOM_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: HelpCircle, label: "Help" }
] satisfies Array<{ href: Route; icon: typeof Settings; label: string }>;

const baseLink = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors";
const inactiveLink = "hover:bg-zinc-800";
const activeLink = "bg-zinc-800 text-white";


function projectIcon(type: AppShellProject["type"]) {
  if (type === "mobile") return Smartphone;
  if (type === "landing") return Globe2;
  return LayoutDashboard;
}

export function AppShell({ children, user, profile, balance, projects = [] }: Readonly<AppShellProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const plan = profile?.plan ?? "free";
  const creditLimit = planLimit(plan);
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
        <Link href="/"><Logo /></Link>
        <Button className="mt-8 w-full" nativeButton={false} render={<Link href="/" />}><Plus size={17} /> New Project</Button>
        <nav aria-label="Application navigation" className="mt-8">
          <Link className={`${baseLink} ${pathname === "/dashboard" ? activeLink : inactiveLink}`} href="/dashboard">
            <LayoutDashboard size={17} /> Dashboard
          </Link>
          <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-normal text-slate-500">Projects</p>
          <div className="space-y-2">
            {projects.length > 0 ? projects.map((project) => {
              const Icon = projectIcon(project.type);
              const href = `/project/${project.id}` as Route;
              return (
                <Link className={`${baseLink} ${pathname === href ? activeLink : inactiveLink}`} href={href} key={project.id}>
                  <Icon size={17} />
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  {project.status === "building" ? <span className="h-1.5 w-1.5 rounded-full bg-purple-400" aria-label="Building" /> : null}
                </Link>
              );
            }) : <p className="px-3 py-2 text-xs font-semibold text-slate-600">No projects yet</p>}
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
          {balance < 10 ? (
            <div className="mt-2 rounded-md bg-amber-950/50 px-3 py-2 text-xs font-semibold text-amber-400">
              ⚠ Running low — {balance.toLocaleString()} credits left
            </div>
          ) : null}
          <Progress className="mt-2 h-1.5" value={creditProgress} />
          <Button className="mt-4 w-full" nativeButton={false} render={<Link href="/settings" />} variant="outline"><CreditCard size={17} /> Buy Credits</Button>
        </div>
        <button className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-zinc-800 hover:text-white" onClick={() => void handleSignOut()} type="button">
          <LogOut size={17} /> Sign out
        </button>
      </aside>
      <section className="app-main">
        <header className="topbar">
          <span className="font-semibold">SpringBloom</span>
          <div className="flex items-center gap-3"><Badge variant="secondary">{plan} plan</Badge><Badge variant="secondary">{balance.toLocaleString()} credits</Badge></div>
        </header>
        {children}
      </section>
    </main>
  );
}
