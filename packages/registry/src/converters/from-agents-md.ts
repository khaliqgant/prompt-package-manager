/**
 * agents.md Parser
 * Converts OpenAI agents.md files to canonical format
 *
 * agents.md is OpenAI's standardized format for guiding AI coding agents.
 * Files are typically simple markdown with project-specific instructions.
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
 * Parse agents.md file to canonical format
 */
export function fromAgentsMd(
  content: string,
  metadata: PackageMetadata
): CanonicalPackage {
  // Parse frontmatter if exists (optional for agents.md)
  const { frontmatter, body } = parseFrontmatter(content);

  // Parse markdown body
  const sections = parseMarkdown(body);

  // Extract description from first paragraph if not provided
  const description = metadata.description || extractDescription(body);

  // Create metadata section
  const metadataSection: MetadataSection = {
    type: 'metadata',
    data: {
      title: metadata.name,
      description,
    },
  };

  // Build canonical content
  const canonicalContent: CanonicalContent = {
    format: 'canonical',
    version: '1.0',
    sections: [metadataSection, ...sections],
  };

  // Build canonical package
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    version: metadata.version || '1.0.0',
    name: metadata.name,
    description,
    author: metadata.author || '',
    tags: metadata.tags || ['agents.md', ...inferTags(body)],
    content: canonicalContent,
    sourceFormat: 'agents.md',
    metadata: {
      title: metadata.name,
      description,
      agentsMdConfig: {
        project: frontmatter.project,
        scope: frontmatter.scope,
      },
    },
  };

  // Set taxonomy (format + subtype + legacy type)
  // agents.md files are rules by default (project instructions)
  setTaxonomy(pkg, 'agents.md', 'rule');

  return pkg as CanonicalPackage;
}

/**
 * Parse YAML frontmatter from agents.md file (optional)
 */
function parseFrontmatter(content: string): {
  frontmatter: {
    project?: string;
    scope?: string;
  };
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;

  try {
    // Parse YAML frontmatter
    const parsed = yaml.load(frontmatterText) as Record<string, unknown>;

    const frontmatter: {
      project?: string;
      scope?: string;
    } = {};

    if (parsed && typeof parsed === 'object') {
      if ('project' in parsed && typeof parsed.project === 'string') {
        frontmatter.project = parsed.project;
      }
      if ('scope' in parsed && typeof parsed.scope === 'string') {
        frontmatter.scope = parsed.scope;
      }
    }

    return { frontmatter, body };
  } catch (error) {
    // If YAML parsing fails, return empty frontmatter
    console.warn('Failed to parse YAML frontmatter:', error);
    return { frontmatter: {}, body: content };
  }
}

/**
 * Extract description from first paragraph after main heading
 */
function extractDescription(content: string): string {
  const lines = content.split('\n');
  let afterHeading = false;
  const descriptionLines: string[] = [];

  for (const line of lines) {
    // Skip main heading
    if (line.startsWith('# ')) {
      afterHeading = true;
      continue;
    }

    // Stop at next heading
    if (afterHeading && (line.startsWith('## ') || line.startsWith('### '))) {
      break;
    }

    // Collect non-empty lines after main heading
    if (afterHeading && line.trim()) {
      descriptionLines.push(line.trim());
      // Stop after first paragraph
      if (descriptionLines.length > 0 && line.trim() === '') {
        break;
      }
    }
  }

  return descriptionLines.join(' ').substring(0, 200);
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
        title: 'Project Overview',
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
      const good = description.startsWith('✅') || description.toLowerCase().includes('preferred') || description.toLowerCase().includes('do:');

      currentCodeBlock = {
        description: description.replace(/^[✅❌]\s*/, '').replace(/^(Preferred|Avoid|Do|Don't):\s*/i, ''),
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
        } else {
          // Code block without description - create one
          currentCodeBlock = {
            description: 'Code example',
            code: [],
            language,
          };
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
        } else if (currentCodeBlock && currentSection) {
          // Add code block to content if not in examples section
          currentSection.content.push(`\`\`\`${currentCodeBlock.language || ''}\n${currentCodeBlock.code.join('\n')}\n\`\`\``);
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

      if (subContent.startsWith('Rationale:') || subContent.startsWith('Why:')) {
        lastItem.rationale = subContent.replace(/^(Rationale|Why):\s*/, '');
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
  if (titleLower.includes('example') || titleLower.includes('sample') || titleLower.includes('usage')) {
    return 'examples';
  }

  // Check for rules/guidelines keywords
  if (
    titleLower.includes('rule') ||
    titleLower.includes('guideline') ||
    titleLower.includes('standard') ||
    titleLower.includes('convention') ||
    titleLower.includes('requirement') ||
    titleLower.includes('must') ||
    titleLower.includes('should')
  ) {
    return 'rules';
  }

  // Check for context keywords
  if (
    titleLower.includes('context') ||
    titleLower.includes('background') ||
    titleLower.includes('overview') ||
    titleLower.includes('about') ||
    titleLower.includes('introduction')
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
 * Infer tags from content
 */
function inferTags(content: string): string[] {
  const tags: string[] = [];
  const contentLower = content.toLowerCase();

  // Common technology tags
  const techKeywords = [
    'typescript',
    'javascript',
    'python',
    'react',
    'testing',
    'api',
    'backend',
    'frontend',
    'database',
    'security',
  ];

  for (const keyword of techKeywords) {
    if (contentLower.includes(keyword)) {
      tags.push(keyword);
    }
  }

  // OpenAI Codex specific
  if (contentLower.includes('codex') || contentLower.includes('openai')) {
    tags.push('codex');
  }

  return tags.slice(0, 5); // Limit to 5 inferred tags
}
