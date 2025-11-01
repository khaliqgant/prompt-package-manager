# 🎮 PRPM+ Playground - Next Steps

**Status**: Backend Complete ✅ | Frontend Pending ⏳
**Date**: 2025-10-30

---

## 🚀 Quick Start

### 1. Run the Migration

```bash
cd packages/registry
npm run migrate

# Verify tables created:
psql $DATABASE_URL -c "\dt playground*"

# Should see:
# - playground_sessions
# - playground_usage
# - playground_credits
# - playground_credit_transactions
# - playground_credit_purchases
```

### 2. Test the Backend

```bash
# Start the registry server
npm run dev

# Test credits endpoint:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/playground/credits

# Should return your credit balance
```

### 3. Set Environment Variables

```bash
# .env file
ANTHROPIC_API_KEY=sk-ant-...
AI_EVALUATION_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET_CREDITS=whsec_...
FRONTEND_URL=http://localhost:3001
```

---

## 📂 What Was Built (Tonight)

### Documentation
- ✅ `docs/PLAYGROUND_SPEC.md` - Complete technical specification
- ✅ `docs/PLAYGROUND_CREDITS_SYSTEM.md` - Credits system design
- ✅ `docs/PLAYGROUND_IMPLEMENTATION_LOG.md` - Detailed implementation log

### Database
- ✅ `migrations/025_add_playground_credits.sql` - 5 tables + seeds

### Backend Services
- ✅ `services/playground-credits.ts` - Credit management (850 lines)
- ✅ `services/playground.ts` - Playground execution (550 lines)

### API Routes
- ✅ `routes/playground.ts` - Playground endpoints (300 lines)
- ✅ `routes/playground-credits.ts` - Credits endpoints (450 lines)
- ✅ `routes/index.ts` - Registered routes ✅

### Cron Jobs
- ✅ `jobs/playground-credits-reset.ts` - Monthly reset & rollover expiration

---

## 🎨 Frontend Work Needed

### Phase 1: Basic Playground (Week 1)
**Priority**: MVP - Get it working

1. **Main Page**: `packages/webapp/src/app/(app)/playground/page.tsx`
   ```typescript
   - Package selector (dropdown or search)
   - User input textarea
   - Run button
   - Response display
   ```

2. **Credit Balance Component**: `components/Playground/CreditBalance.tsx`
   ```typescript
   - Show total credits
   - Show breakdown (monthly, rollover, purchased)
   - "Buy Credits" button
   ```

3. **API Integration**
   ```typescript
   // Example:
   const runPlayground = async (packageId: string, input: string) => {
     const res = await fetch('/api/v1/playground/run', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ packageId, userInput: input })
     });

     if (res.status === 402) {
       // Insufficient credits - show modal
       showBuyCreditsModal();
     }

     return await res.json();
   };
   ```

### Phase 2: Credits System (Week 2)
**Priority**: Core Feature

4. **Buy Credits Modal**: `components/Playground/BuyCreditsModal.tsx`
   ```typescript
   - Show 3 packages (small, medium, large)
   - Stripe integration
   - Success/failure handling
   ```

5. **Credit History**: `components/Playground/CreditHistory.tsx`
   ```typescript
   - Table of transactions
   - Filter by type
   - Export to CSV
   ```

6. **Dashboard Widget**: Update `app/(app)/dashboard/page.tsx`
   ```typescript
   - Add credit balance widget
   - Recent playground activity
   - Usage chart
   ```

### Phase 3: Polish (Week 3)
**Priority**: UX

7. **Conversation Threading**
   - Show full conversation history
   - "Continue conversation" button
   - Clear history option

8. **Session Management**
   - Save sessions
   - List saved sessions
   - Delete sessions

9. **Sharing**
   - Generate share link
   - View shared sessions
   - Fork shared sessions

10. **Estimator**
    - Real-time credit cost estimation
    - "This will cost ~2 credits"
    - Warn before expensive runs

---

## 🔧 Development Tips

### Testing Backend Locally

```bash
# 1. Get an auth token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# 2. Check credits
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/playground/credits

# 3. Run playground (replace PACKAGE_UUID)
curl -X POST http://localhost:3000/api/v1/playground/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PACKAGE_UUID",
    "userInput": "Write a hello world function",
    "model": "sonnet"
  }'

# 4. Buy credits (test mode)
curl -X POST http://localhost:3000/api/v1/playground/credits/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"package":"small"}'
```

