# Mock Data Inventory

**Last audited**: 2026-03-16
**Scope**: `lootvue/src/` and `property-analyzer/` (excluding `node_modules`)
**Faker usage**: None — no `@faker-js` anywhere in either project.

---

## Summary

| Category | Count |
|----------|-------|
| `generateMock*` functions (centralized, lib/mock) | 16 |
| `generateMock*` functions (inline, inside API route files) | 24 |
| Hardcoded static data arrays pretending to be real data | 9 |
| `Math.random()` used for non-UUID data generation | 3 |
| `seededRandom` + deterministic generators in engine/component files | 5 |

**Priority breakdown**:
- P0 (blocks deal analysis): 8 items
- P1 (blocks market intelligence): 12 items
- P2 (nice to have / UI scaffolding): 13 items

**Engine sync note**: `lib/mock/generators.ts` is **duplicated** in both projects — `property-analyzer/lib/mock/generators.ts` and `lootvue/src/lib/mock/generators.ts` contain identical content. Any replacement must happen in both simultaneously.

---

## By File

### `lootvue/src/lib/mock/generators.ts` (and identical copy: `property-analyzer/lib/mock/generators.ts`)

The primary centralized mock library. Both files are identical — the property-analyzer copy is the one actually called from API routes.

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 74 | `generateMockPropertyData(address)` | Fake property specs: estimated value, beds/baths, sqft, yearBuilt, rent estimate — all from address string hash | ATTOM property detail API + RentCast AVM | P0 |
| 103 | `generateMockComps(subject)` | 6 fake comparable sales with seeded prices, sqft, DOM, sale date | ATTOM sales comps API or RentCast comps endpoint | P0 |
| 146 | `generateMockDemographics(zip)` | Population, income, migration, professionals, education, age cohorts — 5 years of history | Census ACS 5-Year (B01003, B19013, B07001, etc.) | P1 |
| 251 | `generateMockEconomy(zip)` | Job growth, unemployment, wage growth, COL index, business permits, GDP, employer list | BLS QCEW + FRED (UNRATE, GDPC1) | P1 |
| 334 | `generateMockInfrastructure(zip)` | Residential/commercial building permits, zoning changes, transit projects, school/office openings | Census BPS via FRED (PERMIT1) + city Socrata open-data APIs | P1 |
| 433 | `generateMockQualityOfLife(zip)` | School ratings, crime rates, walk/transit/bike scores, healthcare access, green space | GreatSchools API + Walk Score API + FBI UCR | P1 |
| 517 | `generateMockSupplyDemand(zip)` | Months of inventory, DOM, list-to-sale ratio, new construction, rental vacancy, rent growth, affordability | FRED (ACTLISCOUUS) + Redfin/Zillow data feeds + Census B25002 | P1 |
| 579 | `generateMockMacroRisk(rate, loan, zip)` | Interest rate data, property tax, insurance costs, climate risk scores, regulatory environment | FRED (MORTGAGE30US, FEDFUNDS) + FEMA flood API + First Street Foundation | P1 |
| 638 | `generateMockFREDMacro()` | Hardcoded national mortgage rate (6.95%), median home price ($420K), unemployment, CPI, GDP, fed funds — **ALREADY PARTIALLY REPLACED** by `fetchRealFREDData()` in data-bridge.ts, but fallback is still this mock | FRED API (already implemented in data-bridge.ts) | P0 |
| 659 | `generateMockAppreciationFeatures(zip)` | 16 appreciation feature inputs: population/income/job growth rates, permit trends, rent growth, school changes | All the above (derived from other replaced sources) | P1 |
| 691 | `generateMockRentalComps(scope)` | 8 fake rental comparables with rent, sqft, beds, amenities, distance | RentCast comparables endpoint | P0 |
| 732 | `generateMockRentalMarketData(scope)` | Median/avg rent by bedroom count and property type, vacancy, days-to-lease, renewal rates | RentCast market stats + Zillow ZORI | P0 |
| 842 | `generateMockRentalBreakdown(metrics, zip)` | Rent distribution buckets, amenity premiums, location premiums, STR estimates | AirDNA (STR) + RentCast (long-term) | P2 |
| 894 | `generateMockTenantDemographics(zip)` | Renter %, avg age/income/credit, top employers, eviction rate | Census B25003 + TransUnion/LexisNexis tenant data | P2 |
| 918 | `generateMockRentalRegulations(scope)` | Rent control, eviction rules, STR restrictions, deposit limits | Local regulation databases (no API; requires manual curation) | P2 |
| 948 | `generateMockHistoricalRents(zip)` | 75 months of monthly median rent history (2020–2026) with seasonality | Zillow ZORI (Zillow Observed Rent Index) — free CSV download, or RentCast historical | P0 |

