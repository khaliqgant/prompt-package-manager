/**
 * Embedding Generation Service
 * Generates vector embeddings and AI-enriched content for packages
 */

import OpenAI from 'openai';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import type {
  EmbeddingGenerationRequest,
  EmbeddingGenerationResult,
  EnrichedPackageContent,
  ContentEnrichmentRequest
} from '@pr-pm/types';

export class EmbeddingGenerationService {
  private openai: OpenAI;
  private server: FastifyInstance;

  constructor(server: FastifyInstance) {
    this.server = server;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable required for embedding generation');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate AI-enriched content for a package
   */
  async generateEnrichedContent(request: ContentEnrichmentRequest): Promise<EnrichedPackageContent> {
    const { package_data } = request;

    // Build context for AI
    const context = `
Package Name: ${package_data.name}
Description: ${package_data.description || 'No description'}
Format: ${package_data.format}
Subtype: ${package_data.subtype}
Language: ${package_data.language || 'Not specified'}
Framework: ${package_data.framework || 'Not specified'}
Tags: ${package_data.tags?.join(', ') || 'None'}
Keywords: ${package_data.keywords?.join(', ') || 'None'}

Full Content (first 2000 chars):
${package_data.full_content?.substring(0, 2000) || 'No content available'}
`.trim();

    const prompt = `Analyze this package and generate enriched metadata for semantic search.

${context}

Generate JSON with:
1. ai_use_case_description (1-2 sentences): What can developers DO with this package? Focus on outcomes.
2. ai_problem_statement (1 sentence): What problem does this solve?
3. ai_similar_to (array, 3-5 items): Similar package names or concepts
4. ai_best_for (1 sentence): When is this package the best choice?
5. suggested_categories (array): Which categories fit? Choose from: Backend Development, Frontend Development, Testing & Quality, DevOps & Infrastructure, AI & Machine Learning, Data Engineering, Mobile Development, Security, Documentation, Code Quality
6. suggested_use_cases (array, 2-4 items): Specific use case phrases like "Building REST APIs", "Setting up CI/CD"

Return valid JSON only.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const enriched = JSON.parse(response.choices[0].message.content!);

      return {
        ai_use_case_description: enriched.ai_use_case_description,
        ai_problem_statement: enriched.ai_problem_statement,
        ai_similar_to: enriched.ai_similar_to || [],
        ai_best_for: enriched.ai_best_for,
        suggested_categories: enriched.suggested_categories || [],
        suggested_use_cases: enriched.suggested_use_cases || []
      };
    } catch (error) {
      this.server.log.error({ error, package_id: request.package_id }, 'Failed to generate enriched content');
      throw error;
    }
  }

  /**
   * Generate embedding vector for searchable content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input length
        dimensions: 1536
      });

      return response.data[0].embedding;
    } catch (error) {
      this.server.log.error({ error }, 'Failed to generate embedding');
      throw error;
    }
  }

  /**
   * Generate embedding for a single package
   */
  async generatePackageEmbedding(request: EmbeddingGenerationRequest): Promise<EmbeddingGenerationResult> {
    const { package_id, force_regenerate } = request;

    try {
      // 1. Check if regeneration is needed
      if (!force_regenerate) {
        const needsRegen = await this.server.pg.query(
          'SELECT needs_embedding_regeneration($1) as needs',
          [package_id]
        );

        if (!needsRegen.rows[0]?.needs) {
          return {
            package_id,
            package_name: 'Unknown',
            success: true,
            skipped: true,
            skip_reason: 'Embedding is up to date'
          };
        }
      }

      // 2. Load package data
      const packageResult = await this.server.pg.query(
        `SELECT
          id, name, description, format, subtype,
          full_content, tags, keywords, language, framework
        FROM packages
        WHERE id = $1 AND visibility = 'public' AND deprecated = false`,
        [package_id]
      );

      if (packageResult.rows.length === 0) {
        return {
          package_id,
          package_name: 'Unknown',
          success: false,
          error: 'Package not found or not eligible'
        };
      }

      const pkg = packageResult.rows[0];

      // 3. Generate enriched content
      const enriched = await this.generateEnrichedContent({
        package_id,
        package_data: {
          name: pkg.name,
          description: pkg.description,
          full_content: pkg.full_content,
          format: pkg.format,
          subtype: pkg.subtype,
          tags: pkg.tags,
          keywords: pkg.keywords,
          language: pkg.language,
          framework: pkg.framework
        }
      });

      // 4. Build searchable text
      const searchableText = [
        pkg.name,
        pkg.description,
        enriched.ai_use_case_description,
        enriched.ai_problem_statement,
        enriched.ai_best_for,
        enriched.ai_similar_to.join(' '),
        pkg.tags?.join(' '),
        pkg.keywords?.join(' '),
        pkg.language,
        pkg.framework,
        pkg.full_content?.substring(0, 1000) // First 1000 chars of content
      ].filter(Boolean).join(' ');

      // 5. Generate embedding
      const embedding = await this.generateEmbedding(searchableText);

      // 6. Calculate content hash
      const contentHash = createHash('sha256')
        .update(searchableText)
        .digest('hex');

      // 7. Insert/update embedding in database
      const client = await this.server.pg.connect();
      try {
        await client.query('BEGIN');

        // Upsert package_embeddings
        await client.query(
          `INSERT INTO package_embeddings (
            package_id,
            ai_use_case_description,
            ai_problem_statement,
            ai_similar_to,
            ai_best_for,
            embedding,
            embedding_source_hash,
            generated_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::vector, $7, NOW(), NOW())
          ON CONFLICT (package_id) DO UPDATE SET
            ai_use_case_description = EXCLUDED.ai_use_case_description,
            ai_problem_statement = EXCLUDED.ai_problem_statement,
            ai_similar_to = EXCLUDED.ai_similar_to,
            ai_best_for = EXCLUDED.ai_best_for,
            embedding = EXCLUDED.embedding,
            embedding_source_hash = EXCLUDED.embedding_source_hash,
            updated_at = NOW()`,
          [
            package_id,
            enriched.ai_use_case_description,
            enriched.ai_problem_statement,
            enriched.ai_similar_to,
            enriched.ai_best_for,
            `[${embedding.join(',')}]`, // Format as pgvector string
            contentHash
          ]
        );

        // Associate with suggested categories
        for (const categoryName of enriched.suggested_categories) {
          const categorySlug = this.slugify(categoryName);
          await client.query(
            `INSERT INTO package_categories (package_id, category_id)
             SELECT $1, id FROM categories WHERE slug = $2
             ON CONFLICT (package_id, category_id) DO NOTHING`,
            [package_id, categorySlug]
          );
        }

        // Associate with suggested use cases
        for (const useCaseName of enriched.suggested_use_cases) {
          const useCaseSlug = this.slugify(useCaseName);
          await client.query(
            `INSERT INTO package_use_cases (package_id, use_case_id)
             SELECT $1, id FROM use_cases WHERE slug = $2
             ON CONFLICT (package_id, use_case_id) DO NOTHING`,
            [package_id, useCaseSlug]
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      this.server.log.info({ package_id, package_name: pkg.name }, 'Generated embedding successfully');

      return {
        package_id,
        package_name: pkg.name,
        success: true,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      this.server.log.error({ error, package_id }, 'Failed to generate package embedding');
      return {
        package_id,
        package_name: 'Unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Estimate cost for embedding generation
   * text-embedding-3-small: $0.00002 per 1K tokens
   * Assuming ~1500 tokens per package on average
   */
  estimateCost(packageCount: number): number {
    const tokensPerPackage = 1500;
    const costPer1kTokens = 0.00002;
    return (packageCount * tokensPerPackage / 1000) * costPer1kTokens;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
