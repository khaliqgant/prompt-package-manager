# GitHub Copilot Instructions: A Deep Dive into PRPM's Implementation

GitHub Copilot's instruction system represents a pragmatic approach to contextual AI assistance: provide global guidance for the entire repository while allowing fine-grained control for specific code paths. Unlike other formats that emphasize single-file simplicity or multi-file organization by domain, Copilot's design reflects its IDE-integrated nature and focus on code completion at scale.

This post explores GitHub Copilot's instruction format, PRPM's technical implementation, and the design decisions that enable universal package management across AI coding tools.

---

## Table of Contents

1. [Format Specification](#format-specification)
2. [Two-Tier Instruction System](#two-tier-instruction-system)
3. [PRPM's Implementation](#prpms-implementation)
4. [Conversion & Taxonomy](#conversion--taxonomy)
5. [Technical Design Decisions](#technical-design-decisions)
6. [Best Practices](#best-practices)
7. [Cross-Format Conversion Examples](#cross-format-conversion-examples)
8. [Future Enhancements](#future-enhancements)
9. [Conclusion](#conclusion)

---

## Format Specification

### Repository-Wide Instructions

**Location**: `.github/copilot-instructions.md`

**Purpose**: Provide global context that applies to all code in the repository.

**Structure**: Plain markdown, no frontmatter required.

**Example**:

```markdown
# Project Guidelines

This is a TypeScript monorepo using pnpm workspaces.

## Code Style

- Use functional components with TypeScript
- Prefer named exports over default exports
- Keep functions pure when possible
- Extract custom hooks for reusable logic

## Testing

- Write tests using Vitest
- Co-locate tests with source files
- Use descriptive test names that explain behavior
```

### Path-Specific Instructions

**Location**: `.github/instructions/*.instructions.md`

**Purpose**: Provide targeted guidance for specific file patterns (e.g., API routes, React components, database migrations).

**Structure**: Markdown with optional YAML frontmatter containing `applyTo` field.

**Frontmatter Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `applyTo` | string[] | No | Glob patterns specifying which files this instruction applies to |

**Example**: `.github/instructions/api-routes.instructions.md`

```markdown
---
applyTo:
  - "src/api/**/*.ts"
  - "packages/*/src/api/**/*.ts"
---

# API Route Guidelines

All API routes should follow these patterns:

## Structure

1. Validate input with Zod schemas
2. Check authentication/authorization
3. Perform business logic
4. Return typed responses

## Error Handling

Always catch errors and return appropriate status codes:

- 400: Invalid input
- 401: Unauthenticated
- 403: Unauthorized
- 404: Not found
- 500: Server error

## Example

\`\`\`typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Check auth
    const user = await authenticate(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Business logic
    const result = await createUser(data);

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
\`\`\`
```

**Example**: `.github/instructions/react-components.instructions.md`

```markdown
---
applyTo:
  - "src/components/**/*.tsx"
  - "packages/webapp/src/components/**/*.tsx"
---

# React Component Guidelines

## Component Structure

Use functional components with TypeScript interfaces for props:

\`\`\`typescript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={() => onEdit(user)}>Edit</button>
      )}
    </div>
  );
}
\`\`\`

## State Management

- Use `useState` for local component state
- Use Zustand for global state
- Use React Context for component tree state
- Extract custom hooks when logic exceeds 10 lines

## Performance

- Use `React.memo()` for expensive components
- Use `useMemo()` for expensive calculations
- Use `useCallback()` for functions passed as props
- Avoid inline object/array creation in JSX
```

---

## Two-Tier Instruction System

GitHub Copilot's design reflects a key insight: **not all guidance applies equally to all code**. The two-tier system balances global consistency with contextual specificity.

### Repository-Wide Layer

The `.github/copilot-instructions.md` file provides:

- **Tech stack declaration**: What frameworks, libraries, and tools are in use
- **Coding standards**: Language-specific conventions that apply everywhere
- **Project philosophy**: Architectural principles and design values
- **General patterns**: Common approaches that transcend file types

**When to use**:
- Project-wide coding standards (naming conventions, code style)
- Tech stack constraints (use X, not Y)
- Universal security practices
- High-level architectural principles

**What not to include**:
- File-type-specific patterns (those go in path-specific instructions)
- Domain-specific rules (API vs frontend vs database)
- Overly detailed examples (keep it high-level)

### Path-Specific Layer

The `.github/instructions/*.instructions.md` files provide:

- **Contextual patterns**: How to write API routes vs React components vs database migrations
- **Domain rules**: Frontend vs backend vs infrastructure concerns
- **File-type conventions**: Test files, config files, migration files, etc.
- **Technology-specific guidance**: Framework-specific patterns

**When to use**:
- API route patterns (input validation, auth, error handling)
- React component structure (props, hooks, styling)
- Database migration format (up/down, naming, safety checks)
- Test file conventions (describe blocks, mocking, assertions)
- Config file patterns (environment variables, feature flags)

**The `applyTo` Field**:

The `applyTo` frontmatter field uses glob patterns to specify which files an instruction applies to:

```yaml
---
applyTo:
  - "src/api/**/*.ts"           # All API routes
  - "packages/*/src/api/**/*.ts" # API routes in monorepo packages
---
```

**Glob pattern syntax** (follows `.gitignore` conventions):

- `**/*.ts` - All TypeScript files, any depth
- `src/**/*.tsx` - All React files in src
- `src/api/*.ts` - Files directly in src/api (not subdirectories)
- `src/api/**/*.ts` - Files in src/api and subdirectories
- `**/*.test.ts` - All test files

---

## PRPM's Implementation

### Parsing GitHub Copilot Instructions

PRPM's `from-copilot.ts` converter handles both repository-wide and path-specific instructions.

#### Source Code: `packages/registry/src/converters/from-copilot.ts`

```typescript
/**
 * GitHub Copilot Parser
 * Converts GitHub Copilot instructions to canonical format
 */

import yaml from 'js-yaml';
import type {
  CanonicalPackage,
  CanonicalContent,
  Section,
  InstructionsSection,
  MetadataSection,
} from '../types/canonical.js';
import { setTaxonomy } from './taxonomy-utils.js';

export interface PackageMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  tags?: string[];
  version?: string;
}

/**
 * Parse GitHub Copilot instruction file to canonical format
 */
export function fromCopilot(
  content: string,
  metadata: PackageMetadata
): CanonicalPackage {
  // Try to parse frontmatter (optional for Copilot)
  const { frontmatter, body } = parseFrontmatter(content);

  // Build sections
  const sections: Section[] = [];

  // Create metadata section
  const metadataSection: MetadataSection = {
    type: 'metadata',
    data: {
      title: metadata.name,
      description: metadata.description || '',
    },
  };
  sections.push(metadataSection);

  // Add main content as instructions section
  const instructionsSection: InstructionsSection = {
    type: 'instructions',
    title: 'GitHub Copilot Instructions',
    content: body.trim(),
  };
  sections.push(instructionsSection);

  // Build canonical content
  const canonicalContent: CanonicalContent = {
    format: 'canonical',
    version: '1.0',
    sections,
  };

  // Infer if this is path-specific based on applyTo field
  const isPathSpecific = frontmatter.applyTo && frontmatter.applyTo.length > 0;

  // Build canonical package
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    version: metadata.version || '1.0.0',
    name: metadata.name,
    description: metadata.description || '',
    author: metadata.author || '',
    tags: metadata.tags || ['copilot', isPathSpecific ? 'path-specific' : 'repository-wide'],
    content: canonicalContent,
    sourceFormat: 'copilot',
    metadata: {
      title: metadata.name,
      description: metadata.description || '',
      copilotConfig: {
        applyTo: frontmatter.applyTo,
        isPathSpecific,
      },
    },
  };

  // Set taxonomy (format + subtype + legacy type)
  setTaxonomy(pkg, 'copilot', 'rule');

  return pkg as CanonicalPackage;
}

/**
 * Parse optional YAML frontmatter from Copilot instruction file
 * Frontmatter is optional - Copilot instructions can be plain markdown
 */
function parseFrontmatter(content: string): {
  frontmatter: {
    applyTo?: string[];
  };
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    // No frontmatter - that's okay for Copilot
    return {
      frontmatter: {},
      body: content,
    };
  }

  const [, frontmatterText, body] = match;

  try {
    // Parse YAML frontmatter
    const parsed = yaml.load(frontmatterText) as Record<string, unknown>;

    const frontmatter: {
      applyTo?: string[];
    } = {};

    if (parsed && typeof parsed === 'object') {
      // Parse applyTo field (array of glob patterns)
      if ('applyTo' in parsed && Array.isArray(parsed.applyTo)) {
        frontmatter.applyTo = parsed.applyTo.filter(
          (item): item is string => typeof item === 'string'
        );
      }
    }

    return { frontmatter, body };
  } catch (error) {
    throw new Error(
      `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

### Key Implementation Details

#### 1. Optional Frontmatter Handling

Unlike Kiro (which requires frontmatter), Copilot instructions can be plain markdown:

```typescript
function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    // No frontmatter - that's okay for Copilot
    return {
      frontmatter: {},
      body: content,
    };
  }
  // ... parse frontmatter if present
}
```

**Design rationale**: Repository-wide instructions don't need `applyTo` (they apply everywhere), so frontmatter is only required for path-specific instructions.

#### 2. applyTo Storage

The `applyTo` field is stored in `metadata.copilotConfig`:

```typescript
metadata: {
  title: metadata.name,
  description: metadata.description || '',
  copilotConfig: {
    applyTo: frontmatter.applyTo,  // Array of glob patterns
    isPathSpecific,                // Derived boolean flag
  },
},
```

This enables:
- **Format conversion**: When converting to other formats, preserve path-specific context
- **Search/filtering**: Find all path-specific instructions
- **Validation**: Ensure path-specific instructions have valid glob patterns

#### 3. Auto-Tagging

PRPM automatically tags packages based on instruction type:

```typescript
const isPathSpecific = frontmatter.applyTo && frontmatter.applyTo.length > 0;

tags: metadata.tags || [
  'copilot',
  isPathSpecific ? 'path-specific' : 'repository-wide'
],
```

This allows users to search for:
- `prpm search "copilot repository-wide"` - Global instructions
- `prpm search "copilot path-specific"` - Contextual instructions

#### 4. Single Instructions Section

Unlike Cursor/Claude (which parse markdown into multiple sections), Copilot instructions are stored as a single `InstructionsSection`:

```typescript
const instructionsSection: InstructionsSection = {
  type: 'instructions',
  title: 'GitHub Copilot Instructions',
  content: body.trim(),  // Entire body as-is
};
sections.push(instructionsSection);
```

**Design rationale**: Copilot's format is optimized for IDE consumption, not semantic structure. The IDE interprets the content contextually based on the file being edited. PRPM preserves the original structure for maximum fidelity.

---

## Conversion & Taxonomy

### Canonical Format Representation

A GitHub Copilot instruction file converts to canonical format like this:

**Source** (`.github/instructions/api-routes.instructions.md`):

```markdown
---
applyTo:
  - "src/api/**/*.ts"
---

# API Route Guidelines

All API routes should validate input with Zod schemas.

## Example

\`\`\`typescript
const schema = z.object({ name: z.string() });
\`\`\`
```

**Canonical representation**:

```json
{
  "id": "api-route-guidelines",
  "version": "1.0.0",
  "name": "API Route Guidelines",
  "description": "Guidelines for writing API routes",
  "author": "acme-corp",
  "tags": ["copilot", "path-specific", "api"],
  "format": "copilot",
  "subtype": "rule",
  "type": "rule",
  "sourceFormat": "copilot",

  "content": {
    "format": "canonical",
    "version": "1.0",
    "sections": [
      {
        "type": "metadata",
        "data": {
          "title": "API Route Guidelines",
          "description": "Guidelines for writing API routes"
        }
      },
      {
        "type": "instructions",
        "title": "GitHub Copilot Instructions",
        "content": "# API Route Guidelines\n\nAll API routes should validate input with Zod schemas.\n\n## Example\n\n```typescript\nconst schema = z.object({ name: z.string() });\n```"
      }
    ]
  },

  "metadata": {
    "title": "API Route Guidelines",
    "description": "Guidelines for writing API routes",
    "copilotConfig": {
      "applyTo": ["src/api/**/*.ts"],
      "isPathSpecific": true
    }
  }
}
```

### Taxonomy Fields

PRPM's taxonomy system uses three fields for backward compatibility:

```typescript
setTaxonomy(pkg, 'copilot', 'rule');

// Sets:
pkg.format = 'copilot';     // New taxonomy
pkg.subtype = 'rule';       // New taxonomy
pkg.type = 'rule';          // Legacy field (deprecated)
```

**Why `rule` subtype?**

GitHub Copilot instructions are behavioral guidance for the AI assistant. They don't:
- Execute code (not `tool`)
- Define multi-step workflows (not `workflow`)
- Act as autonomous agents (not `agent`)

They **do**:
- Guide code generation behavior
- Enforce patterns and conventions
- Provide contextual rules

Therefore: `subtype: 'rule'`

---

## Technical Design Decisions

### 1. Optional Frontmatter vs Required Frontmatter

**Decision**: Make frontmatter optional for Copilot instructions.

**Rationale**:

GitHub Copilot's repository-wide instructions (`.github/copilot-instructions.md`) don't need frontmatter because they apply to the entire repository. Requiring frontmatter would add friction for the most common use case.

**Trade-offs**:

✅ **Pro**: Simple onboarding for repository-wide instructions
✅ **Pro**: Matches GitHub's official documentation
✅ **Pro**: Reduces boilerplate for common case

❌ **Con**: Two parsing paths (with/without frontmatter)
❌ **Con**: Less structured metadata

**Implementation**:

```typescript
function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    // No frontmatter - that's okay!
    return { frontmatter: {}, body: content };
  }

  // Parse frontmatter if present
  const [, frontmatterText, body] = match;
  const parsed = yaml.load(frontmatterText);
  return { frontmatter: parsed, body };
}
```

**Alternative considered**: Require frontmatter for all instructions.

**Why rejected**: GitHub's own examples show repository-wide instructions without frontmatter. Requiring it would create friction and diverge from the official spec.

---

### 2. applyTo as Array vs Single String

**Decision**: Store `applyTo` as an array of strings.

**Rationale**:

Path-specific instructions often apply to multiple patterns. For example, API route guidelines might apply to:
- `src/api/**/*.ts` (root API routes)
- `packages/*/src/api/**/*.ts` (monorepo package API routes)
- `apps/*/api/**/*.ts` (app-specific API routes)

Using an array allows one instruction file to cover all variants.

**Trade-offs**:

✅ **Pro**: Avoids duplication (one file for multiple patterns)
✅ **Pro**: Matches GitHub's frontmatter spec
✅ **Pro**: Easier to maintain (update one file vs many)

❌ **Con**: Slightly more complex validation

**Implementation**:

```typescript
if ('applyTo' in parsed && Array.isArray(parsed.applyTo)) {
  frontmatter.applyTo = parsed.applyTo.filter(
    (item): item is string => typeof item === 'string'
  );
}
```

**Alternative considered**: Store `applyTo` as a single string and require multiple files for multiple patterns.

**Why rejected**: Leads to duplication and maintenance burden. If guidelines change, you'd need to update multiple files.

---

### 3. Single Instructions Section vs Structured Parsing

**Decision**: Store Copilot instructions as a single `InstructionsSection` without parsing markdown structure.

**Rationale**:

GitHub Copilot's format is designed for IDE consumption, not semantic structure. The IDE interprets the content contextually based on:
- The file being edited
- The cursor position
- Recent changes

Parsing into structured sections (rules, examples, context) would:
1. Impose structure that doesn't exist in the source format
2. Potentially lose information during round-trip conversion
3. Add complexity with minimal benefit

**Trade-offs**:

✅ **Pro**: Perfect fidelity (lossless conversion)
✅ **Pro**: Simple implementation
✅ **Pro**: Faster parsing (no markdown traversal)

❌ **Con**: Less semantic metadata for search/filtering
❌ **Con**: Can't analyze section types

**Implementation**:

```typescript
const instructionsSection: InstructionsSection = {
  type: 'instructions',
  title: 'GitHub Copilot Instructions',
  content: body.trim(),  // Entire body as-is
};
sections.push(instructionsSection);
```

**Alternative considered**: Parse markdown into rules, examples, and context sections (like Cursor/Claude).

**Why rejected**: GitHub Copilot doesn't define a semantic structure. Imposing one would be arbitrary and could cause information loss. Better to preserve the original format exactly.

---

### 4. isPathSpecific Flag vs Computed Property

**Decision**: Store `isPathSpecific` as a boolean flag in `copilotConfig`.

**Rationale**:

Whether an instruction is path-specific is a key piece of metadata that affects:
- **Installation**: Where to place the file (root vs instructions/)
- **Search/filtering**: Users want to find "all path-specific instructions"
- **Conversion**: Path-specific instructions convert differently to other formats

Computing this on-the-fly would require checking `applyTo` every time. Storing it once during parsing is more efficient.

**Trade-offs**:

✅ **Pro**: Fast lookup (no computation needed)
✅ **Pro**: Clear API (explicit flag vs implicit check)
✅ **Pro**: Enables efficient filtering in database queries

❌ **Con**: Redundant data (derivable from `applyTo`)
❌ **Con**: Must keep in sync if `applyTo` changes

**Implementation**:

```typescript
const isPathSpecific = frontmatter.applyTo && frontmatter.applyTo.length > 0;

copilotConfig: {
  applyTo: frontmatter.applyTo,
  isPathSpecific,  // Derived boolean
}
```

**Alternative considered**: Compute on-demand with a helper function:

```typescript
function isPathSpecific(pkg: CanonicalPackage): boolean {
  return pkg.metadata?.copilotConfig?.applyTo?.length > 0;
}
```

**Why rejected**: Requires all code to import and call the helper. Storing the flag once is simpler and more efficient.

---

### 5. Automatic Tagging vs Manual Tagging

**Decision**: Automatically add `repository-wide` or `path-specific` tags based on `applyTo` field.

**Rationale**:

Users need to find instructions by scope:
- "Show me all repository-wide instructions"
- "Show me API-specific instructions"

Requiring manual tagging would lead to:
- Inconsistent tags (some use "global", others "repo-wide", etc.)
- Missing tags (forgotten during package creation)
- Incorrect tags (mismatch with actual `applyTo` value)

Automatic tagging ensures consistency and accuracy.

**Trade-offs**:

✅ **Pro**: Consistent tags across all packages
✅ **Pro**: No manual work for package authors
✅ **Pro**: Tags always match reality

❌ **Con**: Can't override automatic tags
❌ **Con**: Slightly less flexible

**Implementation**:

```typescript
const isPathSpecific = frontmatter.applyTo && frontmatter.applyTo.length > 0;

tags: metadata.tags || [
  'copilot',
  isPathSpecific ? 'path-specific' : 'repository-wide'
],
```

**Alternative considered**: Let package authors manually specify tags.

**Why rejected**: Leads to inconsistency. Better to have a convention that's enforced automatically.

---

## Best Practices

### Repository-Wide Instructions

**DO**: Provide high-level, project-wide guidance

```markdown
# Project Guidelines

This is a TypeScript monorepo using pnpm workspaces.

## Code Style

- Use functional components with TypeScript
- Prefer named exports over default exports
- Extract custom hooks for reusable logic

## Testing

- Write tests using Vitest
- Co-locate tests with source files
```

**DON'T**: Include file-type-specific patterns

```markdown
# ❌ BAD: Too specific for repository-wide

## API Routes

All API routes must use Fastify and validate with Zod.

## React Components

All components must use Tailwind CSS.
```

*Rationale*: File-type-specific patterns belong in path-specific instructions. Mixing concerns makes repository-wide instructions harder to maintain.

---

### Path-Specific Instructions

**DO**: Target specific file patterns with contextual guidance

```markdown
---
applyTo:
  - "src/api/**/*.ts"
---

# API Route Guidelines

All API routes should:

1. Validate input with Zod schemas
2. Check authentication with middleware
3. Return typed responses
4. Handle errors with try/catch
```

**DON'T**: Create overly broad patterns

```markdown
---
applyTo:
  - "**/*.ts"  # ❌ BAD: Too broad
---

# TypeScript Guidelines

Use strict mode.
```

*Rationale*: If guidance applies to all TypeScript files, it should be in repository-wide instructions. Path-specific instructions should be contextual.

---

### Glob Pattern Specificity

**DO**: Use specific patterns that match your project structure

```markdown
---
applyTo:
  - "src/components/**/*.tsx"        # ✅ Good: Component-specific
  - "src/api/routes/**/*.ts"          # ✅ Good: API route-specific
  - "packages/*/src/migrations/**/*.ts" # ✅ Good: Migration-specific
---
```

**DON'T**: Use vague patterns

```markdown
---
applyTo:
  - "src/**/*"  # ❌ BAD: Too broad
  - "*.tsx"     # ❌ BAD: Misses nested files
---
```

*Rationale*: Specific patterns ensure instructions apply only where relevant. Broad patterns dilute the contextual benefit.

---

### Organizing Multiple Instructions

**DO**: Create one instruction file per concern

```
.github/instructions/
├── api-routes.instructions.md      # API-specific patterns
├── react-components.instructions.md # Component-specific patterns
├── database-migrations.instructions.md # Migration-specific patterns
└── test-files.instructions.md      # Test-specific patterns
```

**DON'T**: Combine unrelated concerns

```markdown
---
applyTo:
  - "src/api/**/*.ts"
  - "src/components/**/*.tsx"
  - "src/db/**/*.ts"
---

# ❌ BAD: Everything Guidelines

Rules for APIs, components, and database code...
```

*Rationale*: One concern per file makes instructions easier to find, update, and maintain.

---

### Examples and Code Snippets

**DO**: Provide complete, runnable examples

```markdown
## Example API Route

\`\`\`typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const result = await db.user.create({ data });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
\`\`\`
```

**DON'T**: Provide incomplete snippets

```markdown
## ❌ BAD Example

\`\`\`typescript
// Validate input
const data = schema.parse(body);

// Save to database
const result = await db.user.create({ data });
\`\`\`
```

*Rationale*: Complete examples show the full pattern (imports, error handling, types). Incomplete snippets leave developers guessing.

---

## Cross-Format Conversion Examples

### Copilot → Cursor

**Source** (`.github/instructions/react-components.instructions.md`):

```markdown
---
applyTo:
  - "src/components/**/*.tsx"
---

# React Component Guidelines

Use functional components with TypeScript.

## Example

\`\`\`typescript
interface Props {
  name: string;
}

export function Greeting({ name }: Props) {
  return <div>Hello, {name}!</div>;
}
\`\`\`
```

**Converted to Cursor** (`.cursor/rules/react-components.mdc`):

```markdown
---
title: React Component Guidelines
description: Guidelines for writing React components
tags: [react, typescript, components]
globs:
  - "src/components/**/*.tsx"
alwaysApply: false
---

# React Component Guidelines

Use functional components with TypeScript.

## Example

\`\`\`typescript
interface Props {
  name: string;
}

export function Greeting({ name }: Props) {
  return <div>Hello, {name}!</div>;
}
\`\`\`
```

**Key changes**:
- `applyTo` → `globs` (same glob patterns, different field name)
- Added required Cursor frontmatter (`title`, `description`, `tags`)
- Set `alwaysApply: false` (applies only to matched files)

---

### Copilot → Claude

**Source** (`.github/copilot-instructions.md`):

```markdown
# Project Guidelines

This is a TypeScript monorepo using pnpm workspaces.

## Code Style

- Use functional components with TypeScript
- Prefer named exports over default exports
```

**Converted to Claude** (`.claude/skills/project-guidelines/SKILL.md`):

```markdown
---
name: Project Guidelines
description: High-level guidelines for the entire project
tags: [typescript, monorepo, code-style]
---

# Project Guidelines

This is a TypeScript monorepo using pnpm workspaces.

## Code Style

- Use functional components with TypeScript
- Prefer named exports over default exports
```

**Key changes**:
- Repository-wide → Claude skill (applies to entire project)
- Added required Claude frontmatter (`name`, `description`, `tags`)
- Content remains identical (both are markdown)

---

### Copilot → Kiro

**Source** (`.github/instructions/api-routes.instructions.md`):

```markdown
---
applyTo:
  - "src/api/**/*.ts"
---

# API Route Guidelines

All API routes should validate input with Zod schemas.
```

**Converted to Kiro** (`.kiro/steering/api-routes.md`):

```markdown
---
inclusion: fileMatch
fileMatchPattern: "src/api/**/*.ts"
domain: api
---

# API Route Guidelines

All API routes should validate input with Zod schemas.
```

**Key changes**:
- `applyTo` → `fileMatchPattern` (same glob patterns)
- Added `inclusion: fileMatch` (Kiro's equivalent of path-specific)
- Added `domain: api` (Kiro's organizational concept)

**Repository-wide conversion**:

```markdown
# Repository-Wide Copilot Instructions
```

→

```markdown
---
inclusion: always
domain: general
---

# Repository-Wide Copilot Instructions
```

**Key changes**:
- No `applyTo` → `inclusion: always` (applies everywhere)
- Added `domain: general` (required for Kiro)

---

## Future Enhancements

### 1. Glob Pattern Validation

**Enhancement**: Validate glob patterns against actual project structure.

**Current state**: PRPM accepts any glob pattern without validation.

**Proposed**:

```typescript
interface ValidationResult {
  valid: boolean;
  matchedFiles: string[];
  warnings: string[];
}

async function validateGlobPattern(
  pattern: string,
  projectPath: string
): Promise<ValidationResult> {
  const glob = await import('glob');
  const matchedFiles = await glob(pattern, { cwd: projectPath });

  const warnings: string[] = [];

  if (matchedFiles.length === 0) {
    warnings.push(`Pattern "${pattern}" matches no files in this project`);
  }

  return {
    valid: true,
    matchedFiles,
    warnings,
  };
}
```

**Benefits**:
- Catch typos in glob patterns before publishing
- Warn about patterns that match nothing
- Suggest corrections for common mistakes

---

### 2. Smart Glob Pattern Inference

**Enhancement**: Automatically suggest glob patterns based on filename.

**Example**:

```bash
$ prpm init copilot api-routes.instructions.md

🤖 Detected filename: api-routes.instructions.md

📁 Suggested glob patterns:
  1. src/api/**/*.ts (found 47 files)
  2. src/routes/**/*.ts (found 23 files)
  3. packages/*/src/api/**/*.ts (found 12 files)

Which pattern(s) should this instruction apply to? [1,3]: 1,3

✅ Created .github/instructions/api-routes.instructions.md with:
   applyTo:
     - "src/api/**/*.ts"
     - "packages/*/src/api/**/*.ts"
```

**Implementation**:

```typescript
function suggestGlobPatterns(
  filename: string,
  projectPath: string
): GlobSuggestion[] {
  const nameParts = filename
    .replace('.instructions.md', '')
    .split('-');

  const suggestions: GlobSuggestion[] = [];

  // Try common patterns
  for (const part of nameParts) {
    suggestions.push({
      pattern: `src/${part}/**/*.ts`,
      reason: `Matches TypeScript files in src/${part}/`,
    });

    suggestions.push({
      pattern: `**/${part}/**/*.tsx`,
      reason: `Matches React components in ${part}/ directories`,
    });
  }

  return suggestions;
}
```

---

### 3. Multi-Format Packages

**Enhancement**: Allow single package to provide both repository-wide and path-specific instructions.

**Current state**: One package = one instruction file.

**Proposed**: Support packages with multiple instruction files:

```json
{
  "name": "@acme/backend-guidelines",
  "format": "copilot",
  "files": [
    ".github/instructions/api-routes.instructions.md",
    ".github/instructions/database.instructions.md",
    ".github/instructions/workers.instructions.md"
  ]
}
```

**Installation**:

```bash
$ prpm install @acme/backend-guidelines

✅ Installed 3 instruction files:
   - .github/instructions/api-routes.instructions.md (applies to src/api/**/*.ts)
   - .github/instructions/database.instructions.md (applies to src/db/**/*.ts)
   - .github/instructions/workers.instructions.md (applies to src/workers/**/*.ts)
```

---

### 4. Conditional Instructions Based on File Content

**Enhancement**: Apply instructions based on file content, not just path.

**Example**: Apply "Next.js API Route" instructions only to files that export API route handlers:

```yaml
---
applyTo:
  - "src/app/**/*.ts"
applyWhen:
  exportsMatch: "^(GET|POST|PUT|DELETE|PATCH)$"
  importsInclude: "next/server"
---
```

**Implementation challenge**: Requires parsing file content, not just paths. Computationally expensive.

**Alternative**: Use more specific glob patterns or file naming conventions.

---

### 5. Instruction Composition

**Enhancement**: Allow instructions to reference/extend other instructions.

**Example**:

```markdown
---
applyTo:
  - "src/api/admin/**/*.ts"
extends: "api-routes"  # Inherits base API route guidelines
---

# Admin API Routes

In addition to standard API guidelines, admin routes must:

1. Check for admin role in authentication
2. Log all operations for audit trail
3. Rate limit to 10 requests/minute
```

**Benefits**:
- Avoid duplication
- Maintain consistency
- Easier to update shared guidelines

**Implementation**:

```typescript
async function resolveInstructions(
  instructionId: string,
  registry: RegistryClient
): Promise<ResolvedInstruction> {
  const instruction = await registry.getInstruction(instructionId);

  if (instruction.extends) {
    const parent = await resolveInstructions(instruction.extends, registry);
    return mergeInstructions(parent, instruction);
  }

  return instruction;
}
```

---

## Conclusion

GitHub Copilot's instruction format represents a **pragmatic approach to contextual AI assistance**: provide global guidance while allowing fine-grained control for specific code paths. The two-tier system (repository-wide + path-specific) balances simplicity with flexibility.

### Key Takeaways

1. **Optional frontmatter** reduces friction for repository-wide instructions
2. **applyTo glob patterns** enable precise targeting without duplication
3. **Single Instructions section** preserves perfect fidelity (lossless conversion)
4. **Automatic tagging** ensures consistent metadata across packages
5. **Format conversion** works seamlessly (Copilot ↔ Cursor ↔ Claude ↔ Kiro)

### PRPM's Design Philosophy

PRPM's implementation of GitHub Copilot support reflects three core principles:

1. **Fidelity**: Preserve original format structure exactly (no forced parsing)
2. **Flexibility**: Support both simple (repository-wide) and complex (path-specific) use cases
3. **Interoperability**: Enable seamless conversion to/from other formats

### Resources

- [GitHub Copilot Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [PRPM GitHub Copilot Guide](/docs/GITHUB_COPILOT.md)
- [PRPM Canonical Format Specification](/docs/FORMAT_CONVERSION.md)
- [from-copilot.ts Source Code](https://github.com/pr-pm/prpm/blob/main/packages/registry/src/converters/from-copilot.ts)

---

**Next**: [Agents.md Format Deep Dive](/blog/formats/agents-deep-dive) - Exploring hierarchical agent composition and multi-agent orchestration.
