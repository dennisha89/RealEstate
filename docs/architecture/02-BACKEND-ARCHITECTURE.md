# Backend Architecture — RealEstate Intelligence Platform

## Current State

| Area | Status |
|------|--------|
| API Routes | 12 endpoints — all return mock data via `generateMock*()` |
| Engines | 22 analysis engines — fully implemented logic, mock inputs |
| Data Sources | 11 connector functions in data-sources.ts — all return fake data |
| Calculator | 4 functions: calculateMortgagePayment, calculateMonthlyExpenses, calculateMetrics, calculateAIScore |
| Database | 5 schema files — NOT deployed, TimescaleDB disabled |
| Auth | Supabase SDK installed, not wired |
| Cache | ioredis installed, not used |
| Validation | Zod installed, used in 0 API routes |
| Tests | 0 test files |

## API Route Inventory

### POST Routes (accept request body)

| Route | Input | Engines Used | Output |
|-------|-------|-------------|--------|
| `/api/analyze` | PropertyData (address, value, rent) | calculator.ts | MortgageResult + InvestmentMetrics + AIAnalysis |
| `/api/market-intelligence` | zip, address, coordinates, options | financial, comps, demographic, economic, supply-demand, macro-risk, infrastructure, quality-of-life, hyper-score | Full 8-dimension MarketIntelligenceResult |
| `/api/appreciation/predict` | AppreciationFeatures | appreciation-engine | 1/3/5-year predictions + KPI drivers |
| `/api/deals/scan` | DealCriteria (location, price range, type) | deal-finder-engine | Array of scored deals |
| `/api/rental-analysis` | address, scope (zip/city/state) | rental-analysis-engine | Rental estimate + comps + vacancy |

### GET Routes (zip parameter in URL)

| Route | Param | Engines Used | Output |
|-------|-------|-------------|--------|
| `/api/capital-migration/[zip]` | zip | capital-migration-engine | 1031 exchanges, HMDA, foreign capital |
| `/api/city-development/[zip]` | zip | city-development-engine | Permits, zoning, infrastructure projects |
| `/api/follow-the-money/[zip]` | zip | follow-the-money-engine | Composite money flow intelligence |
| `/api/institutional-capital/[zip]` | zip | institutional-capital-engine | LLC purchases, REITs, PE funds |
| `/api/kpi-drivers/[zip]` | zip | appreciation-engine | Key drivers of property appreciation |
| `/api/microeconomics/[zip]` | zip | microeconomics-engine | Granular capital flows, business activity |
| `/api/transaction-pipeline/[zip]` | zip | transaction-pipeline-engine | Foreclosures, probate, auctions |

## Data Flow Architecture

### Current Flow (All Mock)

```
Client Request
    │
    ▼
API Route (app/api/*/route.ts)
    │
    ├── Calls engine function (lib/engines/*.ts)
    │       │
    │       └── Engine calls generateMock*() internally
    │              │
    │              └── Returns hardcoded fake data
    │
    └── Returns JSON response to client
```

### Target Flow (Real Data)

```
Client Request
    │
    ▼
API Route (app/api/*/route.ts)
    │
    ├── 1. Validate input with Zod schema
    │
    ├── 2. Check Redis cache (lib/cache.ts)
    │       │
    │       ├── Cache HIT → Return cached DataSourceResult
    │       │
    │       └── Cache MISS ↓
    │
    ├── 3. Fetch from real APIs (lib/engines/data-sources.ts)
    │       │
    │       ├── fetchPropertyDetails(apiKey, address)  → ATTOM API
    │       ├── fetchRentalEstimate(apiKey, address)    → RentCast API
    │       ├── fetchCensusACS(apiKey, zip, year)       → Census API
    │       ├── fetchBLSData(apiKey, series)            → BLS API
    │       ├── fetchFREDData(apiKey, series)           → FRED API
    │       ├── fetchWalkScore(apiKey, address, lat, lng) → Walk Score API
    │       └── fetchSchoolRatings(apiKey, lat, lng)    → GreatSchools API
    │
    ├── 4. Validate API responses with Zod
    │
    ├── 5. Run analysis engine(s) with real data
    │       │
    │       └── Engine returns typed analysis result
    │
    ├── 6. Store in Redis cache with TTL
    │
    ├── 7. Store raw responses in PostgreSQL (audit trail)
    │
    └── 8. Return typed JSON response
```

### Multi-Source Parallel Fetching

For `/api/market-intelligence` which needs 8+ data sources:

