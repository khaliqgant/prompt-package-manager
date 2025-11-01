# AI-Powered Test Case + Quality Score Generation System

**Purpose**: Automatically generate intelligent test cases and quality scores for AI prompts/packages using a single AI call.

**Key Innovation**: Combined generation in one API call = 50% cost savings + faster execution.

---

## Overview

This system uses Claude Sonnet to analyze packages and generate:
1. **Quality Score** (0.0-1.0) with reasoning, strengths, and weaknesses
2. **Test Cases** (5-10 per package) with difficulty levels and expected criteria

### Benefits

- ✅ **Intelligent Testing**: AI-generated, package-specific test cases
- ✅ **Quality Assessment**: Automated evaluation with detailed feedback
- ✅ **Cost Efficient**: 50% savings vs separate calls
- ✅ **User Guidance**: Helps users effectively test prompts
- ✅ **Self-Improving**: Tracks usage analytics and user feedback

---

## Database Schema

### Test Cases Table

```sql
CREATE TABLE generated_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) CHECK (entity_type IN ('package', 'collection')),
  entity_id UUID NOT NULL,

  -- Test case content
  title VARCHAR(200) NOT NULL,
  description TEXT,
  input TEXT NOT NULL,
  difficulty VARCHAR(20) CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  test_type VARCHAR(50) CHECK (test_type IN ('concept', 'practical', 'edge_case', 'comparison', 'quality')),
  expected_criteria TEXT[],
  tags TEXT[],

  -- Metadata
  confidence_score DECIMAL(3,2),
  version_generated_from VARCHAR(50),
  is_active BOOLEAN DEFAULT true,

  -- Analytics
  usage_count INT DEFAULT 0,
  helpful_votes INT DEFAULT 0,
  unhelpful_votes INT DEFAULT 0,
  success_rate DECIMAL(3,2),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test_case_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES generated_test_cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  was_helpful BOOLEAN NOT NULL,
  feedback_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(test_case_id, user_id)
);
```

### Package Quality Fields

```sql
-- Add to packages table
ALTER TABLE packages ADD COLUMN quality_score DECIMAL(3,2);
ALTER TABLE packages ADD COLUMN quality_explanation TEXT;
```

---

## Service Implementation

### Combined Generator Service

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FastifyInstance } from 'fastify';

export interface QualityEvaluation {
  score: number; // 0.0 to 1.0
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

export interface GeneratedTestCase {
  title: string;
  description: string;
  input: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  test_type: 'concept' | 'practical' | 'edge_case' | 'comparison' | 'quality';
  expected_criteria: string[];
  tags: string[];
}

export interface CombinedAIResponse {
  quality: QualityEvaluation;
  test_cases: GeneratedTestCase[];
}

export class CombinedTestCaseGeneratorService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate both test cases AND quality score in single AI call
   */
  async generateWithQuality(
    packageData: {
      name: string;
      subtype: string;
      category?: string;
      description?: string;
      tags?: string[];
    },
    content: string
  ): Promise<CombinedAIResponse> {
    const prompt = this.buildCombinedPrompt(packageData, content);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    return this.parseCombinedResponse(response);
  }

