# LootVue UX Flow Architecture

**Date**: 2026-03-16
**Purpose**: Define the complete user journey — every screen, every interaction, every AI touchpoint, every plain English explanation. The app should feel like a smart friend who happens to have a Bloomberg Terminal.

---

## Design Philosophy

**"Show me the answer. Let me dig if I want to."**

Every screen follows the same 4-layer depth model:

```
Layer 1: THE ANSWER (1 second)
  "This deal is a PASS — cash flow is negative after real expenses."

Layer 2: THE EVIDENCE (5 seconds)
  Key metrics with plain English: cap rate, DSCR, cash flow, stress test summary

Layer 3: THE DETAIL (30 seconds)
  Full breakdown: every line item, every assumption, every calculation chain

Layer 4: THE AI EXPLANATION (on demand)
  "Here's why this matters for YOUR situation..." — Claude narrates, grounded in the data
```

Every metric card, every chart, every signal follows this pattern. Click to go deeper. Never force depth on someone who just wants the answer.

---

## Global UI Patterns

### The AI Layer (appears on EVERY page)

**Pattern: "AI Insight Strip"**
- Sits below each data section as a collapsible gold-bordered strip
- Collapsed by default: shows 1-line summary with sparkle icon
- Expanded: 2-3 paragraph analysis grounded in the data above it
- Always labeled: "AI Analysis" badge + "Based on [source]" citation
- Confidence pill: HIGH (green) / MEDIUM (amber) / LOW (rose)
- Toggle: user can turn off AI strips globally in Settings

**Example (collapsed):**
```
[sparkle] AI: "This property's insurance cost is 2.4x the county average —
investigate before committing." [expand arrow]
```

**Example (expanded):**
```
[sparkle] AI Analysis | Confidence: HIGH | Based on: Census ACS, FEMA NRI

This property sits in FEMA flood zone AE, which explains the insurance
premium of $4,200/year — 2.4x the county average of $1,750. In the last
3 years, insurance costs in this ZIP have risen 31% while rents only grew
8%. That gap is eating into cash flow.

What this means for you: Your break-even occupancy jumps from 62% to 78%
when you use real insurance costs instead of the national average. That
leaves very little margin for vacancy.

Suggestion: Get 3 insurance quotes before making an offer. If the best
quote exceeds $3,500/year, the deal math doesn't work at this price.
```

### The Drill-Down Pattern

Every metric follows this click behavior:
1. **Card view** — single number + plain English label + trend arrow
2. **Click card** → **Detail panel slides open** — formula, inputs, benchmark comparison
3. **Click "Show calculation"** → **Chain view** — step-by-step math with each intermediate value
4. **Click "AI: Explain this"** → **AI strip expands** — narrative explanation personalized to this deal

### Plain English Rules (enforced everywhere)

- Every metric has TWO labels: technical name + plain English name
  - "Cap Rate" → "What the property earns relative to its price"
  - "DSCR" → "How easily income covers the loan payment"
  - "Monte Carlo P50" → "The most likely outcome based on 10,000 simulations"
- Numbers shown in context: "6.5% cap rate (above the 5.8% market average — good)"
- Negative outcomes in plain language: "You'd lose $280/month after all real expenses"
- Confidence shown as words: "We're very confident" / "This is a rough estimate" / "Not enough data"

### Voice Layer (future — design for it now)

- Microphone icon in the top nav bar (always visible)
- "Ask about this page" — voice input → Claude processes → voice output
- Examples: "Is this a good deal?" → AI responds with the verdict + reasoning
- Works on any page — context-aware based on current screen
- Fallback: text chat in a slide-over panel if voice not available

---

## Page-by-Page Flow

### PAGE 1: DASHBOARD (Home Base)

**URL**: `/dashboard`
**Purpose**: "What's happening with my investments RIGHT NOW?"
**Time to value**: < 3 seconds

