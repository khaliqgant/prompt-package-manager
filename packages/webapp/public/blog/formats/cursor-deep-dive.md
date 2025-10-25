# Cursor Rules: A Technical Deep Dive

**Published**: 2025-01-XX
**Author**: PRPM Team
**Format**: Cursor (`.cursor/rules/*.mdc`)
**Status**: Production
**Official Docs**: [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Format Specification](#format-specification)
3. [MDC Frontmatter](#mdc-frontmatter)
4. [Rule Structure](#rule-structure)
5. [PRPM's Implementation](#prpms-implementation)
6. [Conversion & Taxonomy](#conversion--taxonomy)
7. [Technical Design Decisions](#technical-design-decisions)
8. [Best Practices](#best-practices)
9. [Future Enhancements](#future-enhancements)

---

## Introduction

Cursor is one of the most popular AI-first code editors, and its `.cursor/rules/` system allows developers to customize AI behavior with project-specific guidelines. Unlike other formats that use plain markdown or JSON, Cursor uses **MDC (Model Context)** files - markdown with optional YAML frontmatter.

This architectural choice makes Cursor rules:
- **Contextual**: Rules can reference other files using `@filename` syntax
- **Flexible**: Markdown body supports rich formatting
- **Conditional**: Glob patterns control when rules apply
- **Persistent**: Provide reusable context at the prompt level

For complete documentation, see the [official Cursor rules documentation](https://cursor.com/docs/context/rules).

---

## Format Specification

### File Location

Cursor rules live in `.cursor/rules/`:

```
.cursor/
└── rules/
    ├── creating-cursor-rules.mdc  # Meta-rule for writing rules
    ├── typescript-standards.mdc    # TypeScript conventions
    ├── react-patterns.mdc          # React best practices
    └── api-design.mdc              # API route standards
```

### File Structure

Cursor rules use the **MDC format** - Markdown with optional YAML frontmatter:

```markdown
---
description: Enforce strict TypeScript patterns and prevent common type errors
globs:
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
---

# TypeScript Type Safety

## Core Principles

- Always enable strict mode in tsconfig.json
- Avoid `any` type - use `unknown` if type is uncertain
- Define interfaces for all object shapes
- Use type guards for runtime type checking

## Examples

### ✅ Good: Type Guard Pattern

\`\`\`typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}
\`\`\`

### ❌ Bad: Using Any

\`\`\`typescript
function processData(data: any) {
  return data.value; // No type safety!
}
\`\`\`
```

**Note**: While PRPM and other tools may add additional metadata fields (like `title`, `tags`, `version`) for cataloging purposes, Cursor officially only uses `description`, `globs`, and `alwaysApply` from the frontmatter.

---

## MDC Frontmatter

### Officially Supported Fields

According to the [official Cursor documentation](https://cursor.com/docs/context/rules), the following frontmatter fields are supported:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `description` | string | - | **Should always be provided** - Description of the rule's purpose |
| `globs` | string[] | - | File path patterns to match (e.g., `["**/*.ts"]`) |
| `alwaysApply` | boolean | `false` | If `true`, rule is always included in context |

**Best Practice**: While `description` is technically optional, **always provide it**. A clear description helps both users and AI understand when and why to apply the rule. Rules without descriptions are difficult to maintain and organize.

**Rule Types** (determined by frontmatter):
- **Always**: `alwaysApply: true` - Always included in model context
- **Auto Attached**: Has `globs` field - Included when matching files are referenced
- **Manual**: No frontmatter or empty frontmatter - Only included when explicitly mentioned using `@ruleName`

### PRPM Extension Fields

PRPM adds additional metadata fields for cataloging and package management purposes. These fields are **not used by Cursor** but help with discoverability in the registry:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Rule name for search/display |
| `tags` | string[] | Technology tags for filtering |
| `version` | string | Semantic version for package versioning |

When PRPM converts packages to Cursor format, these extension fields are included in the frontmatter for round-trip conversion support, but Cursor ignores them.

### Glob Patterns

Globs use `.gitignore` syntax to match files:

```yaml
globs:
  - "**/*.ts"           # All TypeScript files
  - "**/*.tsx"          # All TSX files
  - "src/api/**/*.ts"   # API routes only
  - "!**/*.test.ts"     # Exclude tests
```

**Common patterns**:
- `**/*.ext` - All files with extension, any depth
- `dir/**/*` - All files in directory and subdirectories
- `dir/*.ext` - Direct children only
- `!pattern` - Negation (exclude)

### File References with @filename

**Important feature**: Cursor rules can reference other files using `@filename` syntax to include them in the rule's context.

**Example**:

```markdown
---
description: API design guidelines that reference our schema definitions
globs:
  - "src/api/**/*.ts"
---

# API Design Guidelines

Follow the patterns defined in @src/lib/api-schema.ts for all API route validation.

Use the error handling utilities from @src/lib/errors.ts for consistent error responses.
```

When this rule is active, Cursor will automatically include the referenced files (`api-schema.ts` and `errors.ts`) in the context, allowing the AI to see the actual implementation patterns being referenced.

**Use cases**:
- Reference type definitions or interfaces
- Include example implementations
- Point to configuration files
- Reference related rules or documentation

This feature makes Cursor rules **composable** - rules can build on existing code and other rules rather than duplicating information.

---

## Rule Structure

### Recommended Sections

Based on PRPM's meta-rule for creating Cursor rules:

#### 1. Tech Stack Declaration

```markdown
## Tech Stack

**Framework:** Next.js 14 (App Router)
**Language:** TypeScript 5.x (strict mode)
**Styling:** Tailwind CSS 3.x
**State:** Zustand
**Database:** PostgreSQL + Prisma
**Testing:** Vitest + Playwright
```

**Why**: Prevents AI from suggesting wrong tools/patterns.

#### 2. Code Style Guidelines

```markdown
## Code Style

- **Components**: Functional with TypeScript
- **Props**: Interface definitions, destructure in params
- **Hooks**: Extract when logic > 10 lines
- **Exports**: Named exports only (no default)
- **File naming**: kebab-case.tsx
```

#### 3. Patterns with Code Examples

```markdown
## Patterns

### Server Component Data Fetching

\`\`\`typescript
// app/users/page.tsx
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });

  return <UserList users={users} />;
}
\`\`\`
```

#### 4. Anti-Patterns

```markdown
## Anti-Patterns

### ❌ Don't: Default Exports

\`\`\`typescript
// ❌ BAD
export default function Button() { }

// ✅ GOOD
export function Button() { }
\`\`\`

**Why:** Named exports are more refactor-friendly.
```

#### 5. Common Tasks

```markdown
## Common Tasks

### Adding a New API Route

1. Create `app/api/[route]/route.ts`
2. Define HTTP method exports (GET, POST, etc.)
3. Validate input with Zod schema
4. Use try/catch for error handling
5. Return `Response` object
```

---

## PRPM's Implementation

### Parsing Cursor Files

Since Cursor uses the same markdown format as Claude (MDC with YAML frontmatter), PRPM aliases `fromCursor` to `fromClaude`:

```typescript
// from-cursor.ts
export { fromClaude as fromCursor } from './from-claude.js';
```

The Claude parser handles:
1. YAML frontmatter extraction
2. Markdown body parsing
3. Section detection (instructions, rules, examples, etc.)
4. Subtype detection from frontmatter

### Converting to Cursor Format

The `toCursor` converter generates MDC-compliant output:

```typescript
export function toCursor(
  pkg: CanonicalPackage,
  options: Partial<ConversionOptions & { cursorConfig?: CursorMDCConfig }> = {}
): ConversionResult {
  const warnings: string[] = [];
  let qualityScore = 100;

  // Generate MDC header (YAML frontmatter)
  const mdcHeader = generateMDCHeader(pkg, options.cursorConfig);

  // Convert canonical sections to markdown
  const content = convertContent(pkg.content, warnings);

  // Combine
  const fullContent = `${mdcHeader}\n\n${content}`;

  // Check for lossy conversion
  const lossyConversion = warnings.some(w =>
    w.includes('not supported') || w.includes('skipped')
  );

  if (lossyConversion) {
    qualityScore -= 10;
  }

  return {
    content: fullContent,
    format: 'cursor',
    warnings: warnings.length > 0 ? warnings : undefined,
    lossyConversion,
    qualityScore,
  };
}
```

### MDC Header Generation

The frontmatter generator prioritizes explicit config over package metadata:

```typescript
function generateMDCHeader(pkg: CanonicalPackage, config?: CursorMDCConfig): string {
  const lines: string[] = ['---'];

  // Title (from package, not configurable)
  if (pkg.metadata?.title) {
    lines.push(`title: "${pkg.metadata.title}"`);
  } else if (pkg.id) {
    lines.push(`title: "${pkg.id}"`);
  }

  // Description (MANDATORY)
  if (pkg.metadata?.description) {
    lines.push(`description: "${pkg.metadata.description}"`);
  }

  // Version - config takes precedence
  const version = config?.version || pkg.metadata?.version || '1.0.0';
  lines.push(`version: "${version}"`);

  // Globs - config takes precedence
  const globs = config?.globs || pkg.metadata?.globs || ['**/*'];
  lines.push('globs:');
  globs.forEach(glob => {
    lines.push(`  - "${glob}"`);
  });

  // Rule type based on alwaysApply flag
  const alwaysApply = config?.alwaysApply ?? pkg.metadata?.alwaysApply ?? false;
  const ruleType = alwaysApply ? 'always' : 'on-demand';
  lines.push(`ruleType: ${ruleType}`);
  lines.push(`alwaysApply: ${alwaysApply}`);

  // Optional: Author
  if (config?.author) {
    lines.push(`author: "${config.author}"`);
  }

  // Optional: Tags
  if (config?.tags && config.tags.length > 0) {
    lines.push('tags:');
    config.tags.forEach(tag => {
      lines.push(`  - "${tag}"`);
    });
  }

  lines.push('---');

  return lines.join('\n');
}
```

### Section Conversion

Different canonical section types map to Cursor markdown:

```typescript
function convertSection(section: Section, warnings: string[]): string {
  switch (section.type) {
    case 'metadata':
      return convertMetadata(section);  // Title with icon

    case 'instructions':
      return convertInstructions(section);  // ## Heading + content

    case 'rules':
      return convertRules(section);  // Bulleted/numbered list

    case 'examples':
      return convertExamples(section);  // ✅/❌ + code blocks

    case 'persona':
      return convertPersona(section);  // ## Role + attributes

    case 'context':
      return convertContext(section);  // ## Heading + content

    case 'tools':
      // Tools are Claude-specific, skip for Cursor
      warnings.push('Tools section skipped (Claude-specific)');
      return '';

    case 'custom':
      // Only include cursor-specific or generic custom sections
      if (!section.editorType || section.editorType === 'cursor') {
        return section.content;
      }
      warnings.push(`Custom ${section.editorType} section skipped`);
      return '';

    default:
      warnings.push(`Unknown section type`);
      return '';
  }
}
```

### Rules Conversion

Rules with rationale and examples:

```typescript
function convertRules(section: {
  type: 'rules';
  title: string;
  items: Rule[];
  ordered?: boolean;
}): string {
  const lines: string[] = [];

  lines.push(`## ${section.title}`);
  lines.push('');

  section.items.forEach((rule, index) => {
    const prefix = section.ordered ? `${index + 1}.` : '-';
    lines.push(`${prefix} ${rule.content}`);

    // Add rationale as sub-bullet
    if (rule.rationale) {
      lines.push(`   - *Rationale: ${rule.rationale}*`);
    }

    // Add examples as sub-bullets
    if (rule.examples) {
      rule.examples.forEach((example: string) => {
        lines.push(`   - Example: \`${example}\``);
      });
    }
  });

  return lines.join('\n');
}
```

### Examples Conversion

Examples with good/bad indicators:

```typescript
function convertExamples(section: {
  type: 'examples';
  title: string;
  examples: Example[];
}): string {
  const lines: string[] = [];

  lines.push(`## ${section.title}`);
  lines.push('');

  section.examples.forEach((example) => {
    // Good/Bad prefix
    const prefix = example.good === false ? '❌ Bad' : '✅ Good';
    lines.push(`### ${prefix}: ${example.description}`);
    lines.push('');

    // Code block
    const lang = example.language || '';
    lines.push('```' + lang);
    lines.push(example.code);
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
}
```

---

## Conversion & Taxonomy

### Taxonomy Mapping

In PRPM's taxonomy system:

```typescript
{
  format: 'cursor',           // Source format
  subtype: 'rule',            // Default subtype
  tags: [
    'cursor',                 // Format tag
    'typescript',             // From tags array
    'best-practices',         // From tags array
  ]
}
```

### Subtype Detection

PRPM detects subtype from frontmatter fields:

```typescript
export function detectSubtypeFromFrontmatter(frontmatter: Record<string, any>): Subtype {
  // Check for explicit type fields
  if (frontmatter.agentType === 'agent' || frontmatter.type === 'agent') {
    return 'agent';
  }
  if (frontmatter.skillType === 'skill' || frontmatter.type === 'skill') {
    return 'skill';
  }
  if (frontmatter.commandType === 'slash-command') {
    return 'slash-command';
  }

  // Check for tools (indicates agent)
  if (frontmatter.tools && frontmatter.tools.trim().length > 0) {
    return 'agent';
  }

  // Default to rule
  return 'rule';
}
```

### Cross-Format Conversion

#### Claude → Cursor

```markdown
# Before (Claude agent.md)
---
name: typescript-expert
description: TypeScript best practices guide
tools: Read, Write, Edit
---

# TypeScript Expert

You are an expert in TypeScript...

## Guidelines
- Use strict mode
- Avoid any type

# After (.cursor/rules/typescript-expert.mdc)
---
title: "typescript-expert"
description: "TypeScript best practices guide"
version: "1.0.0"
globs:
  - "**/*"
ruleType: on-demand
alwaysApply: false
---

# TypeScript Expert

## Guidelines
- Use strict mode
- Avoid any type
```

**Changes**:
- ✅ Converted frontmatter to MDC format
- ✅ Added version, globs, ruleType, alwaysApply
- ⚠️ **Lossy**: Tools section dropped (Cursor doesn't use tools)
- ⚠️ **Lossy**: Persona context reduced

#### Kiro → Cursor

```markdown
# Before (.kiro/steering/typescript.md)
---
inclusion: fileMatch
fileMatchPattern: "**/*.ts"
---

# TypeScript Guidelines

- Use strict mode
- Avoid any type

# After (.cursor/rules/typescript.mdc)
---
title: "TypeScript Guidelines"
description: "TypeScript development standards"
version: "1.0.0"
globs:
  - "**/*.ts"
ruleType: conditional
alwaysApply: false
---

# TypeScript Guidelines

- Use strict mode
- Avoid any type
```

**Changes**:
- ✅ Mapped `fileMatchPattern` to `globs`
- ✅ Mapped `inclusion: fileMatch` to `ruleType: conditional`
- ✅ Added missing MDC fields

---

## Technical Design Decisions

### Decision 1: Alias Cursor to Claude Parser

**Problem**: Cursor and Claude both use markdown with YAML frontmatter. Should we have separate parsers?

**Options**:
1. Duplicate parser logic for Cursor
2. Alias `fromCursor` to `fromClaude`
3. Create shared parser, used by both

**Decision**: Option 2 - Alias to Claude parser

**Rationale**:
- Formats are structurally identical (MDC)
- Reduces code duplication
- Single source of truth for parsing logic
- Easy to specialize later if formats diverge

**Implementation**:
```typescript
// from-cursor.ts
export { fromClaude as fromCursor } from './from-claude.js';
```

**Trade-offs**:
- ✅ Less code to maintain
- ✅ Consistent parsing behavior
- ⚠️ Format-specific quirks must be handled in Claude parser
- ⚠️ Less visibility into Cursor-specific usage

### Decision 2: Config Precedence in Conversion

**Problem**: When converting to Cursor, should package metadata or explicit config take precedence?

**Decision**: Config overrides metadata

**Rationale**:
- Users may want to customize output without changing package
- Globs and version often need per-installation adjustment
- Author can be different from package author (e.g., modified fork)

**Implementation**:
```typescript
// Config takes precedence
const version = config?.version || pkg.metadata?.version || '1.0.0';
const globs = config?.globs || pkg.metadata?.globs || ['**/*'];
const alwaysApply = config?.alwaysApply ?? pkg.metadata?.alwaysApply ?? false;
```

### Decision 3: Tool Section Handling

**Problem**: Claude packages have `tools` sections. Cursor doesn't use them. How to handle?

**Options**:
1. Convert to comments
2. Skip silently
3. Skip with warning

**Decision**: Option 3 - Skip with warning

**Rationale**:
- Users should know content is being dropped
- Warnings enable quality scoring
- Silent skip could confuse users

**Implementation**:
```typescript
case 'tools':
  warnings.push('Tools section skipped (Claude-specific)');
  return '';
```

**Quality Impact**:
- Packages with tools get `qualityScore -= 10`
- `lossyConversion: true` flag set
- Users can decide if acceptable

### Decision 4: ruleType Inference

**Problem**: How to determine `ruleType` when converting from formats that don't have this concept?

**Decision**: Infer from `alwaysApply` boolean

**Mapping**:
- `alwaysApply: true` → `ruleType: 'always'`
- `alwaysApply: false` → `ruleType: 'on-demand'`

**Rationale**:
- Simple, deterministic mapping
- Preserves user intent
- Can be overridden with config

**Implementation**:
```typescript
const alwaysApply = config?.alwaysApply ?? pkg.metadata?.alwaysApply ?? false;
const ruleType = alwaysApply ? 'always' : 'on-demand';
lines.push(`ruleType: ${ruleType}`);
lines.push(`alwaysApply: ${alwaysApply}`);
```

### Decision 5: Mandatory Description Field

**Problem**: Description field is mandatory in Cursor's MDC spec, but some packages don't have one.

**Options**:
1. Fail conversion
2. Use empty string
3. Generate from package name/content

**Decision**: Use package description or ID as fallback

**Rationale**:
- Never fail conversion over metadata
- Empty string violates spec
- Package description usually exists
- ID is always available

**Implementation**:
```typescript
if (pkg.metadata?.description) {
  lines.push(`description: "${pkg.metadata.description}"`);
} else if (pkg.description) {
  lines.push(`description: "${pkg.description}"`);
} else {
  lines.push(`description: "${pkg.id}"`);  // Fallback to ID
}
```

---

## Best Practices

### 1. Be Specific, Not Generic

**❌ Bad**: Generic advice
```markdown
## Guidelines

- Write clean code
- Use best practices
- Test thoroughly
```

**✅ Good**: Specific decisions
```markdown
## State Management

- Use Zustand for global state
- Use React Context for component tree state
- Never use Redux (team decision)

## Form Validation

- Use React Hook Form + Zod
- Validate at API boundary, not UI
- Show inline errors, not toast notifications
```

### 2. Include Rationale and Examples

**❌ Bad**: Rules without context
```markdown
- Always use named exports
- Never use any type
```

**✅ Good**: Rules with rationale
```markdown
### Named Exports Only

\`\`\`typescript
// ❌ Bad: Default export
export default function Button() { }

// ✅ Good: Named export
export function Button() { }
\`\`\`

**Rationale**: Named exports are refactor-friendly and enable better tree-shaking.
```

### 3. Organize by Concern, Not File Type

**❌ Bad**: Generic categories
```markdown
## TypeScript Rules
## React Rules
## API Rules
```

**✅ Good**: Domain-specific organization
```markdown
## Tech Stack
[Specific versions and choices]

## Code Style
[Formatting and naming conventions]

## Patterns
[Common patterns with examples]

## Anti-Patterns
[What to avoid and why]
```

### 4. Use Glob Patterns Effectively

**❌ Bad**: Too broad
```yaml
globs:
  - "**/*"  # Applies everywhere, clutters context
```

**✅ Good**: Targeted patterns
```yaml
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "!**/*.test.ts"  # Exclude tests
  - "!**/*.d.ts"      # Exclude declarations
```

### 5. Keep Rules Scannable

**❌ Bad**: Wall of text
```markdown
Always use TypeScript strict mode and avoid using the any type because it defeats the purpose of TypeScript. Instead, use unknown if the type is uncertain and use type guards to narrow the type. Also remember to...
```

**✅ Good**: Scannable structure
```markdown
## TypeScript Type Safety

- Enable strict mode in tsconfig.json
- Avoid `any` - use `unknown` if type uncertain
- Use type guards for runtime checking
- Define interfaces for object shapes

### Example: Type Guard Pattern
\`\`\`typescript
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value;
}
\`\`\`
```

---

## Future Enhancements

### 1. Smart Glob Generation

**Idea**: Auto-generate glob patterns from rule content

```typescript
// Analyze rule content
const detectedLanguages = analyzeCodeBlocks(pkg.content);
const suggestedGlobs = generateGlobs(detectedLanguages);

// detectedLanguages: ['typescript', 'tsx']
// suggestedGlobs: ['**/*.ts', '**/*.tsx']
```

### 2. Rule Composition

**Idea**: Reference other rules for modularity

```yaml
---
title: React Component Standards
extends:
  - typescript-standards
  - code-style-guide
---
```

### 3. Conditional Sections

**Idea**: Show/hide sections based on context

```markdown
## React Patterns

<!-- Only show in component files -->
<if glob="src/components/**/*.tsx">
### Component Structure
\`\`\`typescript
export function ComponentName() { }
\`\`\`
</if>

<!-- Only show in page files -->
<if glob="app/**/page.tsx">
### Server Components
\`\`\`typescript
export default async function Page() { }
\`\`\`
</if>
```

### 4. Version-Specific Rules

**Idea**: Apply rules based on dependency versions

```yaml
---
title: Next.js Patterns
requires:
  next: "^14.0.0"
---
```

---

## Conclusion

Cursor's MDC format strikes a balance between **structure** (YAML frontmatter) and **flexibility** (Markdown body). This makes it:

- **Machine-readable**: Frontmatter enables tooling and automation
- **Human-readable**: Markdown is familiar and scannable
- **Extensible**: Custom fields can be added without breaking parsers
- **Interoperable**: Shares format with Claude, enabling easy conversion

PRPM's implementation fully supports Cursor's features:
- ✅ MDC frontmatter generation with all fields
- ✅ Glob pattern support for targeted rules
- ✅ Quality scoring for lossy conversions
- ✅ Format detection and aliasing to Claude parser
- ✅ Comprehensive section mapping (metadata, instructions, rules, examples, persona)

The format's main limitation is lack of native context-awareness (unlike Kiro's `fileMatch` inclusion), but glob patterns provide similar functionality at the file level.

As Cursor evolves, we expect the format to gain:
- Richer frontmatter options
- Better composition/inheritance
- Tighter IDE integration

PRPM will continue to track these changes and ensure seamless conversion across all formats.

---

## Additional Resources

- [Cursor Documentation](https://cursor.sh/docs)
- [Creating Cursor Rules - Meta Rule](./.cursor/rules/creating-cursor-rules.mdc)
- [PRPM Cursor Format Examples](https://github.com/pr-pm/prpm/tree/main/examples/cursor)
- [PRPM Format Conversion System](/docs/FORMAT_CONVERSION.md)

---

**Questions or feedback?** Open an issue on [GitHub](https://github.com/pr-pm/prpm/issues) or join our [Discord community](https://discord.gg/prpm).
