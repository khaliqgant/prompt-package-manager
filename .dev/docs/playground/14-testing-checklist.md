# Playground Testing & Verification Checklist

**Date**: 2025-11-01
**Status**: Ready for Testing
**Related**: [12-snake-case-standardization.md](./12-snake-case-standardization.md), [13-types-package-deployment.md](./13-types-package-deployment.md)

## Overview

This document provides a comprehensive testing checklist for the PRPM+ Playground feature. All type consolidation work is complete, and the playground is ready for functional testing.

## Pre-Testing Verification ✅

### Code Verification (Completed)

- ✅ **Types Package**: Built successfully (`npm run build --workspace=@pr-pm/types`)
- ✅ **Types Published**: Available on NPM at `@pr-pm/types@0.1.15`
- ✅ **Type Imports**: Registry services import from `@pr-pm/types`
  - `playground.ts`: Imports `PlaygroundMessage`, `PlaygroundSession`, `PlaygroundRunRequest`, `PlaygroundRunResponse`
  - `playground-credits.ts`: Imports `CreditBalance`, `CreditTransaction`, `PurchaseRecord`
- ✅ **Naming Convention**: All types use snake_case (matches database)
- ✅ **Version Sync**: All packages using `^0.1.15` (webapp, registry) or `^0.1.14` (cli, registry-client)
- ✅ **No Duplicates**: No duplicate type definitions in registry services

### Type Consistency Check

**Request Types** (packages/types/src/playground.ts):
```typescript
export interface PlaygroundRunRequest {
  package_id: string;
  package_version?: string;
  input: string;
  model?: 'sonnet' | 'opus' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';
  session_id?: string;
}
```

**Response Types**:
```typescript
export interface PlaygroundRunResponse {
  session_id: string;
  response: string;
  credits_spent: number;
  credits_remaining: number;
  tokens_used: number;
  duration_ms: number;
  model: string;
  conversation: PlaygroundMessage[];
}
```

**Credit Balance**:
```typescript
export interface CreditBalance {
  balance: number;
  monthly: {
    allocated: number;
    used: number;
    remaining: number;
    reset_at: string | null;
  };
  rollover: {
    amount: number;
    expires_at: string | null;
  };
  purchased: number;
  breakdown: {
    monthly: number;
    rollover: number;
    purchased: number;
  };
}
```

---

## Functional Testing Checklist

### 1. User Credits System

#### Test: New User Receives Trial Credits
**Steps:**
1. Create a new user account
2. Navigate to Playground
3. Check credits balance

**Expected:**
- [ ] User receives 5 trial credits automatically
- [ ] Credits widget shows: `Balance: 5 credits`
- [ ] Monthly allocation: 0 (no PRPM+ subscription)
- [ ] Trial credits: 5

**API Endpoint:** `GET /api/v1/playground/credits/balance`

---

#### Test: PRPM+ User Receives Monthly Credits
**Steps:**
1. User with active PRPM+ subscription
2. Navigate to Playground
3. Check credits balance

**Expected:**
- [ ] User receives 200 monthly credits
- [ ] Credits widget shows total balance
- [ ] Monthly section shows: allocated: 200, used: 0, remaining: 200
- [ ] Reset date shown (1st of next month)

**Database Check:**
```sql
SELECT * FROM playground_credits WHERE user_id = '<user_id>';
-- monthly_credits should be 200
```

---

#### Test: Credit Balance Breakdown
**Steps:**
1. User has multiple credit types (monthly + purchased)
2. Navigate to Playground
3. View credits breakdown

**Expected:**
- [ ] Total balance = monthly + rollover + purchased
- [ ] Breakdown shows each type separately
- [ ] Expiration dates shown for rollover credits

**API Endpoint:** `GET /api/v1/playground/credits/balance`

**Example Response:**
```json
{
  "balance": 250,
  "monthly": {
    "allocated": 200,
    "used": 50,
    "remaining": 150,
    "reset_at": "2025-12-01T00:00:00Z"
  },
  "rollover": {
    "amount": 50,
    "expires_at": "2026-01-01T00:00:00Z"
  },
  "purchased": 50,
  "breakdown": {
    "monthly": 150,
    "rollover": 50,
    "purchased": 50
  }
}
```