```
┌─────────────────────────────────────────────────────────┐
│ [Search bar: "Analyze any address..."]     [mic] [avatar]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Portfolio     │  │ Monthly CF   │  │ Total Equity │  │
│  │ $1.2M        │  │ $3,450/mo    │  │ $380K        │  │
│  │ ↑ 8.2% YTD   │  │ ↑ $200 vs    │  │ ↑ 12% YoY    │  │
│  │              │  │   last month  │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  [sparkle] AI: "Your portfolio is up 8.2% this year,     │
│  outperforming the national average of 4.1%. Austin is   │
│  your top performer." [expand]                           │
│                                                          │
│  ┌─ Today's Rates ─────────────────────────────────────┐ │
│  │ 30yr: 6.85% ↓0.10  │ 15yr: 6.12%  │ DSCR: 7.50%  │ │
│  │ [sparkle] "Rates dropped — good time to refi check" │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Recent Analyses ──────────────────────────────────┐  │
│  │ 123 Main St, Austin    BUY   Cap: 7.2%  CF: $450  │  │
│  │ 456 Oak Ave, Tampa     PASS  Cap: 4.1%  CF: -$280 │  │
│  │ 789 Pine Rd, Nashville DIG   Cap: 5.8%  CF: $120  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Market Pulse (top 3 signals) ─────────────────────┐  │
│  │ Austin: 3/5 bullish [green]  "Supply tightening"   │  │
│  │ Tampa:  2/5 mixed   [amber]  "Rates pressuring"    │  │
│  │ Denver: 1/5 bearish [rose]   "Inventory climbing"  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  [Next Step →] "You have 2 deals in your pipeline.       │
│   Review them before the Austin market shifts." [go]     │
└─────────────────────────────────────────────────────────┘
```

**AI touchpoints:**
- Portfolio summary AI strip (1-line collapsed, 3-paragraph expanded)
- Rate commentary (auto-generated based on rate direction)
- Market pulse AI summaries (per market)
- Next Step recommendation (personalized based on pipeline + market signals)

**Drill-down:**
- Click any portfolio metric → expand to per-property breakdown
- Click any rate → expand to rate history chart + AI analysis
- Click any recent analysis → goes to full Analyze page
- Click any market → goes to Markets page filtered to that market

---

### PAGE 2: ANALYZE (The Beast)

**URL**: `/dashboard/analyze`
**Purpose**: "Is this specific deal good or bad?"
**Time to value**: 10 seconds to verdict

**Entry point**: Search bar (top of every page) OR click from Discover/Pipeline

