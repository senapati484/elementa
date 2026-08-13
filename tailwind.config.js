/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/sidepanel/**/*.{html,js,ts,jsx,tsx}",
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        dark: {
          bg: '#0f1117',
          surface: '#181b24',
          card: '#1f2430',
          border: '#2a3142',
          muted: '#8b949e',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(99, 102, 241, 0.4)',
        'glow-teal': '0 0 20px -5px rgba(20, 184, 166, 0.4)',
      }
    },
  },
  plugins: [],
}
