"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { useMockAuth } from "@/context/MockAuthContext";

export default function LoginPage() {
  const { signIn } = useMockAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    signIn();
  }

  return (
    <div>
      <h1 className="text-4xl font-semibold">Welcome back</h1>
      <p className="mt-3 text-slate-300">Mock UI only. Backend auth comes after the UI gate.</p>
      <form className="mt-8" onSubmit={(event) => { event.preventDefault(); void handleSignIn(); }}>
        <label className="field"><span>Email</span><input placeholder="you@example.com" type="email" /></label>
        <label className="field"><span>Password</span><input placeholder="Password" type="password" /></label>
        <div className="mb-5 flex justify-end"><Link className="text-sm font-bold text-purple-300" href="/forgot-password">Forgot password?</Link></div>
        <button className="button blue w-full" disabled={loading} type="submit">{loading ? "Signing in..." : "Sign in"} <ArrowRight size={17} /></button>
      </form>
      <button className="button secondary mt-3 w-full" disabled={loading} onClick={() => void handleSignIn()} type="button"><Github size={17} /> {loading ? "Signing in..." : "Continue with GitHub"}</button>
      <p className="mt-6 text-center text-sm text-slate-300">Do not have an account? <Link className="font-semibold text-purple-300" href="/signup">Sign up</Link></p>
    </div>
  );
}
