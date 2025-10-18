import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#262626",
        input: "#262626",
        ring: "#737373",
        background: "#0a0a0a",
        foreground: "#fafafa",
        primary: {
          DEFAULT: "#e5e5e5",
          foreground: "#0a0a0a",
        },
        secondary: {
          DEFAULT: "#1a1a1a",
          foreground: "#fafafa",
        },
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#1a1a1a",
          foreground: "#737373",
        },
        accent: {
          DEFAULT: "#262626",
          foreground: "#fafafa",
        },
        popover: {
          DEFAULT: "#0a0a0a",
          foreground: "#fafafa",
        },
        card: {
          DEFAULT: "#0a0a0a",
          foreground: "#fafafa",
        },
      },
      borderRadius: {
        lg: "2px",
        md: "2px",
        sm: "1px",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "JetBrains Mono",
          "Fira Code",
          "Courier New",
          "monospace",
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

