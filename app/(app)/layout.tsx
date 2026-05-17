import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function AuthedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: balanceRow }, { data: projects }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, plan")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_credit_balance")
      .select("balance")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("projects")
      .select("id, name, type, status")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <AppShell
      balance={Number(balanceRow?.balance ?? 0)}
      profile={profile}
      projects={projects ?? []}
      user={user}
    >
      {children}
    </AppShell>
  );
}
