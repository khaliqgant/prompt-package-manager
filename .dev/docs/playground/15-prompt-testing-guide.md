# Playground: Prompt Testing Guide

**Date**: 2025-11-01
**Purpose**: Help users understand how to effectively test prompts in the PRPM+ Playground
**Audience**: End users, package authors, developers

## Overview

The PRPM+ Playground allows users to test AI prompts before installing them. However, many users may not know how to effectively evaluate whether a prompt performs well for their use case. This document outlines:

1. What users should look for when testing prompts
2. Suggested test inputs for different prompt types
3. UI enhancements to guide users
4. Quality indicators to surface

---

## User Testing Challenges

### Current Problem
When a user opens a prompt in the playground, they see:
- A prompt/rule package (e.g., `@cursor/react-conventions`)
- An input field
- A "Run" button

**Questions users have:**
- ❓ "What should I ask?"
- ❓ "How do I know if this prompt is good?"
- ❓ "What makes a good vs bad response?"
- ❓ "Is this better than other similar prompts?"

### Why This Matters
- **Wasted Credits**: Users spend credits on poor test inputs
- **False Negatives**: Users dismiss good prompts due to bad test questions
- **False Positives**: Users install poor prompts that seemed good with lucky tests
- **Confusion**: Users don't know what to look for in responses

---

## Solution: Multi-Layered Guidance

### 1. Suggested Test Inputs (UI Enhancement)

**Implementation**: Show 3-5 suggested test inputs for each package based on its type/category.

#### Example: React Conventions Prompt

**Package**: `@cursor/react-conventions`
**Type**: Rule
**Category**: Frontend

**Suggested Tests**:
```
💡 Try these test inputs:

1. 🎯 Basic: "How should I structure a React component?"
   Tests: Basic understanding of conventions

2. 🎯 Specific: "Show me how to create a form with validation"
   Tests: Practical application of rules

3. 🎯 Edge Case: "How should I handle async data in components?"
   Tests: Depth of knowledge

4. 🎯 Anti-pattern: "Should I use class components or functional?"
   Tests: Modern best practices awareness

5. 🎯 Integration: "How do I integrate this with TypeScript?"
   Tests: Cross-domain knowledge
```

#### Example: Code Review Agent

**Package**: `@prpm/code-reviewer`
**Type**: Agent
**Category**: Development Tools

**Suggested Tests**:
```
💡 Try these test inputs:

1. 📝 Sample Code: "Review this component: [paste code]"
   Tests: Basic review functionality

2. 🐛 Bug Finding: "Find potential bugs in: [buggy code]"
   Tests: Error detection capability

3. 🎨 Style Check: "Check code style: [messy code]"
   Tests: Convention enforcement

4. 🔒 Security: "Review for security issues: [vulnerable code]"
   Tests: Security awareness

5. ⚡ Performance: "Optimize this code: [slow code]"
   Tests: Performance optimization skills
```

#### Example: TypeScript Best Practices

**Package**: `@typescript/best-practices`
**Type**: Skill
**Category**: Languages

**Suggested Tests**:
```
💡 Try these test inputs:

1. 📚 Explain: "What are TypeScript generics?"
   Tests: Conceptual understanding

2. 🔧 Fix: "How do I fix this type error: [error]"
   Tests: Practical problem-solving

3. 🏗️ Design: "How should I type this API response?"
   Tests: Real-world application

4. 🚀 Advanced: "Explain conditional types with examples"
   Tests: Advanced knowledge depth

5. 🔄 Compare: "When should I use 'type' vs 'interface'?"
   Tests: Nuanced decision-making
```

---

### 2. Evaluation Criteria (Educational Content)

Show users what to look for in responses:

#### Quality Indicators Checklist

**When evaluating a response, check for:**

**✅ Accuracy**
- [ ] Information is factually correct
- [ ] Follows current best practices (not outdated)
- [ ] Cites sources or reasoning when applicable
- [ ] No hallucinations or made-up information

**✅ Relevance**
- [ ] Directly answers your question
- [ ] Stays on topic
- [ ] Provides appropriate level of detail
- [ ] Doesn't include unnecessary tangents

**✅ Clarity**
- [ ] Easy to understand
- [ ] Well-structured (headings, lists, code blocks)
- [ ] Uses clear language (not overly technical unless needed)
- [ ] Provides examples when helpful