---

### `lootvue/src/lib/mock/time-series-generator.ts` (and identical copy: `property-analyzer/lib/mock/time-series-generator.ts`)

Generates chart-ready time-series data for all multi-line charts across the dashboard.

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 46 | `generateTimeSeries(zip, options)` | Monthly price/metric series with trend + noise + seasonality | FRED (MSPUS, CSUSHPINSA) or ATTOM historical price data | P1 |
| 85 | `generateForecastSeries(zip, options)` | Bull/base/bear forecast with widening confidence bands | market-forecast-engine.ts outputs (already exists) | P1 |
| 123 | `generateMultiSeries(zip, months)` | Combined price + rent + population + jobs series | FRED (price, jobs) + RentCast (rent) + Census (population) | P1 |
| 162 | `generateScenarios(zip, currentPrice)` | Three scenario projection sets (calls generateForecastSeries) | market-forecast-engine.ts + monte-carlo-engine.ts | P1 |
| 198 | `generateCapitalFlowTimeline(zip, months)` | Stacked capital flow: institutional, retail, foreign, 1031, crowdfunding | capital-flow-composite-engine.ts + follow-the-money-engine.ts real outputs | P2 |
| 236 | `generateSankeyData(zip)` | Sankey diagram nodes/links showing money flow from source to property type | follow-the-money-engine.ts outputs | P2 |
| 281 | `generateKPIDrivers(zip)` | KPI bar chart entries with impact scores, dimension labels, trend labels | All engines combined (hyper-score-engine.ts attribution output) | P2 |
| 300 | `generateDimensionBreakdown(zip)` | 8-dimension stacked bar chart scores + sub-metrics | hyper-score-engine.ts dimension outputs | P1 |

**Note**: `property-analyzer/lib/mock/time-series-generator.ts` is identical to the lootvue copy.

---

### `lootvue/src/lib/mock/lender-data.ts`

| Line | Export | Generates | Replace With | Priority |
|------|--------|-----------|--------------|----------|
| 9 | `MOCK_LENDERS` (array, 8 entries) | Hardcoded lender profiles: rates, terms, LTV limits, features, review counts | LenderTree API, Optimal Blue, or manual lender partnership DB | P2 |

**Currently imported by**: `lootvue/src/app/dashboard/lending/page.tsx` line 13
**Status**: Actively used. Cannot be deleted until real lender data is wired.

---

### `lootvue/src/lib/mock/exchange-data.ts`

| Line | Export | Generates | Replace With | Priority |
|------|--------|-----------|--------------|----------|
| 10 | `MOCK_EXCHANGE_LISTINGS` (array, 6 entries) | Hardcoded deal exchange listings with addresses, prices, DSCR, cash flow, pass reasons | Platform-generated listings from real user deal rooms (requires user-generated content pipeline) | P2 |

**Currently imported by**: `lootvue/src/app/dashboard/exchange/page.tsx` line 11
**Note**: Page code correctly marks mock entries with `l.id.startsWith("ex_mock_")` and can suppress them when real data arrives.

---

### `lootvue/src/lib/mock/capital-data.ts`

