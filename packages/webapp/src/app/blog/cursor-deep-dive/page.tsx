import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "Cursor Rules: A Technical Deep Dive",
  description: "Explore Cursor's MDC format specification, PRPM's implementation, and best practices for creating effective Cursor rules.",
  openGraph: {
    title: "Cursor Rules: A Technical Deep Dive",
    description: "Deep dive into Cursor's MDC format and rule system for AI-first code editing.",
  },
}

export default function CursorDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['Cursor', 'Format', 'Deep Dive']}
          title="Cursor Rules: A Technical Deep Dive"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="12 min read"
        />

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              Cursor is one of the most popular AI-first code editors, and its `.cursor/rules/` system allows developers to customize AI behavior with project-specific guidelines. This deep dive explores Cursor's MDC format specification, PRPM's implementation approach, and best practices for creating effective rules.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Cursor's rules system uses <strong>MDC (Model Context)</strong> files - markdown with optional YAML frontmatter. This architectural choice makes Cursor rules contextual, flexible, and persistent, providing reusable context at the prompt level.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Format Specification</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">File Location</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Cursor rules live in <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.cursor/rules/</code>:
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 font-mono text-sm">
            <div className="text-gray-400 mb-2">.cursor/</div>
            <div className="text-gray-400 mb-2">└── rules/</div>
            <div className="text-gray-400 mb-2">    ├── creating-cursor-rules.mdc</div>
            <div className="text-gray-400 mb-2">    ├── typescript-standards.mdc</div>
            <div className="text-gray-400 mb-2">    ├── react-patterns.mdc</div>
            <div className="text-gray-400">    └── api-design.mdc</div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">MDC Frontmatter</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            According to the official Cursor documentation, the following frontmatter fields are supported:
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-prpm-border">
                  <th className="text-left py-2 pr-4">Field</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Default</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-prpm-border/50">
                  <td className="py-2 pr-4"><code className="bg-prpm-dark px-2 py-1 rounded">description</code></td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4">-</td>
                  <td className="py-2">Description of the rule's purpose</td>
                </tr>
                <tr className="border-b border-prpm-border/50">
                  <td className="py-2 pr-4"><code className="bg-prpm-dark px-2 py-1 rounded">globs</code></td>
                  <td className="py-2 pr-4">string[]</td>
                  <td className="py-2 pr-4">-</td>
                  <td className="py-2">File path patterns to match</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code className="bg-prpm-dark px-2 py-1 rounded">alwaysApply</code></td>
                  <td className="py-2 pr-4">boolean</td>
                  <td className="py-2 pr-4">false</td>
                  <td className="py-2">If true, always included in context</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">PRPM's Implementation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Since Cursor uses the same markdown format as Claude (MDC with YAML frontmatter), PRPM aliases <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">fromCursor</code> to <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">fromClaude</code>. This reduces code duplication while maintaining format-specific handling when needed.
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 font-mono text-sm">
            <div className="text-gray-500 mb-2">{'//'} from-cursor.ts</div>
            <div className="text-prpm-accent-light">export &#123; fromClaude as fromCursor &#125; from './from-claude.js';</div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Be Specific, Not Generic</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4">❌ <strong>Bad</strong>: Generic advice</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 mb-4 font-mono text-sm">
              <div className="text-gray-400">## Guidelines</div>
              <div className="text-gray-400">- Write clean code</div>
              <div className="text-gray-400">- Use best practices</div>
              <div className="text-gray-400">- Test thoroughly</div>
            </div>

            <p className="text-gray-300 mb-4">✅ <strong>Good</strong>: Specific decisions</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 font-mono text-sm">
              <div className="text-gray-400">## State Management</div>
              <div className="text-gray-400">- Use Zustand for global state</div>
              <div className="text-gray-400">- Use React Context for component tree state</div>
              <div className="text-gray-400">- Never use Redux (team decision)</div>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Include Rationale and Examples</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Rules with rationale and concrete examples help AI understand not just what to do, but why. This leads to better code generation that aligns with your project's goals.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Cross-Format Conversion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            PRPM enables seamless conversion between Cursor and other formats. When converting from Claude to Cursor, the frontmatter format is adjusted while preserving all content. When converting from Kiro to Cursor, file patterns are mapped to globs for conditional application.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Conclusion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Cursor's MDC format strikes a balance between structure (YAML frontmatter) and flexibility (Markdown body). PRPM's implementation fully supports Cursor's features including MDC frontmatter generation, glob pattern support, quality scoring for conversions, and comprehensive section mapping.
          </p>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to explore more formats?</h3>
            <p className="text-gray-300 mb-6">
              Check out our deep dives on other AI coding tool formats
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog/claude-deep-dive"
                className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all"
              >
                Claude Deep Dive
              </Link>
              <Link
                href="/blog"
                className="px-6 py-3 bg-prpm-dark-card border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all"
              >
                View All Posts
              </Link>
            </div>
          </div>
        </div>

        <BlogFooter postTitle="Cursor Rules: A Technical Deep Dive" postUrl="/blog/cursor-deep-dive" />
      </article>
    </main>
  )
}
