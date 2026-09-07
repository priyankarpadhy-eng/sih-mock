/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        toc: {
          bg: '#0B0F17',
          surface: '#161F30',
          border: '#1E293B',
          hover: '#243048',
          text: '#94A3B8',
          heading: '#F8FAFC',
        },
        tactical: {
          pass: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