### Stripe Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe/credits

# Test successful payment
stripe trigger payment_intent.succeeded

# Use test cards:
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
```

---

## 📋 Implementation Checklist

### Backend (Complete) ✅
- [x] Database migrations
- [x] Credits service
- [x] Playground service
- [x] API routes (playground)
- [x] API routes (credits)
- [x] Stripe integration
- [x] Cron jobs
- [x] Route registration

### Frontend (Pending) ⏳
- [ ] Playground page
- [ ] Credit balance component
- [ ] Buy credits modal
- [ ] Credit history page
- [ ] Session list page
- [ ] Share modal
- [ ] Dashboard widget
- [ ] Package page button ("Try in Playground")

### Testing ⏳
- [ ] Backend unit tests
- [ ] API integration tests
- [ ] Frontend component tests
- [ ] E2E purchase flow test
- [ ] Cron job tests

### Deployment ⏳
- [ ] Run migration in production
- [ ] Set environment variables
- [ ] Configure Stripe webhooks
- [ ] Set up cron job
- [ ] Monitor API costs

---

## 💡 Quick Wins

### Want to test right away?
1. Run the migration
2. Check your credit balance via API
3. The backend is ready - just need UI!

### Minimal viable frontend (1-2 hours):
```typescript
// pages/playground.tsx
export default function Playground() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');

  const run = async () => {
    const res = await fetch('/api/v1/playground/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packageId: 'HARDCODED_PACKAGE_ID',
        userInput: input
      })
    });
    const data = await res.json();
    setResponse(data.response);
  };

  return (
    <div>
      <textarea value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={run}>Run</button>
      <pre>{response}</pre>
    </div>
  );
}
```

---

## 🎯 Recommended Order

1. **Test backend** (1 hour)
   - Run migration
   - Test API endpoints with curl
   - Verify credits work

2. **Build minimal UI** (4 hours)
   - Basic playground page
   - Hard-code one package for testing
   - Get run button working
   - Display response

3. **Add credits UI** (4 hours)
   - Show balance
   - Handle insufficient credits
   - Add buy credits button

4. **Integrate Stripe** (4 hours)
   - Buy credits modal
   - Stripe Elements
   - Success/failure handling

5. **Polish & iterate** (ongoing)
   - Conversation history
   - Session management
   - Sharing
   - Dashboard integration

---

## 🆘 Troubleshooting

### Migration fails
```bash
# Check if tables exist
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'playground%';"

# If exists, drop and retry:
# WARNING: This deletes all playground data!
psql $DATABASE_URL -c "DROP TABLE IF EXISTS playground_credit_purchases, playground_credit_transactions, playground_credits, playground_usage, playground_sessions CASCADE;"
```

### API returns 401
- Check JWT token is valid
- Check Authorization header format: `Bearer YOUR_TOKEN`
- Check token hasn't expired

### Insufficient credits error
```bash
# Manually add credits for testing:
psql $DATABASE_URL -c "
  UPDATE playground_credits
  SET balance = 100, purchased_credits = 100
  WHERE user_id = 'YOUR_USER_ID';
"
```

### Stripe webhook not working
- Check webhook secret is correct
- Check endpoint is publicly accessible
- Use Stripe CLI for local testing
- Check Stripe dashboard for webhook logs

---

## 📞 Support

### Documentation
- `docs/PLAYGROUND_SPEC.md` - Full specification
- `docs/PLAYGROUND_CREDITS_SYSTEM.md` - Credits system details
- `docs/PLAYGROUND_IMPLEMENTATION_LOG.md` - What was built

### Code
- Services have detailed JSDoc comments
- API routes have schema validation
- Error messages include debugging info

### Questions?
- Check the implementation log
- Read the credits system doc
- Review the API endpoint examples above

---

## ✨ Future Enhancements (After MVP)

- [ ] Code generation mode (syntax highlighting)
- [ ] Monaco editor integration
- [ ] Streaming responses (WebSocket)
- [ ] Model selection (Sonnet vs Opus)
- [ ] Temperature controls
- [ ] A/B testing mode (compare prompts)
- [ ] Team credit pools
- [ ] Usage analytics dashboard
- [ ] Credits gifting
- [ ] Bulk credit purchases (enterprise)

---

**Status**: Ready for Frontend Development
**Estimated Time to Launch**: 2-3 weeks
**Blockers**: None - backend is complete

Good luck! 🚀
