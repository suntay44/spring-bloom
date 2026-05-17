"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
  defaultTab?: "login" | "signup";
  selectedPlan?: string;
}

export function AuthModal({ onClose, defaultTab = "login", selectedPlan }: AuthModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const actionLabel = defaultTab === "signup" ? "Create account" : "Sign in";
  const loadingLabel = defaultTab === "signup" ? "Creating account..." : "Signing in...";
  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();
    const response = defaultTab === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (response.error) {
      toast.error(response.error.message);
      return;
    }

    toast.success(defaultTab === "signup" ? "Account created!" : "Signed in!");
    onClose();
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-zinc-800 bg-zinc-950 p-8 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">{defaultTab === "signup" ? "Create your account" : "Welcome back"}</DialogTitle>
        </DialogHeader>
        <p className="mt-1 text-sm font-bold text-slate-500">{defaultTab === "signup" ? "Sign up to start building." : "Sign in to continue to Wild Cupcake."}</p>
        {selectedPlan ? <div className="mb-5 mt-4 flex items-center justify-center"><Badge variant="secondary">Selected: <strong>{selectedPlan} plan</strong></Badge></div> : null}
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit) void handleSubmit(); }}>
          <div>
            <Label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-email">Email</Label>
            <Input className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500" id="modal-email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-password">Password</Label>
            <Input className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500" id="modal-password" onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type="password" value={password} />
          </div>
          <Button className="w-full" disabled={loading || !canSubmit} type="submit">{loading ? loadingLabel : actionLabel}</Button>
        </form>
        <div className="my-5 flex items-center gap-3"><hr className="flex-1 border-zinc-800" /><span className="text-xs font-bold text-slate-600">OR</span><hr className="flex-1 border-zinc-800" /></div>
        <Button className="w-full" disabled={loading} onClick={() => void handleGithubAuth()} type="button" variant="outline">
          <Github size={17} /> {loading ? loadingLabel : "Continue with GitHub"}
        </Button>
        <p className="mt-5 text-center text-sm font-bold text-slate-500">
          {defaultTab === "signup" ? <>Already have an account? <button className="text-purple-400 hover:underline" onClick={onClose} type="button">Sign in</button></> : <>No account? <button className="text-purple-400 hover:underline" onClick={onClose} type="button">Create one</button></>}
        </p>
      </DialogContent>
    </Dialog>
  );
}
