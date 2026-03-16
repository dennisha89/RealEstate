# LootVue Validation, Backtest & Product Foundation Plan

**Date**: 2026-03-16
**Status**: Draft — Pending User Approval
**Purpose**: Prove the capital flow composite signal works before building UI around it. Every feature must be backed by validated calculations and real data. No gimmicks.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Thesis & Hypothesis](#2-thesis--hypothesis)
3. [Backtest Plan](#3-backtest-plan)
4. [Calculation Validation Plan](#4-calculation-validation-plan)
5. [Confluence Verification Plan](#5-confluence-verification-plan)
6. [Data Source Audit](#6-data-source-audit)
7. [Tech Stack Audit](#7-tech-stack-audit)
8. [Product Architecture (Grounded in Validated Signals)](#8-product-architecture)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Problem Statement

Retail real estate investors make market selection decisions based on **lagging indicators** (Zillow price history, BiggerPockets anecdotes, podcast tips) while institutional investors use **leading indicators** (capital flows, fund formations, migration data, investor loan shifts) to enter markets 12-18 months earlier.

This information asymmetry is the #1 structural disadvantage retail investors face. No consumer tool solves it.

**Evidence**:
- 65% of investors say finding cash-flowing deals is their biggest frustration (Stessa-ResiClub Q4 2025)
- 83% cite interest rates as top concern
- 59% require 6%+ cap rate — indicating they need to find underpriced markets before prices rise
- Every existing tool is reactive (see Competitive Analysis in `/docs/COMPETITIVE_LANDSCAPE.md`)

---

## 2. Thesis & Hypothesis

### Thesis
"Capital flow signals — particularly IRS migration AGI flows, HMDA investor loan share shifts, and building permit acceleration — are leading indicators of MSA-level house price appreciation, detectable 12-18 months before price movements materialize."

### Testable Hypotheses

**H1 (Primary)**: MSAs ranking in the top quintile of a weighted capital flow composite score will show statistically significantly higher FHFA HPI appreciation over the following 18 months compared to bottom-quintile MSAs.

**H2 (Migration Signal)**: MSAs receiving net positive IRS AGI migration flows will show higher subsequent HPI appreciation than MSAs with net outflows, with a lead time of 12-24 months.

**H3 (Investor Activity Signal)**: MSAs where HMDA investment-property loan share is increasing will show higher subsequent HPI appreciation than MSAs where investor share is declining.

**H4 (Supply Signal)**: MSAs with accelerating building permits will show LOWER subsequent HPI appreciation than MSAs with decelerating permits (supply constrains price growth per Glaeser-Gyourko-Saiz).

**H5 (Composite > Individual)**: The weighted composite of multiple signals outperforms any single signal alone in predictive accuracy (diversification of information sources reduces noise).

### Null Hypotheses (What Kills the Thesis)
- H1_null: No statistically significant difference in forward returns between Q1 and Q5 (p > 0.05)
- Composite Spearman correlation with forward HPI < 0.10
- Walk-forward accuracy < random (50%)
- Signal works in-sample but fails out-of-sample (overfitting)

---

## 3. Backtest Plan

### 3.1 Data Sources (All Free, Public)

| Dataset | Source | Granularity | Frequency | History | Download |
|---------|--------|-------------|-----------|---------|----------|
| House Price Index (TARGET) | FHFA HPI | 400+ MSAs | Quarterly | 1975-2025 | CSV: fhfa.gov/data/hpi/datasets |
| AGI Migration Flows | IRS SOI | County-to-county | Annual | 1991-2022 | CSV: irs.gov/statistics/soi-tax-stats-migration-data-downloads |
| Investment Loan Share | CFPB HMDA | MSA + county | Annual | 2007-2024 | API/CSV: ffiec.cfpb.gov/data-browser |
| Building Permits | FRED | MSA, monthly | Monthly | 1988-2025 | FRED API: series per MSA (e.g., CHIC917BPPRIV) |
| Mortgage Rates | FRED MORTGAGE30US | National | Weekly | 1971-2025 | FRED API |
| M2 Money Velocity | FRED M2V | National | Quarterly | 1959-2025 | FRED API |
| Housing Supply Elasticity | Saiz (2010) | MSA | Static | Cross-section | Published data (282 MSAs) |

### 3.2 Universe

- **Primary universe**: Top 100 MSAs by population (covers ~75% of US housing market)
- **Extended universe**: All ~400 MSAs with FHFA HPI data (for robustness checks)
- **Time period**: 2010Q1 - 2023Q4 (14 years, covers recovery + expansion + COVID + rate shock)
  - Why start 2010: IRS AGI-level migration data starts 2011. HMDA modernized format starts 2007. Need 2-3 years for rolling z-score initialization.
  - Why end 2023: Most recent complete year for all datasets.

### 3.3 Signal Construction

For each MSA `m` and quarter `q`:

#### Layer 1: Leading Indicators (40% weight)

**Signal 1: IRS Net AGI Migration Z-Score**
```
raw = net_agi_inflow(m, year) - net_agi_outflow(m, year)
       (aggregate county-to-county flows to MSA level)
z = (raw - rolling_mean_10yr) / rolling_std_10yr
z = clamp(z, -3, +3)
```
Note: Annual data → assign to Q4 of filing year. Interpolate for other quarters using linear interpolation between years.

**Signal 2: HMDA Investor Loan Share Change Z-Score**
```
investor_share(m, year) = count(occupancy_type = "investment") / count(all_originated)
raw = investor_share(m, year) - investor_share(m, year-1)  // year-over-year change in pp
z = (raw - rolling_mean_10yr) / rolling_std_10yr
z = clamp(z, -3, +3)
```
Note: Annual data → same interpolation approach.

#### Layer 2: Concurrent Indicators (35% weight)

**Signal 3: Building Permits YoY Change Z-Score**
```
permits_quarterly(m, q) = sum(monthly_permits for 3 months)
raw = (permits_quarterly(m, q) - permits_quarterly(m, q-4)) / permits_quarterly(m, q-4) * 100
z = (raw - rolling_mean_10yr) / rolling_std_10yr
z = clamp(z, -3, +3)
```

#### Layer 3: Confirming Indicators (25% weight)

**Signal 4: Mortgage Rate Environment Z-Score (INVERTED)**
```
raw = avg_weekly_rate_for_quarter
z = -1 * (raw - rolling_mean_10yr) / rolling_std_10yr  // inverted: lower rate = positive
z = clamp(z, -3, +3)
```
Note: National-level, same for all MSAs. Captures macro financing environment.

**Signal 5: M2 Velocity Z-Score**
```
raw = M2V for quarter
z = (raw - rolling_mean_10yr) / rolling_std_10yr
z = clamp(z, -3, +3)
```
Note: National-level, same for all MSAs.

**Signal 6: FHFA HPI 6-Month Momentum Z-Score**
```
raw = (HPI(m, q) - HPI(m, q-2)) / HPI(m, q-2) * 100  // 6-month price momentum
z = (raw - rolling_mean_10yr) / rolling_std_10yr
z = clamp(z, -3, +3)
```

#### Composite Score

```
leading_z    = mean(signal_1_z, signal_2_z)
concurrent_z = signal_3_z
confirming_z = mean(signal_4_z, signal_5_z, signal_6_z)

composite_z = (0.40 * leading_z) + (0.35 * concurrent_z) + (0.25 * confirming_z)

score = 50 + (composite_z * 16.67)  // maps ±3σ to 0-100
score = clamp(score, 0, 100)
```

### 3.4 Testing Protocol

#### Test 1: Quintile Return Spread
For each quarter, rank all MSAs by composite score into quintiles (Q1=top 20%, Q5=bottom 20%). Compute mean/median forward FHFA HPI appreciation for each quintile over 6, 12, 18, 24 months.

**Success criteria**: Q1 forward 18-month return > Q5 forward 18-month return by >= 3 percentage points. Monotonic ordering across quintiles.

#### Test 2: Spearman Rank Correlation
Compute Spearman rank correlation between composite score and forward 18-month HPI change across all MSA-quarter observations.

**Success criteria**: rho > 0.20, p < 0.01.

#### Test 3: Individual Signal Decomposition
Run Tests 1 and 2 for each signal individually to determine which signals carry predictive power and which are noise.

**Expected**: Not all signals will be significant. Identify the 2-3 that matter most. Remove the rest.

#### Test 4: Walk-Forward Out-of-Sample Validation
- Train period: 2010-2015 (5 years of signal history)
- Test period: 2016 (1 year forward)
- Slide window: Repeat for 2011-2016→2017, 2012-2017→2018, etc.
- 7 out-of-sample periods (2016-2022)

**Success criteria**: Composite score's Q1 outperforms Q5 in >= 5 of 7 out-of-sample years (>70%).

#### Test 5: Regime Analysis
Split sample into:
- **Expansion** (2010-2019): Does signal work during steady growth?
- **COVID shock** (2020-2021): Does signal work during supply disruption?
- **Rate shock** (2022-2023): Does signal work during rate-driven correction?

**Success criteria**: Signal provides useful differentiation in at least 2 of 3 regimes.

#### Test 6: Supply Elasticity Control
Control for Saiz (2010) housing supply elasticity. A signal that merely identifies supply-constrained cities (which always appreciate more) is not useful — the investor can just look up Saiz elasticity scores.

**Test**: Add supply_elasticity as a control variable. Does composite score still predict after controlling for supply constraints?

### 3.5 Output Deliverables

1. **Quintile return table** — 5 quintiles x 4 time horizons (6/12/18/24mo) with mean, median, std dev
2. **Correlation matrix** — Each signal vs forward returns, signals vs each other (check for multicollinearity)
3. **Walk-forward results table** — 7 out-of-sample years, Q1 vs Q5 spread in each
4. **Signal importance ranking** — Which signals actually predict, which are noise
5. **Regime analysis table** — Performance in expansion, COVID, rate shock
6. **Revised model weights** — If backtest shows some signals don't work, remove them and reweight
7. **One-page executive summary** — "The capital flow composite predicts [X] with [Y] accuracy" or "The thesis is wrong, here's what the data actually shows"

### 3.6 Implementation

**Language**: Python (pandas, scipy, matplotlib)
**Why not TypeScript**: Data science libraries are vastly better in Python. This is a one-time research task, not production code. Results feed into TypeScript engines after validation.
**Location**: `/backtest/` directory in repo root
**Files**:
- `backtest/data/` — Downloaded CSVs (gitignored)
- `backtest/01_download_data.py` — Fetch FRED API + download FHFA/IRS/HMDA CSVs
- `backtest/02_build_signals.py` — Compute z-scores for each signal
- `backtest/03_composite_score.py` — Weighted composite + quintile assignment
- `backtest/04_forward_returns.py` — Match composite scores to forward HPI changes
- `backtest/05_statistical_tests.py` — Spearman, t-test, walk-forward, regime analysis
- `backtest/06_visualize_results.py` — Charts for quintile spreads, correlations, time series
- `backtest/RESULTS.md` — Human-readable summary of findings

---

## 4. Calculation Validation Plan

Every financial calculation shown to users must be verified against authoritative sources.

### 4.1 Mortgage Calculations

| Calculation | Formula | Verification Source | Test Method |
|-------------|---------|-------------------|-------------|
| Monthly P&I | `P * r(1+r)^n / ((1+r)^n - 1)` | Freddie Mac mortgage calculator | Input same values, compare to 2 decimal places |
| PMI | `loan_amount * pmi_rate / 12` | Fannie Mae PMI guidelines | Compare against published PMI rate tables |
| Monthly PITI | `P&I + tax/12 + insurance/12 + PMI` | Bankrate calculator | Cross-check with 3 sources |
| Amortization schedule | Standard amortization formula | Excel `PPMT`/`IPMT` functions | Verify balance at year 1, 5, 10, 15, 30 |
| Remaining balance at year Y | `P * ((1+r)^n - (1+r)^(12*Y)) / ((1+r)^n - 1)` | Amortization.com | Spot-check at 5 year intervals |

### 4.2 Investment Metrics

| Metric | Formula | Verification Source | Known Test Value |
|--------|---------|-------------------|-----------------|
| Cap Rate | `NOI / Purchase Price` | CCIM Institute definition | $50K NOI / $500K price = 10.00% |
| Cash-on-Cash | `Annual Pre-Tax Cash Flow / Total Cash Invested` | CCIM Institute | $12K cash flow / $100K invested = 12.00% |
| DSCR | `NOI / Annual Debt Service` | Lender standard | $60K NOI / $48K debt service = 1.25x |
| GRM | `Price / Annual Gross Rent` | Appraisal Institute | $400K / $48K = 8.33 |
| Rent-to-Price | `Monthly Rent / Price * 100` | 1% rule benchmark | $4,000 / $400K = 1.00% |

### 4.3 Institutional Metrics (Blackstone-Grade)

| Metric | Formula | Verification Source | Test Method |
|--------|---------|-------------------|-------------|
| Debt Yield | `NOI / Loan Amount` | CMBS/CREFC standard | Test against published CMBS thresholds |
| Yield-on-Cost | `Stabilized NOI / Total Cost` | NCREIF methodology | Compare with published NCREIF benchmarks |
| Loan-to-Cost | `Loan / Total Cost` | Lender underwriting standard | Should never exceed 0.75 for institutional |
| Unlevered IRR | NPV solver (Newton-Raphson) | Excel `IRR()` function | Hand-calculate 3-year example, verify to 4 decimals |
| Levered IRR | NPV solver on leveraged cash flows | Excel `IRR()` function | Same but with mortgage payments subtracted |
| Equity Multiple | `Total Distributions / Equity Invested` | Waterfall standard | $200K distributions / $100K equity = 2.0x |
| Exit Cap Sensitivity | Table: ±50bps, ±25bps, baseline | Common CMBS reporting format | Verify each cell independently |

### 4.4 DCF / NPV

| Parameter | Validation Method |
|-----------|------------------|
| Discount rate | Research current WACC for RE. Cross-check with Damodaran's published cost of capital |
| Terminal value | Verify exit cap method vs Gordon Growth yield same-ballpark result |
| Mid-year convention | Test that mid-year discounting produces ~2-3% higher NPV than end-of-year |
| Cash flow growth | Verify rent growth assumptions against BLS CPI rent component and Zillow ZORI |

### 4.5 Monte Carlo

| Aspect | Validation Method |
|--------|------------------|
| PRNG reproducibility | Same seed → identical distribution. Test with Mulberry32 seeded PRNG |
| Convergence | Compare P50 at 5,000 vs 10,000 vs 50,000 iterations. Must converge within 0.5% |
| Correlation matrix | Verify Cholesky decomposition produces correct correlation between rent growth & vacancy. Test against known 2x2 matrix |
| Distribution shape | Test that generated normal samples match expected mean/stddev within 1% at N=10,000 |
| Percentile accuracy | Known analytical solution for lognormal: verify P10/P50/P90 match closed-form at N=50,000 |

### 4.6 Stress Testing

| Scenario | Parameters | Verification |
|----------|-----------|-------------|
| Rate shock +200bps | Increase rate, recompute DSCR | Verify DSCR drops as expected per amortization math |
| Vacancy spike 2x | Double vacancy rate, recompute NOI | NOI should drop by exactly (monthly_rent * additional_vacancy_months) |
| Rent decline -10% | Reduce rent 10%, cascade to NOI/DSCR/CF | Verify all downstream metrics update correctly |
| Insurance surge +50% | Increase insurance, recompute expenses | Simple addition — verify it flows through |
| Combined severe | All above simultaneously | Verify DSCR break-even point matches hand calculation |
| Break-even rates | Solve for rate where DSCR = 1.0 | Use bisection method, verify against Excel Goal Seek |

---

## 5. Confluence Verification Plan

"Confluence" = multiple independent signals pointing in the same direction. For each confluence LootVue presents, we must verify the underlying signals are genuinely independent and their combination adds information.

### 5.1 Signal Independence Testing

For each pair of signals in the capital flow composite, compute Pearson correlation over the full sample period. Signals with |r| > 0.70 are NOT independent and one should be removed (keeps only the more predictive signal).

**Expected high correlation pairs (potential removal):**
- Building permits ↔ HPI momentum (both reflect market heat)
- M2 velocity ↔ mortgage rates (both reflect monetary policy)

**Expected low correlation pairs (genuinely independent):**
- IRS migration ↔ building permits (demand vs supply)
- HMDA investor share ↔ mortgage rates (investor behavior vs macro)

### 5.2 Confluence Scoring Rules

A "Buy" signal requires confluence across AT LEAST 2 of 3 layers:
- Leading layer bullish (score > 60) AND
- (Concurrent bullish OR Confirming bullish)

A single strong signal is NOT sufficient. This prevents false positives from one noisy signal.

### 5.3 Dallas Fed Methodology Integration

For bubble detection, adopt the Dallas Fed's exuberance testing methodology (Pavlidis et al., 2015):
- Compute price-to-rent ratio for each MSA
- Apply recursive right-tailed ADF test (SADF/GSADF)
- Date-stamp exuberance periods
- Cross-reference with capital flow composite: Are high-score markets also showing exuberance? If so, flag as "momentum-driven, elevated risk"

### 5.4 Supply Elasticity Integration

Per Glaeser-Gyourko-Saiz: inelastic-supply markets see bigger price swings. Our capital flow signal should be WEIGHTED by supply elasticity:
- High capital flow + low elasticity = STRONG price signal (limited supply amplifies demand)
- High capital flow + high elasticity = MODERATE signal (supply can absorb demand)

This is a known, published, validated relationship (R-squared = 0.91 in original Glaeser et al. paper with 2,212 observations across 79 MSAs over 28 years).

### 5.5 What Gets Removed If It Doesn't Validate

| Signal | If Backtest Shows No Predictive Power | Action |
|--------|---------------------------------------|--------|
| IRS AGI migration | Remove from composite, note as "informational only" | Reduce leading layer to HMDA only |
| HMDA investor share | Remove from composite | Leading layer becomes migration-only or eliminated |
| Building permits | Remove from composite | Concurrent layer eliminated, reweight to 2-layer |
| Mortgage rates (inverted) | Remove if no cross-sectional variation | Expected — national signal can't differentiate MSAs |
| M2 velocity | Remove if no cross-sectional variation | Same issue as mortgage rates |
| HPI momentum | Remove if correlation with target > 0.8 (look-ahead proxy) | Momentum is partially mechanical |

**If all leading signals fail**: The thesis is wrong. Pivot to a pure financial analysis tool (DealCheck competitor) instead of a predictive market intelligence tool.

---

## 6. Data Source Audit

### 6.1 Current State: What's Real vs Mock

| Data Source | Engine | Current Status | Action Required |
|-------------|--------|---------------|----------------|
| FRED (rates, permits, M2, HPI) | Multiple | Partially wired (rates API working) | Wire remaining series |
| Census ACS (demographics) | demographic-engine | Partially wired (rankings API) | Expand to migration tables |
| FHFA HPI | capital-flow-composite | MOCK | Wire via FRED API |
| IRS SOI Migration | capital-migration-engine | MOCK | Download CSV, build ETL |
| CFPB HMDA | capital-migration-engine | MOCK | Wire via CFPB API |
| ATTOM (property data) | data-sources.ts | MOCK (key exists, not wired) | Wire property endpoints |
| RentCast (rental data) | data-sources.ts | MOCK (partially wired) | Complete wiring |
| Zillow ZHVI | None | NOT INTEGRATED | Download CSV for ZIP-level prices |
| SEC EDGAR (Form D) | institutional-capital-engine | MOCK | Phase 2 — complex parsing |
| Google Trends | capital-flow-composite | MOCK | Phase 2 — fragile API |
| County recorder (LLC data) | institutional-capital-engine | MOCK | Phase 3 — requires Bright Data |

### 6.2 Data Quality Rules

Every data point shown to users must include:
1. **Source attribution**: "Source: FHFA HPI via FRED API, Q3 2025"
2. **Freshness indicator**: `fresh` (< TTL), `cached` (within TTL), `stale` (> TTL, labeled), `error` (show fallback)
3. **Coverage disclosure**: "Data available for 382 of 400 MSAs. 18 MSAs excluded due to insufficient transaction volume."
4. **Lag disclosure**: "IRS migration data has a 2-year lag. Most recent: filing year 2022."
5. **Confidence interval**: Where applicable, show ± range, not point estimate

### 6.3 Mock Data Policy

- Mock data is ONLY used in development environment
- Production environment MUST show real data or explicit "Data unavailable" states
- No mock data is EVER presented as real to users
- All `generateMock*()` functions are wrapped in `if (process.env.NODE_ENV === 'development')` guards
- Feature flags control which data sources are shown based on real availability

---

## 7. Tech Stack Audit

### 7.1 Current Inconsistencies Between lootvue/ and property-analyzer/

| Package | lootvue | property-analyzer | Action |
|---------|---------|-------------------|--------|
| **zod** | `^3.23.0` | `^4.3.6` | CRITICAL: Align lootvue to v4. Breaking changes documented in session handoff. |
| **@supabase/supabase-js** | `^2.99.1` | `^2.43.0` | Align to `^2.99.1` (latest) |
| **@supabase/ssr** | Present | Missing | Add to property-analyzer if it has auth |
| **axios** | `^1.13.6` | `^1.7.0` | Align to `^1.13.6` (latest) |
| **next** | `14.2.35` | `^14.2.0` | Align to `14.2.35` (pinned) |
| **react** | `^18` | `^18.3.0` | Minor — both resolve to 18.x |
| **cheerio** | Missing | Present | Keep in property-analyzer only (server-side scraping) |
| **playwright** | Missing | Present (devDep) | Keep in property-analyzer only (E2E tests) |

### 7.2 Tech Stack Assessment: Is This the Right Stack?

| Layer | Current | Assessment | Verdict |
|-------|---------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | Industry standard for React. SSR, API routes, good DX. | KEEP |
| **Language** | TypeScript 5 (strict) | Required for financial accuracy. No `any`. | KEEP |
| **UI Library** | React 18 | Stable, huge ecosystem. React 19 not needed yet. | KEEP |
| **Styling** | Tailwind CSS 3.4 | Fast iteration, consistent design tokens. | KEEP |
| **State** | Zustand 4.5 | Lightweight, no boilerplate. Perfect for this app size. | KEEP |
| **Charts** | Recharts 2.15 | Good enough for standard charts. Limitation: no geographic heatmaps (choropleth). | KEEP + ADD geographic viz library (see below) |
| **Validation** | Zod 4.3 | Type-safe validation at boundaries. v4 is current. | KEEP — align lootvue to v4 |
| **Data Fetching** | @tanstack/react-query 5 + axios | SWR pattern, caching, deduplication. | KEEP |
| **Database** | PostgreSQL 15 + TimescaleDB + Supabase | Time-series optimized. Supabase for auth + real-time. | KEEP |
| **AI** | @anthropic-ai/sdk (Claude) | Direct SDK access, streaming, structured output. | KEEP |
| **Testing** | Jest 30 + RTL + Playwright | Unit + component + E2E. | KEEP |
| **Auth** | Supabase Auth via @supabase/ssr | Standard, works well with Next.js. | KEEP |

### 7.3 What's Missing from the Stack

| Need | Current Gap | Recommended Addition | Why |
|------|-----------|---------------------|-----|
| **Geographic visualization** (choropleth maps, state/MSA heatmaps) | Recharts has no map support | `react-simple-maps` (lightweight, D3-based, SSR-friendly) | Capital Flow Explorer needs US state/MSA choropleth maps. react-map-gl is heavy (Mapbox); react-simple-maps is ~40KB and uses TopoJSON. |
| **CSV parsing** (for FHFA, IRS, Zillow data ingestion) | None | `papaparse` (streaming CSV parser) | Need to ingest large CSVs (FHFA HPI, IRS migration, Zillow ZHVI) |
| **Statistics** (z-score, correlation, t-test in production) | None (only in backtest Python) | `simple-statistics` (tiny, no dependencies) | Production engines need z-score computation on live data |
| **Backtest tooling** (one-time research) | None | Python: `pandas`, `scipy`, `matplotlib` | Standard data science stack for backtest. Does NOT enter production. |
| **Date handling** | Native `Date` | `date-fns` (tree-shakeable) | Time-series manipulation needs reliable date math |

### 7.4 What to NOT Add

| Library | Why Not |
|---------|---------|
| D3.js (full) | Too large, too low-level. react-simple-maps wraps D3 geo. |
| Mapbox GL / react-map-gl | Heavy (~300KB), requires API key, overkill for choropleth. Add later ONLY if we need street-level maps. |
| echarts | Removed in prior session. Recharts is standard. |
| deck.gl | Removed in prior session. WebGL overkill. |
| MUI / Chakra / shadcn | Custom design system already built in globals.css. Adding a component library creates conflicts. |
| Redux | Zustand is simpler and sufficient. No benefit to switching. |
| GraphQL | REST + React Query is working. GraphQL adds complexity without benefit at this scale. |

---

## 8. Product Architecture (Grounded in Validated Signals)

### 8.1 Core Principle
**Every screen element must trace back to a validated calculation or a real data source. If it can't, it doesn't ship.**

### 8.2 The 7-Phase Investor Journey (Research-Backed)

Based on institutional RE frameworks (Roulac 1994, FNRP transaction lifecycle, CrowdStreet):

| Phase | Page | Core Decision | Data Required | Validated? |
|-------|------|--------------|---------------|-----------|
| **1. THESIS** | Buy Box / Criteria | "What am I looking for?" | User input (price range, cap rate min, strategy) | N/A — user-defined |
| **2. MARKETS** | Capital Flow Explorer | "Where should I invest?" | FHFA HPI, IRS migration, HMDA, permits, rates | **REQUIRES BACKTEST** |
| **3. DISCOVER** | Find Deals | "What's available?" | Property listings (ATTOM/RentCast) | Dependent on API data quality |
| **4. UNDERWRITE** | Score + Simulate + Compare | "Is the math good?" | Financial calculations | **VALIDATE per Section 4** |
| **5. FINANCE** | Rates + Lender Match | "How do I pay?" | FRED rates (real), lender database | Rates validated, lenders need real partners |
| **6. EXECUTE** | Pipeline + Deal Room | "Close the deal" | User workflow | N/A — workflow tool |
| **7. MANAGE** | Portfolio + Alerts | "How's it performing?" | Portfolio calculations + market monitoring | **VALIDATE calcs per Section 4** |

### 8.3 What Ships ONLY After Backtest

- Capital Flow Explorer (Phases 1-2) — ships ONLY if backtest validates the composite signal
- Market "Buy/Hold/Avoid" signals — ships ONLY if quintile spread is statistically significant
- Capital flow heatmaps — ships ONLY with real data from wired APIs
- "Where money is flowing" narrative — ships ONLY if IRS migration signal validates

### 8.4 What Ships Regardless of Backtest

These are financial calculation tools that are independently valuable even if the predictive signal fails:

- Score Property (12-engine analysis with validated formulas)
- DCF / Monte Carlo simulator
- Stress testing
- Loan comparison calculator
- Portfolio tracking
- Deal pipeline management
- Lender matching
- Rate environment dashboard (already wired to FRED)

### 8.5 Visualization Mapping

Every chart type maps to a validated data source and serves a specific decision:

| Visualization | Where It Appears | Data Source | Decision It Serves |
|--------------|-----------------|------------|-------------------|
| **Choropleth heatmap** (state-level) | Capital Flow Explorer L1 | FHFA HPI + validated composite | "Which states have strongest capital inflow?" |
| **Bubble map** (metro-level) | Capital Flow Explorer L2 | Same, MSA granularity | "Which metros within this state?" |
| **ZIP heatmap** | Capital Flow Explorer L3 | Zillow ZHVI + ATTOM | "Which neighborhoods?" |
| **Dual-axis time series** | Every geographic level | HPI (left axis) + composite score (right axis) | "Is price following capital flow?" |
| **Ranked data table** | Every geographic level | All metrics, sortable | "Show me the numbers" |
| **Radar chart** | Compare mode | Multi-dimensional metrics | "How do these markets differ?" |
| **Stacked area chart** | Capital origin breakdown | IRS migration + HMDA | "Where is money coming from?" |
| **Histogram** | Monte Carlo results | Simulated distribution | "What's my range of outcomes?" |
| **Sensitivity table** | DCF output | Discount rate × exit cap | "How sensitive is IRR to assumptions?" |
| **Waterfall chart** | Cash flow breakdown | Income - expenses - debt | "Where does my money go?" |
| **Gauge / semicircle** | DSCR display | Calculation | "Is my debt coverage healthy?" |
| **Sparklines** | Tables + cards | Any time series | "Quick trend direction" |

### 8.6 AI Integration Points

AI adds narrative interpretation, NOT computation. Engines compute. AI explains.

| AI Feature | Where | What It Does | What It Does NOT Do |
|-----------|-------|-------------|-------------------|
| Market narrative | Capital Flow Explorer | "Capital is rotating from coastal to Sun Belt because..." | Does NOT compute scores |
| Deal thesis | Score Property | "This property's strength is [X], risk is [Y]" | Does NOT calculate metrics |
| Financing advisor | Lender Match | "DSCR loan is best because your DTI exceeds..." | Does NOT compute payments |
| Portfolio insight | Portfolio page | "Your concentration in Austin (36%) creates risk..." | Does NOT track expenses |
| Contradiction flag | Everywhere | "AI says Buy but Deal Grade is D — investigate" | Flags only, never overrides |

**Every AI output includes**:
- "AI Analysis" badge (clearly labeled)
- Confidence percentage based on data completeness
- Disclaimer: "Informational only, not financial advice"
- Source data citation: "Based on 12-engine analysis and FHFA HPI data"

---

## 9. Implementation Phases

### Phase 0: Foundation (NOW — before any UI work)
1. Align tech stack (Zod v4 across both projects, version alignment)
2. Wire remaining FRED API series (building permits, M2V, FHFA HPI)
3. Download FHFA, IRS SOI, HMDA historical datasets
4. Run backtest (Python, ~12-18 hours of work)
5. Publish results in `backtest/RESULTS.md`
6. **GATE**: If backtest fails, pivot strategy before touching UI

### Phase 1: Validated Core (After backtest succeeds)
1. Build production signal computation engine (TypeScript, using validated weights from backtest)
2. Wire real data for all validated signals
3. Build Capital Flow Explorer (National → State → MSA drill-down with real data)
4. Fix card grid alignment system (CSS grid standardization)
5. Implement journey-based navigation restructure

### Phase 2: Financial Tools (Parallel-safe)
1. Validate all financial calculations per Section 4
2. Score Property improvements (reverse valuation, strategy variants)
3. Financing comparison (6 loan types)
4. Stress testing with validated scenarios
5. Monte Carlo with convergence testing

### Phase 3: Complete Journey
1. ZIP-level drill-down (requires Zillow ZHVI + ATTOM data)
2. Universal comparison at every geographic level
3. Portfolio tracking with real calculation validation
4. Deal pipeline with financing integration
5. AI narrative integration (Claude API)

### Phase 4: Defensible Moat
1. Publish backtest results publicly (blog post / paper)
2. Real-time signal tracking (update scores as new data arrives)
3. Track prediction accuracy over time (LootVue's own Oracle)
4. User behavior data as proprietary signal (requires user base)
5. Continuous model improvement based on new data

---

## Appendix A: Academic References

1. Glaeser, E., Gyourko, J., Saiz, A. (2008). "Housing Supply and Housing Bubbles." Journal of Urban Economics. — Supply elasticity model, R²=0.91
2. Pavlidis, E. et al. (2015). "Monitoring Housing Markets." Dallas Fed Working Paper. — Exuberance testing methodology
3. Saiz, A. (2010). "The Geographic Determinants of Housing Supply." Quarterly Journal of Economics. — MSA-level supply elasticity data
4. Roulac, S. (1994). "The Evolution of Real Estate Decisions." — 4-stage investment decision framework
5. Brown, G., Matysiak, G. (2000). Real Estate Investment: A Capital Market Approach. — Investment process with implementation/audit phases
6. IMF (2024). "How To Spot Housing Bubbles." — Overview of detection methodologies
7. Dallas Fed (2022). "Real-Time Market Monitoring Finds Signs of Brewing U.S. Housing Bubble." — Practical application of exuberance testing

## Appendix B: Data Download URLs

- FHFA HPI Datasets: https://www.fhfa.gov/data/hpi/datasets
- IRS SOI Migration Downloads: https://www.irs.gov/statistics/soi-tax-stats-migration-data-downloads
- IRS SOI County-to-County: https://www.irs.gov/statistics/soi-tax-stats-county-to-county-migration-data-files
- CFPB HMDA Data Browser: https://ffiec.cfpb.gov/data-browser/
- CFPB HMDA Historic Data: https://www.consumerfinance.gov/data-research/hmda/historic-data/
- FRED Building Permits: https://fred.stlouisfed.org/categories/32300
- FRED 30-Year Mortgage: https://fred.stlouisfed.org/series/MORTGAGE30US
- FRED M2 Velocity: https://fred.stlouisfed.org/series/M2V
- Zillow Research Data: https://www.zillow.com/research/data/
- Saiz Elasticity Data: Published in QJE 2010, available via author's page
