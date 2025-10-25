/**
 * Tests for Kiro format parser
 */

import { describe, it, expect } from 'vitest';
import { fromKiro } from '../from-kiro.js';

describe('fromKiro', () => {
  const basicMetadata = {
    id: 'test-kiro',
    name: 'testing.md',
    version: '1.0.0',
  };

  describe('frontmatter validation', () => {
    it('should require frontmatter with inclusion field', () => {
      const content = `# Testing Rules

No frontmatter here.
`;

      expect(() => {
        fromKiro(content, basicMetadata);
      }).toThrow('Kiro steering files require inclusion field in frontmatter');
    });

    it('should parse frontmatter with always inclusion', () => {
      const content = `---
inclusion: always
---

# Testing Rules

Always apply these rules.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('always');
    });

    it('should parse frontmatter with manual inclusion', () => {
      const content = `---
inclusion: manual
---

# Manual Rules

Apply these manually.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('manual');
    });

    it('should parse frontmatter with fileMatch inclusion', () => {
      const content = `---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Test File Rules

Rules for test files.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('fileMatch');
      expect(result.metadata?.kiroConfig?.fileMatchPattern).toBe('**/*.test.ts');
    });

    it('should require fileMatchPattern for fileMatch mode', () => {
      const content = `---
inclusion: fileMatch
---

# Rules

Missing pattern.
`;

      expect(() => {
        fromKiro(content, basicMetadata);
      }).toThrow('fileMatch inclusion mode requires fileMatchPattern');
    });

    it('should parse fileMatchPattern without quotes', () => {
      const content = `---
inclusion: fileMatch
fileMatchPattern: src/**/*.ts
---

# Unquoted Pattern

Pattern without quotes.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.fileMatchPattern).toBe('src/**/*.ts');
    });

    it('should parse complex fileMatchPattern with special characters', () => {
      const content = `---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx,js,jsx}"
---

# Complex Pattern

Complex glob pattern.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.fileMatchPattern).toBe('**/*.{ts,tsx,js,jsx}');
    });

    it('should handle frontmatter with comments', () => {
      const content = `---
# This is a comment
inclusion: always
# Another comment
---

# With Comments

Rules with YAML comments.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('always');
    });

    it('should handle frontmatter with extra fields', () => {
      const content = `---
inclusion: manual
customField: value
anotherField: 123
---

# Extra Fields

Rules with extra fields.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('manual');
    });

    it('should throw error for missing frontmatter', () => {
      const content = `# Rules

No frontmatter.
`;

      expect(() => {
        fromKiro(content, basicMetadata);
      }).toThrow('Kiro steering files require YAML frontmatter');
    });

    it('should throw error for invalid inclusion value', () => {
      const content = `---
inclusion: invalid
---

# Invalid Inclusion

Invalid inclusion mode.
`;

      expect(() => {
        fromKiro(content, basicMetadata);
      }).toThrow('Kiro steering files require inclusion field');
    });

    it('should throw error for malformed YAML', () => {
      const content = `---
inclusion: always
  bad indentation: value
---

# Malformed

Malformed YAML.
`;

      expect(() => {
        fromKiro(content, basicMetadata);
      }).toThrow();
    });

    it('should handle Unicode characters in fileMatchPattern', () => {
      const content = `---
inclusion: fileMatch
fileMatchPattern: "docs/日本語/**/*.md"
---

# Unicode Pattern

Pattern with Unicode.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.fileMatchPattern).toBe('docs/日本語/**/*.md');
    });

    it('should handle boolean and numeric values in frontmatter', () => {
      const content = `---
inclusion: manual
enabled: true
priority: 100
---

# Mixed Types

Various YAML types.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('manual');
    });

    it('should handle null values in frontmatter', () => {
      const content = `---
inclusion: manual
optional: null
---

# Null Values

Frontmatter with null.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.inclusion).toBe('manual');
    });
  });

  describe('domain extraction', () => {
    it('should extract domain from frontmatter', () => {
      const content = `---
inclusion: manual
domain: testing
---

# Testing Domain

Rules for testing domain.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.metadata?.kiroConfig?.domain).toBe('testing');
    });

    it('should infer domain from filename', () => {
      const content = `---
inclusion: manual
---

# Rules

Content here.
`;

      const metadata = {
        ...basicMetadata,
        name: 'security.md',
      };

      const result = fromKiro(content, metadata);

      expect(result.metadata?.kiroConfig?.domain).toBe('security');
    });
  });

  describe('section parsing', () => {
    it('should parse headers as section titles', () => {
      const content = `---
inclusion: manual
---

# Main Title

## Guidelines

Follow these guidelines.

## Examples

Here are examples.
`;

      const result = fromKiro(content, basicMetadata);

      const sections = result.content.sections;
      expect(sections.some(s => 'title' in s && s.title === 'Guidelines')).toBe(true);
      expect(sections.some(s => 'title' in s && s.title === 'Examples')).toBe(true);
    });

    it('should parse lists as rules', () => {
      const content = `---
inclusion: manual
---

# Rules

- Always write tests
- Use TypeScript
- Follow conventions
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should parse code blocks', () => {
      const content = `---
inclusion: manual
---

# Example

\`\`\`typescript
function test() {
  return true;
}
\`\`\`
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });
  });

  describe('metadata extraction', () => {
    it('should set sourceFormat to kiro', () => {
      const content = `---
inclusion: manual
---

# Test

Some content.
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.sourceFormat).toBe('kiro');
    });

    it('should preserve provided metadata', () => {
      const content = `---
inclusion: manual
---

# Test

Content here.
`;

      const metadata = {
        ...basicMetadata,
        author: 'test-author',
        tags: ['testing', 'typescript'],
      };

      const result = fromKiro(content, metadata);

      expect(result.author).toBe('test-author');
      expect(result.tags).toContain('testing');
    });

    it('should infer tags from inclusion mode', () => {
      const alwaysContent = `---
inclusion: always
---

# Always Active

Always active rules.
`;

      const result = fromKiro(alwaysContent, basicMetadata);

      expect(result.tags).toContain('always-active');
    });
  });

  describe('quality inference', () => {
    it('should infer tags from content and domain', () => {
      const content = `---
inclusion: manual
domain: testing
---

# TypeScript Testing Guide

Guidelines for testing TypeScript applications.

## Rules

- Write unit tests
- Use Jest
`;

      const result = fromKiro(content, basicMetadata);

      expect(result.tags).toBeDefined();
      expect(result.tags?.length).toBeGreaterThan(0);
    });
  });
});
