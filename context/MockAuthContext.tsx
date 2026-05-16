"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_AUTH_STATE, type MockAuthState } from "@/lib/mock/auth";
import { MOCK_USER } from "@/lib/mock/user";

interface MockAuthContextValue {
  auth: MockAuthState;
  signIn: () => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<MockAuthState>(INITIAL_AUTH_STATE);
  const router = useRouter();

  const signIn = useCallback(() => {
    setAuth({ status: "authenticated", user: MOCK_USER });
    router.push("/new");
  }, [router]);

  const signOut = useCallback(() => {
    setAuth(INITIAL_AUTH_STATE);
    router.push("/");
  }, [router]);

  return (
    <MockAuthContext.Provider value={{ auth, signIn, signOut, isAuthenticated: auth.status === "authenticated" }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error("useMockAuth must be used within MockAuthProvider");
  return ctx;
}
