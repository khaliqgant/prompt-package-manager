# PRPM+ Technical Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│  - PlaygroundInterface.tsx (main UI)                │
│  - BuyCreditsModal.tsx (subscription)               │
│  - CreditsWidget.tsx (balance display)              │
│  - SessionsSidebar.tsx (history)                    │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────┐
│              Backend (Fastify + PostgreSQL)         │
│  - playground.ts (test execution)                   │
│  - playground-credits.ts (subscription & credits)   │
│  - analytics.ts (usage insights)                    │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼──┐    ┌───▼───┐   ┌───▼────┐
    │Anthro│    │OpenAI │   │Stripe  │
    │pic   │    │       │   │        │
    └──────┘    └───────┘   └────────┘
```

---

## Database Schema

### Core Tables

#### 1. `playground_sessions`

Stores conversation history and session metadata.

```sql
CREATE TABLE playground_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Package info
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE NOT NULL,
  package_version VARCHAR(50),
  package_name VARCHAR(255) NOT NULL,

  -- Session data
  conversation JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ role: 'user' | 'assistant', content: string, timestamp: ISO, tokens: number }]

  -- Credits and usage
  credits_spent INTEGER NOT NULL DEFAULT 1,
  estimated_tokens INTEGER DEFAULT 2000,

  -- Metadata
  model VARCHAR(50) NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  total_tokens INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  run_count INTEGER DEFAULT 1,

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(32) UNIQUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_sessions_user ON playground_sessions(user_id, created_at DESC);
CREATE INDEX idx_playground_sessions_package ON playground_sessions(package_id);
CREATE INDEX idx_playground_sessions_share ON playground_sessions(share_token) WHERE is_public = TRUE;
CREATE INDEX idx_playground_sessions_org ON playground_sessions(org_id) WHERE org_id IS NOT NULL;
```

#### 2. `playground_usage`

Tracks individual runs for analytics.

```sql
CREATE TABLE playground_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  session_id UUID REFERENCES playground_sessions(id) ON DELETE SET NULL,

  -- Usage metrics
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,

  -- Request metadata
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- Analytics fields
  package_version VARCHAR(50),
  input_length INTEGER,
  output_length INTEGER,
  comparison_mode BOOLEAN DEFAULT FALSE,

  -- Quality indicators (set via feedback API)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_helpful BOOLEAN,
  user_feedback TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_playground_usage_user_time ON playground_usage(user_id, created_at DESC);
CREATE INDEX idx_playground_usage_org_time ON playground_usage(org_id, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX idx_playground_usage_package ON playground_usage(package_id) WHERE package_id IS NOT NULL;
CREATE INDEX idx_playground_usage_model ON playground_usage(model, created_at DESC);
CREATE INDEX idx_playground_usage_package_model ON playground_usage(package_id, model) WHERE package_id IS NOT NULL;
CREATE INDEX idx_playground_usage_package_version ON playground_usage(package_id, package_version) WHERE package_id IS NOT NULL;
CREATE INDEX idx_playground_usage_success ON playground_usage(error_occurred, created_at DESC);
CREATE INDEX idx_playground_usage_rating ON playground_usage(user_rating) WHERE user_rating IS NOT NULL;
```

#### 3. `playground_credits`

Manages user credit balances.

```sql
CREATE TABLE playground_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Balance
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,

  -- PRPM+ monthly credits
  monthly_credits INTEGER NOT NULL DEFAULT 0,
  monthly_credits_used INTEGER NOT NULL DEFAULT 0,
  monthly_reset_at TIMESTAMP WITH TIME ZONE,

  -- Rollover credits (max 1 month)
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  rollover_expires_at TIMESTAMP WITH TIME ZONE,

  -- Purchased credits (never expire)
  purchased_credits INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT balance_sum_check CHECK (
    balance = (monthly_credits - monthly_credits_used) + rollover_credits + purchased_credits
  )
);
```

#### 4. `playground_credit_transactions`

Audit log of all credit changes.

```sql
CREATE TABLE playground_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Transaction details
  amount INTEGER NOT NULL,  -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  transaction_type VARCHAR(50) NOT NULL CHECK (
    transaction_type IN ('signup', 'monthly', 'purchase', 'spend', 'rollover', 'expire', 'refund', 'bonus', 'admin')
  ),

  -- Context
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Related entities
  session_id UUID REFERENCES playground_sessions(id) ON DELETE SET NULL,
  purchase_id VARCHAR(255),  -- Stripe payment intent ID

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. `playground_credit_purchases`

