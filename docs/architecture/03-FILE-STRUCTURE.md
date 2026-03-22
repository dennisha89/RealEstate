# File Structure — Current vs Target

## Current Structure (What Exists)

```
property-analyzer/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts                    # POST — property analysis
│   │   ├── appreciation/predict/route.ts       # POST — appreciation prediction
│   │   ├── capital-migration/[zip]/route.ts    # GET — capital flows
│   │   ├── city-development/[zip]/route.ts     # GET — development projects
│   │   ├── deals/scan/route.ts                 # POST — deal scanner
│   │   ├── follow-the-money/[zip]/route.ts     # GET — money flow
│   │   ├── institutional-capital/[zip]/route.ts # GET — institutional investors
│   │   ├── kpi-drivers/[zip]/route.ts          # GET — appreciation drivers
│   │   ├── market-intelligence/route.ts        # POST — 8-dimension analysis
│   │   ├── microeconomics/[zip]/route.ts       # GET — micro indicators
│   │   ├── rental-analysis/route.ts            # POST — rental analysis
│   │   └── transaction-pipeline/[zip]/route.ts # GET — transaction pipeline
│   ├── globals.css
│   ├── layout.tsx                              # Root layout (minimal)
│   └── page.tsx                                # Landing page (only page)
├── components/
│   ├── PropertyForm.tsx                        # Property input form
│   └── ResultsDisplay.tsx                      # Analysis results display
├── lib/
│   ├── calculator.ts                           # 4 financial calculation functions
│   ├── engines/                                # 22 analysis engines
│   │   ├── ai-analysis-engine.ts
│   │   ├── alternative-signals-engine.ts
│   │   ├── appreciation-engine.ts
│   │   ├── capital-migration-engine.ts
│   │   ├── city-development-engine.ts
│   │   ├── comps-engine.ts
│   │   ├── cost-insurance-engine.ts
│   │   ├── data-sources.ts                     # 11 API connectors (all mock)
│   │   ├── deal-finder-engine.ts
│   │   ├── demographic-engine.ts
│   │   ├── economic-engine.ts
│   │   ├── financial-engine.ts
│   │   ├── follow-the-money-engine.ts
│   │   ├── hyper-score-engine.ts
│   │   ├── infrastructure-engine.ts
│   │   ├── institutional-capital-engine.ts
│   │   ├── kpi-drivers-engine.ts
│   │   ├── macro-risk-engine.ts
│   │   ├── microeconomics-engine.ts
│   │   ├── quality-of-life-engine.ts
│   │   ├── rental-analysis-engine.ts
│   │   ├── supply-demand-engine.ts
│   │   └── transaction-pipeline-engine.ts
│   └── types/
│       └── market-intelligence.ts              # All type definitions (325 lines)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── package.json

database/
├── 01_schema.sql
├── 02_indexes_optimization.sql
├── 05_market_intelligence_schema.sql
├── 06_microeconomics_rental_schema.sql
└── 07_money_flow_schema.sql
```

## Target Structure (What to Build)

```
property-analyzer/
├── app/
│   ├── (auth)/                                 # NEW — Auth pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/                            # NEW — Protected dashboard
│   │   ├── layout.tsx                          # DashboardLayout wrapper
│   │   ├── page.tsx                            # Dashboard home
│   │   ├── analyze/page.tsx                    # Refactored from current page.tsx
│   │   ├── property/[id]/page.tsx              # Property deep-dive
│   │   ├── deals/page.tsx                      # Deal scanner
│   │   ├── markets/page.tsx                    # Market overview
│   │   ├── markets/[zip]/page.tsx              # Market deep-dive
│   │   └── settings/page.tsx                   # User settings
│   ├── api/                                    # EXISTING — 12 routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                                # Landing page (keep as-is)
├── components/
│   ├── ui/                                     # NEW — Design system
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── MetricCard.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Tabs.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── charts/                                 # NEW — Recharts wrappers
│   │   ├── PriceHistoryChart.tsx
│   │   ├── CashFlowChart.tsx
│   │   ├── RiskRadarChart.tsx
│   │   ├── MarketComparisonChart.tsx
│   │   └── SparklineChart.tsx
│   ├── maps/                                   # NEW — Mapbox wrappers
│   │   ├── PropertyMap.tsx
│   │   ├── DealHeatmap.tsx
│   │   └── CompsRadiusMap.tsx
│   ├── dashboard/                              # NEW — Dashboard layout
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── HeaderBar.tsx
│   │   └── PortfolioSummary.tsx
│   ├── analysis/                               # NEW — Analysis views
│   │   ├── AnalysisTabs.tsx
│   │   ├── FinancialBreakdown.tsx
│   │   ├── CompsTable.tsx
│   │   ├── RiskAssessmentPanel.tsx
│   │   ├── AIAnalysisStream.tsx
│   │   └── DealGradeBadge.tsx
│   ├── PropertyForm.tsx                        # EXISTING — add Zod
│   └── ResultsDisplay.tsx                      # EXISTING — refactor
├── lib/
│   ├── calculator.ts                           # EXISTING
│   ├── engines/                                # EXISTING — 22 engines
│   ├── types/                                  # EXISTING — expand
│   ├── hooks/                                  # NEW
│   │   ├── usePropertyAnalysis.ts
│   │   ├── useMarketIntelligence.ts
│   │   └── useDealScan.ts
│   ├── stores/                                 # NEW — Zustand stores
│   │   ├── auth-store.ts
│   │   ├── analysis-store.ts
│   │   └── ui-store.ts
│   ├── cache/                                  # NEW — Redis integration
│   │   └── redis.ts
│   └── utils/                                  # NEW
│       ├── format.ts                           # Currency, percentage formatting
│       └── validation.ts                       # Shared Zod schemas
├── middleware.ts                               # NEW — Auth middleware
├── __tests__/                                  # NEW — Test infrastructure
│   ├── unit/
│   ├── integration/
│   ├── components/
│   └── e2e/
└── package.json

database/
├── 01_schema.sql                               # EXISTING
├── 02_indexes_optimization.sql                 # EXISTING
├── 05_market_intelligence_schema.sql           # EXISTING
├── 06_microeconomics_rental_schema.sql         # EXISTING
├── 07_money_flow_schema.sql                    # EXISTING
└── migrations/                                 # NEW
    ├── 001_enable_timescaledb.sql
    ├── 002_create_hypertables.sql
    └── 003_rls_policies.sql
```
