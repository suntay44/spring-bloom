# Wild Cupcake — Codex Task List

> **How to use**: Work tasks top-to-bottom within each phase. Mark done by changing `[ ]` to `[x]`.
> After each phase, run `npm run typecheck` and verify the dev server renders correctly before moving on.
> All paths are relative to the project root.
>
> **Context**: We are in the UI-first gate. All data is mock/placeholder — do NOT wire real APIs yet.
> Reference `PLAN.md` for design decisions and color tokens.
>
> **Status**: Phases 1–13 complete. Phases 14–21 are the active work.

---

## ── PHASE 14 ── MockAuthContext — Simulated Auth State

**Goal**: Give the entire app a single source of truth for "is this user logged in?" using client-side context. No real auth. Defaults to `false` (logged out). Clicking any sign-in action sets it to `true` and navigates to `/new`. Clicking "Sign out" sets it back to `false` and navigates to `/`.

---

### 14.1 — Create `lib/mock/auth.ts`

```ts
// lib/mock/auth.ts
// Simulated auth state shape — matches what real Supabase session will look like.
import { MOCK_USER } from "@/lib/mock/user";

export type MockAuthState =
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: typeof MOCK_USER };

export const INITIAL_AUTH_STATE: MockAuthState = { status: "unauthenticated" };
```

- [x] Create `lib/mock/auth.ts` with the content above.

---

### 14.2 — Create `context/MockAuthContext.tsx`

```tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MOCK_USER } from "@/lib/mock/user";
import type { MockAuthState } from "@/lib/mock/auth";
import { INITIAL_AUTH_STATE } from "@/lib/mock/auth";

interface MockAuthContextValue {
  auth: MockAuthState;
  signIn: () => void;   // sets authenticated + navigates to /new
  signOut: () => void;  // sets unauthenticated + navigates to /
  isAuthenticated: boolean;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<MockAuthState>(INITIAL_AUTH_STATE);
  const router = useRouter();

  const signIn = useCallback(() => {
    setAuth({ status: "authenticated", user: MOCK_USER });
    router.push("/new");
  }, [router]);

  const signOut = useCallback(() => {
    setAuth(INITIAL_AUTH_STATE);
    router.push("/");
  }, [router]);

  return (
    <MockAuthContext.Provider
      value={{ auth, signIn, signOut, isAuthenticated: auth.status === "authenticated" }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error("useMockAuth must be used within MockAuthProvider");
  return ctx;
}
```

- [x] Create `context/MockAuthContext.tsx` with the content above.

---

### 14.3 — Wrap `app/layout.tsx` with `MockAuthProvider`

In `app/layout.tsx`:

- [x] Add `import { MockAuthProvider } from "@/context/MockAuthContext"`.
- [x] Wrap `{children}` with `<MockAuthProvider>{children}</MockAuthProvider>`.
- [x] Keep the `Inter` font variable and `suppressHydrationWarning` that are already there — do not remove them.

---

### 14.4 — Update auth pages to call `signIn` instead of `href="/home"`

**`app/(auth)/login/page.tsx`**:
- [x] Add `"use client"` directive (the page must be a client component because it calls `useMockAuth`).
- [x] Import `useMockAuth` from `@/context/MockAuthContext`.
- [x] Replace the "Sign in" `<Link href="/home">` with a `<button>` that calls `signIn()`.
- [x] Replace the "Continue with GitHub" `<Link href="/home">` with a `<button>` that calls `signIn()`.
- [x] Keep all existing styling classes identical — only change the element type and wire the `onClick`.

**`app/(auth)/signup/page.tsx`**:
- [x] Same changes as login: add `"use client"`, import `useMockAuth`, replace both `<Link href="/home">` elements with `<button onClick={signIn}>`.

---

## ── PHASE 15 ── AuthModal — Login Popup for Unauthenticated CTAs

**Goal**: When an unauthenticated visitor clicks any CTA that requires an account (send button on marketing prompt card, pricing plan CTAs, any `/dashboard` or `/new` or `/settings` direct navigation), show a modal overlay instead of hard-redirecting to `/login`. The modal contains the same form as the login page. Closing it returns to the marketing page.

