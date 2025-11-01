# AI-Generated Test Cases for Playground

**Date**: 2025-11-01
**Purpose**: Generate intelligent, package-specific test cases to help users effectively test prompts
**Status**: Design Document

## Overview

Instead of generic test suggestions, we can use AI to analyze each package and generate **highly relevant, intelligent test cases** tailored to:
- Package content (the actual prompt/rule)
- Package subtype (rule, agent, skill, etc.)
- Package category (frontend, backend, data science, etc.)
- Package description and metadata

## Generation Strategy

### 1. Analysis-Based Generation

When a package is published or updated, analyze it and generate 5-10 test cases:

```typescript
interface GeneratedTestCase {
  id: string;
  package_id: string;
  title: string;
  description: string;
  input: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  test_type: 'concept' | 'practical' | 'edge_case' | 'comparison' | 'quality';
  expected_criteria: string[]; // What a good response should include
  tags: string[];
  confidence_score: number; // How confident the AI is this is a good test
  generated_at: string;
}
```

### 2. AI Generation Prompt

Use a sophisticated prompt to analyze the package and generate tests:

```typescript
async function generateTestCases(pkg: Package, content: string): Promise<GeneratedTestCase[]> {
  const prompt = `
You are an expert at testing AI prompts and evaluating their quality.

Analyze this AI prompt package and generate 5-10 intelligent test cases that will help users evaluate its effectiveness.

PACKAGE INFORMATION:
- Name: ${pkg.name}
- Subtype: ${pkg.subtype} (rule, agent, skill, etc.)
- Category: ${pkg.category}
- Description: ${pkg.description}
- Tags: ${pkg.tags.join(', ')}

PACKAGE CONTENT:
${content}

INSTRUCTIONS:
Generate test cases that:
1. Cover different difficulty levels (basic, intermediate, advanced)
2. Test different aspects (understanding, application, edge cases)
3. Are specific to THIS package's purpose and domain
4. Would help users determine if this package fits their needs
5. Include both "happy path" and challenging scenarios

For each test case, provide:
- title: Short descriptive title (e.g., "Basic Component Structure")
- description: Why this test is useful (e.g., "Tests fundamental React patterns")
- input: The exact test prompt a user should try
- difficulty: basic, intermediate, or advanced
- test_type: concept, practical, edge_case, comparison, or quality
- expected_criteria: 3-5 things a good response should include
- tags: 2-4 relevant tags

IMPORTANT GUIDELINES:
- For RULES: Test concept understanding, application, anti-patterns, comparisons
- For AGENTS: Test task completion, multi-step reasoning, error handling, quality
- For SKILLS: Test knowledge depth, practical application, examples, edge cases
- For PROMPTS: Test output quality, customization, completeness

Return JSON array of test cases.
`;

  const response = await callAI(prompt, {
    model: 'sonnet', // Use Claude Sonnet for quality analysis
    temperature: 0.7, // Some creativity but still focused
    max_tokens: 4000,
  });

  return JSON.parse(response);
}
```

### 3. Example Generated Test Cases

#### For `@cursor/react-conventions` (Rule)

```json
[
  {
    "title": "Component Structure Basics",
    "description": "Tests understanding of fundamental React component organization patterns",
    "input": "How should I structure a React component that displays user profile information?",
    "difficulty": "basic",
    "test_type": "practical",
    "expected_criteria": [
      "Mentions functional components",
      "Discusses single responsibility principle",
      "Includes prop validation or TypeScript types",
      "Shows example code structure",
      "Mentions hooks for state/effects if needed"
    ],
    "tags": ["components", "structure", "basics", "patterns"]
  },
  {
    "title": "State Management Decision",
    "description": "Tests ability to guide state management architecture decisions",
    "input": "I need to share user authentication state across my app. Should I use Context, Redux, Zustand, or something else?",
    "difficulty": "intermediate",
    "test_type": "comparison",
    "expected_criteria": [
      "Compares different state management solutions",
      "Provides decision criteria based on app size/complexity",
      "Mentions trade-offs (bundle size, learning curve, etc.)",
      "Gives specific recommendation with reasoning",
      "Shows example implementation"
    ],
    "tags": ["state-management", "architecture", "decision-making"]
  },
  {
    "title": "Performance Anti-Pattern",
    "description": "Tests detection and correction of common performance issues",
    "input": "I have a component that re-renders on every keystroke and it's slowing down. Here's my code: [paste problematic code]",
    "difficulty": "advanced",
    "test_type": "edge_case",
    "expected_criteria": [
      "Identifies the performance issue (unnecessary re-renders)",
      "Explains why it's happening",
      "Suggests specific optimizations (useMemo, useCallback, React.memo)",
      "Shows refactored code",
      "Mentions profiling tools"
    ],
    "tags": ["performance", "optimization", "debugging", "anti-patterns"]
  },
  {
    "title": "TypeScript Integration",
    "description": "Tests knowledge of React + TypeScript best practices",
    "input": "How should I type a component that accepts children and optional callback props?",
    "difficulty": "intermediate",
    "test_type": "practical",
    "expected_criteria": [
      "Shows proper TypeScript interface/type definition",
      "Uses React.FC or explicit typing",
      "Handles optional props correctly",
      "Types children properly (React.ReactNode)",
      "Shows complete working example"
    ],
    "tags": ["typescript", "types", "props", "children"]
  },
  {
    "title": "Testing Strategy",
    "description": "Tests understanding of React component testing approaches",
    "input": "What's the best way to test a form component with validation and API submission?",
    "difficulty": "advanced",
    "test_type": "quality",
    "expected_criteria": [
      "Recommends testing library (Jest + React Testing Library)",
      "Covers user interaction testing",
      "Explains how to mock API calls",
      "Shows validation testing",
      "Mentions accessibility testing",
      "Provides example test code"
    ],
    "tags": ["testing", "forms", "validation", "quality"]
  }
]
```

