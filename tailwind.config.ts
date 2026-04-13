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
      },
    },
  },
  plugins: [],
}
export default config
