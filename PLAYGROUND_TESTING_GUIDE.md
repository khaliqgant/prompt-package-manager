# 🧪 PRPM+ Playground - End-to-End Testing Guide

Quick guide to test the complete playground implementation.

---

## 🚀 Quick Start (5 Minutes)

### 1. Start Backend
```bash
cd packages/registry
npm run dev
# Should start on http://localhost:3111
```

### 2. Run Migration (First Time Only)
```bash
cd packages/registry
npm run migrate
# Creates playground tables and seeds initial credits
```

### 3. Start Frontend
```bash
cd packages/webapp
npm run dev
# Should start on http://localhost:5173
```

### 4. Open Browser
```bash
open http://localhost:5173/playground
# Or navigate to http://localhost:5173/playground
```

---

## ✅ Test Checklist

### Authentication (1 minute)
- [ ] Not logged in → redirects to `/login?redirect=/playground`
- [ ] Login with credentials
- [ ] Redirects back to `/playground`
- [ ] Header shows "Playground" link with "PRPM+" badge

### Credits Display (30 seconds)
- [ ] Shows "5" total credits (default for new users)
- [ ] Shows breakdown: 5 free credits
- [ ] "Buy More Credits" button visible
- [ ] Refresh button works

### Package Selection (1 minute)
- [ ] Type "prpm" in package search
- [ ] Dropdown shows packages
- [ ] Click a package
- [ ] Package name populates field
- [ ] Dropdown closes

### Playground Run (2 minutes)
- [ ] Enter text in input: "Write a hello world function in Python"
- [ ] See estimated credits appear (should be 1-2)
- [ ] "Run Playground" button enabled
- [ ] Click "Run Playground"
- [ ] Loading spinner appears
- [ ] Response appears in conversation history
- [ ] Credits deducted (now shows 3-4 credits)
- [ ] Session appears in sidebar

### Session Management (2 minutes)
- [ ] Session shows in sidebar with:
  - Package name
  - "1 runs"
  - Credits spent
  - "Just now" timestamp
- [ ] Click "New Session" button
- [ ] Conversation clears
- [ ] Click previous session in sidebar
- [ ] Conversation loads back
- [ ] Click "Share" button
- [ ] Alert shows "Share link copied to clipboard"
- [ ] Click delete button (X icon)
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Session removed from sidebar

### Buy Credits Modal (1 minute)
- [ ] Click "Buy More Credits" button
- [ ] Modal opens with 3 packages:
  - Small: $5 / 100 credits
  - Medium: $10 / 250 credits (POPULAR)
  - Large: $20 / 600 credits
- [ ] Click "Buy Now" on Medium package
- [ ] Alert shows PaymentIntent client secret
- [ ] Click OK
- [ ] Modal closes
- [ ] (In production, this would open Stripe payment form)

### Model Selection (30 seconds)
- [ ] Click "Claude Opus" button
- [ ] Button highlights in blue
- [ ] Estimated credits updates (2-3 credits for Opus)
- [ ] Switch back to "Claude Sonnet"
- [ ] Estimated credits drops to 1-2

### Error Handling (1 minute)
- [ ] Run playground 3-4 more times until credits = 0
- [ ] Credits widget shows red error: "No credits remaining"
- [ ] Try to run playground again
- [ ] Error message: "Insufficient credits. Please buy more credits to continue."
- [ ] Run button still works, but returns 402 error

### Mobile Responsive (1 minute)
- [ ] Resize browser to mobile width (< 768px)
- [ ] Layout stacks vertically
- [ ] All buttons still clickable
- [ ] No horizontal scroll
- [ ] Modal fits on screen

---

## 🔍 What to Look For

### Visual Check
- ✅ Clean, modern design
- ✅ Consistent with existing PRPM styling
- ✅ No layout shifts
- ✅ No visual glitches
- ✅ Smooth transitions
- ✅ Proper dark mode colors

### Functionality Check
- ✅ All buttons work
- ✅ No console errors
- ✅ Data persists on refresh
- ✅ Sessions load correctly
- ✅ Credits update in real-time
- ✅ Error messages are clear

### Performance Check
- ✅ Page loads < 2 seconds
- ✅ No lag when typing
- ✅ Responses appear quickly
- ✅ Smooth animations
- ✅ No memory leaks (check DevTools)

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to fetch credits"
**Cause**: Backend not running or wrong URL
**Fix**:
```bash
# Check backend is running
cd packages/registry && npm run dev

# Check NEXT_PUBLIC_REGISTRY_URL in webapp/.env
echo "NEXT_PUBLIC_REGISTRY_URL=http://localhost:3111" > packages/webapp/.env.local
```

### Issue: "Not authenticated" redirect loop
**Cause**: JWT token expired or invalid
**Fix**:
```javascript
// Open browser console and run:
localStorage.removeItem('jwt_token')
// Then login again
```

