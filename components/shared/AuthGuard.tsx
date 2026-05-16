"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/auth/AuthModal";
import { useMockAuth } from "@/context/MockAuthContext";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useMockAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="fixed inset-0 bg-zinc-950" aria-hidden="true" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-zinc-950">
        <AuthModal onClose={() => router.push("/")} defaultTab="login" />
      </div>
    );
  }

  return <>{children}</>;
}
