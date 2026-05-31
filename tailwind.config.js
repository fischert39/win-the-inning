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
