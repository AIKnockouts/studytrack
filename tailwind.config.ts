import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent-color)',
        dark: {
          bg: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          border: '#222222',
          primary: '#f5f5f5',
          secondary: '#888888',
          muted: '#555555',
        },
      },
    },
  },
  plugins: [],
}

export default config
