# Claude Desktop Skills: A Technical Deep Dive

**Published**: 2025-01-XX
**Author**: PRPM Team
**Format**: Claude Desktop (`.claude/skills/*/SKILL.md`)
**Status**: Production

---

## Table of Contents

1. [Introduction](#introduction)
2. [Format Specification](#format-specification)
3. [Skills vs Agents vs Rules](#skills-vs-agents-vs-rules)
4. [Frontmatter Requirements](#frontmatter-requirements)
5. [Claude Search Optimization (CSO)](#claude-search-optimization-cso)
6. [PRPM's Implementation](#prpms-implementation)
7. [Conversion & Taxonomy](#conversion--taxonomy)
8. [Technical Design Decisions](#technical-design-decisions)
9. [Best Practices](#best-practices)
10. [Future Enhancements](#future-enhancements)

---

## Introduction

Claude Desktop uses a unique **skills-based system** where each skill is a self-contained reference guide for proven techniques, patterns, or tools. Unlike traditional prompts that tell the AI what to do, skills are **reference documentation** that Claude consults when relevant.

This philosophical difference makes Claude skills:
- **Discoverable**: Optimized for Claude's search system
- **Scannable**: Quick to evaluate relevance
- **Actionable**: Clear examples and patterns
- **Context-aware**: Applied only when needed

The core principle: **Default assumption is Claude is already very smart. Only add context Claude doesn't already have.**

---

## Format Specification

### Directory Structure

Claude skills use a **directory-per-skill** structure:

```
.claude/
└── skills/
    ├── typescript-expert/
    │   └── SKILL.md
    ├── api-design-patterns/
    │   ├── SKILL.md
    │   └── examples/
    │       ├── rest-api.ts
    │       └── graphql-api.ts
    └── database-optimization/
        ├── SKILL.md
        └── query-examples.sql
```

**Key conventions**:
- One directory per skill
- Main file **must** be named `SKILL.md`
- Supporting files can live alongside
- Directory name becomes skill identifier

### File Structure

Skills are Markdown with YAML frontmatter:

```markdown
---
name: typescript-type-safety
description: Use when encountering TypeScript type errors or designing type-safe APIs - provides patterns for strict typing, type guards, and generic constraints
tags: typescript, types, safety
---

# TypeScript Type Safety

## Overview

Core principle: Types are documentation that compiles. Write types that make invalid states unrepresentable.

## When to Use

**Use when:**
- Encountering `any` types or type errors
- Designing APIs with complex data shapes
- Need runtime type validation
- Working with external data sources

**Don't use for:**
- Simple CRUD operations with obvious types
- Well-typed third-party libraries

## Quick Reference

| Pattern | Use Case | Example |
|---------|----------|---------|
| Type Guards | Runtime type checking | `if (isUser(data))` |
| Discriminated Unions | State machines | `type State = Loading \| Success \| Error` |
| Generics | Reusable type-safe code | `function identity<T>(x: T): T` |

## Implementation

### Type Guard Pattern

\`\`\`typescript
interface User {
  id: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).email === 'string'
  );
}

// Usage
const data: unknown = await fetchData();
if (isUser(data)) {
  console.log(data.email); // ✅ Type-safe
}
\`\`\`

### Discriminated Union Pattern

\`\`\`typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle':
      return 'Not started';
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data; // ✅ TypeScript knows data exists
    case 'error':
      return state.error.message; // ✅ TypeScript knows error exists
  }
}
\`\`\`

## Common Mistakes

### ❌ Using `any` instead of `unknown`

\`\`\`typescript
// ❌ BAD: Defeats type safety
function process(data: any) {
  return data.value; // No type checking
}

// ✅ GOOD: Forces type checking
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
  throw new Error('Invalid data shape');
}
\`\`\`

### ❌ Inline types instead of interfaces

\`\`\`typescript
// ❌ BAD: Not reusable
function getUser(id: string): { id: string; email: string } | null {
  // ...
}

// ✅ GOOD: Reusable and discoverable
interface User {
  id: string;
  email: string;
}

function getUser(id: string): User | null {
  // ...
}
\`\`\`

## Real-World Impact

Teams using strict TypeScript typing report:
- 40% reduction in runtime errors
- 60% faster debugging (errors caught at compile time)
- Better IDE autocomplete and refactoring
```

---

## Skills vs Agents vs Rules

Claude Desktop has **three** types of custom content:

### Skills (.claude/skills/)

**Purpose**: Reference guides for techniques and patterns
**When active**: Claude searches and applies when relevant
**Content type**: Examples, patterns, quick reference
**Optimization**: CSO (Claude Search Optimization)

**Example**: "typescript-type-safety", "api-design-patterns", "testing-strategies"

### Agents (.claude/agents/)

**Purpose**: Persona-based AI configurations
**When active**: User explicitly invokes agent
**Content type**: Role definition, tools, communication style
**Optimization**: Clear role description

**Example**: "code-reviewer", "api-designer", "test-writer"

### Rules (.claude/rules/)

**Purpose**: Always-active project conventions
**When active**: All interactions in project
**Content type**: Code style, tech stack, project structure
**Optimization**: Concise, scannable

**Example**: "tech-stack.md", "code-conventions.md", "architecture.md"

**Key differences**:

| Type | Activation | Scope | Use Case |
|------|------------|-------|----------|
| **Skills** | On-demand (search) | Specific technique | "How to implement rate limiting" |
| **Agents** | Explicit invoke | Full interaction | "Act as code reviewer" |
| **Rules** | Always active | All code in project | "Use Next.js 14 App Router" |

---

## Frontmatter Requirements

### Required Fields

```yaml
---
name: skill-name-with-hyphens
description: Use when [triggers] - [what it does and how it helps]
tags: tag1, tag2, tag3
---
```

**Field requirements**:

#### name
- **Format**: letters, numbers, hyphens only (no special chars)
- **Style**: Use gerund form (verb + -ing) for action skills
- **Examples**: `typescript-type-safety`, `testing-async-code`, `optimizing-sql-queries`
- **Constraint**: Max 1024 chars total frontmatter

#### description
- **Critical**: This is what Claude reads to decide relevance
- **Format**: Third person, starts with "Use when..."
- **Content**: Include BOTH triggering conditions AND what skill does
- **Length**: Aim for under 200 chars for clarity
- **CSO**: Optimize for searchability (see CSO section)

**Good descriptions**:
```yaml
# ✅ GOOD: Specific triggers + clear benefit
description: Use when encountering TypeScript type errors or designing type-safe APIs - provides patterns for strict typing, type guards, and generic constraints

# ✅ GOOD: Problem + solution
description: Use when database queries are slow - provides indexing strategies, query optimization techniques, and EXPLAIN plan analysis

# ❌ BAD: Too vague
description: For TypeScript help

# ❌ BAD: Missing triggers
description: Provides TypeScript type safety patterns

# ❌ BAD: Too verbose
description: This skill should be used whenever you encounter situations where TypeScript is throwing errors related to types or when you need to design APIs that are safe...
```

#### tags
- **Format**: Comma-separated list
- **Style**: lowercase, single words or hyphenated
- **Purpose**: Additional search signals
- **Examples**: `typescript, types, safety`, `sql, database, performance`

---

## Claude Search Optimization (CSO)

**Critical concept**: Future Claude instances read the `description` field to decide if a skill is relevant. Bad descriptions mean skills won't be found.

### CSO Principles

#### 1. Lead with Triggers

```yaml
# ✅ GOOD: Starts with "when"
description: Use when encountering async/await errors - provides Promise handling patterns, error propagation, and concurrency control

# ❌ BAD: Starts with what skill contains
description: Provides async/await patterns and Promise handling techniques
```

#### 2. Include Symptoms

```yaml
# ✅ GOOD: Mentions specific error symptoms
description: Use when seeing "Cannot read property of undefined" errors - provides optional chaining, nullish coalescing, and defensive coding patterns

# ❌ BAD: Generic problem statement
description: Helps with undefined value errors
```

#### 3. Match Specificity to Complexity

**High degrees of freedom** (creative tasks):
```yaml
# ✅ GOOD: Broad guidance
description: Use when designing REST APIs - provides endpoint structure, HTTP method selection, and response format conventions
```

**Low degrees of freedom** (critical operations):
```yaml
# ✅ GOOD: Explicit steps
description: Use when deploying to production - provides step-by-step deployment checklist, rollback procedures, and health check validation
```

#### 4. Use Domain Vocabulary

```yaml
# ✅ GOOD: Uses technical terms developers search for
description: Use when implementing JWT authentication - provides token generation, validation, refresh strategies, and security best practices

# ❌ BAD: Avoids technical terms
description: Use when securing your application - provides authentication patterns
```

---

## PRPM's Implementation

### Parsing Claude Skills

PRPM's Claude parser (`from-claude.ts`) handles both skills and agents:

```typescript
export function fromClaude(
  content: string,
  metadata: {
    id: string;
    version?: string;
    author?: string;
    tags?: string[];
  }
): CanonicalPackage {
  // 1. Parse YAML frontmatter
  const { frontmatter, body } = parseFrontmatter(content);

  // 2. Extract metadata from frontmatter
  const metadataSection: MetadataSection = {
    type: 'metadata',
    data: {
      title: frontmatter.name || metadata.id,
      description: frontmatter.description || '',
      icon: frontmatter.icon,
      version: metadata.version || '1.0.0',
      author: metadata.author,
    },
  };

  // 3. Extract tools if present (agent indicator)
  if (frontmatter.tools) {
    const tools = frontmatter.tools
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    if (tools.length > 0) {
      const toolsSection: ToolsSection = {
        type: 'tools',
        tools,
      };
      sections.push(toolsSection);
    }
  }

  // 4. Extract optional model preference
  if (frontmatter.model) {
    metadataSection.data.claudeAgent = {
      model: frontmatter.model
    };
  }

  // 5. Parse markdown body into sections
  const bodySections = parseMarkdownBody(body);
  sections.push(...bodySections);

  // 6. Detect subtype from frontmatter
  const subtype = detectSubtypeFromFrontmatter(frontmatter);

  // 7. Build canonical package
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    version: metadata.version || '1.0.0',
    name: frontmatter.name || metadata.id,
    description: frontmatter.description || '',
    author: metadata.author || 'unknown',
    tags: metadata.tags || [],
    content: {
      format: 'canonical',
      version: '1.0',
      sections,
    },
    sourceFormat: 'claude',
  };

  // 8. Set taxonomy
  setTaxonomy(pkg, 'claude', subtype);

  return pkg as CanonicalPackage;
}
```

### Subtype Detection

Skills vs agents are differentiated by the `tools` field:

```typescript
export function detectSubtypeFromFrontmatter(frontmatter: Record<string, any>): Subtype {
  // Explicit type fields
  if (frontmatter.agentType === 'agent' || frontmatter.type === 'agent') {
    return 'agent';
  }
  if (frontmatter.skillType === 'skill' || frontmatter.type === 'skill') {
    return 'skill';
  }
  if (frontmatter.commandType === 'slash-command') {
    return 'slash-command';
  }

  // Tools field indicates agent (agents use tools, skills don't)
  if (frontmatter.tools && frontmatter.tools.trim().length > 0) {
    return 'agent';
  }

  // Default to rule
  return 'rule';
}
```

### Converting to Claude Format

```typescript
export function toClaude(
  pkg: CanonicalPackage,
  options: { claudeConfig?: { tools?: string; model?: string } } = {}
): ConversionResult {
  const warnings: string[] = [];
  let qualityScore = 100;

  // Extract sections
  const metadata = pkg.content.sections.find(s => s.type === 'metadata');
  const tools = pkg.content.sections.find(s => s.type === 'tools');
  const persona = pkg.content.sections.find(s => s.type === 'persona');

  const lines: string[] = [];

  // Generate frontmatter
  lines.push('---');

  // Name (required)
  const skillName = metadata?.type === 'metadata' && metadata.data.title
    ? metadata.data.title
    : pkg.id;
  lines.push(`name: ${skillName}`);

  // Description (required)
  if (metadata?.type === 'metadata') {
    lines.push(`description: ${metadata.data.description}`);
    if (metadata.data.icon) {
      lines.push(`icon: ${metadata.data.icon}`);
    }
  }

  // Tools field (optional, for agents)
  const toolsValue = options?.claudeConfig?.tools ||
                    (tools?.type === 'tools' ? tools.tools.join(', ') : undefined);
  if (toolsValue) {
    lines.push(`tools: ${toolsValue}`);
  }

  // Model field (optional)
  const storedModel = metadata?.type === 'metadata' ? metadata.data.claudeAgent?.model : undefined;
  const modelValue = options?.claudeConfig?.model || storedModel;
  if (modelValue) {
    lines.push(`model: ${modelValue}`);
  }

  lines.push('---');
  lines.push('');

  // Convert body sections
  // ... (rest of conversion logic)

  return {
    content: lines.join('\n').trim(),
    format: 'claude',
    warnings,
    lossyConversion: warnings.length > 0,
    qualityScore,
  };
}
```

---

## Conversion & Taxonomy

### Taxonomy Mapping

```typescript
{
  format: 'claude',
  subtype: 'skill',  // or 'agent', detected from tools field
  tags: [
    'claude',
    'typescript',  // From frontmatter tags
    'types',
    'safety'
  ]
}
```

### Cross-Format Conversion

#### Cursor → Claude

```markdown
# Before (.cursor/rules/typescript-standards.mdc)
---
title: TypeScript Type Safety
description: Enforce strict TypeScript patterns
tags: [typescript, type-safety]
globs:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Type Safety

## Core Principles
- Enable strict mode
- Avoid any type

# After (.claude/skills/typescript-type-safety/SKILL.md)
---
name: typescript-type-safety
description: Enforce strict TypeScript patterns
tags: typescript, type-safety
---

# TypeScript Type Safety

## Core Principles
- Enable strict mode
- Avoid any type
```

**Changes**:
- ✅ Frontmatter format adjusted (YAML arrays → comma-separated)
- ⚠️ **Lost**: `globs` field (Claude doesn't have conditional application)
- ⚠️ **Lost**: `ruleType` and `alwaysApply` (skills are always searchable)

#### Kiro → Claude

```markdown
# Before (.kiro/steering/typescript.md)
---
inclusion: fileMatch
fileMatchPattern: "**/*.ts"
---

# TypeScript Guidelines
- Use strict mode

# After (.claude/skills/typescript/SKILL.md)
---
name: typescript
description: TypeScript Guidelines
tags: typescript
---

# TypeScript Guidelines
- Use strict mode
```

**Changes**:
- ✅ Basic conversion works
- ⚠️ **Lost**: `inclusion` and `fileMatchPattern` (Claude has no conditional system)
- ⚠️ **Needs improvement**: Description should be CSO-optimized

---

## Technical Design Decisions

### Decision 1: Skills vs Agents Detection

**Problem**: How to differentiate skills from agents when both use same format?

**Decision**: Use `tools` field as indicator

**Rationale**:
- Agents need tools to perform actions
- Skills are reference-only, no tool access
- Tools field is Claude-specific, always intentional

**Implementation**:
```typescript
if (frontmatter.tools && frontmatter.tools.trim().length > 0) {
  return 'agent';  // Has tools → agent
}
return 'skill';  // No tools → skill (or rule)
```

### Decision 2: Directory Structure Handling

**Problem**: Skills use `skill-name/SKILL.md` structure. How to map to flat package ID?

**Decision**: Use directory name as package ID, require SKILL.md filename

**Rationale**:
- Directory name is semantic identifier
- SKILL.md is convention, not configuration
- Supporting files can live alongside

**Implementation**:
- Package ID: `typescript-type-safety`
- File path: `.claude/skills/typescript-type-safety/SKILL.md`
- Supporting files: `.claude/skills/typescript-type-safety/examples/*.ts`

### Decision 3: CSO Preservation

**Problem**: When converting from other formats, descriptions may not be CSO-optimized.

**Options**:
1. Keep original description
2. Generate CSO-optimized description
3. Warn about poor CSO

**Decision**: Option 3 - Keep original, warn if poor CSO

**Rationale**:
- Auto-generation could change meaning
- Users should review and improve
- Warnings enable quality scoring

**Implementation**:
```typescript
function validateCSO(description: string): string[] {
  const warnings: string[] = [];

  if (!description.toLowerCase().includes('use when')) {
    warnings.push('Description should start with "Use when" for better Claude search');
  }

  if (description.length > 200) {
    warnings.push('Description is long (>200 chars), may impact search relevance');
  }

  if (description.length < 50) {
    warnings.push('Description is short (<50 chars), add more context for better search');
  }

  return warnings;
}
```

### Decision 4: Frontmatter Size Limit

**Problem**: Claude has 1024 char limit for entire frontmatter. How to handle overflow?

**Decision**: Truncate tags first, then description if needed, warn user

**Rationale**:
- Name is most critical (identifier)
- Description is critical (search)
- Tags are supplementary
- User should be notified

**Implementation**:
```typescript
function ensureFrontmatterLimit(frontmatter: string, metadata: any): string {
  if (frontmatter.length <= 1024) return frontmatter;

  // Try removing tags
  const withoutTags = buildFrontmatter({ ...metadata, tags: [] });
  if (withoutTags.length <= 1024) {
    warnings.push('Tags removed to fit frontmatter size limit');
    return withoutTags;
  }

  // Truncate description
  const truncatedDesc = metadata.description.substring(0, 150) + '...';
  const truncated = buildFrontmatter({ ...metadata, description: truncatedDesc, tags: [] });
  warnings.push('Description truncated and tags removed to fit frontmatter size limit');
  return truncated;
}
```

### Decision 5: Model Field Storage

**Problem**: Some agents specify preferred model (sonnet, opus, haiku). Where to store this?

**Decision**: Store in `metadata.data.claudeAgent.model`, roundtrip on conversion

**Rationale**:
- Model is Claude-specific configuration
- Should survive conversion to/from canonical
- Not all formats support model preference

**Implementation**:
```typescript
// On parse (from-claude.ts)
if (frontmatter.model) {
  metadataSection.data.claudeAgent = {
    model: frontmatter.model
  };
}

// On conversion (to-claude.ts)
const storedModel = metadata?.data.claudeAgent?.model;
const modelValue = options?.claudeConfig?.model || storedModel;
if (modelValue) {
  lines.push(`model: ${modelValue}`);
}
```

---

## Best Practices

### 1. Optimize for Discovery (CSO)

**❌ Bad**: Generic description
```yaml
description: TypeScript patterns
```

**✅ Good**: Specific triggers + benefit
```yaml
description: Use when encountering TypeScript type errors or designing type-safe APIs - provides patterns for strict typing, type guards, and generic constraints
```

### 2. Match Specificity to Degrees of Freedom

**High freedom** (creative design):
```markdown
## API Design Principles

- Use REST for CRUD operations
- Use GraphQL for complex data relationships
- Use WebSockets for real-time updates

*Choose based on use case and trade-offs*
```

**Low freedom** (critical deployment):
```markdown
## Deployment Checklist

1. Run `npm run build` to create production bundle
2. Run `npm run test:e2e` - **must pass 100%**
3. Create git tag: `git tag v1.2.3`
4. Push to production: `git push production main`
5. Monitor logs for 5 minutes
6. If errors, run rollback: `git revert HEAD && git push production main`
```

### 3. Include Real Examples

**❌ Bad**: Abstract explanation
```markdown
Use type guards to check types at runtime.
```

**✅ Good**: Concrete, runnable code
```markdown
### Type Guard Example

\`\`\`typescript
interface User {
  id: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

// Usage
const data = await fetch('/api/user').then(r => r.json());
if (isUser(data)) {
  console.log(data.email);  // ✅ Type-safe
}
\`\`\`
```

### 4. Add "When NOT to Use"

```markdown
## When to Use

**Use when:**
- Building complex state machines
- Need exhaustive type checking
- Working with async data loading

**Don't use for:**
- Simple boolean flags (`isLoading`)
- Single error messages
- Well-typed third-party SDK responses
```

### 5. Keep Skills Focused

**❌ Bad**: Kitchen sink skill
```markdown
# JavaScript Everything

## Arrays
## Objects
## Promises
## Async/Await
## Modules
## Classes
```

**✅ Good**: Focused skills
- `async-error-handling` - Just async/await patterns
- `array-transformations` - Just map/filter/reduce
- `typescript-generics` - Just generic type patterns

---

## Future Enhancements

### 1. Skill Composition

**Idea**: Reference other skills for modularity

```yaml
---
name: full-stack-api-design
description: Complete guide for building production APIs
extends:
  - rest-api-patterns
  - typescript-type-safety
  - database-optimization
---
```

### 2. Skill Versioning

**Idea**: Track skill evolution over time

```yaml
---
name: react-patterns
description: React best practices and patterns
version: 2.0.0
changelog:
  - 2.0.0: Updated for React 18 and Server Components
  - 1.5.0: Added Hooks patterns
  - 1.0.0: Initial release
---
```

### 3. Usage Analytics

**Idea**: Track which skills are most referenced

```markdown
## Skill Analytics

- Times referenced: 1,247
- Success rate: 94% (user feedback)
- Most common with: typescript-type-safety, api-design-patterns
```

### 4. Interactive Examples

**Idea**: Executable code samples

```markdown
## Try It

\`\`\`typescript interactive
// Edit and run this example
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet("World"));
\`\`\`
```

---

## Conclusion

Claude Desktop's skills system represents a **reference-based** approach to AI customization:

- **Skills are documentation**, not instructions
- **CSO optimization** is critical for discovery
- **Degrees of freedom** should match task complexity
- **Examples matter** more than explanations

PRPM's implementation fully supports Claude skills:
- ✅ YAML frontmatter parsing (name, description, tags, tools, model)
- ✅ Skills vs agents detection via tools field
- ✅ Directory structure handling
- ✅ CSO validation and warnings
- ✅ Frontmatter size limit enforcement
- ✅ Model preference roundtrip

The format's main strengths:
- Simple, familiar Markdown + YAML
- Optimized for Claude's search system
- Clear separation: skills (reference) vs agents (persona) vs rules (conventions)

The format's main limitations:
- No conditional application (unlike Kiro's fileMatch or Cursor's globs)
- 1024 char frontmatter limit
- Directory-per-skill can be verbose for simple skills

As Claude Desktop evolves, we expect:
- Richer frontmatter options
- Better composition/inheritance
- Usage analytics
- Tighter IDE integration

PRPM will continue to support these enhancements and ensure seamless conversion across all formats.

---

## Additional Resources

- [Claude Desktop Documentation](https://claude.ai/desktop)
- [Creating Skills Meta-Skill](./.claude/skills/creating-skills/SKILL.md)
- [PRPM Claude Format Examples](https://github.com/pr-pm/prpm/tree/main/examples/claude)
- [PRPM Format Conversion System](/docs/FORMAT_CONVERSION.md)

---

**Questions or feedback?** Open an issue on [GitHub](https://github.com/pr-pm/prpm/issues) or join our [Discord community](https://discord.gg/prpm).
