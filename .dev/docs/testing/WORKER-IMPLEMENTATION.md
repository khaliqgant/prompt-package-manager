# Backend Worker Implementation Guide

Complete guide for implementing the test job worker that processes hosted testing requests.

## Overview

The worker is a long-running background process that:
1. Polls the `test_jobs` queue for pending jobs
2. Executes tests using LiteLLM or Claude Agent SDK
3. Uploads results to the database
4. Updates usage tracking
5. Handles errors and retries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Worker Process                          │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Job Poll  │───▶│  Test Runner │───▶│ Result Upload│  │
│  │   (loop)    │    │              │    │              │  │
│  └─────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │         │
└─────────┼───────────────────┼────────────────────┼─────────┘
          │                   │                    │
          ▼                   ▼                    ▼
    ┌──────────┐      ┌──────────────┐      ┌──────────┐
    │ Postgres │      │ LiteLLM Proxy│      │ Postgres │
    │  Queue   │      │ or Claude API│      │ Results  │
    └──────────┘      └──────────────┘      └──────────┘
```

## Worker Components

### 1. Job Polling

The worker continuously polls for jobs from the queue:

```typescript
// packages/registry/src/workers/test-runner.ts

import { PostgresDb } from '@fastify/postgres';
import { LiteLLMExecutor } from '../../cli/src/lib/testing/litellm-executor';
import { ClaudeAgentTester } from '../../cli/src/lib/testing/claude-agent-tester';

export class TestJobWorker {
  private db: PostgresDb;
  private running = false;
  private pollIntervalMs = 1000; // 1 second
  private litellmExecutor: LiteLLMExecutor;
  private claudeTester: ClaudeAgentTester;

