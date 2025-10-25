/**
 * Taxonomy utility functions
 * Helper functions for working with package format and subtype
 */

import type { CanonicalPackage } from '../types/canonical.js';

export type Format = 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro' | 'agents.md' | 'generic' | 'mcp';
export type Subtype = 'rule' | 'agent' | 'skill' | 'slash-command' | 'prompt' | 'workflow' | 'tool' | 'template' | 'collection';

/**
 * Detect subtype from frontmatter fields
 */
export function detectSubtypeFromFrontmatter(frontmatter: Record<string, any>): Subtype {
  // Check for explicit type fields
  if (frontmatter.agentType === 'agent' || frontmatter.type === 'agent') {
    return 'agent';
  }
  if (frontmatter.skillType === 'skill' || frontmatter.type === 'skill') {
    return 'skill';
  }
  if (frontmatter.commandType === 'slash-command' || frontmatter.type === 'slash-command') {
    return 'slash-command';
  }

  // Check for tools (indicates agent)
  if (frontmatter.tools && frontmatter.tools.trim().length > 0) {
    return 'agent';
  }

  // Default to rule
  return 'rule';
}

/**
 * Set taxonomy fields on a canonical package
 */
export function setTaxonomy(
  pkg: Partial<CanonicalPackage>,
  format: Format,
  subtype?: Subtype
): void {
  pkg.format = format;
  pkg.subtype = subtype || 'rule';
}

/**
 * Detect format from source format string
 */
export function normalizeFormat(sourceFormat: string): Format {
  const normalized = sourceFormat.toLowerCase();

  if (normalized.includes('cursor')) return 'cursor';
  if (normalized.includes('claude')) return 'claude';
  if (normalized.includes('continue')) return 'continue';
  if (normalized.includes('windsurf')) return 'windsurf';
  if (normalized.includes('copilot')) return 'copilot';
  if (normalized.includes('kiro')) return 'kiro';
  if (normalized.includes('agents.md') || normalized.includes('agentsmd')) return 'agents.md';
  if (normalized.includes('mcp')) return 'mcp';

  return 'generic';
}
