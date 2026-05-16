# Wild Cupcake — Codex Task List

> **How to use**: Work tasks top-to-bottom within each phase. Mark done by changing `[ ]` to `[x]`.
> After each phase, run `npm run typecheck` and verify the dev server renders correctly before moving on.
> All paths are relative to the project root.
>
> **Context**: UI-first gate — final frontend branch before backend work begins.
> All data remains mock/placeholder. Do NOT wire real APIs.
>
> **Status**: Phases A–E complete. These phases are the final frontend work.
> **Order**: F → G → J → H → I

---

## ── PHASE F ── Code Review Bug Fixes

---

### F.1 — Fix `HeroCTAButtons` hard navigation

**Problem**: Uses `window.location.href = "/new"` — triggers a full browser reload. Every other navigation uses `router.push()`.

- [x] In `components/marketing/HeroCTAButtons.tsx`:
  - Add `import { useRouter } from "next/navigation"`.
  - Add `const router = useRouter()` inside the component.
  - Replace `window.location.href = "/new"` with `router.push("/new")`.

---

### F.2 — Merge duplicate `@media (max-width: 768px)` blocks in `globals.css`

**Problem**: Two separate `768px` blocks exist — one added in Phase C (line ~1834), one pre-existing (line ~1910) for `.builder-chrome`. Same breakpoint, two blocks.

- [x] In `app/globals.css`:
  - Find both `@media (max-width: 768px)` blocks.
  - Move all rules from the second block into the first.
  - Delete the now-empty second block.
  - Verify: exactly one `@media (max-width: 768px)` block remains.

---

### F.3 — Fix `TAB_PANELS` reconciliation for `FindingsPanel`

**Problem**: `Review` and `Security` both render `<FindingsPanel>` at the same tree position. React reconciles instead of remounting — internal state (scroll, expanded rows) persists across tab switches.

- [x] In `components/builder/BuilderMock.tsx`:
  - Change `TAB_PANELS` from `Record<BuilderTab, ReactNode>` to `Record<BuilderTab, () => ReactNode>`:
    ```tsx
    const TAB_PANELS: Record<BuilderTab, () => React.ReactNode> = {
      Preview: () => <PreviewPanel project={project} />,
      Files: () => <FilesPanel />,
      Diff: () => <DiffPanel />,
      Review: () => <FindingsPanel key="review" title="Code Review" items={MOCK_REVIEW_RUN.findings} />,
      Security: () => <FindingsPanel key="security" title="Security Scan" items={MOCK_SECURITY_RUN.findings} />,
      Analytics: () => <AnalyticsPanel />,
    };
    ```
  - Update render site: `{TAB_PANELS[tab]()}`.
  - Run `npm run typecheck` — zero errors.

---

## ── PHASE G ── Project Type Awareness in Builder

**Background**: `MOCK_PROJECTS` already has `type: "mobile" | "fullstack" | "landing"` and `framework: "expo" | "nextjs" | "static"`. The builder must use this data to drive preview behavior.

- `mobile` → phone frame only. No web preview tab.
- `fullstack` / `landing` → viewport toggle: Desktop / Tablet / Mobile (width resize, not platform switch).

---

### G.1 — Pass project into `BuilderMock` from the page

**Problem**: `app/(builder)/builder/[projectId]/page.tsx` doesn't read `params.projectId` or look up the project. `BuilderMock` has no project context.

- [x] In `app/(builder)/builder/[projectId]/page.tsx`:
  ```tsx
  import { MOCK_PROJECTS } from "@/lib/mock/projects";
  import { BuilderMock } from "@/components/builder/BuilderMock";

  export default function BuilderPage({ params }: { params: { projectId: string } }) {
    const project = MOCK_PROJECTS.find((p) => p.id === params.projectId);
    if (!project) {
      return <div className="grid h-screen place-items-center text-slate-500">Project not found</div>;
    }
    return <BuilderMock project={project} />;
  }
  ```

- [x] In `components/builder/BuilderMock.tsx`:
  - Import `MockProject` from `@/lib/mock/projects`.
  - Add `project: MockProject` to `BuilderMockProps` (or define the props type if missing).
  - Pass `project` down to `PreviewPanel` (used in G.2): `Preview: () => <PreviewPanel project={project} />`.
  - Find where the project name/title is shown in the builder chrome header. Replace any hardcoded name with `{project.name}`.

---

### G.2 — Make `PreviewPanel` type-aware

**Problem**: `PreviewPanel` always shows both "Web" and "Mobile" tabs regardless of project type. `healthtech-proto` is `type: "mobile"` but shows the Kanban web preview under "Web".