  constructor(db: PostgresDb) {
    this.db = db;

    // Initialize executors with PRPM's API keys
    this.litellmExecutor = new LiteLLMExecutor({
      proxyUrl: process.env.LITELLM_PROXY_URL || 'http://localhost:4000',
      apiKey: process.env.LITELLM_API_KEY || 'prpm-internal',
    });

    this.claudeTester = new ClaudeAgentTester({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  async start() {
    console.log('🚀 Test job worker started');
    this.running = true;

    while (this.running) {
      try {
        await this.processNextJob();
      } catch (error) {
        console.error('Error processing job:', error);
        // Continue processing even if one job fails
      }

      // Wait before polling again
      await this.sleep(this.pollIntervalMs);
    }
  }

  stop() {
    console.log('🛑 Test job worker stopping');
    this.running = false;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processNextJob(): Promise<void> {
    // Get next job from queue (uses FOR UPDATE SKIP LOCKED)
    const { rows } = await this.db.query(
      'SELECT * FROM get_next_test_job()'
    );

    if (rows.length === 0) {
      // No jobs in queue
      return;
    }

    const job = rows[0];
    console.log(`📦 Processing job ${job.id} for package ${job.package_id}`);

    try {
      await this.executeJob(job);
    } catch (error: any) {
      await this.handleJobFailure(job.id, error);
    }
  }

  private async executeJob(job: any): Promise<void> {
    // Fetch test cases
    const { rows: testCases } = await this.db.query(
      `SELECT
        title,
        description,
        input,
        expected_output,
        assertions
      FROM package_test_cases
      WHERE package_id = $1 AND active = true
      ORDER BY created_at`,
      [job.package_id]
    );

    if (testCases.length === 0) {
      throw new Error('No active test cases found for package');
    }

    // Fetch package content
    const { rows: [pkg] } = await this.db.query(
      `SELECT pv.content_json, p.format
       FROM package_versions pv
       JOIN packages p ON pv.package_id = p.id
       WHERE pv.package_id = $1 AND pv.version = $2`,
      [job.package_id, job.package_version]
    );

    if (!pkg) {
      throw new Error('Package version not found');
    }

    // Extract prompt text
    const prompt = this.extractPrompt(pkg.content_json);

    // Execute tests based on framework
    let results;
    if (job.framework === 'claude-agent') {
      results = await this.claudeTester.executeTestSuite(
        testCases,
        prompt,
        job.plugins_requested || []
      );
    } else {
      results = await this.litellmExecutor.executeTestSuite(
        testCases,
        prompt,
        job.models_requested
      );
    }

    // Calculate summary
    const summary = LiteLLMExecutor.getSummary(results);

    // Upload results to database
    const testResultId = await this.uploadResults(job, results, summary);

    // Update job as completed
    await this.db.query(
      `UPDATE test_jobs
       SET status = 'completed',
           completed_at = NOW(),
           test_result_id = $1,
           tokens_used = $2,
           cost_usd = $3
       WHERE id = $4`,
      [testResultId, summary.totalTokens, summary.totalCost, job.id]
    );

    // Increment user's usage counter
    await this.db.query(
      'SELECT increment_test_usage($1, $2, $3)',
      [job.user_id, summary.totalTokens, summary.totalCost]
    );

    console.log(`✅ Job ${job.id} completed successfully`);
  }

  private extractPrompt(contentJson: any): string {
    // Same logic as CLI
    if (!contentJson) return '';

    if (contentJson.sections && Array.isArray(contentJson.sections)) {
      let text = '';
      for (const section of contentJson.sections) {
        if (section.title) text += `## ${section.title}\n\n`;
        if (section.content) text += `${section.content}\n\n`;
        if (section.items) {
          text += section.items.map((item: any) =>
            typeof item === 'string' ? `- ${item}` : JSON.stringify(item)
          ).join('\n') + '\n\n';
        }
      }
      return text.trim();
    }

    if (typeof contentJson === 'string') {
      return contentJson;
    }

    return JSON.stringify(contentJson, null, 2);
  }

  private async uploadResults(
    job: any,
    results: any[],
    summary: any
  ): Promise<string> {
    // Only upload if job requested it
    if (!job.upload_results) {
      return null;
    }

    // Insert main test result
    const { rows: [testResult] } = await this.db.query(
      `INSERT INTO package_test_results (
        package_id,
        package_version,
        test_framework,
        models_tested,
        plugins_used,
        test_environment,
        total_tests,
        tests_passed,
        tests_failed,
        overall_score,
        total_duration_ms,
        total_tokens_used,
        total_cost_usd,
        is_verified,
        run_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        job.package_id,
        job.package_version,
        job.framework,
        job.models_requested,
        job.plugins_requested,
        'prpm-hosted',
        summary.totalTests,
        summary.testsPassed,
        summary.testsFailed,
        summary.overallScore,
        summary.totalDuration,
        summary.totalTokens,
        summary.totalCost,
        job.verify_results, // Only verify if user requested and has permission
        job.user_id
      ]
    );

    const testResultId = testResult.id;

    // Insert individual test details
    for (const result of results) {
      await this.db.query(
        `INSERT INTO package_test_details (
          test_result_id,
          test_case_title,
          test_case_description,
          test_input,
          model,
          passed,
          score,
          response,
          error_message,
          assertions_total,
          assertions_passed,
          assertion_details,
          duration_ms,
          tokens_used,
          cost_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          testResultId,
          result.testCase.title,
          result.testCase.description,
          result.testCase.input,
          result.model,
          result.passed,
          result.score,
          result.response,
          result.error,
          result.assertionsTotal,
          result.assertionsPassed,
          JSON.stringify(result.assertionDetails),
          result.durationMs,
          result.tokensUsed,
          result.costUsd
        ]
      );
    }

    return testResultId;
  }

  private async handleJobFailure(jobId: string, error: Error): Promise<void> {
    console.error(`❌ Job ${jobId} failed:`, error.message);

    await this.db.query(
      `UPDATE test_jobs
       SET status = 'failed',
           completed_at = NOW(),
           error_message = $1
       WHERE id = $2`,
      [error.message, jobId]
    );
  }
}
```

### 2. Worker Entry Point

```typescript
// packages/registry/src/workers/index.ts

import { PostgresDb } from '@fastify/postgres';
import { TestJobWorker } from './test-runner';

export async function startWorkers(db: PostgresDb) {
  const worker = new TestJobWorker(db);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    worker.stop();
    process.exit(0);
  });

  await worker.start();
}
```

### 3. Separate Worker Process

Create a dedicated worker executable:

```typescript
// packages/registry/src/bin/worker.ts

#!/usr/bin/env node

import fastifyPostgres from '@fastify/postgres';
import { startWorkers } from '../workers/index';

async function main() {
  console.log('🚀 Starting PRPM test job worker');

  // Initialize database connection
  const pg = fastifyPostgres;

  const db = await pg.connect({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('✅ Database connected');

  // Start workers
  await startWorkers(db);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### 4. Package.json Script

```json
{
  "scripts": {
    "worker": "tsx src/bin/worker.ts",
    "worker:dev": "tsx watch src/bin/worker.ts"
  }
}
```

## Infrastructure Requirements

### 1. LiteLLM Proxy Setup

Install and configure LiteLLM proxy:

```bash
# Install LiteLLM
pip install 'litellm[proxy]'

# Create config file
cat > litellm_config.yaml <<EOF
model_list:
  # Anthropic Models
  - model_name: claude-sonnet-4
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: ${ANTHROPIC_API_KEY}

  - model_name: claude-opus-4
    litellm_params:
      model: anthropic/claude-opus-4-20250514
      api_key: ${ANTHROPIC_API_KEY}

  # OpenAI Models
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: ${OPENAI_API_KEY}

  - model_name: gpt-4-turbo
    litellm_params:
      model: openai/gpt-4-turbo
      api_key: ${OPENAI_API_KEY}

  - model_name: gpt-3.5-turbo
    litellm_params:
      model: openai/gpt-3.5-turbo
      api_key: ${OPENAI_API_KEY}

  # Google Models
  - model_name: gemini-pro
    litellm_params:
      model: google/gemini-pro
      api_key: ${GOOGLE_API_KEY}

  # Meta Llama (via Together AI)
  - model_name: llama-3.1-70b
    litellm_params:
      model: together_ai/meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
      api_key: ${TOGETHER_API_KEY}

  - model_name: llama-3.1-8b
    litellm_params:
      model: together_ai/meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
      api_key: ${TOGETHER_API_KEY}

litellm_settings:
  success_callback: ["langfuse"]  # Optional: track usage
  failure_callback: ["langfuse"]
  num_retries: 3
  request_timeout: 120
  fallback_models: ["gpt-4o", "claude-sonnet-4"]  # Fallback chain
EOF

# Start LiteLLM proxy
litellm --config litellm_config.yaml --port 4000
```

### 2. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/prpm

# LiteLLM
LITELLM_PROXY_URL=http://localhost:4000
LITELLM_API_KEY=prpm-internal-key

# Anthropic (for Claude Agent SDK)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: For LiteLLM providers
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
TOGETHER_API_KEY=...
```

### 3. Docker Deployment

```dockerfile
# Dockerfile.worker

FROM node:20-alpine

WORKDIR /app

# Install Python for LiteLLM
RUN apk add --no-cache python3 py3-pip

# Install LiteLLM
RUN pip3 install 'litellm[proxy]'

# Copy package files
COPY package*.json ./
COPY packages/registry/package.json ./packages/registry/
COPY packages/cli/package.json ./packages/cli/

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Start worker
CMD ["npm", "run", "worker"]
```

```yaml
# docker-compose.yml

services:
  # Existing services...

  # LiteLLM Proxy
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - TOGETHER_API_KEY=${TOGETHER_API_KEY}
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml", "--port", "4000"]

  # Test Job Worker
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - LITELLM_PROXY_URL=http://litellm:4000
      - LITELLM_API_KEY=prpm-internal-key
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - litellm
    restart: unless-stopped
```

## Scaling & Production

### Multiple Workers

Run multiple worker instances for parallel processing:

```bash
# Scale workers
docker-compose up -d --scale worker=5
```

Each worker will:
- Poll independently
- Use `FOR UPDATE SKIP LOCKED` to avoid conflicts
- Process different jobs concurrently

### Priority Queue

Jobs are processed by priority (already implemented in database):

```sql
-- High priority (Enterprise users)
priority = 2

-- Medium priority (Pro users)
priority = 1

-- Normal priority (Plus users)
priority = 0
```

### Monitoring

```typescript
// Add monitoring to worker

import { register, Counter, Histogram } from 'prom-client';

const jobsProcessed = new Counter({
  name: 'prpm_jobs_processed_total',
  help: 'Total number of test jobs processed',
  labelNames: ['status', 'framework']
});

const jobDuration = new Histogram({
  name: 'prpm_job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['framework']
});

// In worker:
const timer = jobDuration.startTimer({ framework: job.framework });
try {
  await this.executeJob(job);
  jobsProcessed.inc({ status: 'success', framework: job.framework });
} catch (error) {
  jobsProcessed.inc({ status: 'failed', framework: job.framework });
  throw error;
} finally {
  timer();
}
```

### Error Handling & Retries

```typescript
// Add retry logic

private async executeJobWithRetry(job: any, maxRetries = 3): Promise<void> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.executeJob(job);
      return; // Success
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await this.sleep(delay);
      }
    }
  }

