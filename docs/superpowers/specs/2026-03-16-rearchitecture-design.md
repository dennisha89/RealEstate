# LootVue Rearchitecture Design Spec

**Date**: 2026-03-16
**Status**: Approved
**Purpose**: Compact LootVue from 29 pages / 60 engines to 7 pages / ~25 active engines. Every feature serves one of two questions: "Is this market going up or down?" and "Is this specific deal good or bad?"

---

## 1. Problem Statement

LootVue has 29 pages, 60 engines, 13 stores, and 12 confluences — but can't accurately tell a user whether a specific rental property is a good deal. The deal analysis engine (the biggest gap per competitive analysis) uses hardcoded national averages for expenses, has no real comp data, and orphans its most sophisticated engines (DCF, Monte Carlo) without ever calling them.

Meanwhile, features like Leaderboard, Consensus, Capital Marketplace, and Exchange exist but serve no decision-making purpose and have zero real data.

**The 50 Questions document** (March 2026) reorganizes all work around: what makes a user choose LootVue over a spreadsheet, DealCheck, or Smart Bricks?

## 2. Core Decisions

### 2.1 Two-Phase Product Strategy

**Phase 1: Deal Analyzer** — Ship first. Address in → verdict out. Accurate deal math beats market predictions for user acquisition. DealCheck has 350K users proving demand.

**Phase 2: Market Intelligence** — Ship second. Choropleth heatmap, validated signal stack, comparison. This is the moat — adds "where" to the "what."

### 2.2 Page Compaction (29 → 7)

| Page | Route | Purpose | Absorbs |
|------|-------|---------|---------|
| Dashboard | `/dashboard` | Home: portfolio, rates card, recent analyses, market pulse, search bar | rates, pulse, portfolio overview |
| Analyze | `/dashboard/analyze` | Address → 10-sec verdict → tabs: Summary/Financials/Risk/Market/Financing | analyze + pathway + lending |
| Markets | `/dashboard/markets` | Choropleth heatmap → state → MSA → ZIP. Table toggle. Comparison. | markets + consensus + capital flow explorer |
| Discover | `/dashboard/discover` | Map + list split. Buy box filters. Instant screen. Bulk mode. | discover |
| Pipeline | `/dashboard/pipeline` | Kanban + comparison side panel + deal journal | pipeline + deal-room + compare + decision journal |
| Simulator | `/dashboard/simulator` | DCF + Monte Carlo playground. Sensitivity heatmap. | simulator |
| Settings | `/dashboard/settings` | Profile, buy box, notifications, API keys | settings |

### 2.3 Permanently Killed Pages

- **Consensus** — community sentiment doesn't drive $300K decisions
- **Leaderboard** — gamification before product-market fit is distraction
- **Pulse** — activity feed with no real data is noise
- **Capital Marketplace** — needs real users (Phase 3 someday)
- **Exchange** — needs deal flow (Phase 3 someday)
- **Deal Room** — absorbed into Pipeline
- **Pathway** — navigation IS the pathway
- **Compare** — absorbed into Pipeline side panel
- **Rates** — absorbed into Dashboard card
- **Portfolio** — absorbed into Dashboard section

### 2.4 Engine Consolidation (60 → ~25 active)

**Active engines** (serve the two core questions):
- financial-engine, comps-engine, deal-finder-engine, rental-analysis-engine, cost-insurance-engine (deal math)
- dcf-engine, monte-carlo-engine, stress-test-engine, waterfall-engine (quantitative)
- capital-flow-composite-engine, leading-indicator-engine, bubble-detection-engine, market-forecast-engine (market signals)
- demographic-engine, economic-engine, supply-demand-engine (market context)
- data-sources, data-bridge (infrastructure)
- ai-analysis-engine, memo-generator (AI layer)
- correlation-matrix, master-confluence, orchestrator (confluence — 1 level only)

