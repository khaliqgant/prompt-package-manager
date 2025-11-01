import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "Windsurf Rules: A Technical Deep Dive",
  description: "Explore Windsurf's radically simple single-file markdown approach, PRPM's implementation, and best practices for maximum impact with minimum syntax.",
  openGraph: {
    title: "Windsurf Rules: A Technical Deep Dive",
    description: "Deep dive into Windsurf's minimalist approach to AI code editor configuration.",
  },
}

export default function WindsurfDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['Windsurf', 'Simplicity', 'Deep Dive']}
          title="Windsurf Rules: A Technical Deep Dive"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="9 min read"
        />

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              Windsurf is an AI-first code editor that takes a radically simple approach to configuration: a single <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.windsurf/rules</code> file containing plain markdown. No frontmatter, no special syntax, no configuration files - just markdown with a 12,000 character limit.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Windsurf's minimalist philosophy makes rules zero-configuration, git-friendly, universal, and approachable. The core principle: <strong>Maximum impact with minimum syntax</strong>.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Format Specification</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Windsurf uses a hierarchical rules system with files named <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.windsurf/rules</code> that can be placed in:
          </p>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span>Current workspace directory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span>Workspace sub-directories</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span>Parent directories up to the git root (for git repositories)</span>
              </li>
            </ul>
          </div>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 font-mono text-sm">
            <div className="text-gray-400 mb-2">your-project/</div>
            <div className="text-gray-400 mb-2">├── .windsurf/</div>
            <div className="text-gray-400 mb-2">│   └── rules    ← Main configuration</div>
            <div className="text-gray-400 mb-2">├── src/</div>
            <div className="text-gray-400 mb-2">│   └── .windsurf/</div>
            <div className="text-gray-400 mb-2">│       └── rules    ← Optional: sub-directory rules</div>
            <div className="text-gray-400 mb-2">├── tests/</div>
            <div className="text-gray-400">└── package.json</div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">File Format</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Pure markdown without frontmatter. No YAML frontmatter. No special directives. Just markdown with optional XML tags for grouping.
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h4 className="text-lg font-bold text-white mb-3">Format Guidelines</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span><strong>12,000 character limit</strong> per rules file</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span>Keep rules <strong>simple, concise, and specific</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span>Use bullet points, numbered lists, and markdown formatting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-prpm-accent mt-1">•</span>
                <span>Optional XML tags can help group similar rules</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Simplicity as Design</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Windsurf's minimalism is intentional design, not a limitation.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Advantages of Simplicity</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">1.</span>
                <span><strong>Zero Learning Curve:</strong> Just write markdown. That's it.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">2.</span>
                <span><strong>No Configuration Overhead:</strong> No frontmatter fields, glob syntax, or inclusion modes to learn</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">3.</span>
                <span><strong>Universal Compatibility:</strong> Renders perfectly on GitHub, works in any markdown editor</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">4.</span>
                <span><strong>Git-Friendly:</strong> Simple, clear diffs with no frontmatter noise</span>
              </li>
            </ul>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Trade-offs of Simplicity</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span><strong>No Conditional Application:</strong> All rules apply to entire project, always</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span><strong>No Metadata:</strong> No author, version, tags storage</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span><strong>No Format-Specific Features:</strong> Pure markdown content only</span>
              </li>
            </ul>
            <p className="text-gray-300 mt-4">Mitigation: Use section headers to organize by context, store metadata externally (e.g., in prpm.json)</p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">PRPM's Implementation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Windsurf's simplicity means minimal parsing logic. PRPM preserves content as-is with a single instructions section containing the entire file content.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Use Clear Section Headers</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Organize by domain/concern rather than file type. Use sections like "Language & Type Safety", "Testing", "Code Quality" rather than a flat list of rules.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Include Context with Rules</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Provide rationale for rules. Use the pattern: rule followed by indented <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">*Rationale: explanation*</code>.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Keep It Concise</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Write scannable points rather than novel-length rules. Aim for clarity and brevity.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Conclusion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Windsurf's single-file, plain-markdown approach represents simplicity as a feature. PRPM respects this simplicity with minimal parsing, lossless roundtrip for simple content, clear warnings when features are lost, and quality scoring that reflects conversion fidelity.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Resources</h2>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Official Windsurf Documentation</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://docs.windsurf.com/windsurf/cascade/memories#rules" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Windsurf Rules Documentation
                </a>
              </li>
              <li>
                <a href="https://windsurf.com/editor/directory" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Windsurf Editor Directory
                </a>
              </li>
              <li>
                <a href="https://windsurf.com" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Windsurf Official Website
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">PRPM Documentation</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/docs/WINDSURF.md" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  PRPM Windsurf Guide
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
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/packages/registry/src/converters/from-windsurf.ts" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  from-windsurf.ts Converter
                </a>
              </li>
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/packages/registry/src/converters/to-windsurf.ts" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  to-windsurf.ts Converter
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">One More Format to Explore</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/kiro-deep-dive" className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all">
                Kiro Deep Dive
              </Link>
              <Link href="/blog" className="px-6 py-3 bg-prpm-dark-card border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all">
                View All Posts
              </Link>
            </div>
          </div>
        </div>

        <BlogFooter postTitle="Windsurf Rules: A Technical Deep Dive" postUrl="/blog/windsurf-deep-dive" />
      </article>
    </main>
  )
}
