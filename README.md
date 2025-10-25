# PRPM - The Package Manager for AI Prompts

<!-- karen-badge-start -->
[![Karen Score](.karen/badges/score-badge.svg)](.karen/review.md)
<!-- karen-badge-end -->


**Stop copy-pasting prompts from GitHub.** Install Cursor rules, Claude skills, and AI agents like npm packages.

```bash
npm install -g prpm
prpm install collection/nextjs-pro  # Entire Next.js setup in one command
```

**1,300+ packages** | **Works everywhere** (Cursor, Claude, Continue, Windsurf, GitHub Copilot, Kiro) | **One command to install**

---

## 📦 Collections - Complete Setups in One Command

Skip installing packages one-by-one. Get curated bundles for your entire workflow:

```bash
# Install 5+ packages at once
prpm install collection/nextjs-pro
# → Installs react-best-practices, typescript-strict, tailwind-helper,
#    nextjs-patterns, component-architect

# Python data science stack
prpm install collection/python-data
# → Installs pandas-helper, numpy-patterns, matplotlib-guide,
#    jupyter-best-practices, ml-workflow

# Full-stack React
prpm install collection/react-fullstack
# → Everything for React + Node + PostgreSQL (8 packages)

# Collections are just packages grouped together - each package is installed
# individually but with a single command. Perfect for onboarding or project setup!
```

**[Browse Collections →](docs/COLLECTIONS.md)** | **[View Examples →](docs/EXAMPLES.md)**

---

## 🔄 Universal Packages - Install Once, Use Anywhere

Every package works in **any** AI editor. No conversion tools, no separate downloads:

```bash
# Same package, different editors
prpm install react-best-practices --as cursor    # → .cursor/rules/
prpm install react-best-practices --as claude    # → .claude/agents/
prpm install react-best-practices --as continue  # → .continue/prompts/
prpm install react-best-practices --as windsurf  # → .windsurf/rules/
prpm install react-best-practices --as copilot   # → .github/instructions/
prpm install react-best-practices --as kiro      # → .kiro/steering/

# Or just let PRPM auto-detect
prpm install react-best-practices  # Installs in the right place automatically
```

**Format conversion happens server-side.** Authors publish once, users install everywhere.


## 🔍 Discovery - Find What You Need

Browse packages with powerful discovery:

```bash
# Search by keyword
prpm search react
prpm search "test driven development"

# See what's trending
prpm trending

# Browse by popularity
prpm popular

# Get detailed info
prpm info react-best-practices
# → Shows: description, downloads, rating, tags, installation instructions

# Browse collections
prpm collections
prpm collections --category frontend
prpm collections info collection/nextjs-pro
```

**Smart filters:** Category, tags, editor type, trending vs popular, official vs community

**[Full CLI Reference →](docs/CLI.md)**

---

## Why PRPM?

### The Problem
```bash
# Current workflow (painful)
1. Find cursor rule on GitHub
2. Copy raw file URL
3. Create .cursor/rules/something.md
4. Paste content
5. Repeat for every rule
6. Update manually when rules change
7. Do it all again for Claude/Continue/Windsurf
```

### The Solution
```bash
# PRPM workflow (simple)
prpm install collection/nextjs-pro  # Entire setup (multiple packages)
# OR
prpm install test-driven-development  # Single package
prpm install systematic-debugging
```

**It's npm for AI prompts. But it works everywhere.**

### Team Consistency

If you're working on a big project and some coworkers use Copilot, others use Claude, and sometimes it's Cursor, the only way to unify rules so it's consistent across the codebase is to use PRPM. It's an easy way to make sure everyone has the same rules across the team.

---

## Quick Start

### Install PRPM
```bash
npm install -g prpm

# Login to access registry
prpm login
```

### Configure (Optional)
```bash
# Set default format
prpm config set defaultFormat cursor

# Customize Cursor/Claude headers
# See Configuration Guide for details
```

### Install Your First Collection
```bash
# Get a complete setup (installs multiple packages at once)
prpm install collection/nextjs-pro

# Or browse available collections
prpm collections
```

### Install Individual Packages
```bash
# For any editor (auto-detected)
prpm install test-driven-development

# Or specify the format
prpm install test-driven-development --as cursor
prpm install karen-skill --as claude
```

### Use It
- **Cursor**: Rules auto-activate based on context
- **Claude Code**: Skills available in all conversations
- **Continue**: Prompts ready to use
- **Windsurf**: Rules integrated automatically

**[Full Installation Guide →](docs/INSTALLATION.md)** | **[Configuration Guide →](docs/CONFIGURATION.md)**

---

## Popular Packages

### 🔥 Most Installed

**Karen** - Brutally honest code reviews
```bash
prpm install karen-skill  # Works in any editor
```

