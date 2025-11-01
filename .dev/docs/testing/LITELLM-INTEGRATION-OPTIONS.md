# LiteLLM Integration Options for PRPM Cloud

How to integrate LiteLLM (Python proxy) with PRPM's Node.js/TypeScript infrastructure.

## The Challenge

- **LiteLLM**: Python-based proxy server
- **PRPM**: Node.js/TypeScript infrastructure
- **Worker**: Needs to execute LLM calls

## Option 1: Microservice Architecture (Recommended)

Deploy LiteLLM as a separate microservice that the worker calls via HTTP.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PRPM Cloud                         │
│                                                     │
│  ┌──────────────┐         ┌──────────────┐        │
│  │   Registry   │         │    Worker    │        │
│  │   (Node.js)  │         │  (Node.js)   │        │
│  └──────────────┘         └──────┬───────┘        │
│                                   │                 │
│                                   │ HTTP            │
│                                   ▼                 │
│                          ┌──────────────┐          │
│                          │   LiteLLM    │          │
│                          │   Proxy      │          │
│                          │  (Python)    │          │
│                          └──────┬───────┘          │
│                                 │                   │
└─────────────────────────────────┼───────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   External LLM APIs      │
                    │                          │
                    │  • Anthropic (Claude)    │
                    │  • OpenAI (GPT)          │
                    │  • Google (Gemini)       │
                    │  • Together AI (Llama)   │
                    └──────────────────────────┘
```

### Implementation

#### 1. Deploy LiteLLM as Microservice

**Docker Compose** (simplest):

```yaml
# docker-compose.yml

services:
  # Existing services...
  postgres:
    image: postgres:16
    # ...

  registry:
    build: .
    # ...

  # LiteLLM Proxy Service
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: prpm-litellm
    ports:
      - "4000:4000"
    environment:
      # API Keys (from secrets)
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - TOGETHER_API_KEY=${TOGETHER_API_KEY}

      # Database for usage tracking (optional)
      - DATABASE_URL=${LITELLM_DATABASE_URL}

      # Master key for internal auth
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
    volumes:
      - ./litellm_config.yaml:/app/config.yaml:ro
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Test Job Worker
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - LITELLM_PROXY_URL=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - litellm
    restart: unless-stopped
```

**LiteLLM Config**:

```yaml
# litellm_config.yaml

model_list:
  # Anthropic Models
  - model_name: claude-sonnet-4
    litellm_params:
      model: claude-sonnet-4-20250514
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-opus-4
    litellm_params:
      model: claude-opus-4-20250514
      api_key: os.environ/ANTHROPIC_API_KEY

  # OpenAI Models
  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY

  - model_name: gpt-3.5-turbo
    litellm_params:
      model: gpt-3.5-turbo
      api_key: os.environ/OPENAI_API_KEY

  # Google Models
  - model_name: gemini-pro
    litellm_params:
      model: gemini/gemini-pro
      api_key: os.environ/GOOGLE_API_KEY

  # Meta Llama via Together AI
  - model_name: llama-3.1-70b
    litellm_params:
      model: together_ai/meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
      api_key: os.environ/TOGETHER_API_KEY

  - model_name: llama-3.1-8b
    litellm_params:
      model: together_ai/meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
      api_key: os.environ/TOGETHER_API_KEY

litellm_settings:
  # Master key for internal auth
  master_key: os.environ/LITELLM_MASTER_KEY

  # Retries and timeouts
  num_retries: 3
  request_timeout: 120

  # Fallback chain
  fallbacks:
    - model: claude-sonnet-4
      fallbacks: ["gpt-4o", "claude-opus-4"]
    - model: gpt-4o
      fallbacks: ["claude-sonnet-4"]

  # Cost tracking
  success_callback: ["langfuse"]  # Optional

  # Cache responses (optional)
  cache: true
  redis_host: redis
  redis_port: 6379
```

#### 2. Worker Uses HTTP Client

```typescript
// packages/cli/src/lib/testing/litellm-executor.ts

import OpenAI from 'openai';

export class LiteLLMExecutor {
  private client: OpenAI;

