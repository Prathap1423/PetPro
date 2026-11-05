import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        gold: { DEFAULT: "hsl(var(--gold) / <alpha-value>)", foreground: "hsl(var(--gold-foreground) / <alpha-value>)" },
        champagne: "hsl(var(--champagne) / <alpha-value>)",
        charcoal: "hsl(var(--charcoal) / <alpha-value>)",
        destructive: "hsl(var(--destructive) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
      },
      borderRadius: { lg: "1.25rem", md: "0.75rem", sm: "0.5rem" },
      fontFamily: { serif: ["Georgia", "Cambria", "serif"] },
    },
  },
  plugins: [],
};
export default config;