  // All retries failed
  throw lastError;
}
```

## Cost Optimization

### 1. Result Caching

Avoid re-running identical tests:

```typescript
// Check cache before running
const cacheKey = crypto
  .createHash('sha256')
  .update(JSON.stringify({
    package_id: job.package_id,
    version: job.package_version,
    models: job.models_requested,
    test_cases: testCases,
  }))
  .digest('hex');

// Check if we have recent results
const { rows: cached } = await this.db.query(
  `SELECT id FROM package_test_results
   WHERE package_id = $1
     AND package_version = $2
     AND models_tested = $3
     AND created_at > NOW() - INTERVAL '24 hours'
   LIMIT 1`,
  [job.package_id, job.package_version, job.models_requested]
);

if (cached.length > 0) {
  console.log('Using cached results');
  return cached[0].id;
}
```

### 2. Model Routing

Route to cheapest model that meets requirements:

```typescript
const modelCosts = {
  'claude-sonnet-4': 3.0,
  'claude-opus-4': 15.0,
  'gpt-4o': 5.0,
  'gpt-4-turbo': 10.0,
  'gpt-3.5-turbo': 0.5,
  'llama-3.1-70b': 0.8,
  'llama-3.1-8b': 0.2,
};

// Sort models by cost
const sortedModels = job.models_requested.sort(
  (a, b) => modelCosts[a] - modelCosts[b]
);
```

## Testing the Worker

### Local Development

```bash
# Terminal 1: Start LiteLLM proxy
litellm --config litellm_config.yaml --port 4000

