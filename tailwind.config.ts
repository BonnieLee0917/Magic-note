import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a0e27', light: '#141938', dark: '#060818' },
        purple: { DEFAULT: '#2d1b69', light: '#3d2b7a', dark: '#1a0f40' },
        gold: { DEFAULT: '#d4a843', light: '#e8c36a', dark: '#b8922e' },
        parchment: { DEFAULT: '#f4e4c1', light: '#faf0d7', dark: '#e6d0a3' },
        magic: {
          ink: '#1a1a2e',
          glow: '#7b68ee',
          star: '#ffd700',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        magic: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'stars': 'radial-gradient(2px 2px at 20px 30px, #ffd700, transparent), radial-gradient(2px 2px at 40px 70px, #7b68ee, transparent), radial-gradient(1px 1px at 90px 40px, #ffd700, transparent), radial-gradient(1px 1px at 130px 80px, #7b68ee, transparent), radial-gradient(2px 2px at 160px 30px, #ffd700, transparent)',
      },
      boxShadow: {
        'magic': '0 0 15px rgba(212, 168, 67, 0.3)',
        'magic-lg': '0 0 30px rgba(212, 168, 67, 0.4)',
        'glow': '0 0 20px rgba(123, 104, 238, 0.3)',
      }
    },
  },
  plugins: [],
} satisfies Config;