### Issue: "Package not found"
**Cause**: No packages in database
**Fix**:
```bash
# Publish a test package
cd packages/cli
prpm publish
```

### Issue: Modal doesn't close after purchase
**Cause**: Expected behavior in dev (no Stripe integration)
**Fix**: Click the X button to close manually

### Issue: Estimated credits not showing
**Cause**: Need to type at least 10 characters
**Fix**: Type more text in input field

---

## 📊 Test Data Setup

### Create Test User
```bash
# Via API
curl -X POST http://localhost:3111/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'

# Get JWT token
curl -X POST http://localhost:3111/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Add Credits Manually (If Needed)
```sql
-- Via PostgreSQL
UPDATE playground_credits
SET purchased_credits = purchased_credits + 100,
    balance = balance + 100
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Create PRPM+ User (For Testing Monthly Credits)
```sql
-- Via PostgreSQL
-- First, create an organization
INSERT INTO organizations (id, name, is_verified)
VALUES (uuid_generate_v4(), 'Test Org', true);

-- Add user to verified org
INSERT INTO organization_members (organization_id, user_id, role)
SELECT o.id, u.id, 'admin'
FROM organizations o, users u
WHERE o.name = 'Test Org' AND u.email = 'test@example.com';

-- Grant monthly credits
UPDATE playground_credits
SET monthly_credits = 200,
    monthly_reset_at = NOW() + INTERVAL '1 month',
    balance = balance + 200
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

---

## 🎯 Acceptance Criteria

### Must Pass (Critical)
- ✅ User can run a playground prompt
- ✅ Credits are deducted correctly
- ✅ Conversation history is saved
- ✅ Sessions persist across refreshes
- ✅ Buy credits modal opens
- ✅ Error handling works
- ✅ No JavaScript console errors

### Should Pass (Important)
- ✅ Mobile responsive layout
- ✅ Dark mode works
- ✅ Loading states show
- ✅ Credit estimation appears
- ✅ Package search works
- ✅ Session share/delete work

### Nice to Have (Optional)
- ⏳ Keyboard shortcuts (not implemented)
- ⏳ Markdown rendering (not implemented)
- ⏳ Streaming responses (not implemented)

---

## 🚀 Production Testing

### Before Deploying
1. **Test with real Stripe account**:
   ```bash
   # Add to .env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET_CREDITS=whsec_...
   ```

2. **Test webhook with Stripe CLI**:
   ```bash
   stripe listen --forward-to http://localhost:3111/api/v1/webhooks/stripe/credits
   stripe trigger payment_intent.succeeded
   ```

3. **Test with real Anthropic API**:
   ```bash
   # Add to .env
   ANTHROPIC_API_KEY=sk-ant-...
   AI_EVALUATION_ENABLED=true
   ```

4. **Load test** (optional):
   ```bash
   # Use k6, artillery, or similar
   k6 run load-test.js
   ```

### After Deploying
1. **Smoke test** on production URL
2. **Check error logging** (Sentry, LogRocket, etc.)
3. **Monitor API costs** (Anthropic dashboard)
4. **Check payment success rate** (Stripe dashboard)
5. **Track user engagement** (PostHog, Mixpanel, etc.)

---

## 📈 Success Metrics

### Day 1
- ✅ No JavaScript errors
- ✅ < 1% API error rate
- ✅ At least 1 successful playground run
- ✅ At least 1 successful credit purchase

### Week 1
- ✅ 10+ unique users
- ✅ 50+ playground runs
- ✅ 3-5 runs per user average
- ✅ 10-15% credit purchase conversion

### Month 1
- ✅ 100+ unique users
- ✅ 500+ playground runs
- ✅ 5+ paying customers
- ✅ 70%+ user retention (return within 7 days)

---

## 🆘 Support

### If Tests Fail
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify database migration ran successfully
4. Confirm environment variables are set
5. Try clearing browser cache/localStorage
6. Restart both backend and frontend

### If You Get Stuck
1. Read `PLAYGROUND_FRONTEND_COMPLETE.md`
2. Read `PLAYGROUND_IMPLEMENTATION_LOG.md`
3. Check API responses in Network tab
4. Verify database has correct data
5. Create a GitHub issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots
   - Browser console logs

---

## ✅ Testing Complete Checklist

Before marking testing complete:
- [ ] All "Must Pass" criteria met
- [ ] All "Should Pass" criteria met
- [ ] No console errors
- [ ] Mobile responsive works
- [ ] Dark mode works
- [ ] Documentation reviewed
- [ ] Ready for production deployment

---

**Testing Guide Created**: 2025-10-30
**Estimated Testing Time**: 10-15 minutes
**Status**: Ready to Test

Happy testing! 🧪✨
