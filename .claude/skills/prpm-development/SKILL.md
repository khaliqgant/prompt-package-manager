---
name: prpm-development
description: Use when developing PRPM (Prompt Package Manager) - comprehensive knowledge base covering architecture, format conversion, package types, collections, quality standards, testing, and deployment
---

# PRPM Development Knowledge Base

Complete knowledge base for developing PRPM - the universal package manager for AI prompts, agents, and rules.

## Mission

Build the npm/cargo/pip equivalent for AI development artifacts. Enable developers to discover, install, share, and manage prompts across Cursor, Claude Code, Continue, Windsurf, and future AI editors.

## Core Architecture

### Universal Format Philosophy
1. **Canonical Format**: All packages stored in normalized JSON structure
2. **Smart Conversion**: Server-side format conversion with quality scoring  
3. **Zero Lock-In**: Users convert between any format without data loss
4. **Format-Specific Optimization**: IDE-specific variants (e.g., Claude with MCP)

### Package Manager Best Practices
- **Semantic Versioning**: Strict semver for all packages
- **Dependency Resolution**: Smart conflict resolution like npm/cargo
- **Lock Files**: Reproducible installs (prpm-lock.json)
- **Registry-First**: All operations through central registry API
- **Caching**: Redis caching for converted packages (1-hour TTL)

### Developer Experience
- **One Command Install**: `prpm install @collection/nextjs-pro` gets everything
- **Auto-Detection**: Detect IDE from directory structure (.cursor/, .claude/)
- **Format Override**: `--as claude` to force specific format
- **Telemetry Opt-Out**: Privacy-first with easy opt-out
- **Beautiful CLI**: Clear progress indicators and colored output

## Package Types

### 🎓 Skill
**Purpose**: Knowledge and guidelines for AI assistants
**Location**: `.claude/skills/`, `.cursor/rules/`
**Examples**: `@prpm/pulumi-troubleshooting`, `@typescript/best-practices`

### 🤖 Agent  
**Purpose**: Autonomous AI agents for multi-step tasks
**Location**: `.claude/agents/`, `.cursor/agents/`
**Examples**: `@prpm/code-reviewer`, `@cursor/debugging-agent`

### 📋 Rule
**Purpose**: Specific instructions or constraints for AI behavior
**Location**: `.cursor/rules/`, `.cursorrules`
**Examples**: `@cursor/react-conventions`, `@cursor/test-first`

### 🔌 Plugin
**Purpose**: Extensions that add functionality
**Location**: `.cursor/plugins/`, `.claude/plugins/`

### 💬 Prompt
**Purpose**: Reusable prompt templates
**Location**: `.prompts/`, project-specific directories

### ⚡ Workflow
**Purpose**: Multi-step automation workflows
**Location**: `.workflows/`, `.github/workflows/`

### 🔧 Tool
**Purpose**: Executable utilities and scripts
**Location**: `scripts/`, `tools/`, `.bin/`

### 📄 Template
**Purpose**: Reusable file and project templates
**Location**: `templates/`, project-specific directories

### 🔗 MCP Server
**Purpose**: Model Context Protocol servers
**Location**: `.mcp/servers/`

## Format Conversion System

### Supported Formats

**Cursor (.mdc)**
- MDC frontmatter with `ruleType`, `alwaysApply`, `description`
- Markdown body
- Simple, focused on coding rules
- No structured tools/persona definitions

**Claude (agent format)**
- YAML frontmatter: `name`, `description`
- Optional: `tools` (comma-separated), `model` (sonnet/opus/haiku/inherit)
- Markdown body
- Supports persona, examples, instructions

**Continue (JSON)**
- JSON configuration
- Simple prompts, context rules
- Limited metadata support

**Windsurf**
- Similar to Cursor
- Markdown-based
- Basic structure

### Conversion Quality Scoring (0-100)

Start at 100 points, deduct for lossy conversions:
- Missing tools: -10 points
- Missing persona: -5 points
- Missing examples: -5 points
- Unsupported sections: -10 points each
- Format-specific features lost: -5 points

### Lossless vs Lossy Conversions
- **Canonical ↔ Claude**: Nearly lossless (95-100%)
- **Canonical ↔ Cursor**: Lossy on tools/persona (70-85%)
- **Canonical ↔ Continue**: Most lossy (60-75%)