---

### 15.1 — Create `components/auth/AuthModal.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { X, Github } from "lucide-react";
import { useMockAuth } from "@/context/MockAuthContext";

interface AuthModalProps {
  onClose: () => void;
  defaultTab?: "login" | "signup";
  selectedPlan?: string;
}

export function AuthModal({ onClose, defaultTab = "login", selectedPlan }: AuthModalProps) {
  const { signIn } = useMockAuth();

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <button
          aria-label="Close"
          className="absolute right-4 top-4 icon-btn"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>

        <h2 className="text-2xl font-semibold">
          {defaultTab === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-500">
          {defaultTab === "signup"
            ? "Sign up to start building."
            : "Sign in to continue to Wild Cupcake."}
        </p>

        {selectedPlan && (
          <div className="mb-5 mt-4 flex items-center justify-center">
            <span className="pill">Selected: <strong>{selectedPlan} plan</strong></span>
          </div>
        )}

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); signIn(); }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-email">Email</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              id="modal-email"
              placeholder="you@example.com"
              type="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="modal-password">Password</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              id="modal-password"
              placeholder="••••••••"
              type="password"
            />
          </div>
          <button className="button blue w-full" type="submit">
            {defaultTab === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <hr className="flex-1 border-zinc-800" />
          <span className="text-xs font-bold text-slate-600">OR</span>
          <hr className="flex-1 border-zinc-800" />
        </div>

        <button className="button secondary w-full" onClick={signIn} type="button">
          <Github size={17} /> Continue with GitHub
        </button>

        <p className="mt-5 text-center text-sm font-bold text-slate-500">
          {defaultTab === "signup" ? (
            <>Already have an account?{" "}
              <button className="text-purple-400 hover:underline" onClick={onClose} type="button">Sign in</button>
            </>
          ) : (
            <>No account?{" "}
              <button className="text-purple-400 hover:underline" onClick={onClose} type="button">Create one</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
```

- [x] Create `components/auth/AuthModal.tsx` with the content above.
- [x] Note: `selectedPlan` prop is already included here — no separate update needed in Phase 19.

---

### 15.2 — Wire `AuthModal` into `Navbar.tsx`

In `components/marketing/Navbar.tsx`:
- [x] Add `"use client"` directive.
- [x] Import `useState`, `useMockAuth`, `MOCK_USER`, `AuthModal`, `ArrowRight`.
- [x] Add `const [authOpen, setAuthOpen] = useState(false)` and `const { isAuthenticated, signOut } = useMockAuth()`.
- [x] Replace the static "Login" and "Start Building" links with a conditional block:
  ```tsx
  {isAuthenticated ? (
    <div className="flex items-center gap-3">
      <Link className="button secondary" href="/new">Go to app</Link>
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-purple-700 text-sm font-bold text-white">
        {MOCK_USER.initials}
      </span>
      <button className="text-sm font-bold text-slate-300 hover:text-white" onClick={signOut} type="button">Sign out</button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <button className="button secondary" onClick={() => setAuthOpen(true)} type="button">Login</button>
      <button className="button" onClick={() => setAuthOpen(true)} type="button">Start Building <ArrowRight size={17} /></button>
    </div>
  )}
  ```
- [x] Render `{authOpen && <AuthModal onClose={() => setAuthOpen(false)} defaultTab="login" />}` at the end of the return.

---

### 15.3 — Wire `AuthModal` into the marketing hero prompt send button

- [x] Create `components/marketing/HeroPromptSection.tsx` — see Phase 21.4 for the full component body. This replaces the static `<PromptCard>` in the marketing page and handles the auth gate on send. **Do Phase 21 first, then come back and wire this.**
- [x] Until Phase 21 is done: extract `components/marketing/HeroSendButton.tsx` as a minimal client stub:
  ```tsx
  "use client";
  import { useState } from "react";
  import { ArrowRight } from "lucide-react";
  import { AuthModal } from "@/components/auth/AuthModal";

  export function HeroSendButton() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button aria-label="Start from prompt" className="send-btn" onClick={() => setOpen(true)} type="button">
          <ArrowRight size={20} />
        </button>
        {open && <AuthModal onClose={() => setOpen(false)} defaultTab="signup" />}
      </>
    );
  }
  ```
- [x] In `app/(marketing)/page.tsx`, replace the `<Link className="send-btn" ...>` inside `PromptCard` with `<HeroSendButton />`.

---

### 15.4 — Wire `AuthModal` into pricing CTAs

In `components/marketing/PricingSection.tsx`:
- [x] Add `"use client"` directive.
- [x] Import `useState` and `AuthModal`.
- [x] Add `const [authOpen, setAuthOpen] = useState(false)` and `const [selectedPlan, setSelectedPlan] = useState<string | null>(null)`.
- [x] Replace each plan CTA `<Link href="/signup" className="button ...">` with a `<button>` that sets both state values:
  ```tsx
  onClick={() => { setSelectedPlan(plan.name); setAuthOpen(true); }}
  ```
- [x] Render at the bottom:
  ```tsx
  {authOpen && (
    <AuthModal onClose={() => setAuthOpen(false)} defaultTab="signup" selectedPlan={selectedPlan ?? undefined} />
  )}
  ```

---

### 15.5 — Create `components/shared/AuthGuard.tsx`

```tsx
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMockAuth } from "@/context/MockAuthContext";
import { AuthModal } from "@/components/auth/AuthModal";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useMockAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => { setChecked(true); }, []);

  if (!checked) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-zinc-950">
        <AuthModal onClose={() => router.push("/")} defaultTab="login" />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [x] Create `components/shared/AuthGuard.tsx` with the content above.
