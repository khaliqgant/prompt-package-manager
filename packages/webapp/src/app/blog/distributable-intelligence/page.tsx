import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "PRPM: Distributable Intelligence for AI-Assisted Development",
  description: "Ship rules, skills, and agents that make breaking changes painless. PRPM is the package manager for AI coding assistants—making migrations and refactors correct by default.",
  openGraph: {
    title: "PRPM: Distributable Intelligence for AI-Assisted Development",
    description: "The missing piece between docs and codemods. Ship executable knowledge that AI can apply across entire codebases.",
  },
}

export default function DistributableIntelligencePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['Vision', 'Technical', 'AI Development']}
          title="PRPM: Distributable Intelligence for AI-Assisted Development"
          subtitle="Ship rules, skills, and agents that make breaking changes painless—install once, every AI assistant understands your patterns."
          author="PRPM Team"
          date="October 25, 2025"
          readTime="15 min read"
        />

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none
          prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
          prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:scroll-mt-20
          prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:scroll-mt-20
          prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
          prose-a:text-prpm-accent prose-a:no-underline prose-a:font-medium hover:prose-a:underline
          prose-code:text-prpm-accent prose-code:bg-prpm-dark-card/50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-[0.9em] prose-code:font-mono prose-code:border prose-code:border-prpm-border/30
          prose-pre:bg-prpm-dark-card prose-pre:border prose-pre:border-prpm-border prose-pre:rounded-xl prose-pre:p-6 prose-pre:my-8 prose-pre:overflow-x-auto
          prose-strong:text-white prose-strong:font-semibold
          prose-ul:my-6 prose-ul:space-y-2 prose-ul:text-gray-300
          prose-ol:my-6 prose-ol:space-y-2 prose-ol:text-gray-300
          prose-li:text-gray-300 prose-li:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-prpm-accent prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-400 prose-blockquote:my-8
          prose-table:border-collapse prose-table:w-full prose-table:my-8 prose-table:text-gray-300
          prose-thead:border-b-2 prose-thead:border-prpm-border
          prose-th:text-left prose-th:text-white prose-th:bg-prpm-dark-card prose-th:px-4 prose-th:py-3 prose-th:font-semibold prose-th:border prose-th:border-prpm-border
          prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-prpm-border
          prose-hr:border-prpm-border prose-hr:my-12
        ">
          {/* Intro */}
          <div className="not-prose bg-gradient-to-br from-prpm-dark-card to-prpm-dark-card/50 border border-prpm-border/50 rounded-2xl p-8 mb-12 shadow-lg">
            <p className="text-xl text-gray-300 leading-relaxed mb-0">
              <strong className="text-white font-semibold">In one line:</strong> PRPM is a package manager for AI coding assistants—ship rules, skills, and agents that make migrations and refactors correct by default.
            </p>
          </div>

          <div className="not-prose bg-gradient-to-r from-prpm-dark-card to-prpm-dark-card/50 border-l-4 border-prpm-accent rounded-r-2xl p-8 my-12">
            <h2 className="text-3xl font-bold text-white mb-6">In Two Minutes</h2>

            <p className="text-gray-300 leading-relaxed text-lg mb-0">
              Codemods automate the first 60–80% of migrations. Docs explain the rest. Developers still wrestle with edge cases, conventions, and tests. <strong className="text-white">PRPM closes the gap</strong> by letting maintainers publish executable knowledge:
            </p>
          </div>

          <ul>
            <li><strong>Rules</strong> - Declarative constraints AI enforces during code generation</li>
            <li><strong>Skills</strong> - Step-by-step procedures for specific tasks</li>
            <li><strong>Agents</strong> - Multi-file orchestration with edge case detection</li>
          </ul>

          <p>
            Developers <code>prpm install @vendor/migration-package</code>, their AI assistant loads it from <code>.claude/</code> or <code>.cursor/</code>, and performs context-aware changes across the repo, flags true edge cases, and generates tests that match your conventions.
          </p>

          <div className="not-prose bg-prpm-accent/10 border border-prpm-accent/30 rounded-xl p-6 my-8 shadow-sm">
            <p className="font-semibold text-white mb-3 text-lg">Outcome:</p>
            <p className="mb-0 text-gray-300 leading-relaxed">95% of migration work handled automatically vs 70% with scripts alone. Faster upgrades, consistent code, materially fewer support tickets.</p>
          </div>

          <p>
            <strong>Why now:</strong> AI can refactor entire codebases, but it lacks framework- and company-specific patterns. PRPM provides a universal format with converters for Cursor/Windsurf/Claude/Copilot, versioned distribution, and a registry for discovery and updates.
          </p>

          <p><strong>Who benefits:</strong></p>
          <ul>
            <li><strong>Framework authors</strong> - Smoother breaking changes, faster adoption</li>
            <li><strong>SaaS vendors</strong> - Deprecate old APIs sooner, fewer tickets</li>
            <li><strong>Enterprises</strong> - Codify standards once; every team's AI follows them</li>
            <li><strong>OSS maintainers</strong> - Contributors generate PRs in your <strong>house style</strong></li>
          </ul>

          <div className="not-prose bg-gradient-to-r from-prpm-dark-card to-prpm-dark-card/50 border-l-4 border-prpm-accent rounded-r-2xl p-8 my-12">
            <h2 className="text-3xl font-bold text-white mb-0">How It Works in 60 Seconds</h2>
          </div>

          <div className="not-prose mb-10">
            <h3 className="text-2xl font-bold text-white mb-4">1. Author</h3>
            <p className="text-gray-300 leading-relaxed mb-6">Create rules, skills, and agents as Markdown files with YAML frontmatter:</p>

            <pre className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 overflow-x-auto mb-6"><code className="text-sm text-gray-300 font-mono">{`$ prpm init
