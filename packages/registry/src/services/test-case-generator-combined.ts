/**
 * Combined Test Case Generator + Quality Scorer
 *
 * Generates AI-powered test cases AND quality scores in a single API call
 * to help users effectively test prompts and evaluate package quality.
 */

import Anthropic from '@anthropic-ai/sdk';
import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import type { Package } from '@pr-pm/types';

export interface GeneratedTestCase {
  title: string;
  description: string;
  input: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  test_type: 'concept' | 'practical' | 'edge_case' | 'comparison' | 'quality';
  expected_criteria: string[];
  tags: string[];
}

export interface QualityEvaluation {
  score: number; // 0.0 to 1.0
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CombinedAIResponse {
  quality: QualityEvaluation;
  test_cases: GeneratedTestCase[];
}

interface GenerationOptions {
  forceRegenerate?: boolean;
  minConfidence?: number;
  includeQualityScore?: boolean; // Generate quality score in same call
}

export class CombinedTestCaseGeneratorService {
  private server: FastifyInstance;
  private anthropic: Anthropic | null;

  constructor(server: FastifyInstance) {
    this.server = server;

    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;

    if (!this.anthropic) {
      this.server.log.warn('Anthropic API key not configured - test case generation will not be available');
    }
  }

  /**
   * Generate BOTH test cases AND quality score in a single AI call
   * More efficient than separate calls
   */
  async generateWithQuality(
    pkg: Package,
    content: string,
    version: string,
    options: GenerationOptions = {}
  ): Promise<{
    testCases: GeneratedTestCase[];
    qualityScore: number;
    qualityReasoning: string;
  }> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    this.server.log.info({
      action: 'generate_combined',
      package_id: pkg.id,
      package_name: pkg.name,
      version,
    }, '🧪 Generating test cases + quality score');

    try {
      const prompt = this.buildCombinedPrompt(pkg, content);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const result = this.parseCombinedResponse(response);

      // Store test cases
      await this.storeTestCases(
        'package',
        pkg.id,
        result.test_cases,
        version
      );

      // Update quality score
      if (result.quality.score > 0) {
        await this.updateQualityScore(
          pkg.id,
          result.quality.score,
          result.quality.reasoning
        );
      }

      this.server.log.info({
        package_id: pkg.id,
        test_cases_generated: result.test_cases.length,
        quality_score: result.quality.score,
      }, '✓ Combined generation complete');

      return {
        testCases: result.test_cases,
        qualityScore: result.quality.score,
        qualityReasoning: result.quality.reasoning,
      };

    } catch (error) {
      this.server.log.error({
        error: error instanceof Error ? error.message : String(error),
        package_id: pkg.id,
      }, '✗ Failed to generate combined results');
      throw error;
    }
  }

  /**
   * Build combined prompt for BOTH test cases AND quality evaluation
   * Returns strict JSON format for easy parsing
   */
  private buildCombinedPrompt(pkg: Package, content: string): string {
    const subtypeGuidance: Record<string, string> = {
      rule: 'Test concept understanding, application to real scenarios, anti-patterns detection, comparisons between approaches',
      agent: 'Test task completion capability, multi-step reasoning, error handling, output quality, edge cases',
      skill: 'Test knowledge depth, practical application, working examples, edge cases, teaching ability',
      prompt: 'Test output quality, customization options, completeness, consistency, creativity',
      'slash-command': 'Test command functionality, parameter handling, edge cases, error messages, output format',
      tool: 'Test tool functionality, integration, error handling, configuration options',
      chatmode: 'Test conversation quality, context awareness, personality consistency, helpful responses',
    };

    const guidance = subtypeGuidance[pkg.subtype] || 'Test understanding, application, and quality';

    return `You are an expert prompt engineer evaluating AI prompts and creating test cases.

Your task is to:
1. Evaluate the quality of this ${pkg.subtype} package (score 0.0 to 1.0)
2. Generate 5-10 intelligent test cases to help users evaluate it

PACKAGE INFORMATION:
- Name: ${pkg.name}
- Subtype: ${pkg.subtype}
- Category: ${pkg.category || 'General'}
- Description: ${pkg.description || 'No description'}
- Tags: ${pkg.tags?.join(', ') || 'None'}

PACKAGE CONTENT:
${content.substring(0, 4000)}${content.length > 4000 ? '\n...(truncated)' : ''}

QUALITY EVALUATION CRITERIA:
1. **Clarity** (25%) - Clear, unambiguous, easy to understand
2. **Structure** (25%) - Well-organized with logical flow
3. **Effectiveness** (30%) - Will produce reliable, high-quality outputs
4. **Best Practices** (20%) - Follows prompt engineering best practices

TEST CASE GUIDELINES FOR ${pkg.subtype.toUpperCase()}S:
${guidance}

Each test case should:
- Cover different difficulty levels (basic, intermediate, advanced)
- Include specific, detailed test inputs (not generic)
- Provide measurable expected criteria
- Help users decide if this package fits their needs

IMPORTANT: Return ONLY valid JSON in this EXACT format (no markdown, no code blocks, no explanations):

{
  "quality": {
    "score": 0.85,
    "reasoning": "2-3 sentences explaining the score",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2"]
  },
  "test_cases": [
    {
      "title": "Brief title",
      "description": "Why this test matters (1-2 sentences)",
      "input": "Exact specific prompt to test with detailed context",
      "difficulty": "basic",
      "test_type": "practical",
      "expected_criteria": [
        "Specific thing response should include",
        "Another specific criterion",
        "Third measurable criterion"
      ],
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Return ONLY the JSON object. Do not wrap in markdown code blocks.`;
  }

