import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "Continue Dev Prompts: A Technical Deep Dive",
  description: "Explore Continue's slash command-based prompt system, template variables, and PRPM's implementation using format aliasing.",
  openGraph: {
    title: "Continue Dev Prompts: A Technical Deep Dive",
    description: "Deep dive into Continue's prompt format and composable context providers.",
  },
}

export default function ContinueDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['Continue', 'Prompts', 'Deep Dive']}
          title="Continue Dev Prompts: A Technical Deep Dive"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="10 min read"
        />

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              Continue is a VS Code extension that brings ChatGPT-style AI assistance directly into your editor. Unlike other AI coding tools, Continue emphasizes customizable prompts and context providers to give developers full control over AI interactions.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Continue's prompt system is slash command-based, context-aware, developer-friendly, and composable. The philosophy: give developers building blocks to create their own AI workflows.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Format Specification</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Continue prompts live in <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">.continue/prompts/</code> with one file per prompt. Filename becomes the slash command (e.g., <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">explain-code.md</code> → <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">/explain-code</code>).
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Template Variables</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Continue supports template variables for dynamic content:
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 font-mono text-sm">
            <div className="text-gray-400 mb-2">&#123;&#123;selectedCode&#125;&#125; - Currently selected code</div>
            <div className="text-gray-400 mb-2">&#123;&#123;currentFile&#125;&#125; - Full content of current file</div>
            <div className="text-gray-400 mb-2">&#123;&#123;currentFileName&#125;&#125; - Name of current file</div>
            <div className="text-gray-400 mb-2">&#123;&#123;currentFilePath&#125;&#125; - Path of current file</div>
            <div className="text-gray-400 mb-2">&#123;&#123;clipboardContent&#125;&#125; - Content from clipboard</div>
            <div className="text-gray-400">&#123;&#123;userInput&#125;&#125; - User's input after slash command</div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Prompts vs Context Providers</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            <strong>Prompts</strong> are pre-defined AI instructions invoked via slash commands (like <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">/explain-code</code>, <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">/write-tests</code>).
          </p>
          <p className="text-gray-300 leading-relaxed mb-6">
            <strong>Context Providers</strong> are dynamic data sources attached to prompts (like <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">@docs</code>, <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">@codebase</code>, <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">@git</code>).
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-2"><strong>Combining them:</strong></p>
            <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4 font-mono text-sm">
              <div className="text-gray-400">/explain-code @docs @codebase</div>
            </div>
            <p className="text-gray-300 mt-4">This runs the "explain-code" prompt with relevant documentation and similar code from the codebase.</p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">PRPM's Implementation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Since Continue uses the same markdown + YAML format as Claude, PRPM aliases the parsers to reduce duplication:
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6 font-mono text-sm">
            <div className="text-gray-500 mb-2">{'//'} from-continue.ts</div>
            <div className="text-prpm-accent-light">export &#123; fromClaude as fromContinue &#125; from './from-claude.js';</div>
            <div className="text-gray-500 mt-4 mb-2">{'//'} to-continue.ts</div>
            <div className="text-prpm-accent-light">export &#123; toClaude as toContinue &#125; from './to-claude.js';</div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Template Variable Preservation</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Template variables are preserved as plain text during conversion - no parsing or substitution. They survive roundtrip conversion perfectly.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Use Descriptive Slash Command Names</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-2">❌ Bad: Generic names</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 mb-4 font-mono text-sm text-gray-400">
              /explain, /help, /do
            </div>
            <p className="text-gray-300 mb-2">✅ Good: Specific, actionable names</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 font-mono text-sm text-gray-400">
              /explain-code, /generate-tests, /review-pr, /refactor-function
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Set Appropriate Temperature</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Match temperature to task: 0.0-0.3 for deterministic tasks (explanation, analysis), 0.4-0.6 for balanced tasks (refactoring), 0.7-1.0 for creative tasks (code generation, architecture design).
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Conclusion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Continue's prompt system represents a developer-first approach with slash commands, template variables, markdown format, and context providers. PRPM's implementation leverages format similarity through aliasing to the Claude parser with zero duplication.
          </p>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Continue Exploring</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/windsurf-deep-dive" className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all">
                Windsurf Deep Dive
              </Link>
              <Link href="/blog" className="px-6 py-3 bg-prpm-dark-card border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all">
                View All Posts
              </Link>
            </div>
          </div>
        </div>

        <BlogFooter postTitle="Continue Dev Prompts: A Technical Deep Dive" postUrl="/blog/continue-deep-dive" />
      </article>
    </main>
  )
}
