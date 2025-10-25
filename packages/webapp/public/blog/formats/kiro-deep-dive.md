# Kiro Steering Files: A Technical Deep Dive

**Published**: 2025-01-XX
**Author**: PRPM Team
**Format**: Kiro (`.kiro/steering/*.md`)
**Status**: Production

---

## Table of Contents

1. [Introduction](#introduction)
2. [Format Specification](#format-specification)
3. [The Three Foundational Files](#the-three-foundational-files)
4. [Inclusion Modes](#inclusion-modes)
5. [PRPM's Implementation](#prpms-implementation)
6. [Conversion & Taxonomy](#conversion--taxonomy)
7. [Technical Design Decisions](#technical-design-decisions)
8. [Best Practices](#best-practices)
9. [Future Enhancements](#future-enhancements)

---

## Introduction

Kiro is an AI coding assistant that takes a unique approach to prompt engineering: instead of a single monolithic configuration file, it uses **domain-organized steering files**. Each steering file focuses on a specific aspect of your codebase (testing, security, architecture, etc.) and can be activated based on context.

This architectural decision makes Kiro's prompt system:
- **Modular**: Concerns are separated into focused files
- **Context-aware**: Rules apply only when relevant
- **Scalable**: Easy to add new domains without conflicts
- **Maintainable**: Changes are isolated to specific domains

## Format Specification

### File Structure

Kiro steering files are Markdown documents with YAML frontmatter:

```markdown
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Testing Standards

Guidelines for writing tests in this project.

## Test Structure

- Use describe blocks for test suites
- One test per behavior
- Clear, descriptive test names
```

### Location Convention

All steering files live in `.kiro/steering/`:

```
.kiro/
└── steering/
    ├── product.md         # Product overview (foundational)
    ├── tech.md            # Technology stack (foundational)
    ├── structure.md       # Project structure (foundational)
    ├── testing.md         # Testing guidelines
    ├── security.md        # Security rules
    └── api-design.md      # API conventions
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inclusion` | `'always' \| 'fileMatch' \| 'manual'` | **Yes** | When to activate this steering file |
| `fileMatchPattern` | `string` | Conditional | Glob pattern (required if `inclusion: fileMatch`) |
| `domain` | `string` | No | Domain/topic (defaults to filename) |

---

## The Three Foundational Files

Kiro recognizes three **special steering files** that provide core project context:

### 1. product.md - Product Overview

**Purpose**: Defines your product's purpose, target users, key features, and business objectives.

**Why it matters**: Helps Kiro understand the "why" behind technical decisions and suggest solutions aligned with product goals.

**Example structure**:
```markdown
---
inclusion: always
---

# Product Overview

## Mission
We're building a universal package manager for AI coding tool configurations.

## Target Users
- **Developers**: Want to share/discover prompts and agents
- **Teams**: Need consistent AI behavior across projects
- **Tool creators**: Want distribution for their prompt libraries

## Key Features
- Cross-format conversion (Cursor ↔ Claude ↔ Continue ↔ Kiro)
- Version management and dependency resolution
- Community-driven package registry

## Business Objectives
- Become the npm of AI prompts
- Enable ecosystem growth through standardization
- Monetize through enterprise features
```

### 2. tech.md - Technology Stack

**Purpose**: Documents frameworks, libraries, development tools, and technical constraints.

**Why it matters**: When Kiro suggests implementations, it prefers your established stack over alternatives.

**Example structure**:
```markdown
---
inclusion: always
---

# Technology Stack

## Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: React Context + Hooks
- **Data Fetching**: SWR

## Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Database**: PostgreSQL 15
- **ORM**: None (raw SQL for performance)
- **Cache**: Redis

## Infrastructure
- **Hosting**: Vercel (frontend), AWS (backend)
- **CI/CD**: GitHub Actions
- **Monitoring**: Datadog

## Constraints
- Must support Node 16+ (for backwards compatibility)
- No external CSS-in-JS libraries (bundle size)
- Prefer standard library over dependencies
```

### 3. structure.md - Project Structure

**Purpose**: Outlines file organization, naming conventions, import patterns, and architectural decisions.

**Why it matters**: Ensures generated code fits seamlessly into your existing codebase.

**Example structure**:
```markdown
---
inclusion: always
---

# Project Structure

## Directory Organization

\`\`\`
packages/
├── cli/               # Command-line interface
│   ├── src/
│   │   ├── commands/  # One file per command
│   │   ├── core/      # Shared utilities
│   │   └── types/     # TypeScript definitions
│   └── __tests__/     # Colocated tests
├── registry/          # Backend API
│   ├── src/
│   │   ├── routes/    # Fastify route handlers
│   │   ├── converters/# Format conversion logic
│   │   └── db/        # Database utilities
│   └── migrations/    # SQL migrations
└── webapp/            # Next.js frontend
    └── src/
        ├── app/       # App Router pages
        ├── components/# Reusable React components
        └── lib/       # Client utilities
\`\`\`

## Naming Conventions

### Files
- **Routes**: Lowercase, hyphenated (`package-routes.ts`)
- **Components**: PascalCase (`PackageCard.tsx`)
- **Utilities**: Lowercase, descriptive (`format-utils.ts`)
- **Tests**: Same as file + `.test.ts` suffix

### Code
- **Functions**: camelCase, verb-first (`getPackage`, `validateManifest`)
- **Types/Interfaces**: PascalCase (`CanonicalPackage`, `ConversionResult`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_UPLOAD_SIZE`)

## Import Patterns

\`\`\`typescript
// ✅ Use absolute imports with @ alias
import { getPackage } from '@/lib/registry-client';

// ❌ Don't use relative imports for cross-module
import { getPackage } from '../../../lib/registry-client';

// ✅ Group imports: external, internal, types
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { getPackage } from '@/lib/registry-client';
import { convertPackage } from '@/converters';

import type { CanonicalPackage } from '@/types/canonical';
\`\`\`

## Architectural Decisions

### ADR-001: Monorepo with npm Workspaces
**Decision**: Use npm workspaces instead of Lerna/Nx
**Rationale**: Simpler, native npm support, less tooling overhead
**Consequences**: Manual build orchestration, no task caching

### ADR-002: Raw SQL over ORM
**Decision**: Use `pg` with raw SQL queries instead of Prisma/TypeORM
**Rationale**: Better performance, more control, simpler debugging
**Consequences**: More boilerplate, manual migration management

### ADR-003: Canonical Format for Storage
**Decision**: Store packages in normalized canonical format, convert on-demand
**Rationale**: Single source of truth, easier to add new formats
**Consequences**: Conversion overhead (mitigated by caching)
```

---

## Inclusion Modes

Kiro's inclusion modes determine **when** a steering file becomes active during AI interactions.

### 1. Always Inclusion

**Trigger**: Active for all AI interactions
**Use case**: Universal rules that should always apply

```yaml
---
inclusion: always
---
```

**Examples**:
- Code style guidelines
- Company-wide best practices
- Brand voice/tone
- Foundational files (product.md, tech.md, structure.md)

**Pros**:
- Ensures consistent behavior
- No manual activation needed
- Perfect for baseline standards

**Cons**:
- Increases token usage
- Can clutter context for unrelated tasks

### 2. File Match Inclusion

**Trigger**: Active when working with files matching the glob pattern
**Use case**: Context-specific rules

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---
```

**Examples**:
- Testing guidelines (`**/*.test.ts`)
- Component standards (`src/components/**/*.tsx`)
- API conventions (`src/api/**/*.ts`)
- Database patterns (`**/*.migration.ts`)

**Glob patterns** (`.gitignore` syntax):
- `**/*.test.ts` - All test files, any depth
- `src/**/*.ts` - All TypeScript in src
- `src/api/*.ts` - Direct children only (not subdirectories)
- `{**/*.test.ts,**/*.spec.ts}` - Multiple patterns

**Pros**:
- Automatic context awareness
- Reduces token usage
- Scales well with large codebases

**Cons**:
- Pattern matching can be tricky
- Need to maintain patterns as codebase evolves

### 3. Manual Inclusion

**Trigger**: Active only when explicitly requested by user
**Use case**: On-demand checklists and specialized reviews

```yaml
---
inclusion: manual
---
```

**Examples**:
- Security audit checklist
- Performance optimization guide
- Accessibility review criteria
- Deployment runbook

**Pros**:
- No token overhead when not needed
- Perfect for specialized tasks
- User controls when to apply

**Cons**:
- Requires manual activation
- Easy to forget to use

---

## PRPM's Implementation

### Parsing Kiro Files

PRPM's Kiro parser (`from-kiro.ts`) extracts frontmatter and content:

```typescript
export function fromKiro(
  content: string,
  metadata: PackageMetadata
): CanonicalPackage {
  // 1. Parse YAML frontmatter
  const { frontmatter, body } = parseFrontmatter(content);

  // 2. Validate required fields
  if (!frontmatter.inclusion) {
    throw new Error('Kiro steering files require inclusion field');
  }

  if (frontmatter.inclusion === 'fileMatch' && !frontmatter.fileMatchPattern) {
    throw new Error('fileMatch requires fileMatchPattern');
  }

  // 3. Parse markdown body into sections
  const sections = parseMarkdown(body);

  // 4. Detect foundational file type
  const foundationalType = detectFoundationalType(metadata.name);

  // 5. Build canonical package
  const pkg: CanonicalPackage = {
    id: metadata.id,
    name: metadata.name,
    format: 'kiro',
    subtype: 'rule',
    tags: ['kiro', ...inferTags(frontmatter, foundationalType)],
    content: {
      format: 'canonical',
      version: '1.0',
      sections,
    },
    metadata: {
      kiroConfig: {
        filename: metadata.name,
        inclusion: frontmatter.inclusion,
        fileMatchPattern: frontmatter.fileMatchPattern,
        foundationalType, // 'product' | 'tech' | 'structure' | undefined
      },
    },
  };

  return pkg;
}
```

### Foundational File Detection

```typescript
function detectFoundationalType(filename: string): 'product' | 'tech' | 'structure' | undefined {
  const normalized = filename.toLowerCase().replace(/\.md$/, '');

  if (normalized === 'product') return 'product';
  if (normalized === 'tech') return 'tech';
  if (normalized === 'structure') return 'structure';

  return undefined;
}
```

### Auto-Tagging

Foundational files get special tags for discoverability:

```typescript
function inferTags(
  frontmatter: KiroFrontmatter,
  foundationalType?: 'product' | 'tech' | 'structure'
): string[] {
  const tags: string[] = [];

  // Tag foundational files
  if (foundationalType) {
    tags.push(`kiro-${foundationalType}`); // 'kiro-product', 'kiro-tech', 'kiro-structure'
  }

  // Tag by inclusion mode
  if (frontmatter.inclusion) {
    tags.push(`kiro-${frontmatter.inclusion}`); // 'kiro-always', 'kiro-fileMatch', 'kiro-manual'
  }

  // Extract domain from file pattern
  if (frontmatter.fileMatchPattern) {
    const pathMatch = frontmatter.fileMatchPattern.match(/\/([^/]+)\//);
    if (pathMatch) {
      tags.push(pathMatch[1]); // e.g., 'api' from 'src/api/**/*.ts'
    }
  }

  return tags;
}
```

### Storage Schema

Kiro-specific configuration is stored in the canonical package metadata:

```typescript
interface CanonicalPackage {
  // ... standard fields
  metadata: {
    kiroConfig?: {
      filename: string;                              // Suggested filename
      inclusion: 'always' | 'fileMatch' | 'manual';  // Activation mode
      fileMatchPattern?: string;                      // Glob pattern (if fileMatch)
      domain?: string;                                // Domain/topic
      foundationalType?: 'product' | 'tech' | 'structure'; // Special file marker
    };
  };
}
```

### Conversion to Kiro Format

Converting other formats to Kiro requires mapping to the frontmatter structure:

```typescript
export function toKiro(pkg: CanonicalPackage): ConversionResult {
  const kiroConfig = pkg.metadata?.kiroConfig;

  // Build frontmatter
  const frontmatter: string[] = ['---'];

  frontmatter.push(`inclusion: ${kiroConfig?.inclusion || 'manual'}`);

  if (kiroConfig?.fileMatchPattern) {
    frontmatter.push(`fileMatchPattern: "${kiroConfig.fileMatchPattern}"`);
  }

  if (kiroConfig?.domain) {
    frontmatter.push(`domain: ${kiroConfig.domain}`);
  }

  frontmatter.push('---');

  // Build markdown body from sections
  const sections = pkg.content.sections
    .filter(s => s.type !== 'metadata') // Skip metadata section
    .map(s => sectionToMarkdown(s));

  return {
    content: [...frontmatter, '', ...sections].join('\n'),
    filename: kiroConfig?.filename || `${pkg.name}.md`,
    qualityScore: calculateQualityScore(pkg),
  };
}
```

---

## Conversion & Taxonomy

### Taxonomy Mapping

In PRPM's taxonomy system:

```typescript
{
  format: 'kiro',           // Source format
  subtype: 'rule',          // All Kiro files are rules (they steer AI behavior)
  tags: [
    'kiro',                 // Format tag
    'kiro-product',         // Foundational type (if applicable)
    'kiro-always',          // Inclusion mode
    'testing',              // Extracted from fileMatchPattern
  ]
}
```

### Cross-Format Conversion

#### Cursor → Kiro

```markdown
# Before (.cursorrules)
# Testing Best Practices

- Write unit tests for all functions
- Use descriptive test names
- Mock external dependencies

# After (.kiro/steering/testing.md)
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Testing Best Practices

- Write unit tests for all functions
- Use descriptive test names
- Mock external dependencies
```

**Changes**:
- ✅ Add frontmatter with `inclusion` and `fileMatchPattern`
- ✅ Infer file pattern from content context
- ✅ Suggest appropriate inclusion mode

#### Claude → Kiro

```markdown
# Before (agent.md)
---
name: testing-assistant
description: Helps write comprehensive tests
tools: Read, Write, Bash
---

# Testing Assistant

You are an expert at writing tests.

## Guidelines
- Use describe/it blocks
- One assertion per test

# After (.kiro/steering/testing.md)
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Testing Guidelines

## Best Practices
- Use describe/it blocks
- One assertion per test
```

**Changes**:
- ✅ Convert Claude frontmatter to Kiro frontmatter
- ✅ Remove persona/tools (not supported in Kiro)
- ✅ Convert instructions to guidelines
- ⚠️ **Lossy conversion**: Persona and tool specifications are lost

---

## Technical Design Decisions

### Decision 1: Separate Foundational Files

**Problem**: How to handle Kiro's three special files (product.md, tech.md, structure.md)?

**Options Considered**:
1. Create new subtypes: `'product-context'`, `'tech-stack'`, `'project-structure'`
2. Use existing `'template'` subtype
3. Keep as `'rule'` with specialized tags

**Decision**: Option 3 - Keep as `'rule'` subtype with auto-tags

**Rationale**:
- These files **are** rules - they guide/steer AI behavior
- Creating new subtypes would complicate the taxonomy
- Tags provide sufficient discoverability (`kiro-product`, `kiro-tech`, `kiro-structure`)
- Metadata field (`foundationalType`) preserves semantic meaning

**Implementation**:
```typescript
// Auto-detect foundational files
const foundationalType = detectFoundationalType(filename);

// Tag appropriately
if (foundationalType) {
  tags.push(`kiro-${foundationalType}`);
}

// Store in metadata
pkg.metadata.kiroConfig.foundationalType = foundationalType;
```

### Decision 2: Frontmatter Validation

**Problem**: What if users forget required fields in frontmatter?

**Options**:
1. Fail validation (strict)
2. Provide defaults (permissive)
3. Fail for `inclusion`, default others

**Decision**: Option 3 - Strict on `inclusion`, permissive on others

**Rationale**:
- `inclusion` is fundamental to Kiro's behavior - must be explicit
- `fileMatchPattern` validation only when `inclusion: fileMatch`
- `domain` can default to filename

**Implementation**:
```typescript
if (!frontmatter.inclusion) {
  throw new Error('Kiro steering files require inclusion field in frontmatter');
}

if (frontmatter.inclusion === 'fileMatch' && !frontmatter.fileMatchPattern) {
  throw new Error('fileMatch inclusion mode requires fileMatchPattern');
}

// Domain defaults to filename if not provided
const domain = frontmatter.domain || metadata.name.replace(/-/g, ' ').replace(/\.md$/, '');
```

### Decision 3: Glob Pattern Storage

**Problem**: How to validate and store glob patterns?

**Decision**: Store as string, validate syntax on publish, document `.gitignore` format

**Rationale**:
- Glob validation libraries add dependencies
- Pattern validity depends on the tool consuming it (Kiro in this case)
- Users familiar with `.gitignore` syntax can leverage existing knowledge

**Documentation**:
```markdown
## Glob Pattern Syntax

Kiro uses `.gitignore` style patterns:
- `*.ts` - Direct children only
- `**/*.ts` - Any depth
- `src/**/*.{ts,tsx}` - Multiple extensions
- `!**/*.test.ts` - Negation (exclude)
```

### Decision 4: Conversion Quality Scoring

**Problem**: How to score conversion quality when converting to Kiro?

**Scoring logic**:
```typescript
function calculateQualityScore(pkg: CanonicalPackage): number {
  let score = 100;

  // Deduct for unsupported features
  if (hasPersonaSection(pkg)) score -= 10; // Kiro doesn't support personas
  if (hasToolsSection(pkg)) score -= 10;   // Kiro doesn't support tool configs

  // Deduct if inclusion mode is missing
  if (!pkg.metadata?.kiroConfig?.inclusion) score -= 20;

  // Deduct if fileMatch but no pattern
  if (pkg.metadata?.kiroConfig?.inclusion === 'fileMatch' &&
      !pkg.metadata?.kiroConfig?.fileMatchPattern) score -= 30;

  return Math.max(0, score);
}
```

---

## Best Practices

### 1. Organization by Domain, Not File Type

**❌ Bad**: Organize by file type
```
.kiro/steering/
├── tests.md          # All test-related rules
├── components.md     # All component rules
└── apis.md           # All API rules
```

**✅ Good**: Organize by domain/concern
```
.kiro/steering/
├── product.md        # Product context
├── tech.md           # Technology choices
├── structure.md      # Project organization
├── testing.md        # Testing standards
├── security.md       # Security guidelines
└── api-design.md     # API conventions
```

### 2. Use Specific File Patterns

**❌ Bad**: Overly broad patterns
```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.ts"  # Matches everything!
---
```

**✅ Good**: Targeted patterns
```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"  # Only test files
---
```

### 3. Include Rationale and Examples

**❌ Bad**: Rules without context
```markdown
## Database Access

- Always use transactions
- Index foreign keys
```

**✅ Good**: Rules with rationale and examples
```markdown
## Database Access

### Use Transactions for Multi-Step Operations

**Rationale**: Ensures data consistency if any step fails.

\`\`\`typescript
// ✅ Good: Wrapped in transaction
await db.transaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.profile.create({ data: profileData });
});

// ❌ Bad: Separate operations, inconsistent on failure
await db.user.create({ data: userData });
await db.profile.create({ data: profileData });
\`\`\`

### Index All Foreign Keys

**Rationale**: Foreign key lookups are frequent; indexing improves query performance 10-100x.

\`\`\`sql
-- ✅ Good: Foreign key with index
CREATE TABLE posts (
  author_id INTEGER REFERENCES users(id),
  INDEX idx_posts_author_id (author_id)
);
\`\`\`
```

### 4. Choose Appropriate Inclusion Modes

| Scenario | Inclusion Mode | Rationale |
|----------|----------------|-----------|
| Code formatting rules | `always` | Should apply everywhere |
| Testing conventions | `fileMatch: "**/*.test.ts"` | Only relevant in test files |
| Security audit checklist | `manual` | Used on-demand for reviews |
| React component patterns | `fileMatch: "src/components/**/*.tsx"` | Context-specific |
| Deployment runbook | `manual` | Rarely needed, manual invocation |

---

## Future Enhancements

### 1. Conditional Inclusion

**Idea**: Combine multiple conditions

```yaml
---
inclusion: conditional
conditions:
  - fileMatch: "**/*.ts"
  - timeOfDay: "working-hours"  # 9am-5pm only
  - gitBranch: "feature/*"       # Only on feature branches
---
```

### 2. Inclusion Priority

**Idea**: Control order when multiple files match

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
priority: 10  # Higher priority = loaded first
---
```

### 3. Dynamic Patterns

**Idea**: Generate patterns from project configuration

```yaml
---
inclusion: fileMatch
fileMatchPattern: "${testFilePattern}"  # Reads from package.json
---
```

### 4. Shared Snippets

**Idea**: Reference common sections across files

```markdown
---
inclusion: fileMatch
fileMatchPattern: "src/**/*.tsx"
imports:
  - .kiro/snippets/react-standards.md
---

# Component Standards

{{import:react-standards}}

## Additional Guidelines
...
```

---

## Conclusion

Kiro's steering file approach represents a **paradigm shift** in how we think about prompt engineering:

- **Modular**: Concerns are separated and composable
- **Context-aware**: Rules apply based on file patterns
- **Scalable**: Easy to grow without conflicts
- **Maintainable**: Changes are isolated

PRPM's implementation fully supports Kiro's unique features:
- ✅ Frontmatter parsing and validation
- ✅ Foundational file detection and tagging
- ✅ Cross-format conversion
- ✅ Quality scoring and warnings

The three foundational files (`product.md`, `tech.md`, `structure.md`) provide critical context that helps AI assistants make better decisions aligned with your project's goals and constraints.

As AI coding assistants evolve, we expect more tools to adopt domain-organized, context-aware prompt systems like Kiro's. PRPM is ready to support this evolution with robust conversion and package management.

---

## Additional Resources

- [Kiro Official Documentation](https://kiro.dev/docs)
- [PRPM Kiro Format Guide](/docs/KIRO.md)
- [Kiro Steering File Examples](https://github.com/pr-pm/prpm/tree/main/examples/kiro)
- [PRPM Format Conversion System](/docs/FORMAT_CONVERSION.md)

---

**Questions or feedback?** Open an issue on [GitHub](https://github.com/pr-pm/prpm/issues) or join our [Discord community](https://discord.gg/prpm).
