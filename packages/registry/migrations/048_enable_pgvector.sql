-- Enable pgvector extension for AI-powered semantic search
-- Required for storing and querying vector embeddings
-- Note: Skips gracefully if pgvector is not installed (e.g., in local dev)

DO $$
BEGIN
  -- Try to create the extension
  CREATE EXTENSION IF NOT EXISTS vector;
  RAISE NOTICE 'pgvector extension enabled successfully';
EXCEPTION
  WHEN undefined_file THEN
    RAISE WARNING 'pgvector extension not available - semantic search features will be disabled';
    RAISE WARNING 'To enable: brew install pgvector (macOS) or apt-get install postgresql-XX-pgvector (Linux)';
  WHEN OTHERS THEN
    RAISE WARNING 'Could not enable pgvector: %', SQLERRM;
END $$;