**Dormant engines** (keep code, don't call until data exists):
- capital-migration-engine (IRS migration — rho=0.01, informational only)
- institutional-capital-engine (no data)
- alternative-signals-engine (no data)
- municipal-prediction-engine (no data)
- All 4 cross-domain confluences (CHRONOS, RIPPLE, MIRROR, ECHO — L2/L3 nesting rejected)
- oracle/prediction-tracker (needs user base)
- 12 domain confluences (reduce to 3 aligned with decision tree layers)

### 2.5 3-Layer Decision Tree Architecture

```
Layer 1: MARKET STRUCTURE     → "Is this a growth market?"
  Signals: permits z-score (0.40), HPI momentum (0.35), rate environment (0.25)
  Pairwise convergence: agree=1.15x, disagree=0.85x

Layer 2: MACRO TIMING          → "Is now a good time to buy?"
  Signals: rate direction, months of supply (pending backtest), employment growth (pending)
  Guardrail: GSADF bubble test + price-to-rent z-score

Layer 3: DEAL QUALITY          → "Is this specific deal good?"
  Signals: cap rate vs market, DSCR ≥ 1.20, positive cash flow, stress test survival
  Verdict: BUY / PASS / DIG DEEPER

MASTER VERDICT: All 3 agree = HIGH CONFIDENCE, diverge = flag + explain
```

### 2.6 Validated Signal Weights

| Signal | Rho | Weight | Status |
|--------|-----|--------|--------|
| Building permits z-score | 0.35 | 0.40 | VALIDATED |
| HPI momentum | 0.33 | 0.35 | VALIDATED |
| Mortgage rate environment | 0.13 | 0.25 | VALIDATED (weak) |
| Pairwise convergence (L1) | 0.56 | multiplier | VALIDATED (BEST) |
| Months of supply | TBD | TBD | DATA READY, AWAITING BACKTEST |
| Employment growth | TBD | TBD | DATA READY, AWAITING BACKTEST |
| IRS migration AGI | 0.01 | 0.00 | DEAD |
| M2 velocity | -0.008 | 0.00 | DEAD |

## 3. Agent Architecture (18 agents)

### New Agents (created this session)
- `quant-researcher` (opus) — Academic research, methodology validation
- `signal-backtester` (opus) — Python backtests against forward HPI
- `engine-builder` (opus) — TypeScript engine building, mock→real

### Updated Agents
- `ui-architect` — Now references 7-page architecture
- `signal-intelligence` — Removed killed page ownership
- `deal-room` — Reduced to discover + pipeline
- `capital-markets` — Refocused to financing tab within Analyze

### New Skills (created this session)
- `backtest-signal` — Full backtest methodology
- `wire-real-data` — Mock→real API replacement workflow
- `plain-english` — MetricDisplay interface, 8th grade reading level rules

## 4. Implementation Buckets

### Bucket 0: Project Equipment — DONE
- CLAUDE.md quant model status block
- 7-page architecture in CLAUDE.md
- 3 new agents, 4 updated agents
- 3 new skills

### Bucket 1: Code Verification & Commit
- tsc + build verification
- Commit all unstaged changes

### Bucket 2: Backtests (data ready)
- Months-of-supply, employment growth, combined model
- Google Trends HSI, HMDA investor loan share

### Bucket 3B: Multi-Strategy Calculator (NEW — from audit)

The codebase is 95% LTR-only. Every other RE business model is 0-40% covered. Need:

**Priority 1 (highest user demand):**
- STR engine: full revenue model (ADR × occupancy × nights), platform fees (Airbnb 3%, VRBO 5%), cleaning/turnover, furnishing depreciation, seasonal modeling, STR-specific cash flow
- Flip engine: ARV, rehab costs, 70% rule MAO, holding costs, flip timeline, flip-specific ROI/IRR
- BRRRR engine: buy → rehab → rent → refinance (cash-out refi LTV, equity extracted) → repeat cycle analysis

**Priority 2:**
- MTR engine: 30-90 day furnished pricing, corporate/travel nurse demand, turnover modeling
- House hack engine: owner-occupied + rental units, FHA/VA eligibility, effective housing cost
- Wholesale engine: assignment fee, MAO, double close

**Priority 3:**
- Commercial/multifamily: unit-mix optimization, lease rollover, stabilization gap, per-unit rehab ROI
- Land/development: residual value, development pro forma, absorption schedule
- 1031 exchange: boot calculation, timing enforcement, debt assumption rules
- Syndication additions: management fees, clawback, capital calls

### Bucket 3: Deal Analysis Engine (Tier 1 — BIGGEST GAP)
- ZIP-level expenses, tax, insurance, rent estimation
- 2-second deal screening
- PITI validation, dynamic exit cap, automated comps
- Single BUY/PASS/DIG DEEPER verdict
- Wire DCF + Monte Carlo (currently orphaned)

### Bucket 4: Real Data Pipeline (ship-blocking)
- FRED series completion, automated ingestion
- Geographic code mapping, Zillow licensing
- Replace all generateMock*() calls

### Bucket 5: Market Score Engine
- Bubble guardrail, regime-aware momentum
- Correlation-adjusted weights, Saiz elasticity

### Bucket 6: UI/UX Rebuild
- 7 dense pages, journey navigation
- Choropleth heatmap, comparison views
- Delete killed pages

### Bucket 7: Plain English & Explainability
- MetricDisplay on all outputs
- SHAP-style attribution, divergence explanation
- 8th grade reading level testing

### Bucket 8: Formula Validation
- Cross-validate all financial formulas
- Unit tests with known-answer cases

### Bucket 9: AI Narrator
- Grounded generation from engine data
- Compliance labeling, low-confidence handling

### Bucket 10: ML Model (LAST)
- CatBoost vs XGBoost evaluation
- SHAP values, drift detection
- Train on RTX 5090

### Bucket 11: Regulatory
- FTC/SEC requirements, AVM rules
- Fallback behavior, self-fulfilling prophecy guard

### Bucket 12: Competitive
- Smart Bricks, DealCheck, Reventure methodology teardown

## 5. Execution Order

```
Bucket 0 (DONE) → 1 → 2 → 3+4 (parallel) → 5 → 6 → 7+8 (parallel) → 9 → 10 → 11 → 12
```

Estimated: ~15-20 sessions total.

## 6. Success Criteria

1. User enters address → gets BUY/PASS/DIG DEEPER in <10 seconds with accurate deal math
2. Market heatmap shows validated signal scores for 31+ MSAs with real data
3. Every metric has a plain English tooltip at 8th grade reading level
4. Zero mock data in production — real API or "Data unavailable"
5. All financial formulas cross-validated against Bankrate/Fannie Mae/Excel XIRR
6. Backtest results published: rho, p-value, quintile spread for every signal used

## Appendix: 50 Questions Mapping

- Tier 1 (Q1-Q10): Deal Analysis → Bucket 3
- Tier 2 (Q11-Q16): Market Score → Bucket 5
- Tier 3 (Q17-Q21): Data Pipeline → Bucket 4
- Tier 4 (Q22-Q26): Plain English → Bucket 7
- Tier 5 (Q27-Q29): Competitive → Bucket 12
- Tier 6 (Q30-Q32): Geographic → Bucket 6
- Tier 7 (Q33-Q35): AI Narrator → Bucket 9
- Tier 8 (Q36-Q38): Formula Validation → Bucket 8
- Tier 9 (Q39-Q43): ML Model → Bucket 10
- Tier 10 (Q44-Q47): Regulatory → Bucket 11
