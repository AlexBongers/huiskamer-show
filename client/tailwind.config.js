/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#070B18',
          card: '#111936',
          cardLight: '#1B2752',
          gold: '#F5C542',
          goldLight: '#FDE08D',
          emerald: '#22C55E',
          purple: '#A855F7',
          blue: '#3B82F6',
          orange: '#F97316',
          yellow: '#EAB308',
          pink: '#EC4899',
        }
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        sans: ['Nunito', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
      },
      keyframes: {
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(-4%)' },
          '50%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