#### For `@prpm/code-reviewer` (Agent)

```json
[
  {
    "title": "Basic Code Review",
    "description": "Tests fundamental code review capabilities",
    "input": "Review this simple React component:\n\nfunction UserCard({ user }) {\n  return <div>{user.name}</div>\n}",
    "difficulty": "basic",
    "test_type": "practical",
    "expected_criteria": [
      "Identifies missing prop validation",
      "Notes lack of error handling for undefined user",
      "Suggests improvements (destructuring, TypeScript, etc.)",
      "Provides refactored version",
      "Explains reasoning"
    ],
    "tags": ["review", "react", "basics"]
  },
  {
    "title": "Bug Detection",
    "description": "Tests ability to find subtle bugs in code",
    "input": "Find bugs in this code:\n\nuseEffect(() => {\n  fetchData().then(data => setData(data))\n}, [])",
    "difficulty": "intermediate",
    "test_type": "edge_case",
    "expected_criteria": [
      "Identifies memory leak (setState after unmount)",
      "Suggests cleanup with AbortController or flag",
      "Shows corrected code",
      "Explains the bug's impact",
      "Mentions when this bug occurs"
    ],
    "tags": ["bugs", "hooks", "async", "memory-leak"]
  },
  {
    "title": "Security Vulnerability",
    "description": "Tests security awareness and vulnerability detection",
    "input": "Review this API endpoint for security issues:\n\napp.get('/user/:id', (req, res) => {\n  const query = `SELECT * FROM users WHERE id = ${req.params.id}`\n  db.query(query, (err, result) => res.json(result))\n})",
    "difficulty": "advanced",
    "test_type": "quality",
    "expected_criteria": [
      "Identifies SQL injection vulnerability",
      "Rates severity as CRITICAL",
      "Explains the attack vector",
      "Shows parameterized query solution",
      "Mentions additional security measures (input validation, auth)"
    ],
    "tags": ["security", "sql-injection", "backend", "critical"]
  },
  {
    "title": "Performance Optimization",
    "description": "Tests ability to suggest performance improvements",
    "input": "How can I optimize this slow function?\n\nfunction findDuplicates(arr) {\n  return arr.filter((item, index) => arr.indexOf(item) !== index)\n}",
    "difficulty": "intermediate",
    "test_type": "practical",
    "expected_criteria": [
      "Identifies O(n²) complexity issue",
      "Suggests O(n) solution using Set or Map",
      "Shows optimized code",
      "Compares time complexity",
      "Provides benchmark or explanation of improvement"
    ],
    "tags": ["performance", "algorithms", "optimization"]
  },
  {
    "title": "Architecture Review",
    "description": "Tests ability to review overall code architecture",
    "input": "Review the architecture of this feature: [paste multi-file feature code]",
    "difficulty": "advanced",
    "test_type": "quality",
    "expected_criteria": [
      "Evaluates separation of concerns",
      "Checks for proper abstraction layers",
      "Identifies coupling issues",
      "Suggests architectural improvements",
      "Considers scalability and maintainability"
    ],
    "tags": ["architecture", "design", "patterns", "scalability"]
  }
]
```

