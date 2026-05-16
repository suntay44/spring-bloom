"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/context/MockAuthContext";

export function HeroCTAButtons() {
  const { isAuthenticated } = useMockAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();

  function handleStartBuilding() {
    if (isAuthenticated) {
      router.push("/new");
      return;
    }

    setAuthOpen(true);
  }

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        <Button onClick={handleStartBuilding} type="button">
          Start Building <ArrowRight size={17} />
        </Button>
        <Button render={<Link href="#workflow" />} variant="outline">
          <Play size={17} /> Watch flow
        </Button>
      </div>
      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} defaultTab="signup" /> : null}
    </>
  );
}
