import type { Config } from "tailwindcss";

/**
 * LUXURY FINTECH TAILWIND CONFIGURATION
 * "Supreme meets Louis Vuitton meets Bloomberg"
 *
 * Design tokens sourced from lib/design-system.ts
 * See that file for complete philosophy, rules, and component patterns.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // COLORS — Luxury dark palette with blue undertone
      // -----------------------------------------------------------------------
      colors: {
        // Background surfaces — near-black with subtle blue undertone
        surface: {
          DEFAULT:  "#08090E",   // App background — deepest layer
          secondary:"#0E1018",   // Sidebar, secondary panels
          card:     "#141621",   // Card backgrounds
          elevated: "#1A1D2B",   // Hover states, elevated cards, modals
          overlay:  "#222638",   // Dropdowns, popovers, tooltips
          wash:     "#2A2F45",   // Active/pressed states
        },

        // Border colors — subtle separation
        border: {
          subtle:   "#1E2235",   // Default card/section borders
          DEFAULT:  "#2A2F45",   // Interactive element borders
          strong:   "#3D4463",   // Focused/active borders
        },

        // Text colors
        content: {
          primary:  "#F0F0F5",   // Headlines, key numbers
          secondary:"#A0A4B8",   // Body text, descriptions
          tertiary: "#6B7094",   // Labels, timestamps
          disabled: "#454B66",   // Disabled, placeholders
          inverse:  "#08090E",   // Text on light/accent backgrounds
        },

        // Gold — luxury accent (Louis Vuitton / Amex Centurion / Goldman Sachs)
        gold: {
          50:  "#FFF9E6",
          100: "#FFEEB3",
          200: "#FFE280",
          300: "#FFD54D",
          400: "#FFC71A",
          500: "#C9A227",        // Core brand gold
          600: "#A68521",
          700: "#836A1A",
          800: "#604E14",
          900: "#3D320D",
        },

        // Emerald — money/growth accent
        emerald: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",        // Primary positive
          500: "#10B981",        // Core emerald (CTAs)
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },

        // Semantic signal colors
        signal: {
          profit:   "#34D399",   // Green — positive, buy
          loss:     "#F87171",   // Red — negative, avoid
          caution:  "#FBBF24",   // Amber — hold, warning
          info:     "#60A5FA",   // Blue — informational
        },
      },

      // -----------------------------------------------------------------------
      // TYPOGRAPHY
      // -----------------------------------------------------------------------
      fontFamily: {
        display: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        sans:    ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },

      fontSize: {
        "xs":   ["12px", { lineHeight: "16px", letterSpacing: "0.04em" }],
        "sm":   ["14px", { lineHeight: "20px", letterSpacing: "0.02em" }],
        "base": ["16px", { lineHeight: "24px", letterSpacing: "0em" }],
        "lg":   ["18px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "xl":   ["20px", { lineHeight: "28px", letterSpacing: "-0.015em" }],
        "2xl":  ["24px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
        "3xl":  ["30px", { lineHeight: "36px", letterSpacing: "-0.025em" }],
        "4xl":  ["36px", { lineHeight: "40px", letterSpacing: "-0.03em" }],
        "5xl":  ["48px", { lineHeight: "52px", letterSpacing: "-0.035em" }],
        "hero": ["64px", { lineHeight: "68px", letterSpacing: "-0.04em" }],
      },

      letterSpacing: {
        tighter: "-0.04em",
        tight:   "-0.02em",
        normal:  "0em",
        wide:    "0.04em",
        wider:   "0.08em",
        widest:  "0.12em",
      },

      // -----------------------------------------------------------------------
      // BORDER RADIUS — Consistent, premium
      // -----------------------------------------------------------------------
      borderRadius: {
        none: "0px",
        sm:   "6px",          // Buttons, inputs, badges
        DEFAULT: "10px",      // Cards, dropdowns
        md:   "10px",
        lg:   "14px",         // Modals, large cards
        xl:   "20px",         // Feature sections
        full: "9999px",       // Avatars only
      },

      // -----------------------------------------------------------------------
      // SHADOWS — Layered for realistic depth on dark surfaces
      // -----------------------------------------------------------------------
      boxShadow: {
        // Glass edge — top-light inset for material feel
        glass: "inset 0 0.5px 0 0 rgba(255, 255, 255, 0.05)",

        // Subtle elevation — resting cards
        sm: [
          "inset 0 0.5px 0 0 rgba(255, 255, 255, 0.05)",
          "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
          "0 1px 3px 1px rgba(0, 0, 0, 0.15)",
        ].join(", "),

        // Medium elevation — hovered cards, dropdowns
        DEFAULT: [
          "inset 0 0.5px 0 0 rgba(255, 255, 255, 0.08)",
          "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
          "0 2px 6px 2px rgba(0, 0, 0, 0.15)",
        ].join(", "),

        md: [
          "inset 0 0.5px 0 0 rgba(255, 255, 255, 0.08)",
          "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
          "0 2px 6px 2px rgba(0, 0, 0, 0.15)",
        ].join(", "),

        // Large elevation — modals, sheets
        lg: [
          "inset 0 0.5px 0 0 rgba(255, 255, 255, 0.1)",
          "0 4px 8px 3px rgba(0, 0, 0, 0.15)",
          "0 1px 3px 0 rgba(0, 0, 0, 0.3)",
        ].join(", "),

        // XL elevation — full-screen overlays
        xl: [
          "inset 0 0.5px 0 0 rgba(255, 255, 255, 0.1)",
          "0 8px 12px 6px rgba(0, 0, 0, 0.15)",
          "0 4px 4px 0 rgba(0, 0, 0, 0.3)",
        ].join(", "),

        // Accent glows
        "glow-emerald": "0 0 24px -4px rgba(52, 211, 153, 0.2), 0 0 8px -2px rgba(52, 211, 153, 0.1)",
        "glow-gold":    "0 0 24px -4px rgba(201, 162, 39, 0.2), 0 0 8px -2px rgba(201, 162, 39, 0.1)",
        "glow-loss":    "0 0 24px -4px rgba(248, 113, 113, 0.2), 0 0 8px -2px rgba(248, 113, 113, 0.1)",
        "glow-info":    "0 0 24px -4px rgba(96, 165, 250, 0.15), 0 0 8px -2px rgba(96, 165, 250, 0.08)",

        // Gold ring — premium/featured card border effect
        "gold-ring": "0 0 0 1px rgba(201, 162, 39, 0.3), 0 0 16px -4px rgba(201, 162, 39, 0.15)",

        none: "none",
      },

      // -----------------------------------------------------------------------
      // SPACING — Generous, luxurious
      // -----------------------------------------------------------------------
      spacing: {
        "18": "4.5rem",   // 72px
        "22": "5.5rem",   // 88px
        "30": "7.5rem",   // 120px — hero section spacing
        "sidebar": "280px",
      },

      maxWidth: {
        "content": "1440px",
      },

      // -----------------------------------------------------------------------
      // ANIMATIONS — Choreographed, purposeful, premium
      // -----------------------------------------------------------------------
      animation: {
        // Enter animations
        "fade-in":        "fadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-slow":   "fadeIn 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up":       "slideUp 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down":     "slideDown 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":       "scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",

        // Sheet/modal animations (Apple-style spring curve)
        "sheet-up":       "slideUpSheet 500ms cubic-bezier(0.32, 0.72, 0, 1)",

        // Continuous — use sparingly
        "pulse-glow":     "pulseGlow 3s ease-in-out infinite",

        // Number counter (for metric reveals)
        "count-up":       "fadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1)",
      },

      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUpSheet: {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
      },

      // -----------------------------------------------------------------------
      // TRANSITIONS — Consistent timing
      // -----------------------------------------------------------------------
      transitionDuration: {
        "instant": "100ms",
        "fast":    "200ms",
        "normal":  "300ms",
        "slow":    "500ms",
      },

      transitionTimingFunction: {
        "luxury":  "cubic-bezier(0.16, 1, 0.3, 1)",    // Standard ease-out
        "apple":   "cubic-bezier(0.32, 0.72, 0, 1)",   // Apple spring
        "smooth":  "cubic-bezier(0.65, 0, 0.35, 1)",   // Ease-in-out
      },

      // -----------------------------------------------------------------------
      // BACKDROP BLUR — For glassmorphism
      // -----------------------------------------------------------------------
      backdropBlur: {
        xs:   "4px",
        sm:   "8px",
        DEFAULT: "12px",
        md:   "16px",
        lg:   "20px",
        xl:   "32px",
      },
    },
  },
  plugins: [],
};
export default config;
