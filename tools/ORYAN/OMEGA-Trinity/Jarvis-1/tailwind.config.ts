import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#02030a',
          primary: '#22d3ee',
          secondary: '#2563eb',
          accent: '#a855f7',
          surface: 'rgba(12, 20, 43, 0.7)'
        }
      },
      boxShadow: {
        glow: '0 0 25px rgba(34, 211, 238, 0.4)'
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular']
      }
    }
  },
  plugins: []
}

export default config
