/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink:     '#FA5EBD',
          soft:     '#F98AC9',
          light:    '#FCE4F4',
          lightest: '#FFF5FC',
          dark:     '#C4248E',
          deeper:   '#9E1B70',
        },
        canvas: '#FFFFFF',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card:  '0 1px 4px rgba(250,94,189,0.07), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 2px 8px rgba(250,94,189,0.12), 0 8px 24px rgba(0,0,0,0.07)',
        nav:   '0 -1px 0 rgba(0,0,0,0.04), 0 -4px 20px rgba(250,94,189,0.06)',
        glow:  '0 0 20px rgba(250,94,189,0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FA5EBD 0%, #F98AC9 50%, #e8a0d4 100%)',
        'brand-gradient-v': 'linear-gradient(180deg, #FA5EBD 0%, #C4248E 100%)',
        'warm-gradient': 'linear-gradient(135deg, #FFF5FC 0%, #FCE4F4 100%)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease both',
        'fade-in':    'fadeIn 0.3s ease both',
        'scale-in':   'scaleIn 0.2s ease both',
        'pulse-pink': 'pulsePink 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulsePink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
