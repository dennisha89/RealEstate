# RealEstate Intelligence Platform — Architecture Documentation

## Documentation Index

| Doc | Purpose |
|-----|---------|
| [01-FRONTEND-ARCHITECTURE.md](01-FRONTEND-ARCHITECTURE.md) | Page structure, component tree, state management, responsive design |
| [02-BACKEND-ARCHITECTURE.md](02-BACKEND-ARCHITECTURE.md) | API routes, data flow, database, caching, auth, error handling |
| [03-FILE-STRUCTURE.md](03-FILE-STRUCTURE.md) | Current vs target file structure |
| [04-COMPONENT-HIERARCHY.md](04-COMPONENT-HIERARCHY.md) | Component tree with page wireframes |
| [05-TECH-STACK-JUSTIFICATION.md](05-TECH-STACK-JUSTIFICATION.md) | Technology choices and rationale |
| [06-ARCHITECTURE-OVERVIEW.md](06-ARCHITECTURE-OVERVIEW.md) | System-level architecture diagram |
| [10-deployment.md](10-deployment.md) | Deployment strategy, CI/CD, environment setup |

## What This Platform Is

A **real estate investment analysis platform** that helps investors evaluate properties using:
- 22 specialized analysis engines (financial, market, risk, deal scoring)
- Multi-source data (ATTOM, RentCast, Census, BLS, FRED, Walk Score, GreatSchools)
- AI-powered analysis with streaming output
- Interactive dashboards with charts and maps

## What This Platform Is NOT

- NOT a property management SaaS (no landlords/tenants/contractors)
- NOT a CRM or lead management tool
- NOT a listing marketplace

## Current Development Stage

**Engine layer is built. UI and data integrations are not.**

| Layer | Status |
|-------|--------|
| Analysis engines (22) | Built — all logic implemented with mock data |
| API routes (12) | Built — all return mock data |
| Type definitions | Built — comprehensive MarketIntelligenceResult types |
| Database schemas (5) | Written — not deployed, TimescaleDB disabled |
| UI components (2) | PropertyForm + ResultsDisplay only |
| Pages (1) | Landing page only — no dashboard, property detail, deals |
| Auth | Supabase installed, not wired |
| Data integrations | 11 connector functions defined, all return mock data |
| Charts/Maps | Not installed, not built |
| Tests | None |

## Implementation Roadmap

### Phase 1: Foundation (Current → Dashboard Shell)
1. Install recharts + lucide-react
2. Build DashboardLayout + Sidebar + HeaderBar
3. Build UI primitives (Card, MetricCard, Badge, Skeleton, Tabs)
4. Move current form+results into `(dashboard)/analyze/page.tsx`
5. Add Zod validation to PropertyForm
6. Add Zod validation to all 12 API routes

### Phase 2: Core Features
1. Wire Supabase auth (login/signup + middleware)
2. Wire real ATTOM + RentCast + Census connectors
3. Set up Redis caching
4. Build property detail page with tabbed analysis view
5. Build chart components (CashFlowChart, RiskRadarChart, PriceHistoryChart)
6. Build comps table with TanStack Table

### Phase 3: Advanced Features
1. Install Mapbox + build map components
2. Build deal scanner page (map + list split view)
3. Build markets page with demographic overlays
4. Wire remaining data sources (FRED, BLS, Walk Score, GreatSchools)
5. Enable TimescaleDB + deploy schemas
6. Streaming AI analysis

### Phase 4: Production
1. Unit tests for calculator.ts (100% coverage)
2. Integration tests for API routes
3. Component tests
4. E2E tests with Playwright
5. Rate limiting + CORS
6. Monitoring + error tracking
