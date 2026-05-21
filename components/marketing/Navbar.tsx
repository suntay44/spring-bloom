"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-300 md:flex">
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/security">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button onClick={() => setAuthOpen(true)} type="button" variant="outline">Login</Button>
          <Button onClick={() => setAuthOpen(true)} type="button">Start Building <ArrowRight size={17} /></Button>
        </div>
      </div>
      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} defaultTab="login" /> : null}
    </header>
  );
}
