# RealEstate Intelligence Platform — Complete Requirements

## Vision
The first consumer platform that combines capital flow tracking, city intelligence prediction, and alternative data signals to tell investors WHERE money is moving, WHY, and WHAT will happen next.

## Competitive Position
- **Not competing with**: Zillow (AVM), DealCheck (deal calc), Stessa (portfolio tracking)
- **Competing with**: Reventure (market forecasting), MSCI RCA (capital flows, at 1/100th the price)
- **Unique moat**: Capital flow composite + City AI prediction + Alternative data signals

---

## PHASE 1: Real Data Pipeline (Foundation)
*Without real data, everything is theater. This is the #1 priority.*

### P0 — Free Data Sources (Wire Immediately)

| Source | Data | API | Key Endpoints | Engine That Consumes It |
|--------|------|-----|---------------|------------------------|
| **FRED API** | Mortgage rates, housing starts, permits, unemployment, GDP, M2 velocity, FHFA HPI | `https://api.stlouisfed.org/fred/` | `series/observations` | macro-risk-engine, appreciation-engine |
| **Census ACS** | Population, income, migration, education, housing tenure by tract | `https://api.census.gov/data/` | ACS 5-year estimates | demographic-engine |
| **Census Building Permits** | Residential permits by county/MSA/place | `https://api.census.gov/data/timeseries/bps/` | Monthly permits | infrastructure-engine, appreciation-engine |
| **BLS QCEW** | Employment by industry, wages, establishment counts by county | `https://data.bls.gov/cew/` | Quarterly data | economic-engine |
| **IRS SOI Migration** | County-to-county flows with AGI, returns, exemptions | CSV download from irs.gov | Annual files | capital-migration-engine |
| **HMDA (CFPB)** | Mortgage applications, approvals, denials by census tract | `https://ffiec.cfpb.gov/v2/data-browser-api/` | Filterable by loan purpose, geography | capital-migration-engine |
| **SEC EDGAR Form D** | Private RE fund formation (offering amounts, investor count) | `https://efts.sec.gov/LATEST/` | SIC codes 6500-6553 | institutional-capital-engine |
| **SEC 13F** | Institutional REIT holdings quarterly | `https://efts.sec.gov/LATEST/` | 13F filings | institutional-capital-engine |
| **Redfin Data Center** | Weekly market data + investor purchase share by ZIP | CSV download | Weekly refresh | follow-the-money-engine, supply-demand-engine |
| **FHFA HPI** | Repeat-sales house price index by state/metro/county | FRED API or direct download | Quarterly | appreciation-engine |
| **Google Trends** | Search volume for "[city] homes for sale" etc. | `https://trends.google.com/trends/api/` (unofficial) or pytrends | Daily/weekly | alternative-signals-engine |
| **USPS PMT** | Change-of-address volume by ZIP, population mobility | `https://postalpro.usps.com/pmt` | Monthly | capital-migration-engine, alternative-signals-engine |

### P1 — Low-Cost APIs ($500-5K/yr)

| Source | Data | API | Cost | Engine |
|--------|------|-----|------|--------|
| **Parcl Labs** | Daily price indices, investor metrics, LLC-to-parent mapping, 70K markets | `https://api.parcllabs.com/v1/` | Usage-based | follow-the-money-engine, institutional-capital-engine |
| **Shovels AI** | Building permits + city council decisions | `https://api.shovels.ai/` | Custom | city-development-engine, infrastructure-engine |
| **Walk Score** | Walk/transit/bike scores | Already in data-sources.ts | Per-call | quality-of-life-engine |
| **GreatSchools** | School ratings | Already in data-sources.ts | Per-call | quality-of-life-engine |
| **RentCast** | Rental estimates, rental comps | Already in data-sources.ts | Per-call | rental-analysis-engine |

### P2 — Medium-Cost APIs ($5K-25K/yr)

| Source | Data | API | Cost | Engine |
|--------|------|-----|------|--------|
| **ATTOM** | Property details, sales history, AVMs, 300M permits, owner data | `https://api.gateway.attomdata.com/` | $95/mo+ | financial-engine, comps-engine, data-sources.ts |
| **Bright Data MCP** | Real-time Zillow/Redfin/Realtor scraping | MCP server | Usage-based | deal-finder-engine |
| **Zoneomics** | Zoning codes for 85M lots in 6K cities | `https://api.zoneomics.com/` | Usage-based | city-development-engine |

---

## PHASE 2: Real Prediction Models
*Replace mock generators with research-backed models.*

### Model 1: Market Direction Forecast (Reventure-style)
**Proven: 0.76 correlation, 6x better than Zillow at metro level**

```
Score = w1×InventoryTrend + w2×DOMTrend + w3×PriceCutPct + w4×RecentAppreciation + w5×AffordabilityRatio
```

