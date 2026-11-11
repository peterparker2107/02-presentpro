/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tealAccent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: 'oklch(0.60 0.18 190)',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          DEFAULT: 'oklch(0.60 0.18 190)',
        },
        paper: {
          50: '#FFFFFF',
          100: '#FDFCFA',
          200: '#FAF8F5',
          300: '#F4EFEB',
          400: '#EBE4DC',
          DEFAULT: '#FAF8F5',
          dark: '#18181B',
          card: '#FFFFFF',
          border: '#E8E2D8',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(28, 25, 23, 0.05), 0 2px 6px -1px rgba(28, 25, 23, 0.03)',
        'warm-lg': '0 10px 30px -4px rgba(28, 25, 23, 0.08), 0 4px 12px -2px rgba(28, 25, 23, 0.04)',
        'warm-xl': '0 20px 40px -6px rgba(28, 25, 23, 0.1), 0 8px 16px -4px rgba(28, 25, 23, 0.06)',
      },
    },
  },
  plugins: [],
}