**✅ Completeness**
- [ ] Addresses all parts of your question
- [ ] Provides context when needed
- [ ] Explains "why" not just "how"
- [ ] Includes edge cases or caveats

**✅ Actionability**
- [ ] Provides concrete steps or code
- [ ] Shows working examples
- [ ] Explains how to implement suggestions
- [ ] Links to further resources

**✅ Consistency**
- [ ] Follows the package's stated approach
- [ ] Maintains consistent style/tone
- [ ] Aligns with the prompt's purpose
- [ ] Doesn't contradict itself

---

### 3. Comparison Mode (Feature Enhancement)

**Feature**: Allow users to test multiple prompts side-by-side with the same input.

#### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Playground - Comparison Mode                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input (shared): "How should I structure React components?" │
│                                                              │
├──────────────────────────┬──────────────────────────────────┤
│  @cursor/react-conventions│  @react/component-patterns      │
├──────────────────────────┼──────────────────────────────────┤
│                          │                                  │
│  Response A:             │  Response B:                     │
│  - Functional components │  - Use composition               │
│  - Single responsibility │  - Container/Presentational      │
│  - Props validation      │  - Hooks for logic               │
│  ...                     │  ...                             │
│                          │                                  │
│  Credits: 1              │  Credits: 1                      │
│  Tokens: 1,234           │  Tokens: 1,456                   │
│  Time: 3.2s              │  Time: 3.8s                      │
│                          │                                  │
│  👍 👎  ⭐ Save          │  👍 👎  ⭐ Save                  │
└──────────────────────────┴──────────────────────────────────┘

Which response was better?  [ Response A ] [ Response B ] [ Both Good ] [ Neither ]
```

**Benefits**:
- Users see quality differences directly
- Can compare similar prompts (e.g., two React rule packages)
- Builds intuition for what "good" looks like
- Helps users make informed installation decisions

---

### 4. Example Conversations (Package-Level)

**Implementation**: Package authors include example conversations in their package metadata.

#### Schema Addition

```typescript
// packages/types/src/index.ts
export interface Package {
  // ... existing fields
  examples?: PlaygroundExample[];
}

export interface PlaygroundExample {
  title: string;
  description: string;
  input: string;
  expected_output_summary?: string; // What a good response should include
  tags?: string[]; // e.g., ["basic", "advanced", "debugging"]
}
```

#### Example Usage

```json
{
  "name": "@cursor/react-conventions",
  "version": "1.0.0",
  "examples": [
    {
      "title": "Component Structure",
      "description": "Tests basic understanding of React component organization",
      "input": "How should I structure a React component?",
      "expected_output_summary": "Should mention functional components, single responsibility, hooks, and props validation",
      "tags": ["basic", "structure"]
    },
    {
      "title": "State Management",
      "description": "Tests knowledge of when to use different state solutions",
      "input": "When should I use Redux vs Context vs local state?",
      "expected_output_summary": "Should explain trade-offs, provide decision criteria, and give examples",
      "tags": ["advanced", "state"]
    }
  ]
}
```

#### UI Implementation

```
┌────────────────────────────────────────────────────────┐
│  Testing: @cursor/react-conventions                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  📚 Example Tests (provided by author)                 │
│                                                         │
│  1. Component Structure [basic]                        │
│     "How should I structure a React component?"        │
│     ✓ Should cover: functional components, hooks, ...  │
│     [Try this example]                                 │
│                                                         │
│  2. State Management [advanced]                        │
│     "When should I use Redux vs Context vs local..."   │
│     ✓ Should cover: trade-offs, decision criteria, ... │
│     [Try this example]                                 │
│                                                         │
│  Or enter your own question:                           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [Your input here]                                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  [Run]                                                 │
└────────────────────────────────────────────────────────┘
```

---

### 5. Quality Scoring (Advanced Feature)

**Feature**: AI-powered quality assessment of responses.

#### Implementation

After each playground run, analyze the response for quality:

```typescript
interface ResponseQualityScore {
  overall: number; // 0-100
  dimensions: {
    accuracy: number; // 0-100
    relevance: number; // 0-100
    clarity: number; // 0-100
    completeness: number; // 0-100
    actionability: number; // 0-100
  };
  flags: string[]; // e.g., ["outdated_info", "missing_examples", "too_verbose"]
  suggestions: string[]; // How to improve the prompt
}
```

#### UI Display

```
┌─────────────────────────────────────────────────────┐
│  Response Quality Analysis                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Overall Score: 85/100  ⭐⭐⭐⭐                     │
│                                                      │
│  Accuracy:      95  ████████████████████ Excellent  │
│  Relevance:     90  ██████████████████   Very Good  │
│  Clarity:       80  ████████████████     Good       │
│  Completeness:  75  ███████████████      Good       │
│  Actionability: 85  █████████████████    Very Good  │
│                                                      │
│  ✓ Strengths:                                       │
│    • Provides accurate, up-to-date information      │
│    • Includes working code examples                 │
│    • Well-structured response                       │
│                                                      │
│  ⚠ Areas for Improvement:                           │
│    • Could mention edge cases                       │
│    • More context on "why" would help               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Implementation Approach**:
```typescript
// Use Claude to analyze Claude's response (meta-analysis)
async function scoreResponse(
  userInput: string,
  promptContent: string,
  aiResponse: string
): Promise<ResponseQualityScore> {
  const analysisPrompt = `