  constructor(config: LiteLLMConfig = {}) {
    // Use LiteLLM proxy as OpenAI-compatible endpoint
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.LITELLM_API_KEY || 'anything',
      baseURL: config.proxyUrl || process.env.LITELLM_PROXY_URL || 'http://litellm:4000',
      timeout: config.timeout || 120000,
    });
  }

  // Rest of implementation stays the same...
  // LiteLLM proxy exposes OpenAI-compatible API
}
```

### Deployment

**Local Development**:
```bash
docker-compose up litellm worker
```

**Production** (AWS/GCP/Azure):

Deploy as separate services:
- LiteLLM: Container service (ECS, Cloud Run, etc.)
- Worker: Container service
- Both connect via internal network

---

## Option 2: Skip LiteLLM - Use Native SDKs (Simpler)

Don't use LiteLLM at all. Use native TypeScript SDKs for each provider.

### Architecture

```
┌────────────────────────────────────────┐
│           PRPM Worker                  │
│                                        │
│  ┌────────────────────────────────┐   │
│  │  Multi-Provider Executor       │   │
│  │                                │   │
│  │  • @anthropic-ai/sdk           │   │
│  │  • openai                      │   │
│  │  • @google/generative-ai       │   │
│  └────────────┬───────────────────┘   │
│               │                        │
└───────────────┼────────────────────────┘
                │
                ▼
    ┌────────────────────────┐
    │   External LLM APIs    │
    │                        │
    │  • Anthropic           │
    │  • OpenAI              │
    │  • Google              │
    └────────────────────────┘
```

### Implementation

```typescript
// packages/cli/src/lib/testing/universal-executor.ts

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class UniversalLLMExecutor {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private google: GoogleGenerativeAI;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY!
    );
  }

  async executeTest(
    testCase: PackageTestCase,
    prompt: string,
    model: string
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      let response: string;
      let tokensUsed: number;
      let costUsd: number;

      // Route to appropriate SDK based on model
      if (model.startsWith('claude-')) {
        const result = await this.callAnthropic(testCase, prompt, model);
        response = result.response;
        tokensUsed = result.tokens;
        costUsd = result.cost;
      } else if (model.startsWith('gpt-')) {
        const result = await this.callOpenAI(testCase, prompt, model);
        response = result.response;
        tokensUsed = result.tokens;
        costUsd = result.cost;
      } else if (model.startsWith('gemini-')) {
        const result = await this.callGoogle(testCase, prompt, model);
        response = result.response;
        tokensUsed = result.tokens;
        costUsd = result.cost;
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      const durationMs = Date.now() - startTime;

      // Run assertions (same as before)
      const assertionResults = await this.runAssertions(testCase, response);
      const assertionsPassed = assertionResults.filter((a) => a.passed).length;
      const passed = assertionsPassed === assertionResults.length;
      const score = assertionResults.length > 0
        ? assertionsPassed / assertionResults.length
        : 1.0;

      return {
        testCase,
        model,
        passed,
        score,
        response,
        durationMs,
        tokensUsed,
        costUsd,
        assertionsPassed,
        assertionsTotal: assertionResults.length,
        assertionDetails: assertionResults,
      };
    } catch (error: any) {
      return {
        testCase,
        model,
        passed: false,
        score: 0,
        error: error.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async callAnthropic(
    testCase: PackageTestCase,
    prompt: string,
    model: string
  ) {
    const message = await this.anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      temperature: 0,
      system: prompt,
      messages: [
        {
          role: 'user',
          content: testCase.input,
        },
      ],
    });

    const response = message.content
      .filter((c) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');

    const tokens = message.usage.input_tokens + message.usage.output_tokens;

    // Claude Sonnet 4: $3 input, $15 output per 1M tokens
    const cost =
      (message.usage.input_tokens / 1_000_000) * 3.0 +
      (message.usage.output_tokens / 1_000_000) * 15.0;

    return { response, tokens, cost };
  }

  private async callOpenAI(
    testCase: PackageTestCase,
    prompt: string,
    model: string
  ) {
    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: testCase.input,
        },
      ],
      temperature: 0,
      max_tokens: 4096,
    });

    const response = completion.choices[0]?.message?.content || '';
    const tokens = completion.usage?.total_tokens || 0;

    // GPT-4o: ~$5 per 1M tokens (average)
    const cost = (tokens / 1_000_000) * 5.0;

    return { response, tokens, cost };
  }

  private async callGoogle(
    testCase: PackageTestCase,
    prompt: string,
    model: string
  ) {
    const genModel = this.google.getGenerativeModel({ model });

    const result = await genModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { text: testCase.input },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
      },
    });

    const response = result.response.text();

    // Gemini Pro: ~$0.50 per 1M tokens
    const tokens = 1000; // Estimate (Google doesn't always return token count)
    const cost = (tokens / 1_000_000) * 0.5;

    return { response, tokens, cost };
  }

  // runAssertions() same as before...
}
```

### Pros of Native SDKs

✅ **No Python dependency**: Pure TypeScript/Node.js
✅ **Simpler deployment**: One less service to manage
✅ **Better type safety**: Native TypeScript types
✅ **Direct control**: No proxy in between
✅ **Easier debugging**: Direct error messages

### Cons of Native SDKs

❌ **More code to maintain**: Need to implement each provider
❌ **No universal fallbacks**: LiteLLM handles this automatically
❌ **Manual retry logic**: Need to implement per provider
❌ **No caching**: LiteLLM has built-in caching

---

## Option 3: Hybrid Approach (Best of Both)

Use native SDKs for primary models, LiteLLM for exotic ones.

```typescript
export class HybridExecutor {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private litellm: OpenAI; // LiteLLM proxy as fallback

