/**
 * Test Jobs API Routes
 * Hosted testing service for prpm+ users
 */

import { FastifyPluginAsync } from 'fastify';

export const testJobRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /api/v1/test-jobs/run
   * Submit a hosted test job (prpm+ only)
   */
  server.post<{
    Body: {
      package_id: string;
      package_version?: string;
      models?: string[];
      plugins?: string[];
      framework?: 'litellm' | 'claude-agent' | 'auto';
      upload_results?: boolean;
      verify_results?: boolean;
    };
  }>(
    '/api/v1/test-jobs/run',
    {
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const {
        package_id,
        package_version,
        models = ['claude-sonnet-4'],
        plugins = [],
        framework = 'auto',
        upload_results = true,
        verify_results = false,
      } = request.body;

      // Check if user can run hosted tests
      const { rows: [limits] } = await server.pg.query(
        'SELECT * FROM can_run_hosted_test($1)',
        [userId]
      );

      if (!limits.can_run) {
        return reply.code(403).send({
          error: 'Hosted testing not available',
          reason: limits.reason,
          tier: limits.tier,
          usage: {
            tests_used: limits.tests_used,
            tests_limit: limits.tests_limit,
          },
        });
      }

      // Get package details
      const { rows: packages } = await server.pg.query(
        'SELECT id, name, latest_version, format FROM packages WHERE id = $1',
        [package_id]
      );

      if (packages.length === 0) {
        return reply.code(404).send({ error: 'Package not found' });
      }

      const pkg = packages[0];
      const version = package_version || pkg.latest_version;

      // Determine framework
      let testFramework = framework;
      if (framework === 'auto') {
        if (plugins.length > 0 || pkg.format === 'claude') {
          testFramework = 'claude-agent';
        } else {
          testFramework = 'litellm';
        }
      }

      // Create test job
      const { rows: [job] } = await server.pg.query(
        `INSERT INTO test_jobs (
          user_id,
          package_id,
          package_version,
          models_requested,
          plugins_requested,
          framework,
          upload_results,
          verify_results,
          priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, status, created_at`,
        [
          userId,
          package_id,
          version,
          models,
          plugins.length > 0 ? plugins : null,
          testFramework,
          upload_results,
          verify_results,
          limits.tier === 'pro' ? 1 : limits.tier === 'enterprise' ? 2 : 0,
        ]
      );

      // Get queue position
      const { rows: [queueInfo] } = await server.pg.query(
        'SELECT get_queue_position($1) as position',
        [job.id]
      );

      // Estimate wait time (rough: 10 seconds per job ahead)
      const estimatedWait = queueInfo.position > 1 ? (queueInfo.position - 1) * 10 : 0;

      reply.code(201).send({
        job_id: job.id,
        status: job.status,
        position_in_queue: queueInfo.position,
        estimated_wait_seconds: estimatedWait,
        usage: {
          tests_used_this_month: limits.tests_used,
          tests_remaining: limits.tests_remaining,
          tier: limits.tier,
        },
      });
    }
  );

  /**
   * GET /api/v1/test-jobs/:jobId
   * Get test job status and results
   */
  server.get<{
    Params: {
      jobId: string;
    };
  }>(
    '/api/v1/test-jobs/:jobId',
    {
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const userId = request.user.userId;

      // Get job details
      const { rows } = await server.pg.query(
        `SELECT
          tj.id,
          tj.user_id,
          tj.package_id,
          p.name AS package_name,
          tj.package_version,
          tj.models_requested,
          tj.plugins_requested,
          tj.framework,
          tj.status,
          tj.created_at,
          tj.started_at,
          tj.completed_at,
          tj.error_message,
          tj.tokens_used,
          tj.cost_usd,
          tj.test_result_id,
          ptr.total_tests,
          ptr.tests_passed,
          ptr.tests_failed,
          ptr.overall_score,
          ptr.total_duration_ms,
          get_queue_position(tj.id) AS queue_position
        FROM test_jobs tj
        JOIN packages p ON tj.package_id = p.id
        LEFT JOIN package_test_results ptr ON tj.test_result_id = ptr.id
        WHERE tj.id = $1`,
        [jobId]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Test job not found' });
      }

      const job = rows[0];

      // Check permission (only job owner or admin can view)
      const { rows: [userCheck] } = await server.pg.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (job.user_id !== userId && !userCheck?.is_admin) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Build response
      const response: any = {
        id: job.id,
        status: job.status,
        package: {
          id: job.package_id,
          name: job.package_name,
          version: job.package_version,
        },
        config: {
          models: job.models_requested,
          plugins: job.plugins_requested,
          framework: job.framework,
        },
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
      };

      if (job.status === 'queued') {
        response.queue_position = job.queue_position;
      }

      if (job.status === 'completed' && job.test_result_id) {
        response.results = {
          total_tests: job.total_tests,
          tests_passed: job.tests_passed,
          tests_failed: job.tests_failed,
          overall_score: parseFloat(job.overall_score),
          total_duration_ms: job.total_duration_ms,
          total_tokens: job.tokens_used,
          total_cost_usd: parseFloat(job.cost_usd),
          test_result_id: job.test_result_id,
        };
      }

      if (job.status === 'failed') {
        response.error = job.error_message;
      }

      reply.send(response);
    }
  );

  /**
   * GET /api/v1/test-jobs/:jobId/results
   * Get detailed test results for a completed job
   */
  server.get<{
    Params: {
      jobId: string;
    };
  }>(
    '/api/v1/test-jobs/:jobId/results',
    {
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const userId = request.user.userId;

      // Get job and verify ownership
      const { rows: jobs } = await server.pg.query(
        'SELECT user_id, test_result_id, status FROM test_jobs WHERE id = $1',
        [jobId]
      );

      if (jobs.length === 0) {
        return reply.code(404).send({ error: 'Test job not found' });
      }

      const job = jobs[0];

      // Check permission
      const { rows: [userCheck] } = await server.pg.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (job.user_id !== userId && !userCheck?.is_admin) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      if (job.status !== 'completed' || !job.test_result_id) {
        return reply.code(400).send({
          error: 'Test not completed',
          status: job.status,
        });
      }

      // Get detailed results (use existing test-results endpoint logic)
      const { rows: details } = await server.pg.query(
        `SELECT
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
        FROM package_test_details
        WHERE test_result_id = $1
        ORDER BY created_at`,
        [job.test_result_id]
      );

      // Get summary
      const { rows: [summary] } = await server.pg.query(
        `SELECT
          total_tests,
          tests_passed,
          tests_failed,
          overall_score,
          total_duration_ms,
          total_tokens_used,
          total_cost_usd
        FROM package_test_results
        WHERE id = $1`,
        [job.test_result_id]
      );

      reply.send({
        test_cases: details.map((d: any) => ({
          title: d.test_case_title,
          description: d.test_case_description,
          input: d.test_input,
          model: d.model,
          passed: d.passed,
          score: parseFloat(d.score),
          response: d.response,
          error: d.error_message,
          assertions_total: d.assertions_total,
          assertions_passed: d.assertions_passed,
          assertion_details: d.assertion_details,
          duration_ms: d.duration_ms,
          tokens_used: d.tokens_used,
          cost_usd: parseFloat(d.cost_usd),
        })),
        summary: {
          total_tests: summary.total_tests,
          tests_passed: summary.tests_passed,
          tests_failed: summary.tests_failed,
          overall_score: parseFloat(summary.overall_score),
          total_duration_ms: summary.total_duration_ms,
          total_tokens_used: summary.total_tokens_used,
          total_cost_usd: parseFloat(summary.total_cost_usd),
        },
      });
    }
  );

  /**
   * GET /api/v1/users/me/test-usage
   * Get current month's test usage
   */
  server.get(
    '/api/v1/users/me/test-usage',
    {
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const userId = request.user.userId;

      // Get current month usage
      const { rows: [usage] } = await server.pg.query(
        `SELECT
          test_runs_count,
          tokens_used,
          cost_usd
        FROM user_test_usage
        WHERE user_id = $1
          AND month = DATE_TRUNC('month', NOW())::DATE`,
        [userId]
      );

      // Get limits
      const { rows: [limits] } = await server.pg.query(
        'SELECT * FROM can_run_hosted_test($1)',
        [userId]
      );

      reply.send({
        current_month: {
          test_runs_count: usage?.test_runs_count || 0,
          tokens_used: usage?.tokens_used || 0,
          cost_usd: parseFloat(usage?.cost_usd || 0),
        },
        limits: {
          tier: limits.tier,
          test_runs_per_month: limits.tests_limit,
          concurrent_jobs: limits.tier === 'enterprise' ? 20 : limits.tier === 'pro' ? 5 : limits.tier === 'plus' ? 2 : 0,
        },
        remaining: {
          test_runs: limits.tests_remaining,
        },
      });
    }
  );

  /**
   * GET /api/v1/users/me/test-jobs
   * Get user's test job history
   */
  server.get<{
    Querystring: {
      limit?: number;
      offset?: number;
      status?: string;
    };
  }>(
    '/api/v1/users/me/test-jobs',
    {
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { limit = 20, offset = 0, status } = request.query;

      let query = `
        SELECT
          tj.id,
          tj.package_id,
          p.name AS package_name,
          tj.package_version,
          tj.models_requested,
          tj.status,
          tj.created_at,
          tj.completed_at,
          tj.test_result_id,
          ptr.overall_score,
          ptr.tests_passed,
          ptr.total_tests
        FROM test_jobs tj
        JOIN packages p ON tj.package_id = p.id
        LEFT JOIN package_test_results ptr ON tj.test_result_id = ptr.id
        WHERE tj.user_id = $1
      `;

      const params: any[] = [userId];

      if (status) {
        query += ' AND tj.status = $' + (params.length + 1);
        params.push(status);
      }

      query += ` ORDER BY tj.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const { rows } = await server.pg.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM test_jobs WHERE user_id = $1';
      const countParams: any[] = [userId];
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }

      const { rows: [{ total }] } = await server.pg.query(countQuery, countParams);

      reply.send({
        jobs: rows.map((job: any) => ({
          id: job.id,
          package: {
            id: job.package_id,
            name: job.package_name,
            version: job.package_version,
          },
          models: job.models_requested,
          status: job.status,
          created_at: job.created_at,
          completed_at: job.completed_at,
          results: job.test_result_id ? {
            overall_score: parseFloat(job.overall_score),
            tests_passed: job.tests_passed,
            total_tests: job.total_tests,
          } : null,
        })),
        total: parseInt(total),
        limit,
        offset,
      });
    }
  );
};
