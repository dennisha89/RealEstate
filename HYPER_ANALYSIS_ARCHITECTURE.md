# Hyper-Multidimensional Property Analysis System

## Overview

A market intelligence engine that analyzes properties across **8 dimensions** to find deals, pull comps, predict appreciation, and surface the exact KPIs driving price movement in any market.

## The 8 Dimensions

### Dimension 1: Financial Fundamentals (Existing - Enhanced)
- Cash flow, cap rate, cash-on-cash return, DSCR, GRM
- Mortgage stress testing across rate scenarios
- Expense ratio benchmarking against market averages

### Dimension 2: Comparable Sales (Comps Engine)
- Radius-based comp search (0.25mi, 0.5mi, 1mi)
- Adjusted comps ($/sqft normalization, age adjustment, condition adjustment)
- Days-on-market trend analysis
- Sale-to-list-price ratio tracking
- Absorption rate (months of inventory)

### Dimension 3: Demographic Velocity
- **Population growth rate** (1yr, 3yr, 5yr trends)
- **Income migration** - median household income trajectory
- **Professional influx** - doctors, engineers, tech workers per capita change
- **Education level shifts** - % with bachelor's/graduate degrees trending
- **Age cohort shifts** - millennials/young families moving in = demand signal
- **Net migration** - people moving in vs out (IRS migration data)

### Dimension 4: Economic Engine
- **Job growth rate** - total nonfarm employment trend
- **Major employer tracking** - new HQs, expansions, closures
- **Industry diversification score** - single-employer risk
- **Unemployment rate** vs national average
- **Wage growth** vs cost of living
- **Business permit applications** - leading indicator

### Dimension 5: Infrastructure & Development
- **Building permits issued** (residential + commercial) - supply pipeline
- **Zoning changes** - upzoning = density = value
- **Transit projects** - new subway/BRT/highway access
- **Commercial development** - new retail, restaurants, grocery stores
- **Hospital/medical facility expansion**
- **School construction/renovation**
- **Tech company office openings**

### Dimension 6: Quality of Life Signals
- **School ratings** (GreatSchools 1-10) and trend direction
- **Crime rate** trend (violent + property) per 1000 residents
- **Walk Score / Transit Score / Bike Score**
- **Healthcare access** - doctors per capita, hospital proximity
- **Park/green space** acreage per capita
- **Restaurant/retail density** - neighborhood vibrancy

### Dimension 7: Supply-Demand Dynamics
- **Months of inventory** (< 3 = seller's market, > 6 = buyer's)
- **Days on market** trend (decreasing = heating up)
- **List-to-sale price ratio** (> 100% = bidding wars)
- **New construction pipeline** vs absorption rate
- **Rental vacancy rate** trend
- **Rent growth rate** (YoY, 3yr CAGR)
- **Housing affordability index** - price-to-income ratio

### Dimension 8: Macro & Risk Factors
- **Interest rate sensitivity** - payment impact per 1% rate change
- **Property tax trajectory** - assessment trend
- **Insurance risk** (flood zone, wildfire, hurricane)
- **Climate risk score** - long-term habitability
- **Regulatory risk** - rent control, eviction moratorium history
- **Market cycle position** - expansion/peak/contraction/trough

---

## Composite Scoring Model

Each dimension produces a **0-100 subscore**. The composite **HyperScore** is a weighted blend:

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Financial Fundamentals | 20% | Day-1 returns matter |
| Comps | 10% | Validates pricing |
| Demographic Velocity | 15% | People drive demand |
| Economic Engine | 15% | Jobs drive people |
| Infrastructure | 10% | Development signals growth |
| Quality of Life | 10% | Retention & desirability |
| Supply-Demand | 15% | Market pressure direction |
| Macro & Risk | 5% | Downside protection |

**HyperScore Interpretation:**
- **90-100**: Generational opportunity - act immediately
- **80-89**: Strong buy - high conviction
- **70-79**: Buy - solid fundamentals with growth catalysts
- **60-69**: Lean buy - good but monitor
- **50-59**: Neutral - market-rate, no edge
- **40-49**: Lean pass - headwinds present
- **30-39**: Pass - multiple risk factors
- **0-29**: Hard pass - deteriorating market

---

## Deal Finder Engine

The deal finder actively scans for opportunities using configurable filters:

### Deal Types
1. **Below-Market Value** - Price < comps-adjusted value by X%
2. **Cash Flow Plays** - Monthly cash flow > $X threshold
3. **Appreciation Bets** - High demographic + economic velocity, lower current returns
4. **Value-Add** - Properties with forced appreciation potential (renovate to ARV)
5. **Distressed** - Foreclosures, short sales, estate sales, tax liens

### Alert Triggers
- New listing matches criteria within 15 minutes
- Price reduction on watched properties
- Days-on-market exceeds threshold (motivated seller)
- Demographic data update changes market score

---

## Appreciation Prediction Model

### Inputs (Feature Vector)
```
population_growth_rate_3yr
median_income_growth_rate_3yr
job_growth_rate_3yr
building_permits_trend
months_of_inventory_trend
rent_growth_rate_3yr
school_rating_change
crime_rate_change
transit_score_change
major_employer_events (+/-)
zoning_change_impact
interest_rate_forecast
```

### Output
- **1-Year Predicted Appreciation**: X.X% (confidence interval)
- **3-Year Predicted Appreciation**: X.X% (confidence interval)
- **5-Year Predicted Appreciation**: X.X% (confidence interval)
- **Primary Drivers**: ranked list of which KPIs are pushing price

### Model Approach
- Historical regression on metro-level + zip-level data
- Feature importance ranking shows exactly WHAT is driving prices
- Scenario analysis: "If population grows 2% instead of 1%, appreciation = X%"

---

## Data Sources

| Data | Source | Update Frequency |
|------|--------|-----------------|
| Property listings | Zillow/Redfin scraping, MLS API | Real-time |
| Comps/sales | County recorder, Zillow | Daily |
| Demographics | Census ACS, IRS SOI migration | Annual |
| Jobs/employment | BLS QCEW, state labor dept | Monthly |
| Building permits | Census Building Permits Survey | Monthly |
| School ratings | GreatSchools API | Annual |
| Crime data | FBI UCR, local PD APIs | Annual/Quarterly |
| Walk/Transit scores | Walk Score API | On-demand |
| Rent data | RentCast, Zillow ZORI | Monthly |
| Interest rates | FRED API (Federal Reserve) | Daily |
| Climate risk | FEMA, First Street Foundation | Annual |

---

## API Endpoints

```
POST /api/analyze              - Enhanced single-property analysis (all 8 dimensions)
POST /api/comps                - Pull and adjust comparable sales
POST /api/market-intelligence  - Full market/zip-code analysis
POST /api/deals/scan           - Scan for deals matching criteria
POST /api/appreciation/predict - Appreciation prediction for a market
GET  /api/dimensions/:zip      - All dimension scores for a zip code
GET  /api/kpi-drivers/:zip     - Ranked KPIs driving prices in a market
POST /api/alerts               - Set up deal alerts
```
