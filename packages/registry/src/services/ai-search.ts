/**
 * AI Search Service
 * Semantic search using vector embeddings and multi-stage ranking
 */

import OpenAI from 'openai';
import type { FastifyInstance } from 'fastify';
import type {
  AISearchQuery,
  AISearchResult,
  AISearchResponse,
  AISearchConfig,
  SearchRankingWeights
} from '@pr-pm/types';
import { QueryEnhancerService } from './query-enhancer.js';
import { ErrorMonitoringService } from './error-monitoring.js';

const DEFAULT_CONFIG: AISearchConfig = {
  embedding_model: 'text-embedding-3-small',
  embedding_dimensions: 1536,
  max_candidates: 100,  // More candidates for better coverage
  max_results: 20,      // More results shown
  ranking_weights: {
    semantic_similarity: 0.7,  // HEAVILY prioritize semantic match
    quality_score: 0.2,        // Reduce quality impact
    popularity: 0.1            // Reduce popularity impact
  },
  min_similarity_threshold: 0.35  // Keep threshold reasonable (35%+ similarity)
};

export class AISearchService {
  private openai: OpenAI;
  private server: FastifyInstance;
  private config: AISearchConfig;
  private queryEnhancer: QueryEnhancerService;
  private errorMonitoring: ErrorMonitoringService;

  constructor(server: FastifyInstance, config?: Partial<AISearchConfig>) {
    this.server = server;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable required for AI search');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.queryEnhancer = new QueryEnhancerService(server);
    this.errorMonitoring = new ErrorMonitoringService(server);
  }

  /**
   * Perform AI-powered semantic search
   */
  async search(query: AISearchQuery, userId?: string): Promise<AISearchResponse> {
    const startTime = Date.now();
    const metadata: any = {
      embedding_time_ms: 0,
      vector_search_time_ms: 0,
      keyword_search_time_ms: 0,
      hybrid_merge_time_ms: 0,
      reranking_time_ms: 0,
      query_enhancement_time_ms: 0
    };

    try {
      // Step 1: Enhance query with AI
      const enhanceStart = Date.now();
      let enhancement;
      try {
        enhancement = await this.queryEnhancer.enhanceQuery(query.query);
        metadata.query_enhancement_time_ms = Date.now() - enhanceStart;
        metadata.query_enhancement = {
          enhanced_query: enhancement.enhanced_query,
          detected_intent: enhancement.detected_intent,
          key_concepts: enhancement.key_concepts
        };
      } catch (error) {
        // Track but don't fail - fall back to original query
        await this.errorMonitoring.trackQueryEnhancementError(error as Error, query.query);
        enhancement = {
          original_query: query.query,
          enhanced_query: query.query,
          detected_intent: 'general_search',
          key_concepts: [],
          expansion_used: false
        };
        metadata.query_enhancement_time_ms = Date.now() - enhanceStart;
        metadata.query_enhancement_error = true;
      }

      // Apply AI-suggested filters if none provided
      if (!query.filters?.format && enhancement.suggested_formats) {
        query.filters = query.filters || {};
        // Don't auto-apply, just track for now
        metadata.suggested_formats = enhancement.suggested_formats;
      }

      // Step 2: Generate embedding for enhanced query
      const embeddingStart = Date.now();
      let queryEmbedding;
      try {
        queryEmbedding = await this.generateQueryEmbedding(enhancement.enhanced_query);
        metadata.embedding_time_ms = Date.now() - embeddingStart;
      } catch (error) {
        await this.errorMonitoring.trackOpenAIError(error as Error, 'embedding', enhancement.enhanced_query);
        throw error; // Fail the search if embedding fails
      }

      // Step 3: Hybrid search - both vector and keyword
      const vectorSearchStart = Date.now();
      let vectorCandidates;
      try {
        vectorCandidates = await this.vectorSearch(
          queryEmbedding,
          query.filters,
          this.config.max_candidates
        );
        metadata.vector_search_time_ms = Date.now() - vectorSearchStart;
      } catch (error) {
        await this.errorMonitoring.trackVectorSearchError(error as Error, query.query, query.filters);
        throw error; // Fail the search if vector search fails
      }

      // Step 4: Keyword search for exact/partial matches
      const keywordSearchStart = Date.now();
      const keywordCandidates = await this.keywordSearch(
        query.query,
        enhancement.key_concepts,
        query.filters,
        30 // Get top 30 from keyword search
      );
      metadata.keyword_search_time_ms = Date.now() - keywordSearchStart;

      // Step 5: Merge and deduplicate results
      const mergeStart = Date.now();
      const mergedCandidates = this.mergeResults(vectorCandidates, keywordCandidates);
      metadata.hybrid_merge_time_ms = Date.now() - mergeStart;
      metadata.vector_count = vectorCandidates.length;
      metadata.keyword_count = keywordCandidates.length;
      metadata.merged_count = mergedCandidates.length;

      // Step 6: Rerank candidates by combined score
      const rerankingStart = Date.now();
      const rankedResults = this.rerankResults(
        mergedCandidates,
        this.config.ranking_weights,
        enhancement.key_concepts
      );
      metadata.reranking_time_ms = Date.now() - rerankingStart;

      // Step 4: Take top N results
      const finalResults = rankedResults
        .slice(0, query.limit || this.config.max_results);

      // Step 5: Track usage
      if (userId) {
        this.trackSearchUsage(userId, query.query, finalResults.length, Date.now() - startTime);
      }

      const executionTime = Date.now() - startTime;

      this.server.log.info({
        userId,
        query: query.query,
        results_count: finalResults.length,
        execution_time_ms: executionTime,
        metadata
      }, 'AI search completed');

      return {
        results: finalResults,
        query: query.query,
        total_matches: mergedCandidates.length,
        execution_time_ms: executionTime,
        search_metadata: metadata
      };
    } catch (error) {
      this.server.log.error({ error, query: query.query }, 'AI search failed');
      throw error;
    }
  }

