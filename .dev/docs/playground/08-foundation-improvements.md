# PRPM+ Playground - Foundation Improvements

## Executive Summary

This document provides a comprehensive audit of the current playground implementation and outlines critical improvements needed before scaling the feature to 1,000+ users.

**Current State**: MVP playground feature is functional but has significant technical debt:
- ❌ **Zero test coverage** for playground code
- ⚠️ **Missing error handling** in critical paths
- ⚠️ **No monitoring or observability**
- ⚠️ **Performance bottlenecks** not addressed
- ⚠️ **Security concerns** in credit system
- ⚠️ **Scalability issues** for concurrent users

**Recommendation**: Allocate 2-3 weeks to strengthen foundation before adding new features.

---

## 1. Current Implementation Audit

### What Exists ✅

#### Database Schema (Migration 026)
```sql
✅ playground_sessions - Session storage with JSONB conversation
✅ playground_usage - Analytics tracking with all required fields
✅ playground_credits - Credit balances with rollover logic
✅ playground_credit_transactions - Full audit trail
✅ playground_credit_purchases - Stripe integration
✅ Proper indexes for common queries
✅ Triggers for updated_at timestamps
✅ CHECK constraints for data integrity
```

**Quality**: **8/10** - Well-designed schema with good normalization

**Issues**:
- Missing composite indexes for analytics queries
- No partitioning strategy for usage table (will grow large)
- Missing archived sessions table for old data

#### API Routes

**playground.ts** (531 lines):
```typescript
✅ POST /run - Execute playground with package
✅ POST /estimate - Estimate credit cost
✅ GET /sessions - List user sessions
✅ GET /sessions/:id - Get specific session
✅ DELETE /sessions/:id - Delete session
✅ POST /sessions/:id/share - Share session publicly
✅ GET /shared/:token - Get shared session
✅ Zod validation schemas
✅ OpenAPI documentation
✅ Authentication checks
```

**playground-credits.ts** (1,094 lines):
```typescript
✅ GET /credits - Get balance
✅ GET /credits/history - Transaction history
✅ POST /credits/purchase - Buy credits
✅ GET /credits/packages - Available packages
✅ GET /pricing - Dynamic pricing
✅ POST /subscribe - PRPM+ subscription
✅ GET /subscription - Status check
✅ POST /subscription/cancel - Cancel sub
✅ POST /subscription/portal - Stripe portal
✅ POST /webhooks/stripe/credits - Webhook handler
```

**Quality**: **7/10** - Functional but needs refinement

**Issues**:
- Inconsistent error handling
- No request/response logging
- No rate limiting
- Webhook security could be stronger
- Missing idempotency keys for Stripe operations

#### Services

**playground.ts** (695 lines):
```typescript
✅ Multi-provider support (Anthropic + OpenAI)
✅ Credit estimation logic
✅ Session management (CRUD)
✅ Conversation history
✅ Usage logging
✅ Public sharing
```

**Quality**: **6/10** - Works but needs hardening

**Issues**:
- No retry logic for API failures
- No circuit breaker for external APIs
- No caching (every run fetches package)
- Model-specific logic should be abstracted
- Credit estimation is simplistic
- No streaming support

**playground-credits.ts** (exists, need to read):
```typescript
✅ Balance management
✅ Credit spending
✅ Transaction logging
✅ Stripe integration
```

#### Frontend Components

**PlaygroundInterface.tsx** (~800 lines):
```typescript
✅ Package search and selection
✅ Comparison mode (side-by-side)
✅ Session history
✅ Mobile responsive
✅ Model selection
✅ Input validation
```

**Quality**: **7/10** - Good UX but needs polish

**Issues**:
- Large component (should be split)
- No virtualization for long conversations
- No loading states for better UX
- No error boundaries
- No optimistic updates

---

## 2. Critical Gaps

### 2.1 Testing (Priority: CRITICAL)

**Current Coverage**: **0%** for playground code

**Missing Tests**:

#### Unit Tests Needed

**playground.service.ts**:
```typescript
// Need 25+ tests
✗ estimateCredits() - different models, conversation lengths
✗ loadPackagePrompt() - version handling, errors
✗ executePrompt() - success cases, API failures
✗ createSession() - data validation
✗ updateSession() - concurrent updates
✗ getSession() - authorization checks
✗ shareSession() - token generation
✗ listSessions() - pagination, filtering
✗ deleteSession() - authorization
✗ logUsage() - analytics data correctness
```

**playground-credits.service.ts**:
```typescript
// Need 30+ tests
✗ getBalance() - different user types
✗ canAfford() - edge cases
✗ spendCredits() - transaction atomicity
✗ addCredits() - rollover logic
✗ Monthly credit reset logic
✗ Rollover expiration logic
✗ Credit spending priority (monthly → rollover → purchased)
✗ Balance constraint checks
✗ Concurrent credit modifications
```

#### Integration Tests Needed

**API Routes**:
```typescript
// playground.test.ts - 20+ tests
✗ POST /run - with valid package
✗ POST /run - with insufficient credits
✗ POST /run - with invalid package
✗ POST /run - with conversation history
✗ POST /run - concurrent requests
✗ POST /estimate - accuracy checks
✗ GET /sessions - pagination
✗ POST /sessions/:id/share - authorization
✗ GET /shared/:token - public access

// playground-credits.test.ts - 25+ tests
✗ GET /credits - balance breakdown
✗ POST /credits/purchase - Stripe integration
✗ GET /pricing - org member discount
✗ POST /subscribe - subscription creation
✗ POST /webhooks/stripe/credits - all event types
✗ Webhook signature validation
✗ Idempotency handling
✗ Refund processing
```

