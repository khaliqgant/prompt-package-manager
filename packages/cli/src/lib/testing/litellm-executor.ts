/**
 * LiteLLM Test Executor
 *
 * Executes test cases using LiteLLM proxy (OpenAI-compatible interface)
 * Supports 100+ LLM providers through LiteLLM proxy server
 */

import OpenAI from 'openai';
import type {
  PackageTestCase,
  TestExecutionResult,
} from '@pr-pm/types';

export interface LiteLLMConfig {
  /** LiteLLM proxy URL (default: http://localhost:4000) */
  proxyUrl?: string;
  /** API key for LiteLLM proxy (or 'anything' for local) */
  apiKey?: string;
  /** Default model to use if not specified */
  defaultModel?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface TestResult {
  testCase: PackageTestCase;
  model: string;
  passed: boolean;
  score?: number;
  response?: string;
  error?: string;
  durationMs: number;
  tokensUsed?: number;
  costUsd?: number;
  assertionsPassed?: number;
  assertionsTotal?: number;
  assertionDetails?: AssertionResult[];
}

export interface AssertionResult {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

/**
 * LiteLLM Test Executor
 *
 * Uses OpenAI SDK with LiteLLM proxy for universal LLM access
 */
export class LiteLLMExecutor {
  private client: OpenAI;
  private config: Required<LiteLLMConfig>;

  constructor(config: LiteLLMConfig = {}) {
    this.config = {
      proxyUrl: config.proxyUrl || process.env.LITELLM_PROXY_URL || 'http://localhost:4000',
      apiKey: config.apiKey || process.env.LITELLM_API_KEY || 'anything',
      defaultModel: config.defaultModel || 'claude-sonnet-4',
      timeout: config.timeout || 120000, // 2 minutes
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.proxyUrl,
      timeout: this.config.timeout,
    });
  }

