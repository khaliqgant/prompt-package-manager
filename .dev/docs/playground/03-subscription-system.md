# PRPM+ Subscription System

## Overview

PRPM+ offers a **two-tier subscription model**:
1. **Individual** - $5/month for solo developers
2. **Team Member** - $2/month for verified organization members (60% discount)

**Key Innovation**: Organizations subsidize their developers' access, creating a B2B2C revenue model.

---

## Architecture

### Database Schema

#### User Subscription Fields

Added to `users` table:

```sql
-- Stripe integration
stripe_customer_id VARCHAR(255) UNIQUE,

-- PRPM+ subscription
prpm_plus_subscription_id VARCHAR(255) UNIQUE,
prpm_plus_status VARCHAR(50),
prpm_plus_cancel_at_period_end BOOLEAN DEFAULT FALSE,
prpm_plus_current_period_end TIMESTAMP WITH TIME ZONE
```

**Subscription Statuses**:
- `active` - Subscription is active, user has access
- `past_due` - Payment failed, grace period
- `canceled` - Subscription cancelled, no access
- `incomplete` - Payment setup incomplete
- `incomplete_expired` - Setup expired
- `trialing` - In trial period
- `unpaid` - Payment failed, suspended

#### Organization Subscription Fields

Already exists from org verification feature:

```sql
-- In organizations table
stripe_customer_id VARCHAR(255) UNIQUE,
subscription_status VARCHAR(50),
subscription_plan VARCHAR(50),
subscription_cancel_at_period_end BOOLEAN,
subscription_end_date TIMESTAMP WITH TIME ZONE,
is_verified BOOLEAN DEFAULT FALSE
```

---

## Subscription Flow

### Individual Subscription

**1. User Clicks "Upgrade to PRPM+"**

```typescript
// Frontend: BuyCreditsModal.tsx
const handleSubscribe = async () => {
  const token = localStorage.getItem('prpm_token')
  const result = await subscribeToPRPMPlus(
    token,
    `${window.location.origin}/playground?subscription=success`,
    `${window.location.origin}/playground?subscription=cancelled`
  )

  // Redirect to Stripe Checkout
  window.location.href = result.checkoutUrl
}
```

**2. Backend Creates Checkout Session**

```typescript
// Backend checks if user is in verified org
const orgMemberResult = await server.pg.query(
  `SELECT o.id, o.name
   FROM organization_members om
   JOIN organizations o ON om.org_id = o.id
   WHERE om.user_id = $1 AND o.is_verified = TRUE
   LIMIT 1`,
  [userId]
)

const isVerifiedOrgMember = orgMemberResult.rows.length > 0

// Select price based on membership
const priceId = isVerifiedOrgMember
  ? process.env.STRIPE_PRPM_PLUS_ORG_MEMBER_PRICE_ID  // $2/month
  : process.env.STRIPE_PRPM_PLUS_PRICE_ID             // $5/month

// Create Stripe checkout
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url,
  cancel_url,
  metadata: {
    userId,
    orgId: orgId || '',
    type: 'prpm_plus_subscription',
    planType: isVerifiedOrgMember ? 'prpm_plus_org_member' : 'prpm_plus_individual'
  }
})
```

**3. User Completes Payment on Stripe**

Redirected to Stripe Checkout page, enters payment details.

**4. Stripe Webhook Activates Subscription**

