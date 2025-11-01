-- Migration 028: Add Missing Playground Usage Analytics Fields
-- Description: Adds analytics and feedback columns that were missing from playground_usage table
-- Author: System
-- Date: 2025-11-01

-- Add missing analytics fields (all use IF NOT EXISTS for safety)
ALTER TABLE playground_usage
  ADD COLUMN IF NOT EXISTS package_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS input_length INTEGER,
  ADD COLUMN IF NOT EXISTS output_length INTEGER,
  ADD COLUMN IF NOT EXISTS comparison_mode BOOLEAN DEFAULT FALSE;

-- Add missing quality/feedback fields
ALTER TABLE playground_usage
  ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  ADD COLUMN IF NOT EXISTS was_helpful BOOLEAN,
  ADD COLUMN IF NOT EXISTS user_feedback TEXT;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_playground_usage_model ON playground_usage(model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playground_usage_package_model ON playground_usage(package_id, model) WHERE package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playground_usage_package_version ON playground_usage(package_id, package_version) WHERE package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playground_usage_success ON playground_usage(error_occurred, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playground_usage_rating ON playground_usage(user_rating) WHERE user_rating IS NOT NULL;

-- Add column comments
COMMENT ON COLUMN playground_usage.package_version IS 'Version of the package used in this playground run';
COMMENT ON COLUMN playground_usage.input_length IS 'Length of user input in characters';
COMMENT ON COLUMN playground_usage.output_length IS 'Length of AI model output in characters';
COMMENT ON COLUMN playground_usage.comparison_mode IS 'Whether this run was part of a model comparison';
COMMENT ON COLUMN playground_usage.user_rating IS 'User rating 1-5 stars for the result quality';
COMMENT ON COLUMN playground_usage.was_helpful IS 'Quick thumbs up/down feedback';
COMMENT ON COLUMN playground_usage.user_feedback IS 'Optional text feedback from user';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 028 completed successfully!';
  RAISE NOTICE 'Added missing analytics and feedback fields to playground_usage table';
END $$;