| Line | Export | Generates | Replace With | Priority |
|------|--------|-----------|--------------|----------|
| 11 | `MOCK_CAPITAL_POSTS` (array, 3 entries) | Hardcoded capital connection posts (equity seeking, JV, offering equity) | Platform-generated posts from real user deal rooms | P2 |

**Currently imported by**: `lootvue/src/app/dashboard/capital/page.tsx` line 9

---

### `lootvue/src/lib/mock/workflow-data.ts`

| Line | Export/Function | Generates | Replace With | Priority |
|------|-----------------|-----------|--------------|----------|
| 38 | `ALL_MARKETS` (array, 6 entries) | Hardcoded market stats: medianPrice, capRate, hyperScore, popGrowth, jobGrowth, inventory | Real market intelligence API (market-intelligence route + hyper-score-engine) | P1 |
| 47 | `PORTFOLIO_PROPERTIES` (array, 3 entries) | Hardcoded portfolio property details | User's actual portfolio (from deal-pipeline-store + analysis-store) | P2 |
| 65 | `buildSignals(hs)` | Derived signal data from a hyperScore integer — not real engine output | Actual stacked-signal-engine.ts output for the market | P1 |
| 94 | `getTimingVerdict(hs)` | Static timing data with hardcoded mortgage rate (6.95%) and fed funds (5.25%) | timing-engine.ts + rates API real output | P1 |

**Currently imported by**: `lootvue/src/app/dashboard/pathway/page.tsx` line 13
**Note**: `PORTFOLIO_PROPERTIES` duplicates the hardcoded properties in `portfolio/page.tsx` — they need to be unified.

---

### `lootvue/src/lib/mock/nearby-properties.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 39 | `generateNearbyProperties(userLat, userLng, radius, count)` | 20 fake nearby properties with predicted appreciation, hyperScore, cap rate, cash flow, signal | ATTOM radius property search + appreciation-engine + hyper-score-engine | P2 |

**DEAD CODE ALERT**: This function is **exported but never imported** in `lootvue/src/`. It IS imported in `property-analyzer/app/(dashboard)/compare/page.tsx` and `property-analyzer/app/(dashboard)/discover/page.tsx` and `property-analyzer/app/(dashboard)/workflow/page.tsx`. The lootvue copy is unused dead code.

**Delete candidate (lootvue copy)**: Yes, safe to delete `lootvue/src/lib/mock/nearby-properties.ts` once confirmed the discover page in lootvue uses its own inline mock (it does — see below).

---

### `property-analyzer/app/api/market-intelligence/route.ts`

These are **inline duplicates** of the centralized generators. The file has a TODO comment acknowledging this (lines 560–727). They differ from the central generators in that they use `Math.random()` instead of seeded PRNG — meaning results change on every request.

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 564 | `generateMockComps(subject)` | 6 random comparable sales — **non-deterministic** (uses Math.random()) | Import from `lib/mock/generators.ts` then replace with ATTOM | P0 |
| 591 | `generateMockDemographics()` | Hardcoded demographic data | Import from `lib/mock/generators.ts` then replace with Census ACS | P1 |
| 616 | `generateMockEconomy()` | Hardcoded economic data | Import from `lib/mock/generators.ts` then replace with BLS/FRED | P1 |
| 644 | `generateMockInfrastructure()` | Hardcoded infrastructure data | Import from `lib/mock/generators.ts` then replace with FRED/Socrata | P1 |
| 671 | `generateMockQualityOfLife()` | Hardcoded QoL data | Import from `lib/mock/generators.ts` then replace with GreatSchools/WalkScore | P1 |
| 701 | `generateMockSupplyDemand()` | Hardcoded supply/demand data | Import from `lib/mock/generators.ts` then replace with FRED/Redfin | P1 |
| 727 | `generateMockMacroRisk(rate, loan)` | Hardcoded macro risk data | Import from `lib/mock/generators.ts` then replace with FRED | P1 |