---

### 2. Playground Execution

#### Test: Execute Prompt with Sonnet Model (Default)
**Steps:**
1. Navigate to Playground
2. Select a package (e.g., `@cursor/react-conventions`)
3. Enter user input: "How should I structure React components?"
4. Click "Run"

**Expected:**
- [ ] Loading indicator appears
- [ ] Request sent to `/api/v1/playground/run`
- [ ] Response received within 5-10 seconds
- [ ] Assistant message appears in conversation
- [ ] Credits deducted (1 credit for Sonnet)
- [ ] Credits widget updates
- [ ] Session ID generated
- [ ] Conversation history saved

**Request Payload:**
```json
{
  "package_id": "uuid",
  "input": "How should I structure React components?",
  "model": "sonnet"
}
```

**Response Check:**
```json
{
  "session_id": "uuid",
  "response": "...",
  "credits_spent": 1,
  "credits_remaining": 4,
  "tokens_used": 1234,
  "duration_ms": 3500,
  "model": "claude-3-5-sonnet-20241022",
  "conversation": [
    { "role": "user", "content": "How should I structure React components?", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "...", "tokens": 1234 }
  ]
}
```

---

#### Test: Execute with Opus Model (Higher Cost)
**Steps:**
1. User with sufficient credits (>= 3)
2. Select package
3. Choose "Opus" model from dropdown
4. Enter input and run

**Expected:**
- [ ] Credits deducted: 3 credits (Opus costs 3x Sonnet)
- [ ] Model used: `claude-3-opus-20240229`
- [ ] Response quality is higher (Opus model)

---

#### Test: Continue Existing Conversation
**Steps:**
1. Complete initial run (creates session)
2. Enter follow-up question in same session
3. Click "Run"

**Expected:**
- [ ] `session_id` included in request
- [ ] Previous conversation loaded
- [ ] Package prompt prepended to conversation
- [ ] Full conversation history sent to AI
- [ ] New messages appended to conversation
- [ ] Credits deducted for new run only

**Request Payload:**
```json
{
  "package_id": "uuid",
  "input": "Can you show an example?",
  "session_id": "existing-session-uuid",
  "model": "sonnet"
}
```

---

#### Test: Insufficient Credits Error
**Steps:**
1. User with 0 credits
2. Attempt to run playground

**Expected:**
- [ ] Request fails with HTTP 402 (Payment Required)
- [ ] Error message: "Insufficient credits"
- [ ] Shows required vs available credits
- [ ] Link to purchase credits shown

**Error Response:**
```json
{
  "error": "insufficient_credits",
  "message": "Insufficient credits. Need 1 but have 0.",
  "requiredCredits": 1,
  "availableCredits": 0,
  "purchaseUrl": "/playground/credits/buy"
}
```

---

### 3. Credit Spending Priority

#### Test: Spend Monthly Credits First
**Steps:**
1. User has: 50 monthly + 25 purchased credits
2. Run playground (costs 1 credit)

**Expected:**
- [ ] Monthly credits deducted first
- [ ] Monthly remaining: 49
- [ ] Purchased: 25 (unchanged)

**Database Check:**
```sql
SELECT * FROM playground_credits WHERE user_id = '<user_id>';
-- monthly_credits should decrease
-- purchased_credits should remain same
```

---

#### Test: Rollover After Monthly Depleted
**Steps:**
1. User has: 0 monthly + 30 rollover + 10 purchased
2. Run playground

**Expected:**
- [ ] Rollover credits deducted
- [ ] Rollover remaining: 29
- [ ] Purchased: 10 (unchanged)

---

#### Test: Purchased After Rollover Depleted
**Steps:**
1. User has: 0 monthly + 0 rollover + 15 purchased
2. Run playground

**Expected:**
- [ ] Purchased credits deducted
- [ ] Purchased remaining: 14

**Priority Order:** Monthly → Rollover → Purchased ✅

---