- [x] In `app/(app)/layout.tsx`, wrap `<AppShell>` with `<AuthGuard>`:
  ```tsx
  import { AuthGuard } from "@/components/shared/AuthGuard";
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
  ```

---

## ── PHASE 16 ── Route Fixes

**Goal**: Fix all dead links, duplicated routes, and hardcoded project IDs found during flow audit.

---

### 16.1 — Remove `/home` route (duplicate of `/new`)

- [x] Delete `app/(app)/home/page.tsx`.
- [x] In `components/layout/AppShell.tsx`: change every `href="/home"` → `href="/new"`.
- [x] In `app/(app)/dashboard/page.tsx`: change `href="/home"` → `href="/new"` on the "+ New Project" button.
- [x] In `components/new-project/NewProjectClient.tsx`: change `href="/home"` → `href="/new"` if present.
- [x] Verify: `grep -r '"/home"' app/ components/` returns zero results.

---

### 16.2 — Fix `/forgot-password` 404

- [x] Create `app/(auth)/forgot-password/page.tsx`:
  ```tsx
  "use client";

  import { useState } from "react";
  import Link from "next/link";

  export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setLoading(true);
      await new Promise((res) => setTimeout(res, 800));
      setSent(true);
      setLoading(false);
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Enter your account email and we&apos;ll send a reset link.
          </p>
          {sent ? (
            <div className="mt-6 rounded-lg border border-green-800 bg-green-950/40 p-4 text-sm font-semibold text-green-400">
              Check your email — a reset link is on the way.
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="you@example.com"
                type="email"
              />
              <button className="button blue w-full" disabled={loading} type="submit">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
          <p className="mt-5 text-sm font-bold text-slate-500">
            <Link className="text-purple-400 hover:underline" href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }
  ```

---

### 16.3 — Fix `ProjectBriefModal` hardcoded builder route

- [x] Find the "Start Building" `<Link href="/builder/mock-id">` in `components/new-project/ProjectBriefModal.tsx`.
- [x] Add a `projectId?: string` prop (default: `"healthtech-proto"`) and use `href={`/builder/${projectId}`}`.
- [x] In `NewProjectClient.tsx`, pass `projectId={MOCK_PROJECTS[0].id}` to `<ProjectBriefModal>`.

---

### 16.4 — Verify cross-links on auth pages

