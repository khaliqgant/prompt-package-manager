# PRPM: Distributable Intelligence for AI-Assisted Development

**Ship rules, skills, and agents that make breaking changes painless—install once, every AI assistant understands your patterns.**

---

## In One Line

PRPM is a package manager for AI coding assistants—ship rules, skills, and agents that make migrations and refactors correct by default.

## In Two Minutes

Codemods automate the first 60–80% of migrations. Docs explain the rest. Developers still wrestle with edge cases, conventions, and tests. **PRPM closes the gap** by letting maintainers publish executable knowledge:

- **Rules** - Declarative constraints AI enforces during code generation
- **Skills** - Step-by-step procedures for specific tasks
- **Agents** - Multi-file orchestration with edge case detection

Developers `prpm install @vendor/migration-package`, their AI assistant loads it from `.ai/`, and performs context-aware changes across the repo, flags true edge cases, and generates tests that match your conventions.

**Outcome:** 95% of migration work handled automatically vs 70% with scripts alone. Faster upgrades, consistent code, materially fewer support tickets.

**Why now:** AI can refactor entire codebases, but it lacks framework- and company-specific patterns. PRPM provides a universal format with converters for Cursor/Windsurf/Claude/Copilot, versioned distribution, and a registry for discovery and updates.

**Who benefits:**
- **Framework authors** - Smoother breaking changes, faster adoption
- **SaaS vendors** - Deprecate old APIs sooner, fewer tickets
- **Enterprises** - Codify standards once; every team's AI follows them
- **OSS maintainers** - Contributors generate PRs in your house style

---

## How It Works in 60 Seconds

### 1. Author
Create rules, skills, and agents as Markdown files with YAML frontmatter:

```bash
$ prpm init
# Creates prpm.json + example files based on your format (cursor/claude/copilot/etc)
```

```markdown
---
format: cursor
subtype: rule
---

# Nango TypeScript Patterns

When converting YAML integrations:
- YAML `sync` → TypeScript class extending `NangoSync`
- `models` array → generic type `NangoSync<Model>`
- `frequency` → `@Frequency` decorator
...
```

### 2. Publish
```bash
$ prpm publish
✓ Published @nango/yaml-to-ts-migration@1.0.0
```

### 3. Install & Apply
```bash
$ prpm install @nango/yaml-to-ts-migration-agent
✓ Installed to .ai/nango/yaml-to-ts-migration-agent

# In your AI assistant (Cursor/Claude/etc):
"Migrate all YAML integrations to TypeScript"

# AI (with package loaded):
✓ Migrated 12 integrations
✓ Generated tests
✓ Updated imports
⚠ 2 files require manual review (flagged)
```

**Total time:** 30 minutes vs 2-4 hours

---

## The Problem: Edge Cases Stall Migrations

### Traditional Approach

When frameworks ship breaking changes:

1. **Migration script** - Handles 60-80% (syntax-level transforms)
2. **Documentation** - Explains patterns and edge cases
3. **Support channels** - Field hundreds of questions
4. **Months of lag** - Adoption delayed by migration pain

**Result:** Slow adoption, fragmented ecosystem, support burden

### Real Example: Nango's YAML → TypeScript Migration

Nango migrated from YAML-based integrations to TypeScript. They provided:

✅ **Migration script:** `nango migrate yaml-to-ts`
- Converts basic YAML structure
- Handles ~70% of common cases

✅ **Documentation:** Migration guide with examples
- API reference for new TypeScript classes
- Pattern explanations

❌ **Missing:** Deep knowledge for AI to complete migration
- Which TypeScript patterns for each YAML feature
- How to handle pagination logic correctly
- Webhook migration with proper typing
- Test generation matching Nango conventions
- Edge case detection and reporting

**Gap:** Developers manually convert 30% of cases by reading docs, trial-and-error on type errors, hoping they match Nango's patterns.

### The PRPM Solution

Nango ships **the complete suite:**

