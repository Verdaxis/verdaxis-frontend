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
          dark: 'var(--text-primary)',
          green: '#4CAF50',
          light: 'var(--bg-primary)',
          bg: 'var(--bg-primary)',
          card: 'var(--bg-card)',
          text: 'var(--text-primary)',
          border: 'var(--border-color)',
          input: 'var(--input-bg)',
          'text-muted': 'var(--text-secondary)',
        },
      },
    },
  },
  plugins: [],
}
