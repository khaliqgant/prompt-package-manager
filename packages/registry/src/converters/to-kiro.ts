/**
 * Kiro Format Converter
 * Converts canonical format to Kiro steering file format
 *
 * File structure:
 * - All files in .kiro/steering/ directory
 * - Files must have .md extension
 * - Filenames should be descriptive (e.g., api-standards.md, testing-standards.md)
 *
 * Format:
 * - Required YAML frontmatter with inclusion mode
 * - Natural language markdown
 * - One domain per file
 * - Clear context for AI code generation
 */

import type {
  CanonicalPackage,
  ConversionResult,
  Section,
  Rule,
  Example,
} from '../types/canonical.js';

export interface KiroConfig {
  filename?: string; // Suggested filename in .kiro/steering/
  inclusion: 'always' | 'fileMatch' | 'manual'; // REQUIRED - no default
  fileMatchPattern?: string; // Required if inclusion === 'fileMatch'
  domain?: string; // Domain/topic for organization
}

/**
 * Convert canonical package to Kiro format
 */
export function toKiro(
  pkg: CanonicalPackage,
  options: { kiroConfig?: KiroConfig } = {}
): ConversionResult {
  const warnings: string[] = [];
  let qualityScore = 100;

  try {
    const config = options.kiroConfig;

    // Validate REQUIRED inclusion mode
    if (!config || !config.inclusion) {
      throw new Error('Kiro format requires inclusion mode (always|fileMatch|manual)');
    }

    // Validate fileMatchPattern for fileMatch mode
    if (config.inclusion === 'fileMatch' && !config.fileMatchPattern) {
      throw new Error('fileMatch inclusion mode requires fileMatchPattern');
    }

    // Generate frontmatter (required for Kiro)
    const frontmatter = generateFrontmatter(config);

    // Generate content
    const content = convertContent(pkg, warnings, config);

    // Combine frontmatter and content
    const fullContent = `${frontmatter}\n\n${content}`;

    // Check for lossy conversion
    const lossyConversion = warnings.some(w =>
      w.includes('not supported') || w.includes('skipped')
    );

    if (lossyConversion) {
      qualityScore -= 10;
    }

    return {
      content: fullContent,
      format: 'kiro',
      warnings: warnings.length > 0 ? warnings : undefined,
      lossyConversion,
      qualityScore,
    };
  } catch (error) {
    warnings.push(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      content: '',
      format: 'kiro',
      warnings,
      lossyConversion: true,
      qualityScore: 0,
    };
  }
}

/**
 * Generate YAML frontmatter for Kiro steering file
 * Frontmatter is REQUIRED for Kiro
 */
function generateFrontmatter(config: KiroConfig): string {
  const lines: string[] = ['---'];

  // inclusion is REQUIRED
  lines.push(`inclusion: ${config.inclusion}`);

  // fileMatchPattern is required for fileMatch mode
  if (config.inclusion === 'fileMatch' && config.fileMatchPattern) {
    lines.push(`fileMatchPattern: "${config.fileMatchPattern}"`);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Convert canonical content to Kiro markdown
 */
function convertContent(
  pkg: CanonicalPackage,
  warnings: string[],
  config: KiroConfig
): string {
  const lines: string[] = [];

  // Add domain/topic as title
  const title = config.domain || pkg.metadata?.title || pkg.name;
  lines.push(`# ${title}`);
  lines.push('');

  // Add description if available
  if (pkg.description || pkg.metadata?.description) {
    lines.push(pkg.description || pkg.metadata?.description || '');
    lines.push('');
  }

  // Convert sections
  for (const section of pkg.content.sections) {
    // Skip metadata, tools, and persona (not applicable to Kiro)
    if (
      section.type === 'metadata' ||
      section.type === 'tools' ||
      section.type === 'persona'
    ) {
      if (section.type === 'persona') {
        warnings.push('Persona section skipped (not supported by Kiro)');
      } else if (section.type === 'tools') {
        warnings.push('Tools section skipped (not supported by Kiro)');
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
 * Convert individual section to Kiro format
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
      // Only include if it's kiro-specific or generic
      if (!section.editorType || section.editorType === 'kiro') {
        return section.content;
      }
      warnings.push(`Custom ${section.editorType} section skipped`);
      return '';

    default:
      return '';
  }
}

/**
 * Convert instructions to Kiro format
 * Kiro prefers clear, contextual information
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
 * Convert rules to Kiro format
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
      lines.push(`   - *Rationale: ${rule.rationale}*`);
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
 * Convert examples to Kiro format
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
    } else {
      lines.push(`### ✅ Preferred: ${example.description}`);
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
 * Convert context to Kiro format
 * Context is particularly important for Kiro's steering files
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
 * Detect if content is already in Kiro format
 */
export function isKiroFormat(content: string): boolean {
  // Kiro requires YAML frontmatter with inclusion field
  if (!content.startsWith('---\n')) {
    return false;
  }

  return content.includes('inclusion:');
}

/**
 * Parse Kiro frontmatter
 */
export function parseFrontmatter(content: string): {
  frontmatter: {
    inclusion?: 'always' | 'fileMatch' | 'manual';
    fileMatchPattern?: string;
  };
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;

  // Parse frontmatter fields
  const frontmatter: {
    inclusion?: 'always' | 'fileMatch' | 'manual';
    fileMatchPattern?: string;
  } = {};

  frontmatterText.split('\n').forEach(line => {
    const inclusionMatch = line.match(/^\s*inclusion:\s*(always|fileMatch|manual)\s*$/);
    if (inclusionMatch) {
      frontmatter.inclusion = inclusionMatch[1] as 'always' | 'fileMatch' | 'manual';
    }

    const patternMatch = line.match(/^\s*fileMatchPattern:\s*"([^"]+)"\s*$/);
    if (patternMatch) {
      frontmatter.fileMatchPattern = patternMatch[1];
    }
  });

  return { frontmatter, body };
}

/**
 * Generate suggested filename for Kiro steering file
 */
export function generateFilename(
  pkg: CanonicalPackage,
  config?: KiroConfig
): string {
  // Use provided filename if available
  if (config?.filename) {
    return sanitizeFilename(config.filename);
  }

  // Use domain if available
  if (config?.domain) {
    return sanitizeFilename(config.domain);
  }

  // Use package name or title
  const name = pkg.metadata?.title || pkg.name || pkg.id;
  return sanitizeFilename(name);
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

/**
 * Validate Kiro config
 */
export function validateKiroConfig(config: KiroConfig): { valid: boolean; error?: string } {
  if (!config.inclusion) {
    return { valid: false, error: 'inclusion mode is required (always|fileMatch|manual)' };
  }

  if (config.inclusion === 'fileMatch' && !config.fileMatchPattern) {
    return { valid: false, error: 'fileMatchPattern is required for fileMatch inclusion mode' };
  }

  const validInclusions: Array<'always' | 'fileMatch' | 'manual'> = ['always', 'fileMatch', 'manual'];
  if (!validInclusions.includes(config.inclusion)) {
    return { valid: false, error: `inclusion must be one of: ${validInclusions.join(', ')}` };
  }

  return { valid: true };
}
