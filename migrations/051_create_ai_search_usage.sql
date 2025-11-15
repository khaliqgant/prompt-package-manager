-- AI Search usage tracking for analytics and PRPM+ validation
CREATE TABLE IF NOT EXISTS ai_search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL,
  has_prpm_plus BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_ai_search_usage_user ON ai_search_usage(user_id);
CREATE INDEX idx_ai_search_usage_created_at ON ai_search_usage(created_at);
CREATE INDEX idx_ai_search_usage_has_prpm_plus ON ai_search_usage(has_prpm_plus);

-- View for AI search analytics
CREATE OR REPLACE VIEW ai_search_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_searches,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN has_prpm_plus THEN 1 ELSE 0 END) as prpm_plus_searches,
  AVG(results_count) as avg_results_count,
  AVG(execution_time_ms) as avg_execution_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms) as median_execution_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_time_ms
FROM ai_search_usage
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Function to get popular search queries
CREATE OR REPLACE FUNCTION get_popular_ai_searches(
  p_limit INTEGER DEFAULT 20,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  unique_users BIGINT,
  avg_results INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    asu.query,
    COUNT(*) as search_count,
    COUNT(DISTINCT asu.user_id) as unique_users,
    AVG(asu.results_count)::INTEGER as avg_results
  FROM ai_search_usage asu
  WHERE asu.created_at > NOW() - INTERVAL '1 day' * p_days
  GROUP BY asu.query
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
