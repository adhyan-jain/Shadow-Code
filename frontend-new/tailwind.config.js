/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
        primary: ["Poppins", "sans-serif"],
        heading: ["Days One", "sans-serif"],
        secondary: ["Days One", "sans-serif"],
      },
    },
  },
  plugins: [],
};