```
┌─────────────────────────────────────────────────────────┐
│ [Search: 123 Main St, Austin TX]  [Strategy: ▼ LTR]     │
│                                                          │
│ ═══════════════════════════════════════════════════════  │
│                                                          │
│  ┌─ THE VERDICT ───────────────────────────────────────┐ │
│  │                                                      │ │
│  │   ████████████  BUY  ████████████                   │ │
│  │   Confidence: 78%  │  Score: 82/100                 │ │
│  │                                                      │ │
│  │   "This property earns $450/month after ALL real     │ │
│  │    expenses. It survives 5 of 6 stress scenarios.    │ │
│  │    The market is growing — permits up 34%."          │ │
│  │                                                      │ │
│  │   [Save to Pipeline]  [Compare]  [Simulate]          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [Tab: Summary] [Financials] [Risk] [Market] [Financing] │
│                                                          │
│  ─── SUMMARY TAB ───────────────────────────────────── │
│                                                          │
│  ┌── What You'd Pay ──┐  ┌── What You'd Earn ────────┐ │
│  │ Price:    $385,000  │  │ Monthly rent:    $2,850   │ │
│  │ Down:     $77,000   │  │ After expenses:  $1,920   │ │
│  │ Mortgage: $2,040/mo │  │ After mortgage:  $450/mo  │ │
│  │ Closing:  $11,550   │  │ Annual CF:       $5,400   │ │
│  │ Total in: $88,550   │  │ That's 6.1% on your cash │ │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                          │
│  [sparkle] AI: "You'd pocket $450/month — enough to     │
│  cover a car payment. But watch the insurance..." [more] │
│                                                          │
│  ┌── Key Metrics (click any to drill down) ───────────┐ │
│  │ Cap Rate    │ DSCR       │ Cash-on-Cash │ GRM      │ │
│  │ 7.2%       │ 1.35x      │ 6.1%         │ 11.3     │ │
│  │ "Earns 7¢  │ "Income    │ "6¢ back per │ "11 yrs  │ │
│  │  per $1    │  covers    │  $1 you put  │  of rent  │ │
│  │  of price" │  loan 1.35 │  down"       │  to pay   │ │
│  │            │  times"    │              │  it off"  │ │
│  │ [above avg]│ [safe]     │ [average]    │ [good]    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ─── FINANCIALS TAB ─────────────────────────────────── │
│                                                          │
│  ┌── Real Expenses (ZIP-level, not national avg) ─────┐ │
│  │ Property tax:  $7,007/yr  (1.82% — Travis County)  │ │
│  │ Insurance:     $3,200/yr  (Flood Zone X — moderate) │ │
│  │ Vacancy:       6.5%       (Austin avg, Census ACS)  │ │
│  │ Management:    8%         (Texas average)            │ │
│  │ Maintenance:   $3,850/yr  (1% of value)             │ │
│  │ CapEx reserve: $3,850/yr  (1% of value)             │ │
│  │ ─────────────────────────────────                    │ │
│  │ Total OpEx:    $19,707/yr ($1,642/mo)               │ │
│  │                                                      │ │
│  │ [sparkle] "Your real tax rate is 1.82% — 46% higher │ │
│  │  than the 1.25% national average most calculators    │ │
│  │  use. This is Travis County's actual rate." [more]   │ │
│  │                                                      │ │
│  │  [Data: Census ACS 2022 | Updated: annually]        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── Calculation Chain (expand to see every step) ────┐  │
│  │ ▶ Gross Rent          $2,850/mo × 12 = $34,200/yr  │ │
│  │ ▶ - Vacancy (6.5%)              = -$2,223           │ │
│  │ ▶ = Effective Gross Income       = $31,977          │ │
│  │ ▶ - Operating Expenses           = -$19,707         │ │
│  │ ▶ = NOI                          = $12,270          │ │
│  │ ▶ - Debt Service                 = -$24,480         │ │
│  │ ▶ = Cash Flow                    = $5,400/yr        │ │
│  │ ▶ Cap Rate = $12,270 / $385,000  = 3.19%           │ │
│  │                                                      │ │
│  │ [sparkle] "Each line shows exactly where your money  │ │
│  │  goes. The biggest expense is your mortgage at       │ │
│  │  $2,040/month. If rates drop 1%, your cash flow     │ │
│  │  jumps to $720/month." [more]                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ─── RISK TAB ──────────────────────────────────────── │
│                                                          │
│  ┌── Stress Test Results ─────────────────────────────┐ │
│  │ ✅ Mild Recession      CF: $180/mo   DSCR: 1.12x   │ │
│  │ ✅ Rate Shock +2%      CF: -$120/mo  DSCR: 0.94x   │ │
│  │ ❌ 2008 Correction     CF: -$890/mo  DSCR: 0.63x   │ │
│  │ ✅ Insurance Crisis     CF: $50/mo    DSCR: 1.02x   │ │
│  │ ❌ Perfect Storm        CF: -$1,400   DSCR: 0.42x   │ │
│  │ ✅ Inflationary Boom    CF: $800/mo   DSCR: 1.52x   │ │
│  │                                                      │ │
│  │ Survived: 4/6 scenarios                              │ │
│  │ Break-even vacancy: 18% (current: 6.5% — big buffer)│ │
│  │ Break-even rate: 8.9% (current: 6.85% — 2% cushion) │ │
│  │                                                      │ │
│  │ [sparkle] "This deal handles normal downturns well   │ │
│  │  but would struggle in a 2008-style crash. That's    │ │
│  │  expected — very few deals survive -25% values.      │ │
│  │  Your 18% break-even vacancy gives you a big safety  │ │
│  │  net for normal market conditions." [more]           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── Monte Carlo (10,000 simulations) ────────────────┐ │
│  │ [HISTOGRAM: IRR distribution]                       │ │
│  │ P10: 2.1%  P25: 5.8%  P50: 9.4%  P75: 13.2%      │ │
│  │                                                      │ │
│  │ "78% chance of positive returns over 5 years"       │ │
│  │ "Most likely outcome: 9.4% annual return"           │ │
│  │                                                      │ │
│  │ [sparkle] "If you ran this investment 10,000 times   │ │
│  │  with random variations in rent, vacancy, and rates, │ │
│  │  you'd make money 78% of the time. The worst 10%    │ │
│  │  of outcomes still show a 2.1% return — you're      │ │
│  │  unlikely to lose money." [more]                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ─── MARKET TAB ────────────────────────────────────── │
│                                                          │
│  ┌── Market Score: Austin ────────────────────────────┐ │
│  │ Score: 74/100  │  Signal: BULLISH (4/5 agree)      │ │
│  │                                                      │ │
│  │ What's pushing UP:                                   │ │
│  │ ██████████████ +8.2  Months of supply tight (2.1mo) │ │
│  │ ██████████     +5.4  Permits accelerating (+34%)    │ │
│  │ ████████       +4.1  Employment growing (+2.8%)     │ │
│  │                                                      │ │
│  │ What's pulling DOWN:                                 │ │
│  │ ██████         -3.2  Rates above average            │ │
│  │ ████           -2.1  HPI momentum slowing           │ │
│  │                                                      │ │
│  │ Convergence: 4/5 signals agree [GREEN]              │ │
│  │                                                      │ │
│  │ [sparkle] "Austin's market is strong. Supply is     │ │
│  │  tight at 2.1 months — anything below 4 months      │ │
│  │  historically leads to price increases. Builders     │ │
│  │  are betting big with permits up 34%. The one        │ │
│  │  concern is rates — but even that's improving."      │ │
│  │  [more]                                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ─── FINANCING TAB ─────────────────────────────────── │
│                                                          │
│  ┌── Best Loan Options ──────────────────────────────┐  │
│  │ Strategy: [LTR ▼]                                  │  │
│  │                                                     │  │
│  │ ┌ Conventional 30yr ─┐  ┌ DSCR Loan ────────────┐ │  │
│  │ │ Rate: 6.85%        │  │ Rate: 7.50%            │ │  │
│  │ │ Down: 20% ($77K)   │  │ Down: 25% ($96K)       │ │  │
│  │ │ Payment: $2,040/mo │  │ Payment: $2,015/mo     │ │  │
│  │ │ DSCR: 1.35x ✅     │  │ DSCR: 1.38x ✅         │ │  │
│  │ │ Monthly CF: $450   │  │ Monthly CF: $305        │ │  │
│  │ │ Requires: W-2, DTI │  │ No income verification │ │  │
│  │ └────────────────────┘  └────────────────────────┘ │  │
│  │                                                     │  │
│  │ [sparkle] "Conventional wins on rate, but DSCR      │  │
│  │  doesn't require income docs. If your DTI is tight, │  │
│  │  DSCR is your path — you trade $145/mo cash flow    │  │
│  │  for not having to qualify personally." [more]       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  [Next Step →] "This deal passes. Save to pipeline      │
│   and get 3 insurance quotes before making an offer."    │
└─────────────────────────────────────────────────────────┘
```