- [x] `app/(auth)/login/page.tsx` — "Forgot password?" links to `/forgot-password` ✓, "No account?" links to `/signup` ✓.
- [x] `app/(auth)/signup/page.tsx` — "Already have an account?" links to `/login` ✓.

---

## ── PHASE 17 ── Active Navigation State in AppShell

**Goal**: The sidebar highlights the currently active route.

---

### 17.1 — Add active-link highlighting and Dashboard nav item

In `components/layout/AppShell.tsx`:

- [x] Add `"use client"` directive.
- [x] Add `import { usePathname } from "next/navigation"` and `import { LayoutDashboard, LogOut } from "lucide-react"`.
- [x] Add `const pathname = usePathname()` and `const { signOut } = useMockAuth()` inside the component. Import `useMockAuth`.
- [x] Add a Dashboard link above the "Projects" heading:
  ```tsx
  <Link
    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors ${
      pathname === "/dashboard" ? "bg-zinc-800 text-white" : "hover:bg-zinc-800"
    }`}
    href="/dashboard"
  >
    <LayoutDashboard size={17} /> Dashboard
  </Link>
  ```
- [x] For `SIDEBAR_PROJECTS` links, apply active class when `pathname === \`/builder/${project.id}\``.
- [x] For `BOTTOM_NAV` links, apply active class when `pathname.startsWith(item.href)`.
- [x] Below the credits card, add a Sign out button:
  ```tsx
  <button
    className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-slate-500 hover:bg-zinc-800 hover:text-white transition-colors"
    onClick={signOut}
    type="button"
  >
    <LogOut size={17} /> Sign out
  </button>
  ```

---

## ── PHASE 18 ── Auth Loading States on Auth Pages

**Goal**: Sign-in and sign-up buttons on the standalone auth pages show a loading state before calling `signIn()`.

---

### 18.1 — Add loading state to `app/(auth)/login/page.tsx`

- [x] The page is already `"use client"` from Phase 14.4.
- [x] Add `const [loading, setLoading] = useState(false)`.
- [x] Wrap the sign-in `onClick` / `onSubmit`:
  ```tsx
  async function handleSignIn() {
    setLoading(true);
    await new Promise((res) => setTimeout(res, 800));
    signIn();
  }
  ```
- [x] Apply to both the "Sign in" button and "Continue with GitHub" button.
- [x] While loading: `disabled={loading}`, label changes to `"Signing in…"`.

---

### 18.2 — Add loading state to `app/(auth)/signup/page.tsx`

- [x] Same pattern as 18.1. "Create account" → `"Creating account…"` while loading.

---

### 18.3 — Add loading state to `AuthModal.tsx`

- [x] Add `const [loading, setLoading] = useState(false)`.
- [x] `onSubmit`: 800ms delay → `signIn()`. GitHub button: same delay.
- [x] Button label: `"Signing in…"` / `"Creating account…"` while loading. `disabled={loading}` on both buttons.

---

## ── PHASE 19 ── Settings Action Feedback

**Goal**: "Save changes" buttons in settings sections give visual feedback instead of doing nothing.

---

### 19.1 — Add "Saved ✓" feedback to settings section save buttons

In `components/settings/sections/AccountSection.tsx` and `components/settings/sections/SecuritySection.tsx`:

- [x] Add `"use client"` directive if not present.
- [x] Add `const [saved, setSaved] = useState(false)`.
- [x] On save button click:
  ```tsx
  async function handleSave() {
    await new Promise((res) => setTimeout(res, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  ```
- [x] Button renders as:
  ```tsx
  <button
    className={`button ${saved ? "bg-green-700 border-green-600" : "blue"}`}
    onClick={handleSave}
    type="button"
  >
    {saved ? "Saved ✓" : "Save changes"}
  </button>
  ```

---

## ── PHASE 20 ── Modal Polish

**Goal**: All modals close on backdrop click and Escape key. ProjectBriefModal gets the same treatment.

---

### 20.1 — `ProjectBriefModal` — Escape key + backdrop close

