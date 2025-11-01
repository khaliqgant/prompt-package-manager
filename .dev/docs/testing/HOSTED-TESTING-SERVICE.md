# PRPM Hosted Testing Service (prpm+)

Zero-setup testing for prpm+ users - no API keys, no LiteLLM proxy, just `prpm test`.

## Overview

**Problem**: Users need to:
- Install LiteLLM proxy
- Get API keys from multiple providers (Anthropic, OpenAI, etc.)
- Configure and maintain testing infrastructure
- Pay for LLM API usage directly

**Solution**: PRPM-hosted testing service
- No setup required
- No API keys needed
- No infrastructure to maintain
- Included with prpm+ subscription

## Architecture

```
┌─────────────────┐
│   prpm CLI      │
│                 │
│ prpm test pkg   │
└────────┬────────┘
         │
         ├─ Free Users ──────────────────┐
         │  • Bring your own API keys    │
         │  • Local LiteLLM proxy        │
         │  • Self-hosted                │
         │                               │
         │                               ▼
         │                    ┌──────────────────┐
         │                    │   User's Local   │
         │                    │   LiteLLM Proxy  │
         │                    └──────────────────┘
         │
         └─ prpm+ Users ────────────────┐
            • Zero setup               │
            • Hosted infrastructure    │
            • Managed API keys          │
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  PRPM Registry API   │
                             │                      │
                             │  POST /api/v1/       │
                             │  test-jobs/run       │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  PRPM Test Runner    │
                             │                      │
                             │  • Queue management  │
                             │  • Load balancing    │
                             │  • Result caching    │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │   LiteLLM Proxy      │
                             │   (PRPM-hosted)      │
                             │                      │
                             │   • Anthropic API    │
                             │   • OpenAI API       │
                             │   • Google API       │
                             │   • Local models     │
                             └──────────────────────┘
```

## Features

### For prpm+ Users

✅ **Zero Setup**
```bash
# Just login and test - no config needed
prpm login
prpm test @author/package
```

✅ **No API Keys Required**
- PRPM manages all LLM API keys
- Access to multiple providers
- Automatic fallbacks and retries

✅ **Included Models**
- Claude Sonnet 4
- Claude Opus 4
- GPT-4o
- GPT-4 Turbo
- Llama 3.1 (70B, 8B)
- Gemini Pro

✅ **Usage Limits**

| Tier | Tests/Month | Models | Concurrent Jobs | Cost |
|------|-------------|--------|-----------------|------|
| **Free** | Self-hosted only | Any (BYO keys) | Unlimited | $0 |
| **prpm+ ($9/mo)** | 100 test runs | All models | 2 concurrent | Included |
| **prpm Pro ($29/mo)** | 500 test runs | All models | 5 concurrent | Included |
| **Enterprise** | Unlimited | All models | 20 concurrent | Custom |

### For Free Users

Free users can still test, but need to bring their own infrastructure:

```bash
# Install LiteLLM
pip install litellm[proxy]

# Start proxy
litellm --port 4000

# Set API keys
export ANTHROPIC_API_KEY=your_key
export OPENAI_API_KEY=your_key

# Test with local setup
prpm test @author/package --local
```

## Implementation

### Database Schema

```sql
-- Test job queue
CREATE TABLE test_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  package_id UUID NOT NULL REFERENCES packages(id),
  package_version VARCHAR(50) NOT NULL,

  -- Test configuration
  models_requested TEXT[] NOT NULL,
  plugins_requested TEXT[],
  framework VARCHAR(50) NOT NULL, -- 'litellm', 'claude-agent'

  -- Job status
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, running, completed, failed
  priority INT DEFAULT 0,

  -- Results
  test_result_id UUID REFERENCES package_test_results(id),
  error_message TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Usage tracking
  tokens_used INT,
  cost_usd DECIMAL(10,6)
);

CREATE INDEX idx_test_jobs_status ON test_jobs(status, created_at);
CREATE INDEX idx_test_jobs_user ON test_jobs(user_id, created_at);

-- Usage tracking for prpm+ limits
CREATE TABLE user_test_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  month DATE NOT NULL, -- First day of month

  test_runs_count INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, month)
);

-- Function to check if user can run test
CREATE FUNCTION can_run_test(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier VARCHAR(50);
  current_month_usage INT;
  tier_limit INT;
BEGIN
  -- Get user tier
  SELECT subscription_tier INTO user_tier
  FROM users WHERE id = user_uuid;

  -- Get current month usage
  SELECT COALESCE(test_runs_count, 0) INTO current_month_usage
  FROM user_test_usage
  WHERE user_id = user_uuid
    AND month = DATE_TRUNC('month', NOW());

  -- Determine limit based on tier
  tier_limit := CASE user_tier
    WHEN 'plus' THEN 100
    WHEN 'pro' THEN 500
    WHEN 'enterprise' THEN 999999
    ELSE 0 -- Free tier cannot use hosted
  END;

  RETURN current_month_usage < tier_limit;
END;
$$ LANGUAGE plpgsql;
```