**Strategy selector changes EVERYTHING:**
- LTR → shows monthly rent, long-term cash flow, appreciation
- STR → shows ADR, occupancy, RevPAR, platform fees, seasonal revenue, STR vs LTR comparison
- Flip → shows ARV, 70% rule, rehab costs, holding costs, profit margin, timeline
- BRRRR → shows full cycle: buy → rehab → rent → refinance, cash recycled, per-cycle ROI
- House Hack → shows owner unit + rental units, effective housing cost, FHA eligibility

Same property, different strategy, completely different analysis.

---

### PAGE 3: MARKETS (Where to Invest)

**URL**: `/dashboard/markets`
**Purpose**: "Which markets are going up? Which are going down?"
**Time to value**: 5 seconds (see the heatmap, spot green/red)

```
┌─────────────────────────────────────────────────────────┐
│ [View: Heatmap ▼]  [Metric: Market Score ▼]  [Compare] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌── US Choropleth Heatmap ──────────────────────────┐  │
│  │                                                    │  │
│  │   [Interactive map — click state → MSA → ZIP]      │  │
│  │   Green = strong signal / Red = weak signal        │  │
│  │   Hover shows: "Austin, TX — Score: 74, BULLISH"   │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [sparkle] AI: "The strongest signal cluster is in the   │
│  Southeast — Tampa, Jacksonville, and Charlotte all      │
│  show tight supply with accelerating permits. Avoid      │
│  Denver and Portland — inventory is building fast." [+]  │
│                                                          │
│  ┌── Market Table (sortable, click any row) ─────────┐  │
│  │ Market      │ Score │ Signal  │ Supply │ Jobs │ HPI │  │
│  │ Austin      │  74   │ BUY    │ 2.1mo  │ +2.8%│ +6% │  │
│  │ Tampa       │  71   │ BUY    │ 2.8mo  │ +3.1%│ +5% │  │
│  │ Nashville   │  68   │ BUY    │ 3.2mo  │ +2.4%│ +4% │  │
│  │ Denver      │  42   │ AVOID  │ 6.1mo  │ +0.8%│ -2% │  │
│  │                                                      │  │
│  │ [Click row → side panel opens with full breakdown]   │  │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── Comparison Mode (select 2-5 markets) ────────────┐ │
│  │ [RADAR CHART: Austin vs Tampa vs Nashville]         │ │
│  │ Dimensions: Supply, Jobs, Permits, Rates, HPI, Risk │ │
│  │                                                      │ │
│  │ [sparkle] "Austin leads on jobs and permits but      │ │
│  │  Tampa has tighter supply and better affordability.  │ │
│  │  For cash flow, Tampa wins. For appreciation,        │ │
│  │  Austin wins." [more]                               │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [Next Step →] "Austin and Tampa both look strong.       │
│   Browse available properties →" [goes to Discover]     │
└─────────────────────────────────────────────────────────┘
```