You are analyzing an AI assistant's response for quality. Rate it on:
- Accuracy (factually correct, no hallucinations)
- Relevance (directly answers the question)
- Clarity (well-structured, easy to understand)
- Completeness (addresses all parts of question)
- Actionability (provides concrete examples/steps)

User asked: ${userInput}
Prompt context: ${promptContent}
AI response: ${aiResponse}

Return JSON with scores (0-100) for each dimension and overall.
`;

  // Use a fast model (Haiku/GPT-4o-mini) for cost efficiency
  const analysis = await callAI(analysisPrompt, 'haiku');
  return JSON.parse(analysis);
}
```

---

### 6. Community Testing Patterns

**Feature**: Crowdsource testing insights from the community.

#### Schema

```typescript
export interface CommunityTestInsight {
  package_id: string;
  user_id: string;
  test_input: string;
  response_quality: number; // 1-5 stars
  helpful_count: number; // Upvotes
  tags: string[];
  comment?: string; // Why this test was useful
  created_at: string;
}
```

#### UI Display

```
┌────────────────────────────────────────────────────────┐
│  Community Test Examples                               │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Most Helpful Tests from the Community:                │
│                                                         │
│  1. ⭐⭐⭐⭐⭐ (42 helpful)                              │
│     "Create a form with validation and error handling" │
│     💬 "Really shows if the prompt understands..."     │
│     [Try this test]                                    │
│                                                         │
│  2. ⭐⭐⭐⭐ (38 helpful)                                │
│     "How to handle async operations in components?"    │
│     💬 "Great for testing advanced knowledge"          │
│     [Try this test]                                    │
│                                                         │
│  3. ⭐⭐⭐⭐ (35 helpful)                                │
│     "Explain the difference between state and props"   │
│     💬 "Good baseline test for beginners"              │
│     [Try this test]                                    │
│                                                         │
│  [See all community tests]                             │
└────────────────────────────────────────────────────────┘
```

**Benefits**:
- Users learn from others' testing strategies
- Discover edge cases they wouldn't have thought of
- Build a knowledge base of effective tests
- Gamification: Users get recognition for helpful test inputs

---

### 7. Guided Testing Wizard (Onboarding)

**Feature**: Step-by-step wizard for first-time playground users.

#### Flow