### 4. Rate Limiting

#### Test: Free Tier Rate Limit (5 requests/minute)
**Steps:**
1. Free user (no PRPM+ subscription)
2. Make 6 playground requests within 1 minute

**Expected:**
- [ ] First 5 requests succeed
- [ ] 6th request returns HTTP 429 (Too Many Requests)
- [ ] Error message: "Rate limit exceeded"
- [ ] Shows max requests per minute
- [ ] Headers include: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Error Response:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Maximum 5 requests per minute."
}
```

---

#### Test: PRPM+ Rate Limit (20 requests/minute)
**Steps:**
1. PRPM+ subscriber
2. Make 21 requests within 1 minute

**Expected:**
- [ ] First 20 requests succeed
- [ ] 21st request returns HTTP 429
- [ ] Message shows: "Maximum 20 requests per minute"

---

#### Test: Organization Rate Limit (100 requests/minute)
**Steps:**
1. User is member of verified organization
2. Make high volume of requests

**Expected:**
- [ ] Higher rate limit applies (100/min)
- [ ] Headers show correct limit

---

### 5. Input Validation & Security

#### Test: Empty Input Rejected
**Steps:**
1. Attempt to run with empty input field

**Expected:**
- [ ] Validation error before API call
- [ ] Or HTTP 400 from API
- [ ] Message: "User input is required"

---

#### Test: Input Length Limit (50KB)
**Steps:**
1. Enter very long input (>50,000 characters)
2. Attempt to run

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Message: "Input too long (max 50000 characters)"

---

#### Test: Input Sanitization (Null Bytes Removed)
**Steps:**
1. Enter input with null bytes: "Test\0input"
2. Run playground

**Expected:**
- [ ] Null bytes stripped before processing
- [ ] AI receives: "Testinput"
- [ ] No security issues

---

#### Test: Invalid Package ID
**Steps:**
1. Attempt to run with invalid package ID (not UUID)

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Message: "Invalid package ID"

---

### 6. Purchase Credits

#### Test: View Credit Packages
**Steps:**
1. Navigate to "Buy Credits" page/modal
2. View available packages

**Expected:**
- [ ] Shows 3 packages: Small, Medium, Large
- [ ] Each shows: credits, price, per-credit cost
- [ ] "Most Popular" badge on recommended package

**Example Packages:**
```json
[
  { "id": "small", "name": "Small Pack", "credits": 100, "price": 500 },
  { "id": "medium", "name": "Medium Pack", "credits": 500, "price": 2000, "popular": true },
  { "id": "large", "name": "Large Pack", "credits": 1000, "price": 3500 }
]
```

---

#### Test: Purchase Credits with Stripe
**Steps:**
1. Click "Buy" on a package
2. Complete Stripe checkout
3. Return to playground

**Expected:**
- [ ] Stripe checkout page opens
- [ ] Payment processed
- [ ] Webhook received: `POST /api/v1/playground/webhooks/stripe/credits`
- [ ] Credits added to user account
- [ ] Balance updates immediately
- [ ] Transaction recorded in database

**Database Check:**
```sql
SELECT * FROM playground_credit_purchases WHERE user_id = '<user_id>' ORDER BY created_at DESC LIMIT 1;
-- Should show new purchase

