/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        backgroundStart: '#050a08',
        backgroundEnd: '#132e27',
        primary: '#4ade80',
        onPrimary: '#002e1a',
        surface: 'rgba(255, 255, 255, 0.08)',
        surfaceBorder: 'rgba(255, 255, 255, 0.12)',
        text: '#ffffff',
        textSecondary: '#a1a1aa',
        accent: '#f87171',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'app-gradient': 'linear-gradient(to bottom, #050a08, #132e27)',
      }
    },
  },
  plugins: [],
}

