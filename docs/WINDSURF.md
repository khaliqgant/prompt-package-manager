# Windsurf Rules Support

PRPM supports Windsurf rules files, allowing you to package and distribute custom coding rules for the Windsurf AI editor.

## Overview

Windsurf uses a simple markdown file for coding rules:
- **Location**: `.windsurfrules` (root of project)
- **Format**: Plain markdown without special frontmatter
- **Scope**: Repository-wide rules and guidelines

## Installation

Install Windsurf rules from the PRPM registry:

```bash
# Install as windsurf format
prpm install <package-name> --as windsurf

# Example
prpm install @prpm/react-best-practices --as windsurf
```

## Package Structure

### Basic Windsurf Rules File

```markdown
# React Best Practices

Follow these guidelines when working with React code.

## Component Structure

- Use functional components with hooks
- Keep components small and focused
- Separate business logic from presentation

## State Management

- Use useState for local state
- Use useReducer for complex state logic
- Consider Context API for shared state

## Code Style

- Always use TypeScript
- Prefer const over let
- Use descriptive variable names
```

**Install location**: `.windsurfrules`

### Rules with Rationale

```markdown
# Testing Guidelines

## Rules

- Write tests before code (TDD)
   - *Rationale: Ensures better design and prevents bugs*
- Test edge cases thoroughly
   - *Rationale: Edge cases are where bugs hide*
- Maintain 100% code coverage
   - *Rationale: Uncovered code is untested code*
```

### Rules with Examples

```markdown
# Code Quality Rules

## Naming Conventions

- Use descriptive function names
   - Example: getUserById() not get()
- Use camelCase for variables
   - Example: userId not user_id
```

### Including Code Examples

```markdown
# Error Handling

## Best Practices

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

## Publishing Windsurf Packages

### 1. Create Package Metadata

Add to your `prpm.json`:

```json
{
  "name": "@your-org/windsurf-rules",
  "version": "1.0.0",
  "description": "Custom coding rules for Windsurf",
  "type": "windsurf",
  "tags": ["windsurf", "coding-standards", "best-practices"],
  "category": "coding-standards"
}
```

### 2. Create Your Rules File

Create your rules as a markdown file (e.g., `rules.md`):

```markdown
# Your Project Rules

Clear, actionable guidelines for your codebase.

## Code Style

- Always use semicolons
- Prefer const over let
- Use 2 spaces for indentation

## Testing

- Write tests for all new features
- Keep tests fast and isolated
- Use meaningful test descriptions
```

### 3. Publish

```bash
prpm publish
```

## Converting Existing Rules

Convert packages from other formats to Windsurf:

```bash
# Convert from Cursor to Windsurf
prpm install cursor-package --as windsurf

# Convert from Claude to Windsurf
prpm install claude-skill --as windsurf

# Convert from GitHub Copilot to Windsurf
prpm install copilot-instructions --as windsurf
```

## Best Practices

### 1. Keep Rules Clear and Actionable

```markdown
✅ Good:
- Use async/await instead of .then() chains
- Extract complex logic into separate functions
- Write unit tests for all business logic

❌ Bad:
- Write good code
- Be careful
- Try to avoid bugs
```

### 2. Organize by Topic

```markdown
# Project Guidelines

## Architecture

- Use feature-based folder structure
- Keep components in src/components
- Store utilities in src/utils

## Testing

- Write tests in __tests__ folders
- Use jest for unit tests
- Use cypress for E2E tests

## Documentation

- Document all public APIs
- Include usage examples
- Keep README up to date
```

### 3. Include Context and Rationale

```markdown
## Performance Guidelines

- Memoize expensive computations with useMemo
   - *Rationale: Prevents unnecessary recalculations on every render*
   - Example: `const total = useMemo(() => items.reduce(...), [items])`
```

### 4. Use Examples Liberally

```markdown
## Error Handling

Always provide user-friendly error messages:

\`\`\`typescript
// ✅ Good
throw new Error('Failed to load user data. Please try again later.');

// ❌ Bad
throw new Error('Error');
\`\`\`
```

### 5. Group Related Rules

