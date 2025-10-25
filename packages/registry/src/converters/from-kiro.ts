/**
 * Kiro Parser
 * Converts Kiro steering files to canonical format
 */

import yaml from 'js-yaml';
import type {
  CanonicalPackage,
  CanonicalContent,
  Section,
  InstructionsSection,
  RulesSection,
  ExamplesSection,
  ContextSection,
  MetadataSection,
} from '../types/canonical.js';
import { setTaxonomy } from './taxonomy-utils.js';

export interface PackageMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  tags?: string[];
  version?: string;
}

/**
 * Parse Kiro steering file to canonical format
 */
export function fromKiro(
  content: string,
  metadata: PackageMetadata
): CanonicalPackage {
  // Parse frontmatter (REQUIRED for Kiro)
  const { frontmatter, body } = parseFrontmatter(content);

  // Validate frontmatter
  if (!frontmatter.inclusion) {
    throw new Error('Kiro steering files require inclusion field in frontmatter');
  }

  if (frontmatter.inclusion === 'fileMatch' && !frontmatter.fileMatchPattern) {
    throw new Error('fileMatch inclusion mode requires fileMatchPattern');
  }

  // Parse markdown body
  const sections = parseMarkdown(body);

  // Create metadata section
  const metadataSection: MetadataSection = {
    type: 'metadata',
    data: {
      title: metadata.name,
      description: metadata.description || '',
    },
  };

  // Build canonical content
  const canonicalContent: CanonicalContent = {
    format: 'canonical',
    version: '1.0',
    sections: [metadataSection, ...sections],
  };

  // Infer domain from filename if not provided
  const domain = metadata.name.replace(/-/g, ' ').replace(/\.md$/, '');

  // Detect foundational Kiro files
  const foundationalType = detectFoundationalType(metadata.name);
  const additionalTags = inferTags(frontmatter, foundationalType);

  // Build canonical package
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    version: metadata.version || '1.0.0',
    name: metadata.name,
    description: metadata.description || '',
    author: metadata.author || '',
    tags: metadata.tags || ['kiro', ...additionalTags],
    content: canonicalContent,
    sourceFormat: 'kiro',
    metadata: {
      title: metadata.name,
      description: metadata.description || '',
      kiroConfig: {
        filename: metadata.name,
        inclusion: frontmatter.inclusion,
        fileMatchPattern: frontmatter.fileMatchPattern,
        domain,
        foundationalType,
      },
    },
  };

  // Set taxonomy (format + subtype + legacy type)
  // Kiro steering files are rules by default
  setTaxonomy(pkg, 'kiro', 'rule');

  return pkg as CanonicalPackage;
}

/**
 * Parse YAML frontmatter from Kiro steering file
 * Frontmatter is REQUIRED for Kiro
 */
function parseFrontmatter(content: string): {
  frontmatter: {
    inclusion?: 'always' | 'fileMatch' | 'manual';
    fileMatchPattern?: string;
  };
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error('Kiro steering files require YAML frontmatter with ---');
  }

  const [, frontmatterText, body] = match;

  try {
    // Parse YAML frontmatter
    const parsed = yaml.load(frontmatterText) as Record<string, unknown>;

    const frontmatter: {
      inclusion?: 'always' | 'fileMatch' | 'manual';
      fileMatchPattern?: string;
    } = {};

    if (parsed && typeof parsed === 'object') {
      // Parse inclusion field
      if ('inclusion' in parsed) {
        const inclusion = parsed.inclusion;
        if (inclusion === 'always' || inclusion === 'fileMatch' || inclusion === 'manual') {
          frontmatter.inclusion = inclusion;
        }
      }

      // Parse fileMatchPattern field
      if ('fileMatchPattern' in parsed && typeof parsed.fileMatchPattern === 'string') {
        frontmatter.fileMatchPattern = parsed.fileMatchPattern;
      }
    }

    return { frontmatter, body };
  } catch (error) {
    throw new Error(`Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse markdown body into canonical sections
 */
function parseMarkdown(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: {
    type: 'instructions' | 'rules' | 'examples' | 'context';
    title: string;
    content: string[];
    items?: Array<{ content: string; rationale?: string; examples?: string[] }>;
    examples?: Array<{ description: string; code: string; language?: string; good?: boolean }>;
  } | null = null;

  let inCodeBlock = false;
  let currentCodeBlock: { description: string; code: string[]; language?: string; good?: boolean } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect headers
    if (line.startsWith('# ')) {
      // Main title - create context section from it
      if (currentSection) {
        sections.push(buildSection(currentSection));
      }
      const title = line.substring(2).trim();
      currentSection = {
        type: 'context',
        title: 'Domain',
        content: [title],
      };
      continue;
    }

    if (line.startsWith('## ')) {
      // Section header
      if (currentSection) {
        sections.push(buildSection(currentSection));
      }

      const title = line.substring(3).trim();
      const sectionType = inferSectionType(title, lines, i);

      currentSection = {
        type: sectionType,
        title,
        content: [],
        items: sectionType === 'rules' ? [] : undefined,
        examples: sectionType === 'examples' ? [] : undefined,
      };
      continue;
    }

    if (line.startsWith('### ')) {
      // Example description
      const description = line.substring(4).trim();
      const good = description.startsWith('✅') || description.toLowerCase().includes('preferred');

      currentCodeBlock = {
        description: description.replace(/^[✅❌]\s*/, '').replace(/^(Preferred|Avoid):\s*/i, ''),
        code: [],
        good,
      };
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        const language = line.substring(3).trim() || undefined;
        if (currentCodeBlock) {
          currentCodeBlock.language = language;
        }
      } else {
        // End of code block
        inCodeBlock = false;
        if (currentCodeBlock && currentSection?.type === 'examples') {
          currentSection.examples!.push({
            description: currentCodeBlock.description,
            code: currentCodeBlock.code.join('\n'),
            language: currentCodeBlock.language,
            good: currentCodeBlock.good,
          });
          currentCodeBlock = null;
        }
      }
      continue;
    }

    // Inside code block
    if (inCodeBlock && currentCodeBlock) {
      currentCodeBlock.code.push(line);
      continue;
    }

    // List items (rules)
    if ((line.startsWith('- ') || line.match(/^\d+\.\s/)) && currentSection?.type === 'rules') {
      const itemContent = line.replace(/^[-\d.]\s+/, '').trim();
      currentSection.items!.push({ content: itemContent });
      continue;
    }

    // Sub-bullets (rationale or examples)
    if (line.startsWith('   - ') && currentSection?.type === 'rules' && currentSection.items!.length > 0) {
      const lastItem = currentSection.items![currentSection.items!.length - 1];
      const subContent = line.substring(5).trim();

      if (subContent.startsWith('*Rationale:')) {
        lastItem.rationale = subContent.replace(/^\*Rationale:\s*/, '').replace(/\*$/, '');
      } else if (subContent.startsWith('Example:')) {
        if (!lastItem.examples) lastItem.examples = [];
        lastItem.examples.push(subContent.replace(/^Example:\s*`([^`]+)`/, '$1'));
      }
      continue;
    }

    // Regular content lines
    if (line.trim() && currentSection) {
      currentSection.content.push(line);
    }
  }

  // Add last section
  if (currentSection) {
    sections.push(buildSection(currentSection));
  }

  return sections;
}

