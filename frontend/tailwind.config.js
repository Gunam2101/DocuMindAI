/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0b0f19",
          900: "#101626",
          850: "#151d30",
          800: "#1b253c",
          750: "#222f4c",
          700: "#2b3a5d",
          600: "#3a4e7a",
        },
        accent: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        sky: {
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.2), 0 10px 30px -10px rgba(139,92,246,0.3)",
        "glow-sm": "0 0 15px -3px rgba(139,92,246,0.25)",
        card: "0 4px 20px -2px rgba(0,0,0,0.4), 0 2px 6px -1px rgba(0,0,0,0.2)",
        "card-hover": "0 10px 25px -3px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.3)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem",
      },
    },
  },
  plugins: [],
};