Tracks Stripe purchases.

```sql
CREATE TABLE playground_credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Purchase details
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) DEFAULT 'usd' NOT NULL,
  package_type VARCHAR(20) CHECK (package_type IN ('small', 'medium', 'large')),

  -- Stripe data
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_status VARCHAR(50) DEFAULT 'pending' CHECK (
    stripe_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')
  ),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,

  failure_reason TEXT
);
```

#### 6. User Subscription Fields

Added to existing `users` table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS prpm_plus_current_period_end TIMESTAMP WITH TIME ZONE;
```

---

## API Routes

### Playground Execution

**File**: `packages/registry/src/routes/playground.ts`

```typescript
POST /api/v1/playground/run
  → Execute prompt with AI model
  → Returns: conversation, credits spent, session ID

POST /api/v1/playground/estimate
  → Estimate credits needed for a test
  → Returns: estimated credits, model, cost

GET /api/v1/playground/sessions
  → List user's playground sessions
  → Returns: array of sessions with metadata

GET /api/v1/playground/session/:id
  → Get specific session details
  → Returns: full conversation, usage stats

DELETE /api/v1/playground/session/:id
  → Delete a session
```

### Credits & Subscription

**File**: `packages/registry/src/routes/playground-credits.ts`

```typescript
GET /api/v1/playground/credits
  → Get user's credit balance
  → Returns: total, monthly, rollover, purchased

GET /api/v1/playground/credits/history
  → Get credit transaction history
  → Returns: array of transactions

GET /api/v1/playground/credits/packages
  → Get available credit packages
  → Returns: small ($5/100), medium ($10/250), large ($20/600)

POST /api/v1/playground/credits/purchase
  → Purchase credits (one-time)
  → Returns: Stripe payment intent client secret

GET /api/v1/playground/pricing
  → Get user's PRPM+ pricing (individual or org member)
  → Returns: price, currency, isOrgMember, discount

POST /api/v1/playground/subscribe
  → Create PRPM+ subscription
  → Returns: Stripe checkout URL

GET /api/v1/playground/subscription
  → Get subscription status
  → Returns: isActive, status, cancelAtPeriodEnd

POST /api/v1/playground/subscription/cancel
  → Cancel subscription at period end

POST /api/v1/playground/subscription/portal
  → Get Stripe customer portal URL
  → Returns: portal URL for managing subscription

POST /api/v1/webhooks/stripe/credits
  → Handle Stripe webhooks
  → Processes: payment success, subscription updates, refunds
```

### Analytics

**File**: `packages/registry/src/routes/analytics.ts`

```typescript
GET /api/v1/analytics/package/:packageId
  → Public package analytics
  → Returns: runs, users, success rate, ratings, model breakdown

GET /api/v1/analytics/user/me
  → User's personal analytics
  → Returns: total runs, credits spent, top packages, daily activity

GET /api/v1/analytics/organization/:orgId
  → Organization analytics (admin only)
  → Returns: team activity, top packages, cost allocation

POST /api/v1/analytics/feedback
  → Submit feedback for a run
  → Body: rating, wasHelpful, feedback text
```

---

## Services Layer

### PlaygroundService

**File**: `packages/registry/src/services/playground.ts`

**Key Methods**:

```typescript
class PlaygroundService {
  // Execute prompt with AI model
  async run(request: PlaygroundRunRequest): Promise<PlaygroundRunResponse> {
    // 1. Validate request
    // 2. Fetch package prompt
    // 3. Check credit balance
    // 4. Estimate credits needed
    // 5. Call Anthropic or OpenAI API
    // 6. Save session
    // 7. Deduct credits
    // 8. Log usage for analytics
    // 9. Return results
  }

  // Estimate credits for a request
  async estimate(request: PlaygroundEstimateRequest): Promise<number> {
    // Calculate based on model and input size
    // Sonnet/Mini: 1 credit
    // GPT-4o: 2 credits
    // Opus/Turbo: 3 credits
  }

  // Create or update session
  private async createSession(data): Promise<string>
  private async updateSession(sessionId, messages, credits): Promise<void>

