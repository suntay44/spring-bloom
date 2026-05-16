"use client";

import { useState } from "react";
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
        <button className={`button mt-5 ${saved ? "bg-green-700 border-green-600" : "blue"}`} onClick={() => void handleSave()} type="button">{saved ? "Saved ✓" : "Save changes"}</button>
      </div>
      <div className="card mt-5 p-6">
        <h2 className="text-2xl font-semibold">Plan</h2>
        <p className="mt-2 font-bold text-slate-300">{MOCK_USER.plan.toUpperCase()} — {MOCK_USER.maxCredits.toLocaleString()} credits / month</p>
        <div className="mt-4 flex flex-wrap gap-3"><button className="button secondary" type="button">Change password</button><button className="button blue" type="button">Upgrade to Agency</button></div>
      </div>
    </div>
  );
}
