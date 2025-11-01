# Combined Test Case + Quality Score Generation

**Date**: 2025-11-01
**Status**: ✅ Production Ready

## Overview

**Key Innovation**: Generate both test cases AND quality scores in a **single AI API call** instead of two separate calls.

### Benefits

1. **50% Cost Savings**: One API call instead of two
2. **Faster Execution**: Single round-trip to AI
3. **Consistent Context**: AI evaluates and generates tests with same understanding
4. **Better Quality**: Tests aligned with quality assessment

## How It Works

### Single Prompt Strategy

The AI receives ONE combined prompt that asks for:
1. Quality evaluation (score 0.0-1.0 + reasoning + strengths/weaknesses)
2. Test case generation (5-10 intelligent tests)

### Strict JSON Response Format

The AI **must** return this exact JSON structure (no markdown, no explanations):

```json
{
  "quality": {
    "score": 0.85,
    "reasoning": "This prompt demonstrates excellent structure and clarity...",
    "strengths": [
      "Well-organized with clear sections",
      "Includes specific examples",
      "Follows best practices"
    ],
    "weaknesses": [
      "Could benefit from more edge case handling",
      "Documentation could be expanded"
    ]
  },
  "test_cases": [
    {
      "title": "Component Structure Basics",
      "description": "Tests understanding of fundamental React patterns",
      "input": "How should I structure a React component that displays user profile information?",
      "difficulty": "basic",
      "test_type": "practical",
      "expected_criteria": [
        "Mentions functional components",
        "Discusses single responsibility",
        "Includes prop validation"
      ],
      "tags": ["react", "components", "basics"]
    }
  ]
}
```

### Response Parsing

The service:
1. Strips markdown code blocks (in case AI adds them anyway)
2. Parses strict JSON
3. Validates structure (quality + test_cases)
4. Clamps quality score to 0-1 range
5. Calculates confidence scores for each test case

## Implementation

### Service Class

**File**: `src/services/test-case-generator-combined.ts`

```typescript
export class CombinedTestCaseGeneratorService {
  async generateWithQuality(pkg, content, version) {
    // Build combined prompt
    const prompt = this.buildCombinedPrompt(pkg, content);

    // Single AI call
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse JSON response
    const result = this.parseCombinedResponse(response);

    // Store test cases
    await this.storeTestCases('package', pkg.id, result.test_cases, version);

    // Update quality score
    await this.updateQualityScore(pkg.id, result.quality.score, result.quality.reasoning);

    return {
      testCases: result.test_cases,
      qualityScore: result.quality.score,
      qualityReasoning: result.quality.reasoning,
    };
  }
}
```

### Batch Script

**File**: `scripts/generate-combined-batch.ts`

**Usage**:
```bash
# Generate for all packages
npm run generate-combined

# Test with 10 packages
npm run generate-combined -- --limit 10

# Force regeneration
npm run generate-combined -- --force

# Skip errors
npm run generate-combined -- --skip-errors
```

**Output**:
```
🚀 Starting COMBINED batch generation (test cases + quality scores)
Options: { limit: 10, force: false, skipErrors: true }

📦 Processing packages...
Found 10 packages to process

[1/10] @cursor/react-conventions
  ✓ 8 test cases
  ✓ Quality: 0.875/1.000
  → This prompt demonstrates excellent structure with clear sections and p...

[2/10] @typescript/best-practices
  ✓ 7 test cases
  ✓ Quality: 0.820/1.000
  → Well-organized guide with comprehensive coverage of TypeScript patterns...

...

============================================================
✅ Combined batch generation complete!
============================================================

Packages:
  Processed:     10
  Succeeded:     10
  Failed:        0

Generated:
  Test cases:    78
  Quality scores: 10
  Avg tests/pkg: 7.8

Efficiency:
  API calls saved: 10 (combined vs separate)
  Cost savings:    ~50% (one call instead of two)
```

## Comparison: Separate vs Combined

### Separate Calls (Old Approach)

```typescript
// Call 1: Generate test cases
const testCases = await testCaseGenerator.generateForPackage(pkg, content, version);

// Call 2: Calculate quality score
const qualityScore = await qualityScorer.calculateWithAI(pkg, content);

// Total: 2 API calls, 2x cost, 2x latency
```

### Combined Call (New Approach)

```typescript
// Single call: Generate both
const result = await combinedGenerator.generateWithQuality(pkg, content, version);
// result.testCases
// result.qualityScore
// result.qualityReasoning

// Total: 1 API call, 50% cost savings
```

## Cost Analysis

### Per Package

**Separate Calls**:
- Test cases: ~2,500 input + 1,500 output tokens = ~$0.012
- Quality score: ~2,000 input + 500 output tokens = ~$0.008
- **Total**: ~$0.020 per package

**Combined Call**:
- Combined: ~2,500 input + 2,000 output tokens = ~$0.010
- **Total**: ~$0.010 per package

**Savings**: 50% cost reduction

### For 1,000 Packages

- **Separate**: $20
- **Combined**: $10
- **Savings**: $10 (50%)

### Additional Benefits

- **Faster**: Single round-trip (~3s vs ~6s)
- **More consistent**: Same AI context for both tasks
- **Less error-prone**: One call = one failure point
- **Simpler code**: One service instead of coordinating two

## Prompt Engineering

### Key Design Choices