  /**
   * Generate embedding for search query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embedding_model,
        input: query.substring(0, 8000),
        dimensions: this.config.embedding_dimensions
      });

      return response.data[0].embedding;
    } catch (error) {
      this.server.log.error({ error, query }, 'Failed to generate query embedding');
      throw new Error('Failed to generate search embedding');
    }
  }

  /**
   * Perform vector similarity search using pgvector
   */
  private async vectorSearch(
    queryEmbedding: number[],
    filters?: AISearchQuery['filters'],
    limit: number = 50
  ): Promise<AISearchResult[]> {
    // Build filter conditions
    const conditions: string[] = [
      "p.visibility = 'public'",
      "p.deprecated = false",
      "pe.embedding IS NOT NULL"
    ];
    const params: any[] = [`[${queryEmbedding.join(',')}]`];
    let paramCount = 1;

    if (filters?.format) {
      paramCount++;
      conditions.push(`p.format = $${paramCount}`);
      params.push(filters.format);
    }

    if (filters?.subtype) {
      paramCount++;
      conditions.push(`p.subtype = $${paramCount}`);
      params.push(filters.subtype);
    }

    if (filters?.language) {
      paramCount++;
      conditions.push(`p.language = $${paramCount}`);
      params.push(filters.language);
    }

    if (filters?.framework) {
      paramCount++;
      conditions.push(`p.framework = $${paramCount}`);
      params.push(filters.framework);
    }

    if (filters?.min_quality) {
      paramCount++;
      conditions.push(`p.quality_score >= $${paramCount}`);
      params.push(filters.min_quality);
    }

    // Add category filter
    if (filters?.categories && filters.categories.length > 0) {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM package_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.package_id = p.id AND c.slug = ANY($${paramCount}::text[])
      )`);
      params.push(filters.categories);
    }

    // Add use case filter
    if (filters?.use_cases && filters.use_cases.length > 0) {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM package_use_cases puc
        JOIN use_cases uc ON puc.use_case_id = uc.id
        WHERE puc.package_id = p.id AND uc.slug = ANY($${paramCount}::text[])
      )`);
      params.push(filters.use_cases);
    }

    const whereClause = conditions.join(' AND ');
    paramCount++;

    // Execute vector similarity query
    const query = `
      SELECT
        p.id as package_id,
        p.name,
        p.description,
        p.format,
        p.subtype,
        p.author_id,
        u.username as author_username,
        p.quality_score,
        p.total_downloads,
        COALESCE(s.stars_count, 0) as stars_count,
        pe.ai_use_case_description,
        pe.ai_problem_statement,
        pe.ai_best_for,
        pe.ai_similar_to,
        1 - (pe.embedding <=> $1::vector) as similarity_score
      FROM packages p
      JOIN package_embeddings pe ON p.id = pe.package_id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN (
        SELECT package_id, COUNT(*) as stars_count
        FROM package_stars
        GROUP BY package_id
      ) s ON p.id = s.package_id
      WHERE ${whereClause}
      ORDER BY pe.embedding <=> $1::vector
      LIMIT $${paramCount}
    `;

    params.push(limit);

    const result = await this.server.pg.query(query, params);

    return result.rows.map(row => ({
      package_id: row.package_id,
      name: row.name,
      description: row.description,
      format: row.format,
      subtype: row.subtype,
      author_id: row.author_id,
      author_username: row.author_username,
      quality_score: row.quality_score,
      total_downloads: row.total_downloads,
      stars_count: row.stars_count,
      ai_use_case_description: row.ai_use_case_description,
      ai_problem_statement: row.ai_problem_statement,
      ai_best_for: row.ai_best_for,
      ai_similar_to: row.ai_similar_to || [],
      similarity_score: parseFloat(row.similarity_score),
      quality_score_normalized: 0, // Will be calculated in reranking
      popularity_score_normalized: 0, // Will be calculated in reranking
      final_score: 0 // Will be calculated in reranking
    }));
  }

  /**
   * Keyword search for exact/partial matches
   */
  private async keywordSearch(
    query: string,
    keyConcepts: string[],
    filters?: AISearchQuery['filters'],
    limit: number = 30
  ): Promise<AISearchResult[]> {
    // Build search terms
    const searchTerms = [query, ...keyConcepts].filter(Boolean);
    const tsQuery = searchTerms.map(t => t.replace(/[^\w\s]/g, '')).join(' | ');

    // Build filter conditions
    const conditions: string[] = [
      "p.visibility = 'public'",
      "p.deprecated = false",
      `(
        to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(array_to_string(p.tags, ' '), ''))
        @@ to_tsquery('english', $1)
      )`
    ];
    const params: any[] = [tsQuery];
    let paramCount = 1;

    if (filters?.format) {
      paramCount++;
      conditions.push(`p.format = $${paramCount}`);
      params.push(filters.format);
    }

    if (filters?.subtype) {
      paramCount++;
      conditions.push(`p.subtype = $${paramCount}`);
      params.push(filters.subtype);
    }

    const whereClause = conditions.join(' AND ');
    paramCount++;

    const queryText = `
      SELECT
        p.id as package_id,
        p.name,
        p.description,
        p.format,
        p.subtype,
        p.author_id,
        u.username as author_username,
        p.version,
        p.quality_score,
        p.total_downloads,
        COALESCE(s.stars_count, 0) as stars_count,
        pe.ai_use_case_description,
        pe.ai_problem_statement,
        pe.ai_best_for,
        pe.ai_similar_to,
        ts_rank(
          to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(array_to_string(p.tags, ' '), '')),
          to_tsquery('english', $1)
        ) as keyword_relevance
      FROM packages p
      LEFT JOIN package_embeddings pe ON p.id = pe.package_id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN (
        SELECT package_id, COUNT(*) as stars_count
        FROM package_stars
        GROUP BY package_id
      ) s ON p.id = s.package_id
      WHERE ${whereClause}
      ORDER BY keyword_relevance DESC, p.total_downloads DESC
      LIMIT $${paramCount}
    `;

    params.push(limit);

    try {
      const result = await this.server.pg.query(queryText, params);

      return result.rows.map(row => ({
        package_id: row.package_id,
        name: row.name,
        description: row.description,
        format: row.format,
        subtype: row.subtype,
        author_id: row.author_id,
        author_username: row.author_username,
        version: row.version,
        quality_score: row.quality_score,
        total_downloads: row.total_downloads,
        stars_count: row.stars_count,
        ai_use_case_description: row.ai_use_case_description,
        ai_problem_statement: row.ai_problem_statement,
        ai_best_for: row.ai_best_for,
        ai_similar_to: row.ai_similar_to || [],
        similarity_score: parseFloat(row.keyword_relevance || '0'), // Use keyword relevance as similarity
        quality_score_normalized: 0,
        popularity_score_normalized: 0,
        final_score: 0,
        keyword_match: true as any // Flag to boost in reranking
      }));
    } catch (error) {
      this.server.log.warn({ error }, 'Keyword search failed');
      return [];
    }
  }

  /**
   * Merge vector and keyword search results
   */
  private mergeResults(
    vectorResults: AISearchResult[],
    keywordResults: AISearchResult[]
  ): AISearchResult[] {
    const merged = new Map<string, AISearchResult>();

    // Add vector results
    vectorResults.forEach(result => {
      merged.set(result.package_id, { ...result, source: 'vector' });
    });

    // Merge keyword results (boost if already present)
    keywordResults.forEach(result => {
      if (merged.has(result.package_id)) {
        const existing = merged.get(result.package_id)!;
        // Boost similarity score for packages found in both
        existing.similarity_score = Math.min(1, existing.similarity_score * 1.2);
        existing.source = 'hybrid';
      } else {
        merged.set(result.package_id, { ...result, source: 'keyword' });
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Rerank results using weighted scoring with keyword boost
   */
  private rerankResults(
    candidates: AISearchResult[],
    weights: SearchRankingWeights,
    keyConcepts: string[] = []
  ): AISearchResult[] {
    // Filter by minimum similarity threshold
    const filtered = candidates.filter(
      c => c.similarity_score >= (this.config.min_similarity_threshold || 0)
    );

    if (filtered.length === 0) {
      return [];
    }

    // Normalize quality scores (0-5 → 0-1)
    const maxQuality = 5;

    // Normalize popularity (log scale)
    const maxDownloads = Math.max(...filtered.map(c => c.total_downloads), 1);
    const logMaxDownloads = Math.log10(maxDownloads + 1);

    // Calculate final scores
    const scored = filtered.map(candidate => {
      const qualityNormalized = parseFloat(candidate.quality_score?.toString() || '0') / maxQuality;
      const popularityNormalized = Math.log10(candidate.total_downloads + 1) / logMaxDownloads;

      // Keyword concept boost (10% bonus for matching key concepts)
      let conceptBoost = 0;
      const nameAndDesc = `${candidate.name} ${candidate.description}`.toLowerCase();
      const matchedConcepts = keyConcepts.filter(concept =>
        nameAndDesc.includes(concept.toLowerCase())
      );
      if (matchedConcepts.length > 0) {
        conceptBoost = Math.min(0.1, matchedConcepts.length * 0.03);
      }

      const finalScore =
        (candidate.similarity_score * weights.semantic_similarity) +
        (qualityNormalized * weights.quality_score) +
        (popularityNormalized * weights.popularity) +
        conceptBoost;

      return {
        ...candidate,
        quality_score_normalized: qualityNormalized,
        popularity_score_normalized: popularityNormalized,
        final_score: finalScore,
        match_explanation: this.generateMatchExplanation(
          candidate,
          keyConcepts,
          matchedConcepts
        )
      };
    });

    // Sort by final score descending
    return scored.sort((a, b) => b.final_score - a.final_score);
  }

  /**
   * Generate human-readable explanation for why this result matched
   */
  private generateMatchExplanation(
    result: AISearchResult,
    keyConcepts: string[],
    matchedConcepts: string[]
  ): string {
    const explanations: string[] = [];

    if (result.similarity_score > 0.8) {
      explanations.push('Highly relevant semantically');
    } else if (result.similarity_score > 0.6) {
      explanations.push('Semantically related');
    }

    if (matchedConcepts.length > 0) {
      explanations.push(`Matches: ${matchedConcepts.join(', ')}`);
    }

    if (result.quality_score && parseFloat(result.quality_score.toString()) > 4) {
      explanations.push('High quality');
    }

    if (result.total_downloads > 1000) {
      explanations.push('Popular');
    }

    return explanations.join(' • ') || 'Relevant match';
  }

  /**
   * Track search usage for analytics
   */
  private async trackSearchUsage(
    userId: string,
    query: string,
    resultsCount: number,
    executionTimeMs: number
  ): Promise<void> {
    try {
      // Check if user has PRPM+
      const userResult = await this.server.pg.query(
        `SELECT subscription_tier FROM users WHERE id = $1`,
        [userId]
      );

      const hasPRPMPlus = userResult.rows[0]?.subscription_tier === 'prpm_plus';

      // Log to analytics (async, don't block response)
      setImmediate(async () => {
        try {
          await this.server.pg.query(
            `INSERT INTO ai_search_usage (
              user_id, query, results_count, execution_time_ms, has_prpm_plus, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [userId, query, resultsCount, executionTimeMs, hasPRPMPlus]
          );
        } catch (error) {
          this.server.log.error({ error }, 'Failed to track AI search usage');
        }
      });
    } catch (error) {
      // Don't fail the search if tracking fails
      this.server.log.warn({ error }, 'Failed to track search usage');
    }
  }

  /**
   * Get similar packages using vector similarity
   */
  async getSimilarPackages(packageId: string, limit: number = 5): Promise<AISearchResult[]> {
    try {
      // Get the package's embedding
      const embeddingResult = await this.server.pg.query(
        `SELECT embedding FROM package_embeddings WHERE package_id = $1`,
        [packageId]
      );

      if (embeddingResult.rows.length === 0) {
        return [];
      }

      const embedding = embeddingResult.rows[0].embedding;

      // Find similar packages
      const query = `
        SELECT
          p.id as package_id,
          p.name,
          p.description,
          p.format,
          p.subtype,
          p.quality_score,
          p.total_downloads,
          1 - (pe.embedding <=> $1::vector) as similarity_score
        FROM packages p
        JOIN package_embeddings pe ON p.id = pe.package_id
        WHERE p.id != $2
          AND p.visibility = 'public'
          AND p.deprecated = false
        ORDER BY pe.embedding <=> $1::vector
        LIMIT $3
      `;

      const result = await this.server.pg.query(query, [embedding, packageId, limit]);

      return result.rows.map(row => ({
        package_id: row.package_id,
        name: row.name,
        description: row.description,
        format: row.format,
        subtype: row.subtype,
        author_id: '',
        version: '',
        quality_score: row.quality_score,
        total_downloads: row.total_downloads,
        stars_count: 0,
        ai_use_case_description: null,
        ai_problem_statement: null,
        ai_best_for: null,
        ai_similar_to: [],
        similarity_score: parseFloat(row.similarity_score),
        quality_score_normalized: 0,
        popularity_score_normalized: 0,
        final_score: 0
      }));
    } catch (error) {
      this.server.log.error({ error, packageId }, 'Failed to get similar packages');
      return [];
    }
  }
}