#### E2E Tests Needed

**User Flows**:
```typescript
✗ New user signup → get 5 free credits → run test
✗ User exhausts credits → prompted to buy
✗ User buys credits → credits added → can test
✗ User subscribes to PRPM+ → gets 200 credits
✗ Org member subscribes → gets $2 pricing
✗ User creates session → shares → recipient views
✗ Comparison mode → test 2 prompts → see results
```

**Estimated Effort**: 3-4 days to reach 80% coverage

---

### 2.2 Error Handling (Priority: HIGH)

**Current Issues**:

#### Unhandled Errors

```typescript
// playground.service.ts:169-203
// ❌ No error handling if loadPackagePrompt fails
const packagePrompt = await this.loadPackagePrompt(
  request.packageId,
  request.packageVersion
);

// ❌ No handling if session is deleted mid-request
const session = await this.getSession(request.conversationId, userId);

// ❌ No retry on API failure
const response = await this.anthropic.messages.create({...});

// ❌ No handling if credit deduction fails after API call
await this.creditsService.spendCredits(...);
```

**Problems**:
1. User charged credits even if API call fails
2. Orphaned sessions if database write fails
3. No rollback mechanism
4. Generic error messages to users

#### Needed Improvements

```typescript
// 1. Transactional credit spending
class PlaygroundService {
  async executePrompt(userId: string, request: PlaygroundRunRequest) {
    // Reserve credits BEFORE API call
    const reservation = await this.creditsService.reserveCredits(
      userId,
      estimatedCredits
    );

    try {
      // Call AI API
      const response = await this.callAI(...);

      // Commit credit spend
      await this.creditsService.commitReservation(reservation.id);

      return response;
    } catch (error) {
      // Rollback credit reservation
      await this.creditsService.cancelReservation(reservation.id);
      throw error;
    }
  }
}

// 2. Retry logic with exponential backoff
async callAI(request) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await this.anthropic.messages.create(...);
    } catch (error) {
      if (error.status === 429 || error.status >= 500) {
        attempt++;
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw error; // Non-retryable error
    }
  }
  throw new Error('Max retries exceeded');
}

// 3. Circuit breaker for API calls
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute(fn: () => Promise<any>) {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open - API unavailable');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}

// 4. Graceful degradation
async executePrompt(userId: string, request: PlaygroundRunRequest) {
  try {
    return await this.callPrimaryAI(request);
  } catch (error) {
    this.log.warn('Primary AI failed, trying fallback', error);

    // If Anthropic fails, try OpenAI
    if (this.canFallback(request.model)) {
      return await this.callFallbackAI(request);
    }

    throw error;
  }
}
```

---

### 2.3 Performance (Priority: HIGH)

**Current Bottlenecks**:

#### 1. No Caching

```typescript
// ❌ Every playground run fetches package from DB
async loadPackagePrompt(packageId: string, version?: string): Promise<string> {
  // This query runs on EVERY test
  const result = await this.server.pg.query(query, params);
  return result.rows[0].snippet;
}

// ✅ Should cache package prompts in Redis
class PlaygroundService {
  private cache: Redis;

  async loadPackagePrompt(packageId: string, version?: string): Promise<string> {
    const cacheKey = `pkg:${packageId}:${version || 'latest'}`;

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from DB
    const result = await this.server.pg.query(query, params);
    const prompt = result.rows[0].snippet;

    // Cache for 5 minutes
    await this.cache.set(cacheKey, prompt, 'EX', 300);

    return prompt;
  }
}
```

**Impact**: 50-100ms saved per request

#### 2. No Connection Pooling

```typescript
// ❌ Creating new AI client connections per request
constructor(server: FastifyInstance) {
  this.anthropic = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ✅ Should reuse connections with keep-alive
import { Agent } from 'https';

const agent = new Agent({
  keepAlive: true,
  maxSockets: 50,
});

this.anthropic = new Anthropic({
  apiKey: config.ai.anthropicApiKey,
  httpAgent: agent,
});
```

#### 3. Sequential Database Writes

```typescript
// ❌ Three sequential database writes
const sessionId = await this.createSession({...});  // 10ms
await this.creditsService.spendCredits(...);        // 10ms
await this.logUsage({...});                         // 10ms
// Total: 30ms

// ✅ Batch in single transaction
await this.server.pg.query('BEGIN');
try {
  const sessionId = await this.createSession({...});
  await this.creditsService.spendCredits(...);
  await this.logUsage({...});
  await this.server.pg.query('COMMIT');
} catch (error) {
  await this.server.pg.query('ROLLBACK');
  throw error;
}
// Total: 15ms (50% faster)
```

#### 4. No Query Optimization

```sql
-- ❌ Slow analytics query (N+1 problem)
SELECT * FROM playground_usage WHERE user_id = $1;  -- 1000 rows
-- Then for each row, frontend fetches package name
SELECT name FROM packages WHERE id = $1;  -- x1000

-- ✅ Should JOIN in single query
SELECT
  pu.*,
  p.name as package_name,
  u.username as user_name
FROM playground_usage pu
LEFT JOIN packages p ON pu.package_id = p.id
LEFT JOIN users u ON pu.user_id = u.id
WHERE pu.user_id = $1
ORDER BY pu.created_at DESC
LIMIT 50;
```

**Estimated Performance Gains**:
- Cache: 50-100ms saved per request
- Connection pooling: 20-30ms saved
- Batched writes: 15ms saved
- Query optimization: 200-500ms saved (analytics)
- **Total: 285-645ms faster** (20-40% improvement)

---

### 2.4 Security (Priority: CRITICAL)

**Current Vulnerabilities**:

#### 1. Webhook Security

```typescript
// ⚠️ Weak webhook validation
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig as string,
  process.env.STRIPE_WEBHOOK_SECRET || ''  // ❌ Falls back to empty string!
);

// ✅ Should fail hard if secret missing
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET must be configured');
}

// ✅ Should validate timestamp to prevent replay attacks
const tolerance = 300; // 5 minutes
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  secret,
  tolerance
);
```

#### 2. No Rate Limiting

```typescript
// ❌ User can spam API
server.post('/run', { preHandler: server.authenticate }, async (req, res) => {
  // No rate limiting!
  await playgroundService.executePrompt(userId, request);
});

// ✅ Should add rate limiting
import rateLimit from '@fastify/rate-limit';

server.register(rateLimit, {
  max: 10, // 10 requests
  timeWindow: '1 minute',
  keyGenerator: (request) => request.user?.user_id || request.ip,
});

server.post('/run', {
  preHandler: [server.authenticate, server.rateLimit],
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
    },
  },
}, async (req, res) => {
  // Protected!
});
```

#### 3. Input Validation Gaps

```typescript
// ⚠️ No max length on package prompt
async loadPackagePrompt(packageId: string): Promise<string> {
  const result = await this.server.pg.query(query, params);
  return result.rows[0].snippet;  // ❌ Could be 1MB of text!
}

// ✅ Should validate and limit
if (prompt.length > 50000) {  // 50KB limit
  throw new Error('Package prompt exceeds maximum size');
}

// ⚠️ No sanitization of user input
const userMessage = {
  role: 'user',
  content: request.userInput,  // ❌ Could contain prompt injection
};

// ✅ Should sanitize (though AI providers handle this)
// For logging/display purposes
const sanitized = sanitizeHtml(request.userInput, {
  allowedTags: [],
  allowedAttributes: {},
});
```

#### 4. Session Authorization

```typescript
// ⚠️ Potential authorization bypass
async deleteSession(sessionId: string, userId: string): Promise<void> {
  const result = await this.server.pg.query(
    'DELETE FROM playground_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Session not found or unauthorized');
  }
}

// ✅ This is actually correct! Good job.
// But should add explicit error types for better handling
if (result.rowCount === 0) {
  const session = await this.getSession(sessionId, userId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }
  throw new UnauthorizedError('Not authorized to delete this session');
}
```

**Security Checklist**:
- [ ] Add rate limiting on all playground endpoints
- [ ] Implement request logging for audit trail
- [ ] Add CSRF protection for webhook endpoints
- [ ] Validate all environment variables at startup
- [ ] Add input size limits
- [ ] Implement IP allowlisting for webhooks (optional)
- [ ] Add honeypot detection for abuse
- [ ] Encrypt sensitive session data in database

---

### 2.5 Monitoring & Observability (Priority: HIGH)

**Current State**: ❌ No monitoring

**Needed**:

#### 1. Structured Logging

```typescript
// ❌ Current logging is inconsistent
this.server.log.info({ userId, packageId }, 'Starting playground run');
// Sometimes doesn't log errors
// No correlation IDs
// No log levels

// ✅ Should use structured logging with correlation
import { v4 as uuidv4 } from 'uuid';

class PlaygroundService {
  async executePrompt(userId: string, request: PlaygroundRunRequest) {
    const correlationId = uuidv4();
    const logger = this.server.log.child({ correlationId, userId, packageId: request.packageId });

    logger.info('playground.run.start', {
      model: request.model,
      hasConversation: !!request.conversationId,
    });

    try {
      const result = await this.execute(request);

      logger.info('playground.run.success', {
        creditsSpent: result.creditsSpent,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      logger.error('playground.run.error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

#### 2. Metrics Collection

```typescript
// ✅ Add Prometheus metrics
import client from 'prom-client';

const playgroundRunCounter = new client.Counter({
  name: 'prpm_playground_runs_total',
  help: 'Total playground runs',
  labelNames: ['model', 'status'],
});