## Implementation Architecture

### Database Schema

```sql
CREATE TABLE generated_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  input TEXT NOT NULL,
  difficulty VARCHAR(20) CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  test_type VARCHAR(50) CHECK (test_type IN ('concept', 'practical', 'edge_case', 'comparison', 'quality')),
  expected_criteria TEXT[], -- Array of strings
  tags TEXT[],
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  generated_at TIMESTAMP DEFAULT NOW(),
  version_generated_from VARCHAR(50), -- Package version this was generated from
  is_active BOOLEAN DEFAULT true, -- Can be disabled if outdated
  usage_count INT DEFAULT 0, -- How many times users tried this test
  success_rate DECIMAL(3,2), -- % of users who found this helpful
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_cases_package ON generated_test_cases(package_id);
CREATE INDEX idx_test_cases_difficulty ON generated_test_cases(difficulty);
CREATE INDEX idx_test_cases_active ON generated_test_cases(is_active);
CREATE INDEX idx_test_cases_success_rate ON generated_test_cases(success_rate DESC);
```

### API Endpoints

```typescript
// Get generated test cases for a package
GET /api/v1/playground/packages/:id/generated-tests
Query params:
  - difficulty: 'basic' | 'intermediate' | 'advanced'
  - test_type: 'concept' | 'practical' | 'edge_case' | 'comparison' | 'quality'
  - limit: number (default: 5)
  - sort: 'confidence' | 'success_rate' | 'usage' | 'difficulty'

Response:
{
  "generated_tests": [
    {
      "id": "uuid",
      "title": "Component Structure Basics",
      "description": "Tests understanding of...",
      "input": "How should I structure...",
      "difficulty": "basic",
      "test_type": "practical",
      "expected_criteria": [...],
      "tags": ["components", "basics"],
      "confidence_score": 0.95,
      "usage_count": 142,
      "success_rate": 0.87
    },
    ...
  ],
  "total": 8,
  "package_version": "1.2.0"
}

// Record test usage (analytics)
POST /api/v1/playground/test-cases/:id/record-usage
Body:
{
  "was_helpful": true | false,
  "user_feedback": "optional comment"
}

Response:
{
  "success": true
}
```

### Generation Workflow

```typescript
// Service: packages/registry/src/services/test-case-generator.ts

import Anthropic from '@anthropic-ai/sdk';
import { Package, GeneratedTestCase } from '@pr-pm/types';

export class TestCaseGeneratorService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate test cases when a package is published/updated
   */
  async generateForPackage(
    pkg: Package,
    content: string,
    version: string
  ): Promise<GeneratedTestCase[]> {
    const prompt = this.buildGenerationPrompt(pkg, content);

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

    // Store in database
    await this.storeTestCases(pkg.id, testCases, version);

    return testCases;
  }

  private buildGenerationPrompt(pkg: Package, content: string): string {
    const subtypeGuidance = {
      rule: 'Test concept understanding, application to scenarios, anti-patterns, comparisons',
      agent: 'Test task completion, multi-step reasoning, error handling, output quality',
      skill: 'Test knowledge depth, practical application, examples, edge cases',
      prompt: 'Test output quality, customization options, completeness, consistency',
    };

    return `
You are an expert at testing AI prompts and creating evaluation criteria.

Analyze this ${pkg.subtype} package and generate 5-10 intelligent test cases.

PACKAGE:
- Name: ${pkg.name}
- Subtype: ${pkg.subtype}
- Category: ${pkg.category || 'General'}
- Description: ${pkg.description}
- Tags: ${pkg.tags?.join(', ') || 'None'}

CONTENT:
${content.substring(0, 3000)} ${content.length > 3000 ? '...(truncated)' : ''}

GUIDANCE FOR ${pkg.subtype.toUpperCase()}S:
${subtypeGuidance[pkg.subtype] || 'Test understanding, application, and quality'}

Generate test cases covering:
1. Basic (newcomer friendly, tests fundamentals)
2. Intermediate (practical scenarios, real-world use)
3. Advanced (edge cases, complex scenarios, deep knowledge)

Each test should include:
- title: Brief, clear title
- description: Why this test matters
- input: Exact prompt users should try
- difficulty: basic | intermediate | advanced
- test_type: concept | practical | edge_case | comparison | quality
- expected_criteria: Array of 3-5 things a good response should include
- tags: 2-4 relevant tags