**Immediate fix available**: Lines 145–300 of this route already call `fetchAllMarketData()` from data-bridge.ts and fall back to mock only when the real result is null. The inline mock functions at lines 564–745 are the fallback targets — they should be replaced by imports from `lib/mock/generators.ts` in the short term, then replaced with real connectors.

---

### `property-analyzer/app/api/rental-analysis/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 127 | `generateMockComps(scope)` | 8 fake rental comps with seeded PRNG | RentCast comparables endpoint | P0 |
| 159 | `generateMockMarketData(scope)` | Rental market metrics (vacancy, median rent, DOM) | RentCast market stats | P0 |
| 187 | `generateMockBreakdown(metrics)` | Rental distribution + amenity/location premiums | AirDNA + RentCast | P2 |
| 218 | `generateMockTenantDemographics()` | Hardcoded tenant demographics | Census B25003 | P2 |
| 227 | `generateMockRegulations(scope)` | Hardcoded regulatory environment | Local regulation database | P2 |
| 237 | `generateMockHistoricalRents()` | 75 months of historical rent data | Zillow ZORI | P0 |

**Note**: These are duplicated from `lib/mock/generators.ts`. Should be consolidated.

---

### `property-analyzer/app/api/city-development/[zip]/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 75 | `generateMockCityProjects(zip)` | Active/planned/completed city development projects (transit, commercial, medical, schools) | City open-data portals (Socrata API) + HUD LIHTC database | P2 |
| 185 | `generateMockZoningActions(zip)` | Zoning change records | County GIS/planning department APIs | P2 |
| 229 | `generateMockOpportunityZones(zip)` | Opportunity zone designations | HUD OZ API (static dataset available) | P2 |
| 240 | `generateMockTIFDistricts(zip)` | Tax Increment Financing district data | City finance APIs | P2 |
| 254 | `generateMockUtilityExpansions(zip)` | Utility expansion projects | City utility APIs | P2 |

---

### `property-analyzer/app/api/microeconomics/[zip]/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 44 | `generateMockMicroProfile(zip)` | Full microeconomic profile: income, employment, COL, retail density, healthcare access, migration, institutional activity | Census ACS + BLS + FRED + ATTOM | P1 |

---

### `property-analyzer/app/api/community-signals/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 59 | `generateMockSignal(market)` | Community signal: watcher count, search volume, comparison count, hotness score | Platform-side event aggregation (already partially wired via `event-store.ts`); the `generateLiveSignal()` function at line 108 is the real replacement — it already reads from `getAggregatedSignals()`. Mock is correct fallback when no live events exist. | P2 |

**Status**: This mock is the correct fallback pattern. The route already uses live data when available (`resolveSignal()` at line 135 tries live first). This file does NOT need a real API replacement — the live signal pipeline IS the replacement.

---

### `property-analyzer/app/api/appreciation/predict/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 59 | `generateMockFeatures(zipCode)` | AppreciationFeatures struct with 16 real-estate signal inputs (all derived from hash) | All source engines feeding appreciation-engine.ts | P1 |

---

### `property-analyzer/app/api/time-series/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 166 | `generateMockFREDSeries(seriesId)` | 60 months of synthetic FRED-series data for any arbitrary series ID | FRED API (already implemented in `data-sources.ts` → `fetchFREDData()`) | P0 |

**Note**: Lines 84–126 of this route already call `fetchFREDData()` from data-sources and only fall back to mock when the FRED key is missing or the call fails. The mock is a correct fallback here.

---

### `property-analyzer/app/api/deals/scan/route.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 103 | `generateMockListings(criteria)` | 20 fake property listings matching deal scan criteria (address hash seeded) | ATTOM property search API filtered by criteria | P0 |

**Note**: Lines 60–85 also contain inline deterministic mock evaluation logic (lines 64–84) that computes comps value, cash flow, appreciation, hyperScore, and inventory from a hash seed. These are placeholders for real engine calls.

---

### `property-analyzer/app/(dashboard)/trends/page.tsx`

