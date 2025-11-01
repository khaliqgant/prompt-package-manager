# PRPM+ Pricing Strategy

## Executive Summary

**Goal**: Market penetration and user acquisition at scale
**Strategy**: Aggressive $5/month pricing with organization subsidies
**Target**: 1,000+ subscribers in 3 months, 10,000+ in 12 months

---

## Pricing Tiers

### Individual Users

```
┌─────────────────────────────────────────────────┐
│ PRPM+ Individual - $5/month                     │
├─────────────────────────────────────────────────┤
│ • 200 credits/month                             │
│ • Rollover up to 200 credits (1 month)          │
│ • All AI models (Sonnet, Opus, GPT-4o, etc.)    │
│ • Community support                             │
│ • Priority queue                                │
│                                                  │
│ Value: $0.025/credit (50% cheaper than packs)   │
└─────────────────────────────────────────────────┘
```

### Organization Members

```
┌─────────────────────────────────────────────────┐
│ PRPM+ Team Member - $2/month ⭐ 60% OFF         │
├─────────────────────────────────────────────────┤
│ • 200 credits/month                             │
│ • Rollover up to 200 credits                    │
│ • All AI models                                 │
│ • Priority support                              │
│ • Organization badge                            │
│ • Shared team library                           │
│                                                  │
│ Requires: Member of verified organization       │
│ Value: $0.01/credit (5x cheaper than packs!)    │
└─────────────────────────────────────────────────┘
```

### Organization Verification

```
┌─────────────────────────────────────────────────┐
│ Verified Organization - $99/month               │
├─────────────────────────────────────────────────┤
│ • Verification badge on all packages            │
│ • Team members get PRPM+ for $2/month           │
│ • Organization analytics dashboard              │
│ • Shared prompt library                         │
│ • Usage reporting & cost allocation             │
│ • Priority support for all members              │
│ • API access (future)                           │
│                                                  │
│ Break-even: 33 team members                     │
│ Sweet spot: 20-50 developers                    │
└─────────────────────────────────────────────────┘
```

---

## Value Proposition Comparison

### Individual Credit Packs (One-Time Purchase)

| Pack | Price | Credits | Per-Credit Cost | Expiry |
|------|-------|---------|-----------------|--------|
| Small | $5 | 100 | $0.05 | Never |
| Medium | $10 | 250 | $0.04 | Never |
| Large | $20 | 600 | $0.033 | Never |

### PRPM+ Subscription Value

| Plan | Price | Credits | Per-Credit Cost | Rollover |
|------|-------|---------|-----------------|----------|
| Individual | $5/mo | 200 | $0.025 | Yes (200) |
| Team Member | $2/mo | 200 | $0.01 | Yes (200) |

**Key Insight**: Subscription is 2x better value than buying small pack, and includes rollover protection.

---

## Revenue Projections

### Conservative (Year 1)

**Assumptions**:
- 500 individual subscribers
- 20 organizations (avg 15 members each)
- 5% monthly churn

**Monthly Recurring Revenue**:
```
Individual: 500 × $5 = $2,500
Org subscriptions: 20 × $99 = $1,980
Org members: 300 × $2 = $600
─────────────────────────────────
Total MRR: $5,080
Annual: ~$60,960
```

### Optimistic (Year 1)

**Assumptions**:
- 2,000 individual subscribers
- 100 organizations (avg 20 members each)
- 3% monthly churn

**Monthly Recurring Revenue**:
```
Individual: 2,000 × $5 = $10,000
Org subscriptions: 100 × $99 = $9,900
Org members: 2,000 × $2 = $4,000
─────────────────────────────────
Total MRR: $23,900
Annual: ~$286,800
```

### Enterprise Potential (Year 2)

Add premium tiers:
- **PRPM+ Pro**: $15/month (750 credits, priority support, API access)
- **PRPM+ Team**: $50/month (3000 credits shared pool, team features)

**Projected MRR (Year 2)**:
```
5,000 Individual ($5) = $25,000
1,000 Pro ($15) = $15,000
200 Organizations ($99) = $19,800
4,000 Org members ($2) = $8,000
50 Team plans ($50) = $2,500
─────────────────────────────────
Total MRR: $70,300
Annual: ~$843,600
```

---

## Pricing Psychology

### Why $5/month Works

1. **Impulse Buy Territory**
   - Lower than Netflix ($10-15)
   - Same as Spotify, Apple Music
   - Price of one coffee

2. **Better Than Buying Credits**
   - Small pack: $5 for 100 credits
   - PRPM+: $5 for 200 credits
   - **2x more value for same price**

3. **Rollover Creates FOMO**
   - "Don't cancel, you'll lose your 150 rollover credits!"
   - Increases stickiness

4. **Low Cancellation Friction**
   - $5 is "set it and forget it" pricing
   - Users unlikely to cancel to save $5

### Why $2/month for Org Members Works

1. **Team Incentive**
   - Developers tell managers about discount
   - Managers verify organization to save team money
   - Viral loop: dev → manager → team → more devs

2. **Organizations Win**
   - 20 devs × $3 saved = $60/month value
   - Organization pays $99/month
   - Net cost: $39/month for premium features
   - ROI: Analytics, shared library, branding

3. **Lock-in Effect**
   - Once team is on $2/month, switching costs are high
   - "We'd have to pay 2.5x more if we leave"

---

## Cost Structure

### Your Costs Per User

**API Costs** (per credit):
- Claude Sonnet: ~$0.003 per request (1000 tokens)
- Claude Opus: ~$0.015 per request
- GPT-4o-mini: ~$0.0001 per request
- GPT-4o: ~$0.005 per request

