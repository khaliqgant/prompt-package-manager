# GitHub Copilot Instructions Support

PRPM now supports GitHub Copilot instructions, allowing you to package and distribute custom instructions for GitHub Copilot across your projects.

## Overview

GitHub Copilot uses instructions files to customize its behavior:
- **Repository-wide instructions**: `.github/copilot-instructions.md` - applies to entire repository
- **Path-specific instructions**: `.github/instructions/*.instructions.md` - applies to specific file patterns

## Installation

Install Copilot instructions from the PRPM registry:

```bash
# Install as copilot format
prpm install <package-name> --as copilot

# Example
prpm install @prpm/react-best-practices --as copilot
```

## Package Structure

### Repository-Wide Instructions

Repository-wide instructions apply to your entire codebase:

```markdown
# React Best Practices

Follow these React guidelines throughout the project.

## Component Structure

- Use functional components with hooks
- Keep components small and focused
- Separate business logic from presentation

## State Management

- Use useState for local state
- Use useReducer for complex state logic
- Consider Context API for shared state
```

**Install location**: `.github/copilot-instructions.md`

### Path-Specific Instructions

Path-specific instructions target files matching specific patterns:

```markdown
---
applyTo:
  - src/**/*.test.ts
  - src/**/*.test.tsx
---

# Testing Guidelines

Apply these rules when working with test files.

## Test Structure

- Use describe blocks for grouping
- One assertion per test when possible
- Use meaningful test names

## Best Practices

- Test behavior, not implementation
- Mock external dependencies
- Maintain test independence
```

**Install location**: `.github/instructions/<name>.instructions.md`

**Frontmatter format**:
```yaml
---
applyTo:
  - glob/pattern/**/*.ts
  - another/pattern/**/*.tsx
---
```

## Publishing Copilot Packages

### 1. Create Package Metadata

Add to your `prpm.json`:

```json
{
  "name": "@your-org/copilot-instructions",
  "version": "1.0.0",
  "description": "Custom Copilot instructions for our project",
  "format": "copilot",
  "subtype": "tool",
  "tags": ["copilot", "instructions", "coding-standards"],
  "files": [".github/copilot-instructions.md"]
}
```

> **Note**: Configuration like `applyTo` patterns should be defined **in the file's frontmatter**, not in `prpm.json`. PRPM automatically extracts this configuration when parsing the file.

### 2. File Structure

**Repository-wide** (no frontmatter needed):
```markdown
# Coding Standards

Follow these standards across the entire repository.
```

**Path-specific** (use frontmatter):
```markdown
---
applyTo:
  - src/pages/api/**/*.ts
---

# API Routes Standards

Apply these rules when working with API routes.
```

### 3. Publish

```bash
prpm publish
```

## Converting Existing Rules

Convert packages from other formats to Copilot:

```bash
# Convert from Cursor to Copilot
prpm install cursor-package --as copilot

# Convert from Claude to Copilot
prpm install claude-skill --as copilot
```

## Configuration Reference

### Frontmatter Options (in `.md` file)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `applyTo` | string or array | No* | Glob pattern(s) for files to apply to (*required for path-specific instructions) |

### Manifest Options (in `prpm.json`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | Yes | Must be `"copilot"` |
| `subtype` | string | No | Package subtype (default: `"tool"`) |
| `files` | array | Yes | List of instruction files to include |

### Supported Sections

Copilot instructions support:
- ✅ Instructions/guidelines
- ✅ Rules and best practices
- ✅ Examples and code snippets
- ✅ Reference documentation
- ❌ Persona (not supported - will be skipped)
- ❌ Tools configuration (not supported - will be skipped)

## Best Practices

### 1. Use Path-Specific Instructions for Focused Rules

Define `applyTo` patterns in the file's frontmatter:

```markdown
---
applyTo: src/api/**/*.ts
---

# API Security Rules

...
```

### 2. Keep Instructions Clear and Concise

```markdown
# API Security Rules

## Authentication

- Always validate JWT tokens
- Check user permissions before operations
- Log all authentication failures

## Input Validation

- Sanitize all user inputs
- Use zod for schema validation
- Return descriptive error messages
```

### 3. Organize by Domain

Create separate instruction files for different concerns:
- `backend-api.instructions.md` for API routes
- `frontend-components.instructions.md` for React components
- `database-queries.instructions.md` for database operations

### 4. Include Examples

```markdown
## Error Handling

Always use try-catch for async operations:

\`\`\`typescript
try {
  const data = await fetchData();
  return { success: true, data };
} catch (error) {
  logger.error('Fetch failed', error);
  return { success: false, error };
}
\`\`\`
```

## Troubleshooting

### Instructions Not Applying

1. Check file location: Must be in `.github/instructions/` for path-specific
2. Verify glob pattern in frontmatter matches your files
3. Restart VS Code to reload Copilot configuration

### Pattern Not Matching Files

Use `.gitignore`-style glob patterns:
- `src/**/*.ts` - All TypeScript files in src
- `**/*.test.ts` - All test files
- `src/api/*.ts` - Only files directly in src/api (not subdirectories)

## Examples

### Repository-Wide TypeScript Standards

**prpm.json:**
```json
{
  "name": "@company/typescript-standards",
  "format": "copilot",
  "subtype": "tool",
  "files": [".github/copilot-instructions.md"]
}
```

**No frontmatter needed** - applies to entire repository.

### Test File Guidelines

**prpm.json:**
```json
{
  "name": "@company/test-guidelines",
  "format": "copilot",
  "subtype": "tool",
  "files": [".github/instructions/testing.instructions.md"]
}
```

**File frontmatter:**
```yaml
---
applyTo: "**/*.test.ts"
---
```

### API Route Security

**prpm.json:**
```json
{
  "name": "@company/api-security",
  "format": "copilot",
  "subtype": "tool",
  "files": [".github/instructions/api-security.instructions.md"]
}
```

**File frontmatter:**
```yaml
---
applyTo: "src/pages/api/**/*.ts"
---
```

## Resources

- [GitHub Copilot Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [PRPM Documentation](https://github.com/khaliqgant/prompt-package-manager)