| Line | Usage | Issue | Replace With | Priority |
|------|-------|-------|--------------|----------|
| 154 | `generateTimeSeries(m.zip, { startValue: 300000 + Math.random() * 200000 })` | Uses unseeded `Math.random()` as the `startValue` — **non-deterministic, changes on every render** | Use market's real median price from market data store, or seed with zip hash | P1 |
| 159 | `generateTimeSeries(m.zip + "r", { startValue: 1500 + Math.random() * 500 })` | Same issue — unseeded `Math.random()` for rent series startValue | Use RentCast market median rent | P1 |

---

### `lootvue/src/app/dashboard/analyze/InvestmentMemo.tsx`

| Line | Usage | Issue | Replace With | Priority |
|------|-------|-------|--------------|----------|
| 27 | `score: rule.passes ? Math.round(70 + Math.random() * 25) : Math.round(20 + Math.random() * 30)` | Unseeded `Math.random()` for engine vote scores in investment memo — **non-deterministic, scores change on re-render** | Use deterministic engine scores from the actual analysis result (hyper-score-engine dimension scores) | P1 |

---

### `lootvue/src/app/dashboard/analyze/_components.tsx`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 1053 | `generateMockComps(r: AnalysisResult)` | 5–6 fake comparable sales seeded from subject property price | Real comps from ATTOM or RentCast, passed through from the `/api/analyze` response | P0 |

**Currently called at**: line 1149 within the `CompsPanel` component during property analysis display.

---

### `lootvue/src/app/dashboard/portfolio/page.tsx`

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 42–50 | `PROPERTIES` (hardcoded array, 4 entries) | Hardcoded portfolio properties with fake addresses, values, cash flow, cap rate, breakdown | User's actual portfolio from `deal-pipeline-store` + `analysis-store` | P0 |
| 52–56 | `KPI` (hardcoded) | Portfolio KPIs computed from hardcoded data | Computed from real portfolio store | P0 |
| 59 | `WEALTH` (hardcoded) | Hardcoded wealth build breakdown | Computed from real portfolio store | P0 |
| 77–79 | `_valueTS`, `_equityTS`, `_dscrTS` | Time series from `ChartTheme.generateTimeSeries()` with hardcoded seeds | Real historical data from deal-pipeline-store + ATTOM | P0 |

---

### `lootvue/src/app/dashboard/page.tsx` (main dashboard)

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 51–56 | `STATS` (hardcoded) | Portfolio stats ("$1.06M", "+$1,140", "6.5%", "3") hardcoded | Computed from deal-pipeline-store + analysis-store | P0 |
| 58–65 | `MARKETS` (hardcoded array, 6 entries) | Market scores, cap rates, signals, trend labels — all hardcoded | Real market rankings from `/api/market/rankings` route | P1 |
| 67–71 | `PIPELINE` (hardcoded array, 3 entries) | Active deal pipeline items | Real data from deal-pipeline-store | P0 |

---

### `lootvue/src/app/dashboard/pipeline/page.tsx`

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 23–32 | `MOCK_DEALS` (array, 4 entries) | Hardcoded deal pipeline entries used when store is empty | `useDemoData` hook already seeds real demo data into the store — `MOCK_DEALS` is a redundant second seeding mechanism that differs from `useDemoData` | P2 |

**Note**: The page correctly falls back to an empty state (`showMock` toggle) when `store.deals.length > 0`. This is acceptable scaffolding UX but should be removed once `useDemoData` is confirmed sufficient.

---

### `lootvue/src/app/dashboard/discover/page.tsx`

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 18–50+ | Inline `seededRand()` + `MockProperty` generator | Generates 50 fake property candidates from buy-box criteria using an inline PRNG | ATTOM radius search + hyper-score-engine scoring of real properties | P1 |

---