| Component | Purpose | Coverage |
|-----------|---------|----------|
| **Migration Script** | Syntax-level transforms | 70% |
| **Documentation** | Human learning | Reference |
| **PRPM Packages** | AI-executable knowledge | +25% |
| **Developer Review** | True edge cases | 5% |

**Total:** 95% automated vs 70% with scripts alone

---

## Nango Example: Complete Suite in Action

### What Nango Ships

**1. Documentation** (`docs.nango.dev`)
- Migration guide: YAML → TypeScript
- API reference for new classes
- Examples and tutorials

**2. Migration Script**
```bash
$ nango migrate yaml-to-ts
✓ Converted integrations/salesforce.yaml
⚠ Warning: Manual migration required for custom fields
⚠ Warning: Complex pagination logic needs review
⚠ Warning: See docs for webhook migration
```

**3. PRPM Packages** (the new piece)
```bash
@nango/yaml-to-ts-migration-agent     # Orchestrates full migration
@nango/typescript-integration-rules   # TypeScript patterns
@nango/sync-config-skill              # Sync configuration conversion
@nango/action-config-skill            # Action configuration conversion
@nango/webhook-migration-skill        # Webhook handler migration
```

### Developer Experience

**Without PRPM:**
```bash
$ nango migrate yaml-to-ts
# 70% converted, 30% manual work remains

# Next 2-3 hours:
# - Read migration docs
# - Manually convert custom fields
# - Fix pagination logic by trial and error
# - Debug TypeScript type errors
# - Write tests (what patterns to use?)
# - Hope everything matches Nango conventions
```

**With PRPM:**
```bash
# Step 1: Run migration script (handles basics)
$ nango migrate yaml-to-ts

# Step 2: Install Nango's AI packages
$ prpm install @nango/yaml-to-ts-migration-agent

# Step 3: Ask AI to handle the rest
"Migrate all YAML integrations to TypeScript, handling edge cases"

# AI (with Nango's packages loaded from .ai/):
✓ Scanned 12 YAML integration files
✓ Applied @nango/sync-config-skill to convert sync configs
✓ Used @nango/typescript-integration-rules for naming patterns
✓ Handled pagination logic (knows Nango patterns!)
✓ Migrated webhooks with proper typing
✓ Updated imports across codebase
✓ Generated tests matching Nango conventions
⚠ Flagged 2 edge cases for review:
  - integrations/custom-oauth.ts (line 45)
  - integrations/streaming-sync.ts (line 89)

# Step 4: Review 2 flagged files (10 minutes), commit
# Total time: 30 minutes
```

**The difference:** AI has Nango's deep engineering knowledge packaged and versioned through PRPM.

---

## Package Types: Rules, Skills, Agents

### Rules
**Declarative constraints enforced during code generation**

```markdown
---
format: cursor
subtype: rule
---

# Nango TypeScript Integration Rules

## Class Structure
- Sync configs extend `NangoSync<ModelType>`
- Action configs extend `NangoAction<InputType, OutputType>`
- Use `@Frequency` decorator for sync schedules

## Naming
- Class names: PascalCase (e.g., SalesforceContacts)
- File names: kebab-case (e.g., salesforce-contacts.integration.ts)

## Error Handling
- Wrap API calls in try/catch
- Use `NangoError` for user-facing errors
- Log with `context.log()`
```

**When AI generates code, it automatically applies these patterns.**

### Skills
**Step-by-step procedures for specific tasks**

```markdown
---
format: claude
subtype: skill
---

# Migrate YAML Sync Configuration

## Task
Convert a Nango YAML sync definition to TypeScript class.

## Process
1. Read the YAML sync configuration
2. Extract: name, frequency, models, endpoints
3. Create TypeScript class:
   - Extend `NangoSync<ModelType>`
   - Add `@Frequency` decorator
   - Implement `run()` method with sync logic
4. Preserve pagination logic
5. Add error handling
6. Generate tests

## Example
Input (YAML):
```yaml
sync:
  name: salesforce-contacts
  frequency: 1h
  models: [Contact]
