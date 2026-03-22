/**
 * LUXURY FINTECH DESIGN SYSTEM
 * "Supreme meets Louis Vuitton meets Bloomberg"
 *
 * Design philosophy: Restraint, precision, and emotional depth.
 * Every pixel earns its place. Nothing decorative — everything communicative.
 *
 * Researched from: Fey, Apple Card, Stripe, Mercury, Ramp, Brex, Bloomberg,
 * Amex Centurion, JP Morgan Private Bank, Goldman Sachs Marcus, Revolut,
 * N26 Metal, Louis Vuitton, Supreme, Wealthfront
 *
 * KEY PRINCIPLES:
 * 1. RESTRAINT — Luxury is what you leave out, not what you add
 * 2. DEPTH — Layered surfaces with subtle elevation, not flat cards
 * 3. PRECISION — Sub-pixel perfection in spacing, alignment, typography
 * 4. MOTION — Choreographed, not chaotic. Slow, smooth, purposeful
 * 5. DENSITY — Show less, mean more. One number > ten numbers
 * 6. MATERIALS — Glass, metal, depth. Not paper, not plastic
 *
 * WHAT EXPENSIVE APPS DO:
 * - Double/triple spacing between elements (breathing room)
 * - Serif + sans-serif font pairing (heritage + modernity)
 * - Near-black backgrounds, never pure #000000
 * - Single accent color used sparingly (gold or emerald, not both screaming)
 * - Layered shadows that simulate real light physics
 * - Animations at 0.2-0.4s with easeOut curves (responsive, not sluggish)
 * - Inset borders with low-opacity whites (glass edge effect)
 * - Custom scrollbars, custom selections, custom cursors
 * - Editorial photography, never stock illustrations
 *
 * WHAT CHEAP APPS DO (AVOID ALL OF THESE):
 * - Saturated gradients on everything (rainbow vomit)
 * - Pure black #000000 backgrounds (harsh, flat, cheap OLED look)
 * - Too many colors competing for attention
 * - Rounded-full on everything (pill buttons everywhere = toy)
 * - Drop shadows with visible offset (dated, Windows Vista)
 * - Bounce/spring animations on everything (playful ≠ premium)
 * - Thin 1px borders on every element (wireframe look)
 * - System font only with no typographic hierarchy
 * - Emoji as UI elements
 * - Gradient backgrounds behind text (readability killer)
 * - Comic/playful illustrations (Notion-style blobs)
 * - Loading spinners instead of skeleton screens
 * - Success/error banners that look like Bootstrap alerts
 * - Crowded layouts with no breathing room
 * - Inconsistent border radius across components
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * COLOR PHILOSOPHY:
 * - Near-black with blue undertone for depth (not warm gray, not pure black)
 * - Gold as the luxury accent (Louis Vuitton, Amex Centurion, Goldman Sachs)
 * - Emerald as the action/positive accent (money, growth, confidence)
 * - Minimal palette: 90% neutrals, 8% emerald, 2% gold
 *
 * SURFACE ELEVATION (Apple dark mode pattern):
 * Each elevation step adds ~4-6% more white to the surface.
 * This creates perceived depth without visible shadows on dark backgrounds.
 */
