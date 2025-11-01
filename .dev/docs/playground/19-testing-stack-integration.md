# Complete Testing Stack Integration

**Date**: 2025-11-01
**Purpose**: Integrate LiteLLM, Promptfoo, and Claude Agent SDK for comprehensive package testing

## Overview

PRPM will use a **three-tier testing approach**:

1. **LiteLLM** - Universal LLM interface for all providers
2. **Promptfoo** - Testing framework with assertions and comparisons
3. **Claude Agent SDK** - Claude-specific testing with plugins and tools

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Package Testing                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   LiteLLM    │  │  Promptfoo   │  │  Claude SDK  │  │
│  │              │  │              │  │              │  │
│  │ • 100+ LLMs  │  │ • Test Cases │  │ • Agents     │  │
│  │ • Unified    │  │ • Assertions │  │ • Plugins    │  │
│  │   API        │  │ • Reports    │  │ • Tools      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │  PRPM CLI Test  │                    │
│                   │    Framework    │                    │
│                   └─────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 1. LiteLLM - Runtime Execution

**Use Case**: Execute any package with any LLM provider

### Installation
```bash
npm install litellm
```

### Implementation
```typescript
// packages/registry/src/services/playground-litellm.ts
import { LiteLLM } from 'litellm';

export class PlaygroundLiteLLMService {
  private litellm: LiteLLM;

  constructor() {
    this.litellm = new LiteLLM({
      fallback_models: ['claude-sonnet-4', 'gpt-4o'],
      retry_policy: {
        max_retries: 3,
        backoff_factor: 2
      }
    });
  }

  async executePrompt(request: {
    package_id: string;
    input: string;
    model: string; // "claude-sonnet-4", "gpt-4o", "gemini-pro", "ollama/llama3"
    config?: {
      temperature?: number;
      max_tokens?: number;
    };
  }) {
    const pkg = await this.getPackage(request.package_id);

    const response = await this.litellm.completion({
      model: request.model,
      messages: [
        { role: "system", content: pkg.content },
        { role: "user", content: request.input }
      ],
      temperature: request.config?.temperature ?? 0.7,
      max_tokens: request.config?.max_tokens ?? 4000
    });

    return {
      response: response.choices[0].message.content,
      model: response.model,
      provider: this.litellm.get_provider(response.model),
      tokens_used: response.usage.total_tokens,
      cost: this.calculateCost(response),
      latency_ms: response.response_ms
    };
  }

  private calculateCost(response: any): number {
    const rates = this.litellm.get_model_cost_map(response.model);
    return (
      response.usage.prompt_tokens * rates.prompt_cost_per_token +
      response.usage.completion_tokens * rates.completion_cost_per_token
    );
  }
}
```

### Playground Model Selector
```typescript
// Frontend: packages/webapp/src/components/playground/ModelSelector.tsx
const SUPPORTED_MODELS = [
  // Anthropic
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', tier: 'premium' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic', tier: 'fast' },

  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tier: 'premium' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', tier: 'fast' },

  // Google
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', tier: 'premium' },
  { id: 'gemini-flash', name: 'Gemini Flash', provider: 'Google', tier: 'fast' },

  // Local (FREE!)
  { id: 'ollama/llama3', name: 'Llama 3 (Local)', provider: 'Ollama', tier: 'free' },
  { id: 'ollama/mistral', name: 'Mistral (Local)', provider: 'Ollama', tier: 'free' },
];

export function ModelSelector({ value, onChange }: Props) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {SUPPORTED_MODELS.map(model => (
        <option key={model.id} value={model.id}>
          {model.name} ({model.provider}) - {model.tier}
        </option>
      ))}
    </select>
  );
}
```

## 2. Promptfoo - Testing Framework

**Use Case**: Automated testing with assertions and comparisons

### Installation
```bash
npm install promptfoo
```