const playgroundDuration = new client.Histogram({
  name: 'prpm_playground_duration_seconds',
  help: 'Playground run duration',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const creditsSpent = new client.Counter({
  name: 'prpm_playground_credits_spent_total',
  help: 'Total credits spent',
  labelNames: ['model', 'user_type'],
});

// In executePrompt()
const timer = playgroundDuration.startTimer({ model });
try {
  const result = await this.execute(request);
  playgroundRunCounter.inc({ model, status: 'success' });
  creditsSpent.inc({ model, user_type: 'individual' }, result.creditsSpent);
  timer();
  return result;
} catch (error) {
  playgroundRunCounter.inc({ model, status: 'error' });
  timer();
  throw error;
}
```

#### 3. Alerting

```yaml
# prometheus_alerts.yml
groups:
  - name: playground
    interval: 1m
    rules:
      - alert: HighPlaygroundErrorRate
        expr: |
          rate(prpm_playground_runs_total{status="error"}[5m])
          /
          rate(prpm_playground_runs_total[5m])
          > 0.05
        for: 5m
        annotations:
          summary: "High playground error rate ({{ $value }}%)"

      - alert: PlaygroundResponseSlow
        expr: |
          histogram_quantile(0.95,
            rate(prpm_playground_duration_seconds_bucket[5m])
          ) > 10
        for: 5m
        annotations:
          summary: "95th percentile playground response time > 10s"

      - alert: CreditBalanceAnomaly
        expr: |
          sum(rate(prpm_playground_credits_spent_total[1h])) > 1000
        for: 5m
        annotations:
          summary: "Unusually high credit spend rate"
```

#### 4. Tracing

```typescript
// ✅ Add OpenTelemetry tracing
import { trace } from '@opentelemetry/api';

class PlaygroundService {
  async executePrompt(userId: string, request: PlaygroundRunRequest) {
    const tracer = trace.getTracer('prpm-playground');

    return await tracer.startActiveSpan('playground.executePrompt', async (span) => {
      span.setAttribute('user.id', userId);
      span.setAttribute('package.id', request.packageId);
      span.setAttribute('model', request.model);

      try {
        // 1. Load package (child span)
        const prompt = await tracer.startActiveSpan('loadPackage', async (childSpan) => {
          const result = await this.loadPackagePrompt(request.packageId);
          childSpan.end();
          return result;
        });

        // 2. Call AI (child span)
        const response = await tracer.startActiveSpan('callAI', async (childSpan) => {
          childSpan.setAttribute('prompt.length', prompt.length);
          const result = await this.callAI(prompt, request.userInput);
          childSpan.setAttribute('response.tokens', result.tokensUsed);
          childSpan.end();
          return result;
        });

        span.setStatus({ code: 1 }); // OK
        span.end();
        return response;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        span.end();
        throw error;
      }
    });
  }
}
```

**Monitoring Stack Recommendation**:
- **Logs**: Pino → Loki (or ELK stack)
- **Metrics**: Prometheus → Grafana
- **Traces**: OpenTelemetry → Jaeger (or Tempo)
- **Errors**: Sentry
- **Uptime**: UptimeRobot or Pingdom

---

### 2.6 Scalability (Priority: MEDIUM)

**Current Limitations**:

#### 1. Single-Server Architecture

```
┌─────────┐     ┌──────────────┐     ┌────────────┐
│ Browser │────▶│ Next.js SSG  │────▶│  Fastify   │
└─────────┘     │ (S3/CloudFro)│     │  (Single)  │
                └──────────────┘     └─────┬──────┘
                                            │
                                     ┌──────▼──────┐
                                     │  Postgres   │
                                     │  (Single)   │
                                     └─────────────┘

// ❌ Bottlenecks:
- Single Fastify instance (1 process)
- No load balancing
- No horizontal scaling
- Database is single point of failure
```

#### 2. No Queue System

```typescript
// ❌ Playground runs are synchronous
server.post('/run', async (req, res) => {
  const result = await playgroundService.executePrompt(...);  // Blocks for 2-10s
  return res.send(result);
});

// ✅ Should use queue for long-running tasks
import { Queue } from 'bullmq';

const playgroundQueue = new Queue('playground', {
  connection: redis,
});

server.post('/run', async (req, res) => {
  // Add to queue immediately
  const job = await playgroundQueue.add('execute', {
    userId,
    request,
  });

  // Return job ID
  return res.send({
    jobId: job.id,
    status: 'queued',
    pollUrl: `/api/v1/playground/jobs/${job.id}`,
  });
});

// Worker process handles execution
const worker = new Worker('playground', async (job) => {
  return await playgroundService.executePrompt(
    job.data.userId,
    job.data.request
  );
}, { connection: redis });
```

#### 3. Database Scaling

```sql
-- ❌ playground_usage table will grow large
SELECT COUNT(*) FROM playground_usage;
-- After 1 year with 1000 active users:
-- 1000 users × 50 tests/month × 12 months = 600,000 rows

-- ✅ Should partition by month
CREATE TABLE playground_usage_2025_01 PARTITION OF playground_usage
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE playground_usage_2025_02 PARTITION OF playground_usage
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- ✅ Should archive old data
-- Move rows older than 6 months to cold storage
INSERT INTO playground_usage_archive
SELECT * FROM playground_usage
WHERE created_at < NOW() - INTERVAL '6 months';

DELETE FROM playground_usage
WHERE created_at < NOW() - INTERVAL '6 months';
```

#### 4. API Rate Limits

```typescript
// Current: No rate limiting
// At scale: 1000 users × 10 requests/min = 10,000 req/min = 166 req/s

// ✅ Need tiered rate limits
const rateLimits = {
  free: {
    maxRequests: 5,
    window: '1 minute',
  },
  prpmPlus: {
    maxRequests: 20,
    window: '1 minute',
  },
  organization: {
    maxRequests: 100,
    window: '1 minute',
  },
};

server.post('/run', {
  preHandler: async (request, reply) => {
    const userTier = await getUserTier(request.user.user_id);
    const limit = rateLimits[userTier];

    const key = `ratelimit:${request.user.user_id}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 60); // 1 minute
    }

    if (count > limit.maxRequests) {
      return reply.code(429).send({
        error: 'rate_limit_exceeded',
        message: `Max ${limit.maxRequests} requests per ${limit.window}`,
        retryAfter: await redis.ttl(key),
      });
    }
  },
}, handler);
```

**Scalability Roadmap**:

**Phase 1: 100 users (Current)**
- Single server ✅
- No queue ✅
- Basic monitoring ⚠️

**Phase 2: 1,000 users (Months 1-3)**
- Add caching (Redis)
- Add queue system (BullMQ)
- Horizontal scaling (2-3 servers)
- Database read replicas

**Phase 3: 10,000 users (Months 4-12)**
- Microservices architecture
- Separate AI execution workers
- Database sharding
- CDN for static assets
- Multi-region deployment

---

## 3. Code Quality Issues

### 3.1 Code Organization

**Issues**:

1. **Large Files**:
   - playground-credits.ts: 1,094 lines ❌
   - PlaygroundInterface.tsx: ~800 lines ❌
   - Should be < 300 lines per file

2. **Missing Abstractions**:
   ```typescript
   // ❌ Model-specific logic scattered
   if (model === 'opus') return 3;
   if (model === 'gpt-4o') return 2;
   if (model === 'gpt-4-turbo') return 3;

   // ✅ Should abstract to ModelProvider interface
   interface ModelProvider {
     estimateCredits(tokens: number): number;
     execute(prompt: string, input: string): Promise<Response>;
     getName(): string;
   }

   class AnthropicProvider implements ModelProvider {
     estimateCredits(tokens: number) {
       if (this.model === 'opus') return 3;
       return 1;
     }
   }
   ```

3. **Tight Coupling**:
   ```typescript
   // ❌ PlaygroundService depends on concrete PlaygroundCreditsService
   class PlaygroundService {
     private creditsService: PlaygroundCreditsService;
   }

   // ✅ Should depend on interface
   interface ICreditsService {
     canAfford(userId: string, amount: number): Promise<boolean>;
     spendCredits(userId: string, amount: number, ...): Promise<void>;
   }

   class PlaygroundService {
     constructor(private creditsService: ICreditsService) {}
   }
   ```

### 3.2 Error Handling Consistency

```typescript
// ❌ Inconsistent error responses
throw new Error('Package not found');  // Generic
throw new Error('Insufficient credits. Need X but have Y');  // Detailed

// ✅ Should use custom error classes
class PackageNotFoundError extends Error {
  constructor(packageId: string) {
    super(`Package ${packageId} not found`);
    this.name = 'PackageNotFoundError';
  }
}

class InsufficientCreditsError extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient credits: need ${required} but have ${available}`);
    this.name = 'InsufficientCreditsError';
    this.required = required;
    this.available = available;
  }
}

// Then in route handler
try {
  const result = await playgroundService.executePrompt(...);
  return reply.send(result);
} catch (error) {
  if (error instanceof PackageNotFoundError) {
    return reply.code(404).send({
      error: 'package_not_found',
      message: error.message,
    });
  }

  if (error instanceof InsufficientCreditsError) {
    return reply.code(402).send({
      error: 'insufficient_credits',
      message: error.message,
      required: error.required,
      available: error.available,
      purchaseUrl: '/playground/credits',
    });
  }

  // Unexpected error
  this.log.error(error);
  return reply.code(500).send({
    error: 'internal_error',
    message: 'An unexpected error occurred',
  });
}
```

### 3.3 Missing Documentation

**Needed**:

```typescript
/**
 * Execute a playground prompt against an AI model
 *
 * @param userId - UUID of the user running the prompt
 * @param request - Playground execution request
 * @returns Response with AI output, credits spent, and session info
 *
 * @throws {PackageNotFoundError} If package doesn't exist
 * @throws {InsufficientCreditsError} If user doesn't have enough credits
 * @throws {ModelUnavailableError} If AI API is down
 *
 * @example
 * const result = await playground.executePrompt('user-123', {
 *   packageId: 'pkg-456',
 *   userInput: 'Review this code',
 *   model: 'sonnet',
 * });
 */
async executePrompt(
  userId: string,
  request: PlaygroundRunRequest
): Promise<PlaygroundRunResponse> {
  // ...
}
```

---

## 4. Infrastructure Improvements

### 4.1 Database Optimizations

**Add Missing Indexes**:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_playground_usage_user_package
  ON playground_usage(user_id, package_id, created_at DESC);

CREATE INDEX idx_playground_usage_org_package
  ON playground_usage(org_id, package_id, created_at DESC)
  WHERE org_id IS NOT NULL;

-- Partial index for analytics queries
CREATE INDEX idx_playground_usage_last_7_days
  ON playground_usage(created_at DESC)
  WHERE created_at > NOW() - INTERVAL '7 days';

-- Index for leaderboards
CREATE INDEX idx_playground_usage_package_rating
  ON playground_usage(package_id, user_rating, created_at DESC)
  WHERE user_rating IS NOT NULL;
```

**Add Partitioning**:

```sql
-- Convert playground_usage to partitioned table
ALTER TABLE playground_usage RENAME TO playground_usage_old;

CREATE TABLE playground_usage (
  LIKE playground_usage_old INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next 3 months
CREATE TABLE playground_usage_2025_01 PARTITION OF playground_usage
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE playground_usage_2025_02 PARTITION OF playground_usage
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Migrate existing data
INSERT INTO playground_usage SELECT * FROM playground_usage_old;

-- Create function to auto-create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  partition_date := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  partition_name := 'playground_usage_' || TO_CHAR(partition_date, 'YYYY_MM');
  start_date := partition_date::TEXT;
  end_date := (partition_date + INTERVAL '1 month')::TEXT;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF playground_usage FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule to run monthly
SELECT cron.schedule('create-partition', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

**Add Materialized Views for Analytics**:

```sql
-- Pre-compute package analytics
CREATE MATERIALIZED VIEW playground_package_stats AS
SELECT
  package_id,
  COUNT(*) as total_tests,
  COUNT(DISTINCT user_id) as unique_testers,
  AVG(user_rating) FILTER (WHERE user_rating IS NOT NULL) as avg_rating,
  COUNT(*) FILTER (WHERE error_occurred = FALSE) / COUNT(*)::float as success_rate,
  AVG(duration_ms) as avg_duration_ms,
  AVG(tokens_used) as avg_tokens,
  MAX(created_at) as last_tested_at
FROM playground_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY package_id;

CREATE UNIQUE INDEX ON playground_package_stats(package_id);

-- Refresh every hour
SELECT cron.schedule('refresh-package-stats', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY playground_package_stats'
);
```

### 4.2 Caching Strategy

**Multi-Layer Caching**:

```typescript
// 1. In-memory cache for hot data (LRU)
import LRU from 'lru-cache';

const packageCache = new LRU<string, string>({
  max: 500,  // 500 packages
  maxAge: 5 * 60 * 1000,  // 5 minutes
});

// 2. Redis for distributed cache
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

class PlaygroundService {
  async loadPackagePrompt(packageId: string, version?: string): Promise<string> {
    const cacheKey = `pkg:${packageId}:${version || 'latest'}`;

    // L1: In-memory
    const memCached = packageCache.get(cacheKey);
    if (memCached) {
      this.log.debug({ packageId, source: 'memory' }, 'Package cache hit');
      return memCached;
    }

    // L2: Redis
    const redisCached = await redis.get(cacheKey);
    if (redisCached) {
      this.log.debug({ packageId, source: 'redis' }, 'Package cache hit');
      packageCache.set(cacheKey, redisCached);  // Populate L1
      return redisCached;
    }

    // L3: Database
    this.log.debug({ packageId, source: 'database' }, 'Package cache miss');
    const prompt = await this.fetchFromDatabase(packageId, version);

    // Populate caches
    packageCache.set(cacheKey, prompt);
    await redis.set(cacheKey, prompt, 'EX', 300);  // 5 min TTL

    return prompt;
  }
}
```

**Cache Invalidation**:

```typescript
// When package is updated, invalidate cache
async function onPackageUpdated(packageId: string) {
  // Invalidate all versions
  await redis.del(`pkg:${packageId}:latest`);

  // Publish to all servers to clear L1 cache
  await redis.publish('cache:invalidate', JSON.stringify({
    type: 'package',
    id: packageId,
  }));
}

// Subscribe to invalidation events
redis.subscribe('cache:invalidate');
redis.on('message', (channel, message) => {
  const { type, id } = JSON.parse(message);
  if (type === 'package') {
    packageCache.delete(`pkg:${id}:latest`);
  }
});
```

### 4.3 Queue System

**BullMQ Integration**:

```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';

// Queue for async playground runs
const playgroundQueue = new Queue('playground:execute', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,  // Keep last 100
    removeOnFail: 1000,     // Keep last 1000 failures
  },
});

