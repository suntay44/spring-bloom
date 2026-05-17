"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
// TODO Phase 11: replace MOCK_USER with real user/profile props passed from server component
import { MOCK_USER } from "@/lib/mock/user";

export function AccountSection() {
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="card p-6">
        <h2 className="text-2xl font-semibold">Profile</h2>
        <p className="mt-2 font-bold text-slate-300">{MOCK_USER.name} · {MOCK_USER.email}</p>
        <Button className={saved ? "mt-5 border-green-600 bg-green-700" : "mt-5"} onClick={() => void handleSave()} type="button">{saved ? "Saved ✓" : "Save changes"}</Button>
      </div>
      <div className="card mt-5 p-6">
        <h2 className="text-2xl font-semibold">Plan</h2>
        <p className="mt-2 font-bold text-slate-300">{MOCK_USER.plan.toUpperCase()} — {MOCK_USER.maxCredits.toLocaleString()} credits / month</p>
        <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => toast("Password reset link sent to your email")} type="button" variant="outline">Change password</Button><Button onClick={() => toast("Redirecting to upgrade flow...")} type="button">Upgrade to Agency</Button></div>
      </div>
    </div>
  );
}
