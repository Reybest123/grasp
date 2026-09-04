import type { Config } from "tailwindcss";

/**
 * Grasp's design tokens.
 *
 * Two deliberate choices here, both load-bearing across every screen:
 *
 * 1. `brand` is the orange from the logo. It is the only saturated colour in
 *    the interface, so it is spent on exactly one thing per screen — the action
 *    the student is meant to take — and never on decoration.
 * 2. `slate` is *overridden*, not extended. Tailwind's own slate is a cool
 *    blue-grey, which fights an orange accent and reads cold beside the navy
 *    ink. These are warm neutrals with a trace of the brand hue in them, so
 *    every surface in the app sits under the accent rather than against it.
 *    The names are kept so the hundreds of existing `slate-*` classes carry
 *    over — read "slate" as "the neutral scale", not as blue-grey.
 */
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
        // The navy of the notebook in the logo. Headings and primary text.
        ink: "#0b2340",
        brand: {
          50: "#fff5f1",
          100: "#ffe8df",
          200: "#ffcdbb",
          300: "#ffa98c",
          400: "#fb815b",
          500: "#f26134",
          600: "#dc4a20",
          700: "#b63a18",
          800: "#8f3116",
          900: "#742c17",
          950: "#3f140a",
        },
        slate: {
          50: "#f8f7f5",
          100: "#f2f0ec",
          200: "#e6e2dc",
          300: "#d3cdc4",
          400: "#aba49a",
          500: "#837c72",
          600: "#635d55",
          700: "#4a453f",
          800: "#33302b",
          900: "#201e1b",
          950: "#131211",
        },
        accent: {
          400: "#ffb454",
          500: "#ff9d2e",
        },
      },
      fontFamily: {
        // Set on <html> by next/font in app/layout.tsx.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        // Tinted with the ink rather than pure black, so a lifted card reads as
        // sitting on warm paper instead of being cut out of it.
        soft: "0 10px 34px -14px rgba(11, 35, 64, 0.22)",
        lift: "0 18px 48px -20px rgba(11, 35, 64, 0.28)",
        ring: "0 1px 2px rgba(11, 35, 64, 0.05)",
      },
      backgroundImage: {
        "brand-tile": "linear-gradient(145deg, #fb815b 0%, #f26134 55%, #dc4a20 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
