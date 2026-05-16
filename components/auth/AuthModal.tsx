"use client";

import { useEffect, useState } from "react";
import { Github, X } from "lucide-react";
import { useMockAuth } from "@/context/MockAuthContext";

interface AuthModalProps {
  onClose: () => void;
  defaultTab?: "login" | "signup";
  selectedPlan?: string;
}

export function AuthModal({ onClose, defaultTab = "login", selectedPlan }: AuthModalProps) {
  const { signIn } = useMockAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const actionLabel = defaultTab === "signup" ? "Create account" : "Sign in";
  const loadingLabel = defaultTab === "signup" ? "Creating account..." : "Signing in...";
  const canSubmit = email.trim().length > 0 && password.length > 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleSignIn() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    signIn();
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      role="dialog"
    >
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <button aria-label="Close" className="icon-btn absolute right-4 top-4" onClick={onClose} type="button">
          <X size={18} />
        </button>
        <h2 className="text-2xl font-semibold">{defaultTab === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">{defaultTab === "signup" ? "Sign up to start building." : "Sign in to continue to Wild Cupcake."}</p>
        {selectedPlan ? <div className="mb-5 mt-4 flex items-center justify-center"><span className="pill">Selected: <strong>{selectedPlan} plan</strong></span></div> : null}
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit) void handleSignIn(); }}>
          <div>
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-email">Email</label>
            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" id="modal-email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-password">Password</label>
            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" id="modal-password" onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type="password" value={password} />
          </div>
          <button className="button blue w-full" disabled={loading || !canSubmit} type="submit">{loading ? loadingLabel : actionLabel}</button>
        </form>
        <div className="my-5 flex items-center gap-3"><hr className="flex-1 border-zinc-800" /><span className="text-xs font-bold text-slate-600">OR</span><hr className="flex-1 border-zinc-800" /></div>
        <button className="button secondary w-full" disabled={loading} onClick={() => void handleSignIn()} type="button">
          <Github size={17} /> {loading ? loadingLabel : "Continue with GitHub"}
        </button>
        <p className="mt-5 text-center text-sm font-bold text-slate-500">
          {defaultTab === "signup" ? <>Already have an account? <button className="text-purple-400 hover:underline" onClick={onClose} type="button">Sign in</button></> : <>No account? <button className="text-purple-400 hover:underline" onClick={onClose} type="button">Create one</button></>}
        </p>
      </div>
    </div>
  );
}
