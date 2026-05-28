"use client"

/**
 * R6-2: Per-user usage dashboard (/settings/usage).
 *
 * Reads /api/user/usage and renders: balance, this-month spend, by-model
 * breakdown, cache hit rate (proof our cost optimization works), a 30-day
 * spend sparkline, and recent transactions. All read-only — zero infra cost.
 */

import { useEffect, useState } from "react"
import { Activity, Coins, Database, Loader2, TrendingUp, Zap } from "lucide-react"

interface UsageData {
  balance: number
  month: { spend: number; granted: number; purchased: number }
  by_model: Array<{ model_id: string; runs: number; credits: number; tokensIn: number; tokensOut: number }>
  cache: { hit_rate: number; read_tokens: number; creation_tokens: number }
  daily: Array<{ date: string; credits: number }>
  recent_transactions: Array<{ type: string; amount: number; model_id: string | null; created_at: string; metadata?: Record<string, unknown> }>
  run_count_30d: number
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/user/usage')
        if (res.ok) setData(await res.json() as UsageData)
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-zinc-500" size={20} /></div>
  }
  if (!data) {
    return <div className="mx-auto max-w-3xl p-6 text-zinc-400">Could not load usage.</div>
  }

  const maxDaily = Math.max(...data.daily.map(d => d.credits), 0.0001)

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6 text-zinc-200">
      <header>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" /> Usage &amp; Credits
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Your spend, balance, and the cache savings working behind the scenes.</p>
      </header>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Coins size={14} />} label="Balance" value={`${data.balance.toFixed(1)}`} sub="credits" accent="text-emerald-400" />
        <StatCard icon={<TrendingUp size={14} />} label="This month" value={`${data.month.spend.toFixed(1)}`} sub="credits spent" accent="text-amber-400" />
        <StatCard icon={<Zap size={14} />} label="Runs (30d)" value={`${data.run_count_30d}`} sub="generations" accent="text-violet-400" />
        <StatCard icon={<Database size={14} />} label="Cache hit" value={`${data.cache.hit_rate}%`} sub="input cached" accent="text-cyan-400" />
      </div>

      {/* Cache savings callout */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 mb-1">Prompt cache savings</p>
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          {data.cache.read_tokens.toLocaleString()} input tokens served from cache at ~10% price ·{' '}
          {data.cache.creation_tokens.toLocaleString()} written to cache.
          {data.cache.hit_rate >= 50
            ? ' Your sessions are warm — you\'re paying a fraction of list price.'
            : ' Hit rate climbs as you have longer conversations in a project.'}
        </p>
      </div>

      {/* 30-day sparkline */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Daily spend — last 30 days</p>
        <div className="flex items-end gap-0.5 h-24">
          {data.daily.map((d) => (
            <div key={d.date} className="flex-1 group relative">
              <div
                className="bg-violet-500/40 hover:bg-violet-400/70 rounded-sm transition-colors"
                style={{ height: `${Math.max((d.credits / maxDaily) * 96, d.credits > 0 ? 3 : 0)}px` }}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 z-10">
                {d.date.slice(5)}: {d.credits.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* By-model breakdown */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">By model — last 30 days</p>
        {data.by_model.length === 0 ? (
          <p className="text-[12px] text-zinc-600 italic">No generations yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.by_model.map((m) => (
              <div key={m.model_id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="font-mono text-zinc-300 truncate flex-1">{m.model_id}</span>
                <span className="text-zinc-500">{m.runs} runs</span>
                <span className="text-zinc-400 tabular-nums">{(m.tokensIn + m.tokensOut).toLocaleString()} tok</span>
                <span className="text-amber-400 font-semibold tabular-nums w-16 text-right">{m.credits.toFixed(1)} cr</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Recent transactions</p>
        <div className="space-y-1">
          {data.recent_transactions.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[11.5px] py-1 border-b border-zinc-800/40 last:border-0">
              <span className="flex items-center gap-2">
                <TxBadge type={t.type} />
                <span className="text-zinc-500">{t.model_id ?? (t.metadata?.reason as string ?? '—')}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className={`tabular-nums font-semibold ${t.amount >= 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
                </span>
                <span className="text-zinc-600 text-[10px] w-20 text-right">{new Date(t.created_at).toLocaleDateString()}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] text-zinc-600">{sub}</p>
    </div>
  )
}

function TxBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    deduct:        { label: 'spend',    cls: 'bg-zinc-800 text-zinc-400' },
    bonus:         { label: 'bonus',    cls: 'bg-emerald-500/15 text-emerald-300' },
    purchase:      { label: 'purchase', cls: 'bg-violet-500/15 text-violet-300' },
    refund:        { label: 'refund',   cls: 'bg-sky-500/15 text-sky-300' },
    monthly_reset: { label: 'reset',    cls: 'bg-amber-500/15 text-amber-300' },
    plan_reset:    { label: 'reset',    cls: 'bg-amber-500/15 text-amber-300' },
    hold:          { label: 'hold',     cls: 'bg-zinc-800 text-zinc-500' },
    expire:        { label: 'expire',   cls: 'bg-red-500/15 text-red-300' },
  }
  const s = map[type] ?? { label: type, cls: 'bg-zinc-800 text-zinc-400' }
  return <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>
}
