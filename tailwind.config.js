/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#F07B2A',
        'primary-dark': '#d4621a',
        'primary-light': '#fde9d4',
      },
    },
  },
  plugins: [],
}
