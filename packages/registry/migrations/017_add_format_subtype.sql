-- Migration: Add format and subtype columns, remove type column
-- Clean taxonomy: Format (platform) + Subtype (functional category)

-- Add new columns
ALTER TABLE packages ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS subtype TEXT DEFAULT 'rule';

-- Migrate existing data from type column to format + subtype (if type column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'type') THEN
    UPDATE packages SET
      format = CASE
        -- Collections
        WHEN type = 'collection' THEN 'generic'
        -- MCP
        WHEN type = 'mcp' THEN 'mcp'
        -- Compound types (cursor-agent, claude-skill, etc.)
        WHEN type LIKE '%-%' THEN split_part(type, '-', 1)
        -- Simple types
        ELSE type
      END,
      subtype = CASE
        -- Collection
        WHEN type = 'collection' THEN 'collection'
        -- MCP defaults to tool
        WHEN type = 'mcp' THEN 'tool'
        -- cursor-agent, claude-agent, etc.
        WHEN type LIKE '%-agent' THEN 'agent'
        -- cursor-slash-command, claude-slash-command
        WHEN type LIKE '%-slash-command' THEN 'slash-command'
        -- claude-skill
        WHEN type LIKE '%-skill' THEN 'skill'
        -- Simple types default to rule
        ELSE 'rule'
      END
    WHERE format IS NULL OR subtype IS NULL;
  END IF;
END $$;

-- Add constraints
ALTER TABLE packages ADD CONSTRAINT packages_format_check
  CHECK (format IN ('cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'));

ALTER TABLE packages ADD CONSTRAINT packages_subtype_check
  CHECK (subtype IN ('rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'));

-- Make format and subtype NOT NULL
ALTER TABLE packages ALTER COLUMN format SET NOT NULL;
ALTER TABLE packages ALTER COLUMN subtype SET NOT NULL;
ALTER TABLE packages ALTER COLUMN subtype SET DEFAULT 'rule';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_packages_format ON packages(format);
CREATE INDEX IF NOT EXISTS idx_packages_subtype ON packages(subtype);
CREATE INDEX IF NOT EXISTS idx_packages_format_subtype ON packages(format, subtype);

-- Drop the old type column if it exists
ALTER TABLE packages DROP COLUMN IF EXISTS type;

-- Drop the old type constraint if it exists
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_type_check;