# Creates prpm.json + example files`}</code></pre>

            <div className="bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-6">
              <pre className="text-sm text-gray-400 mb-4"><code>{`---
format: cursor
subtype: rule
---`}</code></pre>

              <h4 className="text-lg font-bold text-white mb-3">Nango TypeScript Patterns</h4>

              <p className="text-sm text-gray-400 mb-4">
                Learn more at <a href="https://nango.dev" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-medium">Nango.dev</a>
              </p>

              <p className="text-sm text-gray-300 mb-2">When converting YAML integrations:</p>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start">
                  <span className="text-prpm-accent mr-2">•</span>
                  <span>YAML <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">sync</code> → TypeScript class extending <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">NangoSync</code></span>
                </li>
                <li className="flex items-start">
                  <span className="text-prpm-accent mr-2">•</span>
                  <span><code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">models</code> array → generic type <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">NangoSync&lt;Model&gt;</code></span>
                </li>
                <li className="flex items-start">
                  <span className="text-prpm-accent mr-2">•</span>
                  <span><code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">frequency</code> → <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">@Frequency</code> decorator</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="not-prose mb-10">
            <h3 className="text-2xl font-bold text-white mb-4">2. Publish</h3>
            <pre className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 overflow-x-auto"><code className="text-sm text-gray-300 font-mono">{`$ prpm publish
✓ Published @nango/yaml-to-ts-migration@1.0.0`}</code></pre>
          </div>

          <div className="not-prose mb-10">
            <h3 className="text-2xl font-bold text-white mb-4">3. Install & Apply</h3>
            <pre className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 overflow-x-auto"><code className="text-sm text-gray-300 font-mono">{`$ prpm install @nango/yaml-to-ts-migration-agent
✓ Installed to .cursor/rules/nango/yaml-to-ts-migration-agent

# In your AI assistant (Cursor/Claude/etc):
"Migrate all YAML integrations to TypeScript"