```

Output (TypeScript):
```typescript
@Frequency('1h')
export class SalesforceContacts extends NangoSync<Contact> {
  async run() {
    // Sync logic
  }
}
```
```

**AI invokes skills for specific migration tasks.**

### Agents
**Multi-step orchestration with reporting**

```markdown
---
format: generic
subtype: agent
---

# Nango YAML to TypeScript Migration Agent

I am a specialized agent for migrating Nango YAML integrations to TypeScript.

## My Process
1. **Discovery** - Scan codebase for YAML integration files
2. **Analysis** - Parse each YAML, identify patterns and complexity
3. **Generation** - Create TypeScript equivalents using:
   - @nango/yaml-to-ts-patterns rules
   - @nango/sync-config-skill for syncs
   - @nango/action-config-skill for actions
4. **Integration** - Update imports, dependencies, references
5. **Testing** - Generate test files based on YAML patterns
6. **Reporting** - Summary with edge cases flagged for review

## When to Invoke Me
- Migrating single YAML integration
- Migrating entire integrations directory
- Understanding TypeScript equivalent patterns

## Edge Case Detection
I flag for manual review:
- Custom OAuth flows
- Complex rate limiting logic
- Streaming/websocket integrations
- Multi-step authentication
```

**AI runs agents for end-to-end migrations.**

---

## Other Real-World Examples

### Stripe API v3 → v4 Migration

**What Stripe ships:**
- Docs: Breaking changes changelog
- Codemod: `npx @stripe/codemods v3-to-v4`
- PRPM: `@stripe/api-v4-migration-agent`, `@stripe/payment-intent-skill`

**Result:** Complete PaymentIntent migration, updated error handling, webhook signature verification, test mocks—all matching v4 patterns.

### Next.js Pages → App Router

**What Vercel ships:**
- Docs: App Router migration guide
- Codemod: `npx @next/codemod app-router-migration`
- PRPM: `@vercel/nextjs-app-router-agent`, `@vercel/server-component-rules`

**Result:** `getServerSideProps` → async Server Components, layout migrations, Metadata API, client component detection—fully automated.

### Enterprise Internal Standards

**What companies ship:**
- Internal docs: Wiki (often outdated)
- PRPM: `@company/api-design-rules`, `@company/testing-standards`

**Result:** Every developer's AI follows company patterns automatically. New hires onboard in days, not months.

---

## Technical Architecture

```
Company/OSS Project       PRPM Registry         Developer Environment
      │                        │                          │
      │  1. Author & Publish   │                          │
      │  prpm init             │                          │
      │  prpm publish          │                          │
      │─────────────────────> │                          │
      │                        │                          │
      │                        │   2. Install             │
      │                        │   prpm install           │
      │                        │ <────────────────────────│
      │                        │                          │
      │                        │   Packages → .ai/        │
      │                        │ ─────────────────────────>
      │                        │                          │
      │                        │                    AI Assistant
      │                        │                    loads .ai/
      │                        │                          │
      │                        │                    3. Apply
      │                        │                    Transforms code
      │                        │                    Flags edge cases
      │                        │                          │
      │                        │                    Developer
      │                        │                    reviews & commits
```

### Universal Format

Write once, works everywhere:

```
Author creates:
  rules/typescript-patterns.md (Cursor format)
  skills/sync-migration.md (Claude format)
  agents/full-migration.md (generic format)

PRPM converts to:
  ├─ Cursor (.cursorrules)
  ├─ Claude (.claude/skills/*.md)
  ├─ Windsurf (.windsurfrules)
  ├─ GitHub Copilot (.github/copilot-instructions.md)
  ├─ Kiro (.kiro/steering/*.md)
  └─ Generic (prompts/*.md)

Developer's AI loads from .ai/ directory
```

