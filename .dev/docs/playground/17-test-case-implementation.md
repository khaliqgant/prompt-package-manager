# Test Case Generation Implementation

**Date**: 2025-11-01
**Status**: ✅ Ready for Migration & Deployment

## Overview

AI-generated test cases help users effectively test prompts in the playground by providing intelligent, package-specific test suggestions.

## Components

### 1. Database Migration

**File**: `migrations/027_add_generated_test_cases.sql`

**Tables**:
- `generated_test_cases`: Stores AI-generated test cases for packages and collections
- `test_case_feedback`: Tracks user feedback on test case helpfulness

**Features**:
- Polymorphic entity support (packages and collections)
- Automatic success rate calculation via triggers
- Usage analytics tracking
- Confidence scoring

### 2. Service Layer

**File**: `src/services/test-case-generator.ts`

**Class**: `TestCaseGeneratorService`

**Methods**:
```typescript
// Generate test cases for a package
async generateForPackage(
  pkg: Package,
  content: string,
  version: string,
  options?: GenerationOptions
): Promise<GeneratedTestCase[]>

// Generate test cases for a collection
async generateForCollection(
  collectionId: string,
  collectionName: string,
  collectionDescription: string,
  packageNames: string[],
  version: string,
  options?: GenerationOptions
): Promise<GeneratedTestCase[]>

// Get test cases with filtering
async getTestCases(
  entityType: 'package' | 'collection',
  entityId: string,
  options?: GetTestCasesOptions
): Promise<GeneratedTestCase[]>

// Record usage analytics
async recordUsage(testCaseId: string): Promise<void>

// Record user feedback
async recordFeedback(
  testCaseId: string,
  userId: string,
  wasHelpful: boolean,
  comment?: string
): Promise<void>
```

### 3. API Routes

**File**: `src/routes/test-cases.ts`

**Endpoints**:
```
GET  /api/v1/packages/:packageId/test-cases
GET  /api/v1/collections/:collectionId/test-cases
POST /api/v1/test-cases/record-usage
POST /api/v1/test-cases/feedback
```

**Query Parameters**:
- `difficulty`: basic | intermediate | advanced
- `test_type`: concept | practical | edge_case | comparison | quality
- `limit`: 1-50 (default: 10)
- `sort`: confidence | success_rate | usage

### 4. Batch Generation Script

**File**: `scripts/generate-test-cases-batch.ts`

**Usage**:
```bash
# Generate for all packages and collections
npm run generate-test-cases

# Test with limited set
npm run generate-test-cases -- --limit 10

# Only packages
npm run generate-test-cases -- --packages-only

# Only collections
npm run generate-test-cases -- --collections-only

# Force regeneration
npm run generate-test-cases -- --force

# Skip errors and continue
npm run generate-test-cases -- --skip-errors
```

**Features**:
- Processes packages in order of download popularity
- Rate limiting (1 second between API calls)
- Progress tracking with counts
- Error handling with skip option
- Summary statistics

### 5. Types

**File**: `packages/types/src/playground.ts`

**Added Types**:
```typescript
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
  // ... analytics fields
}

export interface TestCaseFeedback {
  id: string;
  test_case_id: string;
  user_id: string;
  was_helpful: boolean;
  feedback_comment?: string;
  created_at: string;
}
```

## AI Generation Strategy

### Prompt Design

The service uses Claude Sonnet to analyze each package and generate contextual test cases:

**Inputs**:
- Package metadata (name, subtype, category, tags, description)
- Package content (actual prompt/rule text)
- Subtype-specific guidance (different strategies for rules vs agents vs skills)

**Output**: JSON array of 5-10 test cases with:
- Title and description
- Specific test input prompt
- Difficulty level
- Test type
- Expected criteria (what good responses should include)
- Relevant tags

### Quality Scoring

Confidence scores (0-1) based on:
- Expected criteria count (3+ is good, 5+ is better)
- Description length (>50 chars)
- Input length (>50 chars for specific, >100 for detailed)
- Tag count (2-4 tags)
- Well-formed question (contains '?')

### Subtype-Specific Guidance

**Rules**: Test concept understanding, application to scenarios, anti-patterns, comparisons

**Agents**: Test task completion, multi-step reasoning, error handling, output quality

**Skills**: Test knowledge depth, practical application, examples, edge cases

**Prompts**: Test output quality, customization, completeness, consistency

## Deployment Steps

### 1. Run Migration

```bash
cd packages/registry
npm run migrate
```

This creates:
- `generated_test_cases` table
- `test_case_feedback` table
- Triggers for auto-calculating success_rate
- Helper function `increment_test_case_usage()`

### 2. Verify API Key

Ensure `ANTHROPIC_API_KEY` is set in environment:

```bash
# .env or EB environment
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Test Service

```bash
# Start dev server
npm run dev

# Test endpoint
curl http://localhost:3000/api/v1/packages/{package-id}/test-cases
```

### 4. Run Batch Generation

```bash
# Test with 5 packages first
npm run generate-test-cases -- --limit 5

# If successful, generate for all
npm run generate-test-cases -- --skip-errors
```

**Expected Output**:
```
🚀 Starting batch test case generation
Options: { limit: undefined, packagesOnly: false, ... }

📦 Processing packages...
Found 142 packages to process

[1/142] Processing: @cursor/react-conventions
  ✓ Generated 8 test cases

[2/142] Processing: @typescript/best-practices
  ✓ Generated 7 test cases

...

✅ Batch generation complete!
============================================================
Packages:
  Processed: 142
  Succeeded: 138
  Failed:    4

