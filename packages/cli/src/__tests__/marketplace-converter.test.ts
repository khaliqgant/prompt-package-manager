/**
 * Tests for marketplace.json to PRPM manifest conversion
 */

import {
  marketplaceToManifest,
  validateMarketplaceJson,
  type MarketplaceJson,
} from '../core/marketplace-converter';

describe('marketplace-converter', () => {
  describe('validateMarketplaceJson', () => {
    it('should validate a valid marketplace.json', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
          },
        ],
      };

      expect(validateMarketplaceJson(marketplace)).toBe(true);
    });

    it('should reject marketplace.json without name', () => {
      const marketplace = {
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [],
      };

      expect(validateMarketplaceJson(marketplace)).toBe(false);
    });

    it('should reject marketplace.json without plugins', () => {
      const marketplace = {
        name: 'Test',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
      };

      expect(validateMarketplaceJson(marketplace)).toBe(false);
    });

    it('should reject marketplace.json with empty plugins array', () => {
      const marketplace = {
        name: 'Test',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [],
      };

      expect(validateMarketplaceJson(marketplace)).toBe(false);
    });
  });

  describe('marketplaceToManifest', () => {
    it('should convert basic marketplace.json to PRPM manifest', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.name).toBe('@testowner/test-plugin');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.description).toBe('Test plugin description');
      expect(manifest.format).toBe('claude');
      expect(manifest.subtype).toBe('rule');
      expect(manifest.author).toBe('Test Author');
      expect(manifest.files).toContain('plugin.md');
    });

    it('should handle plugin with agents', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Agent Plugin',
            source: 'plugin.md',
            description: 'Plugin with agents',
            version: '1.0.0',
            author: 'Test Author',
            agents: [
              {
                name: 'Test Agent',
                description: 'Test agent description',
                source: '.claude/agents/test-agent.md',
              },
            ],
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.format).toBe('claude');
      expect(manifest.subtype).toBe('agent');
      expect(manifest.files).toContain('.claude/agents/test-agent.md');
      expect(manifest.main).toBe('.claude/agents/test-agent.md');
    });

    it('should handle plugin with skills', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Skill Plugin',
            source: 'plugin.md',
            description: 'Plugin with skills',
            version: '1.0.0',
            author: 'Test Author',
            skills: [
              {
                name: 'Test Skill',
                description: 'Test skill description',
                source: '.claude/skills/test-skill.md',
              },
            ],
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.format).toBe('claude');
      expect(manifest.subtype).toBe('skill');
      expect(manifest.files).toContain('.claude/skills/test-skill.md');
      expect(manifest.main).toBe('.claude/skills/test-skill.md');
    });

    it('should handle plugin with commands', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Command Plugin',
            source: 'plugin.md',
            description: 'Plugin with commands',
            version: '1.0.0',
            author: 'Test Author',
            commands: [
              {
                name: 'test',
                description: 'Test command',
                source: '.claude/commands/test.md',
              },
            ],
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.format).toBe('claude');
      expect(manifest.subtype).toBe('slash-command');
      expect(manifest.files).toContain('.claude/commands/test.md');
      expect(manifest.main).toBe('.claude/commands/test.md');
    });

    it('should collect keywords from both marketplace and plugin', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        keywords: ['marketplace', 'test'],
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
            keywords: ['plugin', 'example'],
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.keywords).toContain('marketplace');
      expect(manifest.keywords).toContain('test');
      expect(manifest.keywords).toContain('plugin');
      expect(manifest.keywords).toContain('example');
    });

    it('should add URLs from marketplace', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        githubUrl: 'https://github.com/testowner/test',
        websiteUrl: 'https://example.com',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.repository).toBe('https://github.com/testowner/test');
      expect(manifest.homepage).toBe('https://example.com');
    });

    it('should sanitize package names', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'Test Owner!',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Test Plugin Name!!',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.name).toBe('@test-owner/test-plugin-name');
    });

    it('should include standard files', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.files).toContain('README.md');
      expect(manifest.files).toContain('LICENSE');
      expect(manifest.files).toContain('.claude/marketplace.json');
    });

    it('should handle multiple agents/skills/commands', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Multi Plugin',
            source: 'plugin.md',
            description: 'Plugin with multiple items',
            version: '1.0.0',
            author: 'Test Author',
            agents: [
              {
                name: 'Agent 1',
                description: 'First agent',
                source: '.claude/agents/agent1.md',
              },
              {
                name: 'Agent 2',
                description: 'Second agent',
                source: '.claude/agents/agent2.md',
              },
            ],
            skills: [
              {
                name: 'Skill 1',
                description: 'First skill',
                source: '.claude/skills/skill1.md',
              },
            ],
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.files).toContain('.claude/agents/agent1.md');
      expect(manifest.files).toContain('.claude/agents/agent2.md');
      expect(manifest.files).toContain('.claude/skills/skill1.md');
      // When multiple agents exist, main should not be set (no clear main file)
      expect(manifest.main).toBeUndefined();
    });

    it('should throw error for invalid plugin index', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
          },
        ],
      };

      expect(() => marketplaceToManifest(marketplace, 5)).toThrow(
        'Plugin index 5 out of range'
      );
    });

    it('should use plugin version over marketplace version', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '2.0.0',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'plugin.md',
            description: 'Test plugin description',
            version: '1.5.0',
            author: 'Test Author',
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.version).toBe('1.5.0');
    });

    it('should not include HTTP URLs in files array', () => {
      const marketplace: MarketplaceJson = {
        name: 'Test Marketplace',
        owner: 'testowner',
        description: 'Test description',
        version: '1.0.0',
        plugins: [
          {
            name: 'Test Plugin',
            source: 'https://example.com/plugin.md',
            description: 'Test plugin description',
            version: '1.0.0',
            author: 'Test Author',
            agents: [
              {
                name: 'Remote Agent',
                description: 'Agent from URL',
                source: 'https://example.com/agent.md',
              },
            ],
          },
        ],
      };

      const manifest = marketplaceToManifest(marketplace);

      expect(manifest.files).not.toContain('https://example.com/plugin.md');
      expect(manifest.files).not.toContain('https://example.com/agent.md');
    });
  });
});
