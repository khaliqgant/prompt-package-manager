-- Migration: Add generated test cases for playground
-- Date: 2025-11-01
-- Description: Stores AI-generated test cases for packages and collections

-- Generated test cases table
CREATE TABLE IF NOT EXISTS generated_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What this test is for (package or collection)
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('package', 'collection')),
  entity_id UUID NOT NULL,

  -- Test case details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  input TEXT NOT NULL,
  difficulty VARCHAR(20) CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  test_type VARCHAR(50) CHECK (test_type IN ('concept', 'practical', 'edge_case', 'comparison', 'quality')),

  -- Evaluation criteria (what a good response should include)
  expected_criteria TEXT[], -- Array of strings
  tags TEXT[],

  -- AI generation metadata
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 0.00 to 1.00
  generated_at TIMESTAMP DEFAULT NOW(),
  version_generated_from VARCHAR(50), -- Package/collection version this was generated from

  -- Lifecycle
  is_active BOOLEAN DEFAULT true, -- Can be deactivated if outdated

  -- Usage analytics
  usage_count INT DEFAULT 0, -- How many times users tried this test
  helpful_votes INT DEFAULT 0, -- How many users marked as helpful
  unhelpful_votes INT DEFAULT 0, -- How many users marked as not helpful
  success_rate DECIMAL(3,2), -- Calculated: helpful_votes / (helpful_votes + unhelpful_votes)

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_test_cases_entity ON generated_test_cases(entity_type, entity_id);
CREATE INDEX idx_test_cases_active ON generated_test_cases(is_active);
CREATE INDEX idx_test_cases_difficulty ON generated_test_cases(difficulty);
CREATE INDEX idx_test_cases_success_rate ON generated_test_cases(success_rate DESC NULLS LAST);
CREATE INDEX idx_test_cases_usage ON generated_test_cases(usage_count DESC);

-- Foreign key constraints (with cascade delete)
-- Note: We don't use direct FK to packages/collections because entity_id is polymorphic
-- These will be validated in application code

-- Test case feedback tracking (who voted what)
CREATE TABLE IF NOT EXISTS test_case_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES generated_test_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Feedback
  was_helpful BOOLEAN NOT NULL,
  feedback_comment TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- One feedback per user per test case
  UNIQUE(test_case_id, user_id)
);

CREATE INDEX idx_test_feedback_test_case ON test_case_feedback(test_case_id);
CREATE INDEX idx_test_feedback_user ON test_case_feedback(user_id);

-- Function to update success_rate when feedback is added
CREATE OR REPLACE FUNCTION update_test_case_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE generated_test_cases
  SET
    helpful_votes = (
      SELECT COUNT(*) FROM test_case_feedback
      WHERE test_case_id = NEW.test_case_id AND was_helpful = true
    ),
    unhelpful_votes = (
      SELECT COUNT(*) FROM test_case_feedback
      WHERE test_case_id = NEW.test_case_id AND was_helpful = false
    ),
    success_rate = (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN NULL
          ELSE ROUND(
            COUNT(*) FILTER (WHERE was_helpful = true)::DECIMAL /
            COUNT(*)::DECIMAL,
            2
          )
        END
      FROM test_case_feedback
      WHERE test_case_id = NEW.test_case_id
    ),
    updated_at = NOW()
  WHERE id = NEW.test_case_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update success_rate
CREATE TRIGGER trigger_update_test_case_success_rate
AFTER INSERT OR UPDATE OR DELETE ON test_case_feedback
FOR EACH ROW
EXECUTE FUNCTION update_test_case_success_rate();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_test_case_usage(test_case_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE generated_test_cases
  SET
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = test_case_uuid;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE generated_test_cases IS 'AI-generated test cases for playground testing of packages and collections';
COMMENT ON COLUMN generated_test_cases.entity_type IS 'Type of entity: package or collection';
COMMENT ON COLUMN generated_test_cases.entity_id IS 'UUID of the package or collection';
COMMENT ON COLUMN generated_test_cases.confidence_score IS 'AI confidence in test quality (0-1)';
COMMENT ON COLUMN generated_test_cases.expected_criteria IS 'What a good response should include';
COMMENT ON COLUMN generated_test_cases.success_rate IS 'Percentage of users who found this test helpful (0-1)';
COMMENT ON TABLE test_case_feedback IS 'User feedback on test case helpfulness';
