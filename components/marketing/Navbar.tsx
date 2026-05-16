"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/context/MockAuthContext";
import { MOCK_USER } from "@/lib/mock/user";

export function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const { isAuthenticated, signOut } = useMockAuth();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-300 md:flex">
          <a href="/#features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/#workflow">Workflow</a>
        </nav>
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Button render={<Link href="/new" />} variant="outline">Go to app</Button>
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-purple-700 text-sm font-bold text-white">{MOCK_USER.initials}</span>
            <button className="text-sm font-bold text-slate-300 hover:text-white" onClick={signOut} type="button">Sign out</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button onClick={() => setAuthOpen(true)} type="button" variant="outline">Login</Button>
            <Button onClick={() => setAuthOpen(true)} type="button">Start Building <ArrowRight size={17} /></Button>
          </div>
        )}
      </div>
      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} defaultTab="login" /> : null}
    </header>
  );
}
