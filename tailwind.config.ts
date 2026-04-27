import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand colors — Synced from agendapadelpt
        "padel-green": "#0E7C66",
        "padel-green-dark": "#0a6354",
        "padel-green-light": "#d1fae5",
        "brand-lime": "#A3E635",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
