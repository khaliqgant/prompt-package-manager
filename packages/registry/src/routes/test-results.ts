/**
 * Test Results API Routes
 *
 * Endpoints for uploading and retrieving package test results
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import type {
  PackageTestResult,
  PackageTestDetail,
  PackageTestSummary,
  TestFramework,
} from '@pr-pm/types';

// Request schemas
const UploadTestResultSchema = z.object({
  package_id: z.string().uuid(),
  package_version: z.string(),
  test_framework: z.enum(['litellm', 'claude-agent', 'promptfoo']),
  models_tested: z.array(z.string()).min(1),
  plugins_used: z.array(z.string()).optional(),
  test_environment: z.enum(['local', 'ci', 'production']).optional(),
  total_tests: z.number().int().positive(),
  tests_passed: z.number().int().nonnegative(),
  tests_failed: z.number().int().nonnegative(),
  tests_skipped: z.number().int().nonnegative().optional(),
  overall_score: z.number().min(0).max(1),
  total_duration_ms: z.number().int().optional(),
  average_latency_ms: z.number().int().optional(),
  total_tokens_used: z.number().int().optional(),
  total_cost_usd: z.number().optional(),
  detailed_results: z.any().optional(),
  test_details: z.array(z.object({
    test_case_title: z.string(),
    test_case_description: z.string().optional(),
    test_input: z.string(),
    model: z.string(),
    passed: z.boolean(),
    score: z.number().min(0).max(1).optional(),
    response: z.string().optional(),
    error_message: z.string().optional(),
    assertions_total: z.number().int().optional(),
    assertions_passed: z.number().int().optional(),
    assertion_details: z.any().optional(),
    duration_ms: z.number().int().optional(),
    tokens_used: z.number().int().optional(),
    cost_usd: z.number().optional(),
    tools_used: z.array(z.string()).optional(),
  })).optional(),
  verify: z.boolean().optional(),
});

export async function testResultRoutes(server: FastifyInstance) {
  /**
   * Upload test results
   */
  server.post('/test-results', {
    onRequest: [requireAuth],
    schema: {
      tags: ['test-results'],
      description: 'Upload package test results from CLI',
      body: {
        type: 'object',
        required: ['package_id', 'package_version', 'test_framework', 'models_tested', 'total_tests', 'tests_passed', 'tests_failed', 'overall_score'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.user_id;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const data = UploadTestResultSchema.parse(request.body);

      server.log.info({
        action: 'upload_test_result',
        package_id: data.package_id,
        user_id: userId,
        framework: data.test_framework,
        score: data.overall_score,
      }, '📊 Uploading test results');

      // Check if user can verify tests (package owner or admin)
      const canVerify = data.verify && await userCanVerifyTests(server, userId, data.package_id);

      // Insert test result
      const testResult = await query<{ id: string }>(
        server,
        `INSERT INTO package_test_results (
          package_id, package_version, test_framework, tested_by_user_id,
          models_tested, plugins_used, test_environment,
          total_tests, tests_passed, tests_failed, tests_skipped,
          overall_score, total_duration_ms, average_latency_ms,
          total_tokens_used, total_cost_usd, detailed_results,
          is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id`,
        [
          data.package_id,
          data.package_version,
          data.test_framework,
          userId,
          data.models_tested,
          data.plugins_used || [],
          data.test_environment || 'local',
          data.total_tests,
          data.tests_passed,
          data.tests_failed,
          data.tests_skipped || 0,
          data.overall_score,
          data.total_duration_ms,
          data.average_latency_ms,
          data.total_tokens_used,
          data.total_cost_usd,
          data.detailed_results ? JSON.stringify(data.detailed_results) : null,
          canVerify,
        ]
      );

      const testResultId = testResult.rows[0].id;

      // Insert test details if provided
      if (data.test_details && data.test_details.length > 0) {
        for (const detail of data.test_details) {
          await query(
            server,
            `INSERT INTO package_test_details (
              test_result_id, test_case_title, test_case_description, test_input,
              model, passed, score, response, error_message,
              assertions_total, assertions_passed, assertion_details,
              duration_ms, tokens_used, cost_usd, tools_used
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              testResultId,
              detail.test_case_title,
              detail.test_case_description,
              detail.test_input,
              detail.model,
              detail.passed,
              detail.score,
              detail.response,
              detail.error_message,
              detail.assertions_total,
              detail.assertions_passed,
              detail.assertion_details ? JSON.stringify(detail.assertion_details) : null,
              detail.duration_ms,
              detail.tokens_used,
              detail.cost_usd,
              detail.tools_used || [],
            ]
          );
        }
      }

      server.log.info({
        test_result_id: testResultId,
        is_verified: canVerify,
      }, '✓ Test results uploaded');

      return reply.code(201).send({
        id: testResultId,
        is_verified: canVerify,
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to upload test results');
      return reply.code(400).send({
        error: 'upload_failed',
        message: error.message,
      });
    }
  });

  /**
   * Get test results for a package
   */
  server.get('/packages/:packageId/test-results', {
    onRequest: [optionalAuth],
    schema: {
      tags: ['test-results'],
      description: 'Get test results for a package',
      params: {
        type: 'object',
        properties: {
          packageId: { type: 'string', format: 'uuid' },
        },
        required: ['packageId'],
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
          framework: { type: 'string', enum: ['litellm', 'claude-agent', 'promptfoo'] },
          verified_only: { type: 'boolean', default: false },
        },
      },
    },
  }, async (
    request: FastifyRequest<{
      Params: { packageId: string };
      Querystring: { limit?: number; framework?: TestFramework; verified_only?: boolean };
    }>,
    reply: FastifyReply
  ) => {
    const { packageId } = request.params;
    const { limit = 10, framework, verified_only = false } = request.query;

    try {
      const conditions = ['package_id = $1'];
      const params: any[] = [packageId];
      let paramIndex = 2;

      if (framework) {
        conditions.push(`test_framework = $${paramIndex++}`);
        params.push(framework);
      }

      if (verified_only) {
        conditions.push(`is_verified = true`);
      }

      const result = await query<PackageTestResult>(
        server,
        `SELECT * FROM package_test_results
         WHERE ${conditions.join(' AND ')}
         ORDER BY tested_at DESC
         LIMIT ${limit}`,
        params
      );

      return reply.code(200).send({
        test_results: result.rows,
        total: result.rows.length,
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to get test results');
      return reply.code(500).send({
        error: 'fetch_failed',
        message: error.message,
      });
    }
  });

  /**
   * Get test summary for a package
   */
  server.get('/packages/:packageId/test-summary', {
    schema: {
      tags: ['test-results'],
      description: 'Get aggregated test summary for a package',
    },
  }, async (
    request: FastifyRequest<{ Params: { packageId: string } }>,
    reply: FastifyReply
  ) => {
    const { packageId } = request.params;

    try {
      const summary = await query<PackageTestSummary>(
        server,
        `SELECT * FROM package_test_summary WHERE package_id = $1`,
        [packageId]
      );

      if (summary.rows.length === 0) {
        return reply.code(200).send({
          badge_level: 'none',
          total_test_runs: 0,
        });
      }

      // Get badge level
      const badgeResult = await query<{ badge_level: string }>(
        server,
        `SELECT get_test_badge_level($1) as badge_level`,
        [packageId]
      );

      return reply.code(200).send({
        ...summary.rows[0],
        badge_level: badgeResult.rows[0].badge_level,
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to get test summary');
      return reply.code(500).send({
        error: 'fetch_failed',
        message: error.message,
      });
    }
  });

  /**
   * Get detailed results for a specific test run
   */
  server.get('/test-results/:testResultId/details', {
    schema: {
      tags: ['test-results'],
      description: 'Get detailed test case results for a test run',
    },
  }, async (
    request: FastifyRequest<{ Params: { testResultId: string } }>,
    reply: FastifyReply
  ) => {
    const { testResultId } = request.params;

    try {
      const details = await query<PackageTestDetail>(
        server,
        `SELECT * FROM package_test_details
         WHERE test_result_id = $1
         ORDER BY created_at`,
        [testResultId]
      );

      return reply.code(200).send({
        test_details: details.rows,
        total: details.rows.length,
      });

    } catch (error: any) {
      server.log.error({ error }, 'Failed to get test details');
      return reply.code(500).send({
        error: 'fetch_failed',
        message: error.message,
      });
    }
  });
}

/**
 * Check if user can verify test results (package owner or admin)
 */
async function userCanVerifyTests(
  server: FastifyInstance,
  userId: string,
  packageId: string
): Promise<boolean> {
  const result = await query<{ can_verify: boolean }>(
    server,
    `SELECT
      (p.author_id = $1 OR
       EXISTS (
         SELECT 1 FROM users WHERE id = $1 AND is_admin = true
       ) OR
       EXISTS (
         SELECT 1 FROM organization_members om
         WHERE om.user_id = $1
           AND om.org_id = p.org_id
           AND om.role IN ('owner', 'admin')
       )) as can_verify
     FROM packages p
     WHERE p.id = $2`,
    [userId, packageId]
  );

  return result.rows[0]?.can_verify || false;
}
