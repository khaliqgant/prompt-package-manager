/**
 * Windsurf Rules Parser
 * Converts Windsurf .windsurfrules format to canonical package format
 *
 * Windsurf uses a simple markdown format without special frontmatter.
 */

import type {
  CanonicalPackage,
  Section,
  InstructionsSection,
} from '../types/canonical.js';
import { setTaxonomy } from './taxonomy-utils.js';

/**
 * Parse Windsurf rules file to canonical format
 */
export function fromWindsurf(
  content: string,
  metadata: {
    id: string;
    version?: string;
    author?: string;
    tags?: string[];
  }
): CanonicalPackage {
  const sections: Section[] = [];

  // Windsurf format is simple markdown - just treat the whole content as instructions
  const instructionsSection: InstructionsSection = {
    type: 'instructions',
    title: 'Windsurf Rules',
    content: content.trim(),
  };

  sections.push(instructionsSection);

  // Build canonical package
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    name: metadata.id,
    version: metadata.version || '1.0.0',
    description: 'Windsurf rules',
    author: metadata.author || 'unknown',
    tags: metadata.tags || [],
    sourceFormat: 'windsurf',
    content: {
      format: 'canonical',
      version: '1.0',
      sections,
    },
  };

  // Set taxonomy (format + subtype)
  // Windsurf rules are rules by default
  setTaxonomy(pkg, 'windsurf', 'rule');

  return pkg as CanonicalPackage;
}

/**
 * Check if content matches Windsurf format
 * (Simple markdown without YAML frontmatter)
 */
export function isWindsurfFormat(content: string): boolean {
  const trimmed = content.trim();

  // Check if it starts with frontmatter (---) - if so, it's not Windsurf
  if (trimmed.startsWith('---')) {
    return false;
  }

  // Windsurf format is just plain markdown
  // Check for common markdown patterns
  const hasMarkdown = /^#+ /.test(trimmed) || // Headers
                      /^- /.test(trimmed) ||   // Lists
                      /^[0-9]+\. /.test(trimmed); // Numbered lists

  return hasMarkdown || trimmed.length > 0;
}