export const colors = {
  // ---------------------------------------------------------------------------
  // BACKGROUND SURFACES — Near-black with subtle blue undertone
  // Progression: darkest base → elevated surfaces → interactive states
  // ---------------------------------------------------------------------------
  background: {
    primary:   '#08090E',  // App background — deepest layer. NOT #000000.
    secondary: '#0E1018',  // Sidebar, secondary panels
    tertiary:  '#141621',  // Card backgrounds, content areas
    elevated:  '#1A1D2B',  // Hover states, elevated cards, modals
    overlay:   '#222638',  // Dropdown menus, popovers, tooltips
    wash:      '#2A2F45',  // Active/pressed states, selected items
  },

  // ---------------------------------------------------------------------------
  // BORDER COLORS — Subtle separation, never harsh lines
  // Key rule: borders should be FELT, not SEEN
  // ---------------------------------------------------------------------------
  border: {
    subtle:    '#1E2235',  // Default card/section borders — barely visible
    default:   '#2A2F45',  // Interactive element borders
    strong:    '#3D4463',  // Focused/active element borders
    accent:    '#C9A227',  // Gold accent border for premium elements ONLY
  },

  // ---------------------------------------------------------------------------
  // TEXT COLORS — High contrast primaries, muted secondaries
  // Never use pure #FFFFFF — it causes halation on dark backgrounds
  // ---------------------------------------------------------------------------
  text: {
    primary:   '#F0F0F5',  // Headlines, key numbers, primary content
    secondary: '#A0A4B8',  // Body text, descriptions, secondary info
    tertiary:  '#6B7094',  // Labels, timestamps, metadata
    disabled:  '#454B66',  // Disabled states, placeholders
    inverse:   '#08090E',  // Text on light/accent backgrounds
  },

  // ---------------------------------------------------------------------------
  // ACCENT: GOLD — The "luxury" signal
  // Use SPARINGLY: premium badges, key metrics, borders on hero cards
  // Louis Vuitton: #9C7D49 | Goldman Sachs: gold tones | Amex: titanium
  // ---------------------------------------------------------------------------
  gold: {
    50:  '#FFF9E6',        // Lightest tint — backgrounds of gold badges
    100: '#FFEEB3',
    200: '#FFE280',
    300: '#FFD54D',
    400: '#FFC71A',        // Primary gold — icons, small accents
    500: '#C9A227',        // Core brand gold — borders, premium indicators
    600: '#A68521',        // Text on light backgrounds
    700: '#836A1A',
    800: '#604E14',
    900: '#3D320D',        // Darkest — subtle gold tint on surfaces
  },

  // ---------------------------------------------------------------------------
  // ACCENT: EMERALD — The "money/growth" signal
  // Use for: positive metrics, buy signals, profit indicators, CTAs
  // NOT for decorative backgrounds — only for meaning
  // ---------------------------------------------------------------------------
  emerald: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',        // Primary emerald — icons, positive numbers
    500: '#10B981',        // Core emerald — buttons, key positive metrics
    600: '#059669',        // Hover state for emerald elements
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',        // Dark emerald — subtle positive tint
  },

  // ---------------------------------------------------------------------------
  // SEMANTIC: SIGNAL COLORS — Financial meaning, not decoration
  // ---------------------------------------------------------------------------
  signal: {
    profit:    '#34D399',  // Positive cash flow, price up, buy
    loss:      '#F87171',  // Negative cash flow, price down, avoid
    caution:   '#FBBF24',  // Hold, warnings, needs attention
    info:      '#60A5FA',  // Informational, neutral data
    neutral:   '#A0A4B8',  // No signal, baseline
  },

  // ---------------------------------------------------------------------------
  // GLASS EFFECTS — For glassmorphism overlays
  // ---------------------------------------------------------------------------
  glass: {
    white5:    'rgba(255, 255, 255, 0.05)',  // Subtle surface lift
    white8:    'rgba(255, 255, 255, 0.08)',  // Card hover
    white12:   'rgba(255, 255, 255, 0.12)',  // Active states
    white20:   'rgba(255, 255, 255, 0.20)',  // Prominent glass
    black40:   'rgba(0, 0, 0, 0.40)',        // Overlay/scrim
    black60:   'rgba(0, 0, 0, 0.60)',        // Modal backdrop
  },
} as const;


// =============================================================================
// TYPOGRAPHY
// =============================================================================

/**
 * TYPOGRAPHY PHILOSOPHY:
 * - DISPLAY/HERO: Playfair Display (serif) — Heritage, trust, luxury
 *   Louis Vuitton uses serifs. Goldman Sachs uses serifs. JP Morgan uses serifs.
 *   Serifs say "we've been here, we'll be here."
 *
 * - BODY/UI: Inter — Clean, precise, screen-optimized
 *   Apple uses SF Pro (Inter's twin). Stripe uses Inter. Mercury uses Inter.
 *   Inter says "we're modern, we're precise."
 *
 * - DATA/NUMBERS: JetBrains Mono — Tabular figures, aligned decimals
 *   Bloomberg uses monospace for numbers. Every terminal does.
 *   Monospace numbers say "every digit is exact."
 *
 * FONT IMPORT:
 * @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
 *
 * TYPE SCALE (1.250 ratio — "Major Third"):
 * More restrained than 1.333/Perfect Fourth. Luxury doesn't shout.
 */