**Average cost per credit**: ~$0.002-0.005

**200 credits costs you**: ~$0.40-1.00

**Gross Margin**:
- Individual ($5): Revenue $5, Cost $1 = **80% margin**
- Org Member ($2): Revenue $2, Cost $1 = **50% margin**

**Stripe Fees**: 2.9% + $0.30 per transaction

---

## Competitive Pricing Comparison

| Platform | Entry Price | Credits/Features | Model Support |
|----------|-------------|------------------|---------------|
| **PRPM** | **$5/mo** | **200 credits** | **All major models** |
| ChatGPT Plus | $20/mo | Unlimited (limited GPT-4) | OpenAI only |
| Claude Pro | $20/mo | Unlimited Sonnet, limited Opus | Anthropic only |
| Cursor | $20/mo | 500 fast requests | Copilot features |
| Vellum | $300+/mo | Enterprise features | All models |
| Langfuse | Free | Limited features | All models |
| Prompt Index | Free | Unlimited (via OpenRouter) | 300+ models |

**Positioning**: Cheapest hosted solution with full features and community library.

---

## B2B2C Revenue Model

### Traditional SaaS
```
Sell to individuals: $5/month each
↓
Hard to scale
High churn (5-8%/month)
```

### PRPM Model
```
Sell to organizations: $99/month
↓
Each org brings 10-50 developers
↓
Developers get discounted access ($2/month)
↓
Lower churn (2-3%/month for orgs)
↓
Viral growth (devs invite teammates)
```

### Network Effects Flywheel

```
Developer uses PRPM ($5/month)
         ↓
Shows value to manager
         ↓
Manager verifies organization ($99/month)
         ↓
All 20 teammates get invited
         ↓
Everyone switches to $2/month
         ↓
Team publishes company prompts
         ↓
Organization becomes dependent on PRPM
         ↓
Lock-in increases, churn decreases
```

---

## Pricing Experiments to Run

### A/B Tests

1. **Annual Plans**
   - Individual: $50/year (save $10 = 2 months free)
   - Test conversion rate vs monthly

2. **Student Discount**
   - $3/month with .edu email
   - Measure adoption in universities

3. **First Month Free**
   - For users who publish a package
   - Track conversion to paid

4. **Referral Program**
   - Give 100 bonus credits for each referral
   - Both referrer and referee get credits

### Price Points to Test

| Test | Price | Credits | Hypothesis |
|------|-------|---------|------------|
| Current | $5 | 200 | Baseline |
| Lower | $3 | 150 | Higher volume, lower ARPU |
| Higher | $7 | 250 | Lower volume, higher ARPU |
| Premium | $10 | 500 | Power user tier |

**Recommendation**: Start at $5, don't change for 6 months to gather data.

---

## Grandfathering Strategy

### When Adding New Tiers (Month 6+)

**Existing $5 subscribers**:
- Stay at $5 forever (locked in)
- Market as "early adopter pricing"
- Upsell to new Pro tier ($15/month)

**Example Messaging**:
> "As an early supporter, you're locked in at $5/month forever! Want more? Upgrade to Pro for $15/month and get 750 credits + API access."

**Why This Works**:
1. Rewards early adopters
2. Creates urgency for new signups ("Lock in $5 pricing now!")
3. Enables premium tier growth without alienating existing users

---

## Revenue Optimization

### Upsell Opportunities

1. **Credit Top-Ups**
   - Offer one-time credit purchases to subscribers
   - $10 for 250 credits (on top of monthly)

2. **Team Upgrade**
   - "Invite your team and save $3/month each"

3. **Annual Switch**
   - "Switch to annual and save $10 (2 months free)"

4. **Pro Features**
   - API access: +$5/month
   - Advanced analytics: +$3/month
   - Unlimited rollover: +$2/month

### Retention Tactics

1. **Cancellation Flow**
   - "You have 150 rollover credits ($7.50 value). Cancel anyway?"
   - Offer 1 month at 50% off
   - Survey why they're leaving

2. **Usage Alerts**
   - "You've only used 45 credits this month. Want to downgrade?"
   - Builds trust, reduces involuntary churn

3. **Win-Back Campaigns**
   - Email after 30 days: "Here's 50 free credits to come back"

---

## Success Metrics

### Month 1
- [ ] 100 paid subscribers
- [ ] 5 verified organizations
- [ ] <5% churn

### Month 3
- [ ] 500 paid subscribers
- [ ] 20 verified organizations
- [ ] $5,000 MRR

### Month 6
- [ ] 1,500 paid subscribers
- [ ] 50 verified organizations
- [ ] $15,000 MRR
- [ ] Launch Pro tier

### Month 12
- [ ] 5,000 paid subscribers
- [ ] 200 verified organizations
- [ ] $50,000+ MRR
- [ ] 3-tier pricing model

---

## Action Items

### Immediate (This Week)
- [ ] Create Stripe Products for $5 and $2 plans
- [ ] Set environment variables (STRIPE_PRPM_PLUS_PRICE_ID, etc.)
- [ ] Update BuyCreditsModal to show dynamic pricing
- [ ] Add "60% OFF for org members" badge

### Short-term (Next Month)
- [ ] Implement analytics to track per-credit cost
- [ ] Build cost optimization dashboard
- [ ] Create organization admin dashboard
- [ ] Launch affiliate/referral program

### Long-term (Months 2-6)
- [ ] Test annual pricing
- [ ] Launch Pro tier ($15/month)
- [ ] Add team plan ($50/month)
- [ ] Build API access (upsell)

---

**Last Updated**: 2025-01-20
**Owner**: Product Team
**Status**: Active - Ready for Implementation
