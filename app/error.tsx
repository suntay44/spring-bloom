"use client";
import { useEffect } from "react";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400">Error</p>
        <h1 className="mt-4 text-4xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-slate-400">An unexpected error occurred. Our team has been notified.</p>
        <button className="mt-8 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold hover:bg-purple-500" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </main>
  );
}