**Drill-down path:**
1. National heatmap → click state → state-level heatmap of MSAs
2. Click MSA → MSA detail panel (all 5 signals + trends + AI narrative)
3. Click "See properties" → goes to Discover filtered to that MSA
4. Click "ZIP breakdown" → ZIP-level heatmap (where data available, labeled when estimated)

---

### PAGE 4: DISCOVER (Find Properties)

**URL**: `/dashboard/discover`
**Purpose**: "What's available in my target market?"

```
┌─────────────────────────────────────────────────────────┐
│ [Market: Austin ▼] [Strategy: LTR ▼] [Filters ▼]       │
├──────────────────────┬──────────────────────────────────┤
│                      │                                   │
│  [MAP VIEW]          │  Property Cards (sorted by score) │
│                      │                                   │
│  Pins colored by     │  ┌─ 123 Main St ──────────────┐  │
│  instant screen      │  │ $385K │ 3bd/2ba │ Score: 82 │  │
│  result:             │  │ PASS ✅ GRM: 11.3 │ 1%: ✅  │  │
│                      │  │ Est CF: $450/mo              │  │
│  🟢 = passes both    │  │ [Analyze] [Compare] [Save]   │  │
│  🟡 = passes one     │  └──────────────────────────────┘  │
│  🔴 = fails both     │                                   │
│                      │  ┌─ 456 Oak Ave ──────────────┐  │
│                      │  │ $425K │ 4bd/2ba │ Score: 68 │  │
│                      │  │ FAIL ❌ GRM: 14.8 │ 1%: ❌  │  │
│                      │  │ Est CF: -$120/mo             │  │
│                      │  │ [Analyze] [Compare] [Save]   │  │
│                      │  └──────────────────────────────┘  │
│                      │                                   │
├──────────────────────┴──────────────────────────────────┤
│                                                          │
│  ┌── Bulk Screen Mode ────────────────────────────────┐ │
│  │ Paste up to 25 addresses:                           │ │
│  │ [textarea]                                          │ │
│  │ [Screen All →] → Ranked table with pass/fail        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [sparkle] AI: "Of the 18 properties in your search,     │
│  3 pass both the GRM and 1% rule screens. The best       │
│  candidate is 123 Main St — closest to your buy box      │
│  criteria with a 7.2% estimated cap rate." [more]        │
│                                                          │
│  [Next Step →] "3 properties pass screening.             │
│   Run full analysis on the top one →" [goes to Analyze] │
└─────────────────────────────────────────────────────────┘
```

