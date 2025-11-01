# PRPM Usage Examples

Real-world examples of using PRPM in different scenarios.

## Quick Examples

### Install a Complete Next.js Setup

```bash
prpm install nextjs-pro
```

**What gets installed:**
- React best practices
- TypeScript strict mode rules
- Tailwind CSS helpers
- Next.js patterns
- Component architecture guides

### Switch Between Editors

```bash
# Working in Cursor today
prpm install test-driven-development --as cursor

# Trying Claude Code tomorrow
prpm install test-driven-development --as claude
```

Same package, different format. Zero manual conversion.

### Get Brutal Code Reviews

```bash
prpm install karen-skill

# Then in Claude Code:
# "Karen, review this repository"
```

**Karen analyzes:**
- Bullshit Factor
- Actually Works score
- Code Quality
- Completion Honesty
- Practical Value

### Python Data Science Stack

```bash
prpm install python-data
```

**Includes:**
- pandas-helper
- numpy-patterns
- matplotlib-guide
- jupyter-best-practices
- ml-workflow

## Workflow Examples

### Team Onboarding

```bash
# Share prpm.lock with team
git add prpm.lock
git commit -m "Add PRPM packages"

# New team member
git pull
prpm install  # Installs everything from lockfile
```

### Keep Packages Updated

```bash
# Weekly check
prpm outdated

# Update safe versions
prpm update

# Review major updates
prpm upgrade --dry-run
```

### Multi-Editor Development

```bash
# Install for both editors
prpm install react-patterns --as cursor
prpm install react-patterns --as claude

# Now you have both:
# .cursor/rules/react-patterns.md
# .claude/skills/react-patterns/SKILL.md
```

## Advanced Examples

### Custom Configuration

```bash
# Set your name in all Cursor rules
prpm config set cursor.author "Jane Developer"

# Use Sonnet model for Claude agents
prpm config set claude.model sonnet

# Install package with custom config applied
prpm install backend-patterns --as cursor
```

### CI/CD Integration

```bash
# .github/workflows/install-prompts.yml
name: Install PRPM Packages

on: [push]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install PRPM
        run: npm install -g prpm

      - name: Install packages
        env:
          PRPM_TOKEN: ${{ secrets.PRPM_TOKEN }}
        run: prpm install
```

### Private Registry

```bash
# Use company registry
export PRPM_REGISTRY_URL=https://prpm.company.com

# Install internal packages
prpm install @company/internal-patterns
```

## Collection Examples

### Full-Stack TypeScript

```bash
prpm install typescript-fullstack
```

**Packages included:**
- TypeScript configuration
- Node.js backend patterns
- React frontend patterns
- Database best practices
- API design guides

### DevOps & Infrastructure

```bash
prpm install devops-complete
```

**Packages included:**
- Docker best practices
- Kubernetes patterns
- CI/CD workflows
- Infrastructure as Code guides
- Monitoring & observability

## See Also

- [CLI Reference](./CLI.md) - Complete command reference
- [Collections Guide](./COLLECTIONS.md) - Using collections
- [Configuration Guide](./CONFIGURATION.md) - Customizing PRPM