Return valid JSON array only, no markdown formatting.
`;
  }

  private parseResponse(response: any): GeneratedTestCase[] {
    const content = response.content[0].text;

    // Remove markdown code blocks if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const testCases = JSON.parse(jsonStr);

    // Add confidence scores based on quality signals
    return testCases.map(tc => ({
      ...tc,
      confidence_score: this.calculateConfidence(tc),
    }));
  }

  private calculateConfidence(testCase: any): number {
    let score = 0.7; // Base score

    // Quality signals
    if (testCase.expected_criteria?.length >= 3) score += 0.1;
    if (testCase.description?.length > 50) score += 0.05;
    if (testCase.input?.length > 30) score += 0.05;
    if (testCase.tags?.length >= 2) score += 0.05;
    if (testCase.input?.includes('?')) score += 0.05; // Well-formed question

    return Math.min(score, 1.0);
  }

  private async storeTestCases(
    packageId: string,
    testCases: GeneratedTestCase[],
    version: string
  ): Promise<void> {
    // Deactivate old test cases for this package
    await db.query(
      'UPDATE generated_test_cases SET is_active = false WHERE package_id = $1',
      [packageId]
    );

    // Insert new test cases
    for (const tc of testCases) {
      await db.query(`
        INSERT INTO generated_test_cases (
          package_id, title, description, input,
          difficulty, test_type, expected_criteria,
          tags, confidence_score, version_generated_from
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        packageId,
        tc.title,
        tc.description,
        tc.input,
        tc.difficulty,
        tc.test_type,
        tc.expected_criteria,
        tc.tags,
        tc.confidence_score,
        version,
      ]);
    }
  }

  /**
   * Update test case success metrics based on user feedback
   */
  async recordUsage(
    testCaseId: string,
    wasHelpful: boolean
  ): Promise<void> {
    await db.query(`
      UPDATE generated_test_cases
      SET
        usage_count = usage_count + 1,
        success_rate = (
          COALESCE(success_rate * usage_count, 0) +
          CASE WHEN $2 THEN 1 ELSE 0 END
        ) / (usage_count + 1)
      WHERE id = $1
    `, [testCaseId, wasHelpful]);
  }
}
```

### Trigger Generation on Publish

```typescript
// In publish workflow
import { TestCaseGeneratorService } from './services/test-case-generator';

