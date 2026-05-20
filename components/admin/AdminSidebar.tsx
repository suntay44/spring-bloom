"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, BookOpen, Settings2, ArrowLeft, Sprout } from "lucide-react"

const NAV = [
  { href: "/backend-admin/users",    icon: Users,          label: "Users"    },
  { href: "/backend-admin/library",  icon: BookOpen,       label: "Library"  },
  { href: "/backend-admin/settings", icon: Settings2,      label: "Settings" },
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
        <span className="logo-mark"><Sprout size={14} /></span>
        <div>
          <p className="text-xs font-bold text-white">SpringBloom</p>
          <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              isActive(href)
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white",
            ].join(" ")}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Back to app */}
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