- Data: Redfin weekly data (free), FRED mortgage rates (free)
- Output: 0-100 score per ZIP, directional forecast (appreciation/depreciation)
- Horizon: 12 months
- File: `lib/engines/market-forecast-engine.ts` (NEW)

### Model 2: Leading Indicator Composite (Dallas Fed-style)
**Proven: r = 0.86 correlation with actual prices**

```
Index_t = f(SingleFamilyPermits_t, HousingStarts_t, NewHomeSales_t, AvgSalePrice_t)
```

- Data: FRED API (free) — series: PERMIT1, HOUST1F, HSN1F, ASPNHSUS
- Output: Leading index value, direction signal
- Lead time: 1-4 quarters
- File: `lib/engines/leading-indicator-engine.ts` (NEW)

### Model 3: Bubble Detection (Dallas Fed / UBS method)
**Proven: Detects explosive price behavior with statistical rigor**

```
Price-to-Income = MedianHomePrice / MedianHouseholdIncome
Price-to-Rent = HomePrice / (AnnualRent)
Flag when either exceeds 2σ from rolling 10-year mean
```

- Data: FRED (MSPUS), Census ACS (income), RentCast (rents)
- Output: Bubble risk score (0-100), risk level (normal/elevated/critical)
- File: `lib/engines/bubble-detection-engine.ts` (NEW)

### Model 4: Capital Flow Composite
**Novel: Nobody offers this at consumer price**

Three-layer weighted index:

**Layer 1 — Leading (40%)**
- SEC Form D RE fund formation volume (6-12mo lead) — 8%
- HMDA investment loan origination shifts (6mo lead) — 8%
- IRS SOI AGI-weighted migration (12-24mo lead) — 6%
- 13F institutional REIT position changes (3-6mo lead) — 6%
- Google Trends "[city] homes for sale" (1-3mo lead) — 12%

**Layer 2 — Concurrent (35%)**
- Parcl Labs institutional acquisition/disposition ratio — 10%
- Redfin investor purchase share — 7%
- USPS change-of-address volume — 8%
- Yelp new restaurant/cafe openings — 5%
- Listing price reduction velocity — 5%

**Layer 3 — Confirming (25%)**
- FRED mortgage rates + M2 velocity — 8%
- Census building permits trend — 7%
- FHFA HPI momentum — 5%
- HUD/USPS vacancy rate changes — 5%

Processing: Normalize to z-scores → PCA for top 3 components → Walk-forward validated weights
Output: Capital Flow Score (0-100) per ZIP/metro
File: `lib/engines/capital-flow-composite-engine.ts` (NEW)

### Model 5: City Intelligence Prediction
**Novel: Nobody connects CIP → zoning → permits → predicted property value change**

Inputs:
- CIP budget allocations (parsed from PDF by Claude API)
- Building permit velocity (Census/Shovels)
- Zoning change applications (city open data/Zoneomics)
- Council voting patterns (Shovels API)
- Municipal bond issuance (MSRB EMMA)
- Municipal credit rating changes
- Water/sewer extension approvals

Outputs:
- Development Probability Score (0-100) per census tract
- Property Value Impact Forecast: `{low, mid, high, confidence}`
- Entry Timing: `pre_announcement | announcement | construction | completion`
- Confidence Score (0.0-1.0)

Research-backed coefficients:
- Transit within 0.5mi: +2.3% to +24%
- Upzoning 17-50%: +15-23%
- Corporate HQ relocation: +10% at ZIP
- School quality +5% test scores: +2.1% prices
- TIF district: +11-19.5%
- New park adjacent: +8-15%
- New hospital 500m: +20% rental price

File: `lib/engines/municipal-prediction-engine.ts` (NEW)

---

## PHASE 3: Alternative Data Signals
*Proven in research, zero consumer RE platforms use them*

| Signal | Source | Proven Accuracy | Implementation |
|--------|--------|----------------|----------------|
| **Google Search Trends** | Google Trends API | 89% directional, 40%+ of monthly variation explained | Fetch weekly, compute rolling z-score |
| **Yelp/Restaurant Openings** | Yelp Fusion API | 0.5% price increase per cafe (Harvard) | Count new food biz by ZIP, 12mo rolling |
| **Building Permit Velocity** | Census BPS / Shovels | 0.86 correlation with prices (Dallas Fed) | Monthly permit count delta by ZIP |
| **USPS Migration Volume** | USPS PostalPro | 3-6 month demand predictor | Monthly inbound/outbound by ZIP |
| **Investor Purchase Share** | Redfin Data Center (free) | Concurrent to 6-month leading | Weekly investor % by metro/ZIP |
| **Listing Price Reduction %** | Bright Data MCP / Redfin | 2-4 month leading indicator | Weekly % of listings with price drops |

