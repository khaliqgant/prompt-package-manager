/**
 * GitHub Copilot Format Converter
 * Converts canonical format to GitHub Copilot instructions
 *
 * File structure:
 * - Repository-wide: .github/copilot-instructions.md
 * - Path-specific: .github/instructions/NAME.instructions.md
 *
 * Format:
 * - Optional YAML frontmatter with applyTo for path-specific
 * - Natural language markdown
 * - Simple, clear instructions
 */

import type {
  CanonicalPackage,
  ConversionResult,
  Section,
  Rule,
  Example,
} from '../types/canonical.js';

export interface CopilotConfig {
  instructionName?: string; // Name for the instruction file (e.g., "react-components")
  applyTo?: string; // REQUIRED for path-specific - glob pattern
  repositoryWide?: boolean; // Whether this is repository-wide (default: true if no applyTo)
}

/**
 * Convert canonical package to GitHub Copilot format
 */
export function toCopilot(
  pkg: CanonicalPackage,
  options: { copilotConfig?: CopilotConfig } = {}
): ConversionResult {
  const warnings: string[] = [];
  let qualityScore = 100;

  try {
    const config = options.copilotConfig || {};
    const isPathSpecific = !!config.applyTo;

    // Validate path-specific requirements
    if (isPathSpecific && !config.applyTo) {
      warnings.push('Path-specific instruction requires applyTo pattern');
      qualityScore -= 20;
    }

    // Generate content
    const content = convertContent(pkg, warnings, config);

    // Add frontmatter for path-specific instructions
    let fullContent: string;
    if (isPathSpecific && config.applyTo) {
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
      format: 'copilot',
      warnings: warnings.length > 0 ? warnings : undefined,
      lossyConversion,
      qualityScore,
    };
  } catch (error) {
    warnings.push(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      content: '',
      format: 'copilot',
      warnings,
      lossyConversion: true,
      qualityScore: 0,
    };
  }
}

/**
 * Generate YAML frontmatter for path-specific instructions
 */
function generateFrontmatter(config: CopilotConfig): string {
  const lines: string[] = ['---'];

  if (config.applyTo) {
    lines.push(`applyTo: "${config.applyTo}"`);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Convert canonical content to GitHub Copilot markdown
 */
function convertContent(
  pkg: CanonicalPackage,
  warnings: string[],
  config: CopilotConfig
): string {
  const lines: string[] = [];

  // Add instruction name as title (if provided)
  const instructionName = config.instructionName || pkg.metadata?.title || pkg.name;
  lines.push(`# ${instructionName}`);
  lines.push('');

  // Add description if available
  if (pkg.description || pkg.metadata?.description) {
    lines.push(pkg.description || pkg.metadata?.description || '');
    lines.push('');
  }

  // Convert sections
  for (const section of pkg.content.sections) {
    // Skip metadata, tools, and persona (not applicable to Copilot)
    if (
      section.type === 'metadata' ||
      section.type === 'tools' ||
      section.type === 'persona'
    ) {
      if (section.type === 'persona') {
        warnings.push('Persona section skipped (not supported by Copilot)');
      } else if (section.type === 'tools') {
        warnings.push('Tools section skipped (not supported by Copilot)');
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
 * Convert individual section to Copilot format
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
      // Only include if it's copilot-specific or generic
      if (!section.editorType || section.editorType === 'copilot') {
        return section.content;
      }
      warnings.push(`Custom ${section.editorType} section skipped`);
      return '';

    default:
      return '';
  }
}

/**
 * Convert instructions to Copilot format
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
 * Convert rules to Copilot format
 * Copilot prefers clear, instructional language
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
 * Convert examples to Copilot format
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
      lines.push(`### ❌ Don't: ${example.description}`);
    } else {
      lines.push(`### ✅ Do: ${example.description}`);
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
 * Convert context to Copilot format
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
 * Detect if content is already in GitHub Copilot format
 */
export function isCopilotFormat(content: string): boolean {
  // Copilot instructions are markdown, potentially with YAML frontmatter
  // Check for frontmatter with applyTo field
  const hasFrontmatter = content.startsWith('---\n') && content.includes('applyTo:');

  // Or it's simple markdown instructions (repository-wide)
  const isSimpleMarkdown = content.includes('#') && !content.includes('---\n');

  return hasFrontmatter || isSimpleMarkdown;
}

/**
 * Parse Copilot frontmatter (if exists)
 */
export function parseFrontmatter(content: string): {
  frontmatter: { applyTo?: string };
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;

  // Simple YAML parsing for applyTo field
  const frontmatter: { applyTo?: string } = {};

  frontmatterText.split('\n').forEach(line => {
    const applyToMatch = line.match(/^\s*applyTo:\s*"([^"]+)"\s*$/);
    if (applyToMatch) {
      frontmatter.applyTo = applyToMatch[1];
    }
  });

  return { frontmatter, body };
}

/**
 * Generate suggested filename for Copilot instruction
 */
export function generateFilename(
  pkg: CanonicalPackage,
  config?: CopilotConfig
): string {
  // Use provided instructionName if available
  if (config?.instructionName) {
    return sanitizeFilename(config.instructionName);
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