# AI (with package loaded):
✓ Migrated 12 integrations
✓ Generated tests
✓ Updated imports
⚠ 2 files require manual review (flagged)`}</code></pre>
          </div>

          <div className="not-prose bg-prpm-accent/5 border-l-4 border-prpm-accent rounded-r-xl p-6 my-8">
            <p className="text-xl font-semibold text-prpm-accent mb-0">Total time: 30 minutes vs 2-4 hours</p>
          </div>

          <h2>The Problem: Edge Cases Stall Migrations</h2>

          <h3>Traditional Approach</h3>
          <p>When frameworks ship breaking changes:</p>
          <ol>
            <li><strong>Migration script</strong> - Handles 60-80% (syntax-level transforms)</li>
            <li><strong>Documentation</strong> - Explains patterns and edge cases</li>
            <li><strong>Support channels</strong> - Field hundreds of questions</li>
            <li><strong>Months of lag</strong> - Adoption delayed by migration pain</li>
          </ol>

          <p><strong>Result:</strong> Slow adoption, fragmented ecosystem, support burden</p>

          <h3>Real Example: Nango's YAML → TypeScript Migration</h3>

          <p>When Nango migrated from YAML-based integrations to TypeScript, they provided:</p>

          <p>✅ <strong>Migration script:</strong> <code>nango migrate yaml-to-ts</code></p>
          <ul>
            <li>Converts basic YAML structure</li>
            <li>Handles ~70% of common cases</li>
          </ul>

          <p>✅ <strong>Documentation:</strong> Migration guide with examples</p>
          <ul>
            <li>API reference for new TypeScript classes</li>
            <li>Pattern explanations</li>
          </ul>

          <p>❌ <strong>Missing:</strong> Deep knowledge for AI to complete migration</p>
          <ul>
            <li>Which TypeScript patterns for each YAML feature</li>
            <li>How to handle pagination logic correctly</li>
            <li>Webhook migration with proper typing</li>
            <li>Test generation matching Nango conventions</li>
            <li>Edge case detection and reporting</li>
          </ul>

          <p><strong>Gap:</strong> Developers manually convert 30% of cases by reading docs, trial-and-error on type errors, hoping they match Nango's patterns.</p>

          <h3>The PRPM Solution</h3>

          <p>Nango ships <strong>the complete suite:</strong></p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Purpose</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Migration Script</strong></td>
                  <td>Syntax-level transforms</td>
                  <td>70%</td>
                </tr>
                <tr>
                  <td><strong>Documentation</strong></td>
                  <td>Human learning</td>
                  <td>Reference</td>
                </tr>
                <tr>
                  <td><strong>PRPM Packages</strong></td>
                  <td>AI-executable knowledge</td>
                  <td>+25%</td>
                </tr>
                <tr>
                  <td><strong>Developer Review</strong></td>
                  <td>True edge cases</td>
                  <td>5%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4 not-prose">
            <div className="bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white text-base">Migration Script</h4>
                <span className="text-prpm-accent font-semibold text-sm">70%</span>
              </div>
              <p className="text-gray-400 text-sm mb-0">Syntax-level transforms</p>
            </div>

            <div className="bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white text-base">Documentation</h4>
                <span className="text-gray-400 font-semibold text-sm">Reference</span>
              </div>
              <p className="text-gray-400 text-sm mb-0">Human learning</p>
            </div>

            <div className="bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white text-base">PRPM Packages</h4>
                <span className="text-prpm-accent font-semibold text-sm">+25%</span>
              </div>
              <p className="text-gray-400 text-sm mb-0">AI-executable knowledge</p>
            </div>

            <div className="bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white text-base">Developer Review</h4>
                <span className="text-prpm-accent font-semibold text-sm">5%</span>
              </div>
              <p className="text-gray-400 text-sm mb-0">True edge cases</p>
            </div>
          </div>

          <div className="not-prose bg-prpm-accent/5 border-l-4 border-prpm-accent rounded-r-xl p-6 my-8">
            <p className="text-xl font-semibold text-prpm-accent mb-0">Total: 95% automated vs 70% with scripts alone</p>
          </div>

          <h2>Package Types: Rules, Skills, Agents</h2>

          <h3>Rules</h3>
          <p><strong>Declarative constraints enforced during code generation</strong></p>

          <div className="not-prose bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-6 my-6 shadow-sm">
            <p className="text-sm text-gray-400 mb-4 font-medium">Example: Nango TypeScript Integration Rules</p>
            <ul className="text-sm text-gray-300 space-y-2.5">
              <li className="flex items-start">
                <span className="text-prpm-accent mr-2 mt-0.5">→</span>
                <span>Sync configs extend <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">NangoSync&lt;ModelType&gt;</code></span>
              </li>
              <li className="flex items-start">
                <span className="text-prpm-accent mr-2 mt-0.5">→</span>
                <span>Action configs extend <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">NangoAction&lt;InputType, OutputType&gt;</code></span>
              </li>
              <li className="flex items-start">
                <span className="text-prpm-accent mr-2 mt-0.5">→</span>
                <span>Use <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">@Frequency</code> decorator for sync schedules</span>
              </li>
              <li className="flex items-start">
                <span className="text-prpm-accent mr-2 mt-0.5">→</span>
                <span>Class names: PascalCase (e.g., SalesforceContacts)</span>
              </li>
              <li className="flex items-start">
                <span className="text-prpm-accent mr-2 mt-0.5">→</span>
                <span>File names: kebab-case (e.g., salesforce-contacts.integration.ts)</span>
              </li>
            </ul>
          </div>

          <p>When AI generates code, it automatically applies these patterns.</p>

          <h3>Skills</h3>
          <p><strong>Step-by-step procedures for specific tasks</strong></p>

          <div className="not-prose bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-6 my-6 shadow-sm">
            <p className="text-sm text-gray-400 mb-4 font-medium">Example: Migrate YAML Sync Configuration</p>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>Read the YAML sync configuration</li>
              <li>Extract: name, frequency, models, endpoints</li>
              <li>Create TypeScript class extending <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">NangoSync&lt;ModelType&gt;</code></li>
              <li>Add <code className="text-prpm-accent bg-prpm-dark-card px-1.5 py-0.5 rounded text-xs">@Frequency</code> decorator</li>
              <li>Preserve pagination logic</li>
              <li>Add error handling</li>
              <li>Generate tests</li>
            </ol>
          </div>

          <p>AI invokes skills for specific migration tasks.</p>

          <h3>Agents</h3>
          <p><strong>Multi-step orchestration with reporting</strong></p>

          <div className="not-prose bg-prpm-dark-card/50 border border-prpm-border/50 rounded-xl p-6 my-6 shadow-sm">
            <p className="text-sm text-gray-400 mb-3 font-medium">Example: Nango YAML to TypeScript Migration Agent</p>
            <p className="text-sm text-gray-300 mb-4 italic">I am a specialized agent for migrating Nango YAML integrations to TypeScript.</p>
            <p className="text-sm font-semibold text-white mb-3">My Process:</p>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li><strong className="text-white">Discovery</strong> - Scan codebase for YAML integration files</li>
              <li><strong className="text-white">Analysis</strong> - Parse each YAML, identify patterns and complexity</li>
              <li><strong className="text-white">Generation</strong> - Create TypeScript equivalents using rules and skills</li>
              <li><strong className="text-white">Integration</strong> - Update imports, dependencies, references</li>
              <li><strong className="text-white">Testing</strong> - Generate test files based on YAML patterns</li>
              <li><strong className="text-white">Reporting</strong> - Summary with edge cases flagged for review</li>
            </ol>
          </div>

          <p>AI runs agents for end-to-end migrations.</p>

          <h2>The Complete Stack</h2>

          <p><strong>Every technical company should ship:</strong></p>

          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Format</th>
                <th>For</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Documentation</strong></td>
                <td>Website, markdown</td>
                <td>Humans</td>
                <td>Concept learning</td>
              </tr>
              <tr>
                <td><strong>Migration Scripts</strong></td>
                <td>CLI, codemods</td>
                <td>Automation</td>
                <td>60-80% mechanical</td>
              </tr>
              <tr>
                <td><strong>PRPM Packages</strong></td>
                <td>Rules, skills, agents</td>
                <td>AI</td>
                <td>+20-40% contextual</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xl font-semibold text-white mt-6">This is the new standard.</p>
          <p>Documentation teaches, scripts automate, PRPM packages guide AI to handle nuanced work.</p>

          <h2>Why Now</h2>

          <p className="text-xl font-semibold text-white">The AI coding assistant is the new compiler.</p>

          <p>Just like every language needed:</p>
          <ul>
            <li>Documentation (how to write code)</li>
            <li>Compiler/interpreter (how to run code)</li>
            <li>Package manager (how to share code)</li>
          </ul>

          <p>Every AI coding platform needs:</p>
          <ul>
            <li>Documentation (what to build)</li>
            <li>Migration scripts (basic automation)</li>
            <li><strong>PRPM packages</strong> (how to build it correctly)</li>
          </ul>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 my-8">
            <pre className="text-sm text-gray-300 mb-0"><code>{`2020: "AI will help with autocomplete"