```
Step 1: Welcome
┌────────────────────────────────────────────────┐
│  🎮 Welcome to the Playground!                 │
│                                                 │
│  Test prompts before installing them.          │
│  We'll guide you through your first test.      │
│                                                 │
│  [Start Tutorial] [Skip]                       │
└────────────────────────────────────────────────┘

Step 2: Choose Package
┌────────────────────────────────────────────────┐
│  Choose a package to test:                     │
│                                                 │
│  ● @cursor/react-conventions (Recommended)     │
│    Popular rule for React development          │
│                                                 │
│  ○ @typescript/best-practices                  │
│  ○ @prpm/code-reviewer                         │
│                                                 │
│  [Next]                                        │
└────────────────────────────────────────────────┘

Step 3: Select Test Type
┌────────────────────────────────────────────────┐
│  What do you want to test?                     │
│                                                 │
│  ● Basic understanding                         │
│    See if the prompt knows the fundamentals    │
│                                                 │
│  ○ Practical application                       │
│    Test with a real coding scenario            │
│                                                 │
│  ○ Advanced knowledge                          │
│    Check depth of expertise                    │
│                                                 │
│  [Next]                                        │
└────────────────────────────────────────────────┘

Step 4: Use Suggested Input
┌────────────────────────────────────────────────┐
│  Try this test input:                          │
│                                                 │
│  "How should I structure a React component?"   │
│                                                 │
│  This tests if the prompt understands:         │
│  ✓ Functional vs class components             │
│  ✓ Component organization                     │
│  ✓ Best practices                              │
│                                                 │
│  [Run Test (1 credit)]                         │
└────────────────────────────────────────────────┘

Step 5: Evaluate Response
┌────────────────────────────────────────────────┐
│  AI Response:                                  │
│  [Response shown here...]                      │
│                                                 │
│  Look for:                                     │
│  ✓ Mentions functional components              │
│  ✓ Discusses single responsibility             │
│  ✓ Includes code examples                      │
│  ✓ Explains reasoning                          │
│                                                 │
│  Did the response cover these points?          │
│  [Yes, looks good] [Missing some] [Poor]       │
│                                                 │
│  [Try another test] [Install package] [Done]   │
└────────────────────────────────────────────────┘
```

---

## Prompt-Type Specific Guidance

### Rules/Skills

**What to test:**
- ✅ Basic concept understanding
- ✅ Application to real scenarios
- ✅ Edge case handling
- ✅ Best practice recommendations
- ✅ Anti-pattern detection

**Example tests:**
```
1. "Explain [concept]"
2. "How do I [task]?"
3. "What's wrong with this: [bad code]"
4. "When should I use [approach A] vs [approach B]?"
5. "Show me an example of [pattern]"
```

### Agents

**What to test:**
- ✅ Task completion capability
- ✅ Multi-step reasoning
- ✅ Error handling
- ✅ Edge case awareness
- ✅ Output quality

**Example tests:**
```
1. "Review this code: [sample]"
2. "Find bugs in: [buggy code]"
3. "Optimize this function: [slow code]"
4. "Refactor this to: [target pattern]"
5. "Generate tests for: [code]"
```

### Templates

**What to test:**
- ✅ Completeness of output
- ✅ Customization options
- ✅ Following conventions
- ✅ Documentation quality
- ✅ Working state (if code)

**Example tests:**
```
1. "Generate a [type] component"
2. "Create a [pattern] with [feature]"
3. "Scaffold a [project type]"
4. "Make a [artifact] that [requirement]"
5. "Show me variations with [different approach]"
```

### Workflows

**What to test:**
- ✅ Step-by-step process
- ✅ Handles dependencies
- ✅ Error recovery
- ✅ Progress feedback
- ✅ Completion criteria

**Example tests:**
```
1. "Walk me through [process]"
2. "What if [error] happens during [step]?"
3. "How do I customize [part of workflow]?"
4. "Show me the full workflow for [task]"
5. "What are the prerequisites for [workflow]?"
```

---

## UI/UX Recommendations

### Immediate (High Priority)

1. **Show Suggested Test Inputs**
   - Display 3-5 suggested tests for each package
   - Generated based on package type/category
   - One-click to use suggestion

2. **Add "What to Look For" Guidance**
   - Show evaluation criteria after response
   - Highlight key quality indicators
   - Educational tooltip on first use

3. **Comparison Mode**
   - Allow testing 2 prompts side-by-side
   - Same input, different prompts
   - Visual diff of responses

### Short-term (Medium Priority)

4. **Example Conversations from Authors**
   - Package schema supports examples
   - Authors provide 2-3 test cases
   - UI shows examples prominently

5. **Community Test Patterns**
   - Users can save/share test inputs
   - Upvote helpful tests
   - "Most helpful tests" section

6. **Response Quality Indicators**
   - Simple visual indicators (✓/⚠/✗)
   - Length, token count, response time
   - Complexity score (optional)

### Long-term (Lower Priority)

7. **AI-Powered Quality Scoring**
   - Automated response analysis
   - Quality scores on 5 dimensions
   - Improvement suggestions

8. **Testing Wizard for New Users**
   - Guided first-time experience
   - Educational walkthroughs
   - Best practices teaching

9. **Historical Test Results**
   - Save test results per package
   - Compare across versions
   - Track quality over time

---

## Data Schema Additions

### Package Examples

