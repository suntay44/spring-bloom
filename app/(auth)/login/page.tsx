"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Github, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleGoogleAuth() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  async function handleGithubAuth() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in!");
    router.push("/");
  }

  return (
    <div>
      <h1 className="text-4xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-400">Sign in to continue to SpringBloom.</p>

      {/* OAuth first */}
      <div className="mt-8 space-y-3">
        <Button
          className="w-full gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          disabled={loading}
          onClick={() => void handleGoogleAuth()}
          type="button"
          variant="outline"
        >
          <svg height="17" viewBox="0 0 24 24" width="17" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>
        <Button
          className="w-full gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          disabled={loading}
          onClick={() => void handleGithubAuth()}
          type="button"
          variant="outline"
        >
          <Github size={17} />
          Continue with GitHub
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <hr className="flex-1 border-zinc-800" />
        <span className="text-xs font-bold text-slate-600">OR</span>
        <hr className="flex-1 border-zinc-800" />
      </div>

      {/* Email / Password */}
      <form className="space-y-4" onSubmit={(e) => void handleSignIn(e)}>
        <div>
          <Label className="mb-1.5 block text-sm font-semibold" htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="text-sm font-semibold" htmlFor="password">Password</Label>
            <Link className="text-sm font-bold text-purple-300 hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Input
            autoComplete="current-password"
            className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500"
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            type="password"
            value={password}
          />
        </div>
        <Button className="w-full" disabled={loading || !email || !password} type="submit">
          {loading
            ? <><Loader2 className="mr-2 animate-spin" size={16} />Signing in…</>
            : <>Sign in <ArrowRight size={17} /></>
          }
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        No account?{" "}
        <Link className="font-semibold text-purple-300 hover:underline" href="/signup">
          Create one
        </Link>
      </p>
    </div>
  );
}