  // Log usage for analytics
  private async logUsage(data): Promise<void>
}
```

### PlaygroundCreditsService

**File**: `packages/registry/src/services/playground-credits.ts`

**Key Methods**:

```typescript
class PlaygroundCreditsService {
  // Get user's credit balance breakdown
  async getBalance(userId: string): Promise<CreditBalance> {
    return {
      balance: 234,
      monthly: { allocated: 200, used: 45, remaining: 155 },
      rollover: { amount: 79, expiresAt: '2025-02-15' },
      purchased: 0,
      breakdown: { monthly: 155, rollover: 79, purchased: 0 }
    }
  }

  // Spend credits (priority: monthly → rollover → purchased)
  async spendCredits(
    userId: string,
    amount: number,
    sessionId?: string,
    description?: string
  ): Promise<void>

  // Add credits (from purchase or subscription)
  async addCredits(
    userId: string,
    amount: number,
    type: 'signup' | 'monthly' | 'purchase' | 'bonus',
    description: string
  ): Promise<void>

  // Initialize credits for new user
  async initializeCredits(userId: string): Promise<void>

  // Reset monthly credits (cron job)
  async resetMonthlyCredits(): Promise<void>
}
```

---

## Frontend Components

### PlaygroundInterface

**File**: `packages/webapp/src/components/playground/PlaygroundInterface.tsx`

**Features**:
- Package selection with search
- Model selection (Sonnet, Opus, GPT-4o, etc.)
- Input textarea with credit estimation
- Conversation display
- Comparison mode (test 2 packages side-by-side)
- Mobile responsive

**Key State**:
```typescript
const [packageId, setPackageId] = useState('')
const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
const [model, setModel] = useState<'sonnet' | 'opus' | ...>('sonnet')
const [input, setInput] = useState('')
const [conversation, setConversation] = useState<PlaygroundMessage[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [comparisonMode, setComparisonMode] = useState(false)
```

### BuyCreditsModal

**File**: `packages/webapp/src/components/playground/BuyCreditsModal.tsx`

**Features**:
- Display credit packages (small, medium, large)
- Show PRPM+ subscription option
- Dynamic pricing ($5 individual, $2 org member)
- Stripe Checkout integration

**TODO**: Update to show dynamic pricing based on org membership

### CreditsWidget

**File**: `packages/webapp/src/components/playground/CreditsWidget.tsx`

**Features**:
- Display current balance
- Show breakdown (monthly, rollover, purchased)
- "Buy More" button
- Expiration warnings

---

## Credit Cost Logic

### Model Pricing

```typescript
const MODEL_CREDITS: Record<string, number> = {
  'sonnet': 1,           // Claude 3.5 Sonnet
  'opus': 3,             // Claude 3 Opus
  'gpt-4o-mini': 1,      // OpenAI GPT-4o Mini
  'gpt-4o': 2,           // OpenAI GPT-4o
  'gpt-4-turbo': 3,      // OpenAI GPT-4 Turbo
}
```

### Actual API Costs

**Anthropic**:
- Sonnet: ~$0.003 per 1K tokens (~$0.003 per request)
- Opus: ~$0.015 per 1K tokens (~$0.015 per request)

**OpenAI**:
- GPT-4o-mini: ~$0.0001 per request
- GPT-4o: ~$0.005 per request

**Your Gross Margin**:
- 1 credit = $0.025 (at $5/200)
- Cost per credit: ~$0.002-0.005
- **Margin: 80-92%**

---

## Webhook Handling

### Stripe Webhook Events

**File**: `packages/registry/src/routes/playground-credits.ts`

```typescript
// POST /api/v1/webhooks/stripe/credits

// PRPM+ Subscription Events
case 'customer.subscription.created':
case 'customer.subscription.updated':
  → Update user subscription status
  → Grant 200 monthly credits if active

case 'customer.subscription.deleted':
  → Mark subscription as canceled
  → Remove monthly credits (keep rollover/purchased)

// Credit Purchase Events
case 'payment_intent.succeeded':
  → Add purchased credits
  → Update purchase record

case 'payment_intent.payment_failed':
  → Log failure
  → Notify user

case 'charge.refunded':
  → Deduct refunded credits
  → Update purchase record
```

### Webhook Security

```typescript
// Verify webhook signature
const sig = request.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
)

// Only process verified events
if (event.type === 'customer.subscription.updated') {
  // Handle...
}
```

---

## Cron Jobs

### Monthly Credit Reset

**File**: `packages/registry/src/jobs/playground-credits-reset.ts`

**Schedule**: Daily at 2:00 AM UTC

**Logic**:
```typescript
// Find expired monthly periods
SELECT user_id, monthly_credits, monthly_credits_used
FROM playground_credits
WHERE monthly_reset_at <= NOW() AND monthly_credits > 0