### Implementation
```typescript
// packages/cli/src/lib/promptfoo/evaluator.ts
import { Promptfoo } from 'promptfoo';

export interface TestConfig {
  package_id: string;
  models: string[]; // ["claude-sonnet-4", "gpt-4o"]
  test_cases: GeneratedTestCase[];
}

export async function runPromptfooTests(config: TestConfig) {
  const pkg = await getPackage(config.package_id);

  // Convert PRPM test cases to Promptfoo format
  const promptfooConfig = {
    prompts: [pkg.content],
    providers: config.models, // LiteLLM format!
    tests: config.test_cases.map(tc => ({
      description: tc.title,
      vars: { input: tc.input },
      assert: [
        // Basic assertions
        ...tc.expected_criteria.map(criterion => ({
          type: 'llm-rubric',
          value: criterion,
          threshold: 0.7 // 70% match required
        })),

        // Quality checks
        { type: 'not-empty' },
        { type: 'is-json', if: tc.test_type === 'quality' },

        // Security checks
        { type: 'not-contains', value: ['ignore previous', 'system prompt'] },
      ]
    }))
  };

  // Run evaluation
  const results = await Promptfoo.evaluate(promptfooConfig);

  return formatResults(results);
}
```

### CLI Command
```bash
# Test package with default models
prpm test @cursor/react-conventions

# Test with specific models
prpm test @cursor/react-conventions --models claude-sonnet-4,gpt-4o,gemini-pro

# Test with local model (FREE)
prpm test @cursor/react-conventions --models ollama/llama3

# Compare two packages
prpm compare @cursor/react-conventions @react/best-practices
```

### Output
```
Testing @cursor/react-conventions

Models: claude-sonnet-4, gpt-4o, gemini-pro
Test Cases: 8

┌─────────────────────────┬──────────────┬──────────┬─────────────┐
│ Test Case               │ Claude       │ GPT-4o   │ Gemini      │
├─────────────────────────┼──────────────┼──────────┼─────────────┤
│ Component Structure     │ ✓ PASS (95%) │ ✓ (92%)  │ ✓ (88%)     │
│ State Management        │ ✓ PASS (92%) │ ✓ (90%)  │ ⚠ (75%)     │
│ Performance             │ ⚠ WARN (78%) │ ✓ (85%)  │ ✓ (90%)     │
│ TypeScript Integration  │ ✓ PASS (98%) │ ✓ (96%)  │ ✓ (94%)     │
│ Testing Strategy        │ ✓ PASS (88%) │ ✓ (92%)  │ ✓ (86%)     │
└─────────────────────────┴──────────────┴──────────┴─────────────┘

Overall Score: 91% (38/40 assertions passed)
Cost: $0.08 (Claude: $0.04, GPT: $0.03, Gemini: $0.01)
Duration: 12.3s
```

## 3. Claude Agent SDK - Claude-Specific Testing

**Use Case**: Test Claude agents, skills, and slash commands with plugins

### Installation
```bash
npm install @anthropic-ai/sdk @anthropic-ai/agents
```

