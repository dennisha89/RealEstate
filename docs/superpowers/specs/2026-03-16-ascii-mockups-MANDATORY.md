# MANDATORY ASCII MOCKUPS — Build EXACTLY This

**Rule: Every element shown in these mockups MUST appear in the code. No deviations. No "engineering improvements." If the mockup shows a sparkline, the code has a sparkline. If the mockup shows 4 entry path cards, the code has 4 cards.**

These mockups were approved by the user. The previous build ignored them completely. That cannot happen again.

---

## DASHBOARD (Page 1)

Journey tracker at TOP (numbered steps with labels).
Rates card with 52-week sparklines for each rate.
Mini choropleth map with top 5 markets.
Signal convergence bars (5 signals).
Portfolio cards with sparklines.
Trending deals with score bars, sparklines, and pass/fail screens.
"What You're Missing" urgency card.
Next Step CTA.

Key rules:
- Data visible IMMEDIATELY on load — no empty states
- Every metric has a visual bar comparing to benchmark
- AI insight strip on every section
- Sparklines on every time-series metric

---

## MARKETS (Page 2) — 4-Level Drill-Down

LEVEL 1 (National): Choropleth map + top 5 ranked markets + signal convergence + AI insight + controversial contrarian alert
LEVEL 2 (State): State metro map + metros ranked with sparklines + SHAP factor attribution + Sankey capital flow + AI insight
LEVEL 3 (City): ZIP code map + key metrics with benchmark bars + 5 signal deep dive with explanations + HPI forecast with confidence bands + AI deep analysis
LEVEL 4 (ZIP): ZIP snapshot metrics + investment math waterfall + reverse solver + available properties with scores

Key rules:
- EVERY chart on the page re-renders when geography changes
- More charts appear at each deeper level
- AI gets more specific at each level
- Always show "Find properties →" CTA

---

## ANALYZE (Page 3)

4 entry paths: "I have an address" / "Show me what's hot" / "Find best deal" / "AI pick"
Filters ALWAYS visible: strategy, market, budget, beds, min CF, min cap
Top deals matching criteria shown IMMEDIATELY with score bars, sparklines, pass/fail
#1 Best Match card is large with all metrics visualized
Address input at BOTTOM (secondary, not primary)
Market context always visible

Key rules:
- NO blank form as the starting point
- Strategy selector uses plain English ("Monthly Rental" not "LTR")
- Strategy selection belongs in onboarding, NOT on this page
- Every deal card has sparklines, score bar, pass/fail checks, and AI comment

When FULL ANALYSIS is clicked:
- Verdict card (BUY/PASS/DIG DEEPER) with score ring
- What You Pay / What You Earn two-column
- Key metrics with benchmark bars (cap rate, DSCR, CoC, GRM, break-even vacancy, break-even rate, months supply, price/sqft)
- SHAP factor attribution chart
- Expense waterfall with real ZIP data and source citations
- Stress test survival chart (6 scenarios)
- Monte Carlo IRR distribution
- Signal convergence for this property's market
- HPI trend with confidence bands
- Financing comparison table (Conventional / DSCR / Hard Money)
- "What Your Broker Won't Tell You" urgency section
- AI insight on EVERY section

---

## PIPELINE (Page 4)

Grouped by CITY with separators (not flat list).
Each deal card has sparklines and mini score bars.
Kanban columns: Discovered → Analyzing → Offer → Closed
Click card → side panel with full snapshot + comparison radar + decision journal
"Cost of Waiting" urgency card with real data
AI insight recommending next action

---

## SIMULATOR (Page 5)

Split view: sliders left, live-updating charts right.
Charts: annual cash flow bars, Monte Carlo histogram, sensitivity heatmap, scenario comparison.
AI tells you which variable is most sensitive.
"Import from Analysis" button to pre-fill.

---

## DISCOVER (merged into Analyze — same page)

The Analyze page IS the discover page. Filters + ranked deals + analysis = one flow.

---

## SETTINGS (Page 6)

Profile, buy box criteria, API keys, notification preferences. Simple.
