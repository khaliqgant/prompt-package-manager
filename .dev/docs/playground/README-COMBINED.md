# AI-Generated Test Cases + Quality Scores (Combined)

**TL;DR**: Generate both test cases AND quality scores in a single AI call. 50% cost savings, faster, and better results.

## Quick Start

### 1. Run Migration

```bash
cd packages/registry
npm run migrate
```

This creates the `generated_test_cases` and `test_case_feedback` tables.

### 2. Set API Key

```bash
# In .env or environment
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Generate for All Packages

```bash
# Test with 5 packages first
npm run generate-combined -- --limit 5

# Then run for all
npm run generate-combined -- --skip-errors
```

### 4. Use in Frontend

```typescript
// Get test cases
const response = await fetch(`/api/v1/packages/${packageId}/test-cases`);
const { test_cases } = await response.json();

// Display quality score (already updated in packages table)
const pkg = await fetch(`/api/v1/packages/${packageId}`);
console.log(pkg.quality_score); // 0.0 - 1.0
```

## What Gets Generated

### Per Package

**Quality Evaluation**:
- Score: 0.0 to 1.0
- Reasoning: 2-3 sentences explaining why
- Strengths: 2-4 positive points
- Weaknesses: 1-3 areas for improvement

**Test Cases** (5-10 per package):
- Title + description
- Specific test input prompt
- Difficulty: basic, intermediate, advanced
- Type: concept, practical, edge_case, comparison, quality
- Expected criteria: 3-5 measurable things good responses should include
- Tags: 2-4 relevant tags

### Example Output

```json
{
  "quality": {
    "score": 0.875,
    "reasoning": "This prompt demonstrates excellent structure with clear sections and comprehensive coverage of React patterns.",
    "strengths": [
      "Well-organized with logical flow",
      "Includes specific code examples",
      "Follows best practices for component design"
    ],
    "weaknesses": [
      "Could include more edge case handling",
      "Performance considerations could be expanded"
    ]
  },
  "test_cases": [
    {
      "title": "Component Structure Basics",
      "description": "Tests understanding of fundamental React component organization",
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
      "tags": ["react", "components", "structure", "basics"]
    }
    // ... 4-9 more test cases
  ]
}
```

## How It Works

### Single AI Call

Instead of:
1. ❌ Call AI for quality score
2. ❌ Call AI for test cases
3. ❌ Total: 2 calls, 2x cost

We do:
1. ✅ Call AI once with combined prompt
2. ✅ Get both quality + test cases in single JSON response
3. ✅ Total: 1 call, 50% cost savings

### Strict JSON Format

The AI returns ONLY JSON (no markdown, no explanations):

```json
{
  "quality": { "score": 0.85, "reasoning": "...", "strengths": [...], "weaknesses": [...] },
  "test_cases": [ {...}, {...}, ... ]
}
```

The service:
- Parses JSON (with markdown stripping fallback)
- Validates structure
- Stores test cases in `generated_test_cases` table
- Updates `packages.quality_score` and `packages.quality_explanation`

## Cost Comparison

### For 1,000 Packages

**Separate Calls**:
- Test cases: 1,000 × $0.012 = $12
- Quality scores: 1,000 × $0.008 = $8
- **Total**: $20

**Combined Calls**:
- Combined: 1,000 × $0.010 = $10
- **Total**: $10

**Savings**: $10 (50%)

Plus: Faster execution, more consistent results.

## API Endpoints

All existing endpoints work unchanged:

```bash
# Get test cases for a package
GET /api/v1/packages/:packageId/test-cases
  ?difficulty=basic
  &test_type=practical
  &limit=5
  &sort=confidence

# Get test cases for a collection
GET /api/v1/collections/:collectionId/test-cases

# Record usage (analytics)
POST /api/v1/test-cases/record-usage
{ "test_case_id": "uuid" }

# Submit feedback (requires auth)
POST /api/v1/test-cases/feedback
{ "test_case_id": "uuid", "was_helpful": true, "feedback_comment": "Great test!" }
```

## Files Created

### Database

- `migrations/027_add_generated_test_cases.sql` - Tables and triggers

### Services

- `src/services/test-case-generator-combined.ts` - Combined AI generation
- `src/services/test-case-generator.ts` - Original (test-cases only)

### Routes

- `src/routes/test-cases.ts` - API endpoints
- Updated `src/routes/index.ts` - Route registration

### Scripts

- `scripts/generate-combined-batch.ts` - Batch generation (recommended)
- `scripts/generate-test-cases-batch.ts` - Original (test-cases only)

### Types

- `packages/types/src/playground.ts` - Added `GeneratedTestCase` and `TestCaseFeedback`

## Batch Script Options

```bash
npm run generate-combined [OPTIONS]

Options:
  --limit N          Process only N packages (for testing)
  --packages-only    Only packages, skip collections
  --force            Regenerate even if tests exist
  --skip-errors      Continue on errors instead of stopping

Examples:
  npm run generate-combined -- --limit 10
  npm run generate-combined -- --force --skip-errors
```

## Analytics

### Track Test Case Performance

```sql
-- Most helpful test cases
SELECT
  title,
  success_rate,
  usage_count,
  helpful_votes
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
GROUP BY difficulty;

-- Package coverage
SELECT
  COUNT(DISTINCT entity_id) as packages_with_tests,
  (SELECT COUNT(*) FROM packages WHERE visibility = 'public') as total_packages
FROM generated_test_cases
WHERE entity_type = 'package';
```

## Troubleshooting

### No test cases returned

1. Check API key: `echo $ANTHROPIC_API_KEY`
2. Run migration: `npm run migrate`
3. Generate test: `npm run generate-combined -- --limit 1`
4. Check logs for errors

### Parse errors

If you see "Failed to parse AI response as JSON":
- Check logs for actual response
- AI may have added markdown despite instructions
- Service strips markdown, but verify response format
- Report to team if persistent

### Low quality scores

Quality scores should be 0.4-0.95 for most packages:
- < 0.4: Very low quality, check package content
- 0.4-0.6: Below average
- 0.6-0.8: Good
- 0.8-0.95: Excellent
- > 0.95: Rare, exceptional quality

## Deployment Checklist

- [ ] Migration 027 run
- [ ] ANTHROPIC_API_KEY set in environment
- [ ] Test with `--limit 5`
- [ ] Verify database has test cases and quality scores
- [ ] Run full batch with `--skip-errors`
- [ ] Update frontend to display test cases
- [ ] Monitor logs for parse errors
- [ ] Track analytics (usage, helpfulness)

## Recommended Approach

✅ **Use combined generation** (`generate-combined`) for:
- All new packages
- Batch processing existing packages
- Production deployments

❌ **Don't use separate calls** unless:
- You only need test cases (no quality score)
- Testing/debugging specific functionality

---

**Summary**: One AI call does both. Use `npm run generate-combined`. Save 50%. Done. 🚀