In `components/new-project/ProjectBriefModal.tsx`:
- [x] Add a `useEffect` that listens for `keydown` and calls `setOpen(false)` on `"Escape"`. Clean up on unmount.
- [x] On the outermost backdrop `<div>`, add:
  ```tsx
  onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
  ```
- [x] Add scroll lock: `document.body.style.overflow = "hidden"` on mount, `""` on unmount.

---

### 20.2 — End-to-end flow verification checklist

Manually trace each step and fix any broken link found:

- [x] `/` (not logged in) → click "Start Building" in Navbar → `AuthModal` opens → "Continue with GitHub" → `signIn()` → lands on `/new`
- [x] `/new` → type prompt → click send → `ProjectBriefModal` opens → complete 5 steps → PRD shown → "Start Building" → `/builder/healthtech-proto`
- [x] Builder → open project menu → click "← Dashboard" → `/dashboard`
- [x] `/dashboard` → click "Open" on any project card → correct builder route
- [x] `/dashboard` → sidebar "Settings" → all 6 tabs render
- [x] Sidebar "Sign out" → lands on `/` → `isAuthenticated` is `false` → Navbar shows Login/Start Building again
- [x] `/dashboard` (not logged in, direct URL) → `AuthGuard` shows auth modal over dark bg
- [x] `/forgot-password` → submit form → success message shown
- [x] `/login` → "Forgot password?" → `/forgot-password` (no 404)
- [x] Pricing section → click any plan CTA → `AuthModal` opens with selected plan pill
- [x] Verify `grep -r '"/home"' app/ components/` → zero results

---

## ── PHASE 21 ── DRY Prompt Card — Unify Marketing + App Toolbar

**Goal**: The marketing root page (`/`) and the `/new` page both have a `PromptCard` with duplicate tab and toolbar markup. The marketing version is a degraded static clone. This phase extracts shared sub-components and makes both pages use the identical interactive UI. After Phase 14–15 the `AuthModal` handles unauthenticated clicks, so the marketing page no longer needs a read-only toolbar.

---

### Duplication map

| Location | Duplicated / degraded code |
|---|---|
| `app/(marketing)/page.tsx` | `appTypes.map()` → `aria-disabled` tabs + `readOnly` textarea + static `<span className="pill">` items + `<Link send-btn>` |
| `components/new-project/NewProjectClient.tsx` | `appTypes.map()` → interactive tabs + `onChange` textarea + icon buttons + model `<select>` + `<button send-btn>` |

---

### 21.1 — Extract `components/shared/PromptToolbar.tsx`

```tsx
"use client";

import { Github, Mic, Paperclip, SlidersHorizontal, ArrowRight } from "lucide-react";
import { models, type AIModel } from "@/lib/mock/data";

interface PromptToolbarProps {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  onSend: () => void;
  canSend: boolean;
  instanceId?: string; // prevents duplicate <label> id when card appears twice on same page
}

export function PromptToolbar({ model, onModelChange, onSend, canSend, instanceId = "prompt" }: PromptToolbarProps) {
  const selectId = `${instanceId}-model-select`;
  return (
    <div className="prompt-toolbar">
      <div className="toolbar-left">
        <button aria-label="Attach files" className="icon-btn" title="Attach files" type="button"><Paperclip size={18} /></button>
        <button aria-label="Connect GitHub" className="icon-btn" title="Connect GitHub" type="button"><Github size={18} /></button>
        <span className="pill">E-1</span>
        <label className="sr-only" htmlFor={selectId}>AI model</label>
        <select
          className="pill cursor-pointer"
          id={selectId}
          onChange={(e) => onModelChange(models.find((m) => m.id === e.target.value) ?? models[0])}
          value={model.id}
        >
          {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <span className="pill">Maxx off</span>
      </div>
      <div className="toolbar-right">
        <button aria-label="Prompt settings" className="icon-btn" title="Prompt settings" type="button"><SlidersHorizontal size={18} /></button>
        <button aria-label="Voice input" className="icon-btn" title="Voice input" type="button"><Mic size={18} /></button>
        <button
          aria-label="Send prompt"
          className="send-btn"
          disabled={!canSend}
          onClick={onSend}
          title="Send prompt"
          type="button"
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
```