### `lootvue/src/app/dashboard/markets/page.tsx`

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 82–93 | `TIMING_DATA` (hardcoded, 10 markets) | Hardcoded timing signals (Buy Now/Wait/Sell) with confidence percentages | timing-engine.ts real output per market | P1 |
| 122–128 | `BUBBLE_MARKET_SPECS` (hardcoded, 5 markets) | Back-derived bubble detection inputs from target z-scores | bubble-detection-engine.ts real output from FRED price/income data | P1 |

---

### `lootvue/src/app/dashboard/markets/[slug]/page.tsx`

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 293–430 | `MARKET_FEATURES` (per-market AppreciationFeatures) | Hardcoded appreciation engine inputs for 10 markets | Appreciation features derived from real Census/BLS/FRED data per market | P1 |
| 503–654 | `MICRO_DB` (per-market microeconomic data) | Hardcoded microeconomic profiles with AI insight text for each market | `/api/microeconomics/[zip]` real output + ai-context-engine for insight text | P1 |
| 680–691 | `BUBBLE_INPUTS` (per-market) | Hardcoded bubble detection z-scores | bubble-detection-engine.ts with real FRED/Census data | P1 |

---

### `lootvue/src/app/dashboard/rates/page.tsx`

| Line | Data | Issue | Replace With | Priority |
|------|------|-------|--------------|----------|
| 264 | `COMPOSITE_HISTORY_RAW = generateTimeSeries(18, 58, 6, -0.3, 501)` | Composite rate index history from ChartTheme generator with hardcoded seed | Real composite rate index computed from FRED series (MORTGAGE30US, FEDFUNDS, T10YFF, DGS10) | P1 |

---

### `lootvue/src/lib/engines/derived-metrics-engine.ts`

| Line | Function | Generates | Replace With | Priority |
|------|----------|-----------|--------------|----------|
| 61 | `computeDerivedMetrics(market, months)` | 36 months of derived ratio series (PTI, PTR, rent yield, cap rate trend, affordability index) using seeded PRNG noise | When real data is available: pass actual monthly price/rent/income history from FRED/RentCast — the PRNG noise is only needed for gap-filling, acceptable to keep for that purpose | P1 |

**Note**: The function itself is fine architecture — it just needs real `market` input parameters instead of the hardcoded values callers currently pass.

---

### `lootvue/src/lib/hooks/useDemoData.ts`

| Lines | Data | Issue | Replace With | Priority |
|-------|------|-------|--------------|----------|
| 27–101 | Hardcoded deal pipeline demo data (6 deals with fake addresses, scores, outcomes) | Seeds Zustand store with demo data on first load | Replace fake addresses with user's real deal data from API. Keep as dev-only mode toggle. | P2 |
| 105–129 | Hardcoded watchlist markets + alerts | Seeds watchlist with demo markets | Replace with user's real saved markets from DB | P2 |

**Note**: `useDemoData` is called from `dashboard/layout.tsx` on every dashboard mount. It is guarded by `seeded.current` (runs once per session) and `pipelineDeals.length === 0` (skips if user already has data). This is **acceptable scaffolding** for dev/demo mode — should be gated behind `process.env.NEXT_PUBLIC_DEMO_MODE === "true"` before production.

---

### `property-analyzer/lib/engines/stacked-signal-engine.ts`

| Line | Note | Issue | Replace With | Priority |
|------|------|-------|--------------|----------|
| 357 | Comment: "Market-specific signal generation (from mock/real data)" | The engine itself may have hardcoded fallback signal values | Review engine output — if signals are computed from engine inputs (not hardcoded), this is fine | P1 |

---

## Mock Files: Delete vs Keep Assessment

