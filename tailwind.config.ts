import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'lusu-navy': '#1B3A6B',
        'lusu-cyan': '#00B4E6',
        'study-gold': '#C4A952',
        'study-black': '#1A1A1A',
        'outpost-black': '#0D0D0D',
        'outpost-red': '#E63946',
        'app-bg': '#F7F8FA',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px -4px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.05)',
        'navbar': '0 1px 0 0 rgba(0,0,0,0.15)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #1B3A6B 0%, #0D2347 100%)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
export default config