async function publishPackage(manifest: PackageManifest, tarball: Buffer) {
  // ... existing publish logic

  // Extract content from tarball
  const content = await extractPackageContent(tarball);

  // Generate test cases asynchronously (don't block publish)
  const generator = new TestCaseGeneratorService();

  // Fire and forget (or use job queue for production)
  generator.generateForPackage(pkg, content, manifest.version)
    .catch(err => {
      console.error('Failed to generate test cases:', err);
      // Log but don't fail the publish
    });

  return publishResult;
}
```

## UI Integration

### Display Generated Tests

```tsx
// In playground UI
function PlaygroundTestSuggestions({ packageId }: { packageId: string }) {
  const [tests, setTests] = useState<GeneratedTestCase[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  useEffect(() => {
    fetch(`/api/v1/playground/packages/${packageId}/generated-tests?limit=10`)
      .then(res => res.json())
      .then(data => setTests(data.generated_tests));
  }, [packageId]);

  const filteredTests = selectedDifficulty === 'all'
    ? tests
    : tests.filter(t => t.difficulty === selectedDifficulty);

  return (
    <div className="test-suggestions">
      <h3>🎯 Suggested Tests</h3>

      <div className="difficulty-filter">
        <button onClick={() => setSelectedDifficulty('all')}>All</button>
        <button onClick={() => setSelectedDifficulty('basic')}>Basic</button>
        <button onClick={() => setSelectedDifficulty('intermediate')}>Intermediate</button>
        <button onClick={() => setSelectedDifficulty('advanced')}>Advanced</button>
      </div>

      <div className="test-list">
        {filteredTests.map(test => (
          <TestCaseCard
            key={test.id}
            test={test}
            onUse={(input) => runPlaygroundTest(input, test.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TestCaseCard({ test, onUse }: { test: GeneratedTestCase, onUse: (input: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="test-case-card">
      <div className="test-header">
        <h4>{test.title}</h4>
        <span className={`difficulty ${test.difficulty}`}>
          {test.difficulty}
        </span>
      </div>

      <p className="test-description">{test.description}</p>

      {expanded && (
        <div className="test-details">
          <div className="test-input">
            <strong>Test prompt:</strong>
            <code>{test.input}</code>
          </div>

          <div className="expected-criteria">
            <strong>A good response should:</strong>
            <ul>
              {test.expected_criteria.map((criterion, i) => (
                <li key={i}>{criterion}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="test-actions">
        <button onClick={() => onUse(test.input)}>
          Try this test
        </button>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      </div>

      <div className="test-stats">
        <span>✓ {test.success_rate * 100}% helpful</span>
        <span>👥 {test.usage_count} uses</span>
      </div>
    </div>
  );
}
```

## Benefits of AI-Generated Test Cases

### 1. **Highly Relevant**
- Tailored to each specific package
- Understands the package's domain and purpose
- Suggests tests that actually matter for that package

### 2. **Comprehensive Coverage**
- Multiple difficulty levels (basic → advanced)
- Different test types (concept, practical, edge cases)
- Covers various aspects of quality

### 3. **Educational**
- Shows users what "good" looks like
- Teaches evaluation criteria
- Helps users understand prompt quality

### 4. **Scalable**
- Automated generation for every package
- Updates when package content changes
- No manual curation needed

### 5. **Self-Improving**
- Track which tests are most helpful
- Use success metrics to improve generation
- Learn from community usage patterns

## Advanced Features

### 1. Regenerate on Major Updates

```typescript
// When package has significant content changes
async function handlePackageUpdate(packageId: string, newVersion: string) {
  const contentChanged = await detectSignificantContentChange(packageId, newVersion);

  if (contentChanged) {
    const generator = new TestCaseGeneratorService();
    await generator.generateForPackage(pkg, content, newVersion);
  }
}
```

### 2. Hybrid Approach: AI + Author + Community

```typescript
// Combine all three sources
async function getAllTestSuggestions(packageId: string) {
  const [aiGenerated, authorProvided, communityBest] = await Promise.all([
    getGeneratedTestCases(packageId),
    getAuthorProvidedExamples(packageId),
    getCommunityTestInsights(packageId, { limit: 5, sort: 'helpful' }),
  ]);

  return {
    ai_generated: aiGenerated,
    author_provided: authorProvided,
    community_favorites: communityBest,
  };
}
```

### 3. Personalized Recommendations

```typescript
// Based on user's skill level and interests
async function getPersonalizedTests(packageId: string, userId: string) {
  const userProfile = await getUserSkillProfile(userId);

  return getGeneratedTestCases(packageId, {
    difficulty: userProfile.preferred_difficulty,
    tags: userProfile.interests,
    exclude_tried: true, // Don't show tests they've already run
  });
}
```

## Cost Optimization

### Use Caching
```typescript
// Cache generation for similar packages
const cacheKey = `${pkg.subtype}:${pkg.category}:${contentHash}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

### Batch Generation
```typescript
// Generate for multiple packages in one call
async function batchGenerateTestCases(packages: Package[]) {
  // Group by similarity
  // Send batch request
  // Saves on API calls
}
```

### Use Cheaper Models for Regeneration
```typescript
// Use Haiku for updates, Sonnet for initial generation
const model = isUpdate ? 'claude-haiku-3-5-20250318' : 'claude-sonnet-4-20250514';
```

## Success Metrics

Track effectiveness:
- **Adoption**: % of playground users who use suggested tests
- **Quality**: Success rate of generated tests (user feedback)
- **Coverage**: How many packages have generated tests
- **Conversion**: Do users who use suggested tests install more often?
- **Cost**: Generation cost per package vs. value provided

## Implementation Timeline

**Phase 1 (Week 1-2)**: Core generation
- Build test case generator service
- Create database schema
- Generate for top 100 packages
- Basic API endpoints

**Phase 2 (Week 3)**: UI Integration
- Display generated tests in playground
- One-click test execution
- Feedback collection

**Phase 3 (Week 4)**: Analytics & Improvement
- Track usage and success rates
- Refine generation prompts based on data
- Add filtering and personalization

**Phase 4 (Week 5+)**: Advanced Features
- Hybrid approach (AI + Author + Community)
- Automatic regeneration on updates
- Personalized recommendations

## Conclusion

AI-generated test cases provide:
- ✅ **Intelligent, package-specific suggestions** (not generic)
- ✅ **Comprehensive coverage** (basic → advanced)
- ✅ **Educational value** (teaches quality evaluation)
- ✅ **Scalability** (works for all packages automatically)
- ✅ **Continuous improvement** (learns from usage data)

This creates a **much better user experience** than manual test suggestions, while being fully automated and scalable.

---

**Next Steps**:
1. Build TestCaseGeneratorService
2. Add database schema
3. Generate tests for top packages
4. Integrate into playground UI
5. Collect feedback and iterate
