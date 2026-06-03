/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF9F7',
        card: '#F2F0ED',
        border: '#E5E2DC',
        ink: '#2D2A26',
        muted: '#6B665C',
        placeholder: '#A39E94',
        coral: '#C46B6B',
        sage: '#7BAE7F',
        amber: '#D4976A',
        emerald: '#6B9E87',
      },
    },
  },
  plugins: [],
}
