/**
 * Tests for Windsurf format parser
 */

import { describe, it, expect } from 'vitest';
import { fromWindsurf } from '../from-windsurf.js';

describe('fromWindsurf', () => {
  const basicMetadata = {
    id: 'test-windsurf',
    name: 'Test Windsurf Rules',
    version: '1.0.0',
  };

  describe('basic parsing', () => {
    it('should parse basic windsurf rules', () => {
      const content = `# Testing Rules

Write comprehensive tests for all code.

## Guidelines

- Always test edge cases
- Maintain high coverage
`;

      const result = fromWindsurf(content, basicMetadata);

      expect(result.id).toBe('test-windsurf');
      expect(result.sourceFormat).toBe('windsurf');
      expect(result.format).toBe('windsurf');
      expect(result.subtype).toBe('rule');
      expect(result.content.sections.length).toBe(1);

      const section = result.content.sections[0];
      expect(section.type).toBe('instructions');
      if (section.type === 'instructions') {
        expect(section.title).toBe('Windsurf Rules');
        expect(section.content).toBe(content.trim());
      }
    });

    it('should preserve content as-is', () => {
      const content = `# Best Practices

Follow these guidelines.
`;

      const result = fromWindsurf(content, basicMetadata);

      const section = result.content.sections[0];
      expect(section.type).toBe('instructions');
      if (section.type === 'instructions') {
        expect(section.content).toBe(content.trim());
      }
    });

    it('should set basic description', () => {
      const content = `# Testing Guide

This is a comprehensive guide for testing.

## Guidelines

- Write tests first
`;

      const result = fromWindsurf(content, basicMetadata);

      expect(result.description).toBe('Windsurf rules');
    });
  });

  describe('content preservation', () => {
    it('should preserve full markdown content', () => {
      const content = `# Main Title

## Instructions

Follow these guidelines.

## Examples

Here are some examples.
`;

      const result = fromWindsurf(content, basicMetadata);

      expect(result.content.sections.length).toBe(1);
      const section = result.content.sections[0];
      if (section.type === 'instructions') {
        expect(section.content).toContain('# Main Title');
        expect(section.content).toContain('## Instructions');
        expect(section.content).toContain('## Examples');
      }
    });

    it('should preserve bullet lists', () => {
      const content = `# Rules

## Guidelines

- Always write tests
- Use TypeScript
- Follow conventions
`;

      const result = fromWindsurf(content, basicMetadata);

      const section = result.content.sections[0];
      if (section.type === 'instructions') {
        expect(section.content).toContain('- Always write tests');
        expect(section.content).toContain('- Use TypeScript');
        expect(section.content).toContain('- Follow conventions');
      }
    });

    it('should preserve code blocks', () => {
      const content = `# Example

## Usage

\`\`\`typescript
function test() {
  return true;
}
\`\`\`
`;

      const result = fromWindsurf(content, basicMetadata);

      expect(result.content.sections.length).toBe(1);
      const section = result.content.sections[0];
      if (section.type === 'instructions') {
        expect(section.content).toContain('```typescript');
        expect(section.content).toContain('function test()');
      }
    });

    it('should create single instructions section', () => {
      const content = `# Guide

## Instructions

Follow these.

## Rules

These are mandatory.

## Examples

Here are some.
`;

      const result = fromWindsurf(content, basicMetadata);

      expect(result.content.sections.length).toBe(1);
      expect(result.content.sections[0].type).toBe('instructions');
    });
  });


  describe('metadata extraction', () => {
    it('should set sourceFormat to windsurf', () => {
      const content = `# Test

Some content.
`;

      const result = fromWindsurf(content, basicMetadata);

      expect(result.sourceFormat).toBe('windsurf');
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

      const result = fromWindsurf(content, metadata);

      expect(result.author).toBe('test-author');
      expect(result.tags).toContain('testing');
    });
  });
});