### Implementation
```typescript
// packages/cli/src/lib/claude-agent/tester.ts
import { Agent } from '@anthropic-ai/agents';
import { createMcpTools } from '@anthropic-ai/mcp-tools';

export interface ClaudeTestConfig {
  package_id: string;
  package_type: 'agent' | 'skill' | 'slash-command';
  plugins?: string[]; // MCP server plugins to load
  tools?: any[]; // Custom tools
  test_cases: GeneratedTestCase[];
}

export class ClaudeAgentTester {
  async runAgentTests(config: ClaudeTestConfig) {
    const pkg = await this.getPackage(config.package_id);

    // Create agent with package content as system prompt
    const agent = new Agent({
      model: 'claude-sonnet-4',
      systemPrompt: pkg.content,

      // Load MCP plugins if specified
      plugins: config.plugins?.map(plugin => ({
        type: 'mcp-server',
        name: plugin,
        config: this.getPluginConfig(plugin)
      })),

      // Add custom tools
      tools: config.tools || [],

      // Hooks for monitoring
      hooks: {
        onToolUse: (tool, args) => {
          console.log(`Tool used: ${tool.name}`, args);
        },
        onError: (error) => {
          console.error('Agent error:', error);
        }
      }
    });

    const results = [];

    // Run each test case
    for (const testCase of config.test_cases) {
      const result = await this.runSingleTest(agent, testCase);
      results.push(result);
    }

    return this.formatResults(results);
  }

  private async runSingleTest(agent: Agent, testCase: GeneratedTestCase) {
    const startTime = Date.now();

    try {
      // Execute agent with test input
      const response = await agent.query({
        userMessage: testCase.input,
        maxTurns: 5, // Allow multi-turn conversation
        timeout: 30000 // 30 second timeout
      });

      // Evaluate against expected criteria
      const assertions = await this.evaluateResponse(
        response,
        testCase.expected_criteria
      );

      return {
        title: testCase.title,
        passed: assertions.every(a => a.passed),
        response: response.finalMessage,
        assertions,
        tools_used: response.toolsUsed || [],
        duration_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        title: testCase.title,
        passed: false,
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  private async evaluateResponse(
    response: string,
    expectedCriteria: string[]
  ) {
    // Use LLM-as-judge to evaluate each criterion
    const evaluations = await Promise.all(
      expectedCriteria.map(async criterion => {
        const result = await this.evaluateCriterion(response, criterion);
        return {
          criterion,
          passed: result.score > 0.7,
          score: result.score,
          explanation: result.explanation
        };
      })
    );

    return evaluations;
  }
}
```

### Testing Claude Packages with Plugins

```typescript
// Test a Claude agent that uses the filesystem MCP server
prpm test @myorg/code-reviewer --plugins filesystem

// Test with multiple plugins
prpm test @myorg/web-scraper --plugins fetch,brave-search

// Test with custom tools
prpm test @myorg/github-helper --plugins github --tools ./custom-tools.ts
```

### Example: Testing Code Review Agent

```typescript
const config: ClaudeTestConfig = {
  package_id: '@prpm/code-reviewer',
  package_type: 'agent',

  // Load MCP plugins
  plugins: [
    'filesystem', // For reading code files
    'github',     // For GitHub integration
  ],

  // Custom tools
  tools: [
    {
      name: 'run_linter',
      description: 'Run ESLint on code',
      input_schema: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        }
      },
      execute: async (args) => {
        const { ESLint } = await import('eslint');
        const eslint = new ESLint();
        const results = await eslint.lintText(args.code);
        return results;
      }
    }
  ],

  test_cases: [
    {
      title: 'Review component with bugs',
      input: 'Review this React component: [paste buggy code]',
      expected_criteria: [
        'Identifies useState issues',
        'Suggests useEffect cleanup',
        'Mentions prop validation',
        'Uses run_linter tool',
        'Provides refactored code'
      ]
    }
  ]
};

const results = await tester.runAgentTests(config);
```

## Complete CLI Test Command

```typescript
// packages/cli/src/commands/test.ts
import { Command } from 'commander';
import { LiteLLMService } from '../lib/litellm';
import { PromptfooEvaluator } from '../lib/promptfoo';
import { ClaudeAgentTester } from '../lib/claude-agent';

export const testCommand = new Command('test')
  .argument('<package>', 'Package name to test')
  .option('-m, --models <models>', 'Comma-separated list of models', 'claude-sonnet-4')
  .option('--plugins <plugins>', 'MCP plugins for Claude packages (comma-separated)')
  .option('--tools <path>', 'Path to custom tools file')
  .option('--local', 'Use local model (Ollama)')
  .option('--compare', 'Compare multiple packages')
  .action(async (packageName, options) => {
    console.log(`Testing ${packageName}...`);

    // Get package and test cases
    const pkg = await getPackage(packageName);
    const testCases = await getTestCases(pkg.id);

    // Determine testing strategy based on package type
    if (pkg.subtype === 'agent' && pkg.format === 'claude') {
      // Use Claude Agent SDK for Claude agents
      const tester = new ClaudeAgentTester();
      const results = await tester.runAgentTests({
        package_id: pkg.id,
        package_type: 'agent',
        plugins: options.plugins?.split(','),
        tools: options.tools ? await loadTools(options.tools) : undefined,
        test_cases: testCases
      });

      displayClaudeResults(results);

    } else {
      // Use Promptfoo + LiteLLM for other packages
      const models = options.local
        ? ['ollama/llama3']
        : options.models.split(',');

      const evaluator = new PromptfooEvaluator();
      const results = await evaluator.runTests({
        package_id: pkg.id,
        models,
        test_cases: testCases
      });

      displayPromptfooResults(results);
    }
  });
```

