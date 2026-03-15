# LootVue Frontend Architecture — Conversion-Optimized

## Brand Identity

**Name:** LootVue
**Tagline:** "Find the hidden gems everyone else misses"
**What we are:** Quant-based AI real estate analysis from hand-picked data sources
**Logo:** Gold gem/diamond formed by converging data lines — discovery through analysis
**Colors:** True black + gold gradient + emerald for money
**Feel:** Bloomberg Terminal meets luxury brand. Dense data. Premium finish.

---

## Conversion Funnel Architecture

```
LANDING PAGE (/)
  │ Goal: Get email or first analysis
  │ Metric: Visitor → Signup rate (target: 8-12%)
  │
  ├─→ SIGNUP (/signup)
  │   │ Goal: Create account (email or Google)
  │   │ Metric: Signup completion rate (target: 70%+)
  │   │
  │   └─→ ONBOARDING (/onboarding)
  │       │ Goal: Profile + buy box + first analysis
  │       │ Metric: Onboarding completion (target: 60%+)
  │       │
  │       └─→ DASHBOARD (/dashboard)
  │           │ Goal: Daily engagement
  │           │ Metric: DAU/MAU (target: 30%+)
  │           │
  │           └─→ ANALYSIS (/dashboard/analyze)
  │               │ Goal: Run analysis → save to pipeline → subscribe
  │               │ Metric: Free → Paid conversion (target: 5-8%)
  │               │
  │               └─→ SUBSCRIPTION ($29/mo)
  │
  ├─→ LOGIN (/login)
  │   └─→ DASHBOARD
  │
  └─→ PRICING (/pricing)
      └─→ SIGNUP
```

---

## Landing Page Architecture (The Money Page)

Based on analysis of 50 competitors, here's the conversion-optimized structure:

### SECTION 1: Hero (0-5 seconds — make or break)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Gold gem logo]  LOOTVUE                    [Log in]   │
│                                              [Get Started]│
│                                                         │
│           "Find the hidden gems              │
│            everyone else misses."             │
│                                                         │
│  Quant-based AI analysis. 12 engines.                   │
│  One verdict. 10 seconds.                               │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │ 🔍  Paste any US address...   [Analyze] │            │
│  └─────────────────────────────────────────┘            │
│  Free · No credit card · 10 second results              │
│                                                         │
│  ┌─────┐  ┌─────────┐  ┌─────┐  ┌─────┐               │
│  │+$470│  │  BUY    │  │ 87% │  │+$27K│               │
│  │/mo  │  │ verdict │  │conf │  │eqty │               │
│  └─────┘  └─────────┘  └─────┘  └─────┘               │
│  (floating cards with drift animation)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

