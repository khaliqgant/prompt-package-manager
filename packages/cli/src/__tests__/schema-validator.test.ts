/**
 * Tests for JSON schema validation
 */

import { validateManifestSchema } from '../core/schema-validator';

describe('schema-validator', () => {
  describe('Valid manifests', () => {
    it('should validate a simple manifest', () => {
      const manifest = {
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package with sufficient description length',
        format: 'claude',
        subtype: 'skill',
        files: ['skill.md', 'README.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate a scoped package name', () => {
      const manifest = {
        name: '@username/test-package',
        version: '1.0.0',
        description: 'A scoped package with sufficient description',
        format: 'cursor',
        subtype: 'rule',
        files: ['rule.mdc'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should validate enhanced format with file objects', () => {
      const manifest = {
        name: '@username/enhanced',
        version: '1.0.0',
        description: 'Enhanced package with file metadata',
        format: 'cursor',
        subtype: 'rule',
        files: [
          {
            path: '.cursor/rules/react.mdc',
            format: 'cursor',
            subtype: 'rule',
            name: 'React Rules',
            tags: ['react', 'typescript'],
          },
          {
            path: '.cursor/rules/python.mdc',
            format: 'cursor',
            subtype: 'rule',
            name: 'Python Rules',
            tags: ['python'],
          },
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should validate collection type with mixed files', () => {
      const manifest = {
        name: '@test/collection',
        version: '1.0.0',
        description: 'Collection with multiple types',
        format: 'generic',
        subtype: 'collection',
        files: [
          {
            path: '.claude/skills/skill.md',
            format: 'claude',
            subtype: 'skill',
          },
          {
            path: '.claude/agents/agent.md',
            format: 'claude',
            subtype: 'agent',
          },
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should validate full manifest with all optional fields', () => {
      const manifest = {
        name: '@username/full-package',
        version: '1.0.0',
        description: 'Full package with all fields populated',
        format: 'claude',
        subtype: 'skill',
        author: {
          name: 'Test Author',
          email: 'test@example.com',
          url: 'https://example.com',
        },
        license: 'MIT',
        repository: 'https://github.com/username/repo',
        homepage: 'https://example.com',
        documentation: 'https://docs.example.com',
        tags: ['productivity', 'testing'],
        keywords: ['ai', 'prompts', 'claude'],
        category: 'development',
        files: ['skill.md'],
        main: 'skill.md',
        dependencies: {
          '@pr-pm/utils': '^1.0.0',
        },
        peerDependencies: {
          'common-rules': '~2.0.0',
        },
        engines: {
          prpm: '>=1.0.0',
          node: '>=18.0.0',
        },
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should validate semver with prerelease', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0-beta.1',
        description: 'Prerelease version test package',
        format: 'claude',
        subtype: 'rule',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should validate author as string', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with string author',
        format: 'claude',
        subtype: 'rule',
        author: 'John Doe',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid manifests', () => {
    it('should reject missing required fields', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        // missing description and format
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('description'))).toBe(true);
    });

    it('should reject invalid package name (uppercase)', () => {
      const manifest = {
        name: 'TestPackage',
        version: '1.0.0',
        description: 'Invalid package name with uppercase',
        format: 'claude',
        subtype: 'rule',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject invalid package name (spaces)', () => {
      const manifest = {
        name: 'test package',
        version: '1.0.0',
        description: 'Invalid package name with spaces',
        format: 'claude',
        subtype: 'rule',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid semver', () => {
      const manifest = {
        name: 'test',
        version: '1.0',
        description: 'Invalid version number format',
        format: 'claude',
        subtype: 'rule',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('version'))).toBe(true);
    });

    it('should reject description that is too short', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Too short',
        format: 'claude',
        subtype: 'rule',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('description'))).toBe(true);
    });

    it('should reject invalid format', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with invalid format',
        format: 'invalid-format',
        subtype: 'rule',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('format'))).toBe(true);
    });

    it('should reject empty files array', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with empty files array',
        format: 'claude',
        subtype: 'rule',
        files: [],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('files'))).toBe(true);
    });

    it('should reject file object missing required path field', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with invalid file object',
        format: 'cursor',
        subtype: 'rule',
        files: [
          {
            format: 'cursor',
            subtype: 'rule',
            name: 'Missing path',
          },
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('should reject file object missing required format field', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with invalid file object',
        format: 'cursor',
        subtype: 'rule',
        files: [
          {
            path: 'file.mdc',
            name: 'Missing format',
          },
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('should reject file object with invalid format', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with invalid file format',
        format: 'cursor',
        subtype: 'rule',
        files: [
          {
            path: 'file.mdc',
            format: 'invalid-format',
            subtype: 'rule',
          },
        ],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid email format', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with invalid email',
        format: 'claude',
        subtype: 'rule',
        author: {
          name: 'Test',
          email: 'not-an-email',
        },
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('email'))).toBe(true);
    });

    it('should reject too many tags', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with too many tags',
        format: 'claude',
        subtype: 'rule',
        tags: Array(11).fill('tag'), // 11 tags, max is 10
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('should reject too many keywords', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with too many keywords',
        format: 'claude',
        subtype: 'rule',
        keywords: Array(21).fill('keyword'), // 21 keywords, max is 20
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const manifest = {
        name: 'test',
        version: '1.0.0',
        description: 'Package with invalid URL',
        format: 'claude',
        subtype: 'rule',
        repository: 'not-a-url',
        files: ['file.md'],
      };

      const result = validateManifestSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('repository'))).toBe(true);
    });
  });
});