```typescript
// Webhook: customer.subscription.created
case 'customer.subscription.created':
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription

  if (subscription.metadata.type === 'prpm_plus') {
    const userId = subscription.metadata.userId

    // Update user subscription status
    await server.pg.query(
      `UPDATE users
       SET
         prpm_plus_subscription_id = $1,
         prpm_plus_status = $2,
         prpm_plus_cancel_at_period_end = $3,
         prpm_plus_current_period_end = to_timestamp($4)
       WHERE id = $5`,
      [
        subscription.id,
        subscription.status,
        subscription.cancel_at_period_end,
        subscription.current_period_end,
        userId
      ]
    )

    // Grant 200 monthly credits
    if (subscription.status === 'active') {
      const periodEnd = new Date(subscription.current_period_end * 1000)

      await server.pg.query(
        `INSERT INTO playground_credits (user_id, monthly_credits, monthly_reset_at, balance, lifetime_earned)
         VALUES ($1, 200, $2, 200, 200)
         ON CONFLICT (user_id)
         DO UPDATE SET
           monthly_credits = 200,
           monthly_reset_at = $2,
           balance = playground_credits.balance + (200 - playground_credits.monthly_credits + playground_credits.monthly_credits_used),
           monthly_credits_used = 0,
           lifetime_earned = playground_credits.lifetime_earned + 200`,
        [userId, periodEnd]
      )

      // Log transaction
      await server.pg.query(
        `INSERT INTO playground_credit_transactions (user_id, amount, balance_after, transaction_type, description, metadata)
         SELECT $1, 200, balance, 'monthly', 'PRPM+ monthly credits', $2
         FROM playground_credits WHERE user_id = $1`,
        [userId, JSON.stringify({ subscriptionId: subscription.id })]
      )
    }
  }
}
```

**5. User Redirected Back to PRPM**

Success URL: `/playground?subscription=success`

Show confirmation message:
```
✅ Welcome to PRPM+!

You now have:
• 200 monthly credits
• Access to all AI models
• Priority support

Your credits have been added. Start testing!

[Go to Playground]
```

---

### Organization Member Subscription

**Flow is identical, but**:

1. **Price Detection** - Backend detects org membership:
```sql
SELECT o.id, o.is_verified
FROM organization_members om
JOIN organizations o ON om.org_id = o.id
WHERE om.user_id = $1 AND o.is_verified = TRUE
```

2. **Discounted Price** - Uses `STRIPE_PRPM_PLUS_ORG_MEMBER_PRICE_ID` ($2/month)

3. **UI Shows Discount**:
```
🎉 Team Member Pricing!

As a member of Acme Corp, you get:
• 60% OFF - Just $2/month (normally $5)
• Same 200 monthly credits
• Priority team support

[Subscribe for $2/month]
```

---

## Credit Management

### Monthly Credit Allocation

When subscription becomes `active`:

```typescript
// Grant 200 credits immediately
INSERT INTO playground_credits (
  user_id,
  monthly_credits,
  monthly_credits_used,
  monthly_reset_at,
  balance,
  lifetime_earned
) VALUES (
  $userId,
  200,           // Monthly allocation
  0,             // None used yet
  $periodEnd,    // Reset at end of billing period
  200,           // Current balance
  200            // Track total earned
)
```

### Monthly Reset

Handled by cron job: `playground-credits-reset.ts`

```typescript
// Run daily, check for expired periods
const expiredResult = await server.pg.query(
  `SELECT user_id, monthly_credits, monthly_credits_used
   FROM playground_credits
   WHERE monthly_reset_at <= NOW() AND monthly_credits > 0`
)

for (const user of expiredResult.rows) {
  const unused = user.monthly_credits - user.monthly_credits_used
  const rollover = Math.min(unused, 200) // Max 200 rollover

  await server.pg.query(
    `UPDATE playground_credits
     SET
       monthly_credits_used = 0,
       monthly_reset_at = monthly_reset_at + INTERVAL '1 month',
       rollover_credits = $1,
       rollover_expires_at = NOW() + INTERVAL '1 month',
       balance = monthly_credits + $1 + purchased_credits
     WHERE user_id = $2`,
    [rollover, user.user_id]
  )

  // Log rollover
  if (rollover > 0) {
    await logTransaction(user.user_id, rollover, 'rollover',
      `${rollover} unused credits rolled over`)
  }
}
```

### Credit Spending Priority

When user spends credits:

```typescript
// Spend in this order:
// 1. Monthly credits (use it or lose it)
// 2. Rollover credits (expire after 1 month)
// 3. Purchased credits (never expire)

async spendCredits(userId: string, amount: number) {
  const balance = await this.getBalance(userId)

  // Calculate how much from each pool
  let fromMonthly = Math.min(amount, balance.monthly.remaining)
  let remaining = amount - fromMonthly

  let fromRollover = Math.min(remaining, balance.rollover.amount)
  remaining -= fromRollover

  let fromPurchased = remaining

  // Update database
  await this.db.query(
    `UPDATE playground_credits
     SET
       monthly_credits_used = monthly_credits_used + $1,
       rollover_credits = rollover_credits - $2,
       purchased_credits = purchased_credits - $3,
       balance = balance - $4,
       lifetime_spent = lifetime_spent + $4
     WHERE user_id = $5`,
    [fromMonthly, fromRollover, fromPurchased, amount, userId]
  )
}
```

