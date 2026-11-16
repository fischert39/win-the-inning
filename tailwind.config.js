/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Theme tokens — light/dark values live in app/globals.css.
        page:    'rgb(var(--page) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink:     'rgb(var(--ink) / <alpha-value>)',
        slate: { 50: 'rgb(var(--slate-50) / <alpha-value>)', 100: 'rgb(var(--slate-100) / <alpha-value>)', 200: 'rgb(var(--slate-200) / <alpha-value>)', 300: 'rgb(var(--slate-300) / <alpha-value>)', 400: 'rgb(var(--slate-400) / <alpha-value>)', 500: 'rgb(var(--slate-500) / <alpha-value>)', 600: 'rgb(var(--slate-600) / <alpha-value>)', 700: 'rgb(var(--slate-700) / <alpha-value>)', 800: 'rgb(var(--slate-800) / <alpha-value>)', 900: 'rgb(var(--slate-900) / <alpha-value>)' },
        amber: { 50: 'rgb(var(--amber-50) / <alpha-value>)', 100: 'rgb(var(--amber-100) / <alpha-value>)', 200: 'rgb(var(--amber-200) / <alpha-value>)', 600: 'rgb(var(--amber-600) / <alpha-value>)', 700: 'rgb(var(--amber-700) / <alpha-value>)', 800: 'rgb(var(--amber-800) / <alpha-value>)', 900: 'rgb(var(--amber-900) / <alpha-value>)' },
        green: { 50: 'rgb(var(--green-50) / <alpha-value>)', 100: 'rgb(var(--green-100) / <alpha-value>)', 200: 'rgb(var(--green-200) / <alpha-value>)', 600: 'rgb(var(--green-600) / <alpha-value>)', 700: 'rgb(var(--green-700) / <alpha-value>)', 800: 'rgb(var(--green-800) / <alpha-value>)' },
        red: { 50: 'rgb(var(--red-50) / <alpha-value>)', 100: 'rgb(var(--red-100) / <alpha-value>)', 200: 'rgb(var(--red-200) / <alpha-value>)', 600: 'rgb(var(--red-600) / <alpha-value>)', 700: 'rgb(var(--red-700) / <alpha-value>)', 800: 'rgb(var(--red-800) / <alpha-value>)' },
        sky: { 50: 'rgb(var(--sky-50) / <alpha-value>)', 100: 'rgb(var(--sky-100) / <alpha-value>)', 200: 'rgb(var(--sky-200) / <alpha-value>)', 700: 'rgb(var(--sky-700) / <alpha-value>)' },
        yellow: { 50: 'rgb(var(--yellow-50) / <alpha-value>)', 200: 'rgb(var(--yellow-200) / <alpha-value>)', 800: 'rgb(var(--yellow-800) / <alpha-value>)' },
        purple: { 100: 'rgb(var(--purple-100) / <alpha-value>)', 700: 'rgb(var(--purple-700) / <alpha-value>)' },
        teal: { 50: 'rgb(var(--teal-50) / <alpha-value>)', 100: 'rgb(var(--teal-100) / <alpha-value>)', 700: 'rgb(var(--teal-700) / <alpha-value>)' },
        orange: { 50: 'rgb(var(--orange-50) / <alpha-value>)' },
        brand: {
          // These four use CSS custom properties so team colors work.
          // The RGB values are set at runtime from the chosen palette.
          orange:       'rgb(var(--brand-primary)      / <alpha-value>)',
          'orange-dark':'rgb(var(--brand-primary-dark) / <alpha-value>)',
          navy:         'rgb(var(--brand-navy)         / <alpha-value>)',
          'navy-light': 'rgb(var(--brand-navy-light)   / <alpha-value>)',
          // Functional colors — stay fixed regardless of theme
          green:        '#2DC653',
          purple:       '#9B5DE5',
          teal:         '#00B4D8',
          yellow:       '#F5A623',
          red:          '#E63946',
          blue:         '#0077B6',
        },
      },
      keyframes: {
        'flicker': {
          '0%, 100%': { transform: 'scale(1) rotate(-1deg)' },
          '25%':       { transform: 'scale(1.12) rotate(2deg)' },
          '50%':       { transform: 'scale(1.05) rotate(-1.5deg)' },
          '75%':       { transform: 'scale(1.09) rotate(1deg)' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-14px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1.1)' },
        },
        'celebration': {
          '0%':   { opacity: '0', transform: 'scale(0.7)' },
          '60%':  { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'flicker':      'flicker 1.8s ease-in-out infinite',
        'bounce-slow':  'bounce-slow 2s infinite',
        'fade-in':      'fade-in 0.2s ease',
        'slide-up':     'slide-up 0.25s ease',
        'pop':          'pop 0.3s ease forwards',
        'celebration':  'celebration 0.4s ease forwards',
      },
    },
  },
  plugins: [],
}
