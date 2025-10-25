/**
 * agents.md Format Converter
 * Converts canonical format to OpenAI agents.md format
 *
 * File structure:
 * - Project root: agents.md (standard location)
 * - Custom location: can be placed anywhere in the repo
 *
 * Format:
 * - Optional YAML frontmatter with project/scope metadata
 * - Natural language markdown
 * - Project-specific coding conventions and instructions
 * - Used by OpenAI Codex and other AI coding agents
 */

import type {
  CanonicalPackage,
  ConversionResult,
  Section,
  Rule,
  Example,
} from '../types/canonical.js';

export interface AgentsMdConfig {
  project?: string; // Project name
  scope?: string; // Scope of the instructions (e.g., "testing", "api")
  includeFrontmatter?: boolean; // Whether to include YAML frontmatter (default: false)
}

/**
 * Convert canonical package to agents.md format
 */
export function toAgentsMd(
  pkg: CanonicalPackage,
  options: { agentsMdConfig?: AgentsMdConfig } = {}
): ConversionResult {
  const warnings: string[] = [];
  let qualityScore = 100;

  try {
    const config = options.agentsMdConfig || {};

    // Generate content
    const content = convertContent(pkg, warnings, config);

    // Add frontmatter if requested
    let fullContent: string;
    if (config.includeFrontmatter && (config.project || config.scope)) {
      const frontmatter = generateFrontmatter(config);
      fullContent = `${frontmatter}\n\n${content}`;
    } else {
      fullContent = content;
    }

    // Check for lossy conversion
    const lossyConversion = warnings.some(w =>
      w.includes('not supported') || w.includes('skipped')
    );

    if (lossyConversion) {
      qualityScore -= 10;
    }

    return {
      content: fullContent,
      format: 'agents.md',
      warnings: warnings.length > 0 ? warnings : undefined,
      lossyConversion,
      qualityScore,
    };
  } catch (error) {
    warnings.push(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      content: '',
      format: 'agents.md',
      warnings,
      lossyConversion: true,
      qualityScore: 0,
    };
  }
}

/**
 * Generate YAML frontmatter
 */
function generateFrontmatter(config: AgentsMdConfig): string {
  const lines: string[] = ['---'];

  if (config.project) {
    lines.push(`project: ${config.project}`);
  }

  if (config.scope) {
    lines.push(`scope: ${config.scope}`);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Convert canonical content to agents.md markdown
 */
function convertContent(
  pkg: CanonicalPackage,
  warnings: string[],
  config: AgentsMdConfig
): string {
  const lines: string[] = [];

  // Add project name as title
  const projectName = config.project || pkg.metadata?.title || pkg.name;
  lines.push(`# ${projectName}`);
  lines.push('');

  // Add description if available
  if (pkg.description || pkg.metadata?.description) {
    lines.push(pkg.description || pkg.metadata?.description || '');
    lines.push('');
  }

  // Convert sections
  for (const section of pkg.content.sections) {
    // Skip metadata, tools, and persona (not applicable to agents.md)
    if (
      section.type === 'metadata' ||
      section.type === 'tools' ||
      section.type === 'persona'
    ) {
      if (section.type === 'persona') {
        warnings.push('Persona section skipped (not supported by agents.md)');
      } else if (section.type === 'tools') {
        warnings.push('Tools section skipped (not supported by agents.md)');
      }
      continue;
    }

    const sectionContent = convertSection(section, warnings);
    if (sectionContent) {
      lines.push(sectionContent);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Convert individual section to agents.md format
 */
function convertSection(section: Section, warnings: string[]): string {
  switch (section.type) {
    case 'instructions':
      return convertInstructions(section);

    case 'rules':
      return convertRules(section);

    case 'examples':
      return convertExamples(section);

    case 'context':
      return convertContext(section);

    case 'custom':
      // Include if no specific editor type (generic custom section)
      if (!section.editorType) {
        return section.content;
      }
      // Skip editor-specific custom sections as they likely won't work in agents.md
      warnings.push(`Custom ${section.editorType} section skipped`);
      return '';

    default:
      return '';
  }
}

/**
 * Convert instructions to agents.md format
 */
function convertInstructions(section: {
  type: 'instructions';
  title: string;
  content: string;
  priority?: string;
}): string {
  const lines: string[] = [];

  // Add section title
  lines.push(`## ${section.title}`);
  lines.push('');

  // Add content (already natural language markdown)
  lines.push(section.content);

  return lines.join('\n');
}

/**
 * Convert rules to agents.md format
 * agents.md prefers clear, instructional language
 */
function convertRules(section: {
  type: 'rules';
  title: string;
  items: Rule[];
  ordered?: boolean;
}): string {
  const lines: string[] = [];

  lines.push(`## ${section.title}`);
  lines.push('');

  section.items.forEach((rule, index) => {
    const prefix = section.ordered ? `${index + 1}.` : '-';

    // Convert rule to clear instruction
    lines.push(`${prefix} ${rule.content}`);

    // Add rationale as sub-bullet for context
    if (rule.rationale) {
      lines.push(`   - Rationale: ${rule.rationale}`);
    }

    // Add examples as inline code
    if (rule.examples && rule.examples.length > 0) {
      rule.examples.forEach((example: string) => {
        lines.push(`   - Example: \`${example}\``);
      });
    }
  });

  return lines.join('\n');
}

/**
 * Convert examples to agents.md format
 */
function convertExamples(section: {
  type: 'examples';
  title: string;
  examples: Example[];
}): string {
  const lines: string[] = [];

  lines.push(`## ${section.title}`);
  lines.push('');

  section.examples.forEach((example) => {
    // Add description
    if (example.good === false) {
      lines.push(`### ❌ Avoid: ${example.description}`);
    } else if (example.good === true) {
      lines.push(`### ✅ Preferred: ${example.description}`);
    } else {
      lines.push(`### ${example.description}`);
    }

    lines.push('');

    // Add code block
    const lang = example.language || '';
    lines.push('```' + lang);
    lines.push(example.code);
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Convert context to agents.md format
 */
function convertContext(section: {
  type: 'context';
  title: string;
  content: string;
}): string {
  const lines: string[] = [];

  lines.push(`## ${section.title}`);
  lines.push('');
  lines.push(section.content);

  return lines.join('\n');
}

/**
 * Detect if content is already in agents.md format
 */
export function isAgentsMdFormat(content: string): boolean {
  // agents.md files are typically markdown with project instructions
  // They may have optional YAML frontmatter
  const hasFrontmatter = content.startsWith('---\n') &&
    (content.includes('project:') || content.includes('scope:'));

  // Or it's simple markdown instructions
  const isSimpleMarkdown = content.includes('#') &&
    !content.includes('inclusion:') && // Not Kiro
    !content.includes('applyTo:'); // Not Copilot

  return hasFrontmatter || isSimpleMarkdown;
}

/**
 * Generate suggested filename for agents.md file
 */
export function generateFilename(
  pkg: CanonicalPackage,
  config?: AgentsMdConfig
): string {
  // agents.md is the standard filename
  // If scope is provided, use it as a prefix
  if (config?.scope) {
    return `${sanitizeFilename(config.scope)}-agents.md`;
  }

  return 'agents.md';
}

/**
 * Sanitize filename for filesystem
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