**One package, all AI assistants.**

---

## Who Benefits

### Framework Authors (React, Next.js, Vue, Rails)

**Before:**
- Release breaking changes
- Ship codemod (60-80% coverage)
- Write migration docs
- Answer hundreds of support questions
- Watch adoption lag for months
- Maintain old version for years

**With PRPM:**
- Ship codemod + PRPM packages
- AI handles remaining 20-40% contextually
- Support load drops materially
- Faster adoption
- Deprecate old versions sooner

**Examples:**
- `@react/class-to-hooks-agent`
- `@vue/vue2-to-vue3-migration-agent`
- `@rails/rails7-upgrade-rules`

### SaaS Companies (Stripe, Twilio, etc.)

**Before:**
- API v2 breaking changes
- Publish changelog
- Provide codemods for common cases
- Field support requests for weeks
- Some users never migrate

**With PRPM:**
- Publish `@company/api-v2-migration-agent`
- Users install package
- AI performs contextual migration
- Edge cases clearly identified
- 95% adoption in days, not months

**Value:**
- Faster API evolution
- Deprecate old versions sooner
- Reduce support burden
- Better developer experience

### Enterprises

**Before:**
- Coding standards in wiki (outdated)
- Example repos (never quite match)
- Inconsistent code reviews
- New developers take months to learn

**With PRPM:**
```bash
$ prpm install @company/api-design-rules
$ prpm install @company/testing-standards
$ prpm install @company/database-patterns
```

**Every developer gets:**
- Instant access to company standards
- AI that generates company-style code
- Consistent patterns across teams
- Onboarding in days, not months

### Open Source Maintainers

**Before:**
- Contributing guide (long, often unread)
- Time-consuming PR reviews
- CI catches issues late

**With PRPM:**
```bash
# In README:
prpm install @project/contributor-rules
prpm install @project/pr-guidelines-skill
```

**Contributors get:**
- AI that knows project patterns
- Code generated in house style
- PRs that pass review faster
- Less maintainer burden

---

## Authoring & Publishing

### 1. Initialize
```bash
$ prpm init

Package name: @nango/yaml-to-ts-migration
Format: cursor
Subtype: agent

✓ Created prpm.json
✓ Created example files
✓ Created README.md
```

### 2. Author Packages

**prpm.json:**
```json
{
  "name": "@nango/yaml-to-ts-migration",
  "version": "1.0.0",
  "description": "Nango YAML to TypeScript migration tools",
  "format": "generic",
  "subtype": "collection",
  "files": [
    "rules/typescript-patterns.md",
    "skills/sync-migration.md",
    "agents/full-migration.md"
  ]
}
```

**Markdown files with frontmatter:**
```markdown
---
format: cursor
subtype: rule
---

# Content here
```

### 3. Test Locally (optional)
```bash
$ prpm simulate --repo ./test-app --package .
# Shows diff without applying
# Reports edge cases
```

### 4. Publish
```bash
$ prpm publish
✓ Validated package
✓ Published @nango/yaml-to-ts-migration@1.0.0
```

### 5. Users Install
```bash
$ prpm install @nango/yaml-to-ts-migration
✓ Installed to .ai/nango/yaml-to-ts-migration
```

**AI assistants auto-load from `.ai/` directory.**

---

## Comparison: PRPM vs Alternatives

| Dimension | Codemods | AI Prompts | PRPM |
|-----------|----------|------------|------|
| **Scope** | AST transforms | Ad-hoc guidance | Packaged intelligence |
| **Reusability** | Limited | Copy-paste | Install once, use everywhere |
| **Complexity** | Simple cases only | Context window limits | Multi-step workflows |
| **Distribution** | Scripts in repos | Gists, tribal knowledge | Centralized registry |
| **Versioning** | Manual | None | Semantic versioning |
| **Platform** | Language-specific | Platform-specific | Universal (all AI tools) |
| **Maintenance** | Breaks with changes | Prompts rot | Updated packages |
| **Testing** | Unit test codemod | None | Can test packages |

