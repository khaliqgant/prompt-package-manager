-- Migration 016: Add GitHub Copilot and Kiro Types
-- Add support for GitHub Copilot instructions and Kiro steering files as package types

ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_type_check;

ALTER TABLE packages ADD CONSTRAINT packages_type_check
  CHECK (type IN ('cursor', 'cursor-agent', 'cursor-slash-command', 'claude', 'claude-skill', 'claude-agent', 'claude-slash-command', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'));

COMMENT ON COLUMN packages.type IS 'Package type: cursor, cursor-agent, cursor-slash-command, claude, claude-skill, claude-agent, claude-slash-command, continue, windsurf, copilot (GitHub Copilot instructions), kiro (Kiro steering files), generic, or mcp';
