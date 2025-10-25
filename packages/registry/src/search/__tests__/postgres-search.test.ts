/**
 * Tests for PostgreSQL search implementation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { postgresSearch } from '../postgres';
import { FastifyInstance } from 'fastify';

// Mock Fastify instance
const mockFastify = {} as FastifyInstance;

// Test database connection
const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://prpm:prpm@localhost:5434/prpm_test',
});

// Check if database is available
let dbAvailable = false;

describe('Postgres Search', () => {
  const search = postgresSearch(mockFastify);

  beforeAll(async () => {
    // Test database connection
    try {
      await testPool.query('SELECT 1');
      dbAvailable = true;
    } catch (error) {
      console.warn('Test database not available, skipping postgres-search tests');
      dbAvailable = false;
      return;
    }

    // Create test table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR(255) PRIMARY KEY,
        
        description TEXT,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        tags TEXT[],
        visibility VARCHAR(20) DEFAULT 'public',
        verified BOOLEAN DEFAULT FALSE,
        featured BOOLEAN DEFAULT FALSE,
        total_downloads INTEGER DEFAULT 0,
        quality_score INTEGER,
        rating_average DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    // Clean up
    await testPool.query('DROP TABLE IF EXISTS packages');
    await testPool.end();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    // Clear table before each test
    await testPool.query('DELETE FROM packages');
  });

  describe('empty query handling', () => {
    beforeEach(async () => {
      if (!dbAvailable) return;
      // Insert test data
      await testPool.query(`
        INSERT INTO packages (id,  description, type, tags, category, visibility)
        VALUES
          ('skill-1', 'Python Skill', 'Learn Python', 'claude', ARRAY['python', 'claude-skill'], 'programming', 'public'),
          ('skill-2', 'JavaScript Skill', 'Learn JavaScript', 'claude', ARRAY['javascript', 'claude-skill'], 'programming', 'public'),
          ('rule-1', 'React Rule', 'React best practices', 'cursor', ARRAY['react', 'cursor-rule'], 'frontend', 'public'),
          ('mcp-1', 'Database MCP', 'Database server', 'generic', ARRAY['mcp', 'database'], 'tools', 'public')
      `);
    });

    it.skipIf(!dbAvailable)('should return all public packages when query is empty', async () => {
      const result = await search.search('', { limit: 20, offset: 0 });

      expect(result.packages).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it.skipIf(!dbAvailable)('should filter by format with empty query', async () => {
      const result = await search.search('', {
        format: 'claude',
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.packages.every(p => p.format === 'claude')).toBe(true);
    });

    it.skipIf(!dbAvailable)('should filter by tags with empty query', async () => {
      const result = await search.search('', {
        tags: ['mcp'],
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].id).toBe('mcp-1');
    });

    it.skipIf(!dbAvailable)('should filter by category with empty query', async () => {
      const result = await search.search('', {
        category: 'programming',
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(2);
      expect(result.packages.every(p => p.category === 'programming')).toBe(true);
    });

    it.skipIf(!dbAvailable)('should combine format and tags filters with empty query', async () => {
      const result = await search.search('', {
        format: 'claude',
        tags: ['claude-skill'],
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(2);
      expect(result.packages.every(p =>
        p.format === 'claude' && p.tags.includes('claude-skill')
      )).toBe(true);
    });
  });

  describe('text search with filters', () => {
    beforeEach(async () => {
      if (!dbAvailable) return;
      await testPool.query(`
        INSERT INTO packages (id,  description, type, tags, category, visibility)
        VALUES
          ('python-skill', 'Python Skill', 'Learn Python programming', 'claude', ARRAY['python', 'claude-skill'], 'programming', 'public'),
          ('python-rule', 'Python Rule', 'Python best practices', 'cursor', ARRAY['python', 'cursor-rule'], 'programming', 'public'),
          ('react-skill', 'React Skill', 'Learn React', 'claude', ARRAY['react', 'claude-skill'], 'frontend', 'public')
      `);
    });

    it.skipIf(!dbAvailable)('should search by text query', async () => {
      const result = await search.search('Python', {
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(2);
      expect(result.packages.every(p =>
        p.id.includes('Python') || p.description?.includes('Python')
      )).toBe(true);
    });

    it.skipIf(!dbAvailable)('should combine text query with format filter', async () => {
      const result = await search.search('Python', {
        format: 'claude',
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].id).toBe('python-skill');
    });

    it.skipIf(!dbAvailable)('should combine text query with tags filter', async () => {
      const result = await search.search('Python', {
        tags: ['cursor-rule'],
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].id).toBe('python-rule');
    });
  });

  describe('verified and featured filtering', () => {
    beforeEach(async () => {
      if (!dbAvailable) return;
      await testPool.query(`
        INSERT INTO packages (id,  description, type, tags, verified, featured, visibility)
        VALUES
          ('official-1', 'Official Package', 'Official', 'cursor', ARRAY['official'], true, true, 'public'),
          ('verified-1', 'Verified Package', 'Verified', 'claude', ARRAY['verified'], true, false, 'public'),
          ('regular-1', 'Regular Package', 'Regular', 'cursor', ARRAY['regular'], false, false, 'public')
      `);
    });

    it.skipIf(!dbAvailable)('should filter by verified status', async () => {
      const result = await search.search('', {
        verified: true,
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(2);
      expect(result.packages.every(p => p.verified === true)).toBe(true);
    });

    it.skipIf(!dbAvailable)('should filter by featured status', async () => {
      const result = await search.search('', {
        featured: true,
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].id).toBe('official-1');
    });

    it.skipIf(!dbAvailable)('should combine verified and featured filters', async () => {
      const result = await search.search('', {
        verified: true,
        featured: true,
        limit: 20,
        offset: 0,
      });

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].id).toBe('official-1');
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      if (!dbAvailable) return;
      await testPool.query(`
        INSERT INTO packages (id,  description, type, tags, total_downloads, quality_score, rating_average, visibility, created_at)
        VALUES
          ('pkg-1', 'Package 1', 'First', 'cursor', ARRAY['test'], 1000, 90, 4.5, 'public', NOW() - INTERVAL '1 day'),
          ('pkg-2', 'Package 2', 'Second', 'claude', ARRAY['test'], 500, 95, 4.8, 'public', NOW() - INTERVAL '2 days'),
          ('pkg-3', 'Package 3', 'Third', 'cursor', ARRAY['test'], 2000, 80, 4.2, 'public', NOW() - INTERVAL '3 days')
      `);
    });

    it.skipIf(!dbAvailable)('should sort by downloads (default)', async () => {
      const result = await search.search('', {
        sort: 'downloads',
        limit: 20,
        offset: 0,
      });

      expect(result.packages[0].id).toBe('pkg-3'); // 2000 downloads
      expect(result.packages[1].id).toBe('pkg-1'); // 1000 downloads
      expect(result.packages[2].id).toBe('pkg-2'); // 500 downloads
    });

    it.skipIf(!dbAvailable)('should sort by quality score', async () => {
      const result = await search.search('', {
        sort: 'quality',
        limit: 20,
        offset: 0,
      });

      expect(result.packages[0].id).toBe('pkg-2'); // 95 quality
      expect(result.packages[1].id).toBe('pkg-1'); // 90 quality
      expect(result.packages[2].id).toBe('pkg-3'); // 80 quality
    });

    it.skipIf(!dbAvailable)('should sort by rating', async () => {
      const result = await search.search('', {
        sort: 'rating',
        limit: 20,
        offset: 0,
      });

      expect(result.packages[0].id).toBe('pkg-2'); // 4.8 rating
      expect(result.packages[1].id).toBe('pkg-1'); // 4.5 rating
      expect(result.packages[2].id).toBe('pkg-3'); // 4.2 rating
    });

    it.skipIf(!dbAvailable)('should sort by created date', async () => {
      const result = await search.search('', {
        sort: 'created',
        limit: 20,
        offset: 0,
      });

      expect(result.packages[0].id).toBe('pkg-1'); // Most recent
      expect(result.packages[2].id).toBe('pkg-3'); // Oldest
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      if (!dbAvailable) return;
      // Insert 25 packages
      const values = Array.from({ length: 25 }, (_, i) =>
        `('pkg-${i}', 'Package ${i}', 'Description ${i}', 'cursor', ARRAY['test'], 'test', 'public')`
      ).join(',');

      await testPool.query(`
        INSERT INTO packages (id,  description, type, tags, category, visibility)
        VALUES ${values}
      `);
    });

    it.skipIf(!dbAvailable)('should respect limit parameter', async () => {
      const result = await search.search('', {
        limit: 10,
        offset: 0,
      });

      expect(result.packages).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it.skipIf(!dbAvailable)('should respect offset parameter', async () => {
      const result = await search.search('', {
        limit: 10,
        offset: 10,
      });

      expect(result.packages).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.offset).toBe(10);
    });

    it.skipIf(!dbAvailable)('should handle offset beyond total', async () => {
      const result = await search.search('', {
        limit: 10,
        offset: 30,
      });

      expect(result.packages).toHaveLength(0);
      expect(result.total).toBe(25);
    });
  });
});
