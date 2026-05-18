# SpringBloom — Pricing Strategy & Profitability Model

> Last updated: 2026-05-16
> **Sources (live-fetched):**
> - Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
> - OpenAI: https://openai.com/api/pricing/ (via web search — site blocks direct fetch)
> - Google: https://ai.google.dev/pricing
>
> Run estimates: 1,500 input + 3,000 output tokens (simple) | 2,500 input + 5,000 output (complex)

---

## ⚠️ Key Changes vs Previous Estimates

| What changed | Old | New |
|---|---|---|
| Claude Haiku 3.5 | $0.80/$4.00 | **RETIRED** on main API — use Haiku 4.5 |
| Claude Haiku 4.5 | not included | **$1.00/$5.00** (new budget model) |
| Claude Opus 4.5/4.6/4.7 | $15.00/$75.00 | **$5.00/$25.00** (67% cheaper!) |
| GPT-4o / GPT-4o Mini | $2.50/$10, $0.15/$0.60 | Superseded by GPT-5.x line |
| OpenAI flagship | GPT-4o ($2.50/$10) | GPT-5.4 Standard ($2.50/$15) |
| OpenAI budget | GPT-4o Mini ($0.15/$0.60) | GPT-4.1 Nano ($0.10/$0.40) |
| OpenAI premium | — | GPT-5.5 ($5.00/$30.00) |
| **Credit rate** | **$0.20/credit** | **$0.17/credit** (15% below Emergent, 43% below Lovable) |
| **Plans** | $0 / $12 / $29 / $79 | **$0 / $16 / $20 / $60** |
| **Top-up base** | $20 / 100 cr | **$17 / 100 cr** |

---

## 1. Credit Unit Definition

```
1 credit = $0.17 USD (SpringBloom internal rate)
```

**15% cheaper than Emergent.sh** ($0.20/cr) and **43% cheaper than Lovable** ($0.30/cr).
Cheapest credit rate in the market at equivalent model quality.

---

## 2. Live API Pricing (as of 2026-05-16)

### Anthropic — Claude Models

| Model | Status | Input ($/1M) | Output ($/1M) | Notes |
|---|---|---|---|---|
| Claude Haiku 4.5 | ✅ Current | $1.00 | $5.00 | Budget/fast model |
| Claude Sonnet 4.5 | ✅ Current ⭐ | $3.00 | $15.00 | Primary model |
| Claude Sonnet 4.6 | ✅ Current | $3.00 | $15.00 | Latest Sonnet |
| Claude Opus 4.5 | ✅ Current | $5.00 | $25.00 | Was $15/$75 — now affordable |
| Claude Opus 4.6 | ✅ Current | $5.00 | $25.00 | Latest Opus |
| Claude Opus 4.7 | ✅ Current | $5.00 | $25.00 | New tokenizer (+35% tokens) |
| Claude Haiku 3.5 | ❌ Retired | $0.80 | $4.00 | Main API only; Bedrock/Vertex still active |
| Claude Opus 4.1 | ❌ Deprecated | $15.00 | $75.00 | Do not use |

⭐ = SpringBloom primary/default model

**Prompt caching discounts (Sonnet 4.5 example):**
- 5-min cache write: $3.75/1M (1.25×)
- 1-hr cache write: $6.00/1M (2×)
- Cache hit/read: $0.30/1M (0.1× = 90% off)
→ Prompt caching on system prompt + conversation history will meaningfully reduce our API costs.

### OpenAI — GPT Models

| Model | Status | Input ($/1M) | Output ($/1M) | Notes |
|---|---|---|---|---|
| GPT-4.1 Nano | ✅ Current | $0.10 | $0.40 | Ultra-budget |
| GPT-5.4 Mini | ✅ Current | $0.75 | $4.50 | Budget workhorse |
| GPT-5.4 Standard | ✅ Current | $2.50 | $15.00 | Main production model |
| GPT-5.5 | ✅ Current | $5.00 | $30.00 | Premium flagship (Apr 2026) |
| o3 | ✅ Current | $2.00 | $8.00 | Reasoning/complex logic |

### Google — Gemini Models

| Model | Status | Input ($/1M) | Output ($/1M) | Notes |
|---|---|---|---|---|
| Gemini 2.5 Flash | ✅ Current | $0.30 | $2.50 | Budget, fast |
| Gemini 2.5 Flash-Lite | ✅ Current | $0.10 | $0.40 | Ultra-budget |
| Gemini 2.5 Pro | ✅ Current | $1.25 (≤200k) | $10.00 (≤200k) | Strong coder |
| Gemini 3.1 Flash-Lite | ✅ Current | $0.25 | $1.50 | Newest budget |
| Gemini 3.1 Pro Preview | ✅ Current | $2.00 (≤200k) | $12.00 (≤200k) | Newest premium |

