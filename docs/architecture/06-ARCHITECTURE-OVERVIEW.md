# Architecture Overview — System Diagram

## Five-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UI LAYER                                 │
│  Next.js 14 App Router + React 18 + Tailwind CSS            │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard │ │ Analyze  │ │  Deals   │ │ Markets  │        │
│  │ (home)  │ │ (form)   │ │ (scanner)│ │ (research)│        │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       │           │            │             │               │
│  Components: MetricCard, Charts (Recharts), Maps (Mapbox),  │
│              Tables (TanStack), Streaming AI output          │
│  State: Zustand (client) + TanStack Query (server)          │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                    │
│               API LAYER │ (Next.js API Routes)               │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  12 endpoints (POST + GET)                           │    │
│  │  Zod input validation → Engine orchestration →       │    │
│  │  Typed JSON response                                 │    │
│  │                                                      │    │
│  │  Auth: Supabase JWT verification                     │    │
│  │  Rate limiting: 100 req/min                          │    │
│  └──────────────────────┬──────────────────────────────┘    │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                    │
│            ENGINE LAYER │ (22 Analysis Engines)              │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  Financial  │ Comps    │ Demographic │ Economic      │    │
│  │  Deal Finder│ Rental   │ Risk       │ Infrastructure │    │
│  │  HyperScore │ Capital  │ Follow $   │ AI Analysis   │    │
│  │  Micro Econ │ Supply   │ Quality    │ Alternative   │    │
│  │  City Dev   │ Trans    │ Cost/Ins   │ Appreciation  │    │
│  │  KPI Drivers│ Instit.  │ Calculator │               │    │
│  └──────────────────────┬──────────────────────────────┘    │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                    │
│              DATA LAYER │ (External APIs + Database)         │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  data-sources.ts (11 connectors)                     │    │
│  │                                                      │    │
│  │  P0: ATTOM → property details, sales history         │    │
│  │      RentCast → rental estimates, rental comps       │    │
│  │      Census ACS → demographics, income, migration    │    │
│  │                                                      │    │
│  │  P1: FRED → mortgage rates, CPI, GDP, home prices   │    │
│  │      BLS → employment, wages                         │    │
│  │      Walk Score → walkability, transit, bike          │    │
│  │      GreatSchools → school ratings                   │    │
│  │                                                      │    │
│  │  P2: Bright Data MCP → Zillow/Redfin scraping        │    │
│  │      ClimateCheck → climate risk                     │    │
│  └──────────────────────┬──────────────────────────────┘    │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                    │
│           STORAGE LAYER │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  PostgreSQL 15 + TimescaleDB                         │    │
│  │  ├── Core tables (properties, users, analyses)       │    │
│  │  ├── Time-series hypertables (market data)           │    │
│  │  ├── Continuous aggregates (monthly → quarterly)     │    │
│  │  └── RLS policies (multi-tenant via Supabase)        │    │
│  │                                                      │    │
│  │  Redis 7 (cache layer)                               │    │
│  │  ├── API response cache (TTLs per source)            │    │
│  │  ├── Session cache                                   │    │
│  │  └── Rate limiting counters                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow: Full Property Analysis

```
User enters address + financial details in PropertyForm
    │
    ▼
POST /api/analyze
    │
    ├── Zod validates input (PropertyData schema)
    │
    ├── Check Redis cache for this address
    │     ├── HIT → return cached result
    │     └── MISS ↓
    │
    ├── Promise.allSettled([
    │     fetchPropertyDetails(address),    ← ATTOM
    │     fetchRentalEstimate(address),     ← RentCast
    │     fetchCensusACS(zip),              ← Census
    │   ])
    │
    ├── Run calculator:
    │     calculateMortgagePayment(price, rate, term)
    │     calculateMonthlyExpenses(price, rent, taxRate)
    │     calculateMetrics(propertyData, financialInputs)
    │     calculateAIScore(scoringFactors)
    │
    ├── Cache result in Redis (TTL: 1 hour)
    │
    └── Return FullAnalysisResult
           │
           ▼
    ResultsDisplay renders metrics + charts + AI analysis
```

## Request Flow: Market Intelligence (8-Dimension)

```
POST /api/market-intelligence
    │
    ├── Zod validates input (zip, coordinates, options)
    │
    ├── Parallel data fetch:
    │     fetchCensusACS()          → demographic-engine
    │     fetchBLSData()            → economic-engine
    │     fetchFREDData()           → macro-risk-engine
    │     fetchWalkScore()          → quality-of-life-engine
    │     fetchSchoolRatings()      → quality-of-life-engine
    │     fetchPropertyDetails()    → comps-engine + financial-engine
    │
    ├── Run 8 dimension engines (parallel where independent):
    │     ┌─ financial-engine        → FinancialAnalysis
    │     ├─ comps-engine            → CompsAnalysis
    │     ├─ demographic-engine      → DemographicAnalysis
    │     ├─ economic-engine         → EconomicAnalysis
    │     ├─ infrastructure-engine   → InfrastructureAnalysis
    │     ├─ quality-of-life-engine  → QualityOfLifeAnalysis
    │     ├─ supply-demand-engine    → SupplyDemandAnalysis
    │     └─ macro-risk-engine       → MacroRiskAnalysis
    │
    ├── Run hyper-score-engine (needs all 8 dimensions)
    │     → HyperScore (composite 0-100 with recommendation)
    │
    ├── Run appreciation-engine
    │     → 1/3/5-year forecasts + KPI drivers
    │
    └── Return MarketIntelligenceResult
```

## Agent ↔ Architecture Mapping

```
┌─────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                        │
│              (Main Claude Session)                   │
│                                                      │
│  Routes tasks to specialized agents:                 │
│                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │market-       │ │property-     │ │deal-        │ │
│  │researcher    │ │valuator      │ │analyzer     │ │
│  │              │ │              │ │             │ │
│  │ 8 engines    │ │ 2 engines    │ │ 7 engines   │ │
│  │ 5 API routes │ │ 2 API routes │ │ 4 API routes│ │
│  └──────────────┘ └──────────────┘ └─────────────┘ │
│                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │risk-         │ │data-         │ │ui-          │ │
│  │assessor      │ │pipeline      │ │architect    │ │
│  │              │ │              │ │             │ │
│  │ 6 engines    │ │ data-sources │ │ components/ │ │
│  │ 2 API routes │ │ (11 funcs)   │ │ app/pages   │ │
│  └──────────────┘ └──────────────┘ └─────────────┘ │
│                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │database-     │ │test-         │ │code-        │ │
│  │engineer      │ │engineer      │ │reviewer     │ │
│  │              │ │              │ │             │ │
│  │ 5 SQL files  │ │ __tests__/   │ │ Read-only   │ │
│  │ migrations/  │ │ calculator   │ │ review      │ │
│  └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────┘
```
