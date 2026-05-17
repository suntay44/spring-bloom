import { MOCK_CREDIT_USAGE } from "@/lib/mock/analytics";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/lib/toast";
// TODO Phase 14: replace MOCK_USER with real credit balance + plan from Supabase
import { MOCK_USER } from "@/lib/mock/user";

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
          <Button onClick={() => toast("Opening credit checkout...")} type="button">Buy Credits</Button>
        </div>
        <Progress className="mt-5 h-3" value={(MOCK_USER.credits / MOCK_USER.maxCredits) * 100} />
      </div>
      <div className="grid-3">
        {MOCK_CREDIT_USAGE.map((item) => <div className="card p-5" key={item.label}><p className="text-sm font-semibold uppercase tracking-normal text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold">{item.value}</p><p className="mt-1 text-sm font-bold text-slate-500">{item.detail}</p></div>)}
      </div>
      <div className="grid-3">
        {CREDIT_PACKS.map((pack) => <button className="card p-5 text-left text-xl font-semibold" key={pack} onClick={() => toast(`Added ${pack} to cart`)} type="button">{pack}</button>)}
      </div>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">Subscription</p>
            <p className="mt-1 font-semibold">Pro Plan — $29 / month</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Renews June 14, 2026</p>
          </div>
          <Button onClick={() => toast("Opening billing portal...")} type="button" variant="outline">Manage billing</Button>
        </div>
      </div>
    </div>
  );
}
