"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Search } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

export function UserSearchInput() {
  const router      = useRouter()
  const pathname    = usePathname()
  const params      = useSearchParams()

  const updateSearch = useDebouncedCallback((value: string) => {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set("q", value)
    else sp.delete("q")
    sp.delete("page")
    router.push(`${pathname}?${sp.toString()}` as `/${string}`)
  }, 300)

  const updatePlan = useCallback((plan: string) => {
    const sp = new URLSearchParams(params.toString())
    if (plan) sp.set("plan", plan)
    else sp.delete("plan")
    sp.delete("page")
    router.push(`${pathname}?${sp.toString()}` as `/${string}`)
  }, [router, pathname, params])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by email…"
          defaultValue={params.get("q") ?? ""}
          onChange={e => updateSearch(e.target.value)}
          className="h-9 w-72 rounded-md border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
        />
      </div>
      <select
        defaultValue={params.get("plan") ?? ""}
        onChange={e => updatePlan(e.target.value)}
        className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus:border-purple-500 focus:outline-none"
      >
        <option value="">All plans</option>
        <option value="free">Free</option>
        <option value="starter">Starter</option>
        <option value="pro">Pro</option>
        <option value="teams">Teams</option>
      </select>
    </div>
  )
}
