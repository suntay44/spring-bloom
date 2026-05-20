"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users, BarChart2, DollarSign, Bug, BookOpen,
  Settings2, ArrowLeft, Sprout, ShieldAlert, GitBranch,
  Lightbulb, Cpu, TrendingUp, Workflow,
} from "lucide-react"

type NavItem =
  | { type: "link";    href: string; icon: React.ElementType; label: string }
  | { type: "soon";    icon: React.ElementType; label: string }

type NavSection = {
  title: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    title: "People",
    items: [
      { type: "link", href: "/backend-admin/users",   icon: Users,       label: "Users"          },
      { type: "soon",                                  icon: ShieldAlert, label: "Abuse Monitor"  },
    ],
  },
  {
    title: "Analytics",
    items: [
      { type: "link", href: "/backend-admin/analytics", icon: BarChart2,  label: "Generation"     },
      { type: "link", href: "/backend-admin/costs",     icon: DollarSign, label: "Cost & Margin"  },
      { type: "soon",                                    icon: Workflow,   label: "Onboarding"     },
      { type: "soon",                                    icon: TrendingUp, label: "Revenue"        },
    ],
  },
  {
    title: "Debug",
    items: [
      { type: "link", href: "/backend-admin/debug", icon: Bug, label: "Failed Runs" },
    ],
  },
  {
    title: "Library",
    items: [
      { type: "link", href: "/backend-admin/library", icon: BookOpen,  label: "Clusters & Modules" },
      { type: "soon",                                  icon: GitBranch, label: "Effectiveness"      },
    ],
  },
  {
    title: "Insights",
    items: [
      { type: "soon", icon: Lightbulb, label: "Prompt Patterns" },
      { type: "soon", icon: Cpu,       label: "Machines"        },
    ],
  },
  {
    title: "System",
    items: [
      { type: "link", href: "/backend-admin/settings", icon: Settings2, label: "Settings" },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-600 text-white">
          <Sprout size={13} />
        </span>
        <div>
          <p className="text-xs font-bold text-white">SpringBloom</p>
          <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item, i) =>
                item.type === "link" ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white",
                    ].join(" ")}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                ) : (
                  <div
                    key={`${section.title}-soon-${i}`}
                    className="flex items-center justify-between rounded-md px-2.5 py-1.5"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-zinc-600">
                      <item.icon size={14} />
                      {item.label}
                    </span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Soon
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Back to app */}
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
