/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        verdaxis: {
          DEFAULT: '#5DADE2',
          hover: '#7EC5ED',
          press: '#4090C5',
          dim: 'rgba(93,173,226,0.12)',
          dark: 'var(--text-primary)',
          // Supplier mode accent (was #4CAF50 which fails AA on dark bg)
          green: '#22D37A',
          'green-hover': '#39E38C',
          light: 'var(--bg-primary)',
          bg: 'var(--bg-primary)',
          card: 'var(--bg-card)',
          text: 'var(--text-primary)',
          border: 'var(--border-color)',
          input: 'var(--input-bg)',
          'text-muted': 'var(--text-secondary)',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
