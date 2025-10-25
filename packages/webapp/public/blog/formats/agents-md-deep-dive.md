# agents.md: A Deep Dive into OpenAI's Open Standard for AI Coding Agents

In a fragmented ecosystem where every AI coding tool uses its own configuration format, agents.md emerges as a refreshing attempt at standardization. Created through collaboration between OpenAI, Google, and other major players, agents.md is an **open, simple, and tool-agnostic format** for providing project-specific guidance to AI coding agents.

This post explores the agents.md format specification, PRPM's implementation approach, and the technical design decisions that enable seamless integration with the broader AI coding ecosystem.

---

## Table of Contents

1. [Format Specification](#format-specification)
2. [The Simplicity Philosophy](#the-simplicity-philosophy)
3. [PRPM's Implementation](#prpms-implementation)
4. [Conversion & Taxonomy](#conversion--taxonomy)
5. [Technical Design Decisions](#technical-design-decisions)
6. [Best Practices](#best-practices)
7. [Cross-Format Conversion Examples](#cross-format-conversion-examples)
8. [Future Enhancements](#future-enhancements)
9. [Conclusion](#conclusion)

---

## Format Specification

### File Location

**Location**: `agents.md` in project root

**Purpose**: Provide project-specific context and guidelines for AI coding agents, regardless of which tool is being used.

### Structure

agents.md files are **simple markdown** with **optional YAML frontmatter**. The format emphasizes human readability and ease of adoption.

**Optional frontmatter fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project` | string | No | Project name or identifier |
| `scope` | string | No | Scope of the guidance (e.g., "backend", "frontend", "full-stack") |

### Basic Example

```markdown
# TypeScript Microservices Project

This is a TypeScript-based microservices architecture using NestJS, PostgreSQL, and RabbitMQ.

## Code Style

- Use functional programming patterns when possible
- Prefer composition over inheritance
- Keep functions pure and side-effect-free
- Use dependency injection for all external dependencies

## Testing

- Write unit tests for all business logic
- Write integration tests for API endpoints
- Use factories for test data generation
- Mock external services in unit tests

## Architecture

We follow the hexagonal architecture pattern:

- **Domain Layer**: Pure business logic, no dependencies
- **Application Layer**: Use cases and orchestration
- **Infrastructure Layer**: External dependencies (DB, queue, HTTP)

### Example Service Structure

\`\`\`typescript
// domain/user.entity.ts
export class User {
  constructor(
    private readonly id: string,
    private readonly email: string,
    private readonly name: string
  ) {}

  // Pure domain logic
  changeEmail(newEmail: string): User {
    if (!this.isValidEmail(newEmail)) {
      throw new InvalidEmailError(newEmail);
    }
    return new User(this.id, newEmail, this.name);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// application/change-email.usecase.ts
export class ChangeEmailUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(userId: string, newEmail: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    const updatedUser = user.changeEmail(newEmail);

    await this.userRepository.save(updatedUser);
    await this.emailService.sendConfirmation(updatedUser.email);
  }
}
\`\`\`

## Common Patterns

### Error Handling

All errors should extend base domain errors:

\`\`\`typescript
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super(\`Invalid email format: \${email}\`);
  }
}
\`\`\`

### API Response Format

All API responses follow this structure:

\`\`\`typescript
{
  "success": true,
  "data": { /* response payload */ },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "abc-123"
  }
}

// Or for errors:
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email format is invalid",
    "details": { /* validation errors */ }
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "abc-123"
  }
}
\`\`\`
```

### Example with Frontmatter

```markdown
---
project: acme-ecommerce
scope: backend
---

# Acme E-Commerce Backend

Backend services for the Acme e-commerce platform.

## Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 15 with Prisma ORM
- **Queue**: RabbitMQ for async tasks
- **Cache**: Redis for session/cache
- **API**: REST + GraphQL

## Guidelines

[... rest of the content ...]
```

---

## The Simplicity Philosophy

agents.md's design philosophy is **radical simplicity**:

1. **Single file**: No directory structure, no multiple files, just `agents.md` in the root
2. **Plain markdown**: No special syntax, no custom extensions
3. **Optional metadata**: Frontmatter is optional, not required
4. **Human-first**: Readable and editable by developers without tooling
5. **Tool-agnostic**: Works with any AI coding agent, not tied to a specific tool

### Why This Matters

The AI coding tool landscape is fragmented:
- Cursor uses `.cursor/rules/`
- GitHub Copilot uses `.github/copilot-instructions.md`
- Claude uses `.claude/skills/`
- Kiro uses `.kiro/steering/`
- Continue uses `.continue/prompts/`
- Windsurf uses `.windsurfrules`

agents.md provides a **neutral, open standard** that all these tools can support. Instead of writing 6 different configuration files, developers write one agents.md file and let their tools consume it.

**Key insight**: The format's power is in what it **doesn't** require:
- No frontmatter (unless you want it)
- No specific sections (organize however makes sense)
- No special syntax (just markdown)
- No tool-specific features (works everywhere)

This mirrors the philosophy of:
- `README.md` - universal documentation
- `LICENSE` - universal licensing
- `CONTRIBUTING.md` - universal contribution guide

agents.md aims to be the **universal AI guidance file**.

---

## PRPM's Implementation

### Parsing agents.md Files

PRPM's `from-agents-md.ts` converter treats agents.md as a **flexible, unstructured format** that can be parsed into canonical sections.

#### Source Code: `packages/registry/src/converters/from-agents-md.ts` (excerpt)

```typescript
/**
 * agents.md Parser
 * Converts OpenAI agents.md files to canonical format
 */

export function fromAgentsMd(
  content: string,
  metadata: PackageMetadata
): CanonicalPackage {
  // Parse frontmatter if exists (optional for agents.md)
  const { frontmatter, body } = parseFrontmatter(content);

  // Parse markdown body
  const sections = parseMarkdown(body);

  // Extract description from first paragraph if not provided
  const description = metadata.description || extractDescription(body);

  // Create metadata section
  const metadataSection: MetadataSection = {
    type: 'metadata',
    data: {
      title: metadata.name,
      description,
    },
  };

  // Build canonical content
  const canonicalContent: CanonicalContent = {
    format: 'canonical',
    version: '1.0',
    sections: [metadataSection, ...sections],
  };

  // Build canonical package
  const pkg: Partial<CanonicalPackage> = {
    id: metadata.id,
    version: metadata.version || '1.0.0',
    name: metadata.name,
    description,
    author: metadata.author || '',
    tags: metadata.tags || ['agents.md', ...inferTags(body)],
    content: canonicalContent,
    sourceFormat: 'agents.md',
    metadata: {
      title: metadata.name,
      description,
      agentsMdConfig: {
        project: frontmatter.project,
        scope: frontmatter.scope,
      },
    },
  };

  // Set taxonomy (format + subtype + legacy type)
  setTaxonomy(pkg, 'agents.md', 'rule');

  return pkg as CanonicalPackage;
}
```

### Key Implementation Details

#### 1. Optional Frontmatter Handling

Unlike Kiro (which requires frontmatter), agents.md files can be plain markdown:

```typescript
function parseFrontmatter(content: string): {
  frontmatter: { project?: string; scope?: string };
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    // No frontmatter - totally fine for agents.md
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;

  try {
    const parsed = yaml.load(frontmatterText) as Record<string, unknown>;

    const frontmatter: { project?: string; scope?: string } = {};

    if (parsed && typeof parsed === 'object') {
      if ('project' in parsed && typeof parsed.project === 'string') {
        frontmatter.project = parsed.project;
      }
      if ('scope' in parsed && typeof parsed.scope === 'string') {
        frontmatter.scope = parsed.scope;
      }
    }

    return { frontmatter, body };
  } catch (error) {
    // If YAML parsing fails, return empty frontmatter
    console.warn('Failed to parse YAML frontmatter:', error);
    return { frontmatter: {}, body: content };
  }
}
```

**Design rationale**: agents.md emphasizes simplicity. Requiring frontmatter would add unnecessary complexity for the common case. The format should work with zero configuration.

#### 2. Auto-Description Extraction

If no description is provided, PRPM extracts one from the first paragraph:

```typescript
function extractDescription(content: string): string {
  const lines = content.split('\n');
  let afterHeading = false;
  const descriptionLines: string[] = [];

  for (const line of lines) {
    // Skip main heading
    if (line.startsWith('# ')) {
      afterHeading = true;
      continue;
    }

    // Stop at next heading
    if (afterHeading && (line.startsWith('## ') || line.startsWith('### '))) {
      break;
    }

    // Collect non-empty lines after main heading
    if (afterHeading && line.trim()) {
      descriptionLines.push(line.trim());
      // Stop after first paragraph
      if (descriptionLines.length > 0 && line.trim() === '') {
        break;
      }
    }
  }

  return descriptionLines.join(' ').substring(0, 200);
}
```

**Example**:

```markdown
# TypeScript Best Practices

This guide provides production-grade TypeScript patterns for enterprise applications. It covers type safety, performance, and maintainability.

## Guidelines

[...]
```

**Extracted description**: "This guide provides production-grade TypeScript patterns for enterprise applications. It covers type safety, performance, and maintainability."

#### 3. Flexible Section Parsing

PRPM parses markdown structure into canonical sections (rules, examples, context, instructions):

```typescript
function inferSectionType(
  title: string,
  lines: string[],
  startIndex: number
): 'instructions' | 'rules' | 'examples' | 'context' {
  const titleLower = title.toLowerCase();

  // Check for examples keywords
  if (titleLower.includes('example') || titleLower.includes('sample') || titleLower.includes('usage')) {
    return 'examples';
  }

  // Check for rules/guidelines keywords
  if (
    titleLower.includes('rule') ||
    titleLower.includes('guideline') ||
    titleLower.includes('standard') ||
    titleLower.includes('convention') ||
    titleLower.includes('requirement') ||
    titleLower.includes('must') ||
    titleLower.includes('should')
  ) {
    return 'rules';
  }

  // Check for context keywords
  if (
    titleLower.includes('context') ||
    titleLower.includes('background') ||
    titleLower.includes('overview') ||
    titleLower.includes('about') ||
    titleLower.includes('introduction')
  ) {
    return 'context';
  }

  // Look ahead to see if next lines are list items
  for (let i = startIndex + 1; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
      return 'rules';
    }
    if (line.startsWith('### ') || line.startsWith('```')) {
      return 'examples';
    }
  }

  // Default to instructions
  return 'instructions';
}
```

**Design rationale**: agents.md doesn't enforce section types, so PRPM infers them from:
- Section titles (keywords like "example", "rule", "overview")
- Content structure (bullet lists → rules, code blocks → examples)
- Fallback to `instructions` type for everything else

This enables semantic search and filtering while respecting the format's flexibility.

#### 4. Auto-Tag Inference

PRPM automatically infers technology tags from content:

```typescript
function inferTags(content: string): string[] {
  const tags: string[] = [];
  const contentLower = content.toLowerCase();

  const techKeywords = [
    'typescript',
    'javascript',
    'python',
    'react',
    'testing',
    'api',
    'backend',
    'frontend',
    'database',
    'security',
  ];

  for (const keyword of techKeywords) {
    if (contentLower.includes(keyword)) {
      tags.push(keyword);
    }
  }

  // OpenAI Codex specific
  if (contentLower.includes('codex') || contentLower.includes('openai')) {
    tags.push('codex');
  }

  return tags.slice(0, 5); // Limit to 5 inferred tags
}
```

**Example**:

```markdown
# React TypeScript Best Practices

Guidelines for building React applications with TypeScript.
Use functional components and hooks for all new code.
```

**Inferred tags**: `['agents.md', 'react', 'typescript', 'frontend']`

#### 5. Metadata Storage

agents.md-specific metadata is stored in `metadata.agentsMdConfig`:

```typescript
metadata: {
  title: metadata.name,
  description,
  agentsMdConfig: {
    project: frontmatter.project,  // Optional project identifier
    scope: frontmatter.scope,      // Optional scope (backend/frontend/etc)
  },
},
```

This enables:
- **Search filtering**: Find packages for specific projects or scopes
- **Format conversion**: Preserve project/scope when converting to other formats
- **Quality metadata**: Track agents.md-specific attributes

---

## Conversion & Taxonomy

### Canonical Format Representation

An agents.md file converts to canonical format like this:

**Source** (`agents.md`):

```markdown
---
project: acme-api
scope: backend
---

# API Guidelines

This project follows REST API best practices.

## Rules

- Validate all inputs with Zod schemas
- Return consistent error responses
- Use HTTP status codes correctly

## Example

\`\`\`typescript
const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json();
  const data = schema.parse(body);
  // ...
}
\`\`\`
```

**Canonical representation**:

```json
{
  "id": "acme-api-guidelines",
  "version": "1.0.0",
  "name": "API Guidelines",
  "description": "This project follows REST API best practices.",
  "author": "acme-corp",
  "tags": ["agents.md", "api", "backend"],
  "format": "agents.md",
  "subtype": "rule",
  "type": "rule",
  "sourceFormat": "agents.md",

  "content": {
    "format": "canonical",
    "version": "1.0",
    "sections": [
      {
        "type": "metadata",
        "data": {
          "title": "API Guidelines",
          "description": "This project follows REST API best practices."
        }
      },
      {
        "type": "context",
        "title": "Project Overview",
        "content": "API Guidelines"
      },
      {
        "type": "rules",
        "title": "Rules",
        "items": [
          { "content": "Validate all inputs with Zod schemas" },
          { "content": "Return consistent error responses" },
          { "content": "Use HTTP status codes correctly" }
        ],
        "ordered": false
      },
      {
        "type": "examples",
        "title": "Example",
        "examples": [
          {
            "description": "Code example",
            "code": "const schema = z.object({ email: z.string().email() });\n\nexport async function POST(request: Request) {\n  const body = await request.json();\n  const data = schema.parse(body);\n  // ...\n}",
            "language": "typescript"
          }
        ]
      }
    ]
  },

  "metadata": {
    "title": "API Guidelines",
    "description": "This project follows REST API best practices.",
    "agentsMdConfig": {
      "project": "acme-api",
      "scope": "backend"
    }
  }
}
```

### Taxonomy Fields

PRPM's taxonomy system uses three fields for backward compatibility:

```typescript
setTaxonomy(pkg, 'agents.md', 'rule');

// Sets:
pkg.format = 'agents.md';   // New taxonomy
pkg.subtype = 'rule';       // New taxonomy
pkg.type = 'rule';          // Legacy field (deprecated)
```

**Why `rule` subtype?**

agents.md files are project-specific guidance for AI behavior. They:
- Provide coding standards and patterns
- Define project conventions
- Guide AI decision-making

They don't:
- Execute code autonomously (not `tool`)
- Define multi-step workflows (not `workflow`)
- Act as specialized agents (not `agent`)

Therefore: `subtype: 'rule'`

---

## Technical Design Decisions

### 1. Optional Frontmatter vs Required Frontmatter

**Decision**: Make frontmatter entirely optional for agents.md files.

**Rationale**:

The agents.md specification emphasizes **simplicity above all else**. Requiring frontmatter would:
1. Add friction for new users ("I just want to write some guidelines!")
2. Go against the format's philosophy of minimal ceremony
3. Make agents.md feel like "yet another format with requirements"

By making frontmatter optional, PRPM respects the format's design goals.

**Trade-offs**:

✅ **Pro**: Zero-configuration experience
✅ **Pro**: Aligns with agents.md philosophy
✅ **Pro**: Lowers adoption barrier

❌ **Con**: Less structured metadata
❌ **Con**: Harder to categorize packages without explicit scope/project

**Implementation**:

```typescript
function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    // No frontmatter - totally fine!
    return { frontmatter: {}, body: content };
  }

  // Parse if present
  try {
    const parsed = yaml.load(frontmatterText);
    return { frontmatter: parsed, body };
  } catch (error) {
    // If parsing fails, just skip frontmatter
    console.warn('Failed to parse YAML frontmatter:', error);
    return { frontmatter: {}, body: content };
  }
}
```

**Alternative considered**: Require minimal frontmatter (e.g., `project` field).

**Why rejected**: Goes against agents.md's simplicity philosophy. The format is designed to "just work" without configuration.

---

### 2. Auto-Description Extraction vs Manual Description

**Decision**: Automatically extract description from first paragraph if not provided.

**Rationale**:

Descriptions are crucial for:
- Search results (users need to know what the package does)
- Package listings (preview text)
- SEO and discoverability

But requiring manual descriptions would add friction. By extracting from the first paragraph, PRPM provides good defaults while allowing explicit override.

**Trade-offs**:

✅ **Pro**: Zero configuration needed
✅ **Pro**: Descriptions always exist (better UX)
✅ **Pro**: Encourages good markdown structure (clear intro paragraph)

❌ **Con**: Auto-extracted descriptions may not be perfect
❌ **Con**: Extra parsing logic

**Implementation**:

```typescript
function extractDescription(content: string): string {
  const lines = content.split('\n');
  let afterHeading = false;
  const descriptionLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      afterHeading = true;
      continue;
    }

    if (afterHeading && (line.startsWith('## ') || line.startsWith('### '))) {
      break;
    }

    if (afterHeading && line.trim()) {
      descriptionLines.push(line.trim());
      if (descriptionLines.length > 0 && line.trim() === '') {
        break;
      }
    }
  }

  return descriptionLines.join(' ').substring(0, 200);
}

// Usage
const description = metadata.description || extractDescription(body);
```

**Alternative considered**: Require manual description in frontmatter.

**Why rejected**: Adds configuration burden. Better to have a reasonable default than to force users to write metadata.

---

### 3. Section Type Inference vs Unstructured Content

**Decision**: Parse markdown structure and infer section types (rules, examples, context, instructions).

**Rationale**:

agents.md doesn't define section types - it's just markdown. But PRPM needs semantic structure for:
- Search and filtering ("show me examples", "show me rules")
- Quality scoring (does the package have examples?)
- Format conversion (map sections to target format)

By inferring section types from content, PRPM gets semantic structure without requiring it in the source format.

**Trade-offs**:

✅ **Pro**: Semantic search and filtering
✅ **Pro**: Better format conversion
✅ **Pro**: No changes required to agents.md files

❌ **Con**: Inference may be wrong sometimes
❌ **Con**: More complex parsing logic

**Implementation**:

```typescript
function inferSectionType(
  title: string,
  lines: string[],
  startIndex: number
): 'instructions' | 'rules' | 'examples' | 'context' {
  const titleLower = title.toLowerCase();

  // Check title keywords
  if (titleLower.includes('example') || titleLower.includes('sample')) {
    return 'examples';
  }

  if (titleLower.includes('rule') || titleLower.includes('guideline')) {
    return 'rules';
  }

  if (titleLower.includes('context') || titleLower.includes('overview')) {
    return 'context';
  }

  // Look ahead at content structure
  for (let i = startIndex + 1; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
      return 'rules';  // Bullet list → rules
    }
    if (line.startsWith('```')) {
      return 'examples';  // Code block → examples
    }
  }

  return 'instructions';  // Default fallback
}
```

**Alternative considered**: Treat entire file as single `InstructionsSection` (like Windsurf).

**Why rejected**: Loses valuable semantic information. Better to infer structure and potentially be wrong occasionally than to have no structure at all.

---

### 4. Auto-Tag Inference vs Manual Tags

**Decision**: Automatically infer technology tags from content.

**Rationale**:

Tags are critical for discovery:
- `prpm search react` - Find React-related packages
- `prpm search typescript backend` - Find backend TypeScript packages

Requiring manual tagging would lead to:
- Inconsistent tags ("reactjs" vs "react" vs "React")
- Missing tags (authors forget to add them)
- Incomplete tags (author doesn't think to tag "testing" even though examples show tests)

Automatic inference ensures consistent, comprehensive tagging.

**Trade-offs**:

✅ **Pro**: Consistent tags across all packages
✅ **Pro**: Better search relevance
✅ **Pro**: Zero configuration for authors

❌ **Con**: May infer irrelevant tags (false positives)
❌ **Con**: Can't override inferred tags

**Implementation**:

```typescript
function inferTags(content: string): string[] {
  const tags: string[] = [];
  const contentLower = content.toLowerCase();

  const techKeywords = [
    'typescript', 'javascript', 'python', 'react',
    'testing', 'api', 'backend', 'frontend',
    'database', 'security',
  ];

  for (const keyword of techKeywords) {
    if (contentLower.includes(keyword)) {
      tags.push(keyword);
    }
  }

  return tags.slice(0, 5);  // Limit to 5 tags
}

// Usage
tags: metadata.tags || ['agents.md', ...inferTags(body)],
```

**Alternative considered**: Require manual tags in frontmatter.

**Why rejected**: Adds configuration burden and leads to inconsistent tagging. Better to have automated consistency.

---

### 5. Graceful Frontmatter Parsing vs Strict Validation

**Decision**: If frontmatter parsing fails, gracefully fall back to treating entire file as plain markdown.

**Rationale**:

agents.md files might have:
- Malformed YAML syntax
- Unsupported frontmatter fields
- Comments in frontmatter

Strict validation would reject these files. But the content might still be valuable! By falling back gracefully, PRPM maximizes compatibility.

**Trade-offs**:

✅ **Pro**: More forgiving (accepts more files)
✅ **Pro**: Doesn't break on minor YAML errors
✅ **Pro**: Respects "content over configuration" philosophy

❌ **Con**: May hide frontmatter errors from authors
❌ **Con**: Inconsistent behavior (some frontmatter works, some doesn't)

**Implementation**:

```typescript
function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;

  try {
    const parsed = yaml.load(frontmatterText);
    return { frontmatter: parsed, body };
  } catch (error) {
    // Don't fail - just warn and skip frontmatter
    console.warn('Failed to parse YAML frontmatter:', error);
    return { frontmatter: {}, body: content };
  }
}
```

**Alternative considered**: Throw error on malformed frontmatter.

**Why rejected**: Too strict. agents.md should be as forgiving as possible. The content is more important than perfect frontmatter syntax.

---

## Best Practices

### Project Overview

**DO**: Start with a clear project description

```markdown
# E-Commerce Backend Services

A microservices-based backend for an e-commerce platform, handling orders, inventory, payments, and shipping. Built with Node.js, TypeScript, and PostgreSQL.

## Architecture

We use event-driven microservices with RabbitMQ for async communication.
```

**DON'T**: Start with implementation details

```markdown
# Project

## Installation

Run `npm install` to install dependencies.

## Code

Here's how to write code:
- Use TypeScript
- Write tests
```

*Rationale*: AI agents need context first. Start with "what" and "why" before "how".

---

### Section Organization

**DO**: Organize by concern, not by file type

```markdown
## Code Style

- Use functional programming patterns
- Prefer composition over inheritance
- Keep functions pure when possible

## Testing Strategy

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

## Error Handling

All errors should extend base domain errors with specific error codes.

## Security

- Validate all user inputs
- Use parameterized queries
- Implement rate limiting
```

**DON'T**: Mix unrelated concerns

```markdown
## Guidelines

- Use TypeScript
- Test everything
- Validate inputs
- Use functional patterns
- Return HTTP 400 for bad requests
- Keep functions pure
- Use Zod for validation
```

*Rationale*: Organized sections help AI agents apply contextual guidance. Jumbled guidelines are harder to apply correctly.

---

### Examples and Code Snippets

**DO**: Provide complete, runnable examples

```markdown
## API Route Pattern

All API routes follow this structure:

\`\`\`typescript
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { db } from '@/lib/db';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const user = await authenticate(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input
    const body = await request.json();
    const data = createUserSchema.parse(body);

    // 3. Business logic
    const newUser = await db.user.create({ data });

    // 4. Return response
    return Response.json({ user: newUser }, { status: 201 });
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

**DON'T**: Provide incomplete snippets

```markdown
## ❌ BAD Example

\`\`\`typescript
// Validate input
const data = schema.parse(body);

// Save to database
await db.user.create({ data });
\`\`\`
```

*Rationale*: Complete examples show imports, types, error handling, and return values. Incomplete snippets force AI to guess or hallucinate missing details.

---

### Architecture Documentation

**DO**: Explain architectural decisions with rationale

```markdown
## Hexagonal Architecture

We use hexagonal architecture (ports and adapters pattern) to keep business logic independent of external concerns.

### Why Hexagonal Architecture?

- **Testability**: Domain logic has no external dependencies, so unit tests are fast and don't require mocks
- **Flexibility**: Can swap infrastructure (e.g., PostgreSQL → MongoDB) without changing domain
- **Clarity**: Clear boundaries between business rules and technical details

### Layer Structure

\`\`\`
domain/          # Pure business logic (entities, value objects)
├── user.entity.ts
├── order.entity.ts
└── errors.ts

application/     # Use cases and orchestration (ports)
├── create-user.usecase.ts
├── place-order.usecase.ts
└── ports/
    ├── user.repository.ts      # Interface
    └── payment.service.ts      # Interface

infrastructure/  # External dependencies (adapters)
├── repositories/
│   └── prisma-user.repository.ts  # Implements user.repository.ts
└── services/
    └── stripe-payment.service.ts  # Implements payment.service.ts
\`\`\`

### Example: Domain Entity

\`\`\`typescript
// domain/user.entity.ts
export class User {
  constructor(
    private readonly id: string,
    private readonly email: string,
    private readonly role: UserRole
  ) {}

  // Pure domain logic - no dependencies
  canAccessAdminPanel(): boolean {
    return this.role === UserRole.ADMIN;
  }

  changeEmail(newEmail: string): User {
    if (!this.isValidEmail(newEmail)) {
      throw new InvalidEmailError(newEmail);
    }
    return new User(this.id, newEmail, this.role);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
\`\`\`
```

**DON'T**: Document structure without explaining "why"

```markdown
## ❌ BAD Documentation

Put domain stuff in domain/.
Put application stuff in application/.
Put infrastructure stuff in infrastructure/.
```

*Rationale*: AI agents need to understand the "why" behind architectural decisions to make consistent choices. Structure alone isn't enough context.

---

## Cross-Format Conversion Examples

### agents.md → Cursor

**Source** (`agents.md`):

```markdown
# TypeScript Best Practices

Guidelines for writing production-grade TypeScript.

## Type Safety

- Use strict mode
- Avoid `any` type
- Prefer interfaces over types for objects

## Example

\`\`\`typescript
interface User {
  id: string;
  email: string;
}

function getUser(id: string): User {
  // ...
}
\`\`\`
```

**Converted to Cursor** (`.cursor/rules/typescript-best-practices.mdc`):

```markdown
---
title: TypeScript Best Practices
description: Guidelines for writing production-grade TypeScript
tags: [typescript, type-safety, best-practices]
alwaysApply: true
---

# TypeScript Best Practices

Guidelines for writing production-grade TypeScript.

## Type Safety

- Use strict mode
- Avoid `any` type
- Prefer interfaces over types for objects

## Example

\`\`\`typescript
interface User {
  id: string;
  email: string;
}

function getUser(id: string): User {
  // ...
}
\`\`\`
```

**Key changes**:
- Added required Cursor frontmatter (title, description, tags)
- Set `alwaysApply: true` (applies to entire project)
- Content preserved exactly

---

### agents.md → Kiro

**Source** (`agents.md`):

```markdown
---
scope: backend
---

# API Guidelines

Backend API development patterns.

## Rules

- Validate all inputs
- Use proper HTTP status codes
```

**Converted to Kiro** (`.kiro/steering/api-guidelines.md`):

```markdown
---
inclusion: always
domain: backend
---

# API Guidelines

Backend API development patterns.

## Rules

- Validate all inputs
- Use proper HTTP status codes
```

**Key changes**:
- `scope: backend` → `domain: backend`
- Added `inclusion: always` (applies everywhere)
- Content preserved exactly

---

### agents.md → GitHub Copilot

**Source** (`agents.md`):

```markdown
# Project Guidelines

TypeScript monorepo with pnpm workspaces.

## Code Style

- Functional components
- Named exports
```

**Converted to Copilot** (`.github/copilot-instructions.md`):

```markdown
# Project Guidelines

TypeScript monorepo with pnpm workspaces.

## Code Style

- Functional components
- Named exports
```

**Key changes**: None! GitHub Copilot's repository-wide format is identical to agents.md (plain markdown, no frontmatter).

---

## Future Enhancements

### 1. Multi-Agent Support

**Enhancement**: Support multiple agents.md files for different scopes.

**Current state**: Single `agents.md` file in root.

**Proposed**: Support scoped files:

```
agents.md                    # General project guidelines
backend.agents.md            # Backend-specific
frontend.agents.md           # Frontend-specific
infrastructure.agents.md     # Infrastructure-specific
```

**Installation**:

```bash
$ prpm install @acme/fullstack-guidelines

✅ Installed 4 agents.md files:
   - agents.md (project-wide)
   - backend.agents.md (backend-specific)
   - frontend.agents.md (frontend-specific)
   - infrastructure.agents.md (infrastructure-specific)
```

**Benefits**:
- Organize large projects by concern
- Avoid single massive agents.md file
- Allow scope-specific guidance

**Challenges**:
- Not officially part of agents.md spec
- Tooling may not support multiple files
- Need conventions for file naming

---

### 2. Schema Validation

**Enhancement**: Validate agents.md frontmatter against JSON Schema.

**Proposed schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "project": {
      "type": "string",
      "description": "Project name or identifier"
    },
    "scope": {
      "type": "string",
      "enum": ["backend", "frontend", "full-stack", "infrastructure", "mobile"],
      "description": "Scope of the guidance"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the guidelines"
    }
  },
  "additionalProperties": false
}
```

**Benefits**:
- Catch frontmatter errors early
- Enforce consistent field names
- Provide autocomplete in editors

---

### 3. agents.md Composition

**Enhancement**: Allow agents.md files to reference/extend other agents.md files.

**Example**:

```markdown
---
extends: "@acme/base-guidelines"
---