### API Routes

#### POST /api/v1/test-jobs/run

Submit a test job (prpm+ users only):

```typescript
// Request
{
  package_id: string;
  package_version?: string; // defaults to latest
  models?: string[]; // defaults to ['claude-sonnet-4']
  plugins?: string[];
  framework?: 'litellm' | 'claude-agent' | 'auto';
  upload_results?: boolean; // auto-upload results
  verify_results?: boolean; // mark as verified
}

// Response
{
  job_id: string;
  status: 'queued' | 'running';
  position_in_queue?: number;
  estimated_wait_seconds?: number;
  usage: {
    tests_used_this_month: number;
    tests_remaining: number;
    tier: string;
  }
}
```

#### GET /api/v1/test-jobs/:jobId

Get test job status:

```typescript
// Response
{
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  package: {
    id: string;
    name: string;
    version: string;
  };
  config: {
    models: string[];
    plugins?: string[];
  };

  // If completed
  results?: {
    total_tests: number;
    tests_passed: number;
    tests_failed: number;
    overall_score: number;
    total_duration_ms: number;
    total_tokens: number;
    total_cost_usd: number;
    test_result_id?: string; // If uploaded
  };

  // If failed
  error?: string;

  // Timing
  created_at: string;
  started_at?: string;
  completed_at?: string;
}
```

#### GET /api/v1/test-jobs/:jobId/results

Get detailed test results:

```typescript
// Response (same as test results API)
{
  test_cases: [{
    title: string;
    passed: boolean;
    score: number;
    response: string;
    model: string;
    duration_ms: number;
    assertions: AssertionResult[];
  }];
  summary: {
    total_tests: number;
    tests_passed: number;
    overall_score: number;
    // ...
  };
}
```

#### GET /api/v1/users/me/test-usage

Get current usage:

```typescript
// Response
{
  current_month: {
    test_runs_count: number;
    tokens_used: number;
    cost_usd: number;
  };
  limits: {
    tier: string;
    test_runs_per_month: number;
    concurrent_jobs: number;
  };
  remaining: {
    test_runs: number;
  };
}
```

### CLI Updates

Update the test command to support hosted testing:

```typescript
// packages/cli/src/commands/test.ts

export function createTestCommand(): Command {
  const command = new Command('test');

  command
    .description('Test a package with AI models')
    .argument('<package>', 'Package name to test')
    .option('-m, --models <models>', 'Models to test with', 'claude-sonnet-4')
    .option('-p, --plugins <plugins>', 'MCP plugins for Claude packages')
    .option('--local', 'Use local testing (requires LiteLLM/API keys)')
    .option('-u, --upload', 'Upload test results to registry', false)
    .option('-v, --verify', 'Mark results as verified', false)
    .option('--verbose', 'Show detailed output', false)
    .action(async (packageName: string, options: TestCommandOptions) => {
      // Check if user is logged in
      const config = getConfig();
      const hasToken = !!config.token;

      // Determine testing mode
      const useHosted = hasToken && !options.local;

      if (useHosted) {
        console.log('🚀 Using PRPM hosted testing (prpm+)\n');
        await runHostedTest(packageName, options);
      } else {
        if (!hasToken) {
          console.log('💡 Tip: Login with `prpm login` to use hosted testing\n');
        }
        console.log('🔧 Using local testing\n');
        await runLocalTest(packageName, options);
      }
    });

  return command;
}

async function runHostedTest(
  packageName: string,
  options: TestCommandOptions
) {
  const client = getRegistryClient(getConfig());

  // Fetch package
  const pkg = await client.getPackageByName(packageName);

  // Parse options
  const models = options.models?.split(',').map(m => m.trim()) || ['claude-sonnet-4'];
  const plugins = options.plugins?.split(',').map(p => p.trim());

  // Submit test job
  console.log('📤 Submitting test job...\n');

  const job = await client.submitTestJob({
    package_id: pkg.id,
    models,
    plugins,
    upload_results: options.upload,
    verify_results: options.verify,
  });

  console.log(`✅ Job submitted (ID: ${job.job_id})`);
  console.log(`   Status: ${job.status}`);
  if (job.position_in_queue) {
    console.log(`   Position in queue: ${job.position_in_queue}`);
  }
  if (job.estimated_wait_seconds) {
    console.log(`   Estimated wait: ${job.estimated_wait_seconds}s`);
  }
  console.log(`   Usage: ${job.usage.tests_used_this_month}/${job.usage.tests_remaining + job.usage.tests_used_this_month} tests this month`);
  console.log();

  // Poll for results
  console.log('⏳ Waiting for results...\n');

  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max

  while (attempts < maxAttempts) {
    const status = await client.getTestJob(job.job_id);

    if (status.status === 'completed') {
      console.log('✅ Test completed!\n');
      displayHostedResults(status.results!);

      if (options.upload && status.results?.test_result_id) {
        console.log(`📊 Results uploaded: https://prpm.dev/packages/${pkg.id}/tests\n`);
      }

      return;
    }

    if (status.status === 'failed') {
      console.error(`❌ Test failed: ${status.error}`);
      process.exit(1);
    }

    // Show progress
    if (status.status === 'running') {
      process.stdout.write('.');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  console.error('❌ Timeout waiting for test results');
  process.exit(1);
}

