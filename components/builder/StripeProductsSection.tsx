"use client"

/**
 * R4-4: Stripe Products + Prices CRUD panel.
 *
 * Manages products in the user's connected Stripe account. Each product gets
 * a default price (one-time or recurring). Real Stripe API calls — no local
 * mirror (we use Stripe IDs as the source of truth, which is the standard).
 */

import { useCallback, useEffect, useState } from "react"
import { Archive, ChevronDown, ChevronRight, ExternalLink, Loader2, Package, Plus } from "lucide-react"
import { toast } from "@/lib/toast"

interface Product {
  id:          string
  name:        string
  description: string | null
  active:      boolean
  created:     number
  default_price: null | {
    id:          string
    unit_amount: number | null
    currency:    string
    recurring:   { interval: string } | null
  }
}

export function StripeProductsSection({ projectId }: { projectId: string }) {
  const [open, setOpen]         = useState(false)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loading, setLoading]   = useState(false)
  const [creating, setCreating] = useState(false)
  const [working, setWorking]   = useState<string | null>(null)

  // Create form
  const [name, setName]           = useState("")
  const [description, setDesc]    = useState("")
  const [amount, setAmount]       = useState("9.00")
  const [currency, setCurrency]   = useState("usd")
  const [interval, setInterval]   = useState<'' | 'month' | 'year'>('month')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/stripe/products`)
      const data = await res.json() as { products?: Product[]; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Load failed'); return }
      setProducts(data.products ?? [])
    } catch { toast.error('Network error') } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { if (open && products === null) void load() }, [open, products, load])

  async function create() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!name.trim() || !Number.isFinite(cents) || cents < 50) {
      toast.error('Name and amount (≥ $0.50) required'); return
    }
    setWorking('create')
    try {
      const res = await fetch(`/api/projects/${projectId}/stripe/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), description: description.trim() || undefined,
          unit_amount: cents, currency,
          interval: interval || undefined,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Create failed'); return }
      toast.success(`Created ${name}`)
      setName(''); setDesc(''); setAmount('9.00'); setCreating(false)
      await load()
    } catch { toast.error('Network error') } finally { setWorking(null) }
  }

  async function archive(p: Product) {
    if (!confirm(`Archive "${p.name}"? Existing subscriptions keep working but new ones can't use it.`)) return
    setWorking(p.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/stripe/products/${p.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Archive failed'); return }
      toast.success('Archived')
      await load()
    } catch { toast.error('Network error') } finally { setWorking(null) }
  }

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={11} className="text-zinc-500 shrink-0" /> : <ChevronRight size={11} className="text-zinc-500 shrink-0" />}
          <Package size={12} className="text-violet-300 shrink-0" />
          <span className="text-[12px] font-semibold text-zinc-100">Products &amp; Prices</span>
        </div>
        <span className="text-[10px] text-violet-300/70 shrink-0">
          {products ? `${products.length} active` : 'click to load'}
        </span>
      </button>

      {open && (
        <div className="border-t border-violet-500/15 px-3 py-2.5 space-y-2 bg-black/20">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Manage products in your connected Stripe account. Changes hit Stripe directly — no local mirror.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 size={12} className="animate-spin text-zinc-600" />
            </div>
          ) : (
            <>
              {products && products.length === 0 && !creating && (
                <p className="text-[11px] text-zinc-500 italic text-center py-2">No products yet.</p>
              )}
              {products?.map((p) => (
                <div key={p.id} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2.5 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-zinc-100 truncate">{p.name}</p>
                    {p.description && <p className="text-[10.5px] text-zinc-500 truncate">{p.description}</p>}
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {p.default_price?.unit_amount
                        ? `${(p.default_price.unit_amount / 100).toFixed(2)} ${p.default_price.currency.toUpperCase()}`
                        : 'no price'}
                      {p.default_price?.recurring ? ` / ${p.default_price.recurring.interval}` : ''}
                      <span className="text-zinc-600"> · <code className="font-mono">{p.id}</code></span>
                    </p>
                  </div>
                  <a
                    href={`https://dashboard.stripe.com/products/${p.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-zinc-200 p-1" title="Open in Stripe"
                  >
                    <ExternalLink size={10} />
                  </a>
                  <button
                    type="button"
                    onClick={() => void archive(p)}
                    disabled={working === p.id}
                    className="text-zinc-500 hover:text-amber-300 p-1 disabled:opacity-50"
                    title="Archive"
                  >
                    {working === p.id ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
                  </button>
                </div>
              ))}

              {/* Create form */}
              {creating ? (
                <div className="rounded-md border border-violet-500/30 bg-violet-950/20 p-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name"
                      className="px-2 py-1 text-[12px] bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40" />
                    <select value={interval} onChange={(e) => setInterval(e.target.value as '' | 'month' | 'year')}
                      className="px-2 py-1 text-[12px] bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40">
                      <option value="">One-time</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>
                  <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)"
                    className="w-full px-2 py-1 text-[12px] bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40" />
                  <div className="grid grid-cols-[1fr_80px] gap-2">
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Price"
                      className="px-2 py-1 text-[12px] font-mono bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40" />
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      className="px-2 py-1 text-[12px] bg-black/40 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-violet-500/40">
                      <option>usd</option><option>eur</option><option>gbp</option><option>jpy</option><option>cad</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setCreating(false)} className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded">Cancel</button>
                    <button type="button" onClick={() => void create()} disabled={working === 'create'}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md disabled:opacity-50">
                      {working === 'create' ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Create
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setCreating(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 hover:border-violet-500/40 hover:bg-violet-500/5 py-1.5 text-[11px] text-zinc-400 hover:text-violet-200 transition-colors">
                  <Plus size={11} /> Add product
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
