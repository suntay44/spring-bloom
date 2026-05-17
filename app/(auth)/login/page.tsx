"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Github } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignIn(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in!");
    router.push("/");
  }

  async function handleGithubAuth() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github" });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-semibold">Welcome back</h1>
      <p className="mt-3 text-slate-300">Mock UI only. Backend auth comes after the UI gate.</p>
      <form className="mt-8" onSubmit={(event) => { event.preventDefault(); void handleSignIn(new FormData(event.currentTarget)); }}>
        <label className="field"><span>Email</span><input name="email" placeholder="you@example.com" type="email" /></label>
        <label className="field"><span>Password</span><input name="password" placeholder="Password" type="password" /></label>
        <div className="mb-5 flex justify-end"><Link className="text-sm font-bold text-purple-300" href="/forgot-password">Forgot password?</Link></div>
        <Button className="w-full" disabled={loading} type="submit">{loading ? "Signing in..." : "Sign in"} <ArrowRight size={17} /></Button>
      </form>
      <Button className="mt-3 w-full" disabled={loading} onClick={() => void handleGithubAuth()} type="button" variant="outline"><Github size={17} /> {loading ? "Signing in..." : "Continue with GitHub"}</Button>
      <p className="mt-6 text-center text-sm text-slate-300">Do not have an account? <Link className="font-semibold text-purple-300" href="/signup">Sign up</Link></p>
    </div>
  );
}