## Package-Specific Test Strategies

### Rules & Skills (Any Provider)
```bash
# Use Promptfoo + LiteLLM
prpm test @cursor/react-conventions --models claude-sonnet-4,gpt-4o,gemini-pro
```

### Claude Agents (Claude SDK)
```bash
# Use Claude Agent SDK with plugins
prpm test @prpm/code-reviewer --plugins filesystem,github
```

### Slash Commands (Claude SDK)
```bash
# Test slash command functionality
prpm test @prpm/explain --plugins filesystem
```

### MCP Tools (Claude SDK)
```bash
# Test MCP tool package
prpm test @prpm/brave-search --plugins brave-search
```

## Integration with Registry

### Store Test Results

```typescript
// After running tests, upload results to registry
POST /api/v1/packages/:id/test-results
Body: {
  version: "1.0.0",
  test_framework: "promptfoo" | "claude-agent",
  models_tested: ["claude-sonnet-4", "gpt-4o"],
  results: {
    total_tests: 8,
    passed: 7,
    failed: 1,
    score: 0.875,
    cost: 0.08,
    duration_ms: 12300
  },
  detailed_results: [...]
}
```

### Display Test Badges

```html
<!-- On package page -->
<div class="test-badges">
  <span class="badge">
    ✓ Tested on Claude, GPT-4, Gemini
  </span>
  <span class="badge">
    87.5% Pass Rate (7/8 tests)
  </span>
  <span class="badge">
    Last tested: 2 hours ago
  </span>
</div>
```

## Cost Comparison

### Testing with Different Models

| Model | Cost per Test | Speed | Quality |
|-------|---------------|-------|---------|
| Claude Sonnet 4 | $0.015 | Medium | Excellent |
| GPT-4o | $0.010 | Fast | Excellent |
| Gemini Pro | $0.002 | Fast | Good |
| Llama 3 (Local) | $0.000 | Slow | Good |

**Recommendation**:
- Development: Use `ollama/llama3` (FREE)
- CI/CD: Use `gpt-4o-mini` (cheap, fast)
- Production validation: Use `claude-sonnet-4` + `gpt-4o`

## Summary

### LiteLLM
**Purpose**: Universal LLM interface
**Use for**: Playground execution, multi-model support
**Benefits**: 100+ models, cost tracking, fallbacks

### Promptfoo
**Purpose**: Testing framework
**Use for**: Automated assertions, comparisons, reports
**Benefits**: Professional testing, metrics, security scanning

### Claude Agent SDK
**Purpose**: Claude-specific testing
**Use for**: Agents, plugins, tools, complex workflows
**Benefits**: Plugin support, multi-turn conversations, MCP integration

### Combined Power
✅ Test any package with any model
✅ Claude packages get enhanced testing with plugins
✅ Cost-effective with local model support
✅ Professional test reports
✅ Automated quality gates

## Next Steps

1. Install dependencies
2. Implement LiteLLM service
3. Add Promptfoo evaluator
4. Add Claude Agent tester
5. Create unified CLI test command
6. Add test result storage to registry
7. Display test badges on package pages
