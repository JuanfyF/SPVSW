/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        // Surface system (Material Design 3)
        surface: {
          DEFAULT: "#FFFBF5",
          dim: "#E8DFD4",
          bright: "#FFFBF5",
          "container-lowest": "#FFFFFF",
          "container-low": "#FFF5EC",
          container: "#FFEFE3",
          "container-high": "#FFE9D8",
          "container-highest": "#FFE3CD",
        },
        "on-surface": "#1C1710",
        "on-surface-variant": "#4D4039",
        "inverse-surface": "#322E27",
        "inverse-on-surface": "#F9EFE2",
        outline: "#7F6E62",
        "outline-variant": "#D0C4B8",

        // Primary (Chocolate Brown from logo text)
        primary: {
          DEFAULT: "#6B3A1F",
          container: "#8B4513",
          fixed: "#F5DEC4",
          "fixed-dim": "#D4A574",
        },
        "on-primary": "#FFFFFF",
        "on-primary-container": "#FFF8F0",
        "on-primary-fixed": "#2A1508",
        "on-primary-fixed-variant": "#522C15",
        "inverse-primary": "#D4A574",

        // Secondary (Pink/Magenta from cupcake frosting)
        secondary: {
          DEFAULT: "#C2185B",
          container: "#E91E63",
          fixed: "#FFD9E4",
          "fixed-dim": "#F8B4CC",
        },
        "on-secondary": "#FFFFFF",
        "on-secondary-container": "#C2185B",
        "on-secondary-fixed": "#3D0A1A",
        "on-secondary-fixed-variant": "#8E0F3D",

        // Tertiary (Fresh Green from logo plate)
        tertiary: {
          DEFAULT: "#7CB342",
          container: "#9CCC65",
          fixed: "#E8F5C9",
          "fixed-dim": "#C5E1A5",
        },
        "on-tertiary": "#FFFFFF",
        "on-tertiary-container": "#7CB342",
        "on-tertiary-fixed": "#1A3D0A",
        "on-tertiary-fixed-variant": "#558B2F",

        // Error
        error: {
          DEFAULT: "#D32F2F",
          container: "#FFCDD2",
        },
        "on-error": "#FFFFFF",
        "on-error-container": "#B71C1C",

        // Semantic aliases (DESIGN.md)
        "page-bg": "#FFFBF5",
        "sidebar-bg": "#FFEFE3",
        "text-main": "#1C1710",
        "text-muted": "#7F6E62",

        // Legacy aliases (compatibility)
        crema: "#FFFBF5",
        beige: "#FFEFE3",
        terracota: "#C2185B",
        salvia: "#7CB342",
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
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500", letterSpacing: "0.01em" }],
      },
      boxShadow: {
        "soft-ambient": "0px 10px 30px rgba(28, 23, 16, 0.08)",
        modal: "0px 10px 30px rgba(28, 23, 16, 0.08)",
      },
    },
  },
  plugins: [],
};
