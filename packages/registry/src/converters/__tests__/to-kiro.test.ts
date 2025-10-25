/**
 * Tests for Kiro format converter
 */

import { describe, it, expect } from 'vitest';
import { toKiro } from '../to-kiro.js';
import {
  sampleCanonicalPackage,
  minimalCanonicalPackage,
} from './setup.js';

describe('toKiro', () => {
  describe('basic conversion', () => {
    it('should convert canonical to kiro format', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.format).toBe('kiro');
      expect(result.content).toBeTruthy();
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should require inclusion mode', () => {
      expect(() => {
        toKiro(sampleCanonicalPackage);
      }).toThrow('Kiro format requires inclusion mode');
    });

    it('should include title and description', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.content).toContain('# Test Agent');
      expect(result.content).toContain('A test agent for conversion testing');
    });
  });

  describe('inclusion modes', () => {
    it('should generate frontmatter with always inclusion', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'always',
        },
      });

      expect(result.content).toContain('---');
      expect(result.content).toContain('inclusion: always');
    });

    it('should generate frontmatter with manual inclusion', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.content).toContain('---');
      expect(result.content).toContain('inclusion: manual');
    });

    it('should generate frontmatter with fileMatch inclusion', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'fileMatch',
          fileMatchPattern: '**/*.test.ts',
        },
      });

      expect(result.content).toContain('---');
      expect(result.content).toContain('inclusion: fileMatch');
      expect(result.content).toContain('fileMatchPattern: "**/*.test.ts"');
    });

    it('should require fileMatchPattern for fileMatch mode', () => {
      expect(() => {
        toKiro(sampleCanonicalPackage, {
          kiroConfig: {
            inclusion: 'fileMatch',
          },
        });
      }).toThrow('fileMatch inclusion mode requires fileMatchPattern');
    });
  });

  describe('domain configuration', () => {
    it('should include domain in frontmatter', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
          domain: 'testing',
        },
      });

      expect(result.content).toContain('---');
      expect(result.content).toContain('domain: testing');
    });

    it('should use domain in title if provided', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
          domain: 'Custom Domain',
        },
      });

      expect(result.content).toContain('# Custom Domain');
    });
  });

  describe('section conversion', () => {
    it('should skip persona section (not supported)', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.content).not.toContain('TestBot');
      expect(result.content).not.toContain('Testing Assistant');
    });

    it('should skip tools section (not supported)', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.warnings).toBeDefined();
    });

    it('should convert instructions section', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.content).toContain('## Core Principles');
      expect(result.content).toContain('Always write comprehensive tests');
    });

    it('should convert rules section', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.content).toContain('## Testing Guidelines');
      expect(result.content).toContain('- Write tests before code (TDD)');
    });
  });

  describe('quality scoring', () => {
    it('should give perfect score for complete package', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

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

      const result = toKiro(pkgWithoutDesc, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.qualityScore).toBeLessThan(100);
    });
  });

  describe('warnings', () => {
    it('should warn about skipped sections', () => {
      const result = toKiro(sampleCanonicalPackage, {
        kiroConfig: {
          inclusion: 'manual',
        },
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });
});