export const typography = {
  fontFamily: {
    display: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
    sans:    ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
    mono:    ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
  },

  // Scale based on 1.250 ratio (Major Third) from 16px base
  fontSize: {
    'xs':     ['12px', { lineHeight: '16px', letterSpacing: '0.04em' }],
    'sm':     ['14px', { lineHeight: '20px', letterSpacing: '0.02em' }],
    'base':   ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
    'lg':     ['18px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
    'xl':     ['20px', { lineHeight: '28px', letterSpacing: '-0.015em' }],
    '2xl':    ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
    '3xl':    ['30px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
    '4xl':    ['36px', { lineHeight: '40px', letterSpacing: '-0.03em' }],
    '5xl':    ['48px', { lineHeight: '52px', letterSpacing: '-0.035em' }],
    'hero':   ['64px', { lineHeight: '68px', letterSpacing: '-0.04em' }],
  },

  // Font weights — be deliberate. Not every weight for every use.
  fontWeight: {
    light:    300,    // Large display text only — never for body
    regular:  400,    // Body text, descriptions
    medium:   500,    // Labels, subtitles, emphasized body
    semibold: 600,    // Section headers, card titles, navigation
    bold:     700,    // Page titles, hero numbers, primary CTAs
  },

  /**
   * TRACKING (letter-spacing) RULES:
   * - NEGATIVE tracking for large text (headings): -0.02em to -0.04em
   *   This tightens display text for a refined, editorial look.
   * - POSITIVE tracking for small text (labels, metadata): +0.02em to +0.06em
   *   This opens up small text for readability.
   * - ZERO tracking for body text (16px base): 0em
   *   Body text reads best at natural spacing.
   * - ALL-CAPS text: +0.08em to +0.12em
   *   Uppercase ALWAYS needs extra tracking or it looks cramped.
   */
  letterSpacing: {
    tighter: '-0.04em',   // Hero/display (48px+)
    tight:   '-0.02em',   // Headings (24-48px)
    normal:  '0em',       // Body text (16-18px)
    wide:    '0.04em',    // Small text, metadata (12-14px)
    wider:   '0.08em',    // Uppercase labels, badges
    widest:  '0.12em',    // Uppercase decorative (section labels)
  },
} as const;


// =============================================================================
// SPACING
// =============================================================================

/**
 * SPACING PHILOSOPHY:
 * Luxury = generous space. Every element breathes.
 * Use the 4px grid (Tailwind default) but favor LARGER values.
 *
 * Rule of thumb: if it looks right, add 50% more space.
 * Cheap apps: 12px padding in cards. Premium apps: 24-32px.
 * Cheap apps: 8px between elements. Premium apps: 16-24px.
 *
 * SECTION SPACING:
 * - Between major sections: 64-96px (py-16 to py-24)
 * - Between cards in a grid: 24px (gap-6)
 * - Inside cards: 24-32px (p-6 to p-8)
 * - Between related elements: 12-16px (gap-3 to gap-4)
 * - Between label and value: 4-8px (gap-1 to gap-2)
 */
export const spacing = {
  // Component-internal spacing
  card: {
    padding: {
      sm: '16px',     // Compact cards (sidebar items)
      md: '24px',     // Standard cards
      lg: '32px',     // Hero cards, featured content
      xl: '40px',     // Full-width hero sections
    },
    gap: {
      tight:  '8px',  // Between closely related items (label + value)
      normal: '16px', // Between card content sections
      loose:  '24px', // Between distinct card sections
    },
  },

  // Layout spacing
  layout: {
    sectionGap:   '80px',   // Between major page sections
    cardGrid:     '24px',   // Between cards in a grid
    sidebarWidth: '280px',  // Sidebar width
    maxContent:   '1440px', // Max content width
    pageMargin:   '32px',   // Page edge margin (mobile: 16px)
  },

  // Minimum touch targets (accessibility)
  touch: {
    minimum: '44px',        // Apple HIG minimum
    comfortable: '48px',    // Comfortable tap target
  },
} as const;


// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * BORDER RADIUS PHILOSOPHY:
 * Consistent radius creates visual harmony.
 * Rule: outer container radius > inner element radius.
 * Never use rounded-full for rectangular containers (looks toyish).
 * Reserve rounded-full for avatars and circular icons only.
 */
export const borderRadius = {
  none: '0px',
  sm:   '6px',       // Buttons, inputs, badges, small elements
  md:   '10px',      // Cards, dropdowns, tooltips
  lg:   '14px',      // Modals, large cards, hero containers
  xl:   '20px',      // Page-level containers, feature sections
  full: '9999px',    // Avatars, circular icons ONLY
} as const;


// =============================================================================
// SHADOWS
// =============================================================================

/**
 * SHADOW PHILOSOPHY:
 * On dark backgrounds, traditional drop shadows are nearly invisible.
 * Instead, luxury dark UI uses:
 *
 * 1. INSET WHITE BORDERS (glass edge effect) — simulates light catching an edge
 *    `inset 0 0 0.5px 1px hsla(0, 0%, 100%, 0.075)`
 *
 * 2. SUBTLE GLOW — colored shadow to indicate state/importance
 *    `0 0 20px rgba(52, 211, 153, 0.15)` (emerald glow)
 *
 * 3. LAYERED DARK SHADOWS — for modals/dropdowns that need to float
 *    Multiple layers from tight (contact) to wide (ambient)
 *
 * Josh Comeau's layered shadow technique for natural light simulation.
 */
export const shadows = {
  // No shadow — flat on surface
  none: 'none',

  // Glass edge — simulates light catching the top/left edge of a card
  // Use on ALL cards and elevated surfaces
  glass: 'inset 0 0.5px 0 0 rgba(255, 255, 255, 0.05)',

  // Subtle elevation — cards resting on surface
  sm: [
    'inset 0 0.5px 0 0 rgba(255, 255, 255, 0.05)',
    '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '0 1px 3px 1px rgba(0, 0, 0, 0.15)',
  ].join(', '),

  // Medium elevation — hovered cards, dropdowns
  md: [
    'inset 0 0.5px 0 0 rgba(255, 255, 255, 0.08)',
    '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '0 2px 6px 2px rgba(0, 0, 0, 0.15)',
  ].join(', '),

  // Large elevation — modals, sheets
  lg: [
    'inset 0 0.5px 0 0 rgba(255, 255, 255, 0.1)',
    '0 4px 8px 3px rgba(0, 0, 0, 0.15)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
  ].join(', '),

  // XL elevation — full-screen modals, overlays
  xl: [
    'inset 0 0.5px 0 0 rgba(255, 255, 255, 0.1)',
    '0 8px 12px 6px rgba(0, 0, 0, 0.15)',
    '0 4px 4px 0 rgba(0, 0, 0, 0.3)',
  ].join(', '),

  // Accent glows — use for key metrics and interactive emphasis
  glow: {
    emerald: '0 0 24px -4px rgba(52, 211, 153, 0.2), 0 0 8px -2px rgba(52, 211, 153, 0.1)',
    gold:    '0 0 24px -4px rgba(201, 162, 39, 0.2), 0 0 8px -2px rgba(201, 162, 39, 0.1)',
    loss:    '0 0 24px -4px rgba(248, 113, 113, 0.2), 0 0 8px -2px rgba(248, 113, 113, 0.1)',
    info:    '0 0 24px -4px rgba(96, 165, 250, 0.15), 0 0 8px -2px rgba(96, 165, 250, 0.08)',
  },

  // Gold border glow — for premium/featured cards
  goldRing: '0 0 0 1px rgba(201, 162, 39, 0.3), 0 0 16px -4px rgba(201, 162, 39, 0.15)',
} as const;


// =============================================================================
// GLASS / BLUR EFFECTS
// =============================================================================

/**
 * GLASSMORPHISM RULES:
 * - Use on OVERLAYS only (modals, dropdowns, navigation)
 * - NOT on every card (overuse kills the effect and tanks performance)
 * - Always pair with a subtle white border (glass edge)
 * - Background must have visual content underneath for the blur to matter
 * - Test on lower-end devices — backdrop-blur is GPU-expensive
 */
export const glass = {
  // Subtle frost — sidebar, persistent panels
  subtle: {
    background: 'rgba(14, 16, 24, 0.75)',
    backdropBlur: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },

  // Standard glass — dropdowns, popovers
  standard: {
    background: 'rgba(14, 16, 24, 0.65)',
    backdropBlur: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },

  // Heavy glass — modals, command palette
  heavy: {
    background: 'rgba(14, 16, 24, 0.85)',
    backdropBlur: '32px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  // Scrim — behind modals, covers entire viewport
  scrim: {
    background: 'rgba(0, 0, 0, 0.6)',
    backdropBlur: '4px',
  },
} as const;


// =============================================================================
// ANIMATION / MOTION
// =============================================================================

/**
 * MOTION PHILOSOPHY:
 * Luxury motion is CHOREOGRAPHY — purposeful, measured, elegant.
 * Not a dance party. Not a bounce house.
 *
 * RULES:
 * 1. Enter transitions: easeOut (fast start, gentle land)
 * 2. Exit transitions: easeIn (gentle start, fast disappear)
 * 3. Layout shifts: easeInOut (smooth both ways)
 * 4. Micro-interactions: 150-200ms (instant feel)
 * 5. Content transitions: 250-350ms (noticeable but not slow)
 * 6. Page transitions: 400-600ms (cinematic)
 * 7. NEVER use bounce/spring for financial data (money doesn't bounce)
 * 8. Stagger children by 50ms for list animations
 *
 * Fey's approach: "every animation is choreographed" — follow this.
 * Apple's approach: "delight through subtlety" — follow this.
 * Bloomberg's approach: "data appears, doesn't dance" — follow this.
 */
export const motion = {
  // Durations
  duration: {
    instant:  '100ms',   // Hover color changes, opacity toggles
    fast:     '200ms',   // Button press, checkbox toggle, tooltip appear
    normal:   '300ms',   // Card expand, dropdown open, page element enter
    slow:     '500ms',   // Modal open/close, page transition
    cinematic: '800ms',  // Hero section reveal, first-load animations
  },

  // Easing curves — CSS cubic-bezier values
  easing: {
    // Standard ease-out: "responsive" — use for entering elements
    out:       'cubic-bezier(0.16, 1, 0.3, 1)',

    // Ease-in: "departing" — use for exiting elements
    in:        'cubic-bezier(0.55, 0, 1, 0.45)',

    // Ease-in-out: "moving" — use for layout transitions
    inOut:     'cubic-bezier(0.65, 0, 0.35, 1)',

    // Apple-style spring: natural deceleration without bounce
    // This is the hero easing — use for modals, sheets, important reveals
    apple:     'cubic-bezier(0.32, 0.72, 0, 1)',

    // Linear: ONLY for progress bars and loading indicators
    linear:    'linear',
  },

  // Stagger delays for list/grid animations
  stagger: {
    fast:   50,   // ms between each child
    normal: 75,
    slow:   100,
  },

  // Framer Motion spring configs (if using framer-motion)
  spring: {
    // Gentle — modals, drawers, sheets
    gentle: { type: 'spring' as const, stiffness: 200, damping: 30, mass: 1 },

    // Snappy — dropdowns, tooltips, small elements
    snappy: { type: 'spring' as const, stiffness: 400, damping: 35, mass: 0.8 },

    // Smooth — page transitions, large layout shifts
    smooth: { type: 'spring' as const, stiffness: 150, damping: 25, mass: 1.2 },
  },

  // Common animation presets for Framer Motion
  presets: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit:    { opacity: 0 },
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    },
    slideUp: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      exit:    { opacity: 0, y: 8 },
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
    slideDown: {
      initial: { opacity: 0, y: -8 },
      animate: { opacity: 1, y: 0 },
      exit:    { opacity: 0, y: -4 },
      transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit:    { opacity: 0, scale: 0.98 },
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    },
    // Stagger container — wrap children with this
    staggerContainer: {
      animate: { transition: { staggerChildren: 0.06 } },
    },
    staggerChild: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  },
} as const;


// =============================================================================
// COMPONENT PATTERNS
// =============================================================================

/**
 * Tailwind class patterns for common components.
 * These are REFERENCE PATTERNS — copy the classes, don't import these strings.
 * Documented here so every developer builds components the same way.
 */
export const componentPatterns = {
  // ---------------------------------------------------------------------------
  // CARDS
  // ---------------------------------------------------------------------------
  card: {
    // Standard card — most common pattern
    base: [
      'bg-[#141621]',             // Surface tertiary
      'border border-[#1E2235]',  // Subtle border
      'rounded-[10px]',           // md radius
      'p-6',                      // 24px padding
      'shadow-sm',                // Custom shadow-sm from theme
      'transition-all duration-200 ease-out',
    ].join(' '),

    // Hoverable card — for clickable/interactive cards
    hoverable: [
      'bg-[#141621]',
      'border border-[#1E2235]',
      'rounded-[10px]',
      'p-6',
      'shadow-sm',
      'transition-all duration-200 ease-out',
      'hover:bg-[#1A1D2B]',       // Elevate on hover
      'hover:border-[#2A2F45]',   // Stronger border on hover
      'hover:shadow-md',          // Lift shadow
      'cursor-pointer',
    ].join(' '),

    // Premium/featured card — gold accent border
    premium: [
      'bg-[#141621]',
      'border border-[rgba(201,162,39,0.3)]',  // Gold border
      'rounded-[10px]',
      'p-6',
      'shadow-[0_0_0_1px_rgba(201,162,39,0.3),0_0_16px_-4px_rgba(201,162,39,0.15)]',
    ].join(' '),

    // Glass card — for overlays with content behind them
    glass: [
      'bg-[rgba(14,16,24,0.65)]',
      'backdrop-blur-[20px]',
      'border border-[rgba(255,255,255,0.08)]',
      'rounded-[10px]',
      'p-6',
    ].join(' '),

    // Metric card — for KPI/number display
    metric: [
      'bg-[#141621]',
      'border border-[#1E2235]',
      'rounded-[10px]',
      'p-5',
      'flex flex-col gap-2',
      // Label: text-xs uppercase tracking-widest text-[#6B7094]
      // Value: text-2xl font-bold font-mono text-[#F0F0F5]
      // Change: text-sm font-medium (green/red based on direction)
    ].join(' '),
  },

  // ---------------------------------------------------------------------------
  // BUTTONS
  // ---------------------------------------------------------------------------
  button: {
    // Primary — emerald, used for main CTAs (1-2 per screen max)
    primary: [
      'bg-emerald-500 text-white',
      'px-6 py-3',
      'rounded-[6px]',           // sm radius
      'font-medium text-sm',
      'transition-all duration-200 ease-out',
      'hover:bg-emerald-600',
      'active:bg-emerald-700 active:scale-[0.98]',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50',
    ].join(' '),

    // Secondary — subtle, outlined
    secondary: [
      'bg-transparent',
      'border border-[#2A2F45]',
      'text-[#A0A4B8]',
      'px-6 py-3',
      'rounded-[6px]',
      'font-medium text-sm',
      'transition-all duration-200 ease-out',
      'hover:bg-[#1A1D2B] hover:text-[#F0F0F5] hover:border-[#3D4463]',
      'active:bg-[#222638] active:scale-[0.98]',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D4463]/50',
    ].join(' '),

    // Ghost — text-only, no border, no background
    ghost: [
      'bg-transparent',
      'text-[#A0A4B8]',
      'px-4 py-2',
      'rounded-[6px]',
      'font-medium text-sm',
      'transition-all duration-150',
      'hover:text-[#F0F0F5] hover:bg-[rgba(255,255,255,0.05)]',
      'active:bg-[rgba(255,255,255,0.08)]',
    ].join(' '),

    // Gold — premium action (upgrade, unlock, special)
    gold: [
      'bg-gradient-to-r from-[#C9A227] to-[#FFD54D]',
      'text-[#08090E]',
      'px-6 py-3',
      'rounded-[6px]',
      'font-semibold text-sm',
      'transition-all duration-200 ease-out',
      'hover:shadow-[0_0_24px_-4px_rgba(201,162,39,0.3)]',
      'active:scale-[0.98]',
    ].join(' '),

    // Danger — destructive actions
    danger: [
      'bg-transparent',
      'border border-red-500/30',
      'text-red-400',
      'px-6 py-3',
      'rounded-[6px]',
      'font-medium text-sm',
      'transition-all duration-200 ease-out',
      'hover:bg-red-500/10 hover:border-red-500/50',
      'active:bg-red-500/20 active:scale-[0.98]',
    ].join(' '),
  },

  // ---------------------------------------------------------------------------
  // INPUTS
  // ---------------------------------------------------------------------------
  input: {
    // Standard text input
    base: [
      'w-full',
      'bg-[#0E1018]',               // Darker than card background
      'border border-[#1E2235]',
      'rounded-[6px]',
      'px-4 py-3',
      'text-[#F0F0F5] text-sm',
      'placeholder:text-[#454B66]',
      'transition-all duration-200',
      'focus:outline-none focus:border-[#3D4463] focus:ring-1 focus:ring-[#3D4463]/50',
      'hover:border-[#2A2F45]',
      'disabled:opacity-40 disabled:cursor-not-allowed',
    ].join(' '),

    // Search input with icon
    search: [
      'w-full',
      'bg-[#0E1018]',
      'border border-[#1E2235]',
      'rounded-[6px]',
      'pl-10 pr-4 py-3',           // Extra left padding for search icon
      'text-[#F0F0F5] text-sm',
      'placeholder:text-[#454B66]',
      'transition-all duration-200',
      'focus:outline-none focus:border-[#3D4463]',
    ].join(' '),

    // Select/dropdown trigger
    select: [
      'w-full',
      'bg-[#0E1018]',
      'border border-[#1E2235]',
      'rounded-[6px]',
      'px-4 py-3',
      'text-[#F0F0F5] text-sm',
      'transition-all duration-200',
      'hover:border-[#2A2F45]',
      'focus:outline-none focus:border-[#3D4463]',
      'cursor-pointer appearance-none',
    ].join(' '),
  },

  // ---------------------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------------------
  nav: {
    // Sidebar container
    sidebar: [
      'w-[280px] h-screen',
      'bg-[#0E1018]',
      'border-r border-[#1E2235]',
      'flex flex-col',
      'py-6',
    ].join(' '),

    // Sidebar nav item
    item: [
      'flex items-center gap-3',
      'px-4 py-2.5',
      'rounded-[6px]',
      'text-sm text-[#A0A4B8]',
      'transition-all duration-150',
      'hover:text-[#F0F0F5] hover:bg-[rgba(255,255,255,0.05)]',
      'cursor-pointer',
    ].join(' '),

    // Active nav item
    itemActive: [
      'flex items-center gap-3',
      'px-4 py-2.5',
      'rounded-[6px]',
      'text-sm text-[#F0F0F5] font-medium',
      'bg-[rgba(255,255,255,0.08)]',
    ].join(' '),

    // Top bar
    topBar: [
      'h-16',
      'bg-[#0E1018]/80',
      'backdrop-blur-[12px]',
      'border-b border-[#1E2235]',
      'flex items-center justify-between',
      'px-6',
      'sticky top-0 z-40',
    ].join(' '),
  },

  // ---------------------------------------------------------------------------
  // DATA DISPLAY
  // ---------------------------------------------------------------------------
  data: {
    // Table container
    table: [
      'w-full',
      'bg-[#141621]',
      'border border-[#1E2235]',
      'rounded-[10px]',
      'overflow-hidden',
    ].join(' '),

    // Table header row
    tableHeader: [
      'bg-[#0E1018]',
      'text-xs font-medium text-[#6B7094] uppercase tracking-wider',
      'px-6 py-3',
      'border-b border-[#1E2235]',
      'text-left',
    ].join(' '),

    // Table body row
    tableRow: [
      'px-6 py-4',
      'text-sm text-[#A0A4B8]',
      'border-b border-[#1E2235]/60',
      'transition-colors duration-150',
      'hover:bg-[rgba(255,255,255,0.03)]',
    ].join(' '),

    // Badge/tag
    badge: {
      profit: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      loss:   'inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20',
      caution:'inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20',
      info:   'inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20',
      gold:   'inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-medium bg-[#C9A227]/10 text-[#FFD54D] border border-[#C9A227]/20',
    },

    // Stat/KPI number
    statValue: 'text-3xl font-bold font-mono tracking-tight text-[#F0F0F5]',
    statLabel: 'text-xs font-medium uppercase tracking-widest text-[#6B7094]',
    statChange: {
      up:   'text-sm font-medium text-emerald-400',
      down: 'text-sm font-medium text-red-400',
      flat: 'text-sm font-medium text-[#6B7094]',
    },
  },

  // ---------------------------------------------------------------------------
  // CHARTS
  // ---------------------------------------------------------------------------
  chart: {
    // Recharts color tokens — use these as chart series colors
    seriesColors: [
      '#34D399',  // Emerald — primary series
      '#60A5FA',  // Blue — secondary series
      '#C9A227',  // Gold — tertiary/premium series
      '#F472B6',  // Pink — fourth series
      '#A78BFA',  // Violet — fifth series
      '#FB923C',  // Orange — sixth series
    ],

    // Chart grid/axis colors
    gridColor:    '#1E2235',
    axisColor:    '#6B7094',
    tooltipBg:    '#1A1D2B',
    tooltipBorder:'#2A2F45',
  },
} as const;


