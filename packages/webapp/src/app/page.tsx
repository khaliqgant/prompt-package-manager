'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function Home() {
  const [copiedCli, setCopiedCli] = useState(false)
  const [copiedCollection, setCopiedCollection] = useState(false)

  const copyToClipboard = async (text: string, type: 'cli' | 'collection') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'cli') {
        setCopiedCli(true)
        setTimeout(() => setCopiedCli(false), 2000)
      } else {
        setCopiedCollection(true)
        setTimeout(() => setCopiedCollection(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  return (
    <main className="min-h-screen bg-prpm-dark relative overflow-hidden">
      {/* Playground Launch Announcement Banner */}
      <div className="relative z-50 bg-gradient-to-r from-[#1a472a] via-[#2a5a3a] to-[#1a472a] border-b border-prpm-accent/30">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                NEW
              </span>
              <p className="text-sm sm:text-base text-white font-medium truncate">
                Introducing PRPM+ Playground: Test prompts with Claude, GPT-4o & more!
              </p>
            </div>
            <Link
              href="/playground"
              className="flex cursor-pointer items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold text-white transition-all border border-white/20 hover:border-white/40 whitespace-nowrap"
            >
              Try it now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20"></div>

      {/* Gradient orbs for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-prpm-accent/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-prpm-green/20 rounded-full blur-3xl"></div>

      {/* Hero Section */}
      <div className="relative flex min-h-screen flex-col items-center justify-center p-8 lg:p-24">
        <div className="z-10 max-w-6xl w-full">
          {/* Hero content */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-prpm-dark-card border border-prpm-border rounded-full text-sm text-gray-400">
              <span className="w-2 h-2 bg-prpm-accent rounded-full animate-pulse"></span>
              Alpha · 7,000+ packages · 100+ collections
            </div>

            <div className="flex justify-center mb-8">
              <Image src="/logo-icon.svg" alt="PRPM Logo" width={120} height={120} className="w-24 h-24 lg:w-32 lg:h-32" />
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                PRPM
              </span>
            </h1>

            <p className="text-xl sm:text-2xl lg:text-3xl mb-6 text-gray-300 font-semibold tracking-tight">
              The universal registry for AI coding tools.
            </p>

            <p className="text-base sm:text-lg lg:text-xl mb-12 text-gray-400 max-w-3xl mx-auto leading-relaxed px-4">
              Discover and install cross-platform prompts, rules, skills, and agents that work with Cursor, Claude, Continue, Windsurf, GitHub Copilot, OpenAI Codex, Google Gemini, Kiro, and more — all from one file.
            </p>

            <div className="flex flex-col gap-4 items-center mb-8">
              <Link
                href="/search"
                className="px-8 py-4 bg-prpm-dark-card border border-prpm-border text-white rounded-lg hover:border-prpm-accent transition-all font-semibold text-lg hover-lift flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Packages
              </Link>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link
                  href="/getting-started"
                  className="px-8 py-4 bg-prpm-dark-card border border-prpm-border text-white rounded-lg hover:border-prpm-accent transition-all font-semibold text-lg hover-lift"
                >
                  Get Started
                </Link>
                <a
                  href="https://github.com/pr-pm/prpm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-8 py-4 bg-prpm-dark-card border border-prpm-border text-white rounded-lg hover:border-prpm-accent transition-all font-semibold text-lg hover-lift flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>

            <div className="flex justify-center mb-12">
              <a href="https://startupfa.me/s/prpm.dev?utm_source=prpm.dev" target="_blank" rel="noopener noreferrer">
                <img src="https://startupfa.me/badges/featured-badge.webp" alt="PRPM - Featured on Startup Fame" width={171} height={54} />
              </a>
            </div>

            {/* Quick install commands */}
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Install CLI</span>
                  <button
                    onClick={() => copyToClipboard('npm install -g prpm', 'cli')}
                    className="text-xs text-gray-500 hover:text-prpm-accent transition-colors"
                  >
                    {copiedCli ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="block font-mono text-prpm-accent-light text-left">
                  <span className="text-gray-600">$</span> npm install -g prpm
                </code>
              </div>

              <div className="bg-prpm-dark-card border border-prpm-accent/30 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Try Collections</span>
                  <button
                    onClick={() => copyToClipboard('prpm install collections/essential-dev-agents', 'collection')}
                    className="text-xs text-gray-500 hover:text-prpm-accent transition-colors"
                  >
                    {copiedCollection ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="block font-mono text-prpm-accent-light text-left space-y-1">
                  <div><span className="text-gray-600">$</span> prpm install collections/essential-dev-agents</div>
                  <div className="text-xs text-gray-500 mt-2"># Installs 20 packages: backend-architect, cloud-architect, database-architect, and more</div>
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
              <h3 className="text-xl font-semibold mb-2 text-white">7,000+ Packages</h3>
              <p className="text-gray-400 leading-relaxed">
                Battle-tested prompts, agents, skills, and slash commands from verified contributors
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

            <Link href="/categories" className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Browse by Category</h3>
              <p className="text-gray-400 leading-relaxed">
                Hierarchical categories organized by development areas and frameworks
              </p>
            </Link>

            <div className="group bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover-lift hover:border-prpm-accent/50 transition-all">
              <div className="w-12 h-12 mb-4 rounded-lg bg-prpm-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">100+ Collections</h3>
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

          {/* AI-Powered Discovery Section */}
          <div className="mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-prpm-accent/10 via-prpm-green/10 to-prpm-accent/10 border-2 border-prpm-accent/30 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-prpm-accent/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-prpm-green/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-prpm-accent/10 border border-prpm-accent/30 rounded-full">
                    <svg className="w-4 h-4 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-prpm-accent-light">AI-Powered Discovery</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Find Exactly What You Need
                  </h2>

                  <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                    {process.env.NEXT_PUBLIC_ENABLE_AI_SEARCH === 'true'
                      ? 'Semantic AI search understands what you\'re trying to build. Browse hierarchical categories or explore by use case.'
                      : 'Browse hierarchical categories or explore by use case to find what you need.'}
                  </p>

                  <div className={`grid grid-cols-1 ${process.env.NEXT_PUBLIC_ENABLE_AI_SEARCH === 'true' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 mb-8`}>
                    {process.env.NEXT_PUBLIC_ENABLE_AI_SEARCH === 'true' && (
                      <Link
                        href="/search"
                        className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-prpm-accent/50 text-white font-semibold rounded-xl transition-all group"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>AI Search</span>
                        </div>
                        <p className="text-sm text-gray-400 group-hover:text-gray-300">Natural language search</p>
                      </Link>
                    )}
                    <Link
                      href="/categories"
                      className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-prpm-accent/50 text-white font-semibold rounded-xl transition-all group"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                        </svg>
                        <span>Categories</span>
                      </div>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300">Browse by dev area</p>
                    </Link>
                    <Link
                      href="/use-cases"
                      className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-prpm-accent/50 text-white font-semibold rounded-xl transition-all group"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Use Cases</span>
                      </div>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300">Find by goal</p>
                    </Link>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>AI understands intent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-400 font-semibold">Free for all users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Just sign in to use</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Playground Section */}
          <div className="mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-yellow-600/10 via-orange-600/10 to-yellow-600/10 border-2 border-yellow-500/30 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span className="text-sm font-semibold text-yellow-300">PRPM+ Playground</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Test Before You Install
                  </h2>

                  <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                    Try any package with leading AI models in a virtual environment. See real responses before installing anything.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                    <Link
                      href="/playground"
                      className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/30"
                    >
                      Try the Playground
                    </Link>
                    <Link
                      href="/pricing"
                      className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold rounded-xl transition-all"
                    >
                      View Pricing
                    </Link>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>5 free trial credits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>PRPM+ from $6/month</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Credits roll over</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo */}
          <div className="mb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-0">
              <h2 className="text-2xl font-semibold mb-6 text-white text-center">See it in action</h2>
              <div className="bg-prpm-dark-card/50 border border-prpm-border rounded-lg sm:rounded-2xl p-0 sm:p-4 backdrop-blur-sm overflow-hidden">
                <Image
                  src="/demo.gif"
                  alt="PRPM Install Demo"
                  width={1200}
                  height={600}
                  className="w-full rounded-lg"
                  style={{ height: 'auto' }}
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="text-center mb-20">
            <h2 className="text-2xl font-semibold mb-8 text-white">Universal Format Support</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              PRPM packages work with all major AI coding tools — from vendor-specific formats to the open agents.md standard.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
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
                <span className="text-gray-300 font-medium">GitHub Copilot</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">OpenAI Codex</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Google Gemini</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <span className="text-gray-300 font-medium">Kiro</span>
              </div>
              <div className="px-6 py-3 bg-prpm-dark-card border border-prpm-accent/50 rounded-lg">
                <span className="text-prpm-accent font-medium">agents.md (Open Standard)</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Plus any tool supporting Model Context Protocol (MCP) or the agents.md open standard
            </p>
          </div>

          {/* What You Can Install */}
          <div className="mb-20 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">What You Can Install</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-3">Cursor Rules</h3>
                <p className="text-gray-400 mb-4">
                  Production-ready Cursor rules for every framework. React, TypeScript, Python, and more.
                </p>
                <Link href="/search?format=cursor" className="text-prpm-accent hover:text-prpm-accent-light text-sm">
                  Browse Cursor Rules →
                </Link>
              </div>

              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-3">Claude Agents</h3>
                <p className="text-gray-400 mb-4">
                  Specialized Claude agents for code review, architecture, testing, and more.
                </p>
                <Link href="/search?format=claude&subtype=agent" className="text-prpm-accent hover:text-prpm-accent-light text-sm">
                  Browse Claude Agents →
                </Link>
              </div>

              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-3">Slash Commands</h3>
                <p className="text-gray-400 mb-4">
                  Cursor slash commands and Claude slash commands for faster workflows.
                </p>
                <Link href="/search?subtype=slash-command" className="text-prpm-accent hover:text-prpm-accent-light text-sm">
                  Browse Slash Commands →
                </Link>
              </div>

              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-3">Claude Skills</h3>
                <p className="text-gray-400 mb-4">
                  Claude Code skills for specialized domain knowledge and patterns.
                </p>
                <Link href="/search?format=claude&subtype=skill" className="text-prpm-accent hover:text-prpm-accent-light text-sm">
                  Browse Claude Skills →
                </Link>
              </div>

              <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-3">Windsurf Rules</h3>
                <p className="text-gray-400 mb-4">
                  Windsurf-specific rules for frontend, backend, and full-stack development.
                </p>
                <Link href="/search?format=windsurf" className="text-prpm-accent hover:text-prpm-accent-light text-sm">
                  Browse Windsurf Rules →
                </Link>
              </div>

              <div className="bg-prpm-dark-card border border-prpm-accent/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-3">Collections</h3>
                <p className="text-gray-400 mb-4">
                  Complete workflow setups with multiple packages. Install everything you need in one command.
                </p>
                <Link href="/search?tab=collections" className="text-prpm-accent hover:text-prpm-accent-light text-sm">
                  Browse Collections →
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-prpm-border/50 pt-8 mt-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
              <div>
                © 2025 PRPM. Open source under MIT License.
              </div>
              <div className="flex gap-6">
                <Link href="https://docs.prpm.dev" className="hover:text-white transition-colors">
                  Docs
                </Link>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
                <Link href="/legal/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
                <Link href="/legal/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
                <a
                  href="https://github.com/pr-pm/prpm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}
