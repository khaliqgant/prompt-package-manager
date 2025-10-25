# Kiro Steering Files Support

PRPM now supports Kiro steering files, allowing you to package and distribute custom steering instructions for Kiro AI coding assistant.

## Overview

Kiro uses steering files to guide its behavior across your codebase:
- **Location**: `.kiro/steering/*.md`
- **Format**: Markdown files with YAML frontmatter
- **Scope**: One domain per file (e.g., testing, security, architecture)

## Installation

Install Kiro steering files from the PRPM registry:

```bash
# Install as kiro format
prpm install <package-name> --as kiro

# Example
prpm install @prpm/testing-standards --as kiro
```

## Package Structure

### Basic Steering File

```markdown
---
inclusion: manual
domain: testing
---

# Testing Standards

Guidelines for writing tests in this project.

## Test Structure

- Use describe blocks for test suites
- One test per behavior
- Clear, descriptive test names

## Best Practices

- Test behavior, not implementation
- Mock external dependencies
- Keep tests fast and isolated
```

**Install location**: `.kiro/steering/<domain>.md`

### Inclusion Modes

Kiro supports three inclusion modes:

#### 1. Manual Inclusion

Apply only when explicitly requested:

```yaml
---
inclusion: manual
domain: security
---
```

Use when: Rules should be applied on-demand (security audits, performance reviews)

#### 2. Always Inclusion

Apply to all AI interactions:

```yaml
---
inclusion: always
domain: coding-standards
---
```

Use when: Rules should always be active (code style, best practices)

#### 3. File Match Inclusion

Apply when working with specific file patterns:

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
domain: testing
---
```

Use when: Rules are context-specific (test files, API routes, components)

## Publishing Kiro Packages

### 1. Create Package Metadata

Add to your `prpm.json`:

```json
{
  "name": "@your-org/kiro-testing-standards",
  "version": "1.0.0",
  "description": "Testing standards for Kiro",
  "format": "kiro",
  "subtype": "rule",
  "tags": ["kiro", "testing", "standards"],
  "files": [".kiro/steering/testing.md"]
}
```

> **Note**: Configuration like `inclusion`, `fileMatchPattern`, and `domain` should be defined **in the file's frontmatter**, not in `prpm.json`. PRPM automatically extracts this configuration when parsing the file.

### 2. File Structure

All configuration goes in the file's YAML frontmatter:

**Manual activation**:
```markdown
---
inclusion: manual
domain: security
---

# Security Audit Checklist
...
```

**Always active**:
```markdown
---
inclusion: always
domain: coding-standards
---

# Code Style Guide
...
```

**File pattern matching**:
```markdown
---
inclusion: fileMatch
fileMatchPattern: "src/api/**/*.ts"
domain: backend
---

# API Design Principles
...
```

### 3. Publish

```bash
prpm publish
```

## Converting Existing Rules

Convert packages from other formats to Kiro:

```bash
# Convert from Cursor to Kiro
prpm install cursor-package --as kiro

# Convert from Claude to Kiro
prpm install claude-skill --as kiro
```

## Configuration Reference

### Frontmatter Options (in `.md` file)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inclusion` | string | **Yes** | Inclusion mode: `always`, `fileMatch`, or `manual` |
| `fileMatchPattern` | string | Conditional* | Glob pattern (*required if inclusion is `fileMatch`) |
| `domain` | string | No | Domain/topic for organization (inferred from filename if not provided) |

### Manifest Options (in `prpm.json`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | Yes | Must be `"kiro"` |
| `subtype` | string | No | Package subtype (default: `"rule"`) |
| `files` | array | Yes | List of steering files to include |

### Supported Sections

Kiro steering files support:
- ✅ Instructions/guidelines
- ✅ Rules and best practices
- ✅ Examples and code snippets
- ✅ Architecture decisions
- ❌ Persona (not supported - will be skipped)
- ❌ Tools configuration (not supported - will be skipped)

## Best Practices

### 1. One Domain Per File

Organize by concern, not by file type:

```
.kiro/steering/
├── testing.md          # Testing guidelines
├── security.md         # Security rules
├── architecture.md     # Architecture decisions
└── api-design.md       # API design principles
```

### 2. Choose Appropriate Inclusion Mode

| Scenario | Inclusion Mode | Example |
|----------|----------------|---------|
| Code style, formatting | `always` | Enforce consistent style everywhere |
| Test guidelines | `fileMatch` | Apply only to `**/*.test.ts` |
| Security audit checklist | `manual` | Use when performing security review |
| Component patterns | `fileMatch` | Apply to `src/components/**/*.tsx` |