// =============================================================================
// GRADIENT DEFINITIONS
// =============================================================================

export const gradients = {
  // Hero text gradient — for page titles and key headers
  textGold:    'linear-gradient(135deg, #FFD54D 0%, #C9A227 50%, #FFD54D 100%)',
  textEmerald: 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #34D399 100%)',

  // Surface gradients — subtle background effects
  surfaceRadial: 'radial-gradient(ellipse at top, rgba(52, 211, 153, 0.05) 0%, transparent 60%)',
  surfaceGold:   'radial-gradient(ellipse at top right, rgba(201, 162, 39, 0.04) 0%, transparent 50%)',

  // Border gradients — for premium card borders
  borderGold:    'linear-gradient(135deg, rgba(201, 162, 39, 0.4), rgba(201, 162, 39, 0.1), rgba(201, 162, 39, 0.4))',
  borderEmerald: 'linear-gradient(135deg, rgba(52, 211, 153, 0.3), rgba(52, 211, 153, 0.05), rgba(52, 211, 153, 0.3))',

  // Mesh gradient — for hero section backgrounds (use sparingly)
  meshHero: [
    'radial-gradient(at 20% 20%, rgba(52, 211, 153, 0.06) 0%, transparent 50%)',
    'radial-gradient(at 80% 10%, rgba(201, 162, 39, 0.04) 0%, transparent 50%)',
    'radial-gradient(at 50% 80%, rgba(96, 165, 250, 0.03) 0%, transparent 50%)',
  ].join(', '),
} as const;


