"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Github } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignUp(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Account created!");
    router.push("/new");
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
      <h1 className="text-4xl font-semibold">Create your account</h1>
      <p className="mt-3 text-slate-300">Start with the prompt screen. Backend signup wiring comes later.</p>
      <form className="mt-8" onSubmit={(event) => { event.preventDefault(); void handleSignUp(new FormData(event.currentTarget)); }}>
        <label className="field"><span>Full name</span><input name="name" placeholder="Christian Suntay" /></label>
        <label className="field"><span>Email</span><input name="email" placeholder="you@example.com" type="email" /></label>
        <label className="field"><span>Password</span><input name="password" placeholder="Password" type="password" /></label>
        <Button className="mt-2 w-full" disabled={loading} type="submit">{loading ? "Creating account..." : "Create account"} <ArrowRight size={17} /></Button>
      </form>
      <Button className="mt-3 w-full" disabled={loading} onClick={() => void handleGithubAuth()} type="button" variant="outline"><Github size={17} /> {loading ? "Creating account..." : "Continue with GitHub"}</Button>
      <p className="mt-6 text-center text-sm text-slate-300">Already have an account? <Link className="font-semibold text-purple-300" href="/login">Log in</Link></p>
    </div>
  );
}
