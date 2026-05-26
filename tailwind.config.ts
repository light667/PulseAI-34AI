import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-syne)", "Syne", "sans-serif"],
        body: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
      },
      colors: {
        pulse: {
          bg: "var(--pulse-bg-primary)",
          card: "var(--pulse-bg-secondary)",
          green: "var(--pulse-accent-green)",
          orange: "var(--pulse-accent-orange)",
          blue: "var(--pulse-accent-blue)",
          fg: "var(--pulse-fg)",
          muted: "var(--pulse-fg-muted)",
          dim: "var(--pulse-fg-dim)",
        },
      },
    },
  },
  plugins: [],
};

export default config;