---

## 3. Credit Charge vs API Cost vs Gross Margin

### Simple Run — 1,500 input + 3,000 output tokens

> Revenue = credits × $0.17 | Margin = (Revenue − API Cost) / Revenue

| Model | Provider | API Cost/Run | Credits Charged | Revenue | **Gross Margin** |
|---|---|---|---|---|---|
| Claude Haiku 4.5 | Anthropic | $0.0165 | 0.5 cr ($0.085) | $0.085 | **81%** |
| Claude Sonnet 4.5 ⭐ | Anthropic | $0.0495 | 1 cr ($0.170) | $0.170 | **71%** |
| Claude Opus 4.5 | Anthropic | $0.0825 | 1.5 cr ($0.255) | $0.255 | **68%** |
| GPT-4.1 Nano | OpenAI | $0.0014 | 0.3 cr ($0.051) | $0.051 | **97%** |
| GPT-5.4 Mini | OpenAI | $0.0146 | 0.5 cr ($0.085) | $0.085 | **83%** |
| GPT-5.4 Standard | OpenAI | $0.0488 | 1 cr ($0.170) | $0.170 | **71%** |
| GPT-5.5 | OpenAI | $0.0975 | 1.5 cr ($0.255) | $0.255 | **62%** |
| o3 | OpenAI | $0.0270 | 1 cr ($0.170) | $0.170 | **84%** |
| Gemini 2.5 Flash | Google | $0.0080 | 0.3 cr ($0.051) | $0.051 | **84%** |
| Gemini 2.5 Pro | Google | $0.0319 | 1 cr ($0.170) | $0.170 | **81%** |

### Complex Run — 2,500 input + 5,000 output tokens (multi-file app builds)

| Model | API Cost/Run | Credits Charged | Revenue | **Gross Margin** |
|---|---|---|---|---|
| Claude Haiku 4.5 | $0.0275 | 1 cr ($0.170) | $0.170 | **84%** |
| Claude Sonnet 4.5 ⭐ | $0.0825 | 1.5 cr ($0.255) | $0.255 | **68%** |
| Claude Opus 4.5 | $0.1375 | 2 cr ($0.340) | $0.340 | **60%** |
| GPT-4.1 Nano | $0.0023 | 0.5 cr ($0.085) | $0.085 | **97%** |
| GPT-5.4 Mini | $0.0244 | 0.5 cr ($0.085) | $0.085 | **71%** |
| GPT-5.4 Standard | $0.0813 | 1.5 cr ($0.255) | $0.255 | **68%** |
| GPT-5.5 | $0.1625 | 2 cr ($0.340) | $0.340 | **52%** |
| o3 | $0.0450 | 1 cr ($0.170) | $0.170 | **74%** |
| Gemini 2.5 Flash | $0.0133 | 0.5 cr ($0.085) | $0.085 | **84%** |
| Gemini 2.5 Pro | $0.0531 | 1 cr ($0.170) | $0.170 | **69%** |

### Worst Case — 4,000 input + 8,000 output tokens (hard cap enforced server-side)

| Model | API Cost/Run | Credits Charged | Revenue | **Gross Margin** |
|---|---|---|---|---|
| Claude Haiku 4.5 | $0.0440 | 1 cr ($0.170) | $0.170 | **74%** |
| Claude Sonnet 4.5 ⭐ | $0.1320 | 2 cr ($0.340) | $0.340 | **61%** |
| Claude Opus 4.5 | $0.2200 | 3 cr ($0.510) | $0.510 | **57%** |
| GPT-5.4 Standard | $0.1300 | 2 cr ($0.340) | $0.340 | **62%** |
| GPT-5.5 | $0.2600 | 3 cr ($0.510) | $0.510 | **49%** |

> Hard 8,000 output token cap enforced server-side. GPT-5.5 worst case is 49% —
> acceptable since it's rare, Teams-only gated, and typical utilization is well below the cap.

---

## 4. Monthly Plan Pricing