**Test-Driven Development** - TDD workflow
```bash
prpm install test-driven-development
```

**Systematic Debugging** - Debug like a senior engineer
```bash
prpm install systematic-debugging
```

### 📚 Package Library (1,300+)

- **🎯 Cursor Rules** - Next.js, React, Vue, Python, Laravel, TypeScript, mobile, testing, and hundreds more
- **🤖 Claude Skills & Agents** - Repository analysis, code review, architecture, specialized workflows
- **🌊 Windsurf Rules** - Frontend, backend, mobile, DevOps, and full-stack development
- **🔌 MCP Server Configs** - Auto-configure MCP servers for Claude Code
- **📦 Collections** - Multi-package bundles for complete workflow setups

**Categories:** Frontend frameworks, Backend frameworks, Programming languages, Testing, Mobile development, Cloud & DevOps, AI & ML, Databases, Web3, Best practices, and more

**[Package Catalog →](docs/PACKAGES.md)** | **[Browse at prpm.dev →](https://prpm.dev)**

---

## Commands

```bash
# Collections
prpm collections                    # Browse available collections
prpm install collection/nextjs-pro  # Install a collection

# Packages
prpm search react                    # Search packages
prpm install <package-name>          # Install package
prpm install <package> --as cursor   # Install for specific editor
prpm list                            # List installed
prpm uninstall <package-name>           # Remove package

# Updates
prpm outdated                        # Check for updates
prpm update                          # Update all packages

# Discovery
prpm trending                        # Trending packages
prpm popular                         # Most popular packages
prpm info <package-name>             # Package details
```

**[Full CLI Reference →](docs/CLI.md)**

---

## Real-World Examples

### Complete Next.js Setup
```bash
prpm install collection/nextjs-pro
# Installs 5+ packages in one command: React best practices, TypeScript config,
# Tailwind helpers, Next.js patterns, component architecture
```

### Switch Between Editors
```bash
# Working in Cursor today
prpm install react-best-practices --as cursor

# Trying Claude Code tomorrow
prpm install react-best-practices --as claude
# Same package, different format. Zero conversion work.
```

### Get Code Reviews
```bash
prpm install karen-skill
# Ask in Claude Code: "Karen, review this repository"
# Get: 78/100 score + market research + actionable fixes
```

**[More Examples →](docs/EXAMPLES.md)**

---

## How It Works

```
┌─────────────────────────────────────┐
│  prpm install <package> --as cursor │
└──────────────┬──────────────────────┘
               │
               ├─> Fetches from registry
               ├─> Converts to Cursor format (server-side)
               ├─> Installs to .cursor/rules/
               └─> Tracks in prpm.lock
```

**Smart Features:**
- **Auto-detection** - Detects Cursor vs Claude vs Continue vs Windsurf
- **Format conversion** - Server-side conversion to any editor format
- **Dependency resolution** - Handles package dependencies automatically
- **Version locking** - prpm-lock.json for consistent installs
- **Collections** - Install multiple packages as bundles

**[Architecture Details →](docs/ARCHITECTURE.md)**

---

## What Makes PRPM Different?

| Feature | PRPM | Manual Copying | Other Tools |
|---------|------|----------------|-------------|
| **Collections (multi-package installs)** | ✅ | ❌ | ❌ |
| **Universal packages (any editor)** | ✅ | ❌ | ❌ |
| **Server-side format conversion** | ✅ | ❌ | ❌ |
| **Auto-updates** | ✅ | ❌ | ⚠️ |
| **Version control** | ✅ | ❌ | ⚠️ |
| **Dependency handling** | ✅ | ❌ | ❌ |
| **Works with Cursor + Claude + Continue + Windsurf** | ✅ | ⚠️ | ❌ |
| **Configures MCP servers (Claude Code)** | ✅ | ❌ | ❌ |

---

## 🔥 Bonus: Karen Code Reviews

Get brutally honest repository reviews with Karen Scores (0-100):

```bash
# GitHub Action (automated)
- uses: khaliqgant/karen-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or interactive in your IDE
prpm install karen-skill
```

**[Get Your Karen Score →](GET_KAREN_SCORE.md)** | **[See Our Score (78/100)](.karen/review.md)**

Karen analyzes: Bullshit Factor, Actually Works, Code Quality, Completion Honesty, and Practical Value (with competitor research).

---

## For Package Authors

### Share Your Packages

Package authors can publish to PRPM and reach users across all editors.

**How it works:**
- Authors publish in canonical format
- PRPM converts to all editor formats automatically
- Users install in their preferred editor

**Benefits:**
- 4x reach (Cursor + Claude + Continue + Windsurf users)
- One package, works everywhere
- Version control and updates
- Download analytics

Contact [@khaliqgant](https://github.com/khaliqgant) for publishing access.

---

## Roadmap

**v1.0 (Now)** ✅
- CLI package manager
- Collections system
- Format conversion (Cursor, Claude, Continue, Windsurf)
- MCP server configuration (Claude Code only)

**v1.5 (Q2 2025)**
- 🏪 Central registry at prpm.dev
- 🔍 Web search and discovery
- 📊 Package analytics
- 🎨 Collection templates

**v2.0 (Q3 2025)**
- 🤖 AI-powered package recommendations
- 🏢 Private registries
- 👥 Team management
- 🔒 Enterprise features

**[Full Roadmap →](ROADMAP.md)**

---

## Stats

- **1,300+ packages** - Cursor rules, Claude skills/agents, Windsurf rules, MCP configs
- **Universal package manager** - Works with Cursor, Claude, Continue, Windsurf
- **Collections** - Complete workflow setups in one command
- **4 editor formats** supported (server-side conversion)
- **78/100 Karen Score** - [See our review](.karen/review.md)
- **First-mover advantage** - Only universal prompt package manager
- **npm + Homebrew** - Multi-platform distribution

---

## Documentation

### 📚 User Documentation

**Get Started:**
- 📖 **[User Docs Index](docs/)** - Complete user documentation
- 📦 [Installation Guide](docs/INSTALLATION.md)
- ⚙️ [Configuration Guide](docs/CONFIGURATION.md) - ~/.prpmrc, prpm.lock, format customization
- 💻 [CLI Reference](docs/CLI.md) - Complete command reference

**Core Concepts:**
- 📚 [Collections](docs/COLLECTIONS.md) - Multi-package bundles
- 🔄 [Format Conversion](docs/FORMAT_CONVERSION.md) - Universal packages explained
- 📦 [Packages](docs/PACKAGES.md) - Package catalog
- 🎯 [Examples](docs/EXAMPLES.md) - Real-world usage

**Advanced:**
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design
- 🔌 [MCP Servers](docs/MCP_SERVERS_IN_COLLECTIONS.md) - MCP configuration
- 📝 [Publishing](docs/PUBLISHING.md) - Publish your packages

**Format-Specific Guides:**
- ✈️ [GitHub Copilot](docs/GITHUB_COPILOT.md) - Instructions for GitHub Copilot
- 🎯 [Kiro](docs/KIRO.md) - Steering files for Kiro AI
- 🌊 [Windsurf](docs/WINDSURF.md) - Rules for Windsurf editor

### 🛠️ Developer Documentation

**For Contributors:**
- 🔧 **[Development Docs](development/docs/)** - Internal documentation index
- 💻 [Development Setup](development/docs/DEVELOPMENT.md) - Local environment
- 🐳 [Docker Services](development/docs/DOCKER.md) - PostgreSQL, Redis, MinIO

**Deployment & Infrastructure:**
- 🚀 [Deployment Summary](development/docs/DEPLOYMENT_SUMMARY.md) - Complete deployment guide
- 📊 [Deployment Quickstart](development/docs/DEPLOYMENT_QUICKSTART.md) - TL;DR deployment
- 🗄️ [Seeding Production](development/docs/SEEDING_PRODUCTION.md) - Database seeding
- 🔄 [CI/CD Workflows](development/docs/GITHUB_WORKFLOWS.md) - GitHub Actions

### 🔥 Karen Code Reviews
- 🔥 [Get Your Karen Score](GET_KAREN_SCORE.md)
- 📖 [Karen GitHub Action](https://github.com/khaliqgant/karen-action)
- 💡 [Karen Implementation](KAREN_IMPLEMENTATION.md)

---

## Installation

```bash
# NPM (recommended)
npm install -g prpm

# Homebrew
brew install khaliqgant/homebrew-prpm/prpm

# Direct download
# See releases: github.com/pr-pm/prpm/releases
```

Then:
```bash
prpm install collection/nextjs-pro  # Get started with a complete setup
```

---

## Contributing

We welcome contributions!

- 📦 **Add packages** - Submit your prompts (they'll work in all editors!)
- 🎁 **Create collections** - Curate helpful package bundles
- 🐛 **Report bugs** - Open issues
- 💡 **Suggest features** - Start discussions
- 🧪 **Write tests** - Improve coverage

**[Contributing Guide →](CONTRIBUTING.md)**

---

## License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Stop copy-pasting. Start installing.**

**[Install PRPM](#installation)** | **[Browse Collections](docs/COLLECTIONS.md)** | **[Get Karen Score](GET_KAREN_SCORE.md)**

_Collections install multiple curated packages with one command • Packages work in all editors • No manual copying needed_

Made with 🔥 by [@khaliqgant](https://github.com/khaliqgant)

</div>