## Collections System

Collections are curated bundles of packages that solve specific use cases.

### Collection Structure
```json
{
  "id": "@collection/nextjs-pro",
  "name": "Next.js Professional Setup",
  "description": "Complete Next.js development setup",
  "category": "frontend",
  "packages": [
    {
      "packageId": "react-best-practices",
      "required": true,
      "reason": "Core React patterns"
    },
    {
      "packageId": "typescript-strict",
      "required": true,
      "reason": "Type safety"
    },
    {
      "packageId": "tailwind-helper",
      "required": false,
      "reason": "Styling utilities"
    }
  ]
}
```

### Collection Best Practices
1. **Required vs Optional**: Clearly mark essential vs nice-to-have packages
2. **Reason Documentation**: Every package explains why it's included
3. **IDE-Specific Variants**: Different packages per editor when needed
4. **Installation Order**: Consider dependencies

## Quality & Ranking System

### Multi-Factor Scoring (0-100)

**Popularity** (0-30 points):
- Total downloads (weighted by recency)
- Stars/favorites
- Trending velocity

**Quality** (0-30 points):
- User ratings (1-5 stars)
- Review sentiment
- Documentation completeness

**Trust** (0-20 points):
- Verified author badge
- Original creator vs fork
- Publisher reputation
- Security scan results

**Recency** (0-10 points):
- Last updated date (<30 days = 10 points)
- Release frequency
- Active maintenance

**Completeness** (0-10 points):
- Has README
- Has examples
- Has tags
- Complete metadata

## Technical Stack

### CLI (TypeScript + Node.js)
- **Commander.js**: CLI framework
- **Fastify Client**: HTTP client for registry
- **Tar**: Package tarball creation/extraction
- **Chalk**: Terminal colors
- **Ora**: Spinners for async operations

### Registry (TypeScript + Fastify + PostgreSQL)
- **Fastify**: High-performance web framework
- **PostgreSQL**: Primary database with GIN indexes
- **Redis**: Caching layer for converted packages
- **GitHub OAuth**: Authentication provider
- **Docker**: Containerized deployment

### Testing
- **Vitest**: Unit and integration tests
- **100% Coverage Goal**: Especially for format converters
- **Round-Trip Tests**: Ensure conversion quality
- **Fixtures**: Real-world package examples

## Testing Standards

### Test Pyramid
- **70% Unit Tests**: Format converters, parsers, utilities
- **20% Integration Tests**: API routes, database operations, CLI commands
- **10% E2E Tests**: Full workflows (install, publish, search)

### Coverage Goals
- **Format Converters**: 100% coverage (critical path)
- **CLI Commands**: 90% coverage
- **API Routes**: 85% coverage
- **Utilities**: 90% coverage

### Key Testing Patterns
```typescript
// Format converter test
describe('toCursor', () => {
  it('preserves data in roundtrip', () => {
    const result = toCursor(canonical);
    const back = fromCursor(result.content);
    expect(back).toEqual(canonical);
  });
});

// CLI command test
describe('install', () => {
  it('downloads and installs package', async () => {
    await handleInstall('test-pkg', { as: 'cursor' });
    expect(fs.existsSync('.cursor/rules/test-pkg.md')).toBe(true);
  });
});
```

## Development Workflow

### When Adding Features
1. **Check Existing Patterns**: Look at similar commands/routes
2. **Update Types First**: TypeScript interfaces drive implementation
3. **Write Tests**: Create test fixtures and cases
4. **Document**: Update README and relevant docs
5. **Telemetry**: Add tracking for new commands (with privacy)

### When Fixing Bugs
1. **Write Failing Test**: Reproduce the bug in a test
2. **Fix Minimally**: Smallest change that fixes the issue
3. **Check Round-Trip**: Ensure conversions still work
4. **Update Fixtures**: Add bug case to test fixtures

### When Designing APIs
- **REST Best Practices**: Proper HTTP methods and status codes
- **Versioning**: All routes under `/api/v1/`
- **Pagination**: Limit/offset for list endpoints
- **Filtering**: Support query params for filtering
- **OpenAPI**: Document with Swagger/OpenAPI specs

## Security Standards

- **No Secrets in DB**: Never store GitHub tokens, use session IDs
- **SQL Injection**: Parameterized queries only
- **Rate Limiting**: Prevent abuse of registry API
- **Content Security**: Validate package contents before publishing