async function runLocalTest(
  packageName: string,
  options: TestCommandOptions
) {
  // Existing local testing implementation
  // ... (code from previous implementation)
}
```

### Registry Client Updates

```typescript
// packages/registry-client/src/registry-client.ts

export class RegistryClient {
  // ... existing methods

  /**
   * Submit hosted test job (prpm+ only)
   */
  async submitTestJob(data: {
    package_id: string;
    models?: string[];
    plugins?: string[];
    upload_results?: boolean;
    verify_results?: boolean;
  }): Promise<{
    job_id: string;
    status: string;
    position_in_queue?: number;
    estimated_wait_seconds?: number;
    usage: {
      tests_used_this_month: number;
      tests_remaining: number;
      tier: string;
    };
  }> {
    if (!this.token) {
      throw new Error('Authentication required for hosted testing');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/test-jobs/run`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || response.statusText);
    }

    return response.json();
  }

  /**
   * Get test job status
   */
  async getTestJob(jobId: string): Promise<any> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/test-jobs/${jobId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get test job: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get current test usage
   */
  async getTestUsage(): Promise<any> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/users/me/test-usage`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get usage: ${response.statusText}`);
    }

    return response.json();
  }
}
```

## User Experience

### Free User

```bash
$ prpm test @author/package

💡 Tip: Login with `prpm login` to use hosted testing

🔧 Using local testing

❌ Error: ANTHROPIC_API_KEY is required for Claude Agent testing

To use local testing:
1. Install LiteLLM: pip install litellm[proxy]
2. Start proxy: litellm --port 4000
3. Set API keys: export ANTHROPIC_API_KEY=your_key
4. Run tests: prpm test @author/package --local

Or upgrade to prpm+ for zero-setup hosted testing:
  prpm upgrade
```

### prpm+ User (Zero Setup)

```bash
$ prpm test @author/package

🚀 Using PRPM hosted testing (prpm+)

📤 Submitting test job...

✅ Job submitted (ID: abc-123)
   Status: queued
   Position in queue: 2
   Estimated wait: 15s
   Usage: 23/100 tests this month

⏳ Waiting for results...

✅ Test completed!

📊 Test Results:

✅ Test 1: Review function (100%)
✅ Test 2: Security check (100%)
✅ Test 3: Edge cases (100%)

📈 Summary:

   Total Tests: 3
   Passed: 3 ✅
   Failed: 0 ❌
   Overall Score: 100.0%
   Total Duration: 5.2s
   Total Tokens: 3,421

📊 Results uploaded: https://prpm.dev/packages/abc-123/tests
```

### With --local Flag (Force Local)

```bash
$ prpm test @author/package --local

🔧 Using local testing

⚡ Running tests with LiteLLM...
# ... runs locally even if logged in
```

## Pricing Comparison

| Approach | Setup | Cost/Month | Pros | Cons |
|----------|-------|------------|------|------|
| **Self-Hosted (Free)** | Complex | Variable | Unlimited, full control | Setup required, pay per API call |
| **prpm+ ($9/mo)** | None | $9 fixed | Zero setup, predictable cost | 100 tests/month limit |
| **prpm Pro ($29/mo)** | None | $29 fixed | 500 tests/month | Higher cost |

## Benefits

### For Users

✅ **Zero Friction**: Just `prpm test` - no setup
✅ **Cost Predictable**: Fixed monthly cost, no surprises
✅ **No Key Management**: PRPM handles all API keys
✅ **Faster**: Hosted infrastructure is always ready
✅ **Reliable**: Automatic retries and fallbacks

### For PRPM

✅ **Recurring Revenue**: Subscription model (prpm+)
✅ **Value Proposition**: Clear benefit for paid tier
✅ **User Lock-in**: Hosted testing encourages continued use
✅ **Upsell Path**: Free → prpm+ → Pro → Enterprise
✅ **Cost Control**: Usage limits prevent abuse

## Implementation Phases

### Phase 1: MVP (Hosted Testing)
- [ ] Database schema for test jobs and usage tracking
- [ ] API routes for job submission and status
- [ ] Background job processor
- [ ] CLI support for hosted testing
- [ ] Usage limit enforcement

### Phase 2: Optimization
- [ ] Result caching (avoid re-running identical tests)
- [ ] Concurrent job management
- [ ] Priority queue for Pro users
- [ ] Cost optimization (model routing)

### Phase 3: Advanced Features
- [ ] Scheduled testing (CI/CD webhooks)
- [ ] Slack/Discord notifications
- [ ] Team test result sharing
- [ ] Custom model pools for Enterprise

This makes testing dramatically easier for prpm+ users while maintaining the option for free users to self-host!
