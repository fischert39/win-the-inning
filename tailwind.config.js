/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:       '#FF6B35',
          'orange-dark':'#E55A25',
          green:        '#2DC653',
          purple:       '#9B5DE5',
          teal:         '#00B4D8',
          yellow:       '#F5A623',
          navy:         '#1A1A2E',
          'navy-light': '#16213E',
          red:          '#E63946',
          blue:         '#0077B6',
        },
      },
      keyframes: {
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
      },
      animation: {
        'bounce-slow': 'bounce-slow 2s infinite',
        'fade-in':     'fade-in 0.2s ease',
        'slide-up':    'slide-up 0.25s ease',
      },
    },
  },
  plugins: [],
}
