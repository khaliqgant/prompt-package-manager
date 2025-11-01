/**
 * Test command - Test packages using LiteLLM or Claude Agent SDK
 */

import { Command } from 'commander';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { telemetry } from '../core/telemetry';
import { LiteLLMExecutor, TestResult } from '../lib/testing/litellm-executor.js';
import { ClaudeAgentTester } from '../lib/testing/claude-agent-tester.js';
import type { Package, PackageTestCase } from '@pr-pm/types';

export interface TestCommandOptions {
  models?: string;
  plugins?: string;
  framework?: 'litellm' | 'claude-agent' | 'auto';
  upload?: boolean;
  verify?: boolean;
  verbose?: boolean;
  local?: boolean;
}

/**
 * Create test command
 */
export function createTestCommand(): Command {
  const command = new Command('test');

  command
    .description('Test a package with AI models')
    .argument('<package>', 'Package name to test (e.g., @author/package)')
    .option('-m, --models <models>', 'Comma-separated list of models to test with', 'claude-sonnet-4')
    .option('-p, --plugins <plugins>', 'Comma-separated list of MCP plugins for Claude packages')
    .option('-f, --framework <framework>', 'Testing framework (litellm, claude-agent, auto)', 'auto')
    .option('--local', 'Use local testing (requires LiteLLM/API keys)', false)
    .option('-u, --upload', 'Upload test results to registry', false)
    .option('-v, --verify', 'Mark results as verified (requires package ownership)', false)
    .option('--verbose', 'Show detailed test output', false)
    .action(async (packageName: string, options: TestCommandOptions) => {
    try {
      // Get config and client
      const config = getConfig();
      const client = getRegistryClient(config);

      // Determine testing mode
      const hasToken = !!config.token;
      const useHosted = hasToken && !options.local;

      if (useHosted) {
        console.log(`🧪 Testing package: ${packageName}`);
        console.log('🚀 Using PRPM hosted testing (prpm+)\n');
        await runHostedTest(client, packageName, options);
      } else {
        if (!hasToken && !options.local) {
          console.log('💡 Tip: Login with `prpm login` to use zero-setup hosted testing (prpm+)');
          console.log('   Or use --local to test with your own infrastructure\n');
        }
        console.log(`🧪 Testing package: ${packageName}`);
        console.log('🔧 Using local testing\n');
        await runLocalTest(client, packageName, options);
      }

    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      if (error.stack && process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

  return command;
}

/**
 * Run hosted test (prpm+ users)
 */
async function runHostedTest(
  client: any,
  packageName: string,
  options: TestCommandOptions
) {
  try {
    // Fetch package
    const pkg = await fetchPackage(client, packageName);
    if (!pkg) {
      console.error(`❌ Package not found: ${packageName}`);
      process.exit(1);
    }

    console.log(`📦 ${pkg.name} v${pkg.latest_version}`);
    console.log(`   ${pkg.description || 'No description'}\n`);

    // Parse options
    const models = options.models?.split(',').map((m) => m.trim()) || ['claude-sonnet-4'];
    const plugins = options.plugins?.split(',').map((p) => p.trim());

    // Submit test job
    console.log('📤 Submitting test job...\n');

    const job = await client.submitTestJob({
      package_id: pkg.id,
      models,
      plugins,
      upload_results: options.upload !== false, // Default to true for hosted
      verify_results: options.verify,
    });

    console.log(`✅ Job submitted (ID: ${job.job_id})`);
    console.log(`   Status: ${job.status}`);
    if (job.position_in_queue && job.position_in_queue > 1) {
      console.log(`   Position in queue: ${job.position_in_queue}`);
    }
    if (job.estimated_wait_seconds && job.estimated_wait_seconds > 0) {
      console.log(`   Estimated wait: ${job.estimated_wait_seconds}s`);
    }
    console.log(`   Usage: ${job.usage.tests_used_this_month}/${job.usage.tests_used_this_month + job.usage.tests_remaining} tests this month (${job.usage.tier})`);
    console.log();

    // Poll for results
    console.log('⏳ Waiting for results');

    let attempts = 0;
    const maxAttempts = 180; // 3 minutes max
    let lastStatus = '';

    while (attempts < maxAttempts) {
      const status = await client.getTestJob(job.job_id);

      if (status.status === 'completed') {
        console.log('\n✅ Test completed!\n');

        // Display results
        displayHostedResults(status.results);

        if (status.results?.test_result_id) {
          console.log(`\n📊 View results: https://prpm.dev/packages/${pkg.id}/tests\n`);
        }

        // Track telemetry
        await telemetry.track('package_tested', {
          package: packageName,
          mode: 'hosted',
          models: models.length,
          passed: status.results?.tests_passed || 0,
          failed: status.results?.tests_failed || 0,
          score: status.results?.overall_score || 0,
        });

        // Exit with error if tests failed
        if (status.results && status.results.tests_failed > 0) {
          process.exit(1);
        }

        return;
      }

      if (status.status === 'failed') {
        console.error(`\n\n❌ Test failed: ${status.error}`);
        process.exit(1);
      }

      // Show progress
      if (status.status !== lastStatus) {
        if (status.status === 'running') {
          console.log('🏃 Running tests');
        }
        lastStatus = status.status;
      } else {
        process.stdout.write('.');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    console.error('\n\n❌ Timeout waiting for test results');
    process.exit(1);
  } catch (error: any) {
    if (error.message.includes('Hosted testing not available')) {
      console.error(`\n❌ ${error.message}`);
      console.log('\nHosted testing requires prpm+ subscription.');
      console.log('Upgrade at: https://prpm.dev/pricing');
      console.log('\nOr use --local to test with your own infrastructure:');
      console.log('  prpm test ${packageName} --local\n');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Run local test (requires own infrastructure)
 */
async function runLocalTest(
  client: any,
  packageName: string,
  options: TestCommandOptions
) {
  // Fetch package details
  const pkg = await fetchPackage(client, packageName);
  if (!pkg) {
    console.error(`❌ Package not found: ${packageName}`);
    process.exit(1);
  }

  console.log(`📦 ${pkg.name} v${pkg.latest_version}`);
  console.log(`   ${pkg.description || 'No description'}\n`);

  // Fetch test cases
  const testCases = await fetchTestCases(client, pkg.id);
  if (!testCases || testCases.length === 0) {
    console.error(`❌ No test cases found for ${packageName}`);
    console.log(`   Test cases can be added at https://prpm.dev/packages/${pkg.id}/test-cases`);
    process.exit(1);
  }

  console.log(`📋 Found ${testCases.length} test case(s)\n`);

  // Parse models
  const models = options.models?.split(',').map((m) => m.trim()) || ['claude-sonnet-4'];

  // Parse plugins (if provided)
  const plugins = options.plugins?.split(',').map((p) => p.trim()) || [];

  // Determine framework
  const framework = determineFramework(options.framework, pkg, plugins);
  console.log(`🔧 Using framework: ${framework}`);
  console.log(`🤖 Testing with models: ${models.join(', ')}`);
  if (plugins.length > 0) {
    console.log(`🔌 Using plugins: ${plugins.join(', ')}`);
  }
  console.log();

  // Fetch package content (prompt)
  const packageContent = await fetchPackageContent(client, pkg.id, pkg.latest_version);
  const prompt = extractPromptText(packageContent);

  if (!prompt || prompt.length < 50) {
    console.error(`❌ Package content is too short or invalid`);
    process.exit(1);
  }

  // Run tests
  let results: TestResult[];
  if (framework === 'claude-agent') {
    results = await runClaudeAgentTests(testCases, prompt, plugins, options);
  } else {
    results = await runLiteLLMTests(testCases, prompt, models, options);
  }

  // Display results
  displayResults(results, options.verbose);

  // Get summary
  const summary = LiteLLMExecutor.getSummary(results);
  displaySummary(summary, models);

  // Upload results if requested
  if (options.upload) {
    await uploadResults(
      client,
      pkg,
      framework,
      models,
      plugins,
      results,
      summary,
      options.verify || false
    );
  }

  // Track telemetry
  await telemetry.track('package_tested', {
    package: packageName,
    mode: 'local',
    framework,
    models: models.length,
    testCases: testCases.length,
    passed: summary.testsPassed,
    failed: summary.testsFailed,
    score: summary.overallScore,
    uploaded: options.upload,
  });

  // Exit with error code if tests failed
  if (summary.testsFailed > 0) {
    process.exit(1);
  }
}

/**
 * Display hosted test results
 */
function displayHostedResults(results: any) {
  if (!results) return;

  console.log('📈 Summary:\n');
  console.log(`   Total Tests: ${results.total_tests}`);
  console.log(`   Passed: ${results.tests_passed} ✅`);
  console.log(`   Failed: ${results.tests_failed} ❌`);
  console.log(`   Overall Score: ${(results.overall_score * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${(results.total_duration_ms / 1000).toFixed(2)}s`);
  console.log(`   Total Tokens: ${results.total_tokens.toLocaleString()}`);
  console.log(`   Total Cost: $${results.total_cost_usd.toFixed(4)}`);
}

/**
 * Fetch package from registry
 */
async function fetchPackage(client: any, packageName: string): Promise<Package | null> {
  try {
    const pkg = await client.getPackageByName(packageName);
    return pkg;
  } catch (error: any) {
    return null;
  }
}

/**
 * Fetch test cases for package
 */
async function fetchTestCases(client: any, packageId: string): Promise<PackageTestCase[]> {
  try {
    const response = await client.getTestCases(packageId);
    return response.test_cases || [];
  } catch (error: any) {
    console.error(`Failed to fetch test cases: ${error.message}`);
    return [];
  }
}

/**
 * Fetch package content
 */
async function fetchPackageContent(client: any, packageId: string, version: string): Promise<any> {
  try {
    const content = await client.getPackageContent(packageId, version);
    return content;
  } catch (error: any) {
    console.error(`Failed to fetch package content: ${error.message}`);
    return null;
  }
}

/**
 * Extract prompt text from package content
 */
function extractPromptText(content: any): string {
  if (!content) return '';

  // Handle canonical format
  if (content.sections && Array.isArray(content.sections)) {
    let text = '';
    for (const section of content.sections) {
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

  // Handle string content
  if (typeof content === 'string') {
    return content;
  }

  // Try to stringify
  return JSON.stringify(content, null, 2);
}

/**
 * Determine which framework to use
 */
function determineFramework(
  requested: string | undefined,
  pkg: Package,
  plugins: string[]
): 'litellm' | 'claude-agent' {
  if (requested === 'claude-agent') return 'claude-agent';
  if (requested === 'litellm') return 'litellm';

  // Auto-detect: Use Claude Agent if plugins specified or if it's a Claude package
  if (plugins.length > 0) return 'claude-agent';
  if (pkg.format === 'claude') return 'claude-agent';

  // Default to LiteLLM for universal testing
  return 'litellm';
}

/**
 * Run tests with LiteLLM
 */
async function runLiteLLMTests(
  testCases: PackageTestCase[],
  prompt: string,
  models: string[],
  options: TestCommandOptions
): Promise<TestResult[]> {
  console.log('⚡ Running tests with LiteLLM...\n');

  const executor = new LiteLLMExecutor({
    proxyUrl: process.env.LITELLM_PROXY_URL,
    apiKey: process.env.LITELLM_API_KEY,
  });

  const results = await executor.executeTestSuite(testCases, prompt, models);
  return results;
}

/**
 * Run tests with Claude Agent SDK
 */
async function runClaudeAgentTests(
  testCases: PackageTestCase[],
  prompt: string,
  plugins: string[],
  options: TestCommandOptions
): Promise<TestResult[]> {
  console.log('🤖 Running tests with Claude Agent SDK...\n');

  const tester = new ClaudeAgentTester({
    apiKey: process.env.ANTHROPIC_API_KEY,
    plugins,
  });

  const results = await tester.executeTestSuite(testCases, prompt, plugins);
  return results;
}

/**
 * Display test results
 */
function displayResults(results: TestResult[], verbose: boolean) {
  console.log('📊 Test Results:\n');

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const score = result.score !== undefined ? ` (${(result.score * 100).toFixed(0)}%)` : '';

    console.log(`${icon} Test ${index + 1}: ${result.testCase.title}${score}`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Duration: ${result.durationMs}ms`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (verbose) {
      console.log(`   Input: ${result.testCase.input.substring(0, 100)}...`);
      if (result.response) {
        console.log(`   Response: ${result.response.substring(0, 200)}...`);
      }
      if (result.assertionDetails && result.assertionDetails.length > 0) {
        console.log(`   Assertions:`);
        result.assertionDetails.forEach((assertion) => {
          const assertIcon = assertion.passed ? '  ✓' : '  ✗';
          console.log(`   ${assertIcon} ${assertion.message}`);
        });
      }
    }

    console.log();
  });
}

/**
 * Display summary statistics
 */
function displaySummary(summary: any, models: string[]) {
  console.log('📈 Summary:\n');
  console.log(`   Total Tests: ${summary.totalTests}`);
  console.log(`   Passed: ${summary.testsPassed} ✅`);
  console.log(`   Failed: ${summary.testsFailed} ❌`);
  console.log(`   Overall Score: ${(summary.overallScore * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`   Total Tokens: ${summary.totalTokens.toLocaleString()}`);
  console.log(`   Total Cost: $${summary.totalCost.toFixed(4)}`);
  console.log();

  if (models.length > 1) {
    console.log('📊 Model Breakdown:\n');
    Object.entries(summary.modelBreakdown).forEach(([model, stats]: [string, any]) => {
      console.log(`   ${model}:`);
      console.log(`     Passed: ${stats.passed}/${stats.passed + stats.failed}`);
      console.log(`     Score: ${(stats.score * 100).toFixed(1)}%`);
    });
    console.log();
  }
}

/**
 * Upload test results to registry
 */
async function uploadResults(
  client: any,
  pkg: Package,
  framework: string,
  models: string[],
  plugins: string[],
  results: TestResult[],
  summary: any,
  verify: boolean
) {
  console.log('📤 Uploading test results to registry...\n');

  try {
    // Prepare test details
    const testDetails = results.map((r) => ({
      test_case_title: r.testCase.title,
      test_case_description: r.testCase.description,
      test_input: r.testCase.input,
      model: r.model,
      passed: r.passed,
      score: r.score,
      response: r.response,
      error_message: r.error,
      assertions_total: r.assertionsTotal,
      assertions_passed: r.assertionsPassed,
      assertion_details: r.assertionDetails,
      duration_ms: r.durationMs,
      tokens_used: r.tokensUsed,
      cost_usd: r.costUsd,
    }));

    // Upload to registry
    const response = await client.uploadTestResults({
      package_id: pkg.id,
      package_version: pkg.latest_version,
      test_framework: framework,
      models_tested: models,
      plugins_used: plugins.length > 0 ? plugins : undefined,
      test_environment: 'local',
      total_tests: summary.totalTests,
      tests_passed: summary.testsPassed,
      tests_failed: summary.testsFailed,
      overall_score: summary.overallScore,
      total_duration_ms: summary.totalDuration,
      total_tokens_used: summary.totalTokens,
      total_cost_usd: summary.totalCost,
      test_details: testDetails,
      verify,
    });

    if (response.is_verified) {
      console.log('✅ Test results uploaded and verified!');
    } else {
      console.log('✅ Test results uploaded!');
    }

    console.log(`   View at: https://prpm.dev/packages/${pkg.id}/tests\n`);

  } catch (error: any) {
    console.error(`❌ Failed to upload results: ${error.message}`);
  }
}
