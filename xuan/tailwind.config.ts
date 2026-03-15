import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy base (not pure black — has blue undertone like Linear)
        surface: {
          DEFAULT: "#0A0E1A",
          secondary: "#0F1423",
          card: "#131825",
          elevated: "#1A2035",
          muted: "#242B3D",
          border: "#1E2538",
        },
        // Text hierarchy
        content: {
          primary: "#F1F3F9",
          secondary: "#8B92A8",
          tertiary: "#5C6478",
          disabled: "#3D4558",
          inverse: "#0A0E1A",
        },
        // Accent: indigo-violet gradient
        accent: {
          DEFAULT: "#6366F1",
          light: "#818CF8",
          dark: "#4F46E5",
          muted: "rgba(99,102,241,0.15)",
        },
        // Success/money green
        emerald: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
          muted: "rgba(16,185,129,0.15)",
        },
        // Warning
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          muted: "rgba(245,158,11,0.15)",
        },
        // Danger
        rose: {
          DEFAULT: "#EF4444",
          light: "#F87171",
          muted: "rgba(239,68,68,0.15)",
        },
        // Gold accent (for 玄 character and premium elements)
        gold: {
          DEFAULT: "#C9A227",
          light: "#FFD54D",
          muted: "rgba(201,162,39,0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        serif: ['"Playfair Display"', "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        glow: "0 0 20px -4px rgba(99,102,241,0.3)",
        "glow-emerald": "0 0 20px -4px rgba(16,185,129,0.3)",
        "glow-gold": "0 0 20px -4px rgba(201,162,39,0.2)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        elevated: "0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)",
        glass: "inset 0 0.5px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A78BFA 100%)",
        "gradient-emerald": "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
        "gradient-surface": "linear-gradient(180deg, #0F1423 0%, #0A0E1A 100%)",
        "gradient-glass": "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        "gradient-mesh": "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.06) 0%, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right": "slideInRight 0.4s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2s infinite linear",
        pulse: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideInRight: { from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
export default config;