```
Request arrives
    │
    ├── Promise.allSettled([          ← Parallel fetch
    │     fetchCensusACS(),           ← 30d cache
    │     fetchBLSData(),             ← 7d cache
    │     fetchFREDData(),            ← 1d cache
    │     fetchWalkScore(),           ← 90d cache
    │     fetchSchoolRatings(),       ← 90d cache
    │     fetchPropertyDetails(),     ← 1d cache
    │   ])
    │
    ├── Handle partial failures:
    │     ├── Source succeeded → use fresh data
    │     ├── Source failed, cache exists → use stale cache
    │     └── Source failed, no cache → mark dimension as "unavailable"
    │
    ├── Run all 8 dimension engines with available data
    │
    ├── Compute HyperScore from dimension scores
    │
    └── Return MarketIntelligenceResult
```

## Database Architecture

### Schema Layers

```
database/
├── 01_schema.sql                    # Core: market_areas, properties, property_analyses,
│                                    #        comparable_sales, demographic_data, economic_data,
│                                    #        supply_demand_data, users, user_saved_analyses
│
├── 02_indexes_optimization.sql      # Indexes, materialized views, query functions
│
├── 05_market_intelligence_schema.sql # institutional_activity, capital_flows,
│                                     # construction_activity, alternative_signals,
│                                     # hyper_scores, kpi_drivers, infrastructure_data
│
├── 06_microeconomics_rental_schema.sql # neighborhood_businesses, amenity_scores,
│                                        # rental_market_data, rental_comps,
│                                        # housing_micro_metrics, city_development
│
└── 07_money_flow_schema.sql         # money_flow_institutional, money_flow_ibuyers,
                                     # money_flow_foreign, money_flow_1031_exchanges,
                                     # money_flow_smart_money, building_permits,
                                     # crime_data, macro_risk_data
```

### TimescaleDB Hypertable Plan

| Table | Time Column | Chunk Interval | Why |
|-------|------------|----------------|-----|
| economic_data | data_month | 1 month | Employment/wage trends |
| supply_demand_data | data_month | 1 month | Inventory/DOM trends |
| rental_market_data | data_month | 1 month | Rent trends |
| construction_activity | data_month | 1 month | Building permits |
| capital_flows | data_month | 1 month | Investment flows |
| housing_micro_metrics | data_month | 1 month | Micro indicators |
| macro_risk_data | data_date | 1 week | Daily risk metrics |
| demographic_data | data_year | 1 year | Annual demographics |
| crime_data | data_year | 1 year | Annual crime stats |

### Caching Architecture

```
Layer 1: Redis (hot cache)
├── Property lookups: TTL 1 day
├── Rental estimates: TTL 7 days
├── Market metrics: TTL 1 day
├── Walk scores: TTL 90 days
└── Analysis results: TTL 1 hour

Layer 2: PostgreSQL (warm cache + audit)
├── All API responses stored as JSONB
├── Queryable for historical trend analysis
├── Retention: raw 2yr, aggregated 10yr

Layer 3: TimescaleDB Continuous Aggregates (cold rollups)
├── Monthly → quarterly rollups
├── Quarterly → annual rollups
└── Retained indefinitely
```

## Authentication Architecture

```
Supabase Auth Flow:
1. User signs up/logs in via Supabase Auth UI
2. Supabase returns JWT in cookie
3. Next.js middleware checks JWT on (dashboard) routes
4. API routes verify JWT via Supabase server client
5. Row Level Security (RLS) on PostgreSQL restricts data by user_id

Middleware (middleware.ts):
├── /analyze, /deals, /markets, /property/* → Require auth
├── / (landing page) → Public
├── /login, /signup → Redirect if already authed
```

## Error Handling Strategy

```typescript
// Standard API response envelope
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;        // Machine-readable: "VALIDATION_ERROR", "DATA_FETCH_FAILED"
    message: string;     // Human-readable
    details?: unknown;   // Field-level errors, partial results
  };
  metadata?: {
    sources: string[];   // Which data sources were used
    stale: string[];     // Which sources returned stale cache
    unavailable: string[]; // Which sources failed entirely
    latencyMs: number;
  };
}
```

## Implementation Priority

| Priority | What | Why |
|----------|------|-----|
| P0 | Zod validation on all 12 API routes | Security + data integrity |
| P0 | Wire real ATTOM + RentCast connectors | Core property data |
| P0 | Wire real Census ACS connector | Core demographic data |
| P0 | Redis caching layer | Rate limit protection + performance |
| P1 | Supabase auth middleware | Required before multi-user |
| P1 | Wire FRED + BLS connectors | Economic indicators |
| P1 | PostgreSQL deployment + migration runner | Persistent storage |
| P2 | TimescaleDB hypertable setup | Time-series performance |
| P2 | Walk Score + GreatSchools connectors | Quality-of-life data |
| P2 | Background processing for heavy analyses | UX improvement |
| P3 | Monitoring + alerting | Production readiness |
| P3 | Rate limiting on API routes | Abuse prevention |
