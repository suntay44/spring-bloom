# Graph Report - .  (2026-05-17)

## Corpus Check
- 130 files · ~50,281 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 481 nodes · 842 edges · 25 communities (19 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 4,200 input · 1,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_BuilderMock.tsx|BuilderMock.tsx]]
- [[_COMMUNITY_cn()|cn()]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_Credit Unit|Credit Unit]]
- [[_COMMUNITY_button.tsx|button.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_NewProjectClient.tsx|NewProjectClient.tsx]]
- [[_COMMUNITY_ChatPanel.tsx|ChatPanel.tsx]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_PreviewPanel.tsx|PreviewPanel.tsx]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_getStripe()|getStripe()]]
- [[_COMMUNITY_auth.ts|auth.ts]]
- [[_COMMUNITY_analytics.ts|analytics.ts]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_Error()|Error()]]
- [[_COMMUNITY_config|config]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_Plan Enterprise|Plan: Enterprise]]
- [[_COMMUNITY_End-to-End Smoke Test|End-to-End Smoke Test]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 43 edges
2. `createClient()` - 26 edges
3. `Button()` - 19 edges
4. `Badge()` - 12 edges
5. `Credit Unit` - 11 edges
6. `POST()` - 8 edges
7. `execOnMachine()` - 8 edges
8. `SpringBloom` - 8 edges
9. `planLimit()` - 7 edges
10. `getStripe()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Anthropic Logo` --conceptually_related_to--> `Claude Haiku 4.5`  [INFERRED]
  public/logos/anthropic.png → PRICING.md
- `Anthropic Logo` --conceptually_related_to--> `Claude Sonnet 4.5`  [INFERRED]
  public/logos/anthropic.png → PRICING.md
- `OpenAI Logo` --conceptually_related_to--> `GPT-4.1 Nano`  [INFERRED]
  public/logos/openai.png → PRICING.md
- `OpenAI Logo` --conceptually_related_to--> `GPT-5.4 Standard`  [INFERRED]
  public/logos/openai.png → PRICING.md
- `Gemini Logo` --conceptually_related_to--> `Gemini 2.5 Flash`  [INFERRED]
  public/logos/gemini.png → PRICING.md

## Communities (25 total, 6 thin omitted)

### Community 0 - "BuilderMock.tsx"
Cohesion: 0.05
Nodes (43): NotFound(), BuilderMock(), BuilderMockProps, TAB_ICONS, TYPE_LABELS, visibleToolbarTabs, CodeEditor(), CodeEditorProps (+35 more)

### Community 1 - "cn()"
Cohesion: 0.07
Nodes (34): AuthModalProps, cn(), TabBar(), TabBarProps, Dialog(), DialogContent(), DialogDescription(), DialogFooter() (+26 more)

### Community 2 - "server.ts"
Cohesion: 0.07
Nodes (18): POST(), GET(), POST(), verifyOwnership(), createMachine(), execOnMachine(), FlyMachine, getMachine() (+10 more)

### Community 3 - "Credit Unit"
Cohesion: 0.05
Nodes (49): Cloudflare, Fly.io, Stripe, Supabase, Launch: Environment Variables, Launch Phase Status, Anthropic Logo, Gemini Logo (+41 more)

### Community 4 - "button.tsx"
Cohesion: 0.07
Nodes (23): HeroCTAButtons(), AccountSection(), AccountSectionProps, PLAN_LABELS, AnalyticsSection(), EVENTS, BillingSection(), BillingSectionProps (+15 more)

### Community 5 - "page.tsx"
Cohesion: 0.08
Nodes (26): FEATURE_HIGHLIGHTS, HERO_STATS, WORKFLOW_STEPS, AuthModal(), metadata, AppShell(), AppShellProfile, AppShellProject (+18 more)

### Community 6 - "NewProjectClient.tsx"
Cohesion: 0.09
Nodes (25): AIModel, AppType, appTypes, models, PricingPlan, BriefFields(), HERO_STATS, PROMPT_CHIPS (+17 more)

### Community 7 - "ChatPanel.tsx"
Cohesion: 0.09
Nodes (30): ArtifactActionType, extractPreamble(), hasArtifact(), parseArtifacts(), ParsedAction, ParsedArtifact, CreditEstimate, estimateCredits() (+22 more)

### Community 8 - "route.ts"
Cohesion: 0.14
Nodes (20): buildContextMessages(), anthropic, google, openai, resolveModel(), buildSystemPrompt(), frameworkInstructions(), ProjectContext (+12 more)

### Community 9 - "PreviewPanel.tsx"
Cohesion: 0.14
Nodes (11): DeviceId, DEVICES, DeviceSpec, PhoneFrame(), PhoneFrameProps, IPHONE_IDS, KANBAN_COLUMNS, PreviewPanel() (+3 more)

### Community 10 - "route.ts"
Cohesion: 0.35
Nodes (9): createSupabaseProject(), getProjectApiKeys(), mgmtHeaders(), runMigration(), SupabaseApiKey, SupabaseProject, waitForProject(), platformClient (+1 more)

### Community 11 - "getStripe()"
Cohesion: 0.27
Nodes (8): POST(), POST(), CREDIT_PACKS, CreditPack, getStripe(), config, platformClient, POST()

### Community 12 - "auth.ts"
Cohesion: 0.33
Nodes (4): INITIAL_AUTH_STATE, MockAuthState, MOCK_USER, MockUser

### Community 13 - "analytics.ts"
Cohesion: 0.4
Nodes (4): CreditUsageItem, MOCK_APP_ANALYTICS, MOCK_BUILD_ANALYTICS, MOCK_CREDIT_USAGE

## Knowledge Gaps
- **118 isolated node(s):** `config`, `nextConfig`, `inter`, `metadata`, `HERO_STATS` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `server.ts` to `BuilderMock.tsx`, `route.ts`, `getStripe()`, `page.tsx`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn()` to `BuilderMock.tsx`, `button.tsx`, `page.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `Button()` connect `button.tsx` to `BuilderMock.tsx`, `cn()`, `page.tsx`, `NewProjectClient.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `inter` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BuilderMock.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `cn()` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._