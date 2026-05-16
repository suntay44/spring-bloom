import { AuthGuard } from "@/components/shared/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function AuthedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
