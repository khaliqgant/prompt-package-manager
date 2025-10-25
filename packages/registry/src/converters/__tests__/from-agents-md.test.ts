/**
 * Tests for agents.md format parser
 */

import { describe, it, expect } from 'vitest';
import { fromAgentsMd } from '../from-agents-md.js';

describe('fromAgentsMd', () => {
  const basicMetadata = {
    id: 'test-agents-md',
    name: 'agents.md',
    version: '1.0.0',
  };

  describe('basic parsing', () => {
    it('should parse instruction without frontmatter', () => {
      const content = `# Project Coding Guidelines

This project follows TypeScript best practices.

## Guidelines

- Use strict TypeScript
- Write comprehensive tests
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.id).toBe('test-agents-md');
      expect(result.sourceFormat).toBe('agents.md');
      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should extract description from first paragraph', () => {
      const content = `# TypeScript Project

This project uses TypeScript with strict mode enabled for type safety.

## Coding Standards

- Follow conventions
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.description).toContain('TypeScript with strict mode');
    });

    it('should handle content without description', () => {
      const content = `# Project

## Rules

- Rule 1
- Rule 2
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.description).toBeDefined();
    });
  });

  describe('frontmatter parsing', () => {
    it('should parse frontmatter with project field', () => {
      const content = `---
project: MyProject
---

# Project Guidelines

Follow these coding standards.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.metadata?.agentsMdConfig?.project).toBe('MyProject');
    });

    it('should parse frontmatter with scope field', () => {
      const content = `---
scope: testing
---

# Testing Guidelines

Write comprehensive tests.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.metadata?.agentsMdConfig?.scope).toBe('testing');
    });

    it('should parse frontmatter with both project and scope', () => {
      const content = `---
project: MyProject
scope: api
---

# API Guidelines

REST API conventions.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.metadata?.agentsMdConfig?.project).toBe('MyProject');
      expect(result.metadata?.agentsMdConfig?.scope).toBe('api');
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---

# Guidelines

Some content.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.metadata?.agentsMdConfig?.project).toBeUndefined();
      expect(result.metadata?.agentsMdConfig?.scope).toBeUndefined();
    });

    it('should handle frontmatter with extra fields', () => {
      const content = `---
project: MyProject
author: Developer
version: 1.0
---

# Guidelines

Content here.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.metadata?.agentsMdConfig?.project).toBe('MyProject');
    });

    it('should handle malformed YAML gracefully', () => {
      const content = `---
project: MyProject
  bad indentation: value
---

# Guidelines

Content.
`;

      const result = fromAgentsMd(content, basicMetadata);

      // Should still parse, logging a warning
      expect(result).toBeDefined();
    });

    it('should work without frontmatter', () => {
      const content = `# Guidelines

No frontmatter here.

## Rules

- Rule 1
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.sourceFormat).toBe('agents.md');
      expect(result.metadata?.agentsMdConfig?.project).toBeUndefined();
    });
  });

  describe('section parsing', () => {
    it('should parse headers as section titles', () => {
      const content = `# Main Title

## Coding Standards

Follow these standards.

## Testing Guidelines

Write tests for all code.
`;

      const result = fromAgentsMd(content, basicMetadata);

      const sections = result.content.sections;
      expect(sections.some(s => 'title' in s && s.title === 'Coding Standards')).toBe(true);
      expect(sections.some(s => 'title' in s && s.title === 'Testing Guidelines')).toBe(true);
    });

    it('should parse lists as rules', () => {
      const content = `# Rules

## Conventions

- Always use TypeScript
- Write unit tests
- Follow naming conventions
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should parse code blocks', () => {
      const content = `# Example

## Usage

\`\`\`typescript
function example() {
  return true;
}
\`\`\`
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should parse code blocks with descriptions', () => {
      const content = `# Examples

## Good Practices

### ✅ Preferred: Use async/await

\`\`\`typescript
async function getData() {
  return await fetch('/api');
}
\`\`\`

### ❌ Avoid: Callback hell

\`\`\`typescript
getData(function(data) {
  process(data, function(result) {
    // nested callbacks
  });
});
\`\`\`
`;

      const result = fromAgentsMd(content, basicMetadata);

      const examplesSections = result.content.sections.filter(s => s.type === 'examples');
      expect(examplesSections.length).toBeGreaterThan(0);
    });

    it('should handle code blocks without descriptions', () => {
      const content = `# Example

\`\`\`typescript
const x = 1;
\`\`\`
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });

    it('should parse numbered lists', () => {
      const content = `# Steps

## Process

1. First step
2. Second step
3. Third step
`;

      const result = fromAgentsMd(content, basicMetadata);

      const rulesSections = result.content.sections.filter(s => s.type === 'rules');
      expect(rulesSections.length).toBeGreaterThan(0);
    });

    it('should parse sub-bullets with rationale', () => {
      const content = `# Rules

## Guidelines

- Use TypeScript
   - Rationale: Type safety prevents runtime errors
- Write tests
   - Why: Tests ensure code quality
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.content.sections.length).toBeGreaterThan(0);
    });
  });

  describe('section type inference', () => {
    it('should infer examples section from title', () => {
      const content = `# Guide

## Examples

Here are some examples.
`;

      const result = fromAgentsMd(content, basicMetadata);

      const examplesSections = result.content.sections.filter(s => s.type === 'examples');
      expect(examplesSections.length).toBeGreaterThan(0);
    });

    it('should infer rules section from title', () => {
      const content = `# Guide

## Rules

- Rule 1
- Rule 2
`;

      const result = fromAgentsMd(content, basicMetadata);

      const rulesSections = result.content.sections.filter(s => s.type === 'rules');
      expect(rulesSections.length).toBeGreaterThan(0);
    });

    it('should infer context section from title', () => {
      const content = `# Guide

## Background

This project was created to solve X.
`;

      const result = fromAgentsMd(content, basicMetadata);

      const contextSections = result.content.sections.filter(s => s.type === 'context');
      expect(contextSections.length).toBeGreaterThan(0);
    });

    it('should infer section type from content', () => {
      const content = `# Guide

## Coding Conventions

- Convention 1
- Convention 2
`;

      const result = fromAgentsMd(content, basicMetadata);

      const rulesSections = result.content.sections.filter(s => s.type === 'rules');
      expect(rulesSections.length).toBeGreaterThan(0);
    });

    it('should default to instructions for unknown sections', () => {
      const content = `# Guide

## Miscellaneous

Some general information.
`;

      const result = fromAgentsMd(content, basicMetadata);

      const instructionsSections = result.content.sections.filter(s => s.type === 'instructions');
      expect(instructionsSections.length).toBeGreaterThan(0);
    });
  });

  describe('metadata extraction', () => {
    it('should set sourceFormat to agents.md', () => {
      const content = `# Test

Some content.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.sourceFormat).toBe('agents.md');
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

      const result = fromAgentsMd(content, metadata);

      expect(result.author).toBe('test-author');
      expect(result.tags).toContain('testing');
    });

    it('should include agents.md tag by default', () => {
      const content = `# Test

Content.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.tags).toContain('agents.md');
    });
  });

  describe('tag inference', () => {
    it('should infer TypeScript tag from content', () => {
      const content = `# TypeScript Project

Use TypeScript for all code.

## Guidelines

- Follow TypeScript conventions
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.tags).toContain('typescript');
    });

    it('should infer testing tag from content', () => {
      const content = `# Testing Guide

Write comprehensive tests using Jest.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.tags).toContain('testing');
    });

    it('should infer Codex tag from content', () => {
      const content = `# Codex Instructions

These instructions are for OpenAI Codex.
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.tags).toContain('codex');
    });

    it('should limit inferred tags', () => {
      const content = `# Multi-Tech Project

This project uses TypeScript, JavaScript, Python, React, testing, API, backend, frontend, database, and security.
`;

      const result = fromAgentsMd(content, basicMetadata);

      // Should include agents.md + up to 5 inferred tags
      expect(result.tags.length).toBeLessThanOrEqual(6);
    });
  });

  describe('real-world examples', () => {
    it('should parse OpenAI Codex-style agents.md', () => {
      const content = `# Project Coding Guidelines

## TypeScript Conventions

- Use strict mode
- Prefer interfaces over types for object shapes
- Use const assertions where appropriate

## Testing Requirements

- Write tests for all public APIs
- Use Jest for unit tests
- Maintain >80% coverage

## Code Examples

### Preferred: Async/Await

\`\`\`typescript
async function fetchData() {
  const response = await fetch('/api');
  return response.json();
}
\`\`\`
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.sourceFormat).toBe('agents.md');
      expect(result.content.sections.length).toBeGreaterThan(0);
      expect(result.tags).toContain('agents.md');
      expect(result.tags).toContain('typescript');
    });

    it('should parse project-specific instructions', () => {
      const content = `---
project: MyApp
scope: api
---

# API Development Guidelines

Follow REST conventions when building APIs.

## Endpoint Naming

- Use plural nouns for resources
- Use kebab-case for multi-word resources
- Version APIs with /v1, /v2 prefixes

## Error Handling

All errors should return consistent JSON:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
\`\`\`
`;

      const result = fromAgentsMd(content, basicMetadata);

      expect(result.metadata?.agentsMdConfig?.project).toBe('MyApp');
      expect(result.metadata?.agentsMdConfig?.scope).toBe('api');
      expect(result.tags).toContain('api');
    });
  });
});
