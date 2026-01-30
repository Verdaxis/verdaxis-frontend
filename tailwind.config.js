/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        verdaxis: '#0ea5e9', // Sky 500 - inferred from codebase
        'verdaxis-dark': '#0284c7', // Sky 600
        'verdaxis-light': '#38bdf8', // Sky 400
      }
    },
  },
  plugins: [],
}