---

## Cancellation Flow

### User-Initiated Cancellation

**1. User Clicks "Cancel Subscription"**

```typescript
// Frontend
const handleCancel = async () => {
  if (confirm('Are you sure? You have 150 rollover credits ($7.50 value)')) {
    await cancelPRPMPlus(token)
  }
}
```

**2. Backend Cancels at Period End**

```typescript
// POST /api/v1/playground/subscription/cancel
const subscriptionId = userResult.rows[0]?.prpm_plus_subscription_id

// Cancel at period end (not immediately)
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true
})

// Update database
await server.pg.query(
  'UPDATE users SET prpm_plus_cancel_at_period_end = TRUE WHERE id = $1',
  [userId]
)
```

**3. User Keeps Access Until Period End**

Shows banner:
```
⚠️  Subscription Cancelling

Your PRPM+ will end on Feb 15, 2025.
You'll keep access and credits until then.

Changed your mind? [Reactivate Subscription]
```

**4. Webhook Handles Cancellation**

```typescript
// Webhook: customer.subscription.deleted
case 'customer.subscription.deleted': {
  const subscription = event.data.object
  const userId = subscription.metadata.userId

  // Update status
  await server.pg.query(
    `UPDATE users
     SET prpm_plus_status = 'canceled',
         prpm_plus_cancel_at_period_end = FALSE
     WHERE id = $1`,
    [userId]
  )

  // Remove monthly credits allocation
  // But keep rollover and purchased credits!
  await server.pg.query(
    `UPDATE playground_credits
     SET
       monthly_credits = 0,
       monthly_credits_used = 0,
       monthly_reset_at = NULL,
       balance = rollover_credits + purchased_credits
     WHERE user_id = $1`,
    [userId]
  )
}
```

---

## Customer Portal Integration

### Access Stripe Portal

**Endpoint**: `POST /api/v1/playground/subscription/portal`

**Request**:
```json
{
  "returnUrl": "https://prpm.dev/playground"
}
```

**Response**:
```json
{
  "portalUrl": "https://billing.stripe.com/session/..."
}
```

**Frontend**:
```typescript
const handleManageSubscription = async () => {
  const result = await getStripePortalUrl(
    token,
    window.location.href
  )

  // Redirect to Stripe Portal
  window.location.href = result.portalUrl
}
```

**In Stripe Portal, users can**:
- Update payment method
- View invoices
- Cancel subscription
- Update billing address
- Download receipts

---

## Pricing Detection API

### Get User's Pricing

**Endpoint**: `GET /api/v1/playground/pricing`

**Purpose**: Show dynamic pricing in UI

**Response**:
```json
{
  "price": 2.00,
  "currency": "USD",
  "interval": "month",
  "credits": 200,
  "isOrgMember": true,
  "orgName": "Acme Corp",
  "discount": 60
}
```

**Frontend Usage**:
```typescript
const [pricing, setPricing] = useState(null)

useEffect(() => {
  const fetchPricing = async () => {
    const token = localStorage.getItem('prpm_token')
    const data = await getPRPMPlusPricing(token)
    setPricing(data)
  }
  fetchPricing()
}, [])

// In UI
{pricing?.isOrgMember && (
  <div className="bg-green-50 border-green-500">
    <span className="badge">60% OFF</span>
    <h4>Team Member - ${pricing.price}/month</h4>
    <p>Special pricing for {pricing.orgName} members!</p>
  </div>
)}
```

---

## Environment Variables

### Stripe Configuration

```bash
# Core Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PRPM+ Products
STRIPE_PRPM_PLUS_PRICE_ID=price_xxxxx           # $5/month individual
STRIPE_PRPM_PLUS_ORG_MEMBER_PRICE_ID=price_yyy  # $2/month org member

# Optional: Credits webhook
STRIPE_WEBHOOK_SECRET_CREDITS=whsec_...  # Separate webhook for credits
```

