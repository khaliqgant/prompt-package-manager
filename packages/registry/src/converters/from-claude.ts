/**
 * Claude Format Parser
 * Converts Claude agent format to canonical format
 */

import type {
  CanonicalPackage,
  CanonicalContent,
  Section,
  MetadataSection,
  InstructionsSection,
  RulesSection,
  ToolsSection,
  PersonaSection,
  ExamplesSection,
  Rule,
  Example,
} from '../types/canonical.js';
import { detectSubtypeFromFrontmatter, setTaxonomy } from './taxonomy-utils.js';

/**
 * Parse Claude agent format into canonical format
 */
export function fromClaude(
  content: string,
  metadata: {
    id: string;
    version?: string;
    author?: string;
    tags?: string[];
  }
): CanonicalPackage {
  const { frontmatter, body } = parseFrontmatter(content);

  const sections: Section[] = [];

  // Extract metadata from frontmatter
  const metadataSection: MetadataSection = {
    type: 'metadata',
    data: {
      title: frontmatter.name || metadata.id,
      description: frontmatter.description || '',
      icon: frontmatter.icon,
      version: metadata.version || '1.0.0',
      author: metadata.author,
    },
  };
  sections.push(metadataSection);

  // Extract tools if present
  if (frontmatter.tools) {
    const tools = frontmatter.tools
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    if (tools.length > 0) {
      const toolsSection: ToolsSection = {
        type: 'tools',
        tools,
      };
      sections.push(toolsSection);
    }
  }

  // Extract model if present (optional field)
  if (frontmatter.model) {
    // Store model preference in metadata for roundtrip conversion
    if (metadataSection.data.claudeAgent === undefined) {
      metadataSection.data.claudeAgent = {};
    }
    metadataSection.data.claudeAgent.model = frontmatter.model;
  }

  // Parse body content
  const bodySections = parseMarkdownBody(body);
  sections.push(...bodySections);

  // Detect subtype from frontmatter
  const subtype = detectSubtypeFromFrontmatter(frontmatter);

  // Create package with new taxonomy
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    version: metadata.version || '1.0.0',
    name: frontmatter.name || metadata.id,
    description: frontmatter.description || '',
    author: metadata.author || 'unknown',
    tags: metadata.tags || [],
    content: {
      format: 'canonical',
      version: '1.0',
      sections,
    },
    sourceFormat: 'claude',
  };

  // Set taxonomy (format + subtype + legacy type)
  setTaxonomy(pkg, 'claude', subtype);

  return pkg as CanonicalPackage;
}

/**
 * Parse YAML frontmatter from Claude agent
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;

  // Simple YAML parsing
  const frontmatter: Record<string, any> = {};
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  });

  return { frontmatter, body };
}

/**
 * Parse markdown body into sections
 */
function parseMarkdownBody(body: string): Section[] {
  const sections: Section[] = [];
  const lines = body.split('\n');

  let currentSection: { type: string; title: string; lines: string[] } | null =
    null;
  let preamble: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for h1 (main title - usually just informational)
    if (line.startsWith('# ')) {
      continue; // Skip main title, already in metadata
    }

    // Check for h2 (section header)
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection) {
        sections.push(
          createSectionFromBlock(
            currentSection.title,
            currentSection.lines.join('\n')
          )
        );
      }

      // Start new section
      currentSection = {
        type: 'section',
        title: line.substring(3).trim(),
        lines: [],
      };
      continue;
    }

    // Add line to current section or preamble
    if (currentSection) {
      currentSection.lines.push(line);
    } else if (line.trim()) {
      preamble.push(line);
    }
  }

  // Handle preamble (content before first section)
  if (preamble.length > 0) {
    const preambleText = preamble.join('\n').trim();

    // Check if preamble contains persona information
    if (
      preambleText.startsWith('You are ') ||
      preambleText.includes('Your role is')
    ) {
      sections.push(parsePersona(preambleText));
    } else {
      // Generic instructions
      sections.push({
        type: 'instructions',
        title: 'Overview',
        content: preambleText,
      });
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(
      createSectionFromBlock(currentSection.title, currentSection.lines.join('\n'))
    );
  }

  return sections;
}

/**
 * Create appropriate section type from markdown block
 */
function createSectionFromBlock(title: string, content: string): Section {
  const trimmedContent = content.trim();

  // Detect section type from title and content
  const lowerTitle = title.toLowerCase();

  // Examples section (check first as it may contain bullets)
  if (
    lowerTitle.includes('example') ||
    trimmedContent.includes('```')
  ) {
    return parseExamplesSection(title, trimmedContent);
  }

  // Rules/guidelines section
  if (
    lowerTitle.includes('rule') ||
    lowerTitle.includes('guideline') ||
    lowerTitle.includes('principle') ||
    lowerTitle.includes('command') ||
    // Check for bulleted list (- or *) or bold items (**)
    (/^\s*[-*]\s+/m.test(trimmedContent) && !trimmedContent.includes('```')) ||
    /^\s*\*\*[^*]+\*\*:/m.test(trimmedContent)
  ) {
    return parseRulesSection(title, trimmedContent);
  }

  // Context/background section
  if (lowerTitle.includes('context') || lowerTitle.includes('background')) {
    return {
      type: 'context',
      title,
      content: trimmedContent,
    };
  }

  // Default to instructions
  return {
    type: 'instructions',
    title,
    content: trimmedContent,
  };
}

