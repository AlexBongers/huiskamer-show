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
          bg: 'rgb(var(--studio-bg-rgb) / <alpha-value>)',
          card: 'rgb(var(--studio-card-rgb) / <alpha-value>)',
          cardLight: 'rgb(var(--studio-card-light-rgb) / <alpha-value>)',
          gold: 'rgb(var(--studio-gold-rgb) / <alpha-value>)',
          goldLight: '#FFE88A',
          ans1: 'rgb(var(--studio-ans1-rgb) / <alpha-value>)',
          ans2: 'rgb(var(--studio-ans2-rgb) / <alpha-value>)',
          ans3: 'rgb(var(--studio-ans3-rgb) / <alpha-value>)',
          ans4: 'rgb(var(--studio-ans4-rgb) / <alpha-value>)',
          emerald: '#22C55E',
          purple: '#A855F7',
          blue: '#3B82F6',
          orange: '#F97316',
          yellow: '#EAB308',
          pink: '#EC4899',
        }
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
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