## Performance Considerations

- **Batch Operations**: Use Promise.all for independent operations
- **Database Indexes**: GIN for full-text, B-tree for lookups
- **Caching Strategy**: Cache converted packages, not raw data
- **Lazy Loading**: Don't load full package data until needed
- **Connection Pooling**: Reuse PostgreSQL connections

## Deployment

### AWS Infrastructure (Elastic Beanstalk)
- **Environment**: Node.js 20 on 64bit Amazon Linux 2023
- **Instance**: t3.micro (cost-optimized)
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **DNS**: Route 53
- **SSL**: ACM certificates

### GitHub Actions Workflows
- **Test & Deploy**: Runs on push to main
- **NPM Publish**: Manual trigger for releases
- **Homebrew Publish**: Updates tap formula

### Publishing PRPM to NPM

**Publishable Packages:**
- `prpm` - CLI (public)
- `@prpm/registry-client` - HTTP client (public)
- Registry and Infra are private (deployed, not published)

**Process:**
1. Go to Actions → NPM Publish
2. Select version bump (patch/minor/major)
3. Choose packages (all or specific)
4. Run workflow

**Homebrew Formula:**
- Formula repository: `khaliqgant/homebrew-prpm`
- Auto-updates on NPM publish
- Requires `HOMEBREW_TAP_TOKEN` secret

**Version Bumping:**
```bash
# CLI and client together
npm version patch --workspace=prpm --workspace=@prpm/registry-client

# Individual package
npm version minor --workspace=prpm
```

## Common Patterns

### CLI Command Structure
```typescript
export async function handleCommand(args: Args, options: Options) {
  const startTime = Date.now();
  try {
    const config = await loadUserConfig();
    const client = getRegistryClient(config);
    const result = await client.fetchData();
    console.log('✅ Success');
    await telemetry.track({ command: 'name', success: true });
  } catch (error) {
    console.error('❌ Failed:', error.message);
    await telemetry.track({ command: 'name', success: false });
    process.exit(1);
  }
}
```

### Registry Route Structure
```typescript
server.get('/:id', {
  schema: { /* OpenAPI schema */ },
}, async (request, reply) => {
  const { id } = request.params;
  if (!id) return reply.code(400).send({ error: 'Missing ID' });
  const result = await server.pg.query('SELECT...');
  return result.rows[0];
});
```

### Format Converter Structure
```typescript
export function toFormat(pkg: CanonicalPackage): ConversionResult {
  const warnings: string[] = [];
  let qualityScore = 100;
  const content = convertSections(pkg.content.sections, warnings);
  const lossyConversion = warnings.some(w => w.includes('not supported'));
  if (lossyConversion) qualityScore -= 10;
  return { content, format: 'target', warnings, qualityScore, lossyConversion };
}
```

## Naming Conventions

- **Files**: kebab-case (`registry-client.ts`, `to-cursor.ts`)
- **Types**: PascalCase (`CanonicalPackage`, `ConversionResult`)
- **Functions**: camelCase (`getPackage`, `convertToFormat`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_REGISTRY_URL`)
- **Database**: snake_case (`package_id`, `created_at`)
- **API Requests/Responses**: snake_case (`package_id`, `session_id`, `created_at`)
  - **Important**: All API request and response fields use snake_case to match PostgreSQL database conventions
  - Internal service methods may use camelCase, but must convert to snake_case at API boundaries
  - TypeScript interfaces for API types should use snake_case fields
  - Examples: `PlaygroundRunRequest.package_id`, `CreditBalance.reset_at`

## Documentation Standards

- **Inline Comments**: Explain WHY, not WHAT
- **JSDoc**: Required for public APIs
- **README**: Keep examples up-to-date
- **Markdown Docs**: Use code blocks with language tags
- **Changelog**: Follow Keep a Changelog format

## Reference Documentation

See supporting files in this skill directory for detailed information:
- `format-conversion.md` - Complete format conversion specs
- `package-types.md` - All package types with examples
- `collections.md` - Collections system and examples
- `quality-ranking.md` - Quality and ranking algorithms
- `testing-guide.md` - Testing patterns and standards
- `deployment.md` - Deployment procedures

Remember: PRPM is infrastructure. It must be rock-solid, fast, and trustworthy like npm or cargo.
