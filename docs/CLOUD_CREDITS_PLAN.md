# SpringBloom Cloud Credits — Future Implementation Plan

## Discussed: May 2026

### The Model (like Lovable)
Cloud Credits are a SEPARATE, REFILLABLE balance from subscription credits.
Subscription credits = AI generation usage
Cloud Credits = infrastructure costs (compute, storage, egress, email)

### Pricing Structure
User buys $20 Cloud Credits → 70% ($14) real infra value, 30% ($6) SpringBloom margin
"Free" $10 Cloud Credits gift → real cost to us $7, user perceives $10

### What Cloud Credits Pay For
- Supabase Micro compute: ~$10/month per project (ALWAYS-ON, not per-request)
  - Billed hourly: $0.01344/hr × 24 × 30 = ~$10/month
  - NOT triggered by DB queries — runs 24/7 like a VPS
  - 8 GB storage included, $0.125/GB over
  - 250 GB egress included, $0.09/GB over
  - 100k MAU auth included
- Resend email: shared SpringBloom account OR user's own key
  - Free: 3,000 emails/month
  - Pro: $20/month for 50,000 emails, $0.90/1k over

### Supabase Pro Plan Required (when we implement managed cloud)
- $25/month for the org (one-time)
- Includes $10 compute credit (covers ONE project)
- Each user project = $10/month on top
- Spend cap does NOT cover compute — always billed

### Implementation Phases
Phase 1 (NOW): BYOK — user connects own Supabase, pays their own infra costs
Phase 2 (10+ paying users): SpringBloom Cloud as Pro+ feature
  - We provision the project under our org
  - User's Cloud Credits balance pays us $10/month
  - We pay Supabase directly
  - If balance hits $0 → pause project via Management API → email user to top up
Phase 3 (scale): Give $25/month free Cloud Credits like Lovable
  - Free Micro compute covered → no barrier to publishing

### Cost Reality per Starter User ($19/month plan)
Supabase compute: $10.00
Org share ($25÷50 users): $0.50
Resend share: $0.40
AI credits avg: $2.00
Infra/Vercel: $0.50
Total cost: $13.40
Gross margin: $5.60 (29%)

### Key Insight
Compute is ALWAYS-ON infrastructure, not pay-per-use.
This is why free tier must be BYOK — we cannot absorb $10/user/month with no revenue.