  /**
   * Parse combined response with strict JSON validation
   */
  private parseCombinedResponse(response: Anthropic.Message): CombinedAIResponse {
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }

    let text = content.text.trim();

    // Remove markdown code blocks if present (even though we asked not to)
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      this.server.log.error({ response: text.substring(0, 500) }, 'Failed to parse AI response as JSON');
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate structure
    if (!parsed.quality || !parsed.test_cases) {
      throw new Error('Invalid response structure: missing quality or test_cases');
    }

    if (!Array.isArray(parsed.test_cases)) {
      throw new Error('test_cases must be an array');
    }

    // Validate quality score
    if (typeof parsed.quality.score !== 'number' || parsed.quality.score < 0 || parsed.quality.score > 1) {
      this.server.log.warn({ score: parsed.quality.score }, 'Invalid quality score, clamping to 0-1');
      parsed.quality.score = Math.max(0, Math.min(1, parsed.quality.score || 0.5));
    }

    // Add confidence scores to test cases
    const testCasesWithConfidence = parsed.test_cases.map((tc: any) => ({
      ...tc,
      confidence_score: this.calculateConfidence(tc),
    }));

    return {
      quality: {
        score: parsed.quality.score,
        reasoning: parsed.quality.reasoning || 'No reasoning provided',
        strengths: Array.isArray(parsed.quality.strengths) ? parsed.quality.strengths : [],
        weaknesses: Array.isArray(parsed.quality.weaknesses) ? parsed.quality.weaknesses : [],
      },
      test_cases: testCasesWithConfidence,
    };
  }

  /**
   * Calculate confidence score based on test case quality signals
   */
  private calculateConfidence(testCase: any): number {
    let score = 0.6; // Base score

    if (testCase.expected_criteria?.length >= 3) score += 0.1;
    if (testCase.expected_criteria?.length >= 5) score += 0.05;
    if (testCase.description?.length > 50) score += 0.05;
    if (testCase.input?.length > 50) score += 0.05;
    if (testCase.input?.length > 100) score += 0.05;
    if (testCase.tags?.length >= 2) score += 0.05;
    if (testCase.tags?.length >= 4) score += 0.05;

    return Math.min(Math.round(score * 100) / 100, 1.0);
  }

  /**
   * Store test cases in database
   */
  private async storeTestCases(
    entityType: 'package' | 'collection',
    entityId: string,
    testCases: any[],
    version: string
  ): Promise<void> {
    // Deactivate old test cases
    await query(
      this.server,
      `UPDATE generated_test_cases
       SET is_active = false, updated_at = NOW()
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId]
    );

    // Insert new test cases
    for (const tc of testCases) {
      await query(
        this.server,
        `INSERT INTO generated_test_cases (
          entity_type, entity_id, title, description, input,
          difficulty, test_type, expected_criteria, tags,
          confidence_score, version_generated_from
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entityType,
          entityId,
          tc.title,
          tc.description,
          tc.input,
          tc.difficulty,
          tc.test_type,
          tc.expected_criteria,
          tc.tags,
          tc.confidence_score || 0.7,
          version,
        ]
      );
    }
  }

  /**
   * Update quality score in packages table
   */
  private async updateQualityScore(
    packageId: string,
    score: number,
    reasoning: string
  ): Promise<void> {
    await query(
      this.server,
      `UPDATE packages
       SET quality_score = $1, quality_explanation = $2, updated_at = NOW()
       WHERE id = $3`,
      [score, reasoning, packageId]
    );
  }

  /**
   * Get test cases for an entity
   */
  async getTestCases(
    entityType: 'package' | 'collection',
    entityId: string,
    options: {
      difficulty?: 'basic' | 'intermediate' | 'advanced';
      test_type?: string;
      limit?: number;
      sort?: 'confidence' | 'success_rate' | 'usage';
    } = {}
  ): Promise<any[]> {
    const conditions = [
      'entity_type = $1',
      'entity_id = $2',
      'is_active = true',
    ];
    const params: any[] = [entityType, entityId];
    let paramIndex = 3;

    if (options.difficulty) {
      conditions.push(`difficulty = $${paramIndex++}`);
      params.push(options.difficulty);
    }

    if (options.test_type) {
      conditions.push(`test_type = $${paramIndex++}`);
      params.push(options.test_type);
    }

    let orderBy = 'confidence_score DESC, success_rate DESC NULLS LAST';
    if (options.sort === 'success_rate') {
      orderBy = 'success_rate DESC NULLS LAST, confidence_score DESC';
    } else if (options.sort === 'usage') {
      orderBy = 'usage_count DESC, confidence_score DESC';
    }

    const limit = options.limit || 10;

    const result = await query(
      this.server,
      `SELECT * FROM generated_test_cases
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ${limit}`,
      params
    );

    return result.rows;
  }

  /**
   * Record test case usage
   */
  async recordUsage(testCaseId: string): Promise<void> {
    await query(
      this.server,
      'SELECT increment_test_case_usage($1)',
      [testCaseId]
    );
  }

  /**
   * Record user feedback
   */
  async recordFeedback(
    testCaseId: string,
    userId: string,
    wasHelpful: boolean,
    comment?: string
  ): Promise<void> {
    await query(
      this.server,
      `INSERT INTO test_case_feedback (test_case_id, user_id, was_helpful, feedback_comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (test_case_id, user_id)
       DO UPDATE SET
         was_helpful = $3,
         feedback_comment = $4,
         created_at = NOW()`,
      [testCaseId, userId, wasHelpful, comment]
    );
  }
}
