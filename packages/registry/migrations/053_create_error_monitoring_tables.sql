-- Migration: Create error monitoring tables
-- Enables tracking, analytics, and alerting for production errors

-- Error logs table - stores all errors for analytics
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(100) NOT NULL,
  error_name VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  user_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast querying by operation and time
CREATE INDEX IF NOT EXISTS error_logs_operation_time_idx
  ON error_logs(operation, created_at DESC);

-- Index for user-specific error lookup
CREATE INDEX IF NOT EXISTS error_logs_user_idx
  ON error_logs(user_id)
  WHERE user_id IS NOT NULL;

-- Index for time-based queries (error rate calculations)
CREATE INDEX IF NOT EXISTS error_logs_time_idx
  ON error_logs(created_at DESC);

-- Error alerts table - stores high error rate alerts
CREATE TABLE IF NOT EXISTS error_alerts (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(100) NOT NULL,
  error_name VARCHAR(255) NOT NULL,
  error_count INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  time_window_ms INTEGER NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for active alerts
CREATE INDEX IF NOT EXISTS error_alerts_active_idx
  ON error_alerts(resolved, created_at DESC)
  WHERE resolved = FALSE;

-- Index for operation-specific alerts
CREATE INDEX IF NOT EXISTS error_alerts_operation_idx
  ON error_alerts(operation, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE error_logs IS 'Stores all application errors for monitoring and analytics';
COMMENT ON TABLE error_alerts IS 'Stores high error rate alerts for on-call notifications';

COMMENT ON COLUMN error_logs.operation IS 'The operation that failed (e.g., openai_embedding, vector_search)';
COMMENT ON COLUMN error_logs.metadata IS 'Additional context about the error (query, filters, etc.)';
COMMENT ON COLUMN error_alerts.resolved IS 'Whether the alert has been acknowledged and resolved';

-- Analyze tables for query planner
ANALYZE error_logs;
ANALYZE error_alerts;