**Instant screen (< 2 seconds per property):**
- GRM under 15? ✅/❌
- 1% rule (monthly rent >= 1% of price)? ✅/❌
- Estimated cash flow positive? ✅/❌
- No full 12-engine analysis — just quick math to filter

---

### PAGE 5: PIPELINE (Track Your Deals)

**URL**: `/dashboard/pipeline`
**Purpose**: "Where does each deal stand?"

```
┌─────────────────────────────────────────────────────────┐
│ [View: Board ▼]  [Filter: All ▼]                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Discovered(3) → Analyzing(2) → Offer(1) → Contract(0) │
│  ┌────────┐    ┌────────┐    ┌────────┐                │
│  │ 789    │    │ 123    │    │ 456    │                │
│  │ Pine   │    │ Main   │    │ Oak    │                │
│  │ Rd     │    │ St     │    │ Ave    │                │
│  │ CF:$300│    │ CF:$450│    │ CF:$680│                │
│  │ [drag] │    │ [drag] │    │ [drag] │                │
│  └────────┘    └────────┘    └────────┘                │
│                                                          │
│  ─── Click any card → Side Panel ────────────────────── │
│                                                          │
│  ┌── Deal Detail Panel (slides from right) ───────────┐ │
│  │ 123 Main St, Austin TX                              │ │
│  │ Stage: Analyzing │ Since: 3 days                    │ │
│  │                                                      │ │
│  │ [Summary snapshot from last analysis]                │ │
│  │ Score: 82 │ CF: $450 │ DSCR: 1.35 │ IRR: 12.4%   │ │
│  │                                                      │ │
│  │ [Compare with ▼] — select other pipeline deals      │ │
│  │ [RADAR CHART: this deal vs selected deal]           │ │
│  │                                                      │ │
│  │ Decision Journal:                                    │ │
│  │ "2026-03-15: Ran analysis. Good numbers but need    │ │
│  │  to verify insurance cost. Getting 3 quotes."       │ │
│  │ [Add note]                                          │ │
│  │                                                      │ │
│  │ [sparkle] AI: "This deal has been in 'Analyzing'    │ │
│  │  for 3 days. Based on the market velocity (avg 12   │ │
│  │  DOM in this ZIP), properties at this price point    │ │
│  │  typically go under contract within 8 days. If       │ │
│  │  you're interested, move quickly." [more]            │ │
│  │                                                      │ │
│  │ [Full Analysis →] [Make Offer →] [Pass →]           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [Next Step →] "You have 1 deal in offer stage.          │
│   Follow up with the seller's agent." [action items]    │
└─────────────────────────────────────────────────────────┘
```

---

### PAGE 6: SIMULATOR (What-If Playground)

**URL**: `/dashboard/simulator`
**Purpose**: "What happens if I change the assumptions?"

