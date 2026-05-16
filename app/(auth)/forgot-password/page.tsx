"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
      <p className="mt-2 text-sm font-bold text-slate-500">Enter your account email and we&apos;ll send a reset link.</p>
      {sent ? (
        <div className="mt-6 rounded-lg border border-green-800 bg-green-950/40 p-4 text-sm font-semibold text-green-400">Check your email - a reset link is on the way.</div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="you@example.com" type="email" />
          <Button className="w-full" disabled={loading} type="submit">{loading ? "Sending..." : "Send reset link"}</Button>
        </form>
      )}
      <p className="mt-5 text-sm font-bold text-slate-500"><Link className="text-purple-400 hover:underline" href="/login">Back to sign in</Link></p>
    </div>
  );
}
