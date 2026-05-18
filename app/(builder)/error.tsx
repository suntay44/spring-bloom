"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-slate-500">{error.message ?? "An unexpected error occurred."}</p>
        <Button onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </main>
  );
}
