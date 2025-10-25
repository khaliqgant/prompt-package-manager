/**
 * Cross-format conversion tests
 * Tests converting from each format to every other format
 * Ensures proper headers, structure, and format-specific requirements
 */

import { describe, it, expect } from 'vitest';
import { fromCursor } from '../from-cursor.js';
import { fromClaude } from '../from-claude.js';
import { fromContinue } from '../from-continue.js';
import { fromCopilot } from '../from-copilot.js';
import { fromKiro } from '../from-kiro.js';
import { fromWindsurf } from '../from-windsurf.js';
import { toCursor } from '../to-cursor.js';
import { toClaude } from '../to-claude.js';
import { toContinue } from '../to-continue.js';
import { toCopilot } from '../to-copilot.js';
import { toKiro } from '../to-kiro.js';
import { toWindsurf } from '../to-windsurf.js';
import type { CanonicalPackage } from '../../types/canonical.js';

const metadata = {
  id: 'test-package',
  name: 'Test Package',
  version: '1.0.0',
  author: 'test-author',
  tags: ['test'],
};

// Sample source files for each format
const sampleCursorFile = `---
name: React Best Practices
description: Guidelines for React development
tags: [react, frontend]
---

# 📦 React Best Practices

## Core Principles

- Use functional components with hooks
- Keep components small and focused
- Prop drilling should be avoided

## Rules

- **Use TypeScript**: All components must be typed
  *Rationale: Catches errors at compile time*

## Examples

\`\`\`tsx
function MyComponent({ name }: { name: string }) {
  return <div>Hello {name}</div>;
}
\`\`\`
`;

const sampleClaudeAgent = `---
name: code-reviewer
description: Reviews code for best practices
model: sonnet
tools: Read, Grep, Bash
---

# Code Reviewer

You are an expert code reviewer.

## Instructions

- Check for code smells
- Verify test coverage
- Ensure documentation exists

## Examples

Review this code:
\`\`\`typescript
function add(a, b) { return a + b }
\`\`\`
`;

const sampleContinueFile = `# TypeScript Guidelines

Follow these TypeScript best practices.

## Type Safety

- Always define explicit types
- Avoid using \`any\`
- Use strict mode

## Examples

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`
`;

const sampleCopilotRepoWide = `# API Development Guidelines

Follow REST best practices.

## Principles

- Use semantic HTTP methods
- Return appropriate status codes
- Include error messages

## Examples

\`\`\`javascript
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});
\`\`\`
`;

const sampleCopilotPathSpecific = `---
applyTo:
  - src/api/**/*.ts
---

# API Endpoint Guidelines

These rules apply only to API files.

## Requirements

- All endpoints must have error handling
- Use async/await for database calls
`;

const sampleKiroAlways = `---
inclusion: always
domain: Testing
---

# Testing Guidelines

Always write tests first.

## Principles

- Test edge cases
- Mock external dependencies
`;

const sampleKiroFileMatch = `---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Test File Guidelines

Guidelines for test files.

## Structure

- Use describe blocks
- One assertion per test
`;

const sampleWindsurfFile = `# Code Quality Rules

Maintain high code quality.

## Guidelines

- Write self-documenting code
  *Rationale: Reduces need for comments*

- Keep functions under 20 lines
  *Rationale: Easier to understand and test*

## Examples

\`\`\`typescript
// Good: Clear function name
function calculateUserAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}
\`\`\`
`;

const sampleCursorAgent = `---
name: debugger
description: Helps debug code issues
tags: [debugging, troubleshooting]
agentType: agent
---

# 🐛 Debugger Agent

You are an expert debugging assistant.

## Instructions

- Identify root causes of bugs
- Suggest fixes with explanations
- Check for common pitfalls

## Available Commands

Use these commands:
- \`analyze\` - Analyze error logs
- \`trace\` - Trace execution flow
`;

