/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        // Surface system (Material Design 3 — pastel)
        surface: {
          DEFAULT: "#FFF9F2",
          dim: "#EDE5DA",
          bright: "#FFF9F2",
          "container-lowest": "#FFFFFF",
          "container-low": "#FFF0E5",
          container: "#FFE8D8",
          "container-high": "#FFE0CC",
          "container-highest": "#FFD8C0",
        },
        "on-surface": "#1C1710",
        "on-surface-variant": "#4D4039",
        "inverse-surface": "#322E27",
        "inverse-on-surface": "#F9EFE2",
        outline: "#7F6E62",
        "outline-variant": "#D0C4B8",

        // Primary (Chocolate Brown from logo text — pastel)
        primary: {
          DEFAULT: "#7D4A2E",
          container: "#A67349",
          fixed: "#F5DEC4",
          "fixed-dim": "#D4A574",
        },
        "on-primary": "#FFFFFF",
        "on-primary-container": "#FFF8F0",
        "on-primary-fixed": "#2A1508",
        "on-primary-fixed-variant": "#522C15",
        "inverse-primary": "#D4A574",

        // Secondary (Pink/Magenta from cupcake frosting — pastel)
        secondary: {
          DEFAULT: "#D4849E",
          container: "#F2C4D3",
          fixed: "#FFD9E4",
          "fixed-dim": "#F8B4CC",
        },
        "on-secondary": "#FFFFFF",
        "on-secondary-container": "#8E3A5A",
        "on-secondary-fixed": "#3D0A1A",
        "on-secondary-fixed-variant": "#6B2040",

        // Tertiary (Fresh Green from logo plate — pastel)
        tertiary: {
          DEFAULT: "#9ABF7A",
          container: "#C8E6B5",
          fixed: "#E8F5C9",
          "fixed-dim": "#C5E1A5",
        },
        "on-tertiary": "#FFFFFF",
        "on-tertiary-container": "#4A6B30",
        "on-tertiary-fixed": "#1A3D0A",
        "on-tertiary-fixed-variant": "#3D5A25",

        // Error
        error: {
          DEFAULT: "#D32F2F",
          container: "#FFCDD2",
        },
        "on-error": "#FFFFFF",
        "on-error-container": "#B71C1C",

        // Semantic aliases (DESIGN.md)
        "page-bg": "#FFF9F2",
        "sidebar-bg": "#FFE8D8",
        "text-main": "#1C1710",
        "text-muted": "#7F6E62",

        // Legacy aliases (compatibility)
        crema: "#FFF9F2",
        beige: "#FFE8D8",
        terracota: "#D4849E",
        salvia: "#9ABF7A",
        alerta: "#D32F2F",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      spacing: {
        "sidebar-width": "260px",
        "container-gap": "24px",
        "touch-target-min": "56px",
        "gutter-md": "16px",
        "margin-page": "32px",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ['"Plus Jakarta Sans"', "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-price": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-price-mobile": ["36px", { lineHeight: "44px", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700", letterSpacing: "-0.01em" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500", letterSpacing: "0.01em" }],
        "caption": ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
      boxShadow: {
        "soft-ambient": "0px 10px 30px rgba(28, 23, 16, 0.08)",
        modal: "0px 10px 30px rgba(28, 23, 16, 0.08)",
      },
    },
  },
  plugins: [],
};
