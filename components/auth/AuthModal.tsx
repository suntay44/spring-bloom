"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
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

type View = "login" | "signup" | "otp";

// OTP is rate-limited client-side: max 3 sends per email per 10 min.
// Supabase server-side rate limiting is the authoritative check.
const OTP_LIMIT = 3;
const OTP_WINDOW_MS = 10 * 60 * 1000;
const otpSendLog: { email: string; at: number }[] = [];

function checkOtpRateLimit(email: string): boolean {
  const now = Date.now();
  const recent = otpSendLog.filter((e) => e.email === email && now - e.at < OTP_WINDOW_MS);
  return recent.length < OTP_LIMIT;
}
function recordOtpSend(email: string) {
  otpSendLog.push({ email, at: Date.now() });
}

export function AuthModal({ onClose, defaultTab = "login", selectedPlan }: AuthModalProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(defaultTab === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _sliding = useRef(false);

  // ── OAuth ──────────────────────────────────────────────────────────────────

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

  // ── Email / Password ───────────────────────────────────────────────────────

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in!");
    onClose();
    router.push("/");
  }

  async function handleSignup() {
    if (!email || !password) return;
    if (!checkOtpRateLimit(email)) {
      toast.error("Too many verification emails. Please wait a few minutes.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    recordOtpSend(email);
    setOtpEmail(email);
    setView("otp");
  }

  async function handleOtpVerify() {
    if (!otp || otp.length < 6) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otp, type: "email" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account confirmed! Welcome to SpringBloom.");
    onClose();
    router.push("/");
  }

  async function handleResendOtp() {
    if (!checkOtpRateLimit(otpEmail)) {
      toast.error("Too many verification emails. Please wait a few minutes.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ email: otpEmail, type: "signup" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    recordOtpSend(otpEmail);
    toast.success("Verification email resent.");
  }

  // ── Titles ─────────────────────────────────────────────────────────────────

  const titles: Record<View, string> = {
    login: "Welcome back",
    signup: "Create your account",
    otp: "Check your inbox",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-zinc-800 bg-zinc-950 p-8 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">{titles[view]}</DialogTitle>
        </DialogHeader>

        {/* ── OTP verification view ── */}
        {view === "otp" && (
          <div className="mt-4 space-y-5">
            <p className="text-sm text-slate-400">
              We sent a 6-digit code to{" "}
              <strong className="text-white">{otpEmail}</strong>.
              Enter it below to confirm your account.
            </p>
            <div>
              <Label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-otp">
                Verification code
              </Label>
              <Input
                autoComplete="one-time-code"
                className="h-11 border-zinc-700 bg-zinc-900 text-center text-2xl font-bold tracking-widest text-white placeholder:text-slate-600"
                id="modal-otp"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                value={otp}
              />
            </div>
            <Button
              className="w-full"
              disabled={loading || otp.length < 6}
              onClick={() => void handleOtpVerify()}
            >
              {loading
                ? <><Loader2 className="mr-2 animate-spin" size={16} />Verifying…</>
                : <>Confirm account <ArrowRight size={17} /></>
              }
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                className="font-semibold text-purple-400 hover:underline"
                onClick={() => setView("signup")}
                type="button"
              >
                <ArrowLeft className="mr-1 inline" size={13} />Back
              </button>
              <button
                className="font-semibold text-slate-400 hover:text-white disabled:opacity-50"
                disabled={loading}
                onClick={() => void handleResendOtp()}
                type="button"
              >
                Resend code
              </button>
            </div>
          </div>
        )}

        {/* ── Login / Signup view ── */}
        {view !== "otp" && (
          <>
            {selectedPlan ? (
              <div className="mb-2 mt-4 flex items-center justify-center">
                <Badge variant="secondary">
                  Selected: <strong>{selectedPlan} plan</strong>
                </Badge>
              </div>
            ) : null}

            {/* ── OAuth buttons — always on top ── */}
            <div className="mt-5 space-y-3">
              <Button
                className="w-full gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                disabled={loading}
                onClick={() => void handleGoogleAuth()}
                type="button"
                variant="outline"
              >
                {/* Google "G" logo — inline SVG, no extra dependency */}
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

            <div className="my-5 flex items-center gap-3">
              <hr className="flex-1 border-zinc-800" />
              <span className="text-xs font-bold text-slate-600">OR</span>
              <hr className="flex-1 border-zinc-800" />
            </div>

            {/* ── Email / Password ── */}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (view === "signup") void handleSignup();
                else void handleLogin();
              }}
            >
              {view === "signup" && (
                <div>
                  <Label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-name">
                    Full name
                  </Label>
                  <Input
                    className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500"
                    id="modal-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Christian Suntay"
                    value={name}
                  />
                </div>
              )}
              <div>
                <Label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-email">
                  Email
                </Label>
                <Input
                  autoComplete="email"
                  className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500"
                  id="modal-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-password">
                  Password
                </Label>
                <Input
                  autoComplete={view === "signup" ? "new-password" : "current-password"}
                  className="h-11 border-zinc-700 bg-zinc-900 text-white placeholder:text-slate-500"
                  id="modal-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={view === "signup" ? "Create a password" : "Password"}
                  required
                  type="password"
                  value={password}
                />
              </div>

              <Button className="w-full" disabled={loading || !email || !password} type="submit">
                {loading
                  ? <><Loader2 className="mr-2 animate-spin" size={16} />{view === "signup" ? "Creating account…" : "Signing in…"}</>
                  : <>{view === "signup" ? "Create account" : "Sign in"} <ArrowRight size={17} /></>
                }
              </Button>
            </form>

            {/* ── Toggle login / signup ── */}
            <p className="mt-5 text-center text-sm font-bold text-slate-500">
              {view === "signup"
                ? (
                  <>Already have an account?{" "}
                    <button className="text-purple-400 hover:underline" onClick={() => setView("login")} type="button">
                      Sign in
                    </button>
                  </>
                ) : (
                  <>No account?{" "}
                    <button className="text-purple-400 hover:underline" onClick={() => setView("signup")} type="button">
                      Create one
                    </button>
                  </>
                )
              }
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
