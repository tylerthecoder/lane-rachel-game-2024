/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-dark': '#242424',
        'game-green': '#4CAF50'
      }
    },
  },
  plugins: [],
}

