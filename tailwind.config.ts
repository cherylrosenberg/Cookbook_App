import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'forest-green': '#182D09',
        'light-green': '#E8F5E9',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(to bottom, #E8F5E9, #C8E6C9)',
      },
    },
  },
  plugins: [],
}
export default config

