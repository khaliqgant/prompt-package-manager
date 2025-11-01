-- Migration: Add test results tracking
-- Date: 2025-11-01
-- Description: Store package test results from CLI testing to show battle-tested packages

-- Test results table
CREATE TABLE IF NOT EXISTS package_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  package_version VARCHAR(50) NOT NULL,

  -- Test metadata
  test_framework VARCHAR(50) NOT NULL, -- 'litellm', 'claude-agent', 'promptfoo'
  tested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tested_at TIMESTAMP DEFAULT NOW(),

  -- Test configuration
  models_tested TEXT[] NOT NULL, -- ['claude-sonnet-4', 'gpt-4o']
  plugins_used TEXT[], -- ['filesystem', 'github'] for Claude agents
  test_environment VARCHAR(50), -- 'local', 'ci', 'production'

  -- Test results summary
  total_tests INT NOT NULL,
  tests_passed INT NOT NULL,
  tests_failed INT NOT NULL,
  tests_skipped INT DEFAULT 0,
  overall_score DECIMAL(3,2), -- 0.00 to 1.00

  -- Performance metrics
  total_duration_ms INT,
  average_latency_ms INT,
  total_tokens_used INT,
  total_cost_usd DECIMAL(10,6),

  -- Detailed results (JSON)
  detailed_results JSONB,

  -- Verification
  is_verified BOOLEAN DEFAULT false, -- Verified by package author or admin
  verification_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Test result details (individual test cases)
CREATE TABLE IF NOT EXISTS package_test_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES package_test_results(id) ON DELETE CASCADE,

  -- Test case info
  test_case_title VARCHAR(200) NOT NULL,
  test_case_description TEXT,
  test_input TEXT NOT NULL,

  -- Model-specific results
  model VARCHAR(100) NOT NULL,

  -- Result
  passed BOOLEAN NOT NULL,
  score DECIMAL(3,2), -- 0.00 to 1.00
  response TEXT,
  error_message TEXT,

  -- Assertions
  assertions_total INT,
  assertions_passed INT,
  assertion_details JSONB,

  -- Performance
  duration_ms INT,
  tokens_used INT,
  cost_usd DECIMAL(8,6),

  -- Tools used (for Claude agents)
  tools_used TEXT[],

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_test_results_package ON package_test_results(package_id);
CREATE INDEX idx_test_results_version ON package_test_results(package_version);
CREATE INDEX idx_test_results_framework ON package_test_results(test_framework);
CREATE INDEX idx_test_results_score ON package_test_results(overall_score DESC);
CREATE INDEX idx_test_results_tested_at ON package_test_results(tested_at DESC);
CREATE INDEX idx_test_details_result ON package_test_details(test_result_id);
CREATE INDEX idx_test_details_model ON package_test_details(model);
CREATE INDEX idx_test_details_passed ON package_test_details(passed);

-- View for package test summary
CREATE OR REPLACE VIEW package_test_summary AS
SELECT
  p.id as package_id,
  p.name as package_name,
  COUNT(DISTINCT ptr.id) as total_test_runs,
  MAX(ptr.tested_at) as last_tested_at,
  AVG(ptr.overall_score) as average_score,
  SUM(ptr.total_tests) as total_tests_run,
  SUM(ptr.tests_passed) as total_tests_passed,
  ARRAY_AGG(DISTINCT model) FILTER (WHERE model IS NOT NULL) as models_tested,
  COUNT(DISTINCT ptr.id) FILTER (WHERE ptr.is_verified = true) as verified_test_runs
FROM packages p
LEFT JOIN package_test_results ptr ON p.id = ptr.package_id
LEFT JOIN package_test_details ptd ON ptr.id = ptd.test_result_id
GROUP BY p.id, p.name;

-- Function to calculate test badge level
CREATE OR REPLACE FUNCTION get_test_badge_level(package_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
  test_count INT;
  avg_score DECIMAL;
  models_count INT;
BEGIN
  SELECT
    COUNT(DISTINCT id),
    AVG(overall_score),
    COUNT(DISTINCT UNNEST(models_tested))
  INTO test_count, avg_score, models_count
  FROM package_test_results
  WHERE package_id = package_uuid
    AND tested_at > NOW() - INTERVAL '30 days';

  -- Badge levels based on testing rigor
  IF test_count >= 10 AND avg_score >= 0.9 AND models_count >= 3 THEN
    RETURN 'platinum'; -- Heavily tested, high quality, multiple models
  ELSIF test_count >= 5 AND avg_score >= 0.8 AND models_count >= 2 THEN
    RETURN 'gold'; -- Well tested, good quality, 2+ models
  ELSIF test_count >= 3 AND avg_score >= 0.7 THEN
    RETURN 'silver'; -- Moderately tested, acceptable quality
  ELSIF test_count >= 1 THEN
    RETURN 'bronze'; -- Some testing
  ELSE
    RETURN 'none'; -- Not tested
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE package_test_results IS 'Test results from CLI testing showing package quality and reliability';
COMMENT ON COLUMN package_test_results.test_framework IS 'Testing framework used: litellm, claude-agent, or promptfoo';
COMMENT ON COLUMN package_test_results.is_verified IS 'Whether test results have been verified by package author or admin';
COMMENT ON VIEW package_test_summary IS 'Aggregated test metrics per package for display';
COMMENT ON FUNCTION get_test_badge_level IS 'Calculate test badge level (platinum/gold/silver/bronze/none) based on testing rigor';
