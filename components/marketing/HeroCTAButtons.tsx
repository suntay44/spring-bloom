"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroCTAButtons() {
  const router = useRouter();

  function handleStartBuilding() {
    router.push("/");
  }

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        <Button onClick={handleStartBuilding} type="button">
          Start Building <ArrowRight size={17} />
        </Button>
        <Button nativeButton={false} render={<Link href="#workflow" />} variant="outline">
          <Play size={17} /> Watch flow
        </Button>
      </div>
    </>
  );
}
