# PRPM+ Playground - Credits System Design

**Last Updated**: 2025-10-30
**Status**: Implementation in Progress
**Implementation Date**: Night of 2025-10-30

---

## Overview

The PRPM+ Playground uses a **credits-based system** for cost control and transparent pricing. This document describes the complete credits system architecture.

---

## Credit Economics

### Credit Value
- **1 credit** = ~$0.05 USD value
- Average API cost per credit: ~$0.024
- Margin per credit: ~$0.026 (52%)

### Pricing Tiers

#### Free Users
- **5 free credits** (trial, one-time)
- No recurring credits
- Must upgrade for more

#### PRPM+ Verified ($20/month)
- **200 credits/month** included
- Credits rollover for 1 month (max 400 credits)
- Resets on subscription anniversary
- Worth $10 in playground value

#### Additional Credit Purchases
| Package | Credits | Price | Bonus | Per Credit |
|---------|---------|-------|-------|------------|
| Small | 100 | $5 | 0% | $0.050 |
| Medium | 250 | $10 | 25% | $0.040 |
| Large | 600 | $20 | 50% | $0.033 |

### Credit Costs by Operation

| Operation | Credits | Avg Tokens | Model | Description |
|-----------|---------|------------|-------|-------------|
| **Basic Run** | 1 | ~2,000 | Sonnet | Simple prompt test |
| **Medium Run** | 2 | ~5,000 | Sonnet | Longer conversation |
| **Large Run** | 3 | ~10,000 | Sonnet | Complex generation |
| **Opus Run** | 3 | ~2,000 | Opus | Premium model |
| **Continue** | 1 | ~2,000 | Same | Follow-up message |
| **Save Session** | 0 | - | - | Free (PRPM+ only) |
| **Share Session** | 0 | - | - | Free (PRPM+ only) |

---

## Database Schema

### New Tables

```sql
-- Credits balance and transactions
CREATE TABLE playground_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Balance
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0, -- Total ever earned
  lifetime_spent INTEGER NOT NULL DEFAULT 0,  -- Total ever spent
  lifetime_purchased INTEGER NOT NULL DEFAULT 0, -- Total purchased

  -- PRPM+ monthly credits
  monthly_credits INTEGER NOT NULL DEFAULT 0, -- Current month allocation
  monthly_credits_used INTEGER NOT NULL DEFAULT 0,
  monthly_reset_at TIMESTAMP WITH TIME ZONE,

  -- Rollover (max 1 month)
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  rollover_expires_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_credits_user ON playground_credits(user_id);
CREATE INDEX idx_playground_credits_org ON playground_credits(org_id);
CREATE INDEX idx_playground_credits_monthly_reset ON playground_credits(monthly_reset_at)
  WHERE monthly_reset_at IS NOT NULL;

-- Credit transaction history
CREATE TABLE playground_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Transaction details
  amount INTEGER NOT NULL, -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'earn', 'spend', 'purchase', 'monthly', 'rollover', 'expire'

  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Related entities
  session_id UUID REFERENCES playground_sessions(id) ON DELETE SET NULL,
  purchase_id VARCHAR(255), -- Stripe payment intent ID

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_credit_tx_user ON playground_credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_playground_credit_tx_type ON playground_credit_transactions(transaction_type);
CREATE INDEX idx_playground_credit_tx_purchase ON playground_credit_transactions(purchase_id) WHERE purchase_id IS NOT NULL;

-- Credit purchases (Stripe integration)
CREATE TABLE playground_credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Purchase details
  credits INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL, -- Price in cents
  currency VARCHAR(3) DEFAULT 'usd',

  -- Stripe data
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_status VARCHAR(50), -- 'pending', 'succeeded', 'failed', 'refunded'

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_playground_credit_purchases_user ON playground_credit_purchases(user_id, created_at DESC);
CREATE INDEX idx_playground_credit_purchases_stripe ON playground_credit_purchases(stripe_payment_intent_id);

-- Update existing playground_sessions table
ALTER TABLE playground_sessions ADD COLUMN credits_spent INTEGER DEFAULT 1;
ALTER TABLE playground_sessions ADD COLUMN estimated_tokens INTEGER DEFAULT 2000;

-- Update existing playground_usage table
ALTER TABLE playground_usage ADD COLUMN credits_spent INTEGER DEFAULT 1;
```