SELECT * FROM playground_credit_transactions WHERE user_id = '<user_id>' AND type = 'purchase';
-- Should show credit addition
```

---

#### Test: Stripe Webhook Signature Validation
**Steps:**
1. Send webhook with invalid signature

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Error: "Invalid webhook signature"
- [ ] Credits NOT added
- [ ] Security log recorded

---

### 7. Session Management

#### Test: Create New Session
**Steps:**
1. Run playground without session_id

**Expected:**
- [ ] New session created in database
- [ ] Session ID returned in response
- [ ] Session includes: user_id, package_id, conversation, timestamps

**Database Check:**
```sql
SELECT * FROM playground_sessions WHERE user_id = '<user_id>' ORDER BY created_at DESC LIMIT 1;
```

---

#### Test: Load Existing Session
**Steps:**
1. User has previous session
2. Navigate to playground
3. Select session from history

**Expected:**
- [ ] Conversation loaded
- [ ] All previous messages shown
- [ ] Can continue conversation
- [ ] Package context retained

---

#### Test: List User Sessions
**Steps:**
1. User has multiple sessions
2. View sessions list

**Expected:**
- [ ] All sessions shown
- [ ] Sorted by most recent first
- [ ] Shows: package name, last message, credits spent
- [ ] Can filter by package or date

**API Endpoint:** `GET /api/v1/playground/sessions`

---

#### Test: Session Authorization
**Steps:**
1. User A creates session
2. User B attempts to access User A's session

**Expected:**
- [ ] HTTP 403 Forbidden
- [ ] Error: "Not authorized to access this session"
- [ ] Session data not leaked

---

### 8. Share Session

#### Test: Generate Share Link
**Steps:**
1. Create a session
2. Click "Share" button
3. Generate public share link

**Expected:**
- [ ] Share token generated
- [ ] Share URL provided
- [ ] Session marked as public in database
- [ ] Share link accessible without login

**API Endpoint:** `POST /api/v1/playground/sessions/:id/share`

---

#### Test: Access Shared Session
**Steps:**
1. Open share link (logged out)

**Expected:**
- [ ] Conversation visible
- [ ] Read-only mode
- [ ] Cannot edit or continue conversation
- [ ] Shows package used
- [ ] No user info exposed

**API Endpoint:** `GET /api/v1/playground/sessions/shared/:token`

---

### 9. Model Selection

#### Test: All Models Available
**Steps:**
1. Open model dropdown

**Expected:**
- [ ] Sonnet (default)
- [ ] Opus
- [ ] GPT-4o
- [ ] GPT-4o-mini
- [ ] GPT-4 Turbo

---

#### Test: Model Persistence
**Steps:**
1. Select Opus model
2. Run playground
3. Start new conversation

**Expected:**
- [ ] Model selection persists across runs in same session
- [ ] New session defaults to Sonnet

---

#### Test: Model Cost Differences
**Steps:**
1. Check credit estimates for different models

**Expected:**
- [ ] Sonnet: 1 credit
- [ ] Opus: 3 credits
- [ ] GPT-4o: 2 credits
- [ ] Estimate shown before running

**API Endpoint:** `POST /api/v1/playground/estimate`

---

### 10. Error Handling

#### Test: Missing API Key Error
**Steps:**
1. Server has no ANTHROPIC_API_KEY configured
2. Attempt to run with Anthropic model

**Expected:**
- [ ] HTTP 500 or 400
- [ ] Clear error message
- [ ] No credit deduction
- [ ] User notified of system issue

---

#### Test: AI Service Timeout
**Steps:**
1. AI service takes >30 seconds to respond

**Expected:**
- [ ] Request times out gracefully
- [ ] User shown timeout error
- [ ] Credits refunded
- [ ] Can retry

---

#### Test: Invalid Package Version
**Steps:**
1. Request package version that doesn't exist

**Expected:**
- [ ] Falls back to latest version
- [ ] Or returns error if no versions exist
- [ ] No crash

---

### 11. Analytics & Monitoring

#### Test: Usage Logging
**Steps:**
1. Run playground multiple times
2. Check analytics dashboard

**Expected:**
- [ ] Each run logged with:
  - user_id
  - package_id
  - model
  - tokens_used
  - duration_ms
  - credits_spent
- [ ] Can query usage by date range
- [ ] Can see popular packages

**Database Table:** `playground_usage_analytics`

---

#### Test: Credit Transaction History
**Steps:**
1. User has multiple credit transactions
2. View transaction history

**Expected:**
- [ ] All transactions listed
- [ ] Shows: type, amount, balance after, timestamp
- [ ] Types include: signup, monthly, purchase, spend, rollover
- [ ] Can filter by type and date

**API Endpoint:** `GET /api/v1/playground/credits/transactions`

---

### 12. Edge Cases

#### Test: Concurrent Playground Runs (Race Condition)
**Steps:**
1. User has 5 credits
2. Open 3 tabs
3. Submit 3 playground requests simultaneously

**Expected:**
- [ ] Credits deducted atomically
- [ ] No over-spending
- [ ] If insufficient, some requests fail with 402
- [ ] Database transactions prevent race condition

---

#### Test: Package Prompt Loading
**Steps:**
1. Select package without snippet
2. Attempt to run

**Expected:**
- [ ] Error: "Package has no prompt content"
- [ ] Or falls back to default behavior
- [ ] No crash

---

#### Test: Expired Rollover Credits
**Steps:**
1. User has rollover credits with past expiration date
2. Check balance

**Expected:**
- [ ] Expired credits not shown in balance
- [ ] Automatic cleanup via cron job
- [ ] Only valid rollover credits counted

---

#### Test: Monthly Credit Reset
**Steps:**
1. Check credits on last day of month
2. Wait for first of next month (or simulate)

**Expected:**
- [ ] Unused monthly credits rolled over
- [ ] New monthly allocation added
- [ ] Reset date updated

**Cron Job:** `playground-credits-reset.ts` runs daily

---

## Frontend Testing

### Test: Credits Widget Display
**Location:** Playground page header/sidebar

**Expected:**
- [ ] Total balance shown prominently
- [ ] Breakdown available on click/hover
- [ ] Updates in real-time after run
- [ ] Link to purchase credits

---

### Test: Conversation UI
**Expected:**
- [ ] User messages aligned left (or right, depending on design)
- [ ] Assistant messages distinguished (different color/position)
- [ ] Timestamps shown
- [ ] Token count shown
- [ ] Markdown rendered correctly
- [ ] Code blocks syntax highlighted

---

### Test: Package Selection
**Expected:**
- [ ] Dropdown/search shows all accessible packages
- [ ] Shows package name and description
- [ ] Can filter by type or search
- [ ] Selected package shown clearly

---

### Test: Loading States
**Expected:**
- [ ] Loading spinner during API call
- [ ] Disable "Run" button while loading
- [ ] Streaming response (if implemented)
- [ ] Cancel button (if applicable)

---

### Test: Error Messages
**Expected:**
- [ ] Clear error messages
- [ ] Actionable next steps
- [ ] Error doesn't crash page
- [ ] Can retry after error

---

## API Testing Checklist

Use tools like Postman, curl, or automated tests.

### Endpoints to Test

1. **GET /api/v1/playground/credits/balance**
   - [ ] Returns credit balance
   - [ ] Requires authentication
   - [ ] Returns 401 if not authenticated

2. **POST /api/v1/playground/run**
   - [ ] Accepts both snake_case and camelCase fields
   - [ ] Returns snake_case response
   - [ ] Deducts credits
   - [ ] Rate limited
   - [ ] Validates input

3. **POST /api/v1/playground/estimate**
   - [ ] Returns credit estimate
   - [ ] Doesn't deduct credits
   - [ ] Fast response (<500ms)

4. **POST /api/v1/playground/credits/purchase**
   - [ ] Creates Stripe checkout session
   - [ ] Returns checkout URL
   - [ ] Rate limited (3/min)

5. **POST /api/v1/playground/webhooks/stripe/credits**
   - [ ] Verifies webhook signature
   - [ ] Adds credits on success
   - [ ] Idempotent (same webhook twice = same result)

6. **GET /api/v1/playground/sessions**
   - [ ] Lists user sessions
   - [ ] Paginated
   - [ ] Sorted by most recent

7. **POST /api/v1/playground/sessions/:id/share**
   - [ ] Generates share token
   - [ ] Marks session as public

8. **GET /api/v1/playground/sessions/shared/:token**
   - [ ] Returns public session
   - [ ] Works without authentication

---

## Performance Testing

### Load Test Scenarios

1. **Concurrent Users**
   - [ ] 10 users running playground simultaneously
   - [ ] No crashes or errors
   - [ ] Acceptable response times (<5s)

2. **Rate Limit Stress Test**
   - [ ] User hitting rate limit repeatedly
   - [ ] System handles gracefully
   - [ ] No DOS vulnerability

3. **Large Conversations**
   - [ ] Session with 50+ messages
   - [ ] Loads quickly
   - [ ] Token limits respected

---

## Security Testing

1. **Authentication**
   - [ ] All playground endpoints require auth
   - [ ] Invalid JWT rejected
   - [ ] Expired JWT rejected

2. **Authorization**
   - [ ] Cannot access other users' sessions
   - [ ] Cannot access other users' credit balances
   - [ ] Cannot purchase credits for other users

3. **Input Sanitization**
   - [ ] SQL injection attempts blocked
   - [ ] XSS attempts blocked
   - [ ] Null bytes stripped
   - [ ] Excessive input rejected

4. **Webhook Security**
   - [ ] Invalid signatures rejected
   - [ ] Replay attacks prevented (timestamp check)
   - [ ] Only valid Stripe events processed

---

## Database Testing

### Verify Schema

```sql
-- Credits table
SELECT * FROM playground_credits LIMIT 5;

