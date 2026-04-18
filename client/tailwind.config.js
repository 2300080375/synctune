/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: "#7c6cfa",
        secondary: "#fa6c9a",

        dark: {
          50: "#e8e8f0",
          100: "#d1d1e0",
          200: "#a3a3c1",
          300: "#7575a3",
          400: "#4a4a84",
          500: "#2a2a3d",
          600: "#1c1c2a",
          700: "#13131c",
          800: "#0a0a0f",
        },
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      boxShadow: {
        glow: "0 0 20px rgba(124, 108, 250, 0.4)",
      },

      backdropBlur: {
        xs: "2px",
      },

      animation: {
        fade: "fadeIn 0.4s ease-in-out",
        pulseSoft: "pulseSoft 1.5s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },

        pulseSoft: {
          "0%, 100%": { opacity: 0.6 },
          "50%": { opacity: 1 },
        },
      },
    },
  },

  plugins: [],
};