-- Migration: Add full-text search index for hybrid AI search
-- This enables efficient keyword search alongside vector similarity search

-- Create an immutable function to generate tsvector for packages
-- This is required for the GIN index
CREATE OR REPLACE FUNCTION packages_search_vector(p_name text, p_description text, p_tags text[])
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_tsvector('english',
    p_name || ' ' ||
    COALESCE(p_description, '') || ' ' ||
    COALESCE(array_to_string(p_tags, ' '), '')
  );
$$;

-- Create GIN index using the immutable function
CREATE INDEX IF NOT EXISTS packages_fts_idx ON packages
USING gin(packages_search_vector(name, description, tags));

-- Add comment explaining the index
COMMENT ON INDEX packages_fts_idx IS 'Full-text search index for hybrid AI search - enables keyword matching alongside semantic vector search';

-- Analyze the table to update statistics for the query planner
ANALYZE packages;
