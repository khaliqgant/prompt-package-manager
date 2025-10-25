/**
 * Tests for GitHub Copilot format converter
 */

import { describe, it, expect } from 'vitest';
import { toCopilot } from '../to-copilot.js';
import {
  sampleCanonicalPackage,
  minimalCanonicalPackage,
} from './setup.js';

describe('toCopilot', () => {
  describe('basic conversion', () => {
    it('should convert canonical to copilot format', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.format).toBe('copilot');
      expect(result.content).toBeTruthy();
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should include title and description', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.content).toContain('# Test Agent');
      expect(result.content).toContain('A test agent for conversion testing');
    });

    it('should handle minimal package', () => {
      const result = toCopilot(minimalCanonicalPackage);

      expect(result.content).toContain('# Minimal Rule');
      expect(result.qualityScore).toBe(100);
    });
  });

  describe('path-specific instructions', () => {
    it('should generate frontmatter for path-specific instructions', () => {
      const result = toCopilot(sampleCanonicalPackage, {
        copilotConfig: {
          applyTo: 'src/**/*.ts',
        },
      });

      expect(result.content).toContain('---');
      expect(result.content).toContain('applyTo:');
      expect(result.content).toContain('  - src/**/*.ts');
    });

    it('should generate frontmatter with custom instruction name', () => {
      const result = toCopilot(sampleCanonicalPackage, {
        copilotConfig: {
          instructionName: 'testing',
          applyTo: 'test/**/*.ts',
        },
      });

      expect(result.content).toContain('---');
      expect(result.content).toContain('applyTo:');
      expect(result.content).toContain('  - test/**/*.ts');
    });

    it('should not include frontmatter for repository-wide instructions', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.content).not.toContain('---');
      expect(result.content).not.toContain('applyTo:');
    });
  });

  describe('section conversion', () => {
    it('should skip persona section (not supported)', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.content).not.toContain('TestBot');
      expect(result.content).not.toContain('Testing Assistant');
    });

    it('should skip tools section (not supported)', () => {
      const result = toCopilot(sampleCanonicalPackage);

      // Tools section should be skipped
      expect(result.warnings).toBeDefined();
    });

    it('should convert instructions section', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.content).toContain('## Core Principles');
      expect(result.content).toContain('Always write comprehensive tests');
    });

    it('should convert rules section', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.content).toContain('## Testing Guidelines');
      expect(result.content).toContain('- Write tests before code (TDD)');
    });

    it('should convert examples section', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.content).toContain('## Examples');
    });
  });

  describe('quality scoring', () => {
    it('should give perfect score for complete package', () => {
      const result = toCopilot(sampleCanonicalPackage);

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

      const result = toCopilot(pkgWithoutDesc);

      expect(result.qualityScore).toBeLessThan(100);
    });
  });

  describe('warnings', () => {
    it('should warn about skipped sections', () => {
      const result = toCopilot(sampleCanonicalPackage);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });
});
