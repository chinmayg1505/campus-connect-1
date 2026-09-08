import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1E3A5F",
          hover: "#16304F",
          light: "#E8EDF3",
        },
        secondary: {
          DEFAULT: "#3B82F6",
          hover: "#2E6FDB",
          light: "#DBEAFE",
        },
        accent: {
          DEFAULT: "#0D9488",
          hover: "#0B7C72",
          light: "#CCFBF1",
        },
        background: "#F8FAFC",
        surface: "#FFFFFF",
        "text-primary": "#0F172A",
        "text-secondary": "#64748B",
        border: "#E2E8F0",
        danger: "#DC2626",
        "danger-light": "#FEE2E2",
        warning: "#D97706",
        "warning-light": "#FEF3C7",
        success: "#16A34A",
        "success-light": "#DCFCE7",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