**Correct behavior:**

| `project.type` | Preview |
|---|---|
| `"mobile"` | Render `<MobilePreview />` directly. No tab bar. |
| `"fullstack"` / `"landing"` | Viewport toggle: `Desktop` / `Tablet` / `Mobile`. Resizes a container around `<WebPreview />`. |

- [x] In `components/builder/panels/PreviewPanel.tsx`:
  - Add `project: MockProject` to props.
  - Add viewport state for web projects:
    ```tsx
    type Viewport = "desktop" | "tablet" | "mobile";
    const VIEWPORT_WIDTHS: Record<Viewport, string> = {
      desktop: "100%",
      tablet: "768px",
      mobile: "390px",
    };
    ```
  - Icons for the viewport toggle: `Monitor` (desktop), `Tablet` (tablet), `Smartphone` (mobile) — all from lucide-react.
  - **If `project.type === "mobile"`**: render `<MobilePreview />` directly. No tab bar. Remove the old `"web" | "mobile"` state entirely.
  - **If `project.type !== "mobile"`**: render the three-button viewport toggle above `<WebPreview />`. Wrap `<WebPreview />` in a centered container with `style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}` and `mx-auto transition-all`.

---

### G.3 — Show project type badge in builder header

- [x] In `components/builder/BuilderMock.tsx`:
  - Add a `TYPE_LABELS` map:
    ```tsx
    const TYPE_LABELS: Record<MockProjectType, string> = {
      mobile: "Expo · Mobile",
      fullstack: "Next.js · Fullstack",
      landing: "Static · Landing",
    };
    ```
  - Next to the project name in the builder chrome, render:
    `<span className="pill">{TYPE_LABELS[project.type]}</span>`

---

## ── PHASE J ── shadcn/ui Migration

**Goal**: Replace hand-rolled interactive components with shadcn/ui. Keep all layout and builder-specific CSS exactly as-is.

