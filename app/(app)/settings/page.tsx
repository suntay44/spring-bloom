import { notFound } from "next/navigation";
import { SettingsMock } from "@/components/settings/SettingsMock";
import { createClient } from "@/lib/supabase/server";

const PLAN_MAX_CREDITS: Record<string, number> = {
  free: 100,
  pro: 1500,
  agency: 5000,
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: profile }, { data: balanceRow }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("full_name, plan").eq("id", user.id).single(),
    supabase.from("user_credit_balance").select("balance").eq("user_id", user.id).single(),
    supabase
      .from("credit_transactions")
      .select("id, type, amount, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const plan = profile?.plan ?? "free";
  const name = profile?.full_name ?? "";
  const credits = Math.max(0, Number(balanceRow?.balance ?? 0));
  const maxCredits = PLAN_MAX_CREDITS[plan] ?? 100;

  const txList = transactions ?? [];
  const spent = txList
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const bonusEarned = txList
    .filter((t) => t.type === "bonus")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <SettingsMock
      bonusEarned={bonusEarned}
      credits={credits}
      email={user.email ?? ""}
      maxCredits={maxCredits}
      name={name}
      plan={plan}
      spent={spent}
      transactions={txList}
    />
  );
}