```markdown
## API Design

### Request/Response Format

- Always return consistent response structure
- Include status codes in responses
- Validate all inputs

### Authentication

- Use JWT tokens for auth
- Validate tokens on every request
- Refresh tokens before expiry
```

## File Structure

Windsurf uses a single `.windsurfrules` file, so organize your content with clear headers:

```markdown
# Project Name - Coding Standards

## 1. Code Style

### TypeScript
- Use strict mode
- Avoid any type

### Formatting
- Use Prettier
- 2 space indentation

## 2. Architecture

### Folder Structure
- Feature-based organization
- Shared code in common/

### Module Design
- Single responsibility
- Clear interfaces

## 3. Testing

### Unit Tests
- Test behavior, not implementation
- Use descriptive names

### Integration Tests
- Test critical paths
- Mock external services
```

## Supported Content

Windsurf rules files support:
- ✅ Headers (H1-H6)
- ✅ Lists (bullet and numbered)
- ✅ Code blocks with syntax highlighting
- ✅ Bold and italic text
- ✅ Links
- ✅ Blockquotes
- ❌ Special frontmatter (plain markdown only)
- ❌ Custom MDC components

## Examples

### TypeScript Project Standards

```json
{
  "name": "@company/typescript-standards",
  "type": "windsurf",
  "tags": ["typescript", "coding-standards"]
}
```

```markdown
# TypeScript Standards

## Type Safety

- Enable strict mode in tsconfig.json
- Avoid using `any` type
- Define interfaces for all data structures

## Code Organization

- One component per file
- Export from index.ts files
- Use barrel exports for cleaner imports
```

### React Component Guidelines

```json
{
  "name": "@company/react-guidelines",
  "type": "windsurf",
  "tags": ["react", "components"]
}
```

```markdown
# React Component Guidelines

## Component Structure

\`\`\`typescript
// ✅ Good: Clear structure
interface Props {
  userId: string;
  onUpdate: (user: User) => void;
}

export function UserProfile({ userId, onUpdate }: Props) {
  const [user, setUser] = useState<User | null>(null);

  // Hook logic here

  return (
    // JSX here
  );
}
\`\`\`

## Performance

- Memoize callbacks with useCallback
- Memoize computed values with useMemo
- Use React.memo for expensive components
```

### API Development Standards

```json
{
  "name": "@company/api-standards",
  "type": "windsurf",
  "tags": ["api", "backend"]
}
```

```markdown
# API Development Standards

## REST Conventions

- Use plural nouns for resources: /users not /user
- Use HTTP methods correctly: GET, POST, PUT, DELETE
- Return appropriate status codes

## Error Handling

\`\`\`typescript
// Standard error response format
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
\`\`\`

## Authentication

- All endpoints except /auth/* require authentication
- Include JWT token in Authorization header
- Validate token on every request
```

## Migration from Other Formats

### From Cursor (.cursorrules)

Cursor files may have MDC headers - these will be removed when converting to Windsurf:

**Before** (.cursorrules):
```markdown
---
name: React Rules
emoji: ⚛️
---

# React Best Practices
...
```

**After** (.windsurfrules):
```markdown
# React Best Practices
...
```

### From Copilot Instructions

Copilot path-specific instructions become repository-wide in Windsurf:

**Before** (.github/instructions/api.instructions.md):
```markdown
---
applyTo:
  - src/api/**/*.ts
---

# API Guidelines
...
```

**After** (.windsurfrules):
```markdown
# API Guidelines

*Note: These guidelines apply to API code in src/api/*

...
```

## Troubleshooting

### Rules Not Being Applied

1. Check file location: Must be `.windsurfrules` in project root
2. Verify file is plain markdown (no special frontmatter)
3. Restart Windsurf to reload rules

### Formatting Issues

- Use standard markdown syntax
- Avoid custom HTML or components
- Test with a markdown preview tool

### File Not Found After Installation

Check that PRPM installed to the correct location:
```bash
ls -la .windsurfrules
```

If missing, try reinstalling:
```bash
prpm install <package-name> --as windsurf
```

## Resources

- [Windsurf Documentation](https://codeium.com/windsurf)
- [PRPM Documentation](https://github.com/khaliqgant/prompt-package-manager)
- [Markdown Guide](https://www.markdownguide.org/)