  /**
   * Execute a single test case
   */
  async executeTest(
    testCase: PackageTestCase,
    prompt: string,
    model?: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const modelToUse = model || this.config.defaultModel;

    try {
      // Execute prompt with model
      const completion = await this.client.chat.completions.create({
        model: modelToUse,
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
        temperature: 0, // Deterministic for testing
        max_tokens: 4096,
      });

      const durationMs = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || '';

      // Run assertions
      const assertionResults = await this.runAssertions(testCase, response);
      const assertionsPassed = assertionResults.filter((a) => a.passed).length;
      const passed = assertionsPassed === assertionResults.length;

      // Calculate score
      const score = assertionResults.length > 0
        ? assertionsPassed / assertionResults.length
        : 1.0;

      return {
        testCase,
        model: modelToUse,
        passed,
        score,
        response,
        durationMs,
        tokensUsed: completion.usage?.total_tokens,
        costUsd: this.estimateCost(modelToUse, completion.usage?.total_tokens || 0),
        assertionsPassed,
        assertionsTotal: assertionResults.length,
        assertionDetails: assertionResults,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      return {
        testCase,
        model: modelToUse,
        passed: false,
        score: 0,
        error: error.message || String(error),
        durationMs,
      };
    }
  }

  /**
   * Execute multiple test cases with multiple models
   */
  async executeTestSuite(
    testCases: PackageTestCase[],
    prompt: string,
    models: string[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      for (const model of models) {
        const result = await this.executeTest(testCase, prompt, model);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run assertions for a test case
   */
  private async runAssertions(
    testCase: PackageTestCase,
    response: string
  ): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];

    if (!testCase.assertions || testCase.assertions.length === 0) {
      // If no assertions, check expected output
      if (testCase.expected_output) {
        const passed = response.toLowerCase().includes(testCase.expected_output.toLowerCase());
        results.push({
          type: 'contains',
          passed,
          message: passed
            ? `Response contains expected output`
            : `Response does not contain expected output`,
          expected: testCase.expected_output,
          actual: response,
        });
      }
      return results;
    }

    // Run each assertion
    for (const assertion of testCase.assertions) {
      const result = await this.runAssertion(assertion, response);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single assertion
   */
  private async runAssertion(
    assertion: any,
    response: string
  ): Promise<AssertionResult> {
    const type = assertion.type || 'contains';

    switch (type) {
      case 'contains':
        return this.assertContains(response, assertion.value);

      case 'not-contains':
        return this.assertNotContains(response, assertion.value);

      case 'equals':
        return this.assertEquals(response, assertion.value);

      case 'regex':
        return this.assertRegex(response, assertion.value);

      case 'length-greater-than':
        return this.assertLengthGreaterThan(response, assertion.value);

      case 'length-less-than':
        return this.assertLengthLessThan(response, assertion.value);

      case 'is-json':
        return this.assertIsJson(response);

      default:
        return {
          type: 'unknown',
          passed: false,
          message: `Unknown assertion type: ${type}`,
        };
    }
  }

  private assertContains(response: string, value: string): AssertionResult {
    const passed = response.toLowerCase().includes(value.toLowerCase());
    return {
      type: 'contains',
      passed,
      message: passed
        ? `Response contains "${value}"`
        : `Response does not contain "${value}"`,
      expected: value,
      actual: response,
    };
  }

  private assertNotContains(response: string, value: string): AssertionResult {
    const passed = !response.toLowerCase().includes(value.toLowerCase());
    return {
      type: 'not-contains',
      passed,
      message: passed
        ? `Response does not contain "${value}"`
        : `Response contains "${value}"`,
      expected: `not ${value}`,
      actual: response,
    };
  }

  private assertEquals(response: string, value: string): AssertionResult {
    const passed = response.trim() === value.trim();
    return {
      type: 'equals',
      passed,
      message: passed
        ? `Response equals expected value`
        : `Response does not equal expected value`,
      expected: value,
      actual: response,
    };
  }

  private assertRegex(response: string, pattern: string): AssertionResult {
    try {
      const regex = new RegExp(pattern);
      const passed = regex.test(response);
      return {
        type: 'regex',
        passed,
        message: passed
          ? `Response matches pattern ${pattern}`
          : `Response does not match pattern ${pattern}`,
        expected: pattern,
        actual: response,
      };
    } catch (error: any) {
      return {
        type: 'regex',
        passed: false,
        message: `Invalid regex pattern: ${error.message}`,
      };
    }
  }

  private assertLengthGreaterThan(response: string, length: number): AssertionResult {
    const passed = response.length > length;
    return {
      type: 'length-greater-than',
      passed,
      message: passed
        ? `Response length (${response.length}) > ${length}`
        : `Response length (${response.length}) <= ${length}`,
      expected: `> ${length}`,
      actual: response.length,
    };
  }

  private assertLengthLessThan(response: string, length: number): AssertionResult {
    const passed = response.length < length;
    return {
      type: 'length-less-than',
      passed,
      message: passed
        ? `Response length (${response.length}) < ${length}`
        : `Response length (${response.length}) >= ${length}`,
      expected: `< ${length}`,
      actual: response.length,
    };
  }

  private assertIsJson(response: string): AssertionResult {
    try {
      JSON.parse(response);
      return {
        type: 'is-json',
        passed: true,
        message: 'Response is valid JSON',
      };
    } catch (error) {
      return {
        type: 'is-json',
        passed: false,
        message: 'Response is not valid JSON',
        actual: response,
      };
    }
  }

  /**
   * Estimate cost based on model and tokens
   * Rough estimates - actual costs from LiteLLM proxy
   */
  private estimateCost(model: string, tokens: number): number {
    // Cost per 1M tokens (approximate)
    const costPer1M: Record<string, number> = {
      'claude-sonnet-4': 3.0,
      'claude-opus-4': 15.0,
      'gpt-4o': 5.0,
      'gpt-4-turbo': 10.0,
      'gpt-3.5-turbo': 0.5,
      'llama-3.1-70b': 0.8,
      'llama-3.1-8b': 0.2,
    };

    // Extract base model name
    const baseModel = Object.keys(costPer1M).find((m) => model.includes(m));
    const costPerToken = (costPer1M[baseModel || 'gpt-3.5-turbo'] || 1.0) / 1000000;

    return tokens * costPerToken;
  }

  /**
   * Get summary statistics for test results
   */
  static getSummary(results: TestResult[]): {
    totalTests: number;
    testsPassed: number;
    testsFailed: number;
    overallScore: number;
    totalDuration: number;
    totalTokens: number;
    totalCost: number;
    modelBreakdown: Record<string, { passed: number; failed: number; score: number }>;
  } {
    const totalTests = results.length;
    const testsPassed = results.filter((r) => r.passed).length;
    const testsFailed = totalTests - testsPassed;
    const overallScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / totalTests;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (r.costUsd || 0), 0);

    // Model breakdown
    const modelBreakdown: Record<string, { passed: number; failed: number; score: number }> = {};
    results.forEach((r) => {
      if (!modelBreakdown[r.model]) {
        modelBreakdown[r.model] = { passed: 0, failed: 0, score: 0 };
      }
      if (r.passed) {
        modelBreakdown[r.model].passed++;
      } else {
        modelBreakdown[r.model].failed++;
      }
      modelBreakdown[r.model].score += r.score || 0;
    });

    // Average scores per model
    Object.keys(modelBreakdown).forEach((model) => {
      const count = modelBreakdown[model].passed + modelBreakdown[model].failed;
      modelBreakdown[model].score /= count;
    });

    return {
      totalTests,
      testsPassed,
      testsFailed,
      overallScore,
      totalDuration,
      totalTokens,
      totalCost,
      modelBreakdown,
    };
  }
}