// =============================================================================
// DESIGN TOKENS SUMMARY (Quick Reference)
// =============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  LUXURY FINTECH DESIGN SYSTEM — QUICK REFERENCE                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                       │
 * │  BACKGROUNDS                                                          │
 * │  ───────────                                                          │
 * │  App base:      #08090E     (deepest, near-black w/ blue undertone)   │
 * │  Sidebar:       #0E1018     (secondary, slightly lifted)              │
 * │  Card:          #141621     (content surface)                         │
 * │  Hover:         #1A1D2B     (interactive lift)                        │
 * │  Active:        #2A2F45     (pressed/selected)                        │
 * │                                                                       │
 * │  BORDERS                                                              │
 * │  ───────────                                                          │
 * │  Subtle:        #1E2235     (card borders — barely visible)           │
 * │  Default:       #2A2F45     (interactive borders)                     │
 * │  Strong:        #3D4463     (focus rings)                             │
 * │  Accent:        #C9A227     (gold premium border)                     │
 * │                                                                       │
 * │  TEXT                                                                 │
 * │  ───────────                                                          │
 * │  Primary:       #F0F0F5     (headlines, numbers)                      │
 * │  Secondary:     #A0A4B8     (body, descriptions)                      │
 * │  Tertiary:      #6B7094     (labels, metadata)                        │
 * │  Disabled:      #454B66     (disabled, placeholder)                   │
 * │                                                                       │
 * │  ACCENTS                                                              │
 * │  ───────────                                                          │
 * │  Gold:          #C9A227     (luxury — borders, badges, premium)       │
 * │  Gold bright:   #FFD54D     (gold highlights, gradient endpoint)      │
 * │  Emerald:       #10B981     (money — CTAs, positive metrics)          │
 * │  Emerald light: #34D399     (emerald highlights, chart primary)       │
 * │                                                                       │
 * │  SIGNALS                                                              │
 * │  ───────────                                                          │
 * │  Profit:        #34D399     (up, buy, positive)                       │
 * │  Loss:          #F87171     (down, avoid, negative)                   │
 * │  Caution:       #FBBF24     (hold, warning)                           │
 * │  Info:          #60A5FA     (informational)                           │
 * │                                                                       │
 * │  FONTS                                                                │
 * │  ───────────                                                          │
 * │  Display:       Playfair Display (serif — headlines, hero text)       │
 * │  Body:          Inter (sans — all UI text)                            │
 * │  Numbers:       JetBrains Mono (mono — financial figures)             │
 * │                                                                       │
 * │  RADIUS                                                               │
 * │  ───────────                                                          │
 * │  Buttons:       6px                                                   │
 * │  Cards:         10px                                                  │
 * │  Modals:        14px                                                  │
 * │  Sections:      20px                                                  │
 * │  Avatars:       9999px (full)                                         │
 * │                                                                       │
 * │  MOTION                                                               │
 * │  ───────────                                                          │
 * │  Micro:         200ms ease-out                                        │
 * │  Standard:      300ms cubic-bezier(0.16, 1, 0.3, 1)                  │
 * │  Modal:         500ms cubic-bezier(0.32, 0.72, 0, 1)                 │
 * │  Stagger:       60ms between children                                 │
 * │                                                                       │
 * │  SPACING (Tailwind classes)                                           │
 * │  ───────────                                                          │
 * │  Card padding:  p-6 (24px) standard, p-8 (32px) hero                 │
 * │  Grid gaps:     gap-6 (24px) cards, gap-4 (16px) internal            │
 * │  Sections:      py-20 (80px) between major sections                   │
 * │  Max width:     max-w-7xl (1440px)                                    │
 * │                                                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