/**
 * Parse persona from preamble text
 */
function parsePersona(text: string): PersonaSection {
  const lines = text.split('\n');
  const data: Record<string, unknown> = {};

  // Extract name and role from "You are X, a Y" or "You are X" pattern
  const youAreMatch = text.match(/You are ([^,.\n]+)(?:,\s*(?:a\s+)?([^.]+))?/i);
  if (youAreMatch) {
    const firstPart = youAreMatch[1].trim();
    const secondPart = youAreMatch[2]?.trim();

    // If second part exists, first is name, second is role
    if (secondPart) {
      data.name = firstPart;
      data.role = secondPart;
    } else {
      // Otherwise, first part is the role
      data.role = firstPart;
    }
  }

  // Extract style from "Your communication style is X" or "**Style**: X"
  const styleMatch = text.match(/(?:communication\s+)?style(?:\s+is)?\s*:?\s*([^.]+)/i);
  if (styleMatch) {
    data.style = styleMatch[1]
      .split(/,|\s+and\s+/)
      .map(s => s.trim().replace(/^\*+|\*+$/g, '').replace(/^and\s+/i, ''))
      .filter(Boolean);
  }

  // Extract expertise from "Your areas of expertise include:" or bulleted list
  const expertise: string[] = [];
  let inExpertise = false;
  for (const line of lines) {
    if (line.toLowerCase().includes('expertise') || line.toLowerCase().includes('areas of')) {
      inExpertise = true;
      continue;
    }
    if (inExpertise && line.startsWith('- ')) {
      expertise.push(line.substring(2).trim());
    } else if (inExpertise && line.trim() && !line.startsWith('-')) {
      inExpertise = false;
    }
  }
  if (expertise.length > 0) {
    data.expertise = expertise;
  }

  return {
    type: 'persona',
    data: data as { name?: string; role: string; icon?: string; style?: string[]; expertise?: string[] },
  };
}

/**
 * Parse rules section
 */
function parseRulesSection(title: string, content: string): RulesSection {
  const lines = content.split('\n');
  const items: Rule[] = [];
  let currentRule: { content: string; rationale?: string; examples?: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Bold-formatted rule (e.g., **Rule**: Description)
    const boldRuleMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
    if (boldRuleMatch) {
      // Save previous rule
      if (currentRule) {
        items.push(currentRule);
      }

      const ruleName = boldRuleMatch[1].trim();
      const ruleDesc = boldRuleMatch[2].trim();
      currentRule = {
        content: ruleDesc || ruleName,
      };
      continue;
    }

    // Bulleted or numbered rule
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
      // Save previous rule
      if (currentRule) {
        items.push(currentRule);
      }

      // Extract rule content
      const content = trimmed.replace(/^[-*]\s+|^\d+\.\s+/, '').trim();
      currentRule = { content };
    }
    // Rationale (italicized text)
    else if (trimmed.startsWith('*') && !trimmed.startsWith('**') && currentRule) {
      const text = trimmed.replace(/^\*|\*$/g, '').trim();
      if (text.toLowerCase().includes('rationale:')) {
        currentRule.rationale = text.replace(/^rationale:\s*/i, '');
      } else {
        // Generic italic text is rationale
        currentRule.rationale = text;
      }
    }
    // Example
    else if (trimmed.startsWith('Example:') && currentRule) {
      if (!currentRule.examples) {
        currentRule.examples = [];
      }
      currentRule.examples.push(trimmed.replace(/^Example:\s*`?|`?$/g, ''));
    }
    // Indented content (belongs to current rule)
    else if (trimmed && trimmed.startsWith('  ') && currentRule) {
      // Additional content for current rule
      if (currentRule.content) {
        currentRule.content += ' ' + trimmed.trim();
      }
    }
  }

  // Save last rule
  if (currentRule) {
    items.push(currentRule);
  }

  return {
    type: 'rules',
    title,
    items,
  };
}

/**
 * Parse examples section
 */
function parseExamplesSection(title: string, content: string): ExamplesSection {
  const examples: Example[] = [];
  const sections = content.split(/###\s+/);

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const header = lines[0].trim();

    // Detect good/bad example
    const isGood = header.includes('✓') || header.includes('Good');
    const isBad = header.includes('❌') || header.includes('Bad') || header.includes('Incorrect');

    const description = header
      .replace(/^[✓❌]\s*/, '')
      .replace(/^(Good|Bad|Incorrect):\s*/i, '')
      .trim() || 'Example'; // Fallback to 'Example' if description is empty

    // Extract code blocks
    const codeMatch = section.match(/```(\w+)?\n([\s\S]*?)```/);
    if (codeMatch) {
      examples.push({
        description,
        code: codeMatch[2].trim(),
        language: codeMatch[1] || undefined,
        good: isBad ? false : isGood ? true : undefined,
      });
    }
  }

  return {
    type: 'examples',
    title,
    examples,
  };
}
