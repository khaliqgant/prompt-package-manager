import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "Kiro Steering Files: A Technical Deep Dive",
  description: "Explore Kiro's domain-organized steering files, inclusion modes, and the three foundational files that provide core project context.",
  openGraph: {
    title: "Kiro Steering Files: A Technical Deep Dive",
    description: "Deep dive into Kiro's modular, context-aware prompt engineering system.",
  },
}

export default function KiroDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['Kiro', 'Steering', 'Deep Dive']}
          title="Kiro Steering Files: A Technical Deep Dive"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="13 min read"
        />

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              Kiro is an AI coding assistant that takes a unique approach to prompt engineering: instead of a single monolithic configuration file, it uses domain-organized steering files. Each steering file focuses on a specific aspect of your codebase and can be activated based on context.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            This architectural decision makes Kiro's prompt system modular (concerns are separated into focused files), context-aware (rules apply only when relevant), scalable (easy to add new domains), and maintainable (changes are isolated).
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">The Three Foundational Files</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Kiro recognizes three special steering files that provide core project context:
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-3">1. product.md - Product Overview</h3>
            <p className="text-gray-300 mb-2">Defines your product's purpose, target users, key features, and business objectives. Helps Kiro understand the "why" behind technical decisions.</p>
            
            <h3 className="text-xl font-bold text-white mb-3 mt-6">2. tech.md - Technology Stack</h3>
            <p className="text-gray-300 mb-2">Documents frameworks, libraries, development tools, and technical constraints. When Kiro suggests implementations, it prefers your established stack.</p>
            
            <h3 className="text-xl font-bold text-white mb-3 mt-6">3. structure.md - Project Structure</h3>
            <p className="text-gray-300 mb-2">Outlines file organization, naming conventions, import patterns, and architectural decisions. Ensures generated code fits seamlessly into your codebase.</p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Inclusion Modes</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Kiro's inclusion modes determine when a steering file becomes active during AI interactions.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">1. Always Inclusion</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            <strong>Trigger:</strong> Active for all AI interactions<br/>
            <strong>Use case:</strong> Universal rules that should always apply
          </p>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-4 mb-6 font-mono text-sm">
            <div className="text-gray-400">---</div>
            <div className="text-gray-400">inclusion: always</div>
            <div className="text-gray-400">---</div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">2. File Match Inclusion</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            <strong>Trigger:</strong> Active when working with files matching the glob pattern<br/>
            <strong>Use case:</strong> Context-specific rules
          </p>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-4 mb-6 font-mono text-sm">
            <div className="text-gray-400">---</div>
            <div className="text-gray-400">inclusion: fileMatch</div>
            <div className="text-gray-400">fileMatchPattern: "**/*.test.ts"</div>
            <div className="text-gray-400">---</div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">3. Manual Inclusion</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            <strong>Trigger:</strong> Active only when explicitly requested by user<br/>
            <strong>Use case:</strong> On-demand checklists and specialized reviews
          </p>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-4 mb-6 font-mono text-sm">
            <div className="text-gray-400">---</div>
            <div className="text-gray-400">inclusion: manual</div>
            <div className="text-gray-400">---</div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">PRPM's Implementation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            PRPM's Kiro parser extracts frontmatter and content, validates required fields (inclusion is mandatory), detects foundational file types, and stores Kiro-specific configuration in metadata.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Key Design Decisions</h3>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">1.</span>
                <span><strong>Foundational Files:</strong> Keep as 'rule' subtype with specialized tags (kiro-product, kiro-tech, kiro-structure)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">2.</span>
                <span><strong>Frontmatter Validation:</strong> Strict on inclusion field, permissive on others</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">3.</span>
                <span><strong>Glob Pattern Storage:</strong> Store as string, document .gitignore syntax</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">4.</span>
                <span><strong>Quality Scoring:</strong> Deduct for unsupported features when converting to Kiro</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Organization by Domain</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Organize by domain/concern (product.md, tech.md, structure.md, testing.md, security.md, api-design.md) rather than by file type.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Use Specific File Patterns</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Use targeted patterns like <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">**/*.test.ts</code> instead of overly broad patterns like <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">**/*.ts</code>.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Include Rationale and Examples</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Provide rationale for rules and concrete code examples showing both good and bad patterns.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Conclusion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Kiro's steering file approach represents a paradigm shift in prompt engineering with modular concerns, context-aware rules, scalable organization, and maintainable structure. PRPM fully supports Kiro's unique features including frontmatter parsing, foundational file detection, cross-format conversion, and quality scoring.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Resources</h2>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Official Kiro Documentation</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://kiro.dev/docs/steering/" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Kiro Steering Documentation
                </a>
              </li>
              <li>
                <a href="https://kiro.dev" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  Kiro Official Website
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">PRPM Documentation</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/docs/KIRO.md" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  PRPM Kiro Guide
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
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/packages/registry/src/converters/from-kiro.ts" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  from-kiro.ts Converter
                </a>
              </li>
              <li>
                <a href="https://github.com/khaliqgant/prompt-package-manager/blob/main/packages/registry/src/converters/to-kiro.ts" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:text-prpm-accent-light underline">
                  to-kiro.ts Converter
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Explore All Format Deep Dives</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/cursor-deep-dive" className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all">
                Start with Cursor
              </Link>
              <Link href="/blog" className="px-6 py-3 bg-prpm-dark-card border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all">
                View All Posts
              </Link>
            </div>
          </div>
        </div>

        <BlogFooter postTitle="Kiro Steering Files: A Technical Deep Dive" postUrl="/blog/kiro-deep-dive" />
      </article>
    </main>
  )
}
