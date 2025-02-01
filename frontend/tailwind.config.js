/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': ['0.65rem', { lineHeight: '0.9rem' }],
        'sm': ['0.785rem', { lineHeight: '1.05rem' }],
        'base': ['0.9rem', { lineHeight: '1.275rem' }],
        'lg': ['1.015rem', { lineHeight: '1.425rem' }],
        'xl': ['1.125rem', { lineHeight: '1.65rem' }],
        '2xl': ['1.35rem', { lineHeight: '1.8rem' }],
        '3xl': ['1.575rem', { lineHeight: '1.95rem' }],
      },
      spacing: {
        '0.5': '0.09375rem',
        '1': '0.1875rem',
        '2': '0.375rem',
        '3': '0.5625rem',
        '4': '0.75rem',
        '5': '0.9375rem',
        '6': '1.125rem',
        '8': '1.5rem',
        '10': '1.875rem',
        '12': '2.25rem',
        '16': '3rem',
        '20': '3.75rem',
        '24': '4.5rem',
        '32': '6rem',
        '40': '7.5rem',
        '48': '9rem',
        '56': '10.5rem',
        '64': '12rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
