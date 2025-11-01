import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "GitHub Copilot Instructions: A Deep Dive into PRPM's Implementation",
  description: "Explore GitHub Copilot's two-tier instruction system, PRPM's technical implementation, and best practices for repository-wide and path-specific instructions.",
  openGraph: {
    title: "GitHub Copilot Instructions: A Deep Dive",
    description: "Deep dive into GitHub Copilot's instruction format and PRPM's implementation.",
  },
}

export default function CopilotDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['GitHub Copilot', 'Instructions', 'Deep Dive']}
          title="GitHub Copilot Instructions: A Deep Dive"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="14 min read"
        />

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              GitHub Copilot's instruction system represents a pragmatic approach to contextual AI assistance: provide global guidance for the entire repository while allowing fine-grained control for specific code paths. Unlike other formats that emphasize single-file simplicity or multi-file organization by domain, Copilot's design reflects its IDE-integrated nature and focus on code completion at scale.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Format Specification</h2>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
            <h4 className="text-lg font-bold text-blue-400 mb-3">💡 Additional Format Support (GitHub Copilot)</h4>
            <p className="text-gray-300 mb-4">
              GitHub Copilot also supports alternative instruction file formats:
            </p>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <div>
                  <strong className="text-white">AGENTS.md:</strong> You can create one or more <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> files stored anywhere within the repository. When Copilot is working, the nearest <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">AGENTS.md</code> file in the directory tree will take precedence. See the{' '}
                  <a href="https://github.com/openai/agents.md" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                    openai/agents.md repository
                  </a>{' '}
                  for more information.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <div>
                  <strong className="text-white">CLAUDE.md / GEMINI.md:</strong> Alternatively, you can use a single <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">CLAUDE.md</code> or <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">GEMINI.md</code> file stored in the root of the repository.
                </div>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-blue-500/20">
              <p className="text-sm text-gray-400 italic">
                <strong className="text-yellow-400">Note:</strong> PRPM currently supports conversion to/from <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">.github/copilot-instructions.md</code> and <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">.github/instructions/*.instructions.md</code> formats. Support for AGENTS.md, CLAUDE.md, and GEMINI.md as Copilot-compatible formats is planned for a future release. AGENTS.md is currently supported as a separate format.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Repository-Wide Instructions</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-2"><strong>Location:</strong> <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.github/copilot-instructions.md</code></p>
            <p className="text-gray-300 mb-2"><strong>Purpose:</strong> Provide global context that applies to all code in the repository</p>
            <p className="text-gray-300 mb-2"><strong>Structure:</strong> Plain markdown, no frontmatter required</p>
          </div>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-4 mb-6 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-300">{`# Project Guidelines

This is a TypeScript monorepo using pnpm workspaces.

## Code Style

- Use functional components with TypeScript
- Prefer named exports over default exports
- Keep functions pure when possible
- Extract custom hooks for reusable logic

## Testing

- Write tests using Vitest
- Co-locate tests with source files
- Use descriptive test names that explain behavior`}</pre>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Path-Specific Instructions</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-2"><strong>Location:</strong> <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.github/instructions/*.instructions.md</code></p>
            <p className="text-gray-300 mb-2"><strong>Purpose:</strong> Provide targeted guidance for specific file patterns (e.g., API routes, React components, database migrations)</p>
            <p className="text-gray-300 mb-2"><strong>Structure:</strong> Markdown with optional YAML frontmatter containing <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">applyTo</code> field</p>
          </div>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-4 mb-6">
            <table className="w-full text-left text-gray-300">
              <thead className="border-b border-prpm-border">
                <tr>
                  <th className="p-2">Field</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Required</th>
                  <th className="p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-prpm-border/50">
                  <td className="p-2"><code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-xs">applyTo</code></td>
                  <td className="p-2">string[]</td>
                  <td className="p-2">No</td>
                  <td className="p-2">Glob patterns specifying which files this instruction applies to</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Two-Tier Instruction System</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            GitHub Copilot's design reflects a key insight: not all guidance applies equally to all code. The two-tier system balances global consistency with contextual specificity.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Repository-Wide Layer</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            The <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.github/copilot-instructions.md</code> file provides tech stack declaration, coding standards, project philosophy, and general patterns.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Path-Specific Layer</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            The <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.github/instructions/*.instructions.md</code> files provide contextual patterns, domain rules, file-type conventions, and technology-specific guidance.
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-2"><strong>The applyTo Field:</strong></p>
            <p className="text-gray-300 mb-4">Uses glob patterns to specify which files an instruction applies to:</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 font-mono text-sm">
              <div className="text-gray-400">---</div>
              <div className="text-gray-400">applyTo:</div>
              <div className="text-gray-400">  - "src/api/**/*.ts"</div>
              <div className="text-gray-400">  - "packages/*/src/api/**/*.ts"</div>
              <div className="text-gray-400">---</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">PRPM's Implementation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            PRPM's implementation handles both repository-wide and path-specific instructions with optional frontmatter parsing, applyTo storage, auto-tagging, and single instructions section for maximum fidelity.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Key Design Decisions</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">1.</span>
                <span><strong>Optional Frontmatter:</strong> Repository-wide instructions don't need frontmatter (they apply everywhere)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">2.</span>
                <span><strong>applyTo as Array:</strong> Allows one instruction file to cover multiple patterns</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">3.</span>
                <span><strong>Single Instructions Section:</strong> Preserves perfect fidelity (lossless conversion)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">4.</span>
                <span><strong>Automatic Tagging:</strong> Auto-adds "repository-wide" or "path-specific" tags</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Repository-Wide Instructions</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Provide high-level, project-wide guidance like tech stack, coding standards, and testing approach. Avoid file-type-specific patterns (those belong in path-specific instructions).
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Path-Specific Instructions</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Target specific file patterns with contextual guidance. Use specific patterns that match your project structure, not overly broad patterns.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Conclusion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            GitHub Copilot's two-tier system (repository-wide + path-specific) balances simplicity with flexibility. PRPM's implementation focuses on fidelity, flexibility, and interoperability with seamless conversion to/from other formats.
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Key Takeaways</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span><strong>Optional frontmatter</strong> reduces friction for repository-wide instructions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span><strong>applyTo glob patterns</strong> enable precise targeting without duplication</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span><strong>Single Instructions section</strong> preserves perfect fidelity (lossless conversion)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span><strong>Automatic tagging</strong> ensures consistent metadata across packages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span><strong>Format conversion</strong> works seamlessly (Copilot ↔ Cursor ↔ Claude ↔ Kiro)</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Resources</h2>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Official GitHub Documentation</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Adding Custom Instructions for GitHub Copilot
                </a>
              </li>
              <li>
                <a href="https://docs.github.com/en/copilot/concepts/prompting/response-customization" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Response Customization - GitHub Copilot Concepts
                </a>
              </li>
              <li>
                <a href="https://docs.github.com/en/copilot" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  GitHub Copilot Documentation
                </a>
              </li>
              <li>
                <a href="https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-organization-instructions" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Adding Organization Custom Instructions for GitHub Copilot
                </a>
              </li>
              <li>
                <a href="https://docs.github.com/en/copilot/customizing-copilot/extending-the-capabilities-of-github-copilot-in-your-organization" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Extending the Capabilities of GitHub Copilot in Your Organization
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">PRPM Documentation</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/docs/GITHUB_COPILOT.md" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  PRPM GitHub Copilot Guide
                </a>
              </li>
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/docs/FORMAT_CONVERSION.md" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  PRPM Canonical Format Specification
                </a>
              </li>
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/docs/IMPORT_FORMAT_SPECS.md" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  PRPM Import Format Specifications
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Source Code</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/packages/registry/src/converters/from-copilot.ts" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  from-copilot.ts Converter
                </a>
              </li>
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/packages/registry/src/converters/to-copilot.ts" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  to-copilot.ts Converter
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Continue Exploring</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/agents-md-deep-dive" className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all">
                agents.md Deep Dive
              </Link>
              <Link href="/blog" className="px-6 py-3 bg-prpm-dark-card border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all">
                View All Posts
              </Link>
            </div>
          </div>
        </div>

        <BlogFooter postTitle="GitHub Copilot Instructions: A Deep Dive into PRPM's Implementation" postUrl="/blog/copilot-deep-dive" />
      </article>
    </main>
  )
}