**PRPM augments codemods with context AI can apply.**

---

## Objections & Answers

**"Isn't this just better prompts?"**
No. Prompts aren't versioned, testable, or distributable across assistants. PRPM packages are.

**"Why not just codemods?"**
Codemods handle AST changes; they don't know conventions, tests, or cross-file tasks. PRPM augments codemods with context.

**"Will this work in my assistant?"**
Yes. PRPM ships a canonical format + converters for major assistants. Assistants read from `.ai/`.

**"Security?"**
Local execution by default, human-reviewable Markdown, signed packages (roadmap), private registries for enterprise.

**"Version drift?"**
Semver, deprecation notices, optional "compat check" rules that warn when upstream APIs change.

---

## The Complete Stack

**Every technical company should ship:**

| Component | Format | For | Coverage |
|-----------|--------|-----|----------|
| **Documentation** | Website, markdown | Humans | Concept learning |
| **Migration Scripts** | CLI, codemods | Automation | 60-80% mechanical |
| **PRPM Packages** | Rules, skills, agents | AI | +20-40% contextual |

**This is the new standard.** Documentation teaches, scripts automate, PRPM packages guide AI to handle nuanced work.

---

## Why Now

**The AI coding assistant is the new compiler.**

Just like every language needed:
- Documentation (how to write code)
- Compiler/interpreter (how to run code)
- Package manager (how to share code)

Every AI coding platform needs:
- Documentation (what to build)
- Migration scripts (basic automation)
- **PRPM packages** (how to build it correctly)

**Timeline:**
```
2020: "AI will help with autocomplete"
2023: "AI can write full functions"
2024: "AI can refactor entire codebases"
2025: "AI needs distributed knowledge to do it RIGHT"
      ↑
    PRPM fills this gap
```

**We're building the missing piece.**

---

## Roadmap

### Phase 1: Foundation (Now)
- ✅ PRPM registry and CLI
- ✅ Format conversion (Cursor ↔ Claude ↔ Copilot ↔ Kiro)
- ✅ Package publishing and discovery
- 🚧 Integration with major AI platforms

### Phase 2: Quality & Trust (Q1 2025)
- Package testing (`prpm test`)
- Simulate with diff UI (`prpm simulate`)
- Signed packages
- Update alerts when frameworks change

### Phase 3: Intelligence Layer (Q2+ 2025)
- Dependency graphs across packages
- AI-generated rules from existing codebases
- Automatic package updates
- Quality scoring and recommendations

---

## Get Started

### For Framework/Library Authors
```bash
$ prpm init
# Create migration rules, skills, and agents
$ prpm publish @yourframework/v2-migration
```

### For Enterprises
```bash
$ prpm init --private
# Create internal rules and skills
$ prpm publish @company/coding-standards --registry=company.prpm.dev
```

### For Developers
```bash
$ prpm install @react/hooks-migration
$ prpm install @stripe/api-v4-migration
# Let AI use these packages to write better code
```

---

## Demo Flow (90 Seconds)

**Setup:** Repo with 3 Nango YAML integrations (one with custom pagination)

**Steps:**
1. Run `nango migrate yaml-to-ts` → warnings shown
2. `prpm install @nango/yaml-to-ts-migration-agent`
3. In Cursor: "Migrate all YAML integrations to TS; preserve pagination; generate tests"
4. **Show:** Generated TS files, updated imports, tests; 1 file flagged as edge case
5. Review flagged file, commit

**Time:** 90 seconds
**Before:** 2-3 hours manual work
**After:** 30 minutes total

---

**This is the future of software development:** Intelligence as code, distributed through packages, applied by AI.

**Ready to build it?** [prpm.dev](https://prpm.dev) | [GitHub](https://github.com/pr-pm/prpm) | [Discord](https://discord.gg/prpm)
