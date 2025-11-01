/**
 * Test Case Generator Service
 *
 * Generates AI-powered test cases for packages and collections
 * to help users effectively test prompts in the playground.
 */

import Anthropic from '@anthropic-ai/sdk';
import { FastifyInstance } from 'fastify';
import { query } from '../db/index.js';
import type { Package } from '@pr-pm/types';

export interface GeneratedTestCase {
  id?: string;
  entity_type: 'package' | 'collection';
  entity_id: string;
  title: string;
  description: string;
  input: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  test_type: 'concept' | 'practical' | 'edge_case' | 'comparison' | 'quality';
  expected_criteria: string[];
  tags: string[];
  confidence_score: number;
  version_generated_from?: string;
}

interface GenerationOptions {
  forceRegenerate?: boolean; // Regenerate even if tests exist
  minConfidence?: number; // Only save tests above this confidence score
}

export class TestCaseGeneratorService {
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
   * Generate test cases for a package
   */
  async generateForPackage(
    pkg: Package,
    content: string,
    version: string,
    options: GenerationOptions = {}
  ): Promise<GeneratedTestCase[]> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    this.server.log.info({
      action: 'generate_test_cases',
      package_id: pkg.id,
      package_name: pkg.name,
      version,
    }, '🧪 Generating test cases for package');

    // Check if we already have active tests for this version
    if (!options.forceRegenerate) {
      const existing = await this.getExistingTestCases(
        'package',
        pkg.id,
        version
      );

      if (existing.length > 0) {
        this.server.log.info(
          { package_id: pkg.id, count: existing.length },
          '✓ Using existing test cases'
        );
        return existing;
      }
    }

