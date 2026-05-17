"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: "Free",   color: "bg-zinc-700 text-zinc-300" },
  pro:    { label: "Pro",    color: "bg-violet-700 text-violet-100" },
  agency: { label: "Agency", color: "bg-amber-700 text-amber-100" },
};

type AccountSectionProps = {
  name: string;
  email: string;
  plan: string;
  maxCredits: number;
};

export function AccountSection({ name, email, plan, maxCredits }: AccountSectionProps) {
  const [displayName, setDisplayName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = displayName.trim()
    ? displayName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (email[0] ?? "U").toUpperCase();

  const planInfo = PLAN_LABELS[plan] ?? { label: plan.toUpperCase(), color: "bg-zinc-700 text-zinc-300" };

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not signed in"); return; }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: displayName.trim() || null })
        .eq("id", user.id);

      if (error) { toast.error(error.message); return; }

      setSaved(true);
      toast("Profile saved");
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) { toast.error(error.message); return; }
    toast("Password reset link sent — check your email");
  }

  return (
    <div className="grid gap-5">

      {/* Profile card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xl font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{displayName || <span className="text-slate-500">No name set</span>}</p>
            <p className="truncate text-sm text-slate-400">{email}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${planInfo.color}`}>
              {planInfo.label}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500" htmlFor="display-name">
              Display name
            </label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              id="display-name"
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              type="text"
              value={displayName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500" htmlFor="email">
              Email address
            </label>
            <input
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-slate-500 outline-none"
              disabled
              id="email"
              readOnly
              type="email"
              value={email}
            />
            <p className="mt-1 text-xs text-slate-600">Email cannot be changed from here.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className={saved ? "border-emerald-600 bg-emerald-800 text-emerald-100" : ""}
            disabled={saving}
            onClick={() => void handleSave()}
            type="button"
          >
            <User size={15} />
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
          </Button>
          <Button onClick={() => void handlePasswordReset()} type="button" variant="outline">
            Change password
          </Button>
        </div>
      </div>

      {/* Plan card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Current plan</h3>
            <p className="mt-1 text-sm text-slate-400">
              <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${planInfo.color}`}>{planInfo.label}</span>
              {maxCredits.toLocaleString()} credits / month
            </p>
          </div>
          {plan === "free" ? (
            <Button onClick={() => toast("Redirecting to upgrade flow...")} type="button">
              Upgrade to Pro
            </Button>
          ) : (
            <Button onClick={() => toast("Opening billing portal...")} type="button" variant="outline">
              Manage plan
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