  async executeTest(testCase, prompt, model) {
    // Use native SDK for common models
    if (model.startsWith('claude-') || model.startsWith('gpt-')) {
      return this.executeNative(testCase, prompt, model);
    }

    // Use LiteLLM for everything else
    return this.executeLiteLLM(testCase, prompt, model);
  }
}
```

---

## Recommendation: Which Option?

### For MVP / Getting Started
**Option 2: Native SDKs**
- Simpler to deploy
- No Python dependency
- Support for Claude + GPT covers 90% of use cases
- Can add more providers later

### For Production / Scale
**Option 1: LiteLLM Microservice**
- More providers out of the box
- Better fallback/retry logic
- Centralized cost tracking
- Load balancing and caching

### Implementation Plan

**Phase 1**: Native SDKs (Claude + OpenAI only)
```typescript
// Start simple
if (model.startsWith('claude-')) {
  // Use Anthropic SDK
} else if (model.startsWith('gpt-')) {
  // Use OpenAI SDK
} else {
  throw new Error('Model not supported yet');
}
```

**Phase 2**: Add LiteLLM for more models
```yaml
# Add when you need Llama, Gemini, etc.
docker-compose up litellm
```

**Phase 3**: Migrate everything to LiteLLM
```typescript
// Eventually, use LiteLLM for everything
// for better caching, fallbacks, and cost tracking
```

---

## Quick Start with Native SDKs (No LiteLLM)

This is the **simplest** path forward:

### 1. Update Dependencies

```json
// packages/cli/package.json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.40.0",
    "openai": "^4.76.0"
  }
}
```

### 2. Remove LiteLLM Executor

Delete or rename:
- `packages/cli/src/lib/testing/litellm-executor.ts`

### 3. Create Universal Executor

Use the `UniversalLLMExecutor` code from Option 2 above.

### 4. Update Worker

```typescript
// packages/registry/src/workers/test-runner.ts

import { UniversalLLMExecutor } from '../../cli/src/lib/testing/universal-executor';

export class TestJobWorker {
  private executor: UniversalLLMExecutor;

  constructor(db: PostgresDb) {
    this.executor = new UniversalLLMExecutor();
    // No LiteLLM proxy needed!
  }
}
```

### 5. Set Environment Variables

```bash
# Only need these
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# No LITELLM_PROXY_URL needed!
```

### 6. Deploy

```bash
# No LiteLLM container needed
docker-compose up worker
```

**Done!** Zero Python, pure TypeScript.

---

## My Recommendation

**Start with Option 2 (Native SDKs)** because:

1. ✅ Simpler deployment (no Python)
2. ✅ Easier debugging
3. ✅ Claude + GPT covers most use cases
4. ✅ Can add LiteLLM later if needed

Then **add LiteLLM** when you need:
- More exotic models (Llama, Mistral, etc.)
- Built-in caching and fallbacks
- Centralized cost tracking
- Load balancing across keys

The code I already wrote for `LiteLLMExecutor` was assuming you'd use the proxy, but the `UniversalLLMExecutor` approach is **actually simpler** and requires no Python infrastructure.

Would you like me to create the `UniversalLLMExecutor` implementation to replace the LiteLLM one?