| File | Delete After Wiring? | Notes |
|------|---------------------|-------|
| `lootvue/src/lib/mock/generators.ts` | Yes — delete when all 16 functions replaced | Keep as dev-mode fallback if DEMO_MODE env var set |
| `lootvue/src/lib/mock/time-series-generator.ts` | Yes — delete when chart pages use real data | `generateTimeSeries` in ChartTheme.tsx is a separate helper (not the same file) and must remain |
| `lootvue/src/lib/mock/lender-data.ts` | Yes — delete when lender marketplace is wired to real lender database | 8 hardcoded lenders are P2 |
| `lootvue/src/lib/mock/exchange-data.ts` | No — keep as seeded sample data until user-generated listings exist | Page already correctly marks mock vs real entries |
| `lootvue/src/lib/mock/capital-data.ts` | No — keep as seeded sample data | Same pattern as exchange-data.ts |
| `lootvue/src/lib/mock/workflow-data.ts` | Yes — delete when pathway page wires to real engines | P1 replacement |
| `lootvue/src/lib/mock/nearby-properties.ts` | Yes — dead code in lootvue, only used by property-analyzer legacy pages | Safe to delete from lootvue now |
| `property-analyzer/lib/mock/generators.ts` | Yes — same as lootvue copy | Backend generators replaced by real data connectors |
| `property-analyzer/lib/mock/time-series-generator.ts` | Yes — same as lootvue copy | |
| `property-analyzer/lib/mock/nearby-properties.ts` | Yes — when discover/compare pages wired | |
| `property-analyzer/lib/mock/workflow-data.ts` | Yes — when workflow page wired | |

---

## Replacement Priority Queue

### P0 — Blocks Real Deal Analysis (replace first)

1. **`generateMockPropertyData`** → ATTOM property detail (already in data-bridge.ts, just wire the fallback)
2. **`generateMockComps`** (both centralized and inline in market-intelligence route) → ATTOM comps
3. **`generateMockRentalMarketData`** + **`generateMockRentalComps`** → RentCast
4. **`generateMockHistoricalRents`** → Zillow ZORI CSV or RentCast historical
5. **`generateMockFREDMacro`** → Already replaced by `fetchRealFREDData()`, just remove the fallback
6. **`generateMockListings`** in deals/scan/route.ts → ATTOM search API
7. **Hardcoded `PROPERTIES` / `STATS` / `PIPELINE`** in portfolio and main dashboard pages → deal-pipeline-store
8. **Inline `generateMockComps`** in `_components.tsx` → comps-engine real output

### P1 — Blocks Market Intelligence (replace second)

1. **`generateMockDemographics`** → Census ACS (already implemented in data-bridge.ts as `fetchRealDemographics`)
2. **`generateMockEconomy`** → BLS QCEW + FRED
3. **`generateMockSupplyDemand`** → FRED ACTLISCOUUS + Census B25002
4. **`generateMockMacroRisk`** → FRED (already implemented in data-bridge.ts as `fetchRealMacroRisk`)
5. **`generateMockFREDSeries`** in time-series route → FRED (already implemented)
6. **Hardcoded market data** in pages (MARKETS, TIMING_DATA, BUBBLE_MARKET_SPECS, MARKET_FEATURES, MICRO_DB) → real API calls
7. **Non-deterministic `Math.random()`** in trends/page.tsx lines 154, 159 → zip-hash seeded values (immediate safe fix)
8. **Non-deterministic `Math.random()`** in InvestmentMemo.tsx line 27 → deterministic engine scores

### P2 — UI Scaffolding (replace last or gate behind DEMO_MODE)

1. **`MOCK_LENDERS`** → Real lender database
2. **`MOCK_EXCHANGE_LISTINGS`** / **`MOCK_CAPITAL_POSTS`** → User-generated content pipeline
3. **`generateMockRentalBreakdown`** / **`generateMockTenantDemographics`** / **`generateMockRentalRegulations`** → Specialist APIs
4. **`generateMockCityProjects`** / zoning / OZ / TIF → City open-data Socrata
5. **`generateCapitalFlowTimeline`** / **`generateSankeyData`** → capital-flow-composite-engine real output
6. **`useDemoData`** → Gate behind DEMO_MODE env var before production launch
7. **`MOCK_DEALS`** in pipeline/page.tsx → Remove once useDemoData is confirmed sufficient
8. **`PORTFOLIO_PROPERTIES`** in pathway/page.tsx → Wire to real portfolio store