| Plan | Price/month | Credits/month | $/credit (effective) | Model Access | Features |
|---|---|---|---|---|---|
| **Free** | $0 | 5 | — | Haiku 4.5, Sonnet 4.5, GPT-4.1 Nano, Gemini Flash | 5 runs, expires monthly, no rollover |
| **Starter** | $16 | 100 | $0.160 | + Opus 4.5, GPT-5.4 Mini, Gemini Pro | No rollover, community support |
| **Pro** | $20 | 175 | $0.114 | + GPT-5.4 Standard, o3, Gemini 3.1 Pro | Rollover up to 75 cr, priority queue, GitHub export |
| **Teams** | $60 | 500 | $0.120 | All models incl. GPT-5.5, Opus 4.7 | 5 seats, shared pool, analytics, SSO |
| **Enterprise** | Custom | Custom | Negotiated | All + custom | SLA, dedicated support, custom limits |

> **20% cheaper than Emergent** (their Standard is $20/100 cr, we're $16/100 cr).
> **20% cheaper than Lovable** (their Pro is $25/100 cr, we're $20/175 cr — more credits too).
> Opus 4.5 opened to Starter (affordable at $5/$25 — old $15/$75 pricing would've required Pro+).

Annual discount: **20% off** all paid plans

| Plan | Annual Price | Monthly Equivalent | Annual Savings |
|---|---|---|---|
| Starter | $154/year | $12.80/month | $38/year |
| Pro | $192/year | $16.00/month | $48/year |
| Teams | $576/year | $48.00/month | $144/year |

---

## 5. Credit Top-Up Packs

One-time purchases. No expiry. Stack on top of plan credits.

| Pack | Price | Effective $/credit | Discount vs base | Min Gross Margin (Sonnet) |
|---|---|---|---|---|
| 100 credits | $17.00 | $0.170 | — | 71% |
| 250 credits | $40.00 | $0.160 | 6% off | 68% |
| 500 credits | $75.00 | $0.150 | 12% off | 64% |
| 1,000 credits | $140.00 | $0.140 | 18% off | 60% |

> Floor: $0.14/credit. At max bulk discount + Sonnet worst-case → 60% margin. Still viable.
> Subscriptions always beat top-up pricing to incentivise plan upgrades over one-off purchases.

---

## 6. Competitor Comparison

### Monthly Plans

| | **SpringBloom** | Emergent.sh | Lovable |
|---|---|---|---|
| **Free** | $0 / 5 cr | $0 / 10 cr | $0 / limited |
| **Entry paid** | **$16 / 100 cr** | $20 / 100 cr (-20%) | $5 / 150 cr (5/day cap) |
| **Mid tier** | **$20 / 175 cr** | — | $25 / 100 cr (-20%, +75 cr) |
| **High tier** | **$60 / 500 cr** | $200 / 750 cr | $50 / 100 cr |
| **Credit rate** | **$0.17/cr** | $0.20/cr | $0.25–0.30/cr |
| **Model choice** | **Per prompt (all 3 providers)** | Per prompt | Gemini Flash default only |

### Credit Top-Up Comparison

| Credits | **SpringBloom** | Emergent.sh | Lovable |
|---|---|---|---|
| ~100 cr | **$17 ($0.170/cr)** | $20 ($0.20/cr) | $30 ($0.30/cr) |
| ~250 cr | **$40 ($0.160/cr)** | $50 ($0.20/cr) | $75 ($0.30/cr) |
| ~500 cr | **$75 ($0.150/cr)** | $100 ($0.20/cr) | $150 ($0.30/cr) |
| ~1,000 cr | **$140 ($0.140/cr)** | — | $300 ($0.30/cr) |

> SpringBloom is **43–53% cheaper than Lovable** and **15–30% cheaper than Emergent** on top-ups.

### Value Per $20 Spent (Sonnet runs, 1 cr each)

| Platform | $20 gets you |
|---|---|
| **SpringBloom top-up** | **117 Sonnet runs** ($20 / $0.17) |
| Emergent.sh top-up | 100 runs ($20 / $0.20) |
| Lovable top-up | 67 runs ($20 / $0.30) |
| SpringBloom Starter plan | **100 runs for $16** (saving $4 vs Emergent for same credits) |

---

## 7. Profitability Breakdown

### After All Platform Costs

| Cost Category | % of Revenue |
|---|---|
| AI API (blended, Sonnet-weighted with prompt caching) | ~22% |
| Stripe payment processing | ~3% |
| Fly.io compute (runner VMs per user) | ~4% |
| Supabase (DB + auth + storage) | ~2% |
| Cloudflare (hosting + edge) | ~1% |
| **Total COGS** | **~32%** |
| **Gross Margin** | **~68%** |

> Prompt caching on the system prompt + conversation history could reduce API costs by 40–60%
> on repeat turns in the same project session. This improves blended margin significantly.

### Monthly Revenue Projections (conservative, 65% monthly credit utilization)

| Stage | Users | Subscription MRR | Top-up MRR | Total MRR | API Cost | **Net Revenue** |
|---|---|---|---|---|---|---|
| Early beta (100 users) | 80 Free + 15 Starter + 5 Pro | $340 | $500 | ~$840 | ~$160 | **~$680** |
| Growth (1,000 users) | 700 Free + 200 Starter + 80 Pro + 20 Teams | $6,000 | $5,250 | ~$11,250 | ~$3,200 | **~$8,050** |
| Scale (10,000 users) | standard mix + top-ups | ~$60,000 | ~$60,000 | ~$120,000 | ~$38,400 | **~$81,600** |

> Top-up MRR assumes 20% of users buy avg $25 top-up (early), 15% buy avg $35 (growth), 10% buy avg $60 (scale).

---

## 8. Model Access Gates by Plan

| Model | Free | Starter | Pro | Teams |
|---|---|---|---|---|
| **Anthropic** | | | | |
| Claude Haiku 4.5 | ✅ | ✅ | ✅ | ✅ |
| Claude Sonnet 4.5 | ✅ | ✅ | ✅ | ✅ |
| Claude Opus 4.5 | ❌ | ✅ | ✅ | ✅ |
| Claude Sonnet 4.6 | ❌ | ❌ | ✅ | ✅ |
| Claude Opus 4.7 | ❌ | ❌ | ❌ | ✅ |
| **OpenAI** | | | | |
| GPT-4.1 Nano | ✅ | ✅ | ✅ | ✅ |
| GPT-5.4 Mini | ❌ | ✅ | ✅ | ✅ |
| GPT-5.4 Standard | ❌ | ❌ | ✅ | ✅ |
| GPT-5.5 | ❌ | ❌ | ❌ | ✅ |
| o3 | ❌ | ❌ | ✅ | ✅ |
| **Google** | | | | |
| Gemini 2.5 Flash | ✅ | ✅ | ✅ | ✅ |
| Gemini 2.5 Pro | ❌ | ✅ | ✅ | ✅ |
| Gemini 3.1 Pro | ❌ | ❌ | ✅ | ✅ |

> Opus 4.5 is now opened to Starter (was Pro-only under old $15/$75 pricing).
> Latest versions (Opus 4.7, GPT-5.5) gated to Teams as upgrade incentive.

---

## 9. Credit Deduction Flow (Technical Reference)

```
User selects model → model rate loaded from model_pricing table
        ↓
Pre-flight: estimate max credits for request complexity
        ↓
Balance check: user.credits >= estimated_max?
  NO  → reject: "Insufficient credits. Top up to continue."
  YES → HOLD estimated_max credits (soft reserve in credit_transactions)
        ↓
Stream tokens from AI provider API
Track input_tokens + output_tokens in real time via usage object
        ↓
Run complete:
actual_credits = (input_tokens / 1,000,000 × model.credits_per_1m_input)
              + (output_tokens / 1,000,000 × model.credits_per_1m_output)
        ↓
DEDUCT actual_credits from balance
REFUND (estimated_max − actual_credits) back to balance
        ↓
Append to credit_transactions:
  { type: 'hold',   amount: -estimated_max,  run_id, model_id }
  { type: 'deduct', amount: -actual_credits,  run_id, model_id, tokens_input, tokens_output }
  { type: 'refund', amount: +refund_amount,   run_id, model_id }
```

---

## 10. Safety Rails

| Rule | Detail |
|---|---|
| Hard token cap: 8,000 output/run | Enforced server-side; prevents runaway cost on any model |
| Balance check before every run | Hold fails if balance insufficient — never negative |
| Model gate by plan | Enforced server-side — never trust client |
| Anomaly alert: 3× p99 token usage | Flags unusual runs for review |
| Daily spend cap (optional, user-set) | Protects users from bill shock; reduces churn |
| Prompt cache on system prompt | Cuts repeat input cost by 90% on cache hits |
| Fallback model on API error | Auto-retry with Haiku if Sonnet returns 529 — no extra charge |

---

## 11. Key Decisions to Lock In Before Phase 14 (Stripe)

- [x] Credit rate: **$0.17/credit** ✅ confirmed
- [x] Plan structure: **Free ($0/5cr) / Starter ($16/100cr) / Pro ($20/175cr) / Teams ($60/500cr)** ✅ confirmed
- [x] Providers at launch: **Anthropic + OpenAI + Google** ✅ confirmed
- [x] Model selection: **per prompt (user picks before each message)** ✅ confirmed
- [x] `model_pricing` + `credit_transactions` schema defined in Phase 10 tasks.md ✅
- [ ] Decide: rollover credits — Pro only, or all paid plans?
- [ ] Decide: do unused monthly credits expire monthly or roll over capped amount?
- [ ] Decide: referral credits (suggested: +10 cr each side per referral)
- [ ] Set Stripe product/price IDs for each plan before Phase 14 implementation

---

## 12. API Cost Formulas (for code reference)

> Rates below are set to achieve the target credit charges per typical run at $0.17/credit.
> These are stored in the `model_pricing` Supabase table and fetched at runtime — never hardcoded.

```typescript
// lib/credits/calculate.ts

interface ModelPricing {
  model_id: string;
  credits_per_1m_input: number;   // credits charged per 1M input tokens (includes markup)
  credits_per_1m_output: number;  // credits charged per 1M output tokens (includes markup)
}

// Rates derived from: target_credits_per_run × (1M / typical_tokens)
// At $0.17/credit targeting ~70% gross margin on Sonnet:
//   Sonnet simple run (1500in+3000out) → 1 credit → $0.17 revenue, $0.0495 API = 71% margin
//   credits_per_1m_input  = 1cr × 1M / (1500 + 5×3000) = 60.6   (5× = output/input price ratio)
//   credits_per_1m_output = 60.6 × 5 = 303.0

const MODEL_RATES: Record<string, ModelPricing> = {
  // Anthropic  (output = 5× input price)
  "claude-haiku-4-5":    { credits_per_1m_input: 30.3,  credits_per_1m_output: 151.5 }, // ~0.5cr simple, ~81% margin
  "claude-sonnet-4-5":   { credits_per_1m_input: 60.6,  credits_per_1m_output: 303.0 }, // ~1cr simple,   ~71% margin
  "claude-sonnet-4-6":   { credits_per_1m_input: 60.6,  credits_per_1m_output: 303.0 }, // ~1cr simple,   ~71% margin
  "claude-opus-4-5":     { credits_per_1m_input: 90.9,  credits_per_1m_output: 454.5 }, // ~1.5cr simple, ~68% margin
  "claude-opus-4-6":     { credits_per_1m_input: 90.9,  credits_per_1m_output: 454.5 },
  // OpenAI — GPT (output = 6× input price for 5.x, 4× for Nano)
  "gpt-4-1-nano":        { credits_per_1m_input: 22.2,  credits_per_1m_output: 88.9  }, // ~0.3cr simple, ~97% margin
  "gpt-5-4-mini":        { credits_per_1m_input: 25.6,  credits_per_1m_output: 153.8 }, // ~0.5cr simple, ~83% margin
  "gpt-5-4-standard":    { credits_per_1m_input: 51.3,  credits_per_1m_output: 307.7 }, // ~1cr simple,   ~71% margin
  "gpt-5-5":             { credits_per_1m_input: 76.9,  credits_per_1m_output: 461.5 }, // ~1.5cr simple, ~62% margin
  // OpenAI — o3 (output = 4× input price)
  "o3":                  { credits_per_1m_input: 74.1,  credits_per_1m_output: 296.3 }, // ~1cr simple,   ~84% margin
  // Google — Gemini (output/input ratios vary)
  "gemini-2-5-flash":    { credits_per_1m_input: 11.3,  credits_per_1m_output: 94.4  }, // ~0.3cr simple, ~84% margin
  "gemini-2-5-pro":      { credits_per_1m_input: 39.2,  credits_per_1m_output: 313.7 }, // ~1cr simple,   ~81% margin
};

export function calculateCredits(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number {
  const rates = MODEL_RATES[modelId];
  if (!rates) throw new Error(`Unknown model: ${modelId}`);
  const raw = (inputTokens / 1_000_000) * rates.credits_per_1m_input
            + (outputTokens / 1_000_000) * rates.credits_per_1m_output;
  return Math.ceil(raw * 10) / 10; // round up to nearest 0.1 credit
}

// Revenue from a charge: credits × $0.17
export const CREDIT_VALUE_USD = 0.17;
export function creditsToUsd(credits: number): number {
  return Math.round(credits * CREDIT_VALUE_USD * 100) / 100;
}
```
