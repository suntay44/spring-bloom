"use client";

import { useState } from "react";

const SECURITY_CHECKS = ["Secret scanning", "Dependency risk", "Supabase RLS checks"] as const;

export function SecuritySection() {
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-semibold">Deploy protection enabled</h2>
      <div className="mt-5 grid-3">
        {SECURITY_CHECKS.map((item) => <label className="font-bold" key={item}><input defaultChecked type="checkbox" /> {item}</label>)}
      </div>
      <button className={`button mt-5 ${saved ? "bg-green-700 border-green-600" : "blue"}`} onClick={() => void handleSave()} type="button">{saved ? "Saved ✓" : "Save changes"}</button>
    </div>
  );
}
