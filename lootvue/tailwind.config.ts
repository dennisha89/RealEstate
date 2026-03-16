import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // True black base — not navy, BLACK
        surface: {
          DEFAULT: "#000000",
          secondary: "#0A0A0A",
          card: "#111111",
          elevated: "#1A1A1A",
          muted: "#252525",
          border: "#1F1F1F",
        },
        // Text
        content: {
          primary: "#FAFAFA",
          secondary: "#999999",
          tertiary: "#666666",
          disabled: "#444444",
          inverse: "#000000",
        },
        // GOLD — the signature accent
        gold: {
          DEFAULT: "#C9A227",
          light: "#E8C547",
          dark: "#9A7B1A",
          muted: "rgba(201,162,39,0.12)",
          bright: "#FFD700",
        },
        // Money green
        emerald: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
          muted: "rgba(16,185,129,0.12)",
        },
        // Warning
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          muted: "rgba(245,158,11,0.12)",
        },
        // Danger
        rose: {
          DEFAULT: "#EF4444",
          light: "#F87171",
          muted: "rgba(239,68,68,0.12)",
        },
        // Accent (gold-based, not indigo)
        accent: {
          DEFAULT: "#C9A227",
          light: "#E8C547",
          dark: "#9A7B1A",
          muted: "rgba(201,162,39,0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -4px rgba(201,162,39,0.25)",
        "glow-emerald": "0 0 20px -4px rgba(16,185,129,0.25)",
        "glow-gold": "0 0 30px -4px rgba(201,162,39,0.3)",
        card: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)",
        elevated: "0 4px 16px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)",
        glass: "inset 0 0.5px 0 0 rgba(255,255,255,0.04)",
        // Luxury glassmorphic shadows
        "glass-ambient": "0 4px 30px rgba(0, 0, 0, 0.3)",
        "glass-hover": "0 8px 40px rgba(0, 0, 0, 0.4)",
        "gold-glow": "0 0 20px rgba(201, 162, 39, 0.15)",
        "gold-glow-lg": "0 0 40px rgba(201, 162, 39, 0.25)",
        "elevated-lg": "0 4px 20px rgba(0, 0, 0, 0.6)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #9A7B1A 0%, #C9A227 50%, #E8C547 100%)",
        "gradient-emerald": "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
        "gradient-surface": "linear-gradient(180deg, #0A0A0A 0%, #000000 100%)",
        "gradient-mesh": "radial-gradient(ellipse at 30% 20%, rgba(201,162,39,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.04) 0%, transparent 50%)",
      },
      animation: {
        // Existing
        "fade-in": "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2s infinite linear",
        // Luxury additions
        "fade-in-fast": "fadeIn 300ms ease-out",
        "slide-up-fast": "slideUpFast 300ms ease-out",
        "slide-down": "slideDown 200ms ease-out",
        "scale-in-fast": "scaleInFast 200ms ease-out",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "shimmer-gold": "shimmer 3s linear infinite",
        "number-up": "numberUp 400ms ease-out",
      },
      keyframes: {
        // Existing
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        // Luxury additions
        slideUpFast: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleInFast: { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(201,162,39,0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(201,162,39,0.3)" },
        },
        numberUp: { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