Future (Phase 4+):
- Cell phone mobility data (SafeGraph/Placer.ai) — +23% model improvement (MIT)
- Satellite change detection — 91% neighborhood classification accuracy
- Construction equipment GPS — genuinely novel, no published research
- Polymarket housing prediction markets — Parcl Labs partnership

---

## PHASE 4: UI Features That Matter

### Must Build (Differentiation)

| Feature | Why | Priority |
|---------|-----|----------|
| **Interactive heatmap** | Reventure's #1 feature. Color-coded ZIP map for price change, migration, permits, capital flow score | P0 |
| **Confidence intervals on everything** | Nobody does this. Show ranges not points. | P0 |
| **Data source attribution** | Every number shows where it came from | P0 |
| **Cross-source validation alerts** | Flag when sources disagree | P1 |
| **Leading indicator dashboard** | The Dallas Fed 5-variable model as a live dashboard | P1 |
| **Capital flow composite visualization** | The three-layer signal stack as a single view | P1 |
| **City plan AI analyzer** | Upload/link CIP PDF → Claude extracts projects → predict value impact | P2 |
| **PDF report generation** | Required for lender presentations | P2 |
| **Natural language deal search** | "Show me 3bd homes in growing markets with cap rates above 7%" | P3 |

### Keep From Current Build
- 8-dimension HyperScore radar
- Scenario charts (bull/base/bear) — but wire to real ARIMA forecasts
- Stress test panel
- Comps table
- Money flow pages (but wire to real Parcl Labs / SEC / HMDA data)
- Microeconomics dashboard (wire to real BLS/Census data)

### Remove / Defer
- Fake Sankey diagram (replace with real IRS migration flow viz when data is wired)
- Toast notification system (premature)
- AIAnalysisStream (defer until real Claude API integration)
- Mock time-series generator (delete once real data flows)

---

## PHASE 5: New Engines to Build

| Engine | Purpose | Key Data Sources |
|--------|---------|-----------------|
| `market-forecast-engine.ts` | 12-month directional forecast (Reventure-style) | Redfin, FRED |
| `leading-indicator-engine.ts` | Dallas Fed 5-variable composite | FRED |
| `bubble-detection-engine.ts` | Price-to-income/rent explosive behavior detection | FRED, Census, RentCast |
| `capital-flow-composite-engine.ts` | Multi-layer capital flow scoring | SEC, HMDA, IRS, Redfin, Parcl, Google Trends |
| `municipal-prediction-engine.ts` | City plan → property value impact prediction | Shovels, Zoneomics, MSRB, Claude API |
| `google-trends-engine.ts` | Search volume normalization and scoring | Google Trends |
| `alternative-data-engine.ts` | Yelp, USPS, satellite signal aggregation | Yelp API, USPS PMT |

---

## Architecture Principle

**Signal stacking, not model complexity.**

Reventure beat Goldman Sachs with a 5-factor spreadsheet. Two Sigma uses 10,000+ data sources with 250 PhDs. The edge is in the COMBINATION of signals, not in any individual model.

Each engine produces a normalized score (0-100). The composite engines combine scores with validated weights. Walk-forward validation ensures weights aren't overfit.

```
Individual Data Source → Engine (normalize, score) → Composite Engine (weight, combine) → UI (visualize with confidence intervals)
```

---

## Execution Order

1. **Wire free data sources** (FRED, Census, BLS, Redfin, IRS, HMDA, SEC EDGAR, Google Trends)
2. **Build leading-indicator-engine and market-forecast-engine** using free data
3. **Build capital-flow-composite-engine** combining free sources
4. **Wire Parcl Labs API** for institutional investor tracking
5. **Build bubble-detection-engine**
6. **Build interactive heatmap** (the visual hook)
7. **Wire ATTOM API** for property-level data
8. **Build municipal-prediction-engine** with Shovels API
9. **Build alternative-data-engine** (Google Trends, Yelp)
10. **Add confidence intervals to all outputs**

---

## Cost Estimate

| Phase | Sources | Annual Cost |
|-------|---------|-------------|
| Phase 1 (free tier) | FRED, Census, BLS, Redfin, IRS, HMDA, SEC, FHFA, Google Trends | $0 |
| Phase 2 (low cost) | Parcl Labs, Shovels, Walk Score, GreatSchools, RentCast | $2,000-5,000/yr |
| Phase 3 (medium) | ATTOM, Bright Data, Zoneomics, Yelp | $5,000-15,000/yr |
| Phase 4 (if needed) | SafeGraph mobility, satellite imagery | $10,000-30,000/yr |

**Start with $0/yr and build real value before spending.**
