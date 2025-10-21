import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-prpm-dark relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20"></div>

      {/* Gradient orbs for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-prpm-accent/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-prpm-purple/20 rounded-full blur-3xl"></div>

      {/* Hero Section */}
      <div className="relative flex min-h-screen flex-col items-center justify-center p-8 lg:p-24">
        <div className="z-10 max-w-6xl w-full">
          {/* Hero content */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-prpm-dark-card border border-prpm-border rounded-full text-sm text-gray-400">
              <span className="w-2 h-2 bg-prpm-accent rounded-full animate-pulse"></span>
              Alpha · 1,042+ packages · 16 collections
            </div>

            <h1 className="text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                PRPM
              </span>
            </h1>

            <p className="text-2xl lg:text-3xl mb-6 text-gray-300 font-semibold tracking-tight">
              Prompt Package Manager
            </p>

            <p className="text-lg lg:text-xl mb-12 text-gray-400 max-w-3xl mx-auto leading-relaxed">
              The universal registry for AI coding prompts. Install, share, and discover
              production-ready prompts for Cursor, Claude, Continue, Windsurf, and more.
            </p>

            <div className="flex gap-4 justify-center flex-wrap mb-12">
              <Link
                href="/search"
                className="px-8 py-4 bg-prpm-accent text-white rounded-lg hover:bg-prpm-accent-light transition-all font-semibold text-lg hover-lift"
              >
                Browse Packages
              </Link>
              <Link
                href="/signup"
                className="px-8 py-4 bg-prpm-dark-card border-2 border-prpm-border text-white rounded-lg hover:border-prpm-accent transition-all font-semibold text-lg hover-lift"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-prpm-dark-card border border-prpm-border text-white rounded-lg hover:border-prpm-accent transition-all font-semibold text-lg hover-lift"
              >
                Sign In
              </Link>
              <a
                href="https://github.com/khaliqgant/prompt-package-manager"
                target="_blank"
                rel="noopener noreferrer"
                className="group px-8 py-4 bg-prpm-dark-card border border-prpm-border text-gray-300 rounded-lg hover:border-prpm-accent hover:text-white transition-all font-semibold text-lg hover-lift flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            </div>

            {/* Quick install command */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Quick Start</span>
                  <button className="text-xs text-gray-500 hover:text-prpm-accent transition-colors">Copy</button>
                </div>
                <code className="block font-mono text-prpm-accent-light text-left">
                  <span className="text-gray-600">$</span> npm install -g prpm
                </code>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
            <div className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">1,042+ Packages</h3>
              <p className="text-gray-400 leading-relaxed">
                Curated collection of production-ready AI prompts from verified contributors
              </p>
            </div>

            <div className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">CLI-First</h3>
              <p className="text-gray-400 leading-relaxed">
                Install and manage prompts with familiar npm-like commands
              </p>
            </div>

            <div className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Search & Discover</h3>
              <p className="text-gray-400 leading-relaxed">
                Full-text search with tags, categories, and advanced filters
              </p>
            </div>

            <div className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">16 Collections</h3>
              <p className="text-gray-400 leading-relaxed">
                Curated package bundles for specific workflows and use cases
              </p>
            </div>

            <Link href="/authors" className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Verified Authors</h3>
              <p className="text-gray-400 leading-relaxed">
                Claim ownership and track analytics for your packages
              </p>
            </Link>

            <div className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Version Control</h3>
              <p className="text-gray-400 leading-relaxed">
                Semantic versioning with dependency resolution and updates
              </p>
            </div>
          </div>

          {/* CLI Examples */}
          <div className="mb-20">
            <div className="max-w-3xl mx-auto">
              <div className="bg-prpm-dark-card/50 border border-prpm-border rounded-2xl p-8 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="bg-black/40 rounded-lg p-4 font-mono text-sm border border-prpm-border/30">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 select-none">$</span>
                      <div className="flex-1">
                        <span className="text-prpm-accent-light">prpm</span>
                        <span className="text-gray-400"> search</span>
                        <span className="text-white"> react</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-lg p-4 font-mono text-sm border border-prpm-border/30">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 select-none">$</span>
                      <div className="flex-1">
                        <span className="text-prpm-accent-light">prpm</span>
                        <span className="text-gray-400"> install</span>
                        <span className="text-white"> @sanjeed5/react-best-practices</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-lg p-4 font-mono text-sm border border-prpm-border/30">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 select-none">$</span>
                      <div className="flex-1">
                        <span className="text-prpm-accent-light">prpm</span>
                        <span className="text-gray-400"> publish</span>
                        <span className="text-white"> --format cursor</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="text-center mb-20">
            <h2 className="text-2xl font-semibold mb-8 text-white">Universal Format Support</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Cursor</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Claude Code</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Continue</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Windsurf</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Generic Prompts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
