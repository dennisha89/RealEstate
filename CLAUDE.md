# RealEstate Intelligence Platform

## Project Overview
Multi-agent real estate investment analysis platform. Next.js 14 (App Router) frontend with PostgreSQL + TimescaleDB backend. Designed for serious investors who need institutional-grade analytics on residential and commercial properties.

## Architecture

### Five-Layer Agent Architecture
1. **Data Layer** — Real API integrations (Census, BLS, FRED, ATTOM, RentCast, Walk Score, MLS via Bright Data MCP)
2. **Engine Layer** — 22 specialized analysis engines in `property-analyzer/lib/engines/`
3. **Agent Layer** — Domain-specific Claude subagents in `.claude/agents/`
4. **Orchestration Layer** — Event triggers, routing, confidence-based escalation
5. **UI Layer** — Next.js dashboard with maps, charts, and streaming AI output

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript 5.4 (strict), Tailwind CSS 3.4
- **State**: Zustand 4.5
- **Charts**: Recharts (add if missing)
- **Maps**: Mapbox GL JS or Leaflet (add if missing)
- **Backend**: Next.js API routes → future Express.js microservices
- **Database**: PostgreSQL 15 + TimescaleDB (hypertables for time-series market data)
- **Cache**: Redis 7 (session, API response caching)
- **Auth**: Supabase Auth (already dep installed)
- **Validation**: Zod 3.23
- **HTTP**: Axios 1.7
- **Testing**: Jest + React Testing Library + Playwright

## Directory Structure
```
/home/user/RealEstate/
├── CLAUDE.md                          # This file
├── .claude/agents/                    # Claude Code subagent definitions
│   ├── market-researcher.md           # Market trend analysis agent
│   ├── property-valuator.md           # Comps and AVM agent
│   ├── deal-analyzer.md               # Financial modeling agent
│   ├── risk-assessor.md               # Risk scoring agent
│   ├── data-pipeline.md               # Data fetching/ETL agent
│   ├── ui-architect.md                # Frontend component agent
│   ├── database-engineer.md           # Schema/query optimization agent
│   ├── test-engineer.md               # Testing agent
│   └── code-reviewer.md              # Code quality agent
├── property-analyzer/                 # Next.js application
│   ├── app/                           # App Router pages + API routes
│   │   ├── api/                       # 12 API endpoints
│   │   ├── dashboard/                 # Main dashboard page (TODO)
│   │   ├── property/[id]/             # Property detail page (TODO)
│   │   ├── deals/                     # Deal scanner page (TODO)
│   │   └── page.tsx                   # Landing/home page
│   ├── components/                    # React components
│   │   ├── ui/                        # Base UI primitives (TODO)
│   │   ├── charts/                    # Recharts wrappers (TODO)
│   │   ├── maps/                      # Map components (TODO)
│   │   ├── dashboard/                 # Dashboard widgets (TODO)
│   │   ├── PropertyForm.tsx
│   │   └── ResultsDisplay.tsx
│   ├── lib/
│   │   ├── engines/                   # 22 analysis engines
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── hooks/                     # Custom React hooks (TODO)
│   │   ├── utils/                     # Shared utilities (TODO)
│   │   ├── api/                       # API client functions (TODO)
│   │   └── calculator.ts             # Financial calculator
│   └── __tests__/                     # Test files (TODO)
├── database/                          # PostgreSQL schema + migrations
│   ├── 01_schema.sql
│   ├── 02_indexes_optimization.sql
│   ├── 05_market_intelligence_schema.sql
│   ├── 06_microeconomics_rental_schema.sql
│   └── 07_money_flow_schema.sql
└── docs/architecture/                 # Architecture documentation
```

## Critical Rules

### Code Standards
- TypeScript strict mode always. No `any` types — use `unknown` + type guards.
- All new files must have proper types. Use Zod schemas at API boundaries.
- Every API route must validate input with Zod before processing.
- Every financial calculation must have a unit test.
- Use `async/await` consistently. No raw `.then()` chains.
- Components use `"use client"` directive only when needed (interactivity, hooks).
- Keep components under 200 lines. Extract sub-components when exceeding.