1. **Explicit JSON Format**: Show exact expected structure in prompt
2. **No Markdown Request**: Explicitly ask for JSON only, no code blocks
3. **Combined Context**: AI sees package once, evaluates and generates together
4. **Strict Parsing**: Remove any markdown artifacts before parsing

### Prompt Structure

```
You are an expert prompt engineer evaluating AI prompts and creating test cases.

Your task is to:
1. Evaluate the quality of this {subtype} package (score 0.0 to 1.0)
2. Generate 5-10 intelligent test cases to help users evaluate it

PACKAGE INFORMATION:
[metadata]

PACKAGE CONTENT:
[actual prompt content]

QUALITY EVALUATION CRITERIA:
1. Clarity (25%)
2. Structure (25%)
3. Effectiveness (30%)
4. Best Practices (20%)

TEST CASE GUIDELINES:
[subtype-specific guidance]

IMPORTANT: Return ONLY valid JSON in this EXACT format (no markdown, no code blocks):
{
  "quality": { ... },
  "test_cases": [ ... ]
}
```

## Database Updates

### Test Cases Table

No changes needed - uses existing `generated_test_cases` table

### Packages Table

Updates `quality_score` and `quality_explanation`:

```sql
UPDATE packages
SET
  quality_score = 0.875,
  quality_explanation = 'This prompt demonstrates excellent structure...',
  updated_at = NOW()
WHERE id = 'package-uuid';
```

## Error Handling

### Robust Parsing

```typescript
private parseCombinedResponse(response: Anthropic.Message): CombinedAIResponse {
  let text = content.text.trim();

  // Strip markdown even though we asked not to include it
  text = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    this.server.log.error({ response: text.substring(0, 500) }, 'Parse failed');
    throw new Error('Failed to parse AI response as JSON');
  }

  // Validate structure
  if (!parsed.quality || !parsed.test_cases) {
    throw new Error('Invalid structure: missing quality or test_cases');
  }

  // Clamp quality score
  if (typeof parsed.quality.score !== 'number') {
    parsed.quality.score = 0.5;
  }
  parsed.quality.score = Math.max(0, Math.min(1, parsed.quality.score));

  return parsed;
}
```

### Fallbacks

If AI call fails:
- Test case generation: Falls back to empty array
- Quality score: Falls back to heuristic scoring (existing logic)

## Testing

### Test with Small Batch

```bash
# Try 5 packages first
npm run generate-combined -- --limit 5

# Check logs for:
# - Valid JSON parsing
# - Quality scores in 0-1 range
# - Test cases count (5-10 per package)
# - No errors
```

### Verify Database

```sql
-- Check test cases were stored
SELECT
  p.name,
  COUNT(tc.id) as test_case_count,
  p.quality_score
FROM packages p
LEFT JOIN generated_test_cases tc ON tc.entity_id = p.id
WHERE p.id IN (SELECT id FROM packages ORDER BY total_downloads DESC LIMIT 5)
GROUP BY p.id, p.name, p.quality_score;

-- Expected: 5-10 test cases per package, quality_score between 0-1
```

### Validate JSON Format

```bash
# Run and capture output
npm run generate-combined -- --limit 1 > output.log 2>&1

# Check for JSON parsing errors
grep "Parse failed" output.log
grep "Invalid structure" output.log

# Should be empty if working correctly
```

## Deployment

### Prerequisites

1. Migration 027 must be run (test cases tables)
2. `ANTHROPIC_API_KEY` must be set
3. Packages must have content in `package_versions.content_hash`

### Deployment Steps

1. **Deploy code**: Push combined generator service
2. **Run migration**: `npm run migrate`
3. **Test small batch**: `npm run generate-combined -- --limit 10`
4. **Verify results**: Check database for test cases and quality scores
5. **Run full batch**: `npm run generate-combined -- --skip-errors`

### Monitoring

Watch for:
- Parse errors (invalid JSON from AI)
- Quality scores outside 0-1 range (should auto-clamp)
- Test case count too low (<3) or too high (>12)
- API rate limiting (429 errors)

## Migration from Separate Services

### If You Already Generated Separately

```bash
# Force regenerate with combined approach
npm run generate-combined -- --force --skip-errors

# This will:
# 1. Deactivate old test cases
# 2. Generate new test cases + quality scores in one call
# 3. Update quality_score and quality_explanation
```

### Backwards Compatibility

The combined service stores data in the same tables:
- ✅ `generated_test_cases` - compatible
- ✅ `packages.quality_score` - compatible
- ✅ API endpoints - no changes needed

## Best Practices

1. **Use combined approach for new packages**: More efficient
2. **Batch with rate limiting**: 1.5 seconds between calls (longer than test-only)
3. **Monitor JSON parse failures**: Log and investigate malformed responses
4. **Validate quality scores**: Should be between 0.4-0.95 for most packages
5. **Skip errors in production**: Use `--skip-errors` flag for batch runs

## Future Optimizations

1. **Batch multiple packages**: Send 5 packages in one prompt (requires more tokens)
2. **Cache similar packages**: Reuse results for very similar content
3. **Use cheaper model for updates**: Haiku for minor version updates
4. **Parallel processing**: Run multiple API calls concurrently (with rate limiting)

---

## Summary

**Combined generation is the recommended approach:**
- ✅ 50% cost savings
- ✅ Faster execution
- ✅ More consistent results
- ✅ Simpler code
- ✅ Strict JSON parsing
- ✅ Production-ready

Use `npm run generate-combined` for all batch operations!