// For each user:
// 1. Calculate unused credits
const unused = monthly_credits - monthly_credits_used

// 2. Rollover (max 200)
const rollover = Math.min(unused, 200)

// 3. Update credits
UPDATE playground_credits SET
  monthly_credits_used = 0,
  monthly_reset_at = monthly_reset_at + INTERVAL '1 month',
  rollover_credits = $rollover,
  rollover_expires_at = NOW() + INTERVAL '1 month',
  balance = monthly_credits + $rollover + purchased_credits
```

---

## Error Handling

### Credit Errors

```typescript
// Insufficient credits
if (balance < estimatedCredits) {
  throw new Error(`Insufficient credits. Need ${estimatedCredits} but have ${balance}`)
  // Frontend shows: "Please buy more credits"
}

// API key missing
if (!anthropic && model.startsWith('claude')) {
  throw new Error('Anthropic API key not configured')
}
```

### Subscription Errors

```typescript
// Payment failed
if (subscription.status === 'past_due') {
  return { error: 'Payment failed. Please update payment method.' }
}

// Org no longer verified
if (!org.is_verified && user.subscriptionPlan === 'org_member') {
  // Upgrade to individual pricing at next cycle
  await stripe.subscriptions.update(subId, {
    items: [{ price: INDIVIDUAL_PRICE_ID }]
  })
}
```

---

## Testing

### Local Development

```bash
# Start registry backend
cd packages/registry
npm run dev

# Start webapp frontend
cd packages/webapp
npm run dev

# Test Stripe webhooks
stripe listen --forward-to localhost:3111/api/v1/webhooks/stripe/credits
```

### Test Data

```sql
-- Create test user
INSERT INTO users (username, email) VALUES ('testuser', 'test@example.com');

-- Give test credits
INSERT INTO playground_credits (user_id, balance, purchased_credits, lifetime_earned)
VALUES ((SELECT id FROM users WHERE username = 'testuser'), 100, 100, 100);

-- Create test organization
INSERT INTO organizations (name, is_verified) VALUES ('Test Corp', TRUE);

-- Add user to org
INSERT INTO organization_members (org_id, user_id, role)
VALUES (
  (SELECT id FROM organizations WHERE name = 'Test Corp'),
  (SELECT id FROM users WHERE username = 'testuser'),
  'owner'
);
```

---

## Performance Optimization

### Database Indexes

All critical queries are indexed:
- User lookups: `idx_playground_sessions_user`
- Package analytics: `idx_playground_usage_package_model`
- Organization queries: `idx_playground_usage_org_time`

### Caching Strategy

**Current**: No caching (simple, correct)

**Future**:
- Cache package prompts (5 min TTL)
- Cache user balances (30 sec TTL)
- Cache analytics queries (5 min TTL)

### Rate Limiting

**Per user**:
- 100 tests per hour
- 500 tests per day

**Per organization**:
- 1000 tests per hour
- 10,000 tests per day

---

## Security

### Authentication

All playground endpoints require JWT:
```typescript
preHandler: server.authenticate
```

### Authorization

- Users can only access their own sessions
- Org analytics requires admin/owner role
- Public analytics are read-only

### Data Privacy

- Conversation history is private by default
- Can be shared via `share_token`
- Analytics are aggregated (no PII)

---

## Deployment Checklist

### Environment Setup

- [ ] Set `ANTHROPIC_API_KEY`
- [ ] Set `OPENAI_API_KEY`
- [ ] Set `STRIPE_SECRET_KEY`
- [ ] Set `STRIPE_PUBLISHABLE_KEY`
- [ ] Set `STRIPE_WEBHOOK_SECRET`
- [ ] Set `STRIPE_PRPM_PLUS_PRICE_ID`
- [ ] Set `STRIPE_PRPM_PLUS_ORG_MEMBER_PRICE_ID`

### Database

- [ ] Run migration 026
- [ ] Verify indexes created
- [ ] Seed initial credit packages

### Stripe

- [ ] Create PRPM+ Individual product ($5/month)
- [ ] Create PRPM+ Team Member product ($2/month)
- [ ] Configure webhooks endpoint
- [ ] Test webhook delivery

### Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Monitor Stripe webhook failures
- [ ] Track credit spend rate
- [ ] Alert on API errors

---

**Last Updated**: 2025-01-20
**Status**: Core implementation complete, analytics in progress
**Owner**: Engineering Team
