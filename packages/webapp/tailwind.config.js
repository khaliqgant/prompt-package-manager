/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'prpm-green': '#10b981',
        'prpm-green-dark': '#059669',
        'prpm-green-light': '#34d399',
        'prpm-green-lighter': '#6ee7b7',
        'prpm-yellow': '#fbbf24',
        'prpm-yellow-dark': '#f59e0b',
        'prpm-yellow-light': '#fcd34d',
        'prpm-yellow-lighter': '#fde68a',
        'prpm-dark': '#0a0a0f',
        'prpm-dark-lighter': '#12121a',
        'prpm-dark-card': '#1a1a24',
        'prpm-border': '#27273a',
        'prpm-accent': '#34d399',
        'prpm-accent-light': '#6ee7b7',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
