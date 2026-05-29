import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent-color)',
      },
    },
  },
  plugins: [],
}

export default config
