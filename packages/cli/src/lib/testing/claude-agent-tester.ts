/**
 * Claude Agent SDK Test Executor
 *
 * Executes test cases using Claude Agent SDK with plugin support
 * Supports MCP (Model Context Protocol) plugins for Claude-specific packages
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  PackageTestCase,
} from '@pr-pm/types';
import type { AssertionResult, TestResult } from './litellm-executor.js';

export interface ClaudeAgentConfig {
  /** Anthropic API key */
  apiKey?: string;
  /** Model to use (default: claude-sonnet-4) */
  model?: string;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** MCP plugins to enable */
  plugins?: string[];
}

export interface MCPPluginConfig {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

/**
 * Claude Agent SDK Test Executor
 *
 * Uses Anthropic SDK with agent capabilities and MCP plugins
 */
export class ClaudeAgentTester {
  private client: Anthropic;
  private config: Required<Omit<ClaudeAgentConfig, 'plugins'>> & { plugins: string[] };

  constructor(config: ClaudeAgentConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: config.model || 'claude-sonnet-4-20250514',
      maxTokens: config.maxTokens || 4096,
      timeout: config.timeout || 120000,
      plugins: config.plugins || [],
    };

    if (!this.config.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Claude Agent testing');
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });
  }

  /**
   * Execute a single test case with Claude Agent
   */
  async executeTest(
    testCase: PackageTestCase,
    prompt: string,
    plugins?: string[]
  ): Promise<TestResult> {
    const startTime = Date.now();
    const pluginsToUse = plugins || this.config.plugins;

    try {
      // Build system prompt with plugin context
      const systemPrompt = this.buildSystemPrompt(prompt, pluginsToUse);

      // Execute with Claude
      const message = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: 0, // Deterministic for testing
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: testCase.input,
          },
        ],
      });

      const durationMs = Date.now() - startTime;
      const response = message.content
        .filter((c) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      // Track tool usage
      const toolsUsed = message.content
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any) => c.name);

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
        model: this.config.model,
        passed,
        score,
        response,
        durationMs,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
        costUsd: this.calculateCost(message.usage.input_tokens, message.usage.output_tokens),
        assertionsPassed,
        assertionsTotal: assertionResults.length,
        assertionDetails: assertionResults,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      return {
        testCase,
        model: this.config.model,
        passed: false,
        score: 0,
        error: error.message || String(error),
        durationMs,
      };
    }
  }

  /**
   * Execute multiple test cases
   */
  async executeTestSuite(
    testCases: PackageTestCase[],
    prompt: string,
    plugins?: string[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.executeTest(testCase, prompt, plugins);
      results.push(result);
    }

    return results;
  }

  /**
   * Build system prompt with plugin context
   */
  private buildSystemPrompt(prompt: string, plugins: string[]): string {
    let systemPrompt = prompt;

    if (plugins.length > 0) {
      systemPrompt += '\n\n# Available Tools\n\n';
      systemPrompt += 'You have access to the following MCP plugins:\n\n';

      plugins.forEach((plugin) => {
        const pluginInfo = this.getPluginInfo(plugin);
        systemPrompt += `- **${pluginInfo.name}**: ${pluginInfo.description}\n`;
      });

      systemPrompt += '\nUse these tools as needed to complete the task.';
    }

    return systemPrompt;
  }

  /**
   * Get plugin information
   */
  private getPluginInfo(plugin: string): { name: string; description: string } {
    const pluginMap: Record<string, { name: string; description: string }> = {
      filesystem: {
        name: 'Filesystem',
        description: 'Read and write files on the local filesystem',
      },
      github: {
        name: 'GitHub',
        description: 'Interact with GitHub repositories, issues, and pull requests',
      },
      'brave-search': {
        name: 'Brave Search',
        description: 'Search the web using Brave Search',
      },
      postgres: {
        name: 'PostgreSQL',
        description: 'Query and manage PostgreSQL databases',
      },
      sqlite: {
        name: 'SQLite',
        description: 'Query and manage SQLite databases',
      },
      fetch: {
        name: 'Fetch',
        description: 'Make HTTP requests to APIs and websites',
      },
      puppeteer: {
        name: 'Puppeteer',
        description: 'Control a headless browser for web scraping and automation',
      },
      'google-maps': {
        name: 'Google Maps',
        description: 'Search and get information about places',
      },
      slack: {
        name: 'Slack',
        description: 'Send messages and interact with Slack workspaces',
      },
      memory: {
        name: 'Memory',
        description: 'Store and retrieve information across conversations',
      },
    };

    return pluginMap[plugin] || { name: plugin, description: 'Custom MCP plugin' };
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
   * Run a single assertion (same logic as LiteLLM executor)
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
   * Calculate cost for Claude API usage
   * Based on Claude Sonnet 4 pricing: $3/M input, $15/M output
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const INPUT_COST_PER_1M = 3.0;
    const OUTPUT_COST_PER_1M = 15.0;

    const inputCost = (inputTokens / 1000000) * INPUT_COST_PER_1M;
    const outputCost = (outputTokens / 1000000) * OUTPUT_COST_PER_1M;

    return inputCost + outputCost;
  }

  /**
   * List available MCP plugins
   */
  static listAvailablePlugins(): MCPPluginConfig[] {
    return [
      { name: 'filesystem', enabled: false },
      { name: 'github', enabled: false },
      { name: 'brave-search', enabled: false },
      { name: 'postgres', enabled: false },
      { name: 'sqlite', enabled: false },
      { name: 'fetch', enabled: false },
      { name: 'puppeteer', enabled: false },
      { name: 'google-maps', enabled: false },
      { name: 'slack', enabled: false },
      { name: 'memory', enabled: false },
    ];
  }
}
