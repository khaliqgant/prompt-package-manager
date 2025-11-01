/**
 * Testing types for package validation and quality assurance
 */

export type TestFramework = 'litellm' | 'claude-agent' | 'promptfoo';
export type TestEnvironment = 'local' | 'ci' | 'production';
export type TestBadgeLevel = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';

/**
 * Test result summary
 */
export interface PackageTestResult {
  id: string;
  package_id: string;
  package_version: string;

  // Test metadata
  test_framework: TestFramework;
  tested_by_user_id?: string;
  tested_at: string;

  // Test configuration
  models_tested: string[];
  plugins_used?: string[];
  test_environment?: TestEnvironment;

  // Results summary
  total_tests: number;
  tests_passed: number;
  tests_failed: number;
  tests_skipped?: number;
  overall_score: number; // 0.0 to 1.0

  // Performance metrics
  total_duration_ms?: number;
  average_latency_ms?: number;
  total_tokens_used?: number;
  total_cost_usd?: number;

  // Detailed results
  detailed_results?: any;

  // Verification
  is_verified: boolean;
  verification_notes?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Individual test case result
 */
export interface PackageTestDetail {
  id: string;
  test_result_id: string;

  // Test case info
  test_case_title: string;
  test_case_description?: string;
  test_input: string;

  // Model-specific results
  model: string;

  // Result
  passed: boolean;
  score?: number; // 0.0 to 1.0
  response?: string;
  error_message?: string;

  // Assertions
  assertions_total?: number;
  assertions_passed?: number;
  assertion_details?: AssertionResult[];

  // Performance
  duration_ms?: number;
  tokens_used?: number;
  cost_usd?: number;

  // Tools used (for Claude agents)
  tools_used?: string[];

  created_at: string;
}

/**
 * Assertion result
 */
export interface AssertionResult {
  type: string; // 'llm-rubric', 'contains', 'not-contains', 'is-json', etc.
  description: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  score?: number;
  explanation?: string;
}

/**
 * Package test summary (aggregated view)
 */
export interface PackageTestSummary {
  package_id: string;
  package_name: string;
  total_test_runs: number;
  last_tested_at?: string;
  average_score: number;
  total_tests_run: number;
  total_tests_passed: number;
  models_tested: string[];
  verified_test_runs: number;
  badge_level: TestBadgeLevel;
}

/**
 * Test configuration for CLI
 */
export interface TestConfig {
  package_name: string;
  models?: string[];
  plugins?: string[];
  tools?: string;
  local?: boolean;
  upload?: boolean; // Upload results to registry
  verify?: boolean; // Mark as verified (requires auth)
}

/**
 * Test execution result (for CLI display)
 */
export interface TestExecutionResult {
  package_name: string;
  package_version: string;
  test_framework: TestFramework;
  models_tested: string[];

  // Summary
  total_tests: number;
  tests_passed: number;
  tests_failed: number;
  overall_score: number;

  // Performance
  total_duration_ms: number;
  total_cost_usd: number;

  // Details
  test_details: PackageTestDetail[];

  // Upload info
  uploaded: boolean;
  upload_id?: string;
}