// Scheduler ensures jobs run on time
const scheduler = new QueueScheduler('playground:execute', {
  connection: redis,
});

// Worker process
const worker = new Worker('playground:execute', async (job) => {
  const { userId, request } = job.data;

  job.updateProgress(10);

  const result = await playgroundService.executePrompt(userId, request);

  job.updateProgress(100);

  return result;
}, {
  connection: redis,
  concurrency: 10,  // Process 10 jobs at a time
});

// Error handling
worker.on('failed', (job, error) => {
  logger.error({ jobId: job.id, error }, 'Playground job failed');
});

// Success logging
worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, userId: job.data.userId }, 'Playground job completed');
});
```

**API Integration**:

```typescript
// Modified API route
server.post('/run', async (request, reply) => {
  const userId = request.user.user_id;

  // Add job to queue
  const job = await playgroundQueue.add('execute', {
    userId,
    request: request.body,
  }, {
    jobId: uuidv4(),
  });

  return reply.send({
    jobId: job.id,
    status: 'queued',
    estimatedWait: await getEstimatedWait(),
  });
});

// Poll for job status
server.get('/jobs/:jobId', async (request, reply) => {
  const job = await playgroundQueue.getJob(request.params.jobId);

  if (!job) {
    return reply.code(404).send({ error: 'job_not_found' });
  }

  const state = await job.getState();
  const progress = job.progress;

  if (state === 'completed') {
    return reply.send({
      status: 'completed',
      result: job.returnvalue,
    });
  }

  if (state === 'failed') {
    return reply.send({
      status: 'failed',
      error: job.failedReason,
    });
  }

  return reply.send({
    status: state,
    progress,
  });
});
```

---

## 5. Action Plan

### Immediate (Week 1) - Critical Fixes

**Priority: CRITICAL**

1. **Add Basic Tests** (2 days)
   - [ ] Unit tests for PlaygroundService core methods
   - [ ] Integration tests for /run endpoint
   - [ ] Credit system tests (spend, rollover, balance)
   - Target: 60% coverage

2. **Fix Security Issues** (1 day)
   - [ ] Add rate limiting on all playground routes
   - [ ] Validate webhook secret existence at startup
   - [ ] Add input size limits
   - [ ] Add request logging

3. **Error Handling** (2 days)
   - [ ] Add credit reservation system
   - [ ] Add retry logic for API calls
   - [ ] Add proper error classes
   - [ ] Improve error messages to users

**Deliverables**:
- Test suite with 60%+ coverage
- Rate limiting on all endpoints
- Transactional credit system
- No critical security vulnerabilities

---

### Short-term (Weeks 2-3) - Foundation Strengthening

**Priority: HIGH**

1. **Performance Optimizations** (3 days)
   - [ ] Add Redis caching for packages
   - [ ] Batch database writes in transactions
   - [ ] Optimize analytics queries
   - [ ] Add connection pooling

2. **Monitoring** (2 days)
   - [ ] Add Prometheus metrics
   - [ ] Set up Grafana dashboards
   - [ ] Add Sentry error tracking
   - [ ] Create alerts for error rates

3. **Database Improvements** (2 days)
   - [ ] Add missing composite indexes
   - [ ] Set up table partitioning
   - [ ] Create materialized views for analytics
   - [ ] Add auto-vacuum configuration

**Deliverables**:
- 30-40% faster response times
- Real-time monitoring dashboards
- Alerts for critical issues
- Optimized database queries

---

### Medium-term (Weeks 4-6) - Scale Preparation

**Priority: MEDIUM**

1. **Queue System** (3 days)
   - [ ] Set up BullMQ
   - [ ] Migrate long-running tasks to queue
   - [ ] Add job status polling
   - [ ] Add worker health checks

2. **Code Refactoring** (4 days)
   - [ ] Extract ModelProvider abstraction
   - [ ] Split large files into modules
   - [ ] Add dependency injection
   - [ ] Improve type safety

3. **Test Coverage** (3 days)
   - [ ] Increase to 80% coverage
   - [ ] Add E2E tests for critical flows
   - [ ] Add load testing
   - [ ] Add chaos engineering tests

**Deliverables**:
- Async job processing
- Clean, maintainable code
- 80%+ test coverage
- Load test results showing capacity

---

## 6. Success Metrics

### Technical Health

**Before Improvements**:
- Test coverage: 0%
- Error rate: Unknown (no monitoring)
- P95 response time: ~5-10s (estimated)
- Credit transaction failures: Unknown
- Security score: 6/10

**After Improvements (Week 6)**:
- Test coverage: 80%+
- Error rate: <1%
- P95 response time: <3s
- Credit transaction failures: 0%
- Security score: 9/10

### User Impact

**Reliability**:
- 99.5% uptime
- <0.1% failed transactions
- Zero credit loss incidents

**Performance**:
- Playground runs complete in <3s (95th percentile)
- Credit balance loads in <100ms
- Session history loads in <200ms

**Security**:
- Zero unauthorized access incidents
- All webhook events verified
- Rate limits prevent abuse

---

## 7. Resource Requirements

### Team

**Week 1 (Critical Fixes)**:
- 1 Senior Backend Engineer (full-time)
- 1 QA Engineer (part-time for test setup)

**Weeks 2-3 (Foundation)**:
- 1 Senior Backend Engineer (full-time)
- 1 DevOps Engineer (part-time for monitoring)
- 1 Database Engineer (part-time for optimization)

**Weeks 4-6 (Scale Prep)**:
- 1 Senior Backend Engineer (full-time)
- 1 Backend Engineer (full-time for refactoring)
- 1 QA Engineer (part-time for E2E tests)

### Infrastructure

**Immediate**:
- Redis instance: $20/month (Upstash or Redis Cloud)
- Sentry: Free tier
- Prometheus + Grafana: Self-hosted

**Weeks 2-3**:
- Upgraded Postgres: $50/month (connection pooling, more CPU)
- Monitoring storage: $20/month

**Weeks 4-6**:
- BullMQ workers: $50/month (2 additional servers)
- Load balancer: $20/month

**Total Monthly Cost**: ~$160/month

---

## 8. Risk Assessment

### Risks

1. **Breaking Changes** (MEDIUM)
   - Adding queue system requires API changes
   - Frontend needs updates for async jobs
   - **Mitigation**: Feature flag for gradual rollout

2. **Migration Complexity** (LOW)
   - Table partitioning requires downtime
   - **Mitigation**: Do during low-traffic window, test on staging

3. **Performance Regression** (LOW)
   - New abstractions might slow things down
   - **Mitigation**: Benchmark before/after, load testing

4. **Increased Costs** (LOW)
   - Additional infrastructure required
   - **Mitigation**: Start with minimal setup, scale as needed

### Contingency Plans

**If improvements take longer than expected**:
- Focus on critical path: Tests → Security → Error handling
- Defer queue system and refactoring to later phase
- Minimum viable improvements in 2 weeks instead of 6

**If performance doesn't improve**:
- Profile to identify actual bottlenecks
- Consider edge caching (CloudFlare Workers)
- Optimize AI API calls (batching, caching)

---

## 9. Testing Strategy

### Test Pyramid

```
        /\
       /E2E\        5% - Critical user flows
      /------\
     /  INT   \     25% - API + database integration
    /----------\
   /    UNIT    \   70% - Business logic, pure functions
  /--------------\
