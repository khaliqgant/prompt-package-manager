-- AI embeddings and enriched content for semantic search
CREATE TABLE IF NOT EXISTS package_embeddings (
  package_id UUID PRIMARY KEY REFERENCES packages(id) ON DELETE CASCADE,

  -- AI-generated enriched content
  ai_use_case_description TEXT,
  ai_problem_statement TEXT,
  ai_similar_to TEXT[] DEFAULT '{}',
  ai_best_for TEXT,

  -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
  embedding vector(1536),

  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Track what content was used to generate embedding
  embedding_source_hash VARCHAR(64) -- SHA256 of source content
);

-- Vector similarity index using IVFFlat algorithm
-- Lists parameter: sqrt(row_count) is a good starting point
-- For 4500 packages: sqrt(4500) ≈ 67, round to 100 for growth
CREATE INDEX idx_package_embeddings_vector
  ON package_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for looking up by package
CREATE INDEX idx_package_embeddings_package ON package_embeddings(package_id);

-- Index for finding stale embeddings
CREATE INDEX idx_package_embeddings_updated ON package_embeddings(updated_at);

-- Trigger to update updated_at
CREATE TRIGGER update_package_embeddings_updated_at
  BEFORE UPDATE ON package_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View to get packages with their AI-enriched content
CREATE OR REPLACE VIEW packages_with_ai_content AS
SELECT
  p.*,
  pe.ai_use_case_description,
  pe.ai_problem_statement,
  pe.ai_similar_to,
  pe.ai_best_for,
  pe.generated_at as ai_generated_at,
  pe.updated_at as ai_updated_at
FROM packages p
LEFT JOIN package_embeddings pe ON p.id = pe.package_id;

-- Function to check if package embeddings need regeneration
CREATE OR REPLACE FUNCTION needs_embedding_regeneration(p_package_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_needs_regen BOOLEAN;
BEGIN
  SELECT
    CASE
      -- No embedding exists
      WHEN pe.package_id IS NULL THEN TRUE
      -- Package updated after embedding
      WHEN p.updated_at > pe.updated_at THEN TRUE
      -- Embedding is older than 90 days
      WHEN pe.updated_at < NOW() - INTERVAL '90 days' THEN TRUE
      ELSE FALSE
    END INTO v_needs_regen
  FROM packages p
  LEFT JOIN package_embeddings pe ON p.id = pe.package_id
  WHERE p.id = p_package_id;

  RETURN COALESCE(v_needs_regen, TRUE);
END;
$$ LANGUAGE plpgsql;