# Terminal 2: Start worker
cd packages/registry
npm run worker:dev
```

### Manual Testing

```bash
# Submit a test job via CLI
prpm login
prpm test @author/package

# Watch worker logs
# Should see: "📦 Processing job ..."
```

### Load Testing

```typescript
// scripts/load-test-worker.ts

import { RegistryClient } from '@prpm/registry-client';

async function loadTest() {
  const client = new RegistryClient({
    url: 'http://localhost:3000',
    token: process.env.PRPM_TOKEN,
  });

  // Submit 100 jobs
  const jobs = [];
  for (let i = 0; i < 100; i++) {
    jobs.push(
      client.submitTestJob({
        package_id: 'test-package-id',
        models: ['gpt-3.5-turbo'], // Fast, cheap model
      })
    );
  }

  const results = await Promise.all(jobs);
  console.log(`Submitted ${results.length} jobs`);
}
```

## Summary: What You Need

### Code (Already Complete)
✅ Worker class with job processing logic
✅ Database functions for queue management
✅ API routes for job submission
✅ CLI integration

### Infrastructure Needed
1. **LiteLLM Proxy** - Running server with API keys configured
2. **Worker Process** - Background Node.js process running the worker
3. **Environment Variables** - API keys, database URL, proxy URL
4. **Docker Setup** (Optional) - For production deployment
5. **Monitoring** (Optional) - Prometheus/Grafana for observability

### Deployment Steps
1. Set up LiteLLM proxy with all model providers
2. Configure environment variables with API keys
3. Run database migrations (already created)
4. Start worker process: `npm run worker`
5. Test with: `prpm test @author/package`
6. Monitor logs and metrics

That's it! The worker is the final piece to make hosted testing fully operational.
