-- Migration: Add hosted testing infrastructure for prpm+ users
-- Description: Test job queue, usage tracking, and limits for hosted testing service

-- Test job queue
CREATE TABLE test_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  package_version VARCHAR(50) NOT NULL,

  -- Test configuration
  models_requested TEXT[] NOT NULL,
  plugins_requested TEXT[],
  framework VARCHAR(50) NOT NULL CHECK (framework IN ('litellm', 'claude-agent')),

  -- Job status
  status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INT DEFAULT 0,

  -- Results
  test_result_id UUID REFERENCES package_test_results(id) ON DELETE SET NULL,
  error_message TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Usage tracking
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,

  -- Upload options
  upload_results BOOLEAN DEFAULT FALSE,
  verify_results BOOLEAN DEFAULT FALSE
);

-- Indexes for efficient querying
CREATE INDEX idx_test_jobs_status ON test_jobs(status, created_at) WHERE status IN ('queued', 'running');
CREATE INDEX idx_test_jobs_user ON test_jobs(user_id, created_at DESC);
CREATE INDEX idx_test_jobs_package ON test_jobs(package_id, created_at DESC);

-- Usage tracking for prpm+ limits
CREATE TABLE user_test_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month

  -- Counters
  test_runs_count INT DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,

  -- Timestamp
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, month)
);

CREATE INDEX idx_user_test_usage_user_month ON user_test_usage(user_id, month);

-- Function to get tier limits
CREATE FUNCTION get_tier_test_limit(tier VARCHAR)
RETURNS INT AS $$
BEGIN
  RETURN CASE tier
    WHEN 'plus' THEN 100
    WHEN 'pro' THEN 500
    WHEN 'enterprise' THEN 999999
    ELSE 0 -- Free tier cannot use hosted
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if user can run test
CREATE FUNCTION can_run_hosted_test(user_uuid UUID)
RETURNS TABLE(
  can_run BOOLEAN,
  tier VARCHAR,
  tests_used INT,
  tests_limit INT,
  tests_remaining INT,
  reason TEXT
) AS $$
DECLARE
  user_tier VARCHAR(50);
  org_tier VARCHAR(50);
  effective_tier VARCHAR(50);
  current_month_usage INT;
  tier_limit INT;
BEGIN
  -- Get user's personal tier
  SELECT subscription_tier INTO user_tier
  FROM users WHERE id = user_uuid;

  -- Get user's org tier (if any)
  SELECT o.subscription_tier INTO org_tier
  FROM organization_members om
  JOIN organizations o ON om.org_id = o.id
  WHERE om.user_id = user_uuid
    AND om.role IN ('owner', 'admin', 'member')
  ORDER BY
    CASE o.subscription_tier
      WHEN 'enterprise' THEN 4
      WHEN 'pro' THEN 3
      WHEN 'plus' THEN 2
      ELSE 1
    END DESC
  LIMIT 1;

  -- Use highest tier available (org or personal)
  effective_tier := COALESCE(
    CASE
      WHEN org_tier IS NOT NULL AND get_tier_test_limit(org_tier) > get_tier_test_limit(user_tier)
        THEN org_tier
      ELSE user_tier
    END,
    'free'
  );

  -- Get current month usage
  SELECT COALESCE(test_runs_count, 0) INTO current_month_usage
  FROM user_test_usage
  WHERE user_id = user_uuid
    AND month = DATE_TRUNC('month', NOW())::DATE;

  -- If no usage record, assume 0
  IF current_month_usage IS NULL THEN
    current_month_usage := 0;
  END IF;

  -- Get tier limit
  tier_limit := get_tier_test_limit(effective_tier);

  -- Return result
  RETURN QUERY SELECT
    (current_month_usage < tier_limit) AS can_run,
    effective_tier AS tier,
    current_month_usage AS tests_used,
    tier_limit AS tests_limit,
    GREATEST(tier_limit - current_month_usage, 0) AS tests_remaining,
    CASE
      WHEN tier_limit = 0 THEN 'Hosted testing requires prpm+ subscription. Upgrade at https://prpm.dev/pricing'
      WHEN current_month_usage >= tier_limit THEN 'Monthly test limit reached. Upgrade your plan or wait until next month.'
      ELSE NULL
    END AS reason;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to increment usage counter
CREATE FUNCTION increment_test_usage(
  user_uuid UUID,
  tokens BIGINT,
  cost DECIMAL(10,6)
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_test_usage (user_id, month, test_runs_count, tokens_used, cost_usd, updated_at)
  VALUES (
    user_uuid,
    DATE_TRUNC('month', NOW())::DATE,
    1,
    tokens,
    cost,
    NOW()
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    test_runs_count = user_test_usage.test_runs_count + 1,
    tokens_used = user_test_usage.tokens_used + EXCLUDED.tokens_used,
    cost_usd = user_test_usage.cost_usd + EXCLUDED.cost_usd,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get next queued job
CREATE FUNCTION get_next_test_job()
RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  -- Get highest priority queued job, oldest first
  SELECT id INTO job_id
  FROM test_jobs
  WHERE status = 'queued'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Mark as running
  IF job_id IS NOT NULL THEN
    UPDATE test_jobs
    SET status = 'running', started_at = NOW()
    WHERE id = job_id;
  END IF;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get queue position
CREATE FUNCTION get_queue_position(job_uuid UUID)
RETURNS INT AS $$
DECLARE
  job_created_at TIMESTAMPTZ;
  job_priority INT;
  position INT;
BEGIN
  -- Get job details
  SELECT created_at, priority INTO job_created_at, job_priority
  FROM test_jobs
  WHERE id = job_uuid AND status = 'queued';

  -- If not queued, return NULL
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Count jobs ahead in queue
  SELECT COUNT(*) INTO position
  FROM test_jobs
  WHERE status = 'queued'
    AND (
      priority > job_priority OR
      (priority = job_priority AND created_at < job_created_at)
    );

  RETURN position + 1; -- +1 because position is 1-indexed
END;
$$ LANGUAGE plpgsql STABLE;

-- View for test job summary
CREATE VIEW test_job_summary AS
SELECT
  tj.id,
  tj.user_id,
  u.username,
  tj.package_id,
  p.name AS package_name,
  tj.package_version,
  tj.models_requested,
  tj.plugins_requested,
  tj.framework,
  tj.status,
  tj.priority,
  tj.created_at,
  tj.started_at,
  tj.completed_at,
  tj.tokens_used,
  tj.cost_usd,
  tj.test_result_id,
  CASE
    WHEN tj.status = 'queued' THEN get_queue_position(tj.id)
    ELSE NULL
  END AS queue_position,
  CASE
    WHEN tj.status = 'running' THEN EXTRACT(EPOCH FROM (NOW() - tj.started_at))
    WHEN tj.status = 'completed' THEN EXTRACT(EPOCH FROM (tj.completed_at - tj.started_at))
    ELSE NULL
  END AS duration_seconds
FROM test_jobs tj
JOIN users u ON tj.user_id = u.id
JOIN packages p ON tj.package_id = p.id;

-- Comments
COMMENT ON TABLE test_jobs IS 'Queue for hosted test jobs (prpm+ feature)';
COMMENT ON TABLE user_test_usage IS 'Monthly usage tracking for hosted testing limits';
COMMENT ON FUNCTION can_run_hosted_test IS 'Check if user can run hosted test based on tier and usage';
COMMENT ON FUNCTION increment_test_usage IS 'Increment monthly test usage counter';
COMMENT ON FUNCTION get_next_test_job IS 'Get and lock next job from queue (worker function)';
COMMENT ON FUNCTION get_queue_position IS 'Get position of job in queue';