- [x] Create `components/shared/PromptToolbar.tsx` with the content above.
- [x] In `components/new-project/NewProjectClient.tsx`: delete the inline `<div className="prompt-toolbar">` block and replace with:
  ```tsx
  <PromptToolbar
    canSend={canSend}
    instanceId="new-project"
    model={model}
    onModelChange={setModel}
    onSend={() => { if (canSend) setModalOpen(true); }}
  />
  ```
- [x] Remove now-unused imports from `NewProjectClient.tsx`: `Paperclip`, `Github`, `SlidersHorizontal`, `Mic`.

---

### 21.2 — Extract `components/shared/PromptTabs.tsx`

```tsx
"use client";

import { appTypes, type AppType } from "@/lib/mock/data";

interface PromptTabsProps {
  activeId: string;
  onSelect: (type: AppType) => void;
}

export function PromptTabs({ activeId, onSelect }: PromptTabsProps) {
  return (
    <>
      {appTypes.map((type) => {
        const Icon = type.icon;
        return (
          <button
            className={`app-tab ${activeId === type.id ? "active" : ""}`}
            key={type.id}
            onClick={() => onSelect(type)}
            type="button"
          >
            <Icon size={19} /> {type.label}
          </button>
        );
      })}
    </>
  );
}
```

- [x] Create `components/shared/PromptTabs.tsx` with the content above.
- [x] In `components/new-project/NewProjectClient.tsx`: replace the `appTypes.map(...)` in the `tabs` prop with `<PromptTabs activeId={appType.id} onSelect={setAppType} />`.

---

### 21.3 — Create `components/shared/InteractivePromptCard.tsx`

```tsx
"use client";

import { useState } from "react";
import { PromptCard } from "@/components/shared/PromptCard";
import { PromptTabs } from "@/components/shared/PromptTabs";
import { PromptToolbar } from "@/components/shared/PromptToolbar";
import { appTypes, models, type AppType, type AIModel } from "@/lib/mock/data";

interface InteractivePromptCardProps {
  onSend: (opts: { prompt: string; appType: AppType; model: AIModel }) => void;
  defaultPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  instanceId?: string;
}

export function InteractivePromptCard({
  onSend,
  defaultPrompt = "",
  onPromptChange,
  instanceId,
}: InteractivePromptCardProps) {
  const [appType, setAppType] = useState<AppType>(appTypes[0]);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [model, setModel] = useState<AIModel>(models[0]);
  const canSend = prompt.trim().length > 0;

  function handlePromptChange(value: string) {
    setPrompt(value);
    onPromptChange?.(value);
  }

  return (
    <PromptCard tabs={<PromptTabs activeId={appType.id} onSelect={setAppType} />}>
      <textarea
        className="prompt-textarea"
        onChange={(e) => handlePromptChange(e.target.value)}
        placeholder={appType.placeholder}
        value={prompt}
      />
      <PromptToolbar
        canSend={canSend}
        instanceId={instanceId}
        model={model}
        onModelChange={setModel}
        onSend={() => { if (canSend) onSend({ prompt, appType, model }); }}
      />
    </PromptCard>
  );
}
```

- [x] Create `components/shared/InteractivePromptCard.tsx` with the content above.

---

### 21.4 — Create `components/marketing/HeroPromptSection.tsx` and update marketing page

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InteractivePromptCard } from "@/components/shared/InteractivePromptCard";
import { AuthModal } from "@/components/auth/AuthModal";
import { useMockAuth } from "@/context/MockAuthContext";
import type { AppType, AIModel } from "@/lib/mock/data";

