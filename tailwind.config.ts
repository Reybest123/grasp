import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // Subject gradient/tint classes are declared here, not in JSX.
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f1222",
        brand: {
          50: "#eef0ff",
          100: "#e0e3ff",
          200: "#c7ccff",
          300: "#a3a9ff",
          400: "#7c7cf7",
          500: "#6257ef",
          600: "#4f3fd6",
          700: "#4231ad",
          800: "#382b8b",
          900: "#302870",
        },
        accent: {
          400: "#ffb454",
          500: "#ff9d2e",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(24, 24, 64, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
