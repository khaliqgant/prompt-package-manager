import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import BlogFooter from '@/components/BlogFooter'
import BackLink from '@/components/BackLink'
import BlogPostHeader from '@/components/BlogPostHeader'

export const metadata: Metadata = {
  title: "Claude Desktop & Claude Code: A Technical Deep Dive",
  description: "Explore Claude's skills system, CLAUDE.md project context, and best practices for optimizing AI context with Claude Search Optimization (CSO).",
  openGraph: {
    title: "Claude Desktop & Claude Code: A Technical Deep Dive",
    description: "Deep dive into Claude's skills-based system and project context files.",
  },
}

export default function ClaudeDeepDivePost() {
  return (
    <main className="min-h-screen bg-prpm-dark">
      <Header />

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BackLink href="/blog">Back to Blog</BackLink>

        <BlogPostHeader
          tags={['Claude', 'Skills', 'Deep Dive']}
          title="Claude Desktop & Claude Code: A Technical Deep Dive"
          author="PRPM Team"
          date="October 26, 2025"
          readTime="15 min read"
        />

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 mb-8">
            <p className="text-xl text-gray-300 leading-relaxed italic mb-0">
              Claude has four officially supported systems for providing context: CLAUDE.md for project-specific context, <a href="https://docs.claude.com/en/docs/claude-code/skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">Skills</a> for reusable reference documentation, <a href="https://docs.claude.com/en/docs/claude-code/sub-agents" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">Agents</a> for project-specific tasks, and <a href="https://docs.claude.com/en/docs/claude-code/slash-commands" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">Commands</a> for quick actions. This deep dive explores Claude's unique approach to context management and optimization.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Claude's <a href="https://docs.claude.com/en/docs/claude-code/skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">skills system</a> represents a reference-based approach to AI customization. Unlike other formats that emphasize always-on rules, Claude uses a discoverable skills-based system where each skill is optimized for Claude's search system. Read more about <a href="https://support.claude.com/en/articles/12512176-what-are-skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">what skills are</a> and Anthropic's vision for <a href="https://www.anthropic.com/news/skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">agent skills</a>.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">CLAUDE.md: Always-On Project Context</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            According to Anthropic's official best practices, CLAUDE.md is a special configuration file that Claude Code automatically pulls into context when starting a conversation. It serves as your project's persistent memory.
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">What to include in CLAUDE.md:</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">✓</span>
                <span>Common bash commands (<code className="bg-prpm-dark px-2 py-1 rounded">npm run build</code>, <code className="bg-prpm-dark px-2 py-1 rounded">npm test</code>)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">✓</span>
                <span>Core files and utility functions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">✓</span>
                <span>Code style guidelines (ES modules vs CommonJS, naming conventions)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">✓</span>
                <span>Testing instructions and coverage requirements</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">✓</span>
                <span>Unexpected project behaviors or gotchas</span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Skills: Reusable Reference Documentation</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Skills are self-contained reference guides for proven techniques, patterns, or tools. Unlike CLAUDE.md (which is always loaded), skills are discoverable - Claude consults them only when relevant.
          </p>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">📁 Required File Structure & Naming</h3>
            <p className="text-gray-300 mb-3">
              According to <a href="https://docs.claude.com/en/docs/claude-code/skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline">Claude's official documentation</a>, skills have strict requirements:
            </p>
            <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4 font-mono text-sm text-gray-400 mb-4">
              .claude/skills/<br/>
              └── my-skill/<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;└── SKILL.md  ← Must be named SKILL.md (all caps)
            </div>
            <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4 mb-3">
              <p className="text-white font-semibold mb-2">Character Limits:</p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-prpm-accent">•</span>
                  <span><strong>Skill name:</strong> Max 64 characters, lowercase letters, numbers, and hyphens only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-prpm-accent">•</span>
                  <span><strong>Description:</strong> Max 1024 characters (aim for 100-800 for optimal discoverability)</span>
                </li>
              </ul>
            </div>
            <p className="text-gray-300 text-sm">
              PRPM enforces these requirements during package installation and publishing to ensure compatibility with Claude Desktop and Claude Code.
            </p>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Supported Frontmatter Fields</h3>
          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <table className="w-full text-gray-300 text-sm">
              <thead>
                <tr className="border-b border-prpm-border">
                  <th className="text-left py-2 pr-4">Field</th>
                  <th className="text-left py-2 pr-4">Required</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-prpm-border/50">
                <tr>
                  <td className="py-2 pr-4 font-mono text-prpm-accent">name</td>
                  <td className="py-2 pr-4">✅ Yes</td>
                  <td className="py-2">Unique identifier (lowercase, numbers, hyphens, max 64 chars)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-prpm-accent">description</td>
                  <td className="py-2 pr-4">✅ Yes</td>
                  <td className="py-2">What the skill does and when to use it (max 1024 chars)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-prpm-accent">allowed-tools</td>
                  <td className="py-2 pr-4">⬜ Optional</td>
                  <td className="py-2">Restricts which tools Claude can use with this skill</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Claude Search Optimization (CSO)</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Future Claude instances read the <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded">description</code> field to decide if a skill is relevant. Bad descriptions mean skills won't be found.
          </p>

          <div className="bg-prpm-dark border border-prpm-border rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4">✅ <strong>Good</strong>: Specific triggers + clear benefit</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 mb-4 font-mono text-sm text-gray-400">
              description: Use when encountering TypeScript type errors or designing type-safe APIs - provides patterns for strict typing, type guards, and generic constraints
            </div>

            <p className="text-gray-300 mb-4">❌ <strong>Bad</strong>: Too vague</p>
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 font-mono text-sm text-gray-400">
              description: For TypeScript help
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Skills vs Agents vs Commands vs CLAUDE.md</h2>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-6">
            <table className="w-full text-gray-300 text-sm">
              <thead>
                <tr className="border-b border-prpm-border">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Activation</th>
                  <th className="text-left py-2">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-prpm-border/50">
                <tr>
                  <td className="py-2 pr-4 font-bold">CLAUDE.md</td>
                  <td className="py-2 pr-4">Always (auto-loaded)</td>
                  <td className="py-2">"Run pnpm install", "Use App Router"</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-bold">Skills</td>
                  <td className="py-2 pr-4">On-demand (search)</td>
                  <td className="py-2">"How to implement rate limiting"</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-bold">Agents</td>
                  <td className="py-2 pr-4">Explicit invoke</td>
                  <td className="py-2">@agent-name invocation</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-bold">Commands</td>
                  <td className="py-2 pr-4">Slash command</td>
                  <td className="py-2">/review-code, /write-tests</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Best Practices</h2>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Optimize for Discovery (CSO)</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            Write skill descriptions that start with triggering conditions ("Use when...") and include specific symptoms that developers will search for.
          </p>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">Match Specificity to Degrees of Freedom</h3>
          <p className="text-gray-300 leading-relaxed mb-6">
            For creative tasks with high degrees of freedom, provide broad guidance. For critical operations with low degrees of freedom, provide explicit step-by-step instructions.
          </p>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Official Resources</h2>
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">📚 Claude Documentation</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">→</span>
                <span>
                  <a href="https://docs.claude.com/en/docs/claude-code/skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-semibold">Skills Documentation</a>
                  {' '}- Official technical documentation for Claude Code skills
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">→</span>
                <span>
                  <a href="https://docs.claude.com/en/docs/claude-code/sub-agents" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-semibold">Sub-Agents Documentation</a>
                  {' '}- How to create and use Claude sub-agents
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">→</span>
                <span>
                  <a href="https://docs.claude.com/en/docs/claude-code/slash-commands" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-semibold">Slash Commands Documentation</a>
                  {' '}- Creating custom slash commands
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-accent mt-1">→</span>
                <span>
                  <a href="https://support.claude.com/en/articles/12512176-what-are-skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-semibold">What are Skills?</a>
                  {' '}- Claude support article explaining skills concept
                </span>
              </li>
            </ul>

            <h3 className="text-xl font-bold text-white mb-4 mt-6">🔬 Anthropic Blog Posts</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">→</span>
                <span>
                  <a href="https://www.anthropic.com/news/skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-semibold">Skills Announcement</a>
                  {' '}- Anthropic's vision for agent skills
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-prpm-green mt-1">→</span>
                <span>
                  <a href="https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills" target="_blank" rel="noopener noreferrer" className="text-prpm-accent hover:underline font-semibold">Equipping Agents for the Real World</a>
                  {' '}- Deep technical dive into agent skills architecture
                </span>
              </li>
            </ul>
          </div>

          <h2 className="text-3xl font-bold text-white mt-12 mb-4">Conclusion</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Claude's skills system represents a reference-based approach where skills are documentation, not instructions. CSO optimization is critical for discovery, and examples matter more than explanations. PRPM fully supports Claude's frontmatter parsing, skills vs agents detection, and CSO validation.
          </p>

          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Explore More Format Deep Dives</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog/copilot-deep-dive"
                className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all"
              >
                GitHub Copilot Deep Dive
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

        <BlogFooter postTitle="Claude Desktop & Claude Code: A Technical Deep Dive" postUrl="/blog/claude-deep-dive" />
      </article>
    </main>
  )
}