Psychology:
- Search bar IS the CTA (Redfin pattern — works for RE)
- Floating cards show results WITHOUT explaining how
- "Hidden gems" = identity hook (you're a treasure hunter)
- "Everyone else misses" = exclusivity
```

### SECTION 2: Live Product Demo (5-15 seconds)
```
┌─────────────────────────────────────────────────────────┐
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  │ ● ● ●  lootvue.com/analyze                      │  │
│  │─────────────────────────────────────────────────── │  │
│  │                                                   │  │
│  │  1423 Cedar Ridge Dr... (typing animation)        │  │
│  │                                                   │  │
│  │  Price      $285K    ← (fades in, staggered)      │  │
│  │  Value      $312K    ←                            │  │
│  │  Cash Flow  +$470    ←                            │  │
│  │  Cap Rate   7.2%     ←                            │  │
│  │                                                   │  │
│  │  [████████████░░░] 87% confidence                 │  │
│  │                                                   │  │
│  │  Verdict: BUY — High Confidence                   │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘

Psychology:
- SHOW the product working, don't describe features
- Typing animation creates anticipation
- Staggered reveals create "wow" moments
- Viewer sees the output before signing up (reduce uncertainty)
```

### SECTION 3: Pain Points (15-25 seconds)
```
Psychology: PAS framework — Problem, Agitate, Solve
- "Your broker profits from what you don't know" (enemy-based)
- Three pain cards with SPECIFIC dollar costs
- Red/rose accent — danger, loss, urgency
- Each card has a large stat ($48K, 11 days, 1 of 12)
```

### SECTION 4: Bento Feature Grid (25-40 seconds)
```
┌──────────────────────┬───────────┐
│                      │           │
│  True Value          │  Market   │
│  Detection           │  Timing   │
│  (2 col wide)        │           │
│  with live numbers   │  "BUY"    │
│                      │           │
├───────────┬──────────┴───────────┤
│           │                      │
│  Stress   │  Portfolio           │
│  Test     │  Intelligence        │
│           │  (2 col wide)        │
└───────────┴──────────────────────┘

Psychology:
- Bento grid = Apple-level design language
- Varied sizes create visual interest (vs boring equal columns)
- Each card has subtle data visualization (not just text)
- Hover reveals gold glow
```

### SECTION 5: Live Activity Counter
```
"247 investors analyzed properties in the last hour"
(number increments every 8-10 seconds with pulse animation)

Psychology:
- Social proof without showing user count
- Creates "this is LIVE" feeling
- FOMO — others are using it RIGHT NOW
```

### SECTION 6: How It Works (3 steps, vertical)
```
Step connectors with gold gradient lines
Each step has an icon in a gold circle
01 → 02 → 03
Paste → See Everything → Get Verdict

Psychology:
- Reduces perceived complexity to 3 steps
- "Paste" is easier than "Enter" — one action
- Shows the SPEED (10 seconds)
```

### SECTION 7: Comparison Table
```
Psychology:
- Enemy-based positioning (Zillow = buyers, LootVue = investors)
- Gold checkmarks for LootVue (premium association)
- Competitors have dim X marks (barely visible = they barely exist)
- Row hover effect keeps engagement
```

### SECTION 8: Social Proof / Testimonials
```
Psychology:
- Outcome metrics as LARGE gold numbers ($27K, $380/mo, 6hrs saved)
- Specific details (not "great tool!" — "found $285K property that comped at $312K")
- Role/location for credibility
- Gold star ratings
```

### SECTION 9: Pricing Anchor
```
Bloomberg $24K ̶s̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶
CoStar $15K ̶s̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶
LootVue: FREE (in gold, large, glowing)

Psychology:
- Anchoring effect — $24K makes $29/mo feel like nothing
- "Free to start" removes all friction
- Gold glow on LootVue card = premium positioning
```

### SECTION 10: Final CTA
```
"The next deal you analyze without this could cost you $48K."
[Analyze Your First Deal Free]

Psychology:
- Loss aversion (2x stronger than desire for gain)
- Specific dollar amount (not vague "save money")
- Gold gradient background slowly shifting
- This is the LAST thing they see
```

---

## Dashboard Architecture (Retention Machine)

### Daily Engagement Loop
```
Morning open → Dashboard
├── Rate change notification (gold if favorable)
├── Portfolio value change (+$X today)
├── New deal alerts matching buy box
└── Quick action: "Analyze a Deal"
```

### Page Hierarchy (by engagement frequency)
```
DAILY:    Dashboard (glanceable) → Rates (if rates moved)
WEEKLY:   Markets (scan for new opportunities)
PER DEAL: Analyze → Compare → Pathway
MONTHLY:  Portfolio → Pipeline → Settings
```

### Navigation Architecture
```
SIDEBAR (desktop)                BOTTOM NAV (mobile)
─── OVERVIEW ───                [Dashboard] [Discover] [Markets] [Portfolio]
  Dashboard
  Pathway (guided)
─── RESEARCH ───                "More" sheet:
  Discover                      [Analyze] [Compare] [Rates]
  Markets                       [Pipeline] [Settings] [Pathway]
  Rates
─── INVEST ───
  Analyze
  Compare
  Deals
─── MANAGE ───
  Portfolio
  Pipeline
─── COMMUNITY ───
  Pulse
  Consensus
─── ───
  Settings
```

---

## Component Architecture

```
src/
├── components/
│   ├── Logo.tsx                    ← SVG logo component (BUILT)
│   ├── ui/
│   │   ├── Card.tsx                ← Base card with glass/gold/bento variants
│   │   ├── Button.tsx              ← Primary(gold)/Secondary/Ghost variants
│   │   ├── Badge.tsx               ← Gold/Emerald/Rose/Amber variants
│   │   ├── Input.tsx               ← Dark input with gold focus
│   │   ├── MetricCard.tsx          ← Number + label + trend
│   │   ├── ProgressBar.tsx         ← Gold gradient fill
│   │   ├── Toggle.tsx              ← Gold thumb
│   │   └── Skeleton.tsx            ← Gold-tinted pulse
│   ├── charts/                     ← Future: Recharts components
│   ├── landing/
│   │   ├── FloatingCard.tsx        ← Animated floating metric card
│   │   ├── ProductDemo.tsx         ← Typing + staggered reveal animation
│   │   ├── BentoGrid.tsx           ← Feature grid with varied sizes
│   │   ├── LiveCounter.tsx         ← Animated activity counter
│   │   ├── ComparisonTable.tsx     ← Gold checkmark table
│   │   └── ScrollReveal.tsx        ← IntersectionObserver wrapper
│   └── dashboard/
│       ├── Sidebar.tsx             ← Grouped nav with logo
│       ├── TopBar.tsx              ← Breadcrumb + notifications
│       └── MobileNav.tsx           ← Bottom tab bar
├── hooks/
│   ├── useScrollReveal.ts          ← IntersectionObserver hook
│   ├── useTypingAnimation.ts       ← Character-by-character reveal
│   └── useEventCapture.ts          ← CROWDSENSE event tracking
└── lib/
    ├── engines/                    ← 52 analysis engines
    ├── stores/                     ← 8 Zustand stores
    └── brand.ts                    ← Centralized brand constants
```

---

## CSS Architecture

### Design Tokens
```
Background:     #000000 (true black)
Surface:        #0A0A0A → #111111 → #1A1A1A → #252525
Gold:           #9A7B1A → #C9A227 → #E8C547 → #FFD700
Emerald:        #059669 → #10B981 → #34D399
Rose:           #EF4444 → #F87171
Text:           #FAFAFA → #999999 → #666666 → #444444
Border:         rgba(255,255,255,0.05) default, gold/20 on hover
```

### Animation System
```
Micro (hover):   125ms ease-out (enter), 250ms ease-out (exit)
Reveal (scroll): 400-600ms cubic-bezier(0.16,1,0.3,1) with stagger
Float (ambient): 6-8s ease-in-out infinite
Pulse (glow):    2s ease-in-out infinite
Gradient shift:  3s ease infinite
Typing:          50ms per character
Counter:         2000ms cubic-bezier ease-out
```

### Responsive Strategy
```
Mobile-first with these breakpoints:
  sm:  640px   (larger phones)
  md:  768px   (tablets — sidebar appears)
  lg:  1024px  (desktop — full layout)
  xl:  1280px  (wide desktop)
  2xl: 1536px  (ultra-wide)

Mobile-specific:
  - Floating cards hidden (performance)
  - Bento grid stacks to single column
  - Sidebar → bottom tab bar
  - Touch targets: minimum 44px
```

---

## Conversion Optimization Checklist

### Above the Fold (< 5 seconds)
- [ ] Hero headline visible without scrolling
- [ ] Search bar CTA visible without scrolling
- [ ] One trust signal visible (data sources or metric)
- [ ] Product preview partially visible (teases scroll)

### Friction Reduction
- [ ] Search bar on landing page (no signup wall for first taste)
- [ ] Google OAuth (one-click signup)
- [ ] No credit card for free tier
- [ ] 4-step onboarding (not 10)
- [ ] Skip options on every onboarding step

### Social Proof
- [ ] Live activity counter (real-time feel)
- [ ] Specific outcome testimonials ($X saved, not "great tool")
- [ ] Data source attribution (FRED, Census = institutional trust)
- [ ] Pricing anchor (Bloomberg $24K → LootVue free)

### Psychology
- [ ] Loss aversion CTA ("could cost you $48K")
- [ ] Enemy-based positioning ("Zillow is for buyers")
- [ ] Identity hook ("hidden gems" = you're a treasure hunter)
- [ ] FOMO counter (others are analyzing RIGHT NOW)
- [ ] Exclusivity ("your broker hopes you never find this")

### Visual Impact
- [ ] Animated hero elements (floating cards, typing demo)
- [ ] Scroll-triggered reveals on EVERY section
- [ ] Gold gradient text on key phrases
- [ ] Noise texture overlay for depth
- [ ] Glassmorphism on product preview
- [ ] Hover glow effects on all interactive elements
- [ ] Bento grid (not boring equal columns)
- [ ] Custom SVG logo (not text)

### Performance
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] No layout shift (CLS < 0.1)
- [ ] Images lazy-loaded below fold
- [ ] Fonts preloaded (WOFF2)
- [ ] Animations use transform/opacity only (GPU-accelerated)
