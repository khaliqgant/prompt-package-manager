/**
 * Tests for GitHub Copilot format parser
 */

import { describe, it, expect } from 'vitest';
import { fromCopilot } from '../from-copilot.js';

describe('fromCopilot', () => {
  const basicMetadata = {
    id: 'test-copilot',
    name: 'Test Copilot Instruction',
    version: '1.0.0',
  };

  describe('repository-wide instructions', () => {
    it('should parse basic instruction without frontmatter', () => {
      const content = `# Testing Instructions

Write comprehensive tests for all code.

## Guidelines

- Always test edge cases
- Maintain high coverage
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.id).toBe('test-copilot');
      expect(result.sourceFormat).toBe('copilot');
      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should extract description from first paragraph', () => {
      const content = `# Testing Guide

This is a comprehensive guide for testing.

## Guidelines

- Write tests first
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.description).toBe('This is a comprehensive guide for testing.');
    });
  });

  describe('path-specific instructions', () => {
    it('should parse frontmatter with applyTo', () => {
      const content = `---
applyTo:
  - src/**/*.ts
  - test/**/*.ts
---

# TypeScript Testing

Apply these rules to TypeScript files.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toContain('src/**/*.ts');
      expect(result.metadata?.copilotConfig?.applyTo).toContain('test/**/*.ts');
    });

    it('should handle single applyTo pattern', () => {
      const content = `---
applyTo:
  - src/**/*.ts
---

# TypeScript Rules

Rules for TypeScript.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toContain('src/**/*.ts');
    });

    it('should parse applyTo with complex glob patterns', () => {
      const content = `---
applyTo:
  - "**/*.{ts,tsx,js,jsx}"
  - "src/**/[A-Z]*.ts"
  - "!**/*.test.ts"
---

# Complex Patterns

Rules with complex glob patterns.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toContain('**/*.{ts,tsx,js,jsx}');
      expect(result.metadata?.copilotConfig?.applyTo).toContain('src/**/[A-Z]*.ts');
      expect(result.metadata?.copilotConfig?.applyTo).toContain('!**/*.test.ts');
    });

    it('should parse single string applyTo pattern', () => {
      const content = `---
applyTo: "src/**/*.ts"
---

# Single Pattern

Rules for a single pattern.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toBe('src/**/*.ts');
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---

# No Config

Rules without config.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toBeUndefined();
    });

    it('should handle frontmatter with comments', () => {
      const content = `---
# This is a comment
applyTo:
  - src/**/*.ts
  # Another comment
  - test/**/*.ts
---

# With Comments

Rules with YAML comments.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toContain('src/**/*.ts');
      expect(result.metadata?.copilotConfig?.applyTo).toContain('test/**/*.ts');
    });

    it('should handle Unicode characters in patterns', () => {
      const content = `---
applyTo:
  - "docs/日本語/**/*.md"
  - "tests/tëst/**/*.js"
---

# Unicode Patterns

Rules with Unicode paths.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toContain('docs/日本語/**/*.md');
      expect(result.metadata?.copilotConfig?.applyTo).toContain('tests/tëst/**/*.js');
    });

    it('should ignore invalid applyTo types', () => {
      const content = `---
applyTo: 123
---

# Invalid Type

Rules with invalid applyTo.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.metadata?.copilotConfig?.applyTo).toBeUndefined();
    });
  });

  describe('section parsing', () => {
    it('should parse headers as section titles', () => {
      const content = `# Main Title

## Instructions

Follow these guidelines.

## Examples

Here are some examples.
`;

      const result = fromCopilot(content, basicMetadata);

      const sections = result.content.sections;
      expect(sections.some(s => 'title' in s && s.title === 'Instructions')).toBe(true);
      expect(sections.some(s => 'title' in s && s.title === 'Examples')).toBe(true);
    });

    it('should parse lists as rules', () => {
      const content = `# Rules

- Always write tests
- Use TypeScript
- Follow conventions
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should parse code blocks', () => {
      const content = `# Example

\`\`\`typescript
function test() {
  return true;
}
\`\`\`
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });
  });

  describe('metadata extraction', () => {
    it('should set sourceFormat to copilot', () => {
      const content = `# Test

Some content.
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.sourceFormat).toBe('copilot');
    });

    it('should preserve provided metadata', () => {
      const content = `# Test

Content here.
`;

      const metadata = {
        ...basicMetadata,
        author: 'test-author',
        tags: ['testing', 'typescript'],
      };

      const result = fromCopilot(content, metadata);

      expect(result.author).toBe('test-author');
      expect(result.tags).toContain('testing');
    });
  });

  describe('quality inference', () => {
    it('should infer tags from content', () => {
      const content = `# TypeScript Testing Guide

Guidelines for testing TypeScript applications.

## Rules

- Write unit tests
- Use Jest
`;

      const result = fromCopilot(content, basicMetadata);

      expect(result.tags).toBeDefined();
    });
  });
});