-- Sessions table
SELECT * FROM playground_sessions LIMIT 5;

-- Transactions table
SELECT * FROM playground_credit_transactions LIMIT 10;

-- Purchases table
SELECT * FROM playground_credit_purchases LIMIT 5;

-- Analytics table
SELECT * FROM playground_usage_analytics LIMIT 10;
```

### Verify Indexes

```sql
-- Check indexes exist for performance
\d playground_sessions
-- Should have indexes on user_id, created_at

\d playground_credit_transactions
-- Should have indexes on user_id, created_at, type
```

---

## Integration Testing

### Test: Full User Journey
**Scenario:** New user tries playground for first time

1. [ ] User signs up
2. [ ] Receives 5 trial credits
3. [ ] Navigates to playground
4. [ ] Selects a package
5. [ ] Enters input and runs
6. [ ] Sees response
7. [ ] Credits deducted (4 remaining)
8. [ ] Continues conversation
9. [ ] Credits deducted (3 remaining)
10. [ ] Runs out of credits
11. [ ] Purchases more credits
12. [ ] Resumes playground usage

---

## Deployment Testing

### Pre-Deployment
- [ ] Types package built
- [ ] Registry built
- [ ] No TypeScript errors
- [ ] Package versions synced

### Post-Deployment
- [ ] Registry health check passes
- [ ] `/health` endpoint returns 200
- [ ] Can connect to database
- [ ] Stripe webhook endpoint accessible
- [ ] Environment variables set correctly

---

## Known Issues / Limitations

Document any known issues here:

1. **Vitest Not Installed**
   - Unit tests cannot run locally
   - Need to install vitest to run test suite
   - TypeScript compilation works fine

2. **Test Coverage**
   - Current coverage: ~40% (36 tests written)
   - Target: 80%
   - Missing: Error path tests, edge cases, E2E tests

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Run: [Date]

**Tester:** [Name]
**Environment:** [Local/Staging/Production]

### Credits System
- [ ] ✅ New user receives trial credits
- [ ] ✅ PRPM+ user receives monthly credits
- [ ] ✅ Credit balance breakdown shows correctly

### Playground Execution
- [ ] ✅ Sonnet model works
- [ ] ⚠️ Opus model - [describe issue]
- [ ] ❌ GPT-4o - [describe failure]

### Issues Found
1. [Issue description] - Severity: [High/Medium/Low]
2. ...

### Notes
[Any additional observations]
```

---

## Next Steps

After completing this checklist:

1. **Fix Any Issues Found**
   - Document in GitHub issues
   - Prioritize by severity
   - Assign to team members

2. **Add Missing Tests**
   - Install vitest
   - Write tests for failed scenarios
   - Increase coverage to 80%

3. **Performance Optimization**
   - Add caching if needed
   - Optimize database queries
   - Add monitoring/alerting

4. **Documentation**
   - Update API documentation
   - Create user guide
   - Record demo video

---

**Last Updated**: 2025-11-01
**Status**: ✅ Ready for Functional Testing
**Verified By**: AI Assistant (Claude)
