# Multi-Format Collection Example

This example demonstrates how to create a collection that includes packages in multiple formats, including the new GitHub Copilot, Kiro, and Windsurf formats.

## Example: Full-Stack AI Development Collection

A collection that provides coding assistance across different AI editors.

### prpm.json

```json
{
  "name": "@examples/fullstack-ai-collection",
  "version": "1.0.0",
  "description": "Complete AI coding assistant collection for full-stack development across Cursor, Claude, Copilot, Kiro, and Windsurf",
  "type": "collection",
  "author": "PRPM Examples",
  "license": "MIT",
  "tags": ["collection", "fullstack", "multi-format", "react", "nodejs"],
  "category": "development",
  "files": [
    {
      "path": ".cursor/rules/react.mdc",
      "type": "cursor",
      "name": "React Best Practices (Cursor)",
      "description": "React coding standards for Cursor",
      "tags": ["cursor", "react", "frontend"]
    },
    {
      "path": ".claude/skills/api-design.md",
      "type": "claude-skill",
      "name": "API Design Skill (Claude)",
      "description": "RESTful API design patterns for Claude",
      "tags": ["claude", "api", "backend"]
    },
    {
      "path": ".github/instructions/testing.instructions.md",
      "type": "copilot",
      "name": "Testing Guidelines (Copilot)",
      "description": "Test-first development for GitHub Copilot",
      "tags": ["copilot", "testing", "quality"]
    },
    {
      "path": ".kiro/steering/security.md",
      "type": "kiro",
      "name": "Security Standards (Kiro)",
      "description": "Security best practices for Kiro",
      "tags": ["kiro", "security"]
    },
    {
      "path": ".windsurfrules",
      "type": "windsurf",
      "name": "Code Quality Rules (Windsurf)",
      "description": "General code quality standards for Windsurf",
      "tags": ["windsurf", "quality"]
    }
  ]
}
```

### File Structure

```
fullstack-ai-collection/
├── prpm.json
├── .cursor/
│   └── rules/
│       └── react.mdc                    # Cursor format
├── .claude/
│   └── skills/
│       └── api-design.md                # Claude format
├── .github/
│   └── instructions/
│       └── testing.instructions.md      # Copilot format
├── .kiro/
│   └── steering/
│       └── security.md                  # Kiro format
└── .windsurfrules                       # Windsurf format
```

### Sample File Content

#### .github/instructions/testing.instructions.md (Copilot)

```markdown
---
applyTo:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Testing Guidelines

Apply these testing standards when working with test files.

## Test Structure

- Use descriptive test names
- One assertion per test when possible
- Arrange-Act-Assert pattern

## Best Practices

- Test behavior, not implementation
- Mock external dependencies
- Keep tests fast and isolated
```

#### .kiro/steering/security.md (Kiro)

```markdown
---
inclusion: always
domain: security
---

# Security Best Practices

Always-active security guidelines for all code.

## Input Validation

- Sanitize all user inputs
- Use parameterized queries
- Validate data types and ranges

## Authentication

- Never store passwords in plain text
- Use secure session management
- Implement rate limiting
```

#### .windsurfrules (Windsurf)

```markdown
# Code Quality Standards

General coding standards for the project.

## Code Style

- Use consistent naming conventions
- Keep functions small and focused
- Write self-documenting code

## Performance

- Avoid premature optimization
- Profile before optimizing
- Cache expensive operations
```

## Publishing the Collection

```bash
# From the collection directory
prpm publish
```

## Installing the Collection

When users install this collection, each package is installed to its appropriate location:

```bash
# Install the entire collection
prpm install @examples/fullstack-ai-collection
```

This installs:
- `react.mdc` → `.cursor/rules/react.mdc`
- `api-design.md` → `.claude/skills/api-design.md`
- `testing.instructions.md` → `.github/instructions/testing.instructions.md`
- `security.md` → `.kiro/steering/security.md`
- `.windsurfrules` → `.windsurfrules`

## Installing in a Specific Format

You can also convert the entire collection to a single format:

```bash
# Install everything as Copilot instructions
prpm install @examples/fullstack-ai-collection --as copilot

# Install everything as Kiro steering files
prpm install @examples/fullstack-ai-collection --as kiro

# Install everything as Windsurf rules
prpm install @examples/fullstack-ai-collection --as windsurf
```

