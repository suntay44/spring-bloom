"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useMockAuth } from "@/context/MockAuthContext";

export function HeroCTAButtons() {
  const { isAuthenticated } = useMockAuth();
  const [authOpen, setAuthOpen] = useState(false);

  function handleStartBuilding() {
    if (isAuthenticated) {
      window.location.href = "/new";
      return;
    }

    setAuthOpen(true);
  }

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        <button className="button" onClick={handleStartBuilding} type="button">
          Start Building <ArrowRight size={17} />
        </button>
        <Link className="button secondary" href="#workflow">
          <Play size={17} /> Watch flow
        </Link>
      </div>
      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} defaultTab="signup" /> : null}
    </>
  );
}