    try {
      const prompt = this.buildGenerationPrompt(
        'package',
        pkg,
        content
      );

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const testCases = this.parseResponse(response);

      // Filter by confidence if specified
      const minConfidence = options.minConfidence || 0.5;
      const filteredTests = testCases.filter(
        tc => tc.confidence_score >= minConfidence
      );

      // Store in database
      await this.storeTestCases(
        'package',
        pkg.id,
        filteredTests,
        version
      );

      this.server.log.info({
        package_id: pkg.id,
        generated: testCases.length,
        stored: filteredTests.length,
      }, '✓ Test cases generated and stored');

      return filteredTests;
    } catch (error) {
      this.server.log.error({
        error: error instanceof Error ? error.message : String(error),
        package_id: pkg.id,
      }, '✗ Failed to generate test cases');
      throw error;
    }
  }

  /**
   * Generate test cases for a collection
   */
  async generateForCollection(
    collectionId: string,
    collectionName: string,
    collectionDescription: string,
    packageNames: string[],
    version: string,
    options: GenerationOptions = {}
  ): Promise<GeneratedTestCase[]> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    this.server.log.info({
      action: 'generate_test_cases',
      collection_id: collectionId,
      collection_name: collectionName,
      package_count: packageNames.length,
    }, '🧪 Generating test cases for collection');

    // Check existing
    if (!options.forceRegenerate) {
      const existing = await this.getExistingTestCases(
        'collection',
        collectionId,
        version
      );

      if (existing.length > 0) {
        this.server.log.info(
          { collection_id: collectionId, count: existing.length },
          '✓ Using existing test cases'
        );
        return existing;
      }
    }

    try {
      const prompt = this.buildCollectionPrompt(
        collectionName,
        collectionDescription,
        packageNames
      );

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const testCases = this.parseResponse(response);

      // Filter by confidence
      const minConfidence = options.minConfidence || 0.5;
      const filteredTests = testCases.filter(
        tc => tc.confidence_score >= minConfidence
      );

      // Store in database
      await this.storeTestCases(
        'collection',
        collectionId,
        filteredTests,
        version
      );

      this.server.log.info({
        collection_id: collectionId,
        generated: testCases.length,
        stored: filteredTests.length,
      }, '✓ Collection test cases generated');

      return filteredTests;
    } catch (error) {
      this.server.log.error({
        error: error instanceof Error ? error.message : String(error),
        collection_id: collectionId,
      }, '✗ Failed to generate collection test cases');
      throw error;
    }
  }

  /**
   * Build generation prompt for packages
   */
  private buildGenerationPrompt(
    entityType: 'package' | 'collection',
    pkg: Package,
    content: string
  ): string {
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

    return `You are an expert at testing AI prompts and creating evaluation criteria.

Analyze this ${pkg.subtype} package and generate 5-10 intelligent test cases that will help users evaluate its effectiveness in the playground.

PACKAGE INFORMATION:
- Name: ${pkg.name}
- Subtype: ${pkg.subtype}
- Category: ${pkg.category || 'General'}
- Description: ${pkg.description || 'No description provided'}
- Tags: ${pkg.tags?.join(', ') || 'None'}
- Keywords: ${pkg.keywords?.join(', ') || 'None'}

PACKAGE CONTENT:
${content.substring(0, 3000)}${content.length > 3000 ? '\n...(truncated for length)' : ''}

GUIDANCE FOR ${pkg.subtype.toUpperCase()}S:
${guidance}

Generate test cases covering:
1. **Basic** (newcomer friendly, tests fundamentals)
2. **Intermediate** (practical scenarios, real-world use cases)
3. **Advanced** (edge cases, complex scenarios, deep knowledge)

Each test case MUST include:
- title: Brief, clear title (max 50 chars)
- description: Why this test matters and what it evaluates (1-2 sentences)
- input: Exact prompt users should try (be specific and detailed)
- difficulty: "basic" | "intermediate" | "advanced"
- test_type: "concept" | "practical" | "edge_case" | "comparison" | "quality"
- expected_criteria: Array of 3-5 specific things a good response should include
- tags: 2-4 relevant tags for filtering

IMPORTANT REQUIREMENTS:
- Make test inputs SPECIFIC to this package's domain and purpose
- Include both "happy path" and challenging scenarios
- Expected criteria should be MEASURABLE and SPECIFIC
- Inputs should be detailed enough to get useful responses
- Tests should help users decide if this package fits their needs

Return ONLY a valid JSON array of test cases, no markdown formatting, no explanations.

Example format:
[
  {
    "title": "Component Structure Basics",
    "description": "Tests understanding of fundamental React component organization patterns",
    "input": "How should I structure a React component that displays user profile information with avatar, name, bio, and social links?",
    "difficulty": "basic",
    "test_type": "practical",
    "expected_criteria": [
      "Mentions functional components",
      "Discusses single responsibility principle",
      "Includes prop validation or TypeScript types",
      "Shows example code structure",
      "Mentions hooks for state/effects if needed"
    ],
    "tags": ["components", "structure", "basics"]
  }
]`;
  }

  /**
   * Build generation prompt for collections
   */
  private buildCollectionPrompt(
    name: string,
    description: string,
    packageNames: string[]
  ): string {
    return `You are an expert at testing AI prompt collections and creating evaluation criteria.

Analyze this collection and generate 5-8 intelligent test cases that will help users evaluate how well the packages work together.

COLLECTION INFORMATION:
- Name: ${name}
- Description: ${description}
- Included Packages: ${packageNames.join(', ')}
- Package Count: ${packageNames.length}

Generate test cases that:
1. Test how packages work together (integration)
2. Test the collection's stated purpose
3. Cover different use cases the collection enables
4. Test both simple and complex scenarios

Each test case MUST include:
- title: Brief, clear title
- description: Why this test matters
- input: Exact prompt users should try
- difficulty: "basic" | "intermediate" | "advanced"
- test_type: "concept" | "practical" | "edge_case" | "comparison" | "quality"
- expected_criteria: Array of 3-5 things a good response should include
- tags: 2-4 relevant tags

Return ONLY a valid JSON array, no markdown formatting.`;
  }

  /**
   * Parse AI response and extract test cases
   */
  private parseResponse(response: Anthropic.Message): GeneratedTestCase[] {
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }

    const text = content.text;

    // Remove markdown code blocks if present
    const jsonStr = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let testCases: any[];
    try {
      testCases = JSON.parse(jsonStr);
    } catch (error) {
      this.server.log.error({ response: text }, 'Failed to parse AI response');
      throw new Error('Failed to parse test cases from AI response');
    }

    if (!Array.isArray(testCases)) {
      throw new Error('AI response is not an array');
    }

    // Add confidence scores and validate
    return testCases.map(tc => ({
      ...tc,
      confidence_score: this.calculateConfidence(tc),
    }));
  }

  /**
   * Calculate confidence score based on quality signals
   */
  private calculateConfidence(testCase: any): number {
    let score = 0.6; // Base score

    // Quality signals (each adds to confidence)
    if (testCase.expected_criteria?.length >= 3) score += 0.1;
    if (testCase.expected_criteria?.length >= 5) score += 0.05;
    if (testCase.description?.length > 50) score += 0.05;
    if (testCase.input?.length > 50) score += 0.05;
    if (testCase.input?.length > 100) score += 0.05;
    if (testCase.tags?.length >= 2) score += 0.05;
    if (testCase.tags?.length >= 4) score += 0.05;
    if (testCase.input?.includes('?')) score += 0.05; // Well-formed question

    return Math.min(Math.round(score * 100) / 100, 1.0);
  }

  /**
   * Get existing test cases
   */
  private async getExistingTestCases(
    entityType: 'package' | 'collection',
    entityId: string,
    version?: string
  ): Promise<GeneratedTestCase[]> {
    const versionClause = version
      ? 'AND version_generated_from = $3'
      : '';

    const params = version
      ? [entityType, entityId, version]
      : [entityType, entityId];

    const result = await query<GeneratedTestCase>(
      this.server,
      `SELECT * FROM generated_test_cases
       WHERE entity_type = $1
         AND entity_id = $2
         AND is_active = true
         ${versionClause}
       ORDER BY confidence_score DESC, success_rate DESC NULLS LAST`,
      params
    );

    return result.rows;
  }

  /**
   * Store test cases in database
   */
  private async storeTestCases(
    entityType: 'package' | 'collection',
    entityId: string,
    testCases: GeneratedTestCase[],
    version: string
  ): Promise<void> {
    // Deactivate old test cases for this entity
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
          tc.confidence_score,
          version,
        ]
      );
    }
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
   * Record user feedback on test case
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
  ): Promise<GeneratedTestCase[]> {
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

    const result = await query<GeneratedTestCase>(
      this.server,
      `SELECT * FROM generated_test_cases
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ${limit}`,
      params
    );

    return result.rows;
  }
}