### Creating Stripe Products

**1. Create Individual Plan**:
```bash
# In Stripe Dashboard:
Products → Create Product
  Name: PRPM+ Individual
  Description: 200 monthly playground credits for individual developers

Pricing → Add Price
  Price: $5.00 USD
  Billing period: Monthly

Copy Price ID → STRIPE_PRPM_PLUS_PRICE_ID
```

**2. Create Team Member Plan**:
```bash
Products → Create Product
  Name: PRPM+ Team Member
  Description: 200 monthly playground credits for verified organization members

Pricing → Add Price
  Price: $2.00 USD
  Billing period: Monthly

Copy Price ID → STRIPE_PRPM_PLUS_ORG_MEMBER_PRICE_ID
```

---

## Subscription States

### State Diagram

```
[No Subscription]
       ↓ (user subscribes)
  [incomplete]
       ↓ (payment succeeds)
    [active] ←─────────────┐
       ↓ (payment fails)    │
  [past_due]               │
       ↓ (retries succeed)  │
       └──────────────────→─┘
       ↓ (all retries fail)
    [unpaid]
       ↓ (manual action or expires)
   [canceled]
```

### Handling Each State

**active**:
- ✅ Full access
- ✅ 200 monthly credits
- ✅ All features

**past_due**:
- ⚠️ Grace period (7 days)
- ✅ Still has access
- 🔔 Show payment warning
- 🔄 Stripe auto-retries payment

**unpaid**:
- ❌ Subscription suspended
- 🔒 No new credits
- 💾 Keep existing credits
- 📧 Email to update payment

**canceled**:
- ❌ No access
- 💰 Can still use purchased credits
- 🔄 Can resubscribe anytime

**trialing**:
- ✅ Full access
- ⏰ Trial period (7 days)
- 💳 Payment method required upfront

---

## Error Handling

### Common Errors

**1. Payment Declined**:
```typescript
if (subscription.status === 'past_due') {
  // Show warning to user
  return {
    error: 'payment_failed',
    message: 'Your payment was declined. Please update your payment method.',
    actionUrl: '/settings/billing'
  }
}
```

**2. No Payment Method**:
```typescript
if (subscription.status === 'incomplete') {
  return {
    error: 'payment_incomplete',
    message: 'Please complete payment setup to activate your subscription.',
    actionUrl: stripeCheckoutUrl
  }
}
```

**3. Organization No Longer Verified**:
```typescript
// Check on each request
const orgResult = await query(
  'SELECT is_verified FROM organizations WHERE id = $1',
  [user.org_id]
)

if (!orgResult.rows[0]?.is_verified) {
  // Upgrade user to individual pricing at next billing cycle
  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscriptionItemId,
      price: STRIPE_PRPM_PLUS_PRICE_ID  // $5/month
    }]
  })

  // Notify user
  sendEmail(user.email, 'Subscription Updated',
    'Your organization is no longer verified. Your next bill will be $5/month.')
}
```

---

## Testing

### Test Cards (Stripe)

```bash
# Successful payment
4242 4242 4242 4242

# Requires authentication (3D Secure)
4000 0027 6000 3184

# Declined card
4000 0000 0000 0002

# Insufficient funds
4000 0000 0000 9995
```

### Test Webhooks Locally

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3111/api/v1/playground/webhooks/stripe/credits

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

---

## Metrics to Track

### Subscription Health

- **MRR** (Monthly Recurring Revenue)
- **Churn Rate** (% cancellations per month)
- **LTV** (Lifetime Value) = Avg subscription length × Price
- **CAC** (Customer Acquisition Cost)
- **Payback Period** = CAC ÷ MRR per customer

### Conversion Funnel

```
1000 visitors
  ↓ 10% → 100 signups
  ↓ 20% → 20 free trial users
  ↓ 50% → 10 paid subscribers

Conversion rate: 1%
```

### Target Metrics (Month 3)

- [ ] MRR: $5,000+
- [ ] Churn: <5% per month
- [ ] LTV: $60+ (12+ months average)
- [ ] Conversion: 2%+ (visitor → paid)

---

**Last Updated**: 2025-01-20
**Status**: Implemented, ready for Stripe configuration
**Owner**: Engineering & Product Teams
