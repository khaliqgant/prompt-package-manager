import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "agents.md: The Complete Guide to the Open Standard for AI Coding Agents",
  description: "Comprehensive guide to agents.md: what to include, real-world examples, format comparisons, migration guides, PRPM integration, and why it matters for the future of AI coding tools.",
  openGraph: {
    title: "agents.md: The Complete Guide",
    description: "Everything you need to know about agents.md - the open standard for AI coding tools supported by OpenAI Codex, GitHub Copilot, and Google Gemini.",
  },
}

export default function AgentsMdDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['agents.md', 'OpenAI', 'Complete Guide']}
          title="agents.md: The Complete Guide to the Open Standard"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="25 min read"
        />

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              In a fragmented ecosystem where every AI coding tool uses its own configuration format, agents.md emerges as a refreshing attempt at standardization. Created through collaboration between OpenAI, Google, and other major players, agents.md is an open, simple, and tool-agnostic format for providing project-specific guidance.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">The Simplicity Philosophy</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            agents.md's design philosophy is <strong>radical simplicity</strong>: single file, plain markdown, optional metadata, human-first, and tool-agnostic. No directory structure, no special syntax, no custom extensions - just markdown.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Why This Matters</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            The AI coding tool landscape is fragmented with Cursor using <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.cursor/rules/</code>, GitHub Copilot using <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.github/copilot-instructions.md</code>, Claude using <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.claude/skills/</code>, and more. agents.md provides a neutral, open standard that all these tools can support.
          </p>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-blue-400 mb-3">🤖 Compatible Tools</h4>
            <p className="text-gray-300 mb-4">
              The agents.md format is supported by multiple AI coding tools:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-blue-400">✓</span>
                <div>
                  <strong className="text-white">OpenAI Codex</strong> - The foundational model that powers many AI coding tools
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">✓</span>
                <div>
                  <strong className="text-white">GitHub Copilot</strong> - Reads agents.md in addition to .github/copilot-instructions.md
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">✓</span>
                <div>
                  <strong className="text-white">Google Gemini Code Assist</strong> - Committed to supporting the open standard
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">✓</span>
                <div>
                  <strong className="text-white">Any future tool</strong> - That adopts the open standard
                </div>
              </li>
            </ul>
            <p className="text-sm text-gray-400 mt-4 italic">
              This is why agents.md is the recommended format for teams using multiple AI tools or wanting to avoid vendor lock-in.
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-green-400 mb-3">📁 OpenAI Codex: Hierarchical AGENTS.md</h4>
            <p className="text-gray-300 mb-4">
              OpenAI Codex extends the standard with a hierarchical file system:
            </p>
            <ul className="space-y-2 text-gray-300 mb-4">
              <li className="flex items-start gap-3">
                <span className="text-green-400">1.</span>
                <div>
                  <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">~/.codex/AGENTS.md</code> - Global guidance (loaded for all projects)
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400">2.</span>
                <div>
                  <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> - Standard behavior (merges with parent directories)
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400">3.</span>
                <div>
                  <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.override.md</code> - Codex extension (replaces parent instructions)
                </div>
              </li>
            </ul>
            <p className="text-sm text-gray-400 italic">
              The override variant is useful for monorepos where subdirectories need completely different conventions. This is a Codex-specific extension, not part of the base agents.md specification.
            </p>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4"><strong>Key insight:</strong> The format's power is in what it doesn't require:</p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">•</span>
                <span>No frontmatter (unless you want it)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">•</span>
                <span>No specific sections (organize however makes sense)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">•</span>
                <span>No special syntax (just markdown)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">•</span>
                <span>No tool-specific features (works everywhere)</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">PRPM's Implementation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            PRPM treats agents.md as a flexible, unstructured format. The implementation includes optional frontmatter handling, auto-description extraction from first paragraph, flexible section parsing, auto-tag inference, and graceful fallbacks.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Design Decisions</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">1.</span>
                <span><strong>Optional Frontmatter:</strong> Respects simplicity - frontmatter is entirely optional</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">2.</span>
                <span><strong>Auto-Description Extraction:</strong> Extracts from first paragraph if not provided</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">3.</span>
                <span><strong>Section Type Inference:</strong> Infers semantic types from content structure</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">4.</span>
                <span><strong>Auto-Tag Inference:</strong> Automatically detects technology tags from content</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">What Goes in AGENTS.md?</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            The beauty of agents.md is its flexibility - there are <strong>no required fields</strong>. However, the specification recommends several sections that help AI agents understand your project:
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-3">Recommended Sections</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">1.</span>
                <span><strong>Project Overview</strong> - What the project does and its purpose</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">2.</span>
                <span><strong>Development Environment</strong> - Setup instructions and dependencies</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">3.</span>
                <span><strong>Build & Test Commands</strong> - Specific commands to build and test</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">4.</span>
                <span><strong>Code Style Guidelines</strong> - Conventions the AI should follow</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">5.</span>
                <span><strong>Testing Instructions</strong> - How to write and run tests</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">6.</span>
                <span><strong>Contribution Guidelines</strong> - How to contribute code</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">7.</span>
                <span><strong>Security Considerations</strong> - Security practices and concerns</span>
              </li>
            </ul>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Real-World Example</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            Here's a practical example of an AGENTS.md file for a TypeScript web application:
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
{`# Project: TaskManager Web App

## Overview
This is a TypeScript-based task management application using React,
Next.js 14 (App Router), and PostgreSQL. The app allows teams to
create, assign, and track tasks with real-time updates.

## Tech Stack
- **Frontend**: React 18, Next.js 14, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **Testing**: Vitest, React Testing Library
- **Type Safety**: TypeScript strict mode

## Development Setup
\`\`\`bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
\`\`\`

## Code Style Guidelines
- Use TypeScript strict mode for all files
- Prefer functional components with React hooks
- Use async/await over promise chains
- Follow the existing ESLint configuration
- Use Prettier for formatting (runs on pre-commit)
- Name files using kebab-case: \`user-profile.tsx\`
- Use named exports over default exports

## Component Structure
- Place components in \`src/components/\`
- Co-locate component tests: \`button.tsx\` + \`button.test.tsx\`
- Extract shared utilities to \`src/lib/\`
- Keep server components by default; mark client components explicitly

## Testing Requirements
- Write unit tests for all utility functions
- Write integration tests for API routes
- Write component tests for interactive UI
- Maintain >80% code coverage
- Run tests before committing: \`npm test\`

## Database Changes
- Never modify migrations directly
- Create new migrations: \`npm run db:migrate:create\`
- Test migrations on dev database first
- Include rollback instructions in migration comments

## Security Practices
- Never commit API keys or secrets
- Use environment variables for all sensitive data
- Validate all user inputs on both client and server
- Sanitize data before database queries (Prisma handles this)
- Use HTTPS in production
- Implement rate limiting on public API endpoints

## Build Commands
- **Development**: \`npm run dev\` (port 3111)
- **Production Build**: \`npm run build\`
- **Type Check**: \`npm run type-check\`
- **Lint**: \`npm run lint\`
- **Test**: \`npm test\`
- **Test Coverage**: \`npm run test:coverage\`

## Common Tasks
- **Add new page**: Create file in \`src/app/[route]/page.tsx\`
- **Add API endpoint**: Create file in \`src/app/api/[route]/route.ts\`
- **Add database table**: Modify \`prisma/schema.prisma\`, run \`npm run db:migrate:create\`
- **Add environment variable**: Add to \`.env.example\` and update \`src/env.ts\`
`}
            </pre>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Template Examples by Project Type</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            Different projects need different guidance. Here are starter templates:
          </p>

          <div className="grid gap-4 mb-6">
            <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
              <h4 className="text-lg font-bold text-prpm-accent mb-2">🗄️ Backend API Project</h4>
              <p className="text-sm text-gray-400 mb-3">Focus on API design, database patterns, authentication, error handling</p>
              <code className="text-xs text-gray-300">Sections: API Routes, Database Schema, Auth Flow, Error Handling, Rate Limiting</code>
            </div>

            <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
              <h4 className="text-lg font-bold text-prpm-accent mb-2">⚛️ React Frontend Project</h4>
              <p className="text-sm text-gray-400 mb-3">Focus on component patterns, state management, routing, styling</p>
              <code className="text-xs text-gray-300">Sections: Component Structure, State Management, Routing, Styling, Testing Components</code>
            </div>

            <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
              <h4 className="text-lg font-bold text-prpm-accent mb-2">📦 Library/Package Project</h4>
              <p className="text-sm text-gray-400 mb-3">Focus on API design, versioning, exports, documentation</p>
              <code className="text-xs text-gray-300">Sections: Public API, Breaking Changes, Build Process, Publishing, Examples</code>
            </div>

            <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
              <h4 className="text-lg font-bold text-prpm-accent mb-2">🐍 Python Data Science Project</h4>
              <p className="text-sm text-gray-400 mb-3">Focus on notebook patterns, data pipeline, model training, reproducibility</p>
              <code className="text-xs text-gray-300">Sections: Data Pipeline, Model Training, Notebook Conventions, Dependencies, Reproducibility</code>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">1. Be Specific and Actionable</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Don't write vague guidelines like "Write clean code." Instead, be concrete: "Use async/await over promise chains" or "Prefer functional components with hooks."
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h4 className="text-lg font-bold text-red-400 mb-3">❌ Too Vague</h4>
              <code className="text-sm text-gray-300">"Write good tests"</code>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <h4 className="text-lg font-bold text-green-400 mb-3">✅ Specific</h4>
              <code className="text-sm text-gray-300">"Write unit tests for all utility functions. Maintain {'>'}80% coverage. Use Vitest."</code>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">2. Complement README, Don't Duplicate</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            README.md is for humans (project description, features, installation). AGENTS.md is for AI agents (how to write code, coding patterns, technical constraints).
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">3. Update Regularly</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Keep AGENTS.md in sync with your codebase. When you change conventions, update the file. Outdated guidance leads to inconsistent AI-generated code.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">4. Organize by Concern</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Group related guidelines together (Code Style, Testing Strategy, Error Handling, Security) rather than mixing unrelated concerns. This helps AI agents find relevant guidance quickly.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Using agents.md with PRPM</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            PRPM (Prompt Package Manager) makes it easy to discover, install, and share agents.md packages. With <strong>1,700+ packages</strong> across multiple formats, PRPM is the largest cross-platform repository for AI coding guidance.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Installing agents.md Packages</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
{`# Install an agents.md package directly
prpm install typescript-best-practices

# Search for agents.md packages
prpm search --format agents.md

# Search by subtype
prpm search --format agents.md --subtype agent
prpm search --format agents.md --subtype tool

# Install and convert to another format
prpm install typescript-best-practices --as cursor
prpm install typescript-best-practices --as copilot`}
            </pre>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Publishing Your Own agents.md Package</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
{`# Initialize a new package
prpm init

# Select "agents.md" as format
# Choose subtype: agent or tool

# Publish to PRPM registry
prpm publish

# Your package is now discoverable by 1,700+ users!`}
            </pre>
          </div>

          <div className="bg-prpm-accent/10 border border-prpm-accent/30 rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-prpm-accent mb-3">🎯 Why Publish to PRPM?</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">•</span>
                <span><strong>Reach multiple tools:</strong> Your package works with Codex, Copilot, Gemini, and any future tool supporting agents.md</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">•</span>
                <span><strong>Cross-format conversion:</strong> Users can install as Cursor, Claude, or any other format</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">•</span>
                <span><strong>Discoverability:</strong> Listed in search results alongside 1,700+ other packages</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">•</span>
                <span><strong>Version management:</strong> Semantic versioning with automatic updates</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Format Comparison</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            How does agents.md compare to other AI coding tool formats?
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse bg-prpm-dark-card border border-prpm-border rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-prpm-dark">
                  <th className="px-4 py-3 text-left text-white font-bold border-b border-prpm-border">Format</th>
                  <th className="px-4 py-3 text-left text-white font-bold border-b border-prpm-border">File Location</th>
                  <th className="px-4 py-3 text-left text-white font-bold border-b border-prpm-border">Structure</th>
                  <th className="px-4 py-3 text-left text-white font-bold border-b border-prpm-border">Cross-Tool</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-prpm-border">
                  <td className="px-4 py-3 font-semibold text-prpm-accent">agents.md</td>
                  <td className="px-4 py-3"><code className="text-xs">AGENTS.md</code></td>
                  <td className="px-4 py-3">Flexible markdown</td>
                  <td className="px-4 py-3 text-green-400">✅ Yes</td>
                </tr>
                <tr className="border-b border-prpm-border">
                  <td className="px-4 py-3 font-semibold">Cursor</td>
                  <td className="px-4 py-3"><code className="text-xs">.cursor/rules/</code></td>
                  <td className="px-4 py-3">Plain text rules</td>
                  <td className="px-4 py-3 text-red-400">❌ Cursor only</td>
                </tr>
                <tr className="border-b border-prpm-border">
                  <td className="px-4 py-3 font-semibold">GitHub Copilot</td>
                  <td className="px-4 py-3"><code className="text-xs">.github/copilot-instructions.md</code></td>
                  <td className="px-4 py-3">Markdown with frontmatter</td>
                  <td className="px-4 py-3 text-yellow-400">⚠️ Partial (also reads agents.md)</td>
                </tr>
                <tr className="border-b border-prpm-border">
                  <td className="px-4 py-3 font-semibold">Claude</td>
                  <td className="px-4 py-3"><code className="text-xs">.claude/skills/*.md</code></td>
                  <td className="px-4 py-3">Directory of skills</td>
                  <td className="px-4 py-3 text-red-400">❌ Claude only</td>
                </tr>
                <tr className="border-b border-prpm-border">
                  <td className="px-4 py-3 font-semibold">Continue</td>
                  <td className="px-4 py-3"><code className="text-xs">.continue/rules/*.md</code></td>
                  <td className="px-4 py-3">Directory of rules</td>
                  <td className="px-4 py-3 text-red-400">❌ Continue only</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold">Windsurf</td>
                  <td className="px-4 py-3"><code className="text-xs">.windsurf/rules/</code></td>
                  <td className="px-4 py-3">Directory of rules</td>
                  <td className="px-4 py-3 text-red-400">❌ Windsurf only</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-blue-400 mb-3">💡 Key Insight</h4>
            <p className="text-gray-300">
              agents.md is the only format designed to work across multiple tools. While tool-specific formats optimize for their respective ecosystems, agents.md prioritizes portability and standardization. This makes it ideal for:
            </p>
            <ul className="mt-3 space-y-2 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <span>Teams using multiple AI coding tools</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <span>Open source projects with diverse contributors</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <span>Organizations avoiding vendor lock-in</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400">•</span>
                <span>Package authors wanting maximum reach</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Migrating to agents.md</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Already using another format? Here's how to migrate to agents.md:
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">From Cursor (.cursor/rules/)</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4">Cursor rules are already plain text instructions, making migration straightforward:</p>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">1.</span>
                <span>Copy content from <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">.cursor/rules/</code> files</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">2.</span>
                <span>Create <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> and paste content</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">3.</span>
                <span>Add markdown structure: headings, lists, code blocks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">4.</span>
                <span>Organize into sections (Project Overview, Code Style, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">5.</span>
                <span>Keep <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">.cursor/rules/</code> if still using Cursor (both can coexist)</span>
              </li>
            </ol>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">From GitHub Copilot (.github/copilot-instructions.md)</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4">Copilot instructions are already markdown, so migration is easy:</p>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">1.</span>
                <span>Copy <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">.github/copilot-instructions.md</code> content</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">2.</span>
                <span>Remove YAML frontmatter (agents.md doesn't require it)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">3.</span>
                <span>Create <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> at project root with content</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">4.</span>
                <span>Keep Copilot file if still using Copilot (both can coexist)</span>
              </li>
            </ol>
            <p className="text-sm text-gray-400 mt-4 italic">
              Note: GitHub Copilot reads both <code className="bg-prpm-dark border border-prpm-border px-1 rounded text-xs">agents.md</code> and <code className="bg-prpm-dark border border-prpm-border px-1 rounded text-xs">.github/copilot-instructions.md</code>, so you can use either or both.
            </p>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">From Claude (.claude/skills/)</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4">Claude uses a directory of separate skill files:</p>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">1.</span>
                <span>Combine all skill files from <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">.claude/skills/</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">2.</span>
                <span>Create sections in <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> for each skill</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">3.</span>
                <span>Remove XML tags if present (use markdown instead)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent">4.</span>
                <span>Keep Claude skills if still using Claude</span>
              </li>
            </ol>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Automated Conversion with PRPM</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
{`# Convert Cursor to agents.md
prpm install my-cursor-package --as agents.md

# Convert Copilot to agents.md
prpm install my-copilot-package --as agents.md

# Convert Claude to agents.md
prpm install my-claude-package --as agents.md

# PRPM handles the conversion automatically!`}
            </pre>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">File Location and Precedence</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Understanding where to place AGENTS.md and how tools read it:
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-3">Standard Location (All Tools)</h4>
            <p className="text-gray-300 mb-3">
              Place <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> at your project root:
            </p>
            <pre className="text-sm text-gray-300 bg-prpm-dark p-3 rounded border border-prpm-border overflow-x-auto">
{`project-root/
├── AGENTS.md          ← Place here
├── src/
├── package.json
└── README.md`}
            </pre>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-3">OpenAI Codex: Hierarchical System</h4>
            <p className="text-gray-300 mb-3">
              Codex searches from current directory up to repository root, merging instructions:
            </p>
            <pre className="text-sm text-gray-300 bg-prpm-dark p-3 rounded border border-prpm-border overflow-x-auto">
{`~/.codex/
└── AGENTS.md          ← Global (always loaded)

project-root/
├── AGENTS.md          ← Project-level
└── src/
    └── components/
        └── AGENTS.md  ← Component-level (merged with parents)

# Override variant (Codex-specific):
project-root/
└── src/
    └── legacy/
        └── AGENTS.override.md  ← Replaces all parent instructions`}
            </pre>
            <p className="text-sm text-gray-400 mt-3 italic">
              Precedence (highest to lowest): <code className="bg-prpm-dark border border-prpm-border px-1 rounded text-xs">AGENTS.override.md</code> → Closest <code className="bg-prpm-dark border border-prpm-border px-1 rounded text-xs">AGENTS.md</code> → Parent directories → <code className="bg-prpm-dark border border-prpm-border px-1 rounded text-xs">~/.codex/AGENTS.md</code>
            </p>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-3">GitHub Copilot: Dual Support</h4>
            <p className="text-gray-300 mb-3">
              Copilot reads both agents.md and its own format:
            </p>
            <pre className="text-sm text-gray-300 bg-prpm-dark p-3 rounded border border-prpm-border overflow-x-auto">
{`project-root/
├── AGENTS.md                         ← Read by Copilot
├── .github/
│   └── copilot-instructions.md       ← Also read by Copilot
└── README.md`}
            </pre>
            <p className="text-sm text-gray-400 mt-3 italic">
              Both files are read and merged. If there are conflicts, Copilot-specific instructions typically take precedence.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Why agents.md Matters</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            The AI coding tool landscape is fragmented today, but agents.md points toward a future where developers write guidance once (not 6 times), AI tools compete on features (not lock-in), open standards win over proprietary formats, and the community shares patterns freely.
          </p>

          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">The Vision: Universal AI Guidance</h3>
            <p className="text-gray-300 text-center leading-relaxed max-w-3xl mx-auto">
              Imagine a world where you write <strong>one AGENTS.md file</strong> that works with every AI coding tool. Where you can switch tools without rewriting guidance. Where open source projects use a neutral format that welcomes all contributors. That's the promise of agents.md — and with PRPM's 1,700+ cross-platform packages, we're building that future today.
            </p>
          </div>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Explore More Formats</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/continue-deep-dive" className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all">
                Continue Deep Dive
              </Link>
              <Link href="/blog" className="px-6 py-3 bg-prpm-dark-card border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all">
                View All Posts
              </Link>
            </div>
          </div>
        </div>

        <BlogFooter postTitle="agents.md: The Complete Guide to the Open Standard for AI Coding Agents" postUrl="/blog/agents-md-deep-dive" />
      </article>
    </main>
  )
}