const sampleCursorCommand = `---
name: test
description: Generate unit tests for selected code
tags: [testing, tdd]
commandType: slash-command
---

# 🧪 Test Generator

Generate comprehensive unit tests.

## Instructions

- Generate tests for the selected code
- Include edge cases
- Use appropriate test framework
- Add descriptive test names

## Output Format

Return complete test file with:
- Imports
- Test suite
- Individual test cases
`;

const sampleClaudeSkill = `---
name: refactor-helper
description: Assists with code refactoring
skillType: skill
tools: Read, Edit, Grep
---

# Refactor Helper Skill

Helps refactor code while maintaining functionality.

## Guidelines

- Preserve existing behavior
- Improve code structure
- Update tests accordingly
`;

const sampleClaudeSlashCommand = `---
name: docs
description: Generate documentation for code
commandType: slash-command
---

# 📝 Documentation Generator

Generate comprehensive documentation.

## Instructions

- Extract function signatures
- Document parameters and return types
- Include usage examples
- Follow JSDoc format
`;

describe('Cross-format conversions', () => {
  describe('Cursor to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Cursor format', () => {
      canonical = fromCursor(sampleCursorFile, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('cursor');
    });

    it('should convert Cursor to Claude agent', () => {
      const result = toClaude(canonical);

      // Should have YAML frontmatter
      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name:');
      expect(result.content).toContain('description:');

      // Should have content
      expect(result.content).toContain('# 📦');
      expect(result.format).toBe('claude');
    });

    it('should convert Cursor to Continue', () => {
      const result = toContinue(canonical);

      // Should be markdown without frontmatter
      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# 📦 React Best Practices');
      expect(result.format).toBe('continue');
    });

    it('should convert Cursor to Copilot', () => {
      const result = toCopilot(canonical);

      // Repository-wide should not have frontmatter
      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# React Best Practices');
      expect(result.format).toBe('copilot');
    });

    it('should convert Cursor to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'always' } });

      // Should have Kiro frontmatter
      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('inclusion: always');
      expect(result.content).toContain('# React Best Practices');
      expect(result.format).toBe('kiro');
    });

    it('should convert Cursor to Windsurf', () => {
      const result = toWindsurf(canonical);

      // Should be markdown without frontmatter
      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# React Best Practices');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Claude to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Claude format', () => {
      canonical = fromClaude(sampleClaudeAgent, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('claude');
      expect(canonical.subtype).toBe('agent');
    });

    it('should convert Claude to Cursor', () => {
      const result = toCursor(canonical);

      // Should have MDC frontmatter
      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name:');
      expect(result.format).toBe('cursor');
    });

    it('should convert Claude to Continue', () => {
      const result = toContinue(canonical);

      // Should be markdown without frontmatter
      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# Code Reviewer');
      expect(result.format).toBe('continue');
    });

    it('should convert Claude to Copilot', () => {
      const result = toCopilot(canonical);

      // Should not have frontmatter (repo-wide)
      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# Code Reviewer');
      expect(result.format).toBe('copilot');
    });

    it('should convert Claude to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'manual' } });

      // Should have Kiro frontmatter
      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('inclusion: manual');
      expect(result.format).toBe('kiro');
    });

    it('should convert Claude to Windsurf', () => {
      const result = toWindsurf(canonical);

      // Should be markdown without frontmatter
      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# Code Reviewer');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Continue to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Continue format', () => {
      canonical = fromContinue(sampleContinueFile, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('continue');
      expect(canonical.subtype).toBe('rule');
    });

    it('should convert Continue to Cursor', () => {
      const result = toCursor(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.format).toBe('cursor');
    });

    it('should convert Continue to Claude', () => {
      const result = toClaude(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.format).toBe('claude');
    });

    it('should convert Continue to Copilot', () => {
      const result = toCopilot(canonical);

      expect(result.content).toContain('# TypeScript Guidelines');
      expect(result.format).toBe('copilot');
    });

    it('should convert Continue to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'always' } });

      expect(result.content).toContain('inclusion: always');
      expect(result.format).toBe('kiro');
    });

    it('should convert Continue to Windsurf', () => {
      const result = toWindsurf(canonical);

      expect(result.content).toContain('# TypeScript Guidelines');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Copilot to all formats', () => {
    describe('Repository-wide instructions', () => {
      let canonical: CanonicalPackage;

      it('should parse Copilot repo-wide format', () => {
        canonical = fromCopilot(sampleCopilotRepoWide, metadata);
        expect(canonical).toBeDefined();
        expect(canonical.format).toBe('copilot');
      });

      it('should convert Copilot to Cursor', () => {
        const result = toCursor(canonical);

        expect(result.content).toMatch(/^---\n/);
        expect(result.content).toContain('# 📋 API Development Guidelines');
        expect(result.format).toBe('cursor');
      });

      it('should convert Copilot to Claude', () => {
        const result = toClaude(canonical);

        expect(result.content).toMatch(/^---\n/);
        expect(result.format).toBe('claude');
      });

      it('should convert Copilot to Continue', () => {
        const result = toContinue(canonical);

        expect(result.content).not.toMatch(/^---\n/);
        expect(result.format).toBe('continue');
      });

      it('should convert Copilot to Kiro', () => {
        const result = toKiro(canonical, { kiroConfig: { inclusion: 'always' } });

        expect(result.content).toContain('inclusion: always');
        expect(result.format).toBe('kiro');
      });

      it('should convert Copilot to Windsurf', () => {
        const result = toWindsurf(canonical);

        expect(result.content).not.toMatch(/^---\n/);
        expect(result.format).toBe('windsurf');
      });
    });

    describe('Path-specific instructions', () => {
      let canonical: CanonicalPackage;

      it('should parse Copilot path-specific format', () => {
        canonical = fromCopilot(sampleCopilotPathSpecific, metadata);
        expect(canonical).toBeDefined();
        expect(canonical.metadata?.copilotConfig?.applyTo).toBe('src/api/**/*.ts');
      });

      it('should preserve path-specific config when converting to other formats', () => {
        // Convert to Cursor (doesn't support path-specific, should warn)
        const cursorResult = toCursor(canonical);
        expect(cursorResult.warnings).toBeDefined();

        // Convert back to Copilot with path-specific config
        const copilotConfig = canonical.metadata?.copilotConfig;
        const backToCopilot = toCopilot(canonical, { copilotConfig });

        expect(backToCopilot.content).toContain('applyTo:');
        expect(backToCopilot.content).toContain('src/api/**/*.ts');
      });
    });
  });

  describe('Kiro to all formats', () => {
    describe('Always inclusion mode', () => {
      let canonical: CanonicalPackage;

      it('should parse Kiro always inclusion', () => {
        canonical = fromKiro(sampleKiroAlways, metadata);
        expect(canonical).toBeDefined();
        expect(canonical.metadata?.kiroConfig?.inclusion).toBe('always');
      });

      it('should convert Kiro to Cursor', () => {
        const result = toCursor(canonical);

        expect(result.content).toMatch(/^---\n/);
        expect(result.format).toBe('cursor');
      });

      it('should convert Kiro to Claude', () => {
        const result = toClaude(canonical);

        expect(result.content).toMatch(/^---\n/);
        expect(result.format).toBe('claude');
      });

      it('should convert Kiro to Copilot', () => {
        const result = toCopilot(canonical);

        expect(result.content).toContain('# Testing Guidelines');
        expect(result.format).toBe('copilot');
      });

      it('should convert Kiro to Continue', () => {
        const result = toContinue(canonical);

        expect(result.content).not.toMatch(/^---\n/);
        expect(result.format).toBe('continue');
      });

      it('should convert Kiro to Windsurf', () => {
        const result = toWindsurf(canonical);

        expect(result.content).not.toMatch(/^---\n/);
        expect(result.format).toBe('windsurf');
      });
    });

    describe('FileMatch inclusion mode', () => {
      let canonical: CanonicalPackage;

      it('should parse Kiro fileMatch inclusion', () => {
        canonical = fromKiro(sampleKiroFileMatch, metadata);
        expect(canonical).toBeDefined();
        expect(canonical.metadata?.kiroConfig?.inclusion).toBe('fileMatch');
        expect(canonical.metadata?.kiroConfig?.fileMatchPattern).toBe('**/*.test.ts');
      });

      it('should preserve fileMatch config when converting back to Kiro', () => {
        const kiroConfig = canonical.metadata?.kiroConfig;
        const backToKiro = toKiro(canonical, { kiroConfig: kiroConfig as any });

        expect(backToKiro.content).toContain('inclusion: fileMatch');
        expect(backToKiro.content).toContain('fileMatchPattern: "**/*.test.ts"');
      });
    });
  });

  describe('Windsurf to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Windsurf format', () => {
      canonical = fromWindsurf(sampleWindsurfFile, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('windsurf');
    });

    it('should convert Windsurf to Cursor', () => {
      const result = toCursor(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.format).toBe('cursor');
    });

    it('should convert Windsurf to Claude', () => {
      const result = toClaude(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.format).toBe('claude');
    });

    it('should convert Windsurf to Copilot', () => {
      const result = toCopilot(canonical);

      expect(result.content).toContain('# Code Quality Rules');
      expect(result.format).toBe('copilot');
    });

    it('should convert Windsurf to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'manual' } });

      expect(result.content).toContain('inclusion: manual');
      expect(result.format).toBe('kiro');
    });

    it('should convert Windsurf to Continue', () => {
      const result = toContinue(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.format).toBe('continue');
    });
  });

  describe('Format validation', () => {
    it('should ensure Cursor has MDC frontmatter', () => {
      const canonical = fromContinue(sampleContinueFile, metadata);
      const result = toCursor(canonical);

      // Valid MDC frontmatter pattern
      expect(result.content).toMatch(/^---\n[\s\S]*?\n---\n/);
    });

    it('should ensure Claude has YAML frontmatter with required fields', () => {
      const canonical = fromContinue(sampleContinueFile, metadata);
      const result = toClaude(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name:');
      expect(result.content).toContain('description:');
    });

    it('should ensure Continue has no frontmatter', () => {
      const canonical = fromCursor(sampleCursorFile, metadata);
      const result = toContinue(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toMatch(/^# /);
    });

    it('should ensure Copilot repo-wide has no frontmatter', () => {
      const canonical = fromContinue(sampleContinueFile, metadata);
      const result = toCopilot(canonical);

      expect(result.content).not.toMatch(/^---\n/);
    });

    it('should ensure Copilot path-specific has applyTo frontmatter', () => {
      const canonical = fromContinue(sampleContinueFile, metadata);
      const result = toCopilot(canonical, {
        copilotConfig: { applyTo: 'src/**/*.ts' }
      });

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('applyTo:');
      expect(result.content).toContain('  - src/**/*.ts');
    });

    it('should ensure Kiro has required frontmatter fields', () => {
      const canonical = fromContinue(sampleContinueFile, metadata);
      const result = toKiro(canonical, {
        kiroConfig: { inclusion: 'fileMatch', fileMatchPattern: '**/*.ts' }
      });

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('inclusion: fileMatch');
      expect(result.content).toContain('fileMatchPattern:');
    });

    it('should ensure Windsurf has no frontmatter', () => {
      const canonical = fromCursor(sampleCursorFile, metadata);
      const result = toWindsurf(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toMatch(/^# /);
    });
  });

  describe('Content preservation across formats', () => {
    it('should preserve rules through all format conversions', () => {
      const canonical = fromCursor(sampleCursorFile, metadata);

      // Convert to each format
      const formats = [
        toClaude(canonical),
        toContinue(canonical),
        toCopilot(canonical),
        toKiro(canonical, { kiroConfig: { inclusion: 'always' } }),
        toWindsurf(canonical),
      ];

      // All formats should contain the core rule
      formats.forEach(result => {
        expect(result.content).toContain('Use TypeScript');
      });
    });

    it('should preserve code examples through all conversions', () => {
      const canonical = fromCursor(sampleCursorFile, metadata);

      const formats = [
        toClaude(canonical),
        toContinue(canonical),
        toCopilot(canonical),
        toKiro(canonical, { kiroConfig: { inclusion: 'always' } }),
        toWindsurf(canonical),
      ];

      formats.forEach(result => {
        expect(result.content).toContain('MyComponent');
        expect(result.content).toMatch(/```[\s\S]*?MyComponent[\s\S]*?```/);
      });
    });

    it('should handle rationale formatting in rule-based formats', () => {
      const canonical = fromCursor(sampleCursorFile, metadata);

      // Windsurf should preserve rationale
      const windsurf = toWindsurf(canonical);
      expect(windsurf.content).toContain('*Rationale:');

      // Other formats may convert or drop rationale
      const copilot = toCopilot(canonical);
      expect(copilot.content).toBeTruthy();
    });
  });

  describe('Cursor Agent to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Cursor agent format', () => {
      canonical = fromCursor(sampleCursorAgent, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('cursor');
      expect(canonical.subtype).toBe('agent');
    });

    it('should convert Cursor agent to Claude agent', () => {
      const result = toClaude(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name: debugger');
      expect(result.content).toContain('# 🐛');
      expect(result.format).toBe('claude');
    });

    it('should convert Cursor agent to Continue', () => {
      const result = toContinue(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# 🐛 Debugger Agent');
      expect(result.format).toBe('continue');
    });

    it('should convert Cursor agent to Copilot', () => {
      const result = toCopilot(canonical);

      expect(result.content).toContain('# Debugger Agent');
      expect(result.content).toContain('Identify root causes');
      expect(result.format).toBe('copilot');
    });

    it('should convert Cursor agent to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'manual' } });

      expect(result.content).toContain('inclusion: manual');
      expect(result.content).toContain('# Debugger Agent');
      expect(result.format).toBe('kiro');
    });

    it('should convert Cursor agent to Windsurf', () => {
      const result = toWindsurf(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# Debugger Agent');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Cursor Slash Command to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Cursor slash command format', () => {
      canonical = fromCursor(sampleCursorCommand, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('cursor');
      expect(canonical.subtype).toBe('slash-command');
    });

    it('should convert Cursor command to Claude slash command', () => {
      const result = toClaude(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name: test');
      expect(result.content).toContain('# 🧪');
      expect(result.format).toBe('claude');
    });

    it('should convert Cursor command to Continue', () => {
      const result = toContinue(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# 🧪 Test Generator');
      expect(result.format).toBe('continue');
    });

    it('should convert Cursor command to Copilot', () => {
      const result = toCopilot(canonical);

      expect(result.content).toContain('Test Generator');
      expect(result.content).toContain('Generate tests for the selected code');
      expect(result.format).toBe('copilot');
    });

    it('should convert Cursor command to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'always' } });

      expect(result.content).toContain('inclusion: always');
      expect(result.content).toContain('Test Generator');
      expect(result.format).toBe('kiro');
    });

    it('should convert Cursor command to Windsurf', () => {
      const result = toWindsurf(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# 🧪 Test Generator');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Claude Skill to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Claude skill format', () => {
      canonical = fromClaude(sampleClaudeSkill, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('claude');
      expect(canonical.subtype).toBe('skill');
    });

    it('should convert Claude skill to Cursor agent', () => {
      const result = toCursor(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name: refactor-helper');
      expect(result.format).toBe('cursor');
    });

    it('should convert Claude skill to Continue', () => {
      const result = toContinue(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('Refactor Helper Skill');
      expect(result.format).toBe('continue');
    });

    it('should convert Claude skill to Copilot', () => {
      const result = toCopilot(canonical);

      expect(result.content).toContain('Refactor Helper Skill');
      expect(result.content).toContain('Preserve existing behavior');
      expect(result.format).toBe('copilot');
    });

    it('should convert Claude skill to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'manual' } });

      expect(result.content).toContain('inclusion: manual');
      expect(result.content).toContain('Refactor Helper Skill');
      expect(result.format).toBe('kiro');
    });

    it('should convert Claude skill to Windsurf', () => {
      const result = toWindsurf(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('Refactor Helper Skill');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Claude Slash Command to all formats', () => {
    let canonical: CanonicalPackage;

    it('should parse Claude slash command format', () => {
      canonical = fromClaude(sampleClaudeSlashCommand, metadata);
      expect(canonical).toBeDefined();
      expect(canonical.format).toBe('claude');
      expect(canonical.subtype).toBe('slash-command');
    });

    it('should convert Claude command to Cursor slash command', () => {
      const result = toCursor(canonical);

      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('name: docs');
      expect(result.content).toContain('# 📝');
      expect(result.format).toBe('cursor');
    });

    it('should convert Claude command to Continue', () => {
      const result = toContinue(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('Documentation Generator');
      expect(result.format).toBe('continue');
    });

    it('should convert Claude command to Copilot', () => {
      const result = toCopilot(canonical);

      expect(result.content).toContain('Documentation Generator');
      expect(result.content).toContain('Extract function signatures');
      expect(result.format).toBe('copilot');
    });

    it('should convert Claude command to Kiro', () => {
      const result = toKiro(canonical, { kiroConfig: { inclusion: 'always' } });

      expect(result.content).toContain('inclusion: always');
      expect(result.content).toContain('Documentation Generator');
      expect(result.format).toBe('kiro');
    });

    it('should convert Claude command to Windsurf', () => {
      const result = toWindsurf(canonical);

      expect(result.content).not.toMatch(/^---\n/);
      expect(result.content).toContain('# 📝 Documentation Generator');
      expect(result.format).toBe('windsurf');
    });
  });

  describe('Subtype preservation', () => {
    it('should preserve agent subtype through conversions', () => {
      const cursorAgent = fromCursor(sampleCursorAgent, metadata);
      expect(cursorAgent.format).toBe('cursor');
      expect(cursorAgent.subtype).toBe('agent');

      // Convert to Claude and back
      const claudeResult = toClaude(cursorAgent);
      const backToCanonical = fromClaude(claudeResult.content, metadata);
      expect(backToCanonical.format).toBe('claude');
      expect(backToCanonical.subtype).toBe('agent');
    });

    it('should preserve slash command subtype through conversions', () => {
      const cursorCommand = fromCursor(sampleCursorCommand, metadata);
      expect(cursorCommand.format).toBe('cursor');
      expect(cursorCommand.subtype).toBe('slash-command');

      // Convert to Claude and back
      const claudeResult = toClaude(cursorCommand);
      const backToCanonical = fromClaude(claudeResult.content, metadata);
      expect(backToCanonical.format).toBe('claude');
      expect(backToCanonical.subtype).toBe('slash-command');
    });

    it('should preserve skill subtype through conversions', () => {
      const claudeSkill = fromClaude(sampleClaudeSkill, metadata);
      expect(claudeSkill.format).toBe('claude');
      expect(claudeSkill.subtype).toBe('skill');

      // Convert to Cursor and back
      const cursorResult = toCursor(claudeSkill);
      const backToCanonical = fromCursor(cursorResult.content, metadata);
      expect(backToCanonical.format).toBe('cursor');
      // Cursor should preserve the skill subtype
      expect(backToCanonical.subtype).toBe('skill');
    });

    it('should detect agentType in frontmatter', () => {
      const cursorAgent = fromCursor(sampleCursorAgent, metadata);

      // Should be parsed as agent based on agentType field
      expect(cursorAgent.format).toBe('cursor');
      expect(cursorAgent.subtype).toBe('agent');
    });

    it('should detect commandType in frontmatter', () => {
      const cursorCommand = fromCursor(sampleCursorCommand, metadata);

      // Should be parsed as slash-command based on commandType field
      expect(cursorCommand.format).toBe('cursor');
      expect(cursorCommand.subtype).toBe('slash-command');
    });

    it('should detect skillType in Claude frontmatter', () => {
      const claudeSkill = fromClaude(sampleClaudeSkill, metadata);

      // Should be parsed as skill based on skillType field
      expect(claudeSkill.format).toBe('claude');
      expect(claudeSkill.subtype).toBe('skill');
    });
  });
});
