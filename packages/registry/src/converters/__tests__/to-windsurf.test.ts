/**
 * Tests for Windsurf format converter
 */

import { describe, it, expect } from 'vitest';
import { toWindsurf, isWindsurfFormat } from '../to-windsurf.js';
import {
  sampleCanonicalPackage,
  minimalCanonicalPackage,
} from './setup.js';

describe('toWindsurf', () => {
  describe('basic conversion', () => {
    it('should convert canonical to windsurf format', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.format).toBe('windsurf');
      expect(result.content).toBeTruthy();
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should include title and description', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.content).toContain('# Test Agent');
      expect(result.content).toContain('A test agent for conversion testing');
    });

    it('should handle minimal package', () => {
      const result = toWindsurf(minimalCanonicalPackage);

      expect(result.content).toContain('# Minimal Rule');
      expect(result.qualityScore).toBe(100);
    });

    it('should not include MDC headers or frontmatter', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.content).not.toContain('---');
      expect(result.content).not.toMatch(/^---\n/);
    });
  });

  describe('section conversion', () => {
    it('should convert persona section', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.content).toContain('🤖 **TestBot** - Testing Assistant');
      expect(result.content).toContain('**Style:** precise, thorough, helpful');
      expect(result.content).toContain('**Expertise:**');
      expect(result.content).toContain('- unit testing');
    });

    it('should convert instructions section', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.content).toContain('## Core Principles');
      expect(result.content).toContain('Always write comprehensive tests');
    });

    it('should convert rules section', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.content).toContain('## Testing Guidelines');
      expect(result.content).toContain('- Write tests before code (TDD)');
      expect(result.content).toContain('*Rationale: Ensures better design and prevents bugs*');
    });

    it('should convert examples section', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.content).toContain('## Examples');
      expect(result.content).toMatch(/```.*test\("should work"/s);
    });

    it('should handle tools section with warning', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Tools configuration may not be supported by Windsurf');
    });
  });

  describe('quality scoring', () => {
    it('should give perfect score for complete package', () => {
      const result = toWindsurf(sampleCanonicalPackage);

      expect(result.qualityScore).toBe(100);
    });

    it('should reduce score for missing description', () => {
      const pkgWithoutDesc = {
        ...sampleCanonicalPackage,
        description: "Test description",
        metadata: {
          ...sampleCanonicalPackage.metadata,
          description: "Test description",
        },
      };

      const result = toWindsurf(pkgWithoutDesc);

      expect(result.qualityScore).toBeLessThan(100);
    });

    it('should reduce score for missing instructions', () => {
      const pkgWithoutInstructions = {
        ...sampleCanonicalPackage,
        content: {
          format: 'canonical' as const,
          version: '1.0' as const,
          sections: sampleCanonicalPackage.content.sections.filter(
            s => s.type !== 'instructions'
          ),
        },
      };

      const result = toWindsurf(pkgWithoutInstructions);

      expect(result.qualityScore).toBeLessThan(100);
      expect(result.warnings).toContain('No instructions section found');
    });
  });
});

describe('isWindsurfFormat', () => {
  it('should identify windsurf format (markdown without frontmatter)', () => {
    const windsurfContent = `# Test Rules

Some instructions here.

## Guidelines

- Rule 1
- Rule 2
`;

    expect(isWindsurfFormat(windsurfContent)).toBe(true);
  });

  it('should reject content with MDC frontmatter', () => {
    const mdcContent = `---
name: Test
---

# Test Rules

Content here.
`;

    expect(isWindsurfFormat(mdcContent)).toBe(false);
  });

  it('should reject content without markdown headers', () => {
    const plainText = `This is just plain text
with no markdown headers.
`;

    expect(isWindsurfFormat(plainText)).toBe(false);
  });
});
