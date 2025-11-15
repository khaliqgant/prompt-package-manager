/**
 * Query Enhancement Service
 * Improves search queries through expansion, synonym detection, and intent understanding
 */

import OpenAI from 'openai';
import type { FastifyInstance } from 'fastify';

export interface QueryEnhancement {
  original_query: string;
  enhanced_query: string;
  detected_intent: string;
  key_concepts: string[];
  suggested_formats?: string[];
  suggested_categories?: string[];
  expansion_used: boolean;
}

export class QueryEnhancerService {
  private openai: OpenAI;
  private server: FastifyInstance;
  private cache: Map<string, QueryEnhancement>;

  // Common tech synonyms and expansions
  private readonly TECH_SYNONYMS: Record<string, string[]> = {
    'api': ['rest api', 'graphql', 'endpoint', 'web service'],
    'auth': ['authentication', 'authorization', 'login', 'oauth', 'jwt'],
    'db': ['database', 'postgres', 'mysql', 'mongodb'],
    'test': ['testing', 'unit test', 'integration test', 'e2e'],
    'deploy': ['deployment', 'ci/cd', 'production', 'release'],
    'frontend': ['ui', 'user interface', 'react', 'vue', 'angular'],
    'backend': ['server', 'api', 'microservice', 'service'],
  };

  constructor(server: FastifyInstance) {
    this.server = server;
    this.cache = new Map();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required for query enhancement');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Enhance a search query with AI
   */
  async enhanceQuery(query: string): Promise<QueryEnhancement> {
    // Check cache first
    const cached = this.cache.get(query.toLowerCase());
    if (cached) {
      return cached;
    }

    try {
      // Step 1: Basic expansion with synonyms
      const expandedQuery = this.expandWithSynonyms(query);

      // Step 2: AI-powered intent detection and enhancement
      const aiEnhancement = await this.aiEnhanceQuery(query);

      const enhancement: QueryEnhancement = {
        original_query: query,
        enhanced_query: aiEnhancement?.enhanced || expandedQuery,
        detected_intent: aiEnhancement?.intent || 'general_search',
        key_concepts: aiEnhancement?.concepts || this.extractKeyConcepts(query),
        suggested_formats: aiEnhancement?.formats,
        suggested_categories: aiEnhancement?.categories,
        expansion_used: aiEnhancement !== null
      };

      // Cache for 1 hour
      this.cache.set(query.toLowerCase(), enhancement);
      setTimeout(() => this.cache.delete(query.toLowerCase()), 3600000);

      return enhancement;
    } catch (error) {
      this.server.log.warn({ error, query }, 'Query enhancement failed, using original');

      // Fallback to basic enhancement
      return {
        original_query: query,
        enhanced_query: this.expandWithSynonyms(query),
        detected_intent: 'general_search',
        key_concepts: this.extractKeyConcepts(query),
        expansion_used: false
      };
    }
  }

  /**
   * Expand query with common tech synonyms
   */
  private expandWithSynonyms(query: string): string {
    const words = query.toLowerCase().split(/\s+/);
    const expanded: Set<string> = new Set(words);

    words.forEach(word => {
      const synonyms = this.TECH_SYNONYMS[word];
      if (synonyms) {
        synonyms.forEach(syn => expanded.add(syn));
      }
    });

    return Array.from(expanded).join(' ');
  }

  /**
   * Extract key technical concepts from query
   */
  private extractKeyConcepts(query: string): string[] {
    const concepts: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Programming languages
    const languages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby'];
    languages.forEach(lang => {
      if (lowerQuery.includes(lang)) concepts.push(lang);
    });

    // Frameworks
    const frameworks = ['react', 'vue', 'angular', 'nextjs', 'express', 'flask', 'django', 'rails'];
    frameworks.forEach(fw => {
      if (lowerQuery.includes(fw)) concepts.push(fw);
    });

    // Technologies
    const techs = ['api', 'database', 'docker', 'kubernetes', 'aws', 'authentication', 'testing'];
    techs.forEach(tech => {
      if (lowerQuery.includes(tech)) concepts.push(tech);
    });

    return concepts;
  }

  /**
   * Use AI to enhance query understanding
   */
  private async aiEnhanceQuery(query: string): Promise<{
    enhanced: string;
    intent: string;
    concepts: string[];
    formats?: string[];
    categories?: string[];
  } | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a search query analyzer for a prompt/AI tool package registry. Your job is to:
1. Understand developer intent from natural language queries
2. Extract key technical concepts
3. Suggest relevant package formats (cursor, claude, continue, windsurf, mcp, etc.)
4. Suggest relevant categories (frontend, backend, testing, devops, etc.)
5. Enhance the query for better semantic search

Return JSON only with this structure:
{
  "enhanced": "improved query with technical terms",
  "intent": "what the user wants to accomplish",
  "concepts": ["key", "technical", "concepts"],
  "formats": ["suggested", "formats"],
  "categories": ["suggested", "categories"]
}`
          },
          {
            role: 'user',
            content: `Analyze this search query: "${query}"`
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      this.server.log.warn({ error }, 'AI query enhancement failed');
      return null;
    }
  }

  /**
   * Generate search suggestions based on partial query
   */
  async generateSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    if (partialQuery.length < 3) return [];

    try {
      // Get popular searches from analytics
      const result = await this.server.pg.query(
        `SELECT DISTINCT query, COUNT(*) as count
         FROM ai_search_usage
         WHERE query ILIKE $1
         AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY query
         ORDER BY count DESC
         LIMIT $2`,
        [`%${partialQuery}%`, limit]
      );

      return result.rows.map(r => r.query);
    } catch (error) {
      this.server.log.warn({ error }, 'Failed to generate search suggestions');
      return [];
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