### 3. Use Clear, Actionable Guidelines

```markdown
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
domain: testing
---

# Testing Guidelines

## Test Structure

✅ DO: Use descriptive test names
\`\`\`typescript
test('should validate email format before saving')
\`\`\`

❌ DON'T: Use vague names
\`\`\`typescript
test('works')
\`\`\`

## Assertions

- One assertion per test when possible
- Use specific matchers (toEqual, toContain, not toBeTruthy)
- Include error messages in expect
```

### 4. Include Context and Examples

```markdown
---
inclusion: manual
domain: performance
---

# Performance Optimization

## Database Queries

Always use indexes for frequently queried fields:

\`\`\`typescript
// ✅ Good: Uses indexed field
await db.user.findUnique({ where: { email } });

// ❌ Bad: Full table scan
await db.user.findFirst({ where: { bio: { contains: 'engineer' } } });
\`\`\`

**Rationale**: Indexed queries are 100x faster on large datasets
```

## Common Patterns

### Testing Standards (fileMatch)

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
domain: testing
---
```

### Security Guidelines (manual)

```yaml
---
inclusion: manual
domain: security
---
```

### Code Style (always)

```yaml
---
inclusion: always
domain: code-style
---
```

### Component Architecture (fileMatch)

```yaml
---
inclusion: fileMatch
fileMatchPattern: "src/components/**/*.tsx"
domain: react-components
---
```

### API Design (fileMatch)

```yaml
---
inclusion: fileMatch
fileMatchPattern: "src/api/**/*.ts"
domain: api-design
---
```

## Troubleshooting

### Steering File Not Loading

1. Check file location: Must be in `.kiro/steering/`
2. Verify frontmatter has `inclusion` field
3. Check YAML syntax (proper indentation, quotes)

### File Pattern Not Matching

Glob patterns use `.gitignore` syntax:
- `**/*.test.ts` - All test files, any depth
- `src/**/*.ts` - All TypeScript files in src
- `src/api/*.ts` - Files directly in src/api (not subdirectories)
- Use `src/api/**/*.ts` for subdirectories

### Missing fileMatchPattern Error

If using `inclusion: fileMatch`, you must provide `fileMatchPattern`:

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"  # Required!
domain: testing
---
```

## Examples

### Always-Active Code Style

**prpm.json:**
```json
{
  "name": "@company/code-style",
  "format": "kiro",
  "subtype": "rule",
  "files": [".kiro/steering/code-style.md"]
}
```

**File frontmatter:**
```yaml
---
inclusion: always
domain: coding-standards
---
```

### Test File Guidelines

**prpm.json:**
```json
{
  "name": "@company/testing-standards",
  "format": "kiro",
  "subtype": "rule",
  "files": [".kiro/steering/testing.md"]
}
```

**File frontmatter:**
```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
domain: testing
---
```

### Security Audit Checklist

**prpm.json:**
```json
{
  "name": "@company/security-checklist",
  "format": "kiro",
  "subtype": "rule",
  "files": [".kiro/steering/security-audit.md"]
}
```

**File frontmatter:**
```yaml
---
inclusion: manual
domain: security
---
```

### React Component Standards

**prpm.json:**
```json
{
  "name": "@company/react-standards",
  "format": "kiro",
  "subtype": "rule",
  "files": [".kiro/steering/react-components.md"]
}
```

**File frontmatter:**
```yaml
---
inclusion: fileMatch
fileMatchPattern: "src/components/**/*.tsx"
domain: frontend
---
```

## Migration Guide

### From Other Formats

Kiro steering files work best when organized by domain:

**Before** (single .cursorrules file):
```markdown
# All rules in one file

## Testing Rules
- Write tests first

## Security Rules
- Validate inputs

## React Rules
- Use functional components
```

**After** (domain-organized Kiro files):

`.kiro/steering/testing.md`:
```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
domain: testing
---
# Testing Rules
- Write tests first
```

`.kiro/steering/security.md`:
```yaml
---
inclusion: always
domain: security
---
# Security Rules
- Validate inputs
```

`.kiro/steering/react.md`:
```yaml
---
inclusion: fileMatch
fileMatchPattern: "src/**/*.tsx"
domain: react
---
# React Rules
- Use functional components
```

## Resources

- [Kiro Steering Documentation](https://kiro.dev/docs/steering/)
- [PRPM Documentation](https://github.com/khaliqgant/prompt-package-manager)