Total succeeded: 138
Total failed:    4
```

### 5. Monitor Logs

Check for errors:
```bash
# In production
eb logs

# Look for
# ✓ Test cases generated and stored
# ✗ Failed to generate test cases
```

## Integration with Publish Flow

### Auto-Generate on Publish

Add to package publish handler:

```typescript
// After successful package publish
import { TestCaseGeneratorService } from './services/test-case-generator.js';

async function handlePublish(packageData, tarball) {
  // ... existing publish logic

  // Generate test cases asynchronously (don't block publish)
  const generator = new TestCaseGeneratorService(server);

  generator.generateForPackage(
    publishedPackage,
    extractedContent,
    packageVersion
  ).catch(err => {
    server.log.error('Failed to generate test cases:', err);
    // Don't fail the publish
  });
}
```

### Auto-Generate on Collection Create

Similar pattern for collections:

```typescript
async function handleCollectionCreate(collectionData) {
  // ... create collection

  generator.generateForCollection(
    collection.id,
    collection.name,
    collection.description,
    packageNames,
    '1.0.0'
  ).catch(err => {
    server.log.error('Failed to generate collection test cases:', err);
  });
}
```

## Frontend Integration

### Fetch Test Cases

```typescript
// In playground UI
const response = await fetch(
  `/api/v1/packages/${packageId}/test-cases?difficulty=basic&limit=5`
);
const { test_cases } = await response.json();
```

### Display Test Suggestions

```tsx
{test_cases.map(test => (
  <TestCaseCard
    key={test.id}
    title={test.title}
    description={test.description}
    difficulty={test.difficulty}
    onUse={() => runTest(test.input)}
  />
))}
```

### Record Usage

```typescript
// When user clicks "Try this test"
await fetch('/api/v1/test-cases/record-usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test_case_id: testCase.id }),
});
```

### Submit Feedback

```typescript
// After user runs test
await fetch('/api/v1/test-cases/feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    test_case_id: testCase.id,
    was_helpful: true,
    feedback_comment: 'Great test, very helpful!',
  }),
});
```

## Cost Estimation

### Generation Cost

- Model: Claude Sonnet 4
- Input tokens: ~1,500 per package (metadata + content)
- Output tokens: ~1,000 per package (5-10 test cases)
- Cost per package: ~$0.01
- Total for 1,000 packages: ~$10

### Optimization

1. **Cache**: Don't regenerate unless package content changes significantly
2. **Batch**: Process similar packages together (not implemented yet)
3. **Cheaper model for updates**: Use Haiku for minor updates
4. **Rate limiting**: 1 second between calls to avoid throttling

## Analytics & Metrics

### Track Effectiveness

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

-- Test case usage by difficulty
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
  (SELECT COUNT(*) FROM packages WHERE visibility = 'public') as total_packages,
  ROUND(
    COUNT(DISTINCT entity_id)::DECIMAL /
    (SELECT COUNT(*) FROM packages WHERE visibility = 'public')::DECIMAL * 100,
    2
  ) as coverage_percentage
FROM generated_test_cases
WHERE entity_type = 'package';
```

## Testing

### Unit Tests

Add tests for `TestCaseGeneratorService`:

```typescript
describe('TestCaseGeneratorService', () => {
  test('generates test cases for package', async () => {
    const testCases = await generator.generateForPackage(...);
    expect(testCases.length).toBeGreaterThan(3);
    expect(testCases[0]).toHaveProperty('title');
    expect(testCases[0].confidence_score).toBeGreaterThan(0.5);
  });

  test('filters by difficulty', async () => {
    const basic = await generator.getTestCases('package', id, {
      difficulty: 'basic',
    });
    expect(basic.every(t => t.difficulty === 'basic')).toBe(true);
  });
});
```

### Integration Tests

```bash
# Test API endpoints
curl -X GET "http://localhost:3000/api/v1/packages/{id}/test-cases?limit=5"
curl -X POST "http://localhost:3000/api/v1/test-cases/record-usage" \
  -H "Content-Type: application/json" \
  -d '{"test_case_id": "..."}'
```

## Troubleshooting

### Issue: No test cases returned

**Check**:
1. Is `ANTHROPIC_API_KEY` set?
2. Run migration: `npm run migrate`
3. Generate test cases: `npm run generate-test-cases -- --limit 1`
4. Check logs for errors

### Issue: Generation fails

**Common causes**:
1. API key invalid/expired
2. Rate limiting (wait between calls)
3. Package content empty/invalid
4. AI response parsing error

**Debug**:
```typescript
// Add logging in service
server.log.debug({ response: aiResponse }, 'AI response');
```

### Issue: Low confidence scores

**Improve**:
1. Add more package metadata (better description, tags)
2. Adjust confidence calculation weights
3. Regenerate with `--force` flag

## Future Enhancements

### Phase 2 Features

1. **Personalized recommendations**: Based on user skill level and interests
2. **Test case variations**: Generate multiple versions of same test
3. **Community contributions**: Allow users to suggest tests
4. **Quality scoring of responses**: AI-powered evaluation of playground outputs
5. **Comparison mode**: Side-by-side testing with multiple prompts

### Optimization

1. **Batch generation**: Process similar packages together
2. **Incremental updates**: Only regenerate when content changes significantly
3. **Caching**: Share test cases across similar packages
4. **Background jobs**: Use job queue instead of fire-and-forget

---

**Next Steps**:
1. ✅ Run migration
2. ✅ Verify API key
3. ✅ Test with 5 packages
4. ⏳ Generate for all packages
5. ⏳ Integrate with frontend
6. ⏳ Monitor analytics