export function HeroPromptSection() {
  const { isAuthenticated } = useMockAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();

  function handleSend(_opts: { prompt: string; appType: AppType; model: AIModel }) {
    if (isAuthenticated) {
      router.push("/new");
    } else {
      setAuthOpen(true);
    }
  }

  return (
    <>
      <InteractivePromptCard instanceId="hero" onSend={handleSend} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} defaultTab="signup" />}
    </>
  );
}
```

- [x] Create `components/marketing/HeroPromptSection.tsx` with the content above.
- [x] In `app/(marketing)/page.tsx`:
  - Delete the entire static `<PromptCard tabs={...}>` block (the `aria-disabled` tabs, `readOnly` textarea, static pill spans, and `<Link send-btn>` or `<HeroSendButton />`).
  - Delete the `HeroSendButton` import and `HeroSendButton.tsx` file if it was created in Phase 15.3.
  - Delete now-unused imports: `PromptCard`, `ArrowRight` (if only used there).
  - Add `import { HeroPromptSection } from "@/components/marketing/HeroPromptSection"`.
  - Replace the deleted block with `<HeroPromptSection />`.

---

### 21.5 — Simplify `NewProjectClient.tsx` to use `InteractivePromptCard`

- [x] Remove `appType`, `prompt`, `model` state from `NewProjectClient.tsx` (they now live inside `InteractivePromptCard`).
- [x] Add `lastPrompt`, `lastAppType`, `lastModel` state to capture what was submitted:
  ```tsx
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastAppType, setLastAppType] = useState(appTypes[0]);
  const [lastModel, setLastModel] = useState(models[0]);
  ```
- [x] Replace the entire `<PromptCard tabs={...}>` block with:
  ```tsx
  <InteractivePromptCard
    instanceId="new-project"
    defaultPrompt={chipPrompt}
    onPromptChange={(p) => setChipPrompt(p)}
    onSend={({ prompt, appType, model }) => {
      setLastPrompt(prompt);
      setLastAppType(appType);
      setLastModel(model);
      setModalOpen(true);
    }}
  />
  ```
- [x] Add `const [chipPrompt, setChipPrompt] = useState("")` — PROMPT_CHIPS set this via `setChipPrompt(...)` instead of `setPrompt(...)`.
- [x] Update `<ProjectBriefModal>` call to pass `prompt={lastPrompt}` (and `appType`, `model` if the modal accepts them).
- [x] Remove `PromptCard` import if no longer used directly.

---

### 21.6 — Delete dead code + final checks

- [x] `grep -r "aria-disabled" components/ app/` → zero results.
- [x] `grep -r 'readOnly' components/ app/` → zero results.
- [x] `grep -r 'className="pill">GitHub' app/ components/` → zero results.
- [x] `grep -r '"/home"' app/ components/` → zero results.
- [x] `npm run typecheck` → zero errors.
- [x] Dev server: visit `/` — prompt card is fully interactive (tabs switch placeholder, model dropdown works, send opens AuthModal).
- [x] Dev server: visit `/new` — prompt card is identical in appearance; chips fill textarea; send opens ProjectBriefModal.

---

## ── NOTES FOR CODEX ──

### Order of execution
Complete phases in order: **14 → 15 → 16 → 17 → 18 → 19 → 20 → 21**. Each phase depends on the previous.

### Hard rules
1. **No backend calls** — All data from `lib/mock/*`. Do not touch real APIs.
2. **`"use client"` chain** — `MockAuthContext`, `AuthModal`, `AuthGuard`, `Navbar`, `AppShell`, auth pages, `InteractivePromptCard`, `HeroPromptSection` must all be client components.
3. **`MockAuthProvider` must wrap the root** — It must be in `app/layout.tsx` before any component that calls `useMockAuth()`.
4. **`PromptCard` stays a server component** — Do not add `"use client"` to `components/shared/PromptCard.tsx`.
5. **No `localStorage`** — Mock auth is in-memory React context only. Resets on refresh — intentional.
6. **`/forgot-password` is public** — Must NOT be inside `AuthGuard`. The `(auth)` route group has no guard.
7. **Extraction order in Phase 21** — 21.1 → 21.2 → 21.3 → 21.4 → 21.5. Verify `npm run typecheck` passes after each step.
8. **Do not start Phase B** (Supabase, auth, Fly.io, AI, Stripe) until Phase 20.2 end-to-end checklist is fully passed.
