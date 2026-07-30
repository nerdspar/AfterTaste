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
        primary: {
          100: customColors.primary.lighter,
          200: customColors.primary.lighter,
          300: customColors.primary.light,
          400: customColors.primary.light,
          500: customColors.primary.main,
          600: customColors.primary.main,
          700: customColors.primary.dark,
          800: customColors.primary.dark,
          900: customColors.primary.darker,
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