---

## Credit Flow Logic

### 1. New User Flow
```
User signs up →
Gets 5 free credits automatically →
playground_credits row created →
Can try playground 5 times
```

### 2. PRPM+ Subscription Flow
```
User subscribes to PRPM+ →
Stripe webhook received →
Add 200 monthly credits →
Set monthly_reset_at = now() + 1 month →
User gets 200 credits immediately
```

### 3. Monthly Reset Flow (Cron Job)
```
Every day at midnight UTC:
→ Find all users where monthly_reset_at < now()
→ Calculate rollover: min(current_balance, monthly_credits)
→ Reset monthly_credits_used = 0
→ Set rollover_credits = calculated amount
→ Set rollover_expires_at = now() + 1 month
→ Set monthly_reset_at = now() + 1 month
→ Log transaction: type='monthly', amount=200
```

### 4. Purchase Credits Flow
```
User clicks "Buy Credits" →
Select package (100, 250, or 600 credits) →
Stripe checkout →
Payment succeeds →
Webhook received →
Add credits to balance →
Log transaction: type='purchase', purchase_id=<stripe_id>
```

### 5. Spend Credits Flow
```
User runs playground →
Check balance ≥ cost →
Deduct credits →
Run AI model →
Log transaction: type='spend', amount=-<cost>, session_id=<session>
```

