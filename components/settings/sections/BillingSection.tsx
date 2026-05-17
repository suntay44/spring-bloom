"use client";

import { ArrowUpRight, CreditCard, Gift, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/lib/toast";
import type { CreditTransaction } from "@/components/settings/SettingsMock";

type BillingSectionProps = {
  credits: number;
  maxCredits: number;
  spent: number;
  bonusEarned: number;
  plan: string;
  transactions: CreditTransaction[];
};

const CREDIT_PACKS: Array<{ label: string; credits: number; price: string; perCredit: string; popular?: boolean }> = [
  { label: "Starter", credits: 400, price: "$10", perCredit: "$0.025" },
  { label: "Growth", credits: 1_000, price: "$22", perCredit: "$0.022", popular: true },
  { label: "Scale", credits: 3_000, price: "$60", perCredit: "$0.020" },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function txLabel(tx: CreditTransaction): string {
  if (tx.type === "bonus") {
    const reason = (tx.metadata as { reason?: string } | null)?.reason;
    if (reason === "signup_bonus") return "Signup bonus";
    return "Bonus credits";
  }
  if (tx.type === "debit") return "AI generation";
  if (tx.type === "hold") return "Credit hold";
  if (tx.type === "refund") return "Refund";
  if (tx.type === "purchase") return "Credit purchase";
  return tx.type;
}

function txSign(tx: CreditTransaction) {
  if (tx.type === "debit" || tx.type === "hold") return "-";
  return "+";
}

function txColor(tx: CreditTransaction) {
  if (tx.type === "bonus" || tx.type === "refund" || tx.type === "purchase") return "text-emerald-400";
  if (tx.type === "debit") return "text-red-400";
  return "text-slate-400";
}

export function BillingSection({ credits, maxCredits, spent, bonusEarned, plan, transactions }: BillingSectionProps) {
  const usedPercent = maxCredits > 0 ? Math.min(100, (spent / maxCredits) * 100) : 0;
  const balancePercent = maxCredits > 0 ? Math.min(100, (credits / maxCredits) * 100) : 0;
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const isLowBalance = credits < maxCredits * 0.1;

  return (
    <div className="grid gap-6">

      {/* Balance hero card */}
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Available balance</p>
            <div className="mt-2 flex items-end gap-3">
              <span className={`text-5xl font-bold tabular-nums ${isLowBalance ? "text-amber-400" : "text-white"}`}>
                {credits.toLocaleString()}
              </span>
              <span className="mb-1 text-lg font-semibold text-slate-500">/ {maxCredits.toLocaleString()} credits</span>
            </div>
            {isLowBalance && credits > 0 && (
              <p className="mt-2 text-sm font-semibold text-amber-400">⚠ Running low — top up to keep building</p>
            )}
            {credits === 0 && (
              <p className="mt-2 text-sm font-semibold text-red-400">✕ Out of credits — purchase more to continue</p>
            )}
          </div>
          <Button className="shrink-0" onClick={() => toast("Opening credit checkout...")} type="button">
            <CreditCard size={16} /> Buy Credits
          </Button>
        </div>
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>{planLabel} plan · {maxCredits.toLocaleString()} credits / month</span>
            <span>{Math.round(balancePercent)}% remaining</span>
          </div>
          <Progress className="h-2.5" value={balancePercent} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <Zap size={13} /> Credits used
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{spent.toLocaleString()}</p>
          <p className="mt-1 text-sm text-slate-500">
            {maxCredits > 0 ? `${Math.round(usedPercent)}% of monthly plan` : "this month"}
          </p>
          {maxCredits > 0 && <Progress className="mt-3 h-1.5" value={usedPercent} />}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <Gift size={13} /> Bonus earned
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-emerald-400">{bonusEarned.toLocaleString()}</p>
          <p className="mt-1 text-sm text-slate-500">from referrals &amp; promotions</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <TrendingUp size={13} /> Total transactions
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{transactions.length}</p>
          <p className="mt-1 text-sm text-slate-500">in your account history</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h3 className="font-semibold">Recent transactions</h3>
          <span className="text-xs text-slate-500">{transactions.length} total</span>
        </div>
        {transactions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-600">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {transactions.map((tx) => (
              <li className="flex items-center justify-between px-5 py-3.5" key={tx.id}>
                <div>
                  <p className="text-sm font-semibold">{txLabel(tx)}</p>
                  <p className="text-xs text-slate-500">{formatDate(tx.created_at)}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${txColor(tx)}`}>
                  {txSign(tx)}{Math.abs(tx.amount)} credits
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Credit packs */}
      <div>
        <h3 className="mb-3 font-semibold text-slate-300">Top up with a one-time pack</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              className={`relative rounded-xl border p-5 text-left transition-colors hover:border-slate-600 ${
                pack.popular
                  ? "border-violet-600 bg-violet-950/30 hover:border-violet-500"
                  : "border-zinc-800 bg-zinc-900"
              }`}
              key={pack.label}
              onClick={() => toast(`Added ${pack.credits.toLocaleString()} credits pack to cart`)}
              type="button"
            >
              {pack.popular ? (
                <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Popular
                </span>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{pack.label}</p>
              <p className="mt-2 text-2xl font-bold">{pack.credits.toLocaleString()} <span className="text-base font-semibold text-slate-400">credits</span></p>
              <p className="mt-1 text-xl font-semibold">{pack.price}</p>
              <p className="mt-1 text-xs text-slate-500">{pack.perCredit} / credit</p>
            </button>
          ))}
        </div>
      </div>

      {/* Subscription */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20">
              <Sparkles className="text-violet-400" size={18} />
            </div>
            <div>
              <p className="font-semibold">{planLabel} Plan</p>
              <p className="text-sm text-slate-500">{maxCredits.toLocaleString()} credits / month</p>
            </div>
          </div>
          <div className="flex gap-3">
            {plan === "free" ? (
              <Button onClick={() => toast("Redirecting to upgrade flow...")} type="button">
                <ArrowUpRight size={16} /> Upgrade to Pro
              </Button>
            ) : (
              <Button onClick={() => toast("Opening billing portal...")} type="button" variant="outline">
                Manage subscription
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