### Data Rules
- **NEVER ship mock data to production.** All `generateMock*()` functions are dev-only.
- Real data must come through `lib/engines/data-sources.ts` connectors.
- Cache API responses: Census (30d), BLS (7d), FRED (1d), RentCast (7d), ATTOM (1d).
- All monetary values stored as integers (cents). Display formatting only in UI.
- Time-series data must use TimescaleDB hypertables with proper retention policies.

### Database Rules
- Enable TimescaleDB extension. Convert time-series tables to hypertables.
- All queries on time-series data must use time-bucket aggregations.
- Add continuous aggregates for common rollups (daily→weekly, weekly→monthly).
- Retention policy: raw data 2 years, aggregated data 10 years.
- Always use parameterized queries. Never interpolate user input into SQL.

### UI Rules
- Dashboard-first design. No chat-only interfaces.
- Every data point must be visualizable (chart, map, or metric card).
- Use streaming for AI-generated analysis (token-by-token rendering).
- Color system: green=positive/buy, amber=hold/caution, red=negative/avoid.
- All pages must be responsive. Mobile-first breakpoints.
- Loading states: skeleton screens, not spinners. Show progress on multi-step analysis.
- Maps are required for any location-based data (comps, demographics, deals).

### Security Rules
- API routes must have rate limiting (100 req/min default).
- Auth required on all non-public endpoints.
- Never log PII or financial details. Sanitize error messages.
- Environment variables for all API keys. Never hardcode.
- CORS configured for known origins only.

### Testing Rules
- Unit tests for all financial engines (calculator.ts, every engine in lib/engines/).
- Integration tests for all API routes.
- Component tests for all interactive components.
- E2E tests for critical user flows (property search → analysis → results).
- Minimum 80% coverage on financial calculation code.

## Agent Orchestration

### When to Use Which Agent
| Task | Agent | Trigger |
|------|-------|---------|
| Analyze market trends for a zip/city | `market-researcher` | User asks about market conditions, trends, demographics |
| Value a property, pull comps | `property-valuator` | User asks about property value, comparables, AVM |
| Run deal financials (cap rate, cash flow, ROI) | `deal-analyzer` | User asks about deal analysis, investment returns |
| Assess risk on a property/market | `risk-assessor` | User asks about risk, climate, regulatory, market risk |
| Wire up real data sources, fix ETL | `data-pipeline` | Work on data-sources.ts, API integrations, scraping |
| Build/modify UI components | `ui-architect` | Work on components/, pages, styling, charts, maps |
| Schema changes, query optimization | `database-engineer` | Work on database/, SQL, Supabase, TimescaleDB |
| Write/fix tests | `test-engineer` | Work on tests, coverage, test infrastructure |
| Review code quality | `code-reviewer` | PR reviews, refactoring, code quality checks |

### Multi-Agent Workflows
1. **Full Property Analysis**: `data-pipeline` → `property-valuator` + `market-researcher` (parallel) → `deal-analyzer` → `risk-assessor`
2. **New Feature Build**: `ui-architect` + `database-engineer` (parallel) → `data-pipeline` → `test-engineer`
3. **Code Quality Pass**: `code-reviewer` → `test-engineer`

## Data Source Integration Priority
1. **P0 (Must Have)**: ATTOM (property data), RentCast (rentals), Census ACS (demographics)
2. **P1 (High)**: FRED (economic indicators), BLS (employment), Walk Score, GreatSchools
3. **P2 (Medium)**: Bright Data MCP (Zillow/Redfin scraping), ClimateCheck (risk), AirDNA (STR)
4. **P3 (Nice to Have)**: CoreLogic, HouseCanary, Reonomy (commercial)

## Common Commands
```bash
cd property-analyzer && npm run dev     # Start dev server
cd property-analyzer && npm run build   # Production build
cd property-analyzer && npm test        # Run tests
cd property-analyzer && npx playwright test  # E2E tests
```
