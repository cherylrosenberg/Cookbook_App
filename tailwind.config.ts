import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        'forest-green': '#182D09',
        'light-green': '#E8F5E9',
        cream: '#FFFBF5',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(to bottom, #fdfcfb, #f7f4ed)',
        'placeholder-1': 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        'placeholder-2': 'linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)',
        'placeholder-3': 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
        'placeholder-4': 'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)',
        'placeholder-5': 'linear-gradient(135deg, #FBCFE8 0%, #F9A8D4 100%)',
        'placeholder-6': 'linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
export default config

