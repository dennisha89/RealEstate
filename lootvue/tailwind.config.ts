import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Light base — true white/light gray surfaces
        surface: {
          DEFAULT: "#F5F5F5",
          secondary: "#F3F4F6",
          card: "#FFFFFF",
          elevated: "#F9FAFB",
          muted: "#E5E7EB",
          border: "#E5E7EB",
        },
        // Text — dark on light
        content: {
          primary: "#111111",
          secondary: "#4B5563",
          tertiary: "#6B7280",
          disabled: "#9CA3AF",
          inverse: "#FFFFFF",
        },
        // ORANGE — the signature accent
        gold: {
          DEFAULT: "#22C55E",
          light: "#34D399",
          dark: "#16A34A",
          muted: "rgba(34,197,94,0.10)",
          bright: "#FF8C42",
        },
        // Money green
        emerald: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
          muted: "rgba(16,185,129,0.10)",
        },
        // Warning
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          muted: "rgba(245,158,11,0.10)",
        },
        // Danger
        rose: {
          DEFAULT: "#EF4444",
          light: "#F87171",
          muted: "rgba(239,68,68,0.10)",
        },
        // Accent (orange-based)
        accent: {
          DEFAULT: "#22C55E",
          light: "#34D399",
          dark: "#16A34A",
          muted: "rgba(34,197,94,0.10)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        glow: "0 1px 3px rgba(0,0,0,0.08)",
        "glow-emerald": "0 1px 3px rgba(0,0,0,0.08)",
        "glow-gold": "0 1px 3px rgba(0,0,0,0.08)",
        card: "0 1px 3px rgba(0,0,0,0.06)",
        elevated: "0 2px 8px rgba(0,0,0,0.06)",
        glass: "none",
        // Light-theme elevation shadows
        "glass-ambient": "0 1px 3px rgba(0,0,0,0.08)",
        "glass-hover": "0 4px 12px rgba(0,0,0,0.10)",
        "gold-glow": "0 1px 3px rgba(0,0,0,0.08)",
        "gold-glow-lg": "0 2px 8px rgba(0,0,0,0.10)",
        "elevated-lg": "0 4px 16px rgba(0,0,0,0.08)",
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
        "gradient-gold": "linear-gradient(135deg, #16A34A 0%, #22C55E 50%, #34D399 100%)",
        "gradient-emerald": "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
        "gradient-surface": "linear-gradient(180deg, #F5F5F5 0%, #FFFFFF 100%)",
        "gradient-mesh": "radial-gradient(ellipse at 30% 20%, rgba(34,197,94,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.03) 0%, transparent 50%)",
      },
      animation: {
        // Existing
        "fade-in": "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2s infinite linear",
        // Additions
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
        // Additions
        slideUpFast: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleInFast: { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        glowPulse: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
        numberUp: { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