**What changes**: Button, Badge, Dialog (AuthModal), Tabs (settings), Progress (credit bar), Tooltip (icon buttons), Sonner (toast — replaces Phase H.1's custom Toast).

**What does NOT change**: `.app-layout`, `.sidebar`, `.builder-chrome`, `.hero`, `.grid-3`, `.grid-4`, `.tool-tab`, `.tool-btn`, `.circle-btn`, `.chip-btn`, `.kanban-grid`, `.sample-app`, `.project-table-row`, and all other layout/builder CSS classes. Those stay in `globals.css` untouched.

---

### J.1 — Install and initialise shadcn

- [x] Run:
  ```bash
  pnpm dlx shadcn@latest init
  ```
  When prompted:
  - Style: **Default**
  - Base color: **Zinc**
  - CSS variables: **Yes**

- [x] Add the required components:
  ```bash
  pnpm dlx shadcn@latest add button badge dialog tabs progress tooltip sonner separator input label textarea dropdown-menu
  ```

- [x] Verify `components/ui/` folder now exists with the added components.
- [x] Run `npm run typecheck` — zero errors before continuing.

---

### J.2 — Replace `.button` classes with `<Button>`

**Mapping:**

| Current class | shadcn equivalent |
|---|---|
| `className="button"` | `<Button>` (default variant) |
| `className="button blue"` | `<Button>` (default — blue is the default) |
| `className="button secondary"` | `<Button variant="outline">` |
| `className="button secondary mt-4 w-full"` | `<Button variant="outline" className="mt-4 w-full">` |
| `className="button blue w-full"` | `<Button className="w-full">` |

**Do NOT replace**: `.icon-btn`, `.tool-btn`, `.circle-btn`, `.chip-btn`, `.menu-row` — these are builder/toolbar-specific and stay custom.

- [x] In each of these files, import `Button` from `@/components/ui/button` and replace `.button` usages:
  - `components/auth/AuthModal.tsx`
  - `components/marketing/Navbar.tsx`
  - `components/marketing/HeroCTAButtons.tsx`
  - `components/marketing/PricingSection.tsx`
  - `components/layout/AppShell.tsx`
  - `components/new-project/ProjectBriefModal.tsx`
  - `components/settings/sections/AccountSection.tsx`
  - `components/settings/sections/BillingSection.tsx`
  - `components/settings/sections/DangerSection.tsx`
  - `components/builder/BuilderMock.tsx` (Share button only)

- [x] Run `npm run typecheck` after this step.

---

### J.3 — Replace `.pill` spans with `<Badge>`

**Mapping:**

| Current | shadcn equivalent |
|---|---|
| `<span className="pill">text</span>` | `<Badge variant="secondary">text</Badge>` |
| `<button className="pill" ...>chip</button>` | Keep as-is — prompt chips are interactive, not badges |

- [x] In each file, import `Badge` from `@/components/ui/badge` and replace static `.pill` spans:
  - `components/layout/AppShell.tsx` (plan + credits pills in topbar)
  - `components/auth/AuthModal.tsx` (selected plan pill)
  - `components/shared/PromptToolbar.tsx` (E-1, Maxx off pills)
  - `components/settings/sections/AnalyticsSection.tsx` (event name pills)
  - `components/builder/BuilderMock.tsx` (type badge from G.3)

- [x] `<button className="pill">` prompt chips in `NewProjectClient.tsx` — leave as-is (they are clickable chips, not badges).

---

### J.4 — Replace `AuthModal` custom modal with `<Dialog>`

**Why**: `<Dialog>` from shadcn/Radix gives focus trapping, `aria-modal`, Escape key, scroll lock, and backdrop click for free — replacing the manual `useEffect` wiring in `AuthModal`.

- [x] In `components/auth/AuthModal.tsx`:
  - Import `Dialog, DialogContent, DialogHeader, DialogTitle` from `@/components/ui/dialog`.
  - Remove the `useEffect` that manually wires `onKeyDown` (Escape) and `document.body.style.overflow` — `<Dialog>` handles both.
  - Remove the manual backdrop `<div>` click handler.
  - Wrap the modal content in:
    ```tsx
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{defaultTab === "signup" ? "Create your account" : "Welcome back"}</DialogTitle>
        </DialogHeader>
        {/* existing form content */}
      </DialogContent>
    </Dialog>
    ```
  - Replace `<input>` elements with `<Input>` from `@/components/ui/input`.
  - Replace `<label>` elements with `<Label>` from `@/components/ui/label`.
  - Keep the `email`, `password`, `canSubmit` controlled state — just swap the elements.

---

### J.5 — Replace custom `TabBar` with shadcn `<Tabs>`

**Scope**: Settings tabs and the "Recent Tasks | Deployed Apps" tab header in `NewProjectClient`. Builder toolbar tabs (`.tool-tab`) stay custom — they have icons and are part of the builder chrome.

- [x] In `components/shared/TabBar.tsx`:
  - Rewrite to use shadcn `<Tabs>`, `<TabsList>`, `<TabsTrigger>`:
    ```tsx
    import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

    export function TabBar<T extends string>({ tabs, value, onChange }: TabBarProps<T>) {
      return (
        <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      );
    }
    ```
  - This keeps the same `TabBar` API — callers (`SettingsMock`, etc.) don't change.

---

### J.6 — Add `<Progress>` to credit meter in `AppShell`

- [x] In `components/layout/AppShell.tsx`:
  - Import `Progress` from `@/components/ui/progress`.
  - Below the credits text (`{MOCK_USER.credits.toLocaleString()} credits remaining`), add:
    ```tsx
    <Progress value={(MOCK_USER.credits / 1500) * 100} className="mt-2 h-1.5" />
    ```
  - The `1500` total is `MOCK_USER.creditsTotal` if that field exists on `MOCK_USER`, otherwise hardcode for now.

- [x] In `components/settings/sections/BillingSection.tsx`:
  - Replace the existing `.credit-meter` div with `<Progress>` using the same value calculation.

---

### J.7 — Add `<Tooltip>` to icon buttons in builder

Currently icon buttons have `title` attributes (browser tooltip, inconsistent across OS). Replace with shadcn `<Tooltip>` for consistent styling.

- [x] In `components/builder/BuilderMock.tsx`:
  - Import `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` from `@/components/ui/tooltip`.
  - Wrap the root return in `<TooltipProvider>`.
  - Wrap each `.tool-btn` button that has a `title` attribute in:
    ```tsx
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="tool-btn" type="button" aria-label="...">
          <Icon size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
    ```
  - Remove the `title` attribute from each button once wrapped (tooltip replaces it).
  - Apply to: Run history, Open preview, Refresh preview, Comments, Share, GitHub, Publish.

---

### J.8 — Install Sonner and wire up root layout

Sonner replaces the custom `Toast` system. **Do not create `components/shared/Toast.tsx`** from Phase H — Sonner covers it entirely.

- [x] In `app/layout.tsx`:
  - Import `Toaster` from `sonner`.
  - Add `<Toaster position="bottom-right" richColors />` just before `</body>`.

- [x] Create `lib/toast.ts` as a thin re-export so callers import from one place:
  ```ts
  export { toast } from "sonner";
  ```

- [x] Run `npm run typecheck` — zero errors.

---

### J.9 — Verification

- [x] `npm run typecheck` — zero errors.
- [x] `/` — marketing page renders, buttons use `<Button>`, pills use `<Badge>`.
- [x] "Start Building" (hero) → `<Dialog>` opens with focus trapped inside (tab key cycles within modal only).
- [x] Escape key closes `<Dialog>`.
- [x] `/settings` — tab bar uses shadcn `<Tabs>`, all 6 tabs switch correctly.
- [x] `/new` — prompt chips still work (still `.pill` buttons, not `<Badge>`).
- [x] `AppShell` sidebar — credit `<Progress>` bar renders.
- [x] Builder tooltip appears on hover over icon buttons.
- [x] No visual regressions on layout classes (`.app-layout`, `.hero`, etc. unchanged).

---

## ── PHASE H ── Button Interactivity (Dummy Feedback)

**Note**: Phase J (Sonner) must be complete before this phase. Import `toast` from `@/lib/toast` in all files below — do not create a custom Toast component.

**Goal**: Every button on every page does something visible when clicked.

---

### H.1 — Wire dead buttons in `BuilderMock.tsx`

- [x] In `components/builder/BuilderMock.tsx`:
  - Import `{ toast }` from `@/lib/toast`.
  - Add `onClick` to each dead toolbar button:

  | Button | Action |
  |---|---|
  | `<History>` Run history | `toast("Run history — coming soon")` |
  | `<ArrowUpRight>` Open preview | `window.open("/", "_blank"); toast("Opening preview in new tab...")` |
  | `<RefreshCw>` Refresh | `toast("Preview refreshed")` |
  | `<MessageSquare>` Comments | `toast("Comments — coming soon")` |
  | `<Share2>` Share | `toast("Share link copied: https://wildca.ke/share/demo123")` |
  | `<Github>` GitHub | `toast("Connect GitHub in Settings → Integrations")` |

---

### H.2 — Wire dead buttons in `ChatPanel.tsx`

- [x] In `components/builder/ChatPanel.tsx`:
  - Import `{ toast }` from `@/lib/toast`.
  - Lift `messages` state up into `BuilderMock`: change `const [messages, setMessages] = useState(MOCK_MESSAGES)` in `BuilderMock`, pass `messages` and `onSend` down as props.
  - Add `onSend: () => void` to `ChatPanelProps`.

  **Canned AI responses** (define in `BuilderMock`, cycle through):
  ```tsx
  const MOCK_AI_RESPONSES = [
    "Done! I've updated the component. Check the Files tab for the diff.",
    "The Kanban board now supports drag-and-drop. Preview refreshed.",
    "Added the billing table to the dashboard. 3 files updated.",
  ] as const;
  ```

  | Button | Action |
  |---|---|
  | `<Zap>` Send | Append next `MOCK_AI_RESPONSES` entry to messages, cycle with index |
  | `+` Attach file | `toast("File upload — coming soon")` |
  | `<Paintbrush>` Visual edits | Toggle `visualEdits` boolean state in `BuilderMock`, pass as prop; show active class when on. `toast("Visual edits on")` / `toast("Visual edits off")` |
  | `Build ▾` | Toggle a small dropdown (3 options: Build / Preview only / Deploy). Each: `toast("Starting {option}...")` |
  | `<Mic>` Voice | `toast("Voice input — coming soon")` |

---

### H.3 — Wire dead buttons in `PromptToolbar.tsx`

- [x] In `components/shared/PromptToolbar.tsx`:
  - Import `{ toast }` from `@/lib/toast`.

  | Button | `toast(...)` |
  |---|---|
  | `<Paperclip>` Attach | `"File upload — coming soon"` |
  | `<Github>` GitHub | `"Connect GitHub in Settings → Integrations"` |
  | `<SlidersHorizontal>` Settings | `"Prompt settings — coming soon"` |
  | `<Mic>` Voice | `"Voice input — coming soon"` |

---

### H.4 — Wire dead buttons in Settings sections

- [x] In `components/settings/sections/AccountSection.tsx`:
  - Import `{ toast }` from `@/lib/toast`.
  - `"Change password"` → `toast("Password reset link sent to your email")`
  - `"Upgrade to Agency"` → `toast("Redirecting to upgrade flow...")`

- [x] In `components/settings/sections/BillingSection.tsx`:
  - Import `{ toast }` from `@/lib/toast`.
  - `"Buy Credits"` → `toast("Opening credit checkout...")`
  - Credit pack cards → `toast("Added {pack} to cart")`
  - `"Manage billing"` → `toast("Opening billing portal...")`

---

### H.5 — Wire dead buttons in `ProjectMenu.tsx`

- [x] In `components/builder/ProjectMenu.tsx`:
  - Import `{ toast }` from `@/lib/toast`.
  - Publish/deploy button → `toast("Deploying to Vercel... (mock)")`
  - `MoreToolsMenu` items with no `tab` → replace `undefined` with `() => toast(\`${item.label} — coming soon\`)`.
    Change: `onClick={() => item.tab ? setTab(item.tab) : undefined}`
    To: `onClick={() => item.tab ? setTab(item.tab) : toast(\`${item.label} — coming soon\`)}`

---

### H.6 — Wire filter button in `NewProjectClient.tsx`

- [x] In `components/new-project/NewProjectClient.tsx`:
  - Import `{ toast }` from `@/lib/toast`.
  - `<Settings2>` filter button → `onClick={() => toast("Filter — coming soon")}`.

---

## ── PHASE I ── End-to-End Verification

Final gate before this branch is closed and backend work begins.

---

### I.1 — Full click-path check

**Auth + creation flow**
- [x] `/` → "Start Building" (hero) → `<Dialog>` opens (focus trapped, Escape closes it)
- [x] `/` → Navbar "Login" → `<Dialog>` opens
- [x] `AuthModal` → type email + password → button enables → sign in → navigates to `/new`
- [x] `/new` → type prompt → send → `ProjectBriefModal` opens → 5 steps → PRD shows user's prompt text → "Start Building" → builder

**Builder — project type**
- [x] `/builder/healthtech-proto` → Preview tab → phone frame only, no Web tab (`type: "mobile"`)
- [x] `/builder/crm-counterpart` → Preview tab → Desktop/Tablet/Mobile viewport toggle (`type: "fullstack"`)
- [x] `/builder/bill-generator` → Preview tab → Desktop/Tablet/Mobile viewport toggle (`type: "landing"`)
- [x] Viewport toggle: Desktop = full width, Tablet = 768px centered, Mobile = 390px centered

**Builder — button feedback**
- [x] Refresh button → toast "Preview refreshed"
- [x] Share button → toast with fake share URL
- [x] Send (Zap) → mock AI reply appends to chat
- [x] Visual edits → button toggles active state
- [x] Build dropdown → options appear
- [x] GitHub button → toast "Connect GitHub in Settings"

**Settings**
- [x] Settings → `<Tabs>` tab bar switches all 6 panels correctly
- [x] Settings → Billing → "Buy Credits" → toast fires
- [x] Settings → Account → "Change password" → toast fires
- [x] Credit `<Progress>` bar visible in sidebar and billing section

**shadcn components**
- [x] `<Dialog>` focus trap: Tab key stays inside modal
- [x] `<Dialog>` Escape key closes modal
- [x] `<Badge>` pills visible in topbar, analytics section, auth modal
- [x] `<Button>` renders consistently across marketing, auth, settings
- [x] `<Tooltip>` visible on hover over builder icon buttons
- [x] Sonner toast appears bottom-right for all wired buttons

**Responsive**
- [x] 375px → `.grid-3` becomes 1 column
- [x] 375px → auth shell shows form only
- [x] 375px → app sidebar hidden
- [x] `npm run typecheck` → zero errors

---

## ── NOTES FOR CODEX ──

### Order
**F → G → J → H → I**. Do not start H before J — H imports `toast` from `@/lib/toast` which requires Sonner (J.8).

### Hard rules
1. **No backend calls** — All data from `lib/mock/*`. Do not touch real APIs.
2. **Toast is Sonner** — Import `toast` from `@/lib/toast`. Do NOT create `components/shared/Toast.tsx`.
3. **Layout CSS is untouched** — `.app-layout`, `.sidebar`, `.builder-chrome`, `.hero`, `.grid-3`, `.grid-4`, `.project-table-row`, `.tool-tab`, `.tool-btn`, `.circle-btn`, `.chip-btn` stay in `globals.css` unchanged.
4. **Builder toolbar tabs stay custom** — `.tool-tab` buttons in `BuilderMock` do NOT use shadcn `<Tabs>`. Only the settings `TabBar` migrates.
5. **Phase G is data-driven** — All preview logic driven by `project.type`. No `if (projectId === "healthtech-proto")` conditions.
6. **Run `npm run typecheck` after each phase** — G changes `BuilderMock` and `PreviewPanel` signatures simultaneously; both must be done before typecheck.
7. **Prompt chip buttons stay as `.pill` buttons** — They are interactive, not informational. Do not replace with `<Badge>`.