# Project-Specific Guidelines

In addition to our base guidelines, this project requires:

- Use Prisma for database access
- Use NextAuth for authentication
```

**Benefits**:
- Avoid duplication across projects
- Maintain shared guidelines centrally
- Override specific rules per project

---

### 4. Validation and Linting

**Enhancement**: Lint agents.md files for common issues.

**Proposed tool**: `prpm lint agents.md`

**Checks**:
- ✅ Has clear project overview
- ✅ Includes code examples
- ✅ Sections are well-organized
- ✅ Code examples are complete (have imports, types)
- ✅ Rationale provided for key decisions
- ⚠️  No overly generic advice ("write good code")
- ⚠️  No contradictory rules

**Example output**:

```bash
$ prpm lint agents.md

✅ Clear project overview found
✅ 3 code examples found
✅ Sections are well-organized
⚠️  Warning: Section "Guidelines" is very generic
⚠️  Warning: No rationale provided for "Use dependency injection"

Overall: 85/100 (Good)
```

---

### 5. Interactive agents.md Builder

**Enhancement**: Interactive CLI to generate agents.md files.

**Example**:

```bash
$ prpm init agents.md

🤖 Let's create your agents.md file!

Project name: acme-ecommerce
Scope: [backend] frontend full-stack: backend

Tech stack (comma-separated): Node.js, TypeScript, PostgreSQL, Redis

