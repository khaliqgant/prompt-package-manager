/**
 * Test setup and fixtures for converter tests
 */

import type { CanonicalPackage } from '../../types/canonical.js';

/**
 * Sample canonical package for testing
 */
export const sampleCanonicalPackage: CanonicalPackage = {
  id: 'test-package',
  version: '1.0.0',
  name: 'Test Package',
  description: 'A test package for conversion',
  author: 'testauthor',
  tags: ['test', 'example'],
  format: 'claude',
  subtype: 'agent',
  content: {
    format: 'canonical',
    version: '1.0',
    sections: [
      {
        type: 'metadata',
        data: {
          title: 'Test Agent',
          description: 'A test agent for conversion testing',
          icon: '🧪',
          version: '1.0.0',
          author: 'testauthor',
        },
      },
      {
        type: 'persona',
        data: {
          name: 'TestBot',
          role: 'Testing Assistant',
          icon: '🤖',
          style: ['precise', 'thorough', 'helpful'],
          expertise: ['unit testing', 'integration testing', 'test automation'],
        },
      },
      {
        type: 'instructions',
        title: 'Core Principles',
        content: 'Always write comprehensive tests. Test edge cases. Maintain high code coverage.',
        priority: 'high',
      },
      {
        type: 'rules',
        title: 'Testing Guidelines',
        items: [
          {
            content: 'Write tests before code (TDD)',
            rationale: 'Ensures better design and prevents bugs',
            examples: ['test("should work", () => expect(fn()).toBe(true))'],
          },
          {
            content: 'Test edge cases thoroughly',
          },
          {
            content: 'Maintain 100% code coverage',
            rationale: 'Ensures all code paths are tested',
          },
        ],
        ordered: true,
      },
      {
        type: 'examples',
        title: 'Code Examples',
        examples: [
          {
            description: 'Good test structure',
            code: 'describe("feature", () => {\n  it("should work", () => {\n    expect(true).toBe(true);\n  });\n});',
            language: 'typescript',
            good: true,
          },
          {
            description: 'Missing assertions',
            code: 'test("something", () => {\n  doSomething();\n});',
            language: 'typescript',
            good: false,
          },
        ],
      },
      {
        type: 'tools',
        tools: ['Read', 'Write', 'Bash', 'WebSearch'],
        description: 'Available tools for testing',
      },
      {
        type: 'context',
        title: 'Background',
        content: 'This agent was created to assist with testing tasks and ensure quality.',
      },
    ],
  },
};

/**
 * Minimal canonical package
 */
export const minimalCanonicalPackage: CanonicalPackage = {
  id: 'minimal-package',
  version: '1.0.0',
  name: 'Minimal Package',
  description: 'A minimal test package',
  author: 'testauthor',
  tags: [],
  format: 'cursor',
  subtype: 'rule',
  content: {
    format: 'canonical',
    version: '1.0',
    sections: [
      {
        type: 'metadata',
        data: {
          title: 'Minimal Rule',
          description: 'A minimal rule',
        },
      },
      {
        type: 'instructions',
        title: 'Instructions',
        content: 'Follow these instructions.',
      },
    ],
  },
};

/**
 * Sample Claude agent (raw format)
 */
export const sampleClaudeAgent = `---
name: analyst
description: Strategic analyst specializing in market research, brainstorming, competitive analysis, and project briefing.
tools: Read, Write, Edit, Grep, Glob, WebFetch, WebSearch
icon: 📊
---

# Mary - Business Analyst

You are Mary, a strategic business analyst with expertise in market research, brainstorming, and competitive analysis. Your communication style is analytical, inquisitive, and creative.

Your areas of expertise include:
- Market research and analysis
- Competitive intelligence
- Strategic planning
- Data-driven decision making

## Core Principles

**IMPORTANT:**

Always ground findings in verifiable data and credible sources.

- **Curiosity-Driven Inquiry**: Ask probing "why" questions to uncover underlying truths
- **Objective & Evidence-Based Analysis**: Ground findings in verifiable data
- **Strategic Contextualization**: Frame all work within broader strategic context

## Available Commands

### help
Show numbered list of available commands for selection

### research [topic]
Create deep research prompts for analysis

## Examples

### ✓ Good research approach
\`\`\`markdown
1. Define research questions
2. Gather data from multiple sources
3. Analyze and synthesize findings
\`\`\`

### ❌ Incorrect: Skipping validation
\`\`\`markdown
1. Make assumptions
2. Skip fact-checking
\`\`\`

## Background

This agent was created to help with strategic business analysis tasks.
`;

/**
 * Sample Cursor rules (raw format)
 */
export const sampleCursorRules = `# 🧪 Test-Driven Development

A comprehensive guide for TDD best practices.

## Core Principles

- Write tests before code
- Keep tests simple and focused
- Test edge cases thoroughly

## Testing Guidelines

1. Write tests before code (TDD)
   - *Rationale: Ensures better design and prevents bugs*
   - Example: \`test("should work", () => expect(fn()).toBe(true))\`
2. Test edge cases thoroughly
3. Maintain 100% code coverage
   - *Ensures all code paths are tested*

## Code Examples

### ✅ Good: Good test structure

\`\`\`typescript
describe("feature", () => {
  it("should work", () => {
    expect(true).toBe(true);
  });
});
\`\`\`

### ❌ Bad: Missing assertions

\`\`\`typescript
test("something", () => {
  doSomething();
});
\`\`\`

## Role

🤖 **TestBot** - Testing Assistant

**Style:** precise, thorough, helpful

**Expertise:**
- unit testing
- integration testing
- test automation
`;

/**
 * Helper to normalize whitespace for comparison
 */
export function normalizeWhitespace(str: string): string {
  return str
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '');
}

/**
 * Helper to compare markdown content
 */
export function compareMarkdown(actual: string, expected: string): boolean {
  return normalizeWhitespace(actual) === normalizeWhitespace(expected);
}