When converted to a single format:
- All files are converted to that format
- All files go to that format's directory
- Users get a unified experience in their preferred AI editor

## Benefits of Multi-Format Collections

1. **Cross-Editor Support**: Users can use any AI editor and get appropriate files
2. **Format-Specific Features**: Each format can leverage its unique capabilities
   - Copilot: Path-specific instructions with `applyTo`
   - Kiro: Domain-based organization with inclusion modes
   - Windsurf: Simple, universal markdown rules
3. **Single Package**: Maintain one collection that works everywhere
4. **Automatic Conversion**: PRPM handles format conversion automatically

## Use Cases

### Development Team Onboarding

```json
{
  "name": "@company/onboarding-collection",
  "description": "Complete onboarding for new developers",
  "files": [
    {
      "path": ".cursor/rules/coding-standards.mdc",
      "type": "cursor",
      "name": "Company Coding Standards"
    },
    {
      "path": ".github/instructions/api.instructions.md",
      "type": "copilot",
      "name": "API Development Guidelines"
    },
    {
      "path": ".kiro/steering/security.md",
      "type": "kiro",
      "name": "Security Requirements"
    }
  ]
}
```

### Framework-Specific Collections

```json
{
  "name": "@examples/nextjs-pro",
  "description": "Next.js professional development collection",
  "files": [
    {
      "path": ".claude/skills/nextjs-patterns.md",
      "type": "claude-skill",
      "name": "Next.js Patterns"
    },
    {
      "path": ".github/instructions/components.instructions.md",
      "type": "copilot",
      "name": "Component Architecture"
    },
    {
      "path": ".windsurfrules",
      "type": "windsurf",
      "name": "Next.js Best Practices"
    }
  ]
}
```

### Language-Specific Collections

```json
{
  "name": "@examples/typescript-excellence",
  "description": "TypeScript development excellence",
  "files": [
    {
      "path": ".cursor/rules/typescript.mdc",
      "type": "cursor",
      "name": "TypeScript Standards"
    },
    {
      "path": ".kiro/steering/type-safety.md",
      "type": "kiro",
      "name": "Type Safety Guidelines"
    }
  ]
}
```

## Best Practices

### 1. Organize by Concern

Group related functionality across formats:
- Frontend patterns in multiple formats
- Backend patterns in multiple formats
- Testing standards in multiple formats

### 2. Use Format Strengths

- **Copilot**: Path-specific instructions for file-type-specific rules
- **Kiro**: Domain organization for cross-cutting concerns
- **Windsurf**: General project-wide standards
- **Cursor/Claude**: Rich agent behaviors and personas

### 3. Avoid Duplication

Don't duplicate the same rules across formats in a collection:
- ❌ Same React rules in both Cursor and Copilot formats
- ✅ React component rules in Cursor, React testing in Copilot

### 4. Document Format Usage

In your collection's README, explain:
- Which format is best for what use case
- Why you chose multiple formats
- How to use each file effectively

## Migration Strategy

### From Single Format to Multi-Format

1. Start with your existing single-format package
2. Add complementary formats for different use cases
3. Update type to "collection"
4. Publish new version

```json
{
  "name": "@username/react-rules",
  "version": "1.0.0",
  "type": "cursor",
  "files": [".cursor/rules/react.mdc"]
}
```

Becomes:

```json
{
  "name": "@username/react-rules",
  "version": "2.0.0",
  "type": "collection",
  "files": [
    {
      "path": ".cursor/rules/react.mdc",
      "type": "cursor",
      "name": "React Rules (Cursor)"
    },
    {
      "path": ".github/instructions/react.instructions.md",
      "type": "copilot",
      "name": "React Guidelines (Copilot)"
    },
    {
      "path": ".kiro/steering/react.md",
      "type": "kiro",
      "name": "React Standards (Kiro)"
    }
  ]
}
```

## Resources

- [Collections Documentation](../COLLECTIONS.md)
- [GitHub Copilot Guide](../GITHUB_COPILOT.md)
- [Kiro Guide](../KIRO.md)
- [Windsurf Guide](../WINDSURF.md)
- [Publishing Guide](../PUBLISHING.md)