Key patterns to enforce:
  1. Hexagonal architecture
  2. Event-driven communication
  3. Testing with Vitest

✅ Generated agents.md with:
   - Project overview
   - Tech stack section
   - 3 architectural patterns
   - Code examples for each pattern

📝 Review and edit: agents.md
```

---

## Conclusion

agents.md represents a **refreshing simplicity** in the fragmented AI coding tool ecosystem. By providing an **open, tool-agnostic standard**, it enables developers to write guidance once and use it everywhere - no matter which AI coding tool they prefer.

### Key Takeaways

1. **Radical simplicity**: No required fields, no special syntax, just markdown
2. **Tool-agnostic**: Works with Cursor, Copilot, Claude, Kiro, Codex, and more
3. **Human-first**: Readable and editable without tooling
4. **Flexible structure**: Organize however makes sense for your project
5. **Open standard**: Backed by OpenAI, Google, and community collaboration

### PRPM's Design Philosophy

PRPM's implementation of agents.md support reflects three core principles:

1. **Respect simplicity**: Keep frontmatter optional, parsing forgiving, configuration minimal
2. **Add value without friction**: Infer tags, extract descriptions, parse structure - all automatically
3. **Enable interoperability**: Seamless conversion to/from all other formats

### Why agents.md Matters

The AI coding tool landscape is fragmented today, but agents.md points toward a future where:
- Developers write guidance once, not 6 times
- AI tools compete on features, not lock-in
- Open standards win over proprietary formats
- The community shares patterns freely

PRPM is proud to support agents.md as a first-class format and to help drive adoption of this important open standard.

### Resources

- [agents.md GitHub Repository](https://github.com/openai/agents.md)
- [PRPM agents.md Proposal](/docs/partnerships/agents-md-proposal.md)
- [PRPM Canonical Format Specification](/docs/FORMAT_CONVERSION.md)
- [from-agents-md.ts Source Code](https://github.com/pr-pm/prpm/blob/main/packages/registry/src/converters/from-agents-md.ts)

---

**Next**: [MCP (Model Context Protocol) Deep Dive](/blog/formats/mcp-deep-dive) - Exploring server-side context providers and tool definitions.