### 6. Credit Priority (Spending Order)
When deducting credits, spend in this order:
1. **Monthly credits** (use current month's allocation first)
2. **Rollover credits** (use last month's rollover next)
3. **Purchased credits** (use purchased credits last - they never expire)

---

## API Endpoints

### Credits Management

```typescript
// GET /api/v1/playground/credits
// Get current user's credit balance
interface CreditBalanceResponse {
  balance: number;
  monthly: {
    allocated: number;
    used: number;
    remaining: number;
    resetAt: string; // ISO timestamp
  };
  rollover: {
    amount: number;
    expiresAt: string | null;
  };
  purchased: number;
  breakdown: {
    monthly: number;
    rollover: number;
    purchased: number;
  };
}

// GET /api/v1/playground/credits/history
// Get credit transaction history
interface CreditHistoryResponse {
  transactions: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// POST /api/v1/playground/credits/purchase
// Initiate credit purchase
interface PurchaseCreditRequest {
  package: 'small' | 'medium' | 'large'; // 100, 250, or 600 credits
}

interface PurchaseCreditResponse {
  clientSecret: string; // Stripe client secret
  credits: number;
  price: number;
}

// POST /api/v1/playground/credits/estimate
// Estimate credit cost before running
interface EstimateCreditRequest {
  packageId: string;
  userInput: string;
  model?: 'sonnet' | 'opus';
}

interface EstimateCreditResponse {
  estimatedCredits: number;
  estimatedTokens: number;
  model: string;
  canAfford: boolean;
}
```

### Playground Execution

```typescript
// POST /api/v1/playground/run
interface PlaygroundRunRequest {
  packageId: string;
  packageVersion?: string;
  userInput: string;
  conversationId?: string;
  model?: 'sonnet' | 'opus';
}

interface PlaygroundRunResponse {
  id: string;
  response: string;
  conversationId: string;

  // Credit info
  creditsSpent: number;
  creditsRemaining: number;
  tokensUsed: number;

  // Timing
  durationMs: number;
  model: string;
}

// Response when insufficient credits:
{
  error: 'insufficient_credits',
  message: 'Not enough credits. Need 3 credits but have 2.',
  required: 3,
  available: 2,
  purchaseUrl: '/playground/credits/buy'
}
```

---

## Frontend Components

### Credit Balance Display

```typescript
// packages/webapp/src/components/Playground/CreditBalance.tsx
interface CreditBalanceProps {
  balance: number;
  breakdown: {
    monthly: number;
    rollover: number;
    purchased: number;
  };
  onBuyCredits: () => void;
}

// Shows in playground header:
// "💰 42 credits | Monthly: 158 | Rollover: 0 | Purchased: 42"
```

### Credit Cost Estimator

```typescript
// packages/webapp/src/components/Playground/CreditEstimator.tsx
interface CreditEstimatorProps {
  estimatedCost: number;
  userBalance: number;
  onRunAnyway: () => void;
}

// Shows before running:
// "This will cost ~3 credits. You have 42 credits remaining."
```

### Buy Credits Modal

```typescript
// packages/webapp/src/components/Playground/BuyCreditsModal.tsx
interface BuyCreditsModalProps {
  isOpen: boolean;
  currentBalance: number;
  onClose: () => void;
  onPurchaseComplete: (credits: number) => void;
}

// Shows packages:
// - 100 credits for $5 (best for trying out)
// - 250 credits for $10 (most popular) +25% bonus
// - 600 credits for $20 (best value) +50% bonus
```

### Credit History

```typescript
// packages/webapp/src/components/Playground/CreditHistory.tsx
// Table showing all credit transactions:
// - Date | Type | Amount | Balance | Description
// - Filter by type (earned, spent, purchased)
// - Export to CSV
```

---

## Business Logic

### Credits Service

```typescript
// packages/registry/src/services/credits.ts
class CreditsService {
  // Initialize credits for new user
  async initializeCredits(userId: string): Promise<void> {
    // Give 5 free trial credits
  }

  // Get user's current balance
  async getBalance(userId: string): Promise<CreditBalance> {
    // Returns breakdown of monthly, rollover, purchased
  }

  // Check if user can afford operation
  async canAfford(userId: string, credits: number): Promise<boolean> {
    // Quick check without transaction
  }

  // Spend credits (atomic transaction)
  async spendCredits(
    userId: string,
    credits: number,
    sessionId: string,
    description: string
  ): Promise<Transaction> {
    // 1. Start DB transaction
    // 2. Lock user's credit row (FOR UPDATE)
    // 3. Check balance >= credits
    // 4. Deduct in priority order (monthly, rollover, purchased)
    // 5. Create transaction log
    // 6. Commit
  }

  // Add credits (from purchase or subscription)
  async addCredits(
    userId: string,
    credits: number,
    type: 'purchase' | 'monthly' | 'bonus',
    metadata: any
  ): Promise<Transaction> {
    // Add credits and log transaction
  }

  // Process monthly reset (cron job)
  async processMonthlyReset(): Promise<void> {
    // Find all users needing reset
    // Calculate rollover
    // Reset monthly allocation
    // Log transactions
  }

  // Handle subscription cancellation
  async handleSubscriptionEnd(userId: string): Promise<void> {
    // Keep existing credits
    // Stop monthly allocations
    // Set monthly_reset_at = null
  }
}
```

### Estimation Logic

```typescript
// packages/registry/src/services/playground.ts
class PlaygroundService {
  estimateCredits(
    promptLength: number,
    userInputLength: number,
    model: 'sonnet' | 'opus',
    conversationHistory?: Message[]
  ): number {
    // Calculate total tokens
    const historyTokens = conversationHistory
      ? conversationHistory.reduce((sum, msg) => sum + msg.content.length / 4, 0)
      : 0;

    const totalTokens = (promptLength + userInputLength + historyTokens) / 4 * 1.3; // Conservative estimate

    // Token ranges to credit cost
    if (model === 'opus') return 3; // Opus always costs 3
    if (totalTokens < 2500) return 1;
    if (totalTokens < 6000) return 2;
    return 3;
  }
}
```

---

## Stripe Integration

### Purchase Flow

```typescript
// packages/registry/src/routes/playground-credits.ts
server.post('/credits/purchase', async (request, reply) => {
  const { package: pkg } = request.body;
  const userId = request.user.id;

  const packages = {
    small: { credits: 100, price: 500 },   // $5.00
    medium: { credits: 250, price: 1000 }, // $10.00
    large: { credits: 600, price: 2000 },  // $20.00
  };

  const { credits, price } = packages[pkg];

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: price,
    currency: 'usd',
    metadata: {
      userId,
      credits,
      type: 'playground_credits'
    }
  });

  // Create purchase record
  await db.query(
    `INSERT INTO playground_credit_purchases
     (user_id, credits, amount_cents, stripe_payment_intent_id, stripe_status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [userId, credits, price, paymentIntent.id]
  );

  return { clientSecret: paymentIntent.client_secret, credits, price };
});
```

### Webhook Handler

```typescript
// packages/registry/src/routes/webhooks.ts
server.post('/webhooks/stripe', async (request, reply) => {
  const event = stripe.webhooks.constructEvent(
    request.rawBody,
    request.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, credits } = paymentIntent.metadata;

    // Add credits to user balance
    await creditsService.addCredits(
      userId,
      parseInt(credits),
      'purchase',
      { stripePaymentIntentId: paymentIntent.id }
    );

    // Update purchase record
    await db.query(
      `UPDATE playground_credit_purchases
       SET stripe_status = 'succeeded', completed_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    server.log.info({ userId, credits }, 'Credits purchased successfully');
  }

  return { received: true };
});
```

---

## Cron Jobs

### Monthly Credit Reset

```typescript
// packages/registry/src/jobs/reset-monthly-credits.ts
export async function resetMonthlyCredits() {
  const users = await db.query(`
    SELECT id, user_id, balance, monthly_credits, rollover_credits
    FROM playground_credits
    WHERE monthly_reset_at < NOW()
      AND monthly_reset_at IS NOT NULL
  `);

  for (const user of users.rows) {
    // Calculate rollover (max 1 month of monthly allocation)
    const unusedMonthly = user.monthly_credits;
    const newRollover = Math.min(unusedMonthly, 200); // Max 200 rollover

    // Update credits
    await db.query(`
      UPDATE playground_credits
      SET
        monthly_credits_used = 0,
        monthly_credits = 200,
        rollover_credits = $1,
        rollover_expires_at = NOW() + INTERVAL '1 month',
        monthly_reset_at = NOW() + INTERVAL '1 month',
        updated_at = NOW()
      WHERE id = $2
    `, [newRollover, user.id]);

    // Log transaction
    await db.query(`
      INSERT INTO playground_credit_transactions
      (user_id, amount, balance_after, transaction_type, description)
      VALUES ($1, 200, $2, 'monthly', 'Monthly credits reset')
    `, [user.user_id, user.balance + 200]);
  }
}

// Run daily at midnight UTC
// crontab: 0 0 * * * node dist/jobs/reset-monthly-credits.js
```

### Expire Rollover Credits

```typescript
// packages/registry/src/jobs/expire-rollover-credits.ts
export async function expireRolloverCredits() {
  const result = await db.query(`
    UPDATE playground_credits
    SET
      balance = balance - rollover_credits,
      rollover_credits = 0,
      rollover_expires_at = NULL,
      updated_at = NOW()
    WHERE rollover_expires_at < NOW()
      AND rollover_credits > 0
    RETURNING user_id, rollover_credits
  `);

  // Log expirations
  for (const row of result.rows) {
    await db.query(`
      INSERT INTO playground_credit_transactions
      (user_id, amount, balance_after, transaction_type, description)
      SELECT $1, -$2, balance, 'expire', 'Rollover credits expired'
      FROM playground_credits WHERE user_id = $1
    `, [row.user_id, row.rollover_credits]);
  }
}

// Run daily at midnight UTC
// crontab: 5 0 * * * node dist/jobs/expire-rollover-credits.js
```

---

## UI/UX Design

### Playground Header

```
┌────────────────────────────────────────────────────────┐
│  PRPM+ Playground                                       │
│                                                         │
│  💰 42 credits remaining                               │
│  • Monthly: 158/200   • Rollover: 0   • Purchased: 42 │
│  [Buy More Credits]                                    │
└────────────────────────────────────────────────────────┘
```

### Before Running

```
┌────────────────────────────────────────────────────────┐
│  Estimated cost: 1 credit (~2,000 tokens)              │
│  You have 42 credits remaining after this run.        │
│                                                         │
│  [▶ Run Playground (1 credit)]                        │
└────────────────────────────────────────────────────────┘
```

### Insufficient Credits

```
┌────────────────────────────────────────────────────────┐
│  ⚠️ Not Enough Credits                                 │
│                                                         │
│  This operation requires 3 credits, but you only      │
│  have 2 credits remaining.                            │
│                                                         │
│  [Buy More Credits]  [Cancel]                         │
└────────────────────────────────────────────────────────┘
```

### Buy Credits Modal

```
┌────────────────────────────────────────────────────────┐
│  💰 Buy Playground Credits                             │
│                                                         │
│  Current balance: 2 credits                           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 💵 Small Pack                           $5.00    │ │
│  │ 100 credits                                      │ │
│  │ Best for: Trying out the playground              │ │
│  │ [Purchase]                                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 💰 Medium Pack                         $10.00    │ │
│  │ 250 credits (25% bonus!)               ⭐ Popular│ │
│  │ Best for: Regular playground users               │ │
│  │ [Purchase]                                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🎁 Large Pack                          $20.00    │ │
│  │ 600 credits (50% bonus!)               🔥 Best  │ │
│  │ Best for: Power users & heavy testing            │ │
│  │ [Purchase]                                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  💡 PRPM+ members get 200 credits/month included!     │
│  [Learn More About PRPM+]                             │
└────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Unit Tests
- [ ] Credits service: deduct credits in correct priority order
- [ ] Credits service: handle insufficient credits
- [ ] Credits service: monthly reset logic
- [ ] Credits service: rollover calculation
- [ ] Estimation: calculate credits from tokens correctly
- [ ] Transaction logging: all operations create logs

### Integration Tests
- [ ] Purchase credits flow (Stripe mock)
- [ ] Spend credits flow
- [ ] Monthly reset cron job
- [ ] Expire rollover cron job
- [ ] Subscription webhook handling

### E2E Tests
- [ ] New user gets 5 free credits
- [ ] Run playground and credits deducted
- [ ] Purchase credits and receive them
- [ ] PRPM+ subscription grants 200 credits
- [ ] Monthly reset works correctly
- [ ] Insufficient credits shows modal

---

## Monitoring & Alerts

### Metrics to Track
- **Credits issued** (by type: free, monthly, purchased)
- **Credits spent** (by model, operation type)
- **Purchase conversion** (users who buy credits)
- **Credit balance distribution** (how many users at each level)
- **Average credits per run** (track costs)

### Alerts
- ⚠️ **High API costs**: If daily Anthropic spend > $100
- ⚠️ **Purchase failures**: If Stripe payment fails
- ⚠️ **Low balances**: If >10% of PRPM+ users have <10 credits
- ⚠️ **Cron failures**: If monthly reset job fails

---

## Migration Plan

### Phase 1: Database Setup
1. Create new tables (credits, transactions, purchases)
2. Backfill existing users with 5 free credits
3. Backfill PRPM+ users with 200 monthly credits

### Phase 2: Backend Implementation
1. Credits service
2. API endpoints
3. Stripe integration
4. Cron jobs

### Phase 3: Frontend Implementation
1. Credit balance display
2. Buy credits modal
3. Insufficient credits UI
4. Credit history page

### Phase 4: Testing & Launch
1. Beta test with 10 verified orgs
2. Monitor costs closely
3. Adjust credit costs if needed
4. Full launch

---

## FAQs

### What happens to unused monthly credits?
They rollover for 1 month (max 200 credits rollover).

### Do purchased credits expire?
No, purchased credits never expire.

### Can I gift credits to another user?
Not in MVP, but planned for future.

### What if I cancel PRPM+?
You keep all purchased credits and rollover credits. Monthly allocations stop.

### Can organizations share credits?
Not in MVP, but planned for Enterprise tier.

### What's the refund policy?
Purchased credits are non-refundable per ToS. PRPM+ subscription follows standard refund policy.

---

**Implementation Status**: In Progress
**Target Launch**: 2-3 weeks
**Owner**: Engineering Team
