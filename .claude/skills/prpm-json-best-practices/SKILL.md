---
name: PRPM JSON Best Practices
description: Best practices for structuring prpm.json package manifests with required fields, tags, organization, and multi-package management
author: PRPM Team
version: 1.0.0
tags:
  - prpm
  - package-management
  - json
  - manifest
  - best-practices
  - publishing
---

# PRPM JSON Best Practices

You are an expert at creating and maintaining `prpm.json` package manifests for PRPM (Prompt Package Manager). You understand the structure, required fields, organization patterns, and best practices for multi-package repositories.

## When to Apply This Skill

**Use when:**
- Creating a new `prpm.json` manifest for publishing packages
- Maintaining existing `prpm.json` files
- Organizing multi-package repositories
- Adding or updating package metadata
- Ensuring package manifest quality and completeness

**Don't use for:**
- User configuration files (`.prpmrc`) - those are for users
- Lockfiles (`prpm.lock`) - those are auto-generated
- Regular package installation (users don't need `prpm.json`)

## Core Purpose

`prpm.json` is **only needed if you're publishing packages**. Regular users installing packages from the registry don't need this file.

Use `prpm.json` when you're:
- Publishing a package to the PRPM registry
- Creating a collection of packages
- Distributing your own prompts/rules/skills/agents
- Managing multiple related packages in a monorepo

## File Structure

### Single Package

For repositories with one package:

```json
{
  "name": "my-awesome-skill",
  "version": "1.0.0",
  "description": "Clear, concise description of what this package does",
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "repository": "https://github.com/username/repo",
  "organization": "your-org",
  "format": "claude",
  "subtype": "skill",
  "tags": ["typescript", "best-practices", "code-quality"],
  "files": [
    ".claude/skills/my-awesome-skill/SKILL.md"
  ]
}
```

### Multi-Package Repository

For repositories with multiple packages (like this one):

```json
{
  "name": "prpm-packages",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT",
  "repository": "https://github.com/username/repo",
  "organization": "your-org",
  "packages": [
    {
      "name": "package-one",
      "version": "1.0.0",
      "description": "Description of package one",
      "private": true,
      "format": "claude",
      "subtype": "agent",
      "tags": ["tag1", "tag2"],
      "files": [".claude/agents/package-one.md"]
    },
    {
      "name": "package-two",
      "version": "1.0.0",
      "description": "Description of package two",
      "format": "cursor",
      "subtype": "rule",
      "tags": ["tag1", "tag3"],
      "files": [".cursor/rules/package-two.mdc"]
    }
  ]
}
```

## Required Fields

### Top-Level (Single Package)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Package name (kebab-case, unique in registry) |
| `version` | string | **Yes** | Semver version (e.g., `1.0.0`) |
| `description` | string | **Yes** | Clear description of what the package does |
| `author` | string | **Yes** | Author name and optional email |
| `license` | string | **Yes** | SPDX license identifier (e.g., `MIT`, `Apache-2.0`) |
| `format` | string | **Yes** | Target format: `claude`, `cursor`, `continue`, `windsurf`, etc. |
| `subtype` | string | **Yes** | Package type: `agent`, `skill`, `rule`, `slash-command`, `prompt`, `collection` |
| `files` | string[] | **Yes** | Array of files to include in package |

### Optional Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `repository` | string | Git repository URL |
| `organization` | string | Organization name (for scoped packages) |
| `homepage` | string | Package homepage URL |
| `documentation` | string | Documentation URL |
| `tags` | string[] | Searchable tags (kebab-case) |
| `keywords` | string[] | Additional keywords for search |
| `category` | string | Package category |
| `private` | boolean | If `true`, won't be published to public registry |
| `dependencies` | object | Package dependencies (name: semver) |

### Multi-Package Fields

When using `packages` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Unique package name |
| `version` | string | **Yes** | Package version |
| `description` | string | **Yes** | Package description |
| `format` | string | **Yes** | Package format |
| `subtype` | string | **Yes** | Package subtype |
| `tags` | string[] | Recommended | Searchable tags |
| `files` | string[] | **Yes** | Files to include |
| `private` | boolean | No | Mark as private |

## Format and Subtype Values

### Format (Target AI Tool)

| Format | Description |
|--------|-------------|
| `claude` | Claude Code (agents, skills) |
| `cursor` | Cursor IDE (rules, MDC files) |
| `continue` | Continue.dev extension |
| `windsurf` | Windsurf IDE |
| `copilot` | GitHub Copilot |
| `kiro` | Kiro IDE |
| `agents.md` | Agents.md format |
| `generic` | Generic/universal format |
| `mcp` | Model Context Protocol |

### Subtype (Package Type)

| Subtype | Description | Typical Formats |
|---------|-------------|-----------------|
| `agent` | Autonomous agents | `claude`, `agents.md` |
| `skill` | Specialized capabilities | `claude` |
| `rule` | IDE rules and guidelines | `cursor`, `windsurf` |
| `slash-command` | Slash commands | `cursor`, `continue` |
| `prompt` | Prompt templates | `generic` |
| `collection` | Package collections | Any |
| `chatmode` | Chat modes | `kiro` |
| `tool` | MCP tools | `mcp` |

## Tags Best Practices

### Tag Structure

- Use **kebab-case** for all tags
- Be **specific** and **searchable**
- Include 3-8 tags per package
- Combine technology, domain, and purpose tags

### Tag Categories

**Technology Tags:**
- Languages: `typescript`, `python`, `javascript`, `rust`
- Frameworks: `react`, `nextjs`, `fastify`, `django`
- Tools: `aws`, `docker`, `kubernetes`, `postgresql`

**Domain Tags:**
- `deployment`, `testing`, `ci-cd`, `database`
- `infrastructure`, `cloud`, `monitoring`
- `documentation`, `code-review`, `security`

**Purpose Tags:**
- `troubleshooting`, `debugging`, `best-practices`
- `automation`, `quality-assurance`, `performance`
- `architecture`, `design-patterns`

**Meta Tags:**
- `meta` - For packages about creating packages
- `prpm-internal` - For internal/private packages
- `prpm-development` - For PRPM development itself

### Tag Examples

**Good Tags:**
```json
{
  "tags": [
    "typescript",
    "type-safety",
    "code-quality",
    "best-practices",
    "static-analysis"
  ]
}
```

**Poor Tags:**
```json
{
  "tags": [
    "code",  // Too generic
    "stuff", // Meaningless
    "TypeScript", // Wrong case
    "type_safety"  // Wrong format (use kebab-case)
  ]
}
```

## Organization Best Practices

### Multi-Package Organization

**Order packages by:**
1. **Privacy** - Private packages first
2. **Format** - Group by format (claude, cursor, etc.)
3. **Subtype** - Group by subtype (agent, skill, rule)

**Example organization:**

```json
{
  "packages": [
    // Private > Claude > Agents
    { "name": "internal-agent", "private": true, "format": "claude", "subtype": "agent" },

    // Private > Claude > Skills
    { "name": "internal-skill", "private": true, "format": "claude", "subtype": "skill" },

    // Private > Cursor > Rules
    { "name": "internal-rule", "private": true, "format": "cursor", "subtype": "rule" },

    // Public > Claude > Skills
    { "name": "public-skill", "format": "claude", "subtype": "skill" },

    // Public > Cursor > Rules
    { "name": "public-rule", "format": "cursor", "subtype": "rule" }
  ]
}
```

### Naming Conventions

**Package Names:**
- Use **kebab-case**: `my-awesome-skill`
- Be **descriptive**: `typescript-type-safety` not `ts-types`
- Avoid duplicates across formats: use suffixes if needed
  - `format-conversion-agent` (Claude agent)
  - `format-conversion` (Cursor rule)

**File Paths:**
- Use **full paths from project root** (where prpm.json lives)
- Agents: `.claude/agents/name.md`
- Skills: `.claude/skills/name/SKILL.md`
- Rules: `.cursor/rules/name.mdc`
- Commands: `.claude/commands/category/name.md`

## Version Management

### Semver Guidelines

Follow semantic versioning:

- **Major (1.0.0 → 2.0.0)**: Breaking changes
- **Minor (1.0.0 → 1.1.0)**: New features, backward compatible
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, backward compatible

### Version Bumping

When to bump versions:
- **Patch**: Bug fixes, typo corrections, minor improvements
- **Minor**: New sections, additional examples, new features
- **Major**: Complete rewrites, breaking changes, renamed fields

### Keep Versions in Sync

For multi-package repos, keep related packages in sync:
```json
{
  "packages": [
    { "name": "pkg-one", "version": "1.2.0" },
    { "name": "pkg-two", "version": "1.2.0" },
    { "name": "pkg-three", "version": "1.2.0" }
  ]
}
```

## File Management

### Files Array

**CRITICAL: File paths must be full paths from project root (where prpm.json lives).**

**Required:**
- List all files to include in the package
- Use **full paths from project root** - not relative to destination directories
- Paths should start with `.claude/`, `.cursor/`, etc.
- Include documentation files

**Why Full Paths?**
File paths in `prpm.json` are used for:
1. **Tarball creation** - Reads files directly from these paths
2. **Snippet extraction** - Shows file preview before install
3. **Installation** - CLI derives destination from format/subtype

**Examples:**

Claude agent (single file):
```json
{
  "format": "claude",
  "subtype": "agent",
  "files": [".claude/agents/my-agent.md"]
}
```

Claude skill (multiple files):
```json
{
  "format": "claude",
  "subtype": "skill",
  "files": [
    ".claude/skills/my-skill/SKILL.md",
    ".claude/skills/my-skill/EXAMPLES.md",
    ".claude/skills/my-skill/README.md"
  ]
}
```

Cursor rule:
```json
{
  "format": "cursor",
  "subtype": "rule",
  "files": [".cursor/rules/my-rule.mdc"]
}
```

Slash command:
```json
{
  "format": "claude",
  "subtype": "slash-command",
  "files": [".claude/commands/category/my-command.md"]
}
```

**Common Mistake:**
```json
{
  // ❌ WRONG - Relative paths without directory prefix
  "files": ["agents/my-agent.md"]  // Will fail to find file

  // ✅ CORRECT - Full path from project root
  "files": [".claude/agents/my-agent.md"]
}
```

### File Verification

Always verify files exist:
```bash
# Check all files in prpm.json exist
for file in $(cat prpm.json | jq -r '.packages[].files[]'); do
  if [ ! -f "$file" ]; then
    echo "Missing: $file"
  fi
done
```

## Duplicate Detection

### Check for Duplicate Names

Run this check before committing:

```bash
# Check for duplicate package names
cat prpm.json | jq -r '.packages[].name' | sort | uniq -d
```

If output is empty, no duplicates exist. If names appear, you have duplicates to resolve.

### Resolving Duplicates

**Bad:**
```json
{
  "packages": [
    { "name": "typescript-safety", "format": "claude" },
    { "name": "typescript-safety", "format": "cursor" }
  ]
}
```

**Good:**
```json
{
  "packages": [
    { "name": "typescript-safety", "format": "claude", "subtype": "skill" },
    { "name": "typescript-safety-rule", "format": "cursor", "subtype": "rule" }
  ]
}
```

## Common Patterns

### Private Internal Packages

```json
{
  "name": "internal-tool",
  "version": "1.0.0",
  "description": "Internal development tool",
  "private": true,
  "format": "claude",
  "subtype": "skill",
  "tags": ["prpm-internal", "development"],
  "files": [".claude/skills/internal-tool/SKILL.md"]
}
```

### Meta Packages (Creating Other Packages)

```json
{
  "name": "creating-skills",
  "version": "1.0.0",
  "description": "Guide for creating effective Claude Code skills",
  "format": "claude",
  "subtype": "skill",
  "tags": ["meta", "claude-code", "skills", "documentation", "best-practices"],
  "files": [".claude/skills/creating-skills/SKILL.md"]
}
```

### Cross-Format Packages

When you have the same content for multiple formats:

```json
{
  "packages": [
    {
      "name": "format-conversion-agent",
      "format": "claude",
      "subtype": "agent",
      "description": "Agent for converting between AI prompt formats",
      "files": [".claude/agents/format-conversion.md"]
    },
    {
      "name": "format-conversion",
      "format": "cursor",
      "subtype": "rule",
      "description": "Rule for converting between AI prompt formats",
      "files": [".cursor/rules/format-conversion.mdc"]
    }
  ]
}
```

## Validation Checklist

Before publishing, verify:

**Required Fields:**
- [ ] All packages have `name`, `version`, `description`
- [ ] All packages have `format` and `subtype`
- [ ] All packages have `files` array
- [ ] Top-level has `author` and `license`

**File Verification:**
- [ ] All files in `files` arrays exist
- [ ] File paths are relative to repo root
- [ ] No missing or broken file references

**No Duplicates:**
- [ ] No duplicate package names
- [ ] Package names are unique across entire manifest

**Tags:**
- [ ] Tags use kebab-case
- [ ] 3-8 relevant tags per package
- [ ] Tags include technology, domain, and purpose

**Organization:**
- [ ] Private packages listed first
- [ ] Packages grouped by format and subtype
- [ ] Consistent versioning across related packages

## Publishing Workflow

### 1. Validate Manifest

```bash
# Validate JSON syntax
cat prpm.json | jq . > /dev/null

# Check for duplicates
cat prpm.json | jq -r '.packages[].name' | sort | uniq -d

# Verify files exist
# (see File Verification section)
```

### 2. Bump Versions

Update version numbers for changed packages.

### 3. Test Locally

```bash
# Test package installation
prpm install . --dry-run
```

### 4. Publish

```bash
# Publish all packages
prpm publish

# Or publish specific package
prpm publish --package my-skill
```

## Common Mistakes to Avoid

### ❌ Missing Required Fields

```json
{
  "name": "my-skill",
  // Missing: version, description, format, subtype, files
}
```

### ❌ Wrong Tag Format

```json
{
  "tags": ["TypeScript", "Code_Quality", "bestPractices"]
  // Should be: ["typescript", "code-quality", "best-practices"]
}
```

### ❌ Duplicate Names

```json
{
  "packages": [
    { "name": "my-skill", "format": "claude" },
    { "name": "my-skill", "format": "cursor" }
    // Second should be: "my-skill-rule" or similar
  ]
}
```

### ❌ Missing Files

```json
{
  "files": [".claude/skills/my-skill/SKILL.md"]
  // But .claude/skills/my-skill/SKILL.md doesn't exist in the repo
}
```

### ❌ Absolute Paths

```json
{
  "files": ["/Users/me/project/.claude/skills/my-skill/SKILL.md"]
  // Should be: ".claude/skills/my-skill/SKILL.md" (relative to project root)
}
```

### ❌ Missing Directory Prefix

```json
{
  "files": ["agents/my-agent.md"]
  // Should be: ".claude/agents/my-agent.md" (include .claude/ prefix)
}
```

## Remember

- `prpm.json` is **only for publishing**, not for users
- Always validate before committing
- Keep versions in sync for related packages
- Use consistent, searchable tags
- Organize packages logically (private > format > subtype)
- Verify all file paths exist
- Check for duplicate names
- Follow semver for version management

**Goal:** Create maintainable, well-organized package manifests that are easy to publish and discover in the PRPM registry.
