/**
 * Windsurf Rules Converter
 * Converts canonical package format to Windsurf .windsurfrules format
 *
 * Windsurf uses a simple markdown format similar to Cursor but without MDC headers.
 * File location: .windsurfrules (root of project)
 */

import type { CanonicalPackage, ConversionResult } from '../types/canonical.js';

/**
 * Convert canonical package to Windsurf format
 */
export function toWindsurf(pkg: CanonicalPackage): ConversionResult {
  const lines: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  // Add title (without icon for Windsurf)
  const title = pkg.metadata?.title || pkg.name;
  lines.push(`# ${title}`);
  lines.push('');

  // Add description if available
  if (pkg.description || pkg.metadata?.description) {
    lines.push(pkg.description || pkg.metadata?.description || '');
    lines.push('');
  } else {
    qualityScore -= 10;
    warnings.push('No description provided');
  }

  // Convert sections
  for (const section of pkg.content.sections) {
    // Skip metadata section
    if (section.type === 'metadata') {
      continue;
    }

    // Add section title (if section type supports it)
    if ('title' in section && section.title) {
      lines.push(`## ${section.title}`);
      lines.push('');
    }

    // Convert based on section type
    switch (section.type) {
      case 'persona': {
        // Convert persona to Role section
        if (section.data.name) {
          const icon = section.data.icon || '🤖';
          const role = section.data.role || 'Assistant';
          lines.push(`${icon} **${section.data.name}** - ${role}`);
          lines.push('');
        } else if (section.data.role) {
          lines.push(`**Role:** ${section.data.role}`);
          lines.push('');
        }

        if (section.data.style && section.data.style.length > 0) {
          lines.push(`**Style:** ${section.data.style.join(', ')}`);
          lines.push('');
        }

        if (section.data.expertise && section.data.expertise.length > 0) {
          lines.push('**Expertise:**');
          for (const exp of section.data.expertise) {
            lines.push(`- ${exp}`);
          }
          lines.push('');
        }
        break;
      }

      case 'instructions': {
        // Convert instructions
        if (section.content) {
          lines.push(section.content);
          lines.push('');
        }
        break;
      }

      case 'context': {
        // Convert context section
        if (section.content) {
          lines.push(section.content);
          lines.push('');
        }
        break;
      }

      case 'rules': {
        // Convert rules to numbered or bulleted list
        if (section.items && section.items.length > 0) {
          for (let i = 0; i < section.items.length; i++) {
            const rule = section.items[i];
            const prefix = section.ordered ? `${i + 1}.` : '-';

            lines.push(`${prefix} ${rule.content}`);

            // Add rationale if present
            if (rule.rationale) {
              lines.push(`   - *Rationale: ${rule.rationale}*`);
            }

            // Add examples if present
            if (rule.examples && rule.examples.length > 0) {
              for (const example of rule.examples) {
                lines.push(`   - Example: ${example}`);
              }
            }
          }
          lines.push('');
        }
        break;
      }

      case 'examples': {
        // Convert examples
        if (section.examples && section.examples.length > 0) {
          for (const example of section.examples) {
            if (example.description) {
              lines.push(example.description);
              lines.push('');
            }

            if (example.code) {
              const language = example.language || '';
              lines.push(`\`\`\`${language}`);
              lines.push(example.code);
              lines.push('```');
              lines.push('');
            }
          }
        }
        break;
      }

      case 'tools': {
        // Convert tools configuration
        warnings.push('Tools configuration may not be supported by Windsurf');

        if (section.tools && section.tools.length > 0) {
          lines.push('**Available Tools:**');
          lines.push('');
          for (const tool of section.tools) {
            lines.push(`- ${tool}`);
          }
          if (section.description) {
            lines.push('');
            lines.push(section.description);
          }
          lines.push('');
        }
        break;
      }

      case 'custom': {
        // Custom section - just add content
        if (section.content) {
          lines.push(section.content);
          lines.push('');
        }
        break;
      }

      default: {
        // Unknown section type - skip
        warnings.push(`Unknown section type: ${(section as any).type}`);
        break;
      }
    }
  }

  // Calculate quality score based on content
  const hasPersona = pkg.content.sections.some(s => s.type === 'persona');
  const hasInstructions = pkg.content.sections.some(s => s.type === 'instructions');
  const hasExamples = pkg.content.sections.some(s => s.type === 'examples');

  if (!hasInstructions) {
    qualityScore -= 20;
    warnings.push('No instructions section found');
  }

  if (!hasPersona) {
    qualityScore -= 5;
  }

  if (!hasExamples) {
    qualityScore -= 10;
  }

  const content = lines.join('\n').trim() + '\n';

  return {
    format: 'windsurf',
    content,
    qualityScore: Math.max(0, qualityScore),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if content is in Windsurf format
 */
export function isWindsurfFormat(content: string): boolean {
  // Windsurf files are simple markdown
  // They should have markdown headers and not have MDC frontmatter
  const hasMDCHeader = /^---\s*\n[\s\S]*?\n---/.test(content);
  const hasMarkdownHeaders = /^#{1,6}\s+.+$/m.test(content);

  return hasMarkdownHeaders && !hasMDCHeader;
}