  private buildCombinedPrompt(packageData: any, content: string): string {
    const subtypeGuidance: Record<string, string> = {
      rule: 'Test concept understanding, application to scenarios, anti-patterns, comparisons',
      agent: 'Test task completion, multi-step reasoning, error handling, output quality',
      skill: 'Test knowledge depth, practical application, examples, edge cases',
      prompt: 'Test output quality, customization options, completeness, consistency',
    };

    const guidance = subtypeGuidance[packageData.subtype] || 'Test understanding and quality';

    return `You are an expert prompt engineer evaluating AI prompts and creating test cases.

Your task is to:
1. Evaluate the quality of this ${packageData.subtype} package (score 0.0 to 1.0)
2. Generate 5-10 intelligent test cases to help users evaluate it

PACKAGE INFORMATION:
- Name: ${packageData.name}
- Subtype: ${packageData.subtype}
- Category: ${packageData.category || 'General'}
- Description: ${packageData.description || 'No description'}
- Tags: ${packageData.tags?.join(', ') || 'None'}

PACKAGE CONTENT:
${content.substring(0, 4000)}${content.length > 4000 ? '\n...(truncated)' : ''}

QUALITY EVALUATION CRITERIA:
1. **Clarity** (25%) - Clear, unambiguous, easy to understand
2. **Structure** (25%) - Well-organized with logical flow
3. **Effectiveness** (30%) - Will produce reliable, high-quality outputs
4. **Best Practices** (20%) - Follows prompt engineering best practices

TEST CASE GUIDELINES FOR ${packageData.subtype.toUpperCase()}S:
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

  private parseCombinedResponse(response: Anthropic.Message): CombinedAIResponse {
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Strip markdown code blocks
    let text = content.text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(text);

    // Validate structure
    if (!parsed.quality || !parsed.test_cases) {
      throw new Error('Invalid structure: missing quality or test_cases');
    }

    // Clamp quality score to 0-1
    parsed.quality.score = Math.max(0, Math.min(1, parsed.quality.score || 0.5));

    return parsed;
  }
}
```

---

## API Endpoints

### Get Test Cases

```
GET /api/v1/packages/:packageId/test-cases
GET /api/v1/collections/:collectionId/test-cases

Query Parameters:
  ?difficulty=basic|intermediate|advanced
  &test_type=concept|practical|edge_case|comparison|quality
  &limit=10
  &sort=confidence|success_rate|usage

Response:
{
  "test_cases": [
    {
      "id": "uuid",
      "title": "Component Structure Basics",
      "description": "Tests understanding of fundamental patterns",
      "input": "How should I structure a React component...",
      "difficulty": "basic",
      "test_type": "practical",
      "expected_criteria": ["Mentions functional components", "..."],
      "tags": ["react", "basics"],
      "confidence_score": 0.85,
      "usage_count": 42,
      "success_rate": 0.87
    }
  ],
  "total": 8
}
```

### Record Usage

```
POST /api/v1/test-cases/record-usage
Body: { "test_case_id": "uuid" }
```

### Submit Feedback

```
POST /api/v1/test-cases/feedback
Body: {
  "test_case_id": "uuid",
  "was_helpful": true,
  "feedback_comment": "Great test!"
}
```

---

## Batch Generation Script

```typescript
#!/usr/bin/env tsx
import { CombinedTestCaseGeneratorService } from './service';

async function generateForAllPackages() {
  const generator = new CombinedTestCaseGeneratorService(
    process.env.ANTHROPIC_API_KEY!
  );

  const packages = await getPackages(); // Your DB query

  for (const pkg of packages) {
    try {
      const result = await generator.generateWithQuality(
        {
          name: pkg.name,
          subtype: pkg.subtype,
          category: pkg.category,
          description: pkg.description,
          tags: pkg.tags,
        },
        pkg.content
      );

      // Store test cases
      await storeTestCases(pkg.id, result.test_cases);

      // Update quality score
      await updateQualityScore(
        pkg.id,
        result.quality.score,
        result.quality.reasoning
      );

      console.log(`✓ ${pkg.name}: ${result.test_cases.length} tests, quality ${result.quality.score}`);

      // Rate limiting
      await sleep(1500);
    } catch (error) {
      console.error(`✗ ${pkg.name}:`, error.message);
    }
  }
}
```

---

## Integration Steps

### 1. Database Setup

```bash
# Run migration
psql -d your_database -f migrations/add_test_cases.sql
```

### 2. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

### 3. Environment Configuration

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Generate Test Cases

```typescript
import { CombinedTestCaseGeneratorService } from './services/test-case-generator';

const generator = new CombinedTestCaseGeneratorService(
  process.env.ANTHROPIC_API_KEY!
);

const result = await generator.generateWithQuality(packageData, content);

// result.quality.score (0.0-1.0)
// result.quality.reasoning
// result.test_cases[] (5-10 tests)
```

### 5. Display in UI

```typescript
// Fetch test cases
const response = await fetch(`/api/v1/packages/${id}/test-cases?limit=5`);
const { test_cases } = await response.json();

// Display
{test_cases.map(tc => (
  <TestCaseCard
    key={tc.id}
    title={tc.title}
    description={tc.description}
    difficulty={tc.difficulty}
    onUse={() => runTest(tc.input)}
  />
))}

// Record usage when user clicks
await fetch('/api/v1/test-cases/record-usage', {
  method: 'POST',
  body: JSON.stringify({ test_case_id: tc.id })
});
```

---

## Cost Analysis

### Per Package

**Single Combined Call**:
- Input: ~2,500 tokens (package metadata + content)
- Output: ~2,000 tokens (quality + 5-10 test cases)
- Cost: ~$0.010 per package

**Comparison to Separate Calls**:
- Separate: ~$0.020 per package (test cases + quality score separately)
- Combined: ~$0.010 per package
- **Savings**: 50%

### For 1,000 Packages

- Combined approach: $10
- Separate calls: $20
- **Total savings**: $10 (50%)

**Additional benefits**:
- ⚡ 2x faster (single round-trip)
- 🎯 More consistent (same AI context)
- 🔧 Simpler code (one service call)

---

## Response Format Example

```json
{
  "quality": {
    "score": 0.875,
    "reasoning": "This prompt demonstrates excellent structure with clear sections, comprehensive coverage of React patterns, and specific examples. The organization follows best practices with logical flow from basics to advanced concepts.",
    "strengths": [
      "Well-organized with clear hierarchical structure",
      "Includes specific code examples for each pattern",
      "Follows modern React best practices (hooks, functional components)"
    ],
    "weaknesses": [
      "Could include more edge case handling scenarios",
      "Performance optimization guidance could be expanded"
    ]
  },
  "test_cases": [
    {
      "title": "Component Structure Basics",
      "description": "Tests understanding of fundamental React component organization and patterns",
      "input": "How should I structure a React component that displays user profile information with avatar, name, bio, and a list of social links?",
      "difficulty": "basic",
      "test_type": "practical",
      "expected_criteria": [
        "Mentions functional components over class components",
        "Discusses single responsibility principle",
        "Includes prop validation or TypeScript types",
        "Shows example code structure",
        "Mentions hooks (useState, useEffect) if state is needed"
      ],
      "tags": ["react", "components", "structure", "basics"]
    },
    {
      "title": "State Management Decision",
      "description": "Tests ability to guide state management architecture choices",
      "input": "I need to share user authentication state across my React app. Should I use Context, Redux, Zustand, or something else? The app has 15 routes and will grow.",
      "difficulty": "intermediate",
      "test_type": "comparison",
      "expected_criteria": [
        "Compares different state management solutions",
        "Provides decision criteria based on app size and complexity",
        "Mentions trade-offs (bundle size, learning curve, boilerplate)",
        "Gives specific recommendation with reasoning",
        "Shows example implementation for recommended approach"
      ],
      "tags": ["state-management", "architecture", "decision-making", "scaling"]
    },
    {
      "title": "Performance Optimization",
      "description": "Tests knowledge of React performance optimization techniques",
      "input": "My component re-renders on every keystroke in a form and it's causing lag. Here's the code: [component with performance issue]. How do I optimize this?",
      "difficulty": "advanced",
      "test_type": "edge_case",
      "expected_criteria": [
        "Identifies the performance issue (unnecessary re-renders)",
        "Explains why it's happening (component structure, state updates)",
        "Suggests specific optimizations (useMemo, useCallback, React.memo)",
        "Shows refactored code with improvements",
        "Mentions profiling tools (React DevTools Profiler)"
      ],
      "tags": ["performance", "optimization", "debugging", "advanced"]
    }
  ]
}
```

---

## Analytics & Monitoring

### Track Test Case Effectiveness

```sql
-- Most helpful test cases
SELECT
  title,
  success_rate,
  usage_count,
  helpful_votes,
  unhelpful_votes
FROM generated_test_cases
WHERE success_rate > 0.8
  AND usage_count > 10
ORDER BY success_rate DESC, usage_count DESC
LIMIT 20;

-- Coverage by difficulty
SELECT
  difficulty,
  COUNT(*) as total_tests,
  AVG(success_rate) as avg_success_rate,
  SUM(usage_count) as total_usage
FROM generated_test_cases
WHERE is_active = true
GROUP BY difficulty;

-- Quality score distribution
SELECT
  ROUND(quality_score, 1) as score_range,
  COUNT(*) as package_count
FROM packages
WHERE quality_score IS NOT NULL
GROUP BY ROUND(quality_score, 1)
ORDER BY score_range DESC;
```

---

## Best Practices

### 1. Rate Limiting

```typescript
// Wait 1-2 seconds between API calls
await sleep(1500);
```

### 2. Error Handling

```typescript
try {
  const result = await generator.generateWithQuality(pkg, content);
} catch (error) {
  if (error.message.includes('rate_limit')) {
    await sleep(5000); // Backoff
    // Retry
  } else {
    console.error('Generation failed:', error);
    // Continue with next package
  }
}
```

### 3. Validation

```typescript
// Validate quality score
if (result.quality.score < 0 || result.quality.score > 1) {
  console.warn('Invalid quality score, clamping to 0-1');
  result.quality.score = Math.max(0, Math.min(1, result.quality.score));
}

// Validate test case count
if (result.test_cases.length < 3 || result.test_cases.length > 12) {
  console.warn(`Unexpected test case count: ${result.test_cases.length}`);
}
```

### 4. Caching

```typescript
// Don't regenerate if tests already exist
const existing = await getExistingTestCases(packageId);
if (existing.length > 0 && !forceRegenerate) {
  return existing;
}
```

---

## Troubleshooting

### JSON Parse Errors

**Issue**: AI returns markdown-wrapped JSON despite instructions

**Solution**: Strip markdown before parsing
```typescript
text = text
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();
```

### Low Confidence Scores

**Issue**: Test cases have low confidence scores (<0.5)

**Check**:
- Package content quality (is it substantial?)
- Test case criteria count (should be 3-5)
- Test input specificity (should be detailed, not generic)

### Rate Limiting

**Issue**: 429 errors from Anthropic API

**Solution**:
- Increase sleep time between calls (2-3 seconds)
- Implement exponential backoff
- Use batch processing with queues

---

## Migration Path

If you have existing separate quality scoring:

```typescript
// Before: Separate calls
const qualityScore = await qualityScorer.calculate(pkg);
const testCases = await testGenerator.generate(pkg);

// After: Combined call
const { qualityScore, testCases } = await combinedGenerator.generateWithQuality(pkg, content);

// Same data structure, 50% cost savings
```

---

## Summary

**What**: AI-powered test case + quality score generation in single call
**Why**: 50% cost savings, faster, more consistent
**How**: Single JSON prompt → Parse response → Store results
**Cost**: ~$0.01 per package (~$10 for 1,000 packages)
**Model**: Claude Sonnet 4
**Output**: 5-10 test cases + quality score (0-1) per package

**Key Files to Export**:
- Database migration SQL
- `CombinedTestCaseGeneratorService` class
- API route handlers
- Batch generation script

**Integration**: 4 steps (DB setup, install deps, set API key, run generation)

**ROI**: Significant cost savings + better user experience through intelligent test suggestions