```sql
-- Add examples column to packages table
ALTER TABLE packages ADD COLUMN examples JSONB DEFAULT '[]';

-- Example data structure
UPDATE packages SET examples = '[
  {
    "title": "Component Structure",
    "description": "Tests basic React component organization",
    "input": "How should I structure a React component?",
    "expected_output_summary": "functional components, hooks, props",
    "tags": ["basic", "structure"]
  }
]' WHERE name = 'react-conventions';
```

### Community Test Insights

```sql
CREATE TABLE playground_test_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_input TEXT NOT NULL,
  response_quality INT CHECK (response_quality BETWEEN 1 AND 5),
  helpful_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_insights_package ON playground_test_insights(package_id);
CREATE INDEX idx_test_insights_helpful ON playground_test_insights(helpful_count DESC);
CREATE INDEX idx_test_insights_quality ON playground_test_insights(response_quality DESC);
```

### Test Insight Votes

```sql
CREATE TABLE playground_test_insight_votes (
  insight_id UUID NOT NULL REFERENCES playground_test_insights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (insight_id, user_id)
);
```

---

## API Endpoints Needed

### Get Suggested Tests

```typescript
GET /api/v1/playground/packages/:id/suggested-tests

Response:
{
  "suggested_tests": [
    {
      "title": "Component Structure",
      "description": "Tests basic understanding",
      "input": "How should I structure a React component?",
      "difficulty": "basic",
      "tags": ["structure", "basics"]
    },
    ...
  ],
  "source": "ai_generated" | "author_provided" | "community"
}
```

### Get Community Test Insights

```typescript
GET /api/v1/playground/packages/:id/community-tests

Query params:
- sort: "helpful" | "recent" | "quality"
- limit: number
- offset: number

Response:
{
  "tests": [
    {
      "id": "uuid",
      "test_input": "...",
      "response_quality": 5,
      "helpful_count": 42,
      "tags": ["advanced", "state"],
      "comment": "Really tests depth of knowledge",
      "created_at": "..."
    },
    ...
  ],
  "total": 156
}
```

### Save Test Insight

```typescript
POST /api/v1/playground/test-insights

Body:
{
  "package_id": "uuid",
  "test_input": "How should I...",
  "response_quality": 5,
  "tags": ["useful", "advanced"],
  "comment": "Great test for..."
}

Response:
{
  "id": "uuid",
  "insight": { ... }
}
```

### Vote on Test Insight

```typescript
POST /api/v1/playground/test-insights/:id/vote

Response:
{
  "helpful_count": 43
}
```

---

## Implementation Priority

### Phase 1: Quick Wins (Week 1)
1. ✅ Show 3 hardcoded suggested tests per package type
2. ✅ Add "What to look for" tooltip/card
3. ✅ Display basic metrics (tokens, time, model)

### Phase 2: Author Support (Week 2-3)
4. ✅ Add examples field to package schema
5. ✅ UI to display author-provided examples
6. ✅ Package publish flow includes examples

### Phase 3: Community Features (Week 4-5)
7. ✅ Community test insights schema
8. ✅ API endpoints for insights
9. ✅ UI to browse/submit/vote on tests

### Phase 4: AI Enhancement (Week 6+)
10. ✅ AI-generated suggested tests
11. ✅ Response quality scoring
12. ✅ Comparison mode

---

## Success Metrics

Track these to measure effectiveness:

- **User Engagement**
  - % of playground users who try suggested tests
  - Avg tests per package before install
  - Time spent in playground

- **Quality**
  - User ratings of suggested tests (helpful/not helpful)
  - Community test insight votes
  - Install rate after playground testing

- **Conversion**
  - % users who install after testing
  - % users who buy credits to test more
  - Repeat playground usage

- **Community**
  - # of community test insights submitted
  - Avg votes per insight
  - Active contributors

---

## Conclusion

By providing **guided testing experiences**, we can:
- ✅ Help users make informed decisions
- ✅ Reduce wasted credits on poor tests
- ✅ Educate users on prompt quality
- ✅ Build community knowledge
- ✅ Increase user confidence
- ✅ Improve package discovery

**Next Steps**:
1. Implement Phase 1 (suggested tests UI)
2. Add author examples to package schema
3. Gather user feedback on testing experience
4. Iterate based on usage data

---

**Last Updated**: 2025-11-01
**Status**: 📋 Design Document - Ready for Implementation