/**
 * Build canonical section from parsed data
 */
function buildSection(parsed: {
  type: 'instructions' | 'rules' | 'examples' | 'context';
  title: string;
  content: string[];
  items?: Array<{ content: string; rationale?: string; examples?: string[] }>;
  examples?: Array<{ description: string; code: string; language?: string; good?: boolean }>;
}): Section {
  switch (parsed.type) {
    case 'rules':
      return {
        type: 'rules',
        title: parsed.title,
        items: (parsed.items || []).map(item => ({
          content: item.content,
          rationale: item.rationale,
          examples: item.examples,
        })),
        ordered: false,
      } as RulesSection;

    case 'examples':
      return {
        type: 'examples',
        title: parsed.title,
        examples: parsed.examples || [],
      } as ExamplesSection;

    case 'context':
      return {
        type: 'context',
        title: parsed.title,
        content: parsed.content.join('\n'),
      } as ContextSection;

    case 'instructions':
    default:
      return {
        type: 'instructions',
        title: parsed.title,
        content: parsed.content.join('\n'),
      } as InstructionsSection;
  }
}

/**
 * Infer section type from title and content
 */
function inferSectionType(
  title: string,
  lines: string[],
  startIndex: number
): 'instructions' | 'rules' | 'examples' | 'context' {
  const titleLower = title.toLowerCase();

  // Check for examples keywords
  if (titleLower.includes('example') || titleLower.includes('sample')) {
    return 'examples';
  }

  // Check for rules/guidelines keywords
  if (
    titleLower.includes('rule') ||
    titleLower.includes('guideline') ||
    titleLower.includes('standard') ||
    titleLower.includes('convention') ||
    titleLower.includes('policy')
  ) {
    return 'rules';
  }

  // Check for context keywords
  if (
    titleLower.includes('context') ||
    titleLower.includes('background') ||
    titleLower.includes('overview')
  ) {
    return 'context';
  }

  // Look ahead to see if next lines are list items
  for (let i = startIndex + 1; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
      return 'rules';
    }
    if (line.startsWith('### ') || line.startsWith('```')) {
      return 'examples';
    }
  }

  // Default to instructions
  return 'instructions';
}

/**
 * Detect if this is a foundational Kiro file
 * Returns: 'product' | 'tech' | 'structure' | undefined
 */
function detectFoundationalType(filename: string): 'product' | 'tech' | 'structure' | undefined {
  const normalizedName = filename.toLowerCase().replace(/\.md$/, '');

  if (normalizedName === 'product') {
    return 'product';
  }
  if (normalizedName === 'tech') {
    return 'tech';
  }
  if (normalizedName === 'structure') {
    return 'structure';
  }

  return undefined;
}

/**
 * Infer tags from frontmatter and foundational type
 */
function inferTags(
  frontmatter: {
    inclusion?: 'always' | 'fileMatch' | 'manual';
    fileMatchPattern?: string;
  },
  foundationalType?: 'product' | 'tech' | 'structure'
): string[] {
  const tags: string[] = [];

  // Add foundational type tag
  if (foundationalType) {
    tags.push(`kiro-${foundationalType}`);
  }

  if (frontmatter.inclusion) {
    tags.push(`kiro-${frontmatter.inclusion}`);
  }

  if (frontmatter.fileMatchPattern) {
    // Extract domain from pattern (e.g., "src/api/**/*.ts" → "api")
    const pathMatch = frontmatter.fileMatchPattern.match(/\/([^/]+)\//);
    if (pathMatch) {
      tags.push(pathMatch[1]);
    }
  }

  return tags;
}