2023: "AI can write full functions"
2024: "AI can refactor entire codebases"
2025: "AI needs distributed knowledge to do it RIGHT"
      ↑
    PRPM fills this gap`}</code></pre>
          </div>

          <p className="text-xl font-semibold text-white">We're building the missing piece.</p>

          <div className="not-prose bg-gradient-to-r from-prpm-dark-card to-prpm-dark-card/50 border-l-4 border-prpm-accent rounded-r-2xl p-8 my-12">
            <h2 className="text-3xl font-bold text-white mb-0">Get Started</h2>
          </div>

          <div className="not-prose space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">For Framework/Library Authors</h3>
              <pre className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 overflow-x-auto"><code className="text-sm text-gray-300 font-mono">{`$ prpm init
# Create migration rules, skills, and agents
$ prpm publish @yourframework/v2-migration`}</code></pre>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-4">For Enterprises</h3>
              <pre className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 overflow-x-auto"><code className="text-sm text-gray-300 font-mono">{`$ prpm init --private
# Create internal rules and skills
$ prpm publish @company/coding-standards --registry=company.prpm.dev`}</code></pre>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-4">For Developers</h3>
              <pre className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 overflow-x-auto"><code className="text-sm text-gray-300 font-mono">{`$ prpm install @react/hooks-migration
$ prpm install @stripe/api-v4-migration
# Let AI use these packages to write better code`}</code></pre>
            </div>
          </div>

          <div className="not-prose bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 my-12 text-center">
            <p className="text-2xl font-bold text-white mb-4">Ready to build the future?</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="https://prpm.dev"
                className="px-6 py-3 bg-prpm-accent text-white font-semibold rounded-lg hover:bg-prpm-accent/80 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="https://github.com/pr-pm/prpm"
                className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                View on GitHub
              </Link>
            </div>
          </div>

          <p className="text-center text-xl text-gray-400 italic">
            <strong className="text-white">This is the future of software development:</strong> Intelligence as code, distributed through packages, applied by AI.
          </p>
        </div>

        <BlogFooter postTitle="PRPM: Distributable Intelligence for AI-Assisted Development" postUrl="/blog/distributable-intelligence" />
      </article>
    </main>
  )
}