```

### Unit Tests (70%)

**Target: 150+ tests**

**playground.service.ts**:
```typescript
describe('PlaygroundService', () => {
  describe('estimateCredits', () => {
    it('returns 1 credit for sonnet with small prompt', () => {
      const credits = service.estimateCredits(1000, 500, 'sonnet');
      expect(credits).toBe(1);
    });

    it('returns 3 credits for opus', () => {
      const credits = service.estimateCredits(1000, 500, 'opus');
      expect(credits).toBe(3);
    });

    it('increases credits for larger prompts', () => {
      const credits = service.estimateCredits(10000, 5000, 'sonnet');
      expect(credits).toBeGreaterThan(1);
    });
  });

  describe('loadPackagePrompt', () => {
    it('loads latest version when no version specified', async () => {
      const prompt = await service.loadPackagePrompt('pkg-123');
      expect(prompt).toBe('System prompt...');
    });

    it('throws error when package not found', async () => {
      await expect(service.loadPackagePrompt('invalid'))
        .rejects.toThrow('Package not found');
    });
  });
});
```

**playground-credits.service.ts**:
```typescript
describe('PlaygroundCreditsService', () => {
  describe('spendCredits', () => {
    it('deducts from monthly credits first', async () => {
      await setupUser({ monthly: 100, rollover: 50, purchased: 25 });

      await service.spendCredits(userId, 10, sessionId, 'test');

      const balance = await service.getBalance(userId);
      expect(balance.monthly.remaining).toBe(90);
      expect(balance.rollover.amount).toBe(50);
      expect(balance.purchased).toBe(25);
    });

    it('uses rollover when monthly exhausted', async () => {
      await setupUser({ monthly: 5, rollover: 50, purchased: 25 });

      await service.spendCredits(userId, 10, sessionId, 'test');

      const balance = await service.getBalance(userId);
      expect(balance.monthly.remaining).toBe(0);
      expect(balance.rollover.amount).toBe(45);
      expect(balance.purchased).toBe(25);
    });

    it('throws when insufficient credits', async () => {
      await setupUser({ monthly: 0, rollover: 0, purchased: 5 });

      await expect(service.spendCredits(userId, 10, sessionId, 'test'))
        .rejects.toThrow(InsufficientCreditsError);
    });

    it('handles concurrent spending atomically', async () => {
      await setupUser({ monthly: 100, rollover: 0, purchased: 0 });

      // Simulate 10 concurrent requests
      const promises = Array(10).fill(null).map(() =>
        service.spendCredits(userId, 5, nanoid(), 'test')
      );

      await Promise.all(promises);

      const balance = await service.getBalance(userId);
      expect(balance.balance).toBe(50);  // 100 - (10 * 5)
    });
  });
});
```

### Integration Tests (25%)

**Target: 50+ tests**

**playground.test.ts**:
```typescript
describe('POST /api/v1/playground/run', () => {
  it('executes playground run successfully', async () => {
    const token = await getAuthToken(userId);
    const packageId = await createTestPackage();

    const response = await request(app)
      .post('/api/v1/playground/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        packageId,
        userInput: 'Test input',
        model: 'sonnet',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      response: expect.any(String),
      conversationId: expect.any(String),
      creditsSpent: expect.any(Number),
      tokensUsed: expect.any(Number),
    });
  });

  it('returns 402 when insufficient credits', async () => {
    const token = await getAuthToken(userId);
    await setCreditBalance(userId, 0);

    const response = await request(app)
      .post('/api/v1/playground/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        packageId: testPackageId,
        userInput: 'Test input',
        model: 'sonnet',
      });

    expect(response.status).toBe(402);
    expect(response.body.error).toBe('insufficient_credits');
  });

  it('handles API failures gracefully', async () => {
    // Mock Anthropic API to fail
    mockAnthropicAPI.mockRejectedValueOnce(new Error('API unavailable'));

    const response = await request(app)
      .post('/api/v1/playground/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        packageId: testPackageId,
        userInput: 'Test input',
      });

    expect(response.status).toBe(500);

    // Credits should not be deducted
    const balance = await getCreditBalance(userId);
    expect(balance).toBe(initialBalance);
  });
});
```

### E2E Tests (5%)

**Target: 10+ tests**

**Critical user flows**:
```typescript
describe('Playground User Flow', () => {
  it('new user can sign up and use free credits', async () => {
    // 1. Sign up
    const { email, password } = await signup();

    // 2. Verify has 5 free credits
    const balance = await getCredits(email);
    expect(balance).toBe(5);

    // 3. Run playground test
    await runPlayground({
      packageName: 'test-package',
      input: 'Hello world',
    });

    // 4. Verify credits deducted
    const newBalance = await getCredits(email);
    expect(newBalance).toBe(4);

    // 5. Verify session saved
    const sessions = await getSessions(email);
    expect(sessions).toHaveLength(1);
  });

  it('user can buy credits and use them', async () => {
    await login(testUser);

    // 1. Navigate to buy credits
    await page.goto('/playground');
    await page.click('[data-testid="buy-credits"]');

    // 2. Select package
    await page.click('[data-testid="package-medium"]');

    // 3. Complete Stripe checkout (test mode)
    await completeStripeCheckout({
      cardNumber: '4242424242424242',
    });

    // 4. Verify credits added
    await page.waitForSelector('[data-testid="credits-balance"]');
    const balance = await page.textContent('[data-testid="credits-balance"]');
    expect(balance).toContain('250');
  });
});
```

---

## 10. Deployment Strategy

### Gradual Rollout

**Phase 1: Infrastructure** (Week 1)
- Deploy Redis cache to staging
- Deploy monitoring stack
- Validate with smoke tests

**Phase 2: Code Changes** (Week 2)
- Deploy error handling improvements
- Deploy security fixes
- Feature flag: `enableImprovedErrorHandling`

**Phase 3: Performance** (Week 3)
- Deploy caching layer
- Deploy database optimizations
- Monitor performance metrics

**Phase 4: Scale Prep** (Weeks 4-6)
- Deploy queue system
- Deploy refactored code
- Gradual rollout: 10% → 50% → 100%

### Rollback Plan

**Immediate Rollback Triggers**:
- Error rate > 5%
- P95 latency > 10s
- Credit transaction failures > 0.1%

**Rollback Process**:
1. Disable feature flags
2. Revert to previous deployment
3. Investigate root cause
4. Fix and redeploy

---

## Summary

**Current State**: Functional MVP with significant technical debt

**Proposed Improvements**: 6-week plan to strengthen foundation

**Expected Outcomes**:
- ✅ 80%+ test coverage
- ✅ <1% error rate
- ✅ 30-40% faster performance
- ✅ Production-ready monitoring
- ✅ Ready to scale to 1,000+ users

**Investment Required**:
- Time: 6 engineering weeks
- Cost: ~$160/month infrastructure
- Risk: Low (gradual rollout with feature flags)

**Recommendation**: **Proceed with foundation improvements before adding new features.** The playground feature has strong bones but needs hardening before it can support the ambitious roadmap outlined in 06-feature-roadmap.md.

---

**Next Steps**:
1. Review and approve this plan
2. Allocate engineering resources
3. Set up project tracking (Jira/Linear)
4. Begin Week 1 critical fixes
5. Weekly progress reviews

---

**Last Updated**: 2025-01-20
**Status**: Awaiting approval
**Owner**: Engineering Team
