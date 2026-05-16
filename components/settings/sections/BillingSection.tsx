import { MOCK_CREDIT_USAGE } from "@/lib/mock/analytics";
import { MOCK_USER, creditPercent } from "@/lib/mock/user";

const CREDIT_PACKS = ["400 credits — $10", "1,000 credits — $22", "3,000 credits — $60"] as const;

export function BillingSection() {
  return (
    <div className="grid gap-5">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">Current balance</p>
            <h2 className="mt-2 text-4xl font-semibold">{MOCK_USER.credits.toLocaleString()} / {MOCK_USER.maxCredits.toLocaleString()} credits</h2>
          </div>
          <button className="button blue" type="button">Buy Credits</button>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-purple-600" style={{ width: creditPercent() }} />
        </div>
      </div>
      <div className="grid-3">
        {MOCK_CREDIT_USAGE.map((item) => <div className="card p-5" key={item.label}><p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold">{item.value}</p><p className="mt-1 text-sm font-bold text-slate-500">{item.detail}</p></div>)}
      </div>
      <div className="grid-3">
        {CREDIT_PACKS.map((pack) => <button className="card p-5 text-left text-xl font-semibold" key={pack} type="button">{pack}</button>)}
      </div>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">Subscription</p>
            <p className="mt-1 font-semibold">Pro Plan — $29 / month</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Renews June 14, 2026</p>
          </div>
          <button className="button secondary" type="button">Manage billing</button>
        </div>
      </div>
    </div>
  );
}
