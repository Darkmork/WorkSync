/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0058be",
        "primary-container": "#2170e4",
        secondary: "#0060ac",
        "secondary-container": "#64a8fe",
        tertiary: "#006b2c",
        background: "#f8f9fa",
        surface: "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#424754",
        outline: "#727785",
        "outline-variant": "#c2c6d6",
        "border-subtle": "#e5e7eb",
        "text-secondary": "#6b7280",
        "status-free": "#4ade80",
        "status-occupied": "#9ca3af",
        "status-preferred": "#60a5fa",
        "status-avoid": "#fde047",
        "error-red": "#dc2626",
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
      },
      boxShadow: {
        soft: "0 4px 10px rgba(0, 88, 190, 0.04)",
        lift: "0 14px 40px rgba(0, 88, 190, 0.12)",
      },
    },
  },
  plugins: [],
};

