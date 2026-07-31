// @ts-check
const { fontFamily } = require('tailwindcss/defaultTheme');
const { colors: customColors } = require('./data/config/colors');

/** @type {import("tailwindcss").Config } */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      colors: {
        // Resolved from CSS variables (channel triplets) so the accent color
        // can be swapped at runtime; see lib/accent.ts.
        primary: {
          100: 'rgb(var(--primary-lighter) / <alpha-value>)',
          200: 'rgb(var(--primary-lighter) / <alpha-value>)',
          300: 'rgb(var(--primary-light) / <alpha-value>)',
          400: 'rgb(var(--primary-light) / <alpha-value>)',
          500: 'rgb(var(--primary-main) / <alpha-value>)',
          600: 'rgb(var(--primary-main) / <alpha-value>)',
          700: 'rgb(var(--primary-dark) / <alpha-value>)',
          800: 'rgb(var(--primary-dark) / <alpha-value>)',
          900: 'rgb(var(--primary-darker) / <alpha-value>)',
        },
        secondary: {
          100: customColors.secondary.lighter,
          200: customColors.secondary.lighter,
          300: customColors.secondary.light,
          400: customColors.secondary.light,
          500: customColors.secondary.main,
          600: customColors.secondary.main,
          700: customColors.secondary.dark,
          800: customColors.secondary.dark,
          900: customColors.secondary.darker,
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
  ],
};