```
┌─────────────────────────────────────────────────────────┐
│ [Import from Analysis ▼]  [Strategy: LTR ▼]  [Reset]   │
├────────────────────┬────────────────────────────────────┤
│                    │                                     │
│  INPUT SLIDERS     │  LIVE RESULTS (update in real-time)│
│                    │                                     │
│  Purchase: ████ $385K │  IRR: 12.4%                    │
│  Down %:   ████ 20%   │  NPV: $42,800                  │
│  Rate:     ████ 6.85% │  Equity Multiple: 1.84x        │
│  Rent:     ████ $2,850│  5yr Cash Flow: $27,000         │
│  Vacancy:  ████ 6.5%  │                                 │
│  Expenses: ████ $1,642│  [CHARTS]                       │
│  Apprec:   ████ 3.5%  │  - Annual cash flow bar chart  │
│  Hold:     ████ 10yr  │  - IRR histogram (Monte Carlo) │
│  Exit Cap: ████ 6.5%  │  - Sensitivity heatmap 5×5     │
│  Rent ↑:   ████ 2.5%  │  - Equity buildup area chart   │
│                    │                                     │
│  [sparkle] AI:     │  [sparkle] AI:                     │
│  "Moving rate from │  "Your most sensitive variable is  │
│   6.85% to 5.85%  │   the exit cap rate. A 50bps       │
│   adds $270/mo to │   change swings your IRR by 3.2    │
│   cash flow and   │   percentage points. Lock in your   │
│   bumps IRR from  │   assumptions carefully." [more]    │
│   12.4% to 16.1%" │                                    │
│                    │                                     │
├────────────────────┴────────────────────────────────────┤
│                                                          │
│  ┌── Scenario Comparison ─────────────────────────────┐ │
│  │ Bull:  IRR 18.2% │ Base: IRR 12.4% │ Bear: IRR 4.1%│
│  │                                                      │ │
│  │ [sparkle] "Even in the worst case, you still earn   │ │
│  │  4.1% — better than a savings account. The upside   │ │
│  │  potential is strong at 18.2%." [more]              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [Export PDF Report]  [Save Scenario]                    │
└─────────────────────────────────────────────────────────┘
```

---

### PAGE 7: SETTINGS

Standard — profile, buy box criteria, notification preferences, API keys, AI toggle (on/off), voice toggle, billing.

---

## The "Next Step" Engine

Every page ends with a **personalized next step** that AI generates based on:
- Current pipeline state (how many deals, what stages)
- Market conditions (are target markets heating or cooling?)
- User's buy box (are there new matches?)
- Time since last action (nudge if inactive)

This creates a **guided journey** without a separate "Pathway" page. The pathway IS the next-step chain.

---

## AI Integration Architecture

```
User sees metric → Clicks "AI: Explain" →
  Frontend sends: { metric, value, context: engine_outputs, user_profile } →
  API route: /api/ai/explain →
  Claude sonnet-4-6 (fast, <1s) with system prompt:
    "You are explaining {metric} to a {user.experience_level} investor.
     The value is {value}. Market context: {context}.
     Explain in 2-3 sentences at 8th grade reading level.
     Ground every claim in the data provided.
     Never give financial advice. Say 'based on the data' not 'you should'."
  → Stream response via SSE →
  Frontend renders with typing animation in gold-bordered AI strip
```

**Caching**: Same metric + same value + same context = cache for 24 hours. Don't re-call Claude for the same explanation.

**Fallback**: If Claude API fails, show the hardcoded plain English tooltip (what currently exists). Never show "AI unavailable" with no explanation at all.

**Cost control**: Claude sonnet-4-6 at ~$0.003 per explanation. Budget ~50 explanations per user session = $0.15/session. At $49/month, that's <1% of revenue.

---

## Voice Architecture (Phase 2)

```
[Mic button] → Web Speech API (browser-native, free) →
  Transcribed text → /api/ai/voice →
  Claude with page context + user question →
  Response text → Web Speech API TTS (or ElevenLabs for premium voice) →
  Audio plays back
```

Keep it simple. Browser-native speech recognition works well enough for MVP. Premium voice (ElevenLabs) can be a paid tier feature.
