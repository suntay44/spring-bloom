"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { useMockAuth } from "@/context/MockAuthContext";

export default function SignupPage() {
  const { signIn } = useMockAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    signIn();
  }

  return (
    <div>
      <h1 className="text-4xl font-semibold">Create your account</h1>
      <p className="mt-3 text-slate-300">Start with the prompt screen. Backend signup wiring comes later.</p>
      <form className="mt-8" onSubmit={(event) => { event.preventDefault(); void handleSignIn(); }}>
        <label className="field"><span>Full name</span><input placeholder="Christian Suntay" /></label>
        <label className="field"><span>Email</span><input placeholder="you@example.com" type="email" /></label>
        <label className="field"><span>Password</span><input placeholder="Password" type="password" /></label>
        <button className="button blue mt-2 w-full" disabled={loading} type="submit">{loading ? "Creating account..." : "Create account"} <ArrowRight size={17} /></button>
      </form>
      <button className="button secondary mt-3 w-full" disabled={loading} onClick={() => void handleSignIn()} type="button"><Github size={17} /> {loading ? "Creating account..." : "Continue with GitHub"}</button>
      <p className="mt-6 text-center text-sm text-slate-300">Already have an account? <Link className="font-semibold text-purple-300" href="/login">Log in</Link></p>
    </div>
  );
}
