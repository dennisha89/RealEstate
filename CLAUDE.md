# LootVue — Real Estate Intelligence Platform

Multi-agent real estate investment analysis. Next.js 14 (App Router) + PostgreSQL/TimescaleDB.

## Project Structure

- **`lootvue/`** — Primary frontend application (dashboard, components, stores, frontend engines)
- **`property-analyzer/`** — Backend API + analysis engines (API routes, calculator, backend engines)
- **`database/`** — PostgreSQL/TimescaleDB schema and migrations
- **`xuan/`** — Legacy/inactive frontend (do NOT use)

## MANDATORY: Research Before Every Decision

**ALWAYS use WebSearch/WebFetch before any architectural, library, API, or implementation decision.** Verify current docs, latest versions, known issues, and competitor approaches. No exceptions. Document what you researched.

## Tech Stack

- **Frontend (lootvue)**: Next.js 14, React 18, TypeScript 5 (strict), Tailwind CSS 3.4, Zustand, Recharts, Lucide React, @anthropic-ai/sdk, @supabase/ssr
- **Backend (property-analyzer)**: Next.js API routes, PostgreSQL 15 + TimescaleDB, Redis 7, Supabase Auth
- **Validation**: Zod at all API boundaries
- **Testing**: Jest + React Testing Library + Playwright

## Code Rules

- TypeScript strict mode. No `any` — use `unknown` + type guards
- Zod validation on every API route input AND every inter-agent data handoff
- `async/await` only — no `.then()` chains
- Components under 200 lines. `"use client"` only when needed
- Every financial calculation needs a unit test
- All monetary values stored as integers (cents). Format only in UI

## Financial Accuracy Rules

- **Confidence intervals, not point estimates** — valuations, metrics, and scores must include ranges
- **Chain-of-calculation** — show intermediate values so errors are visible
- **Cross-source validation** — verify data against 2+ independent sources when available
- **Guardrails** — flag results outside typical ranges (cap rate 1-15%, DSCR 0.5-3.0, etc.)
- **Source attribution** — every data point cites its source (API, table, series ID)

## Data Rules

- **NEVER ship mock data to production.** `generateMock*()` is dev-only
- Real data flows through `lib/engines/data-sources.ts`
- Cache TTLs: Census 30d, BLS/RentCast 7d, FRED/ATTOM 1d, WalkScore/GreatSchools 90d
- Time-series data uses TimescaleDB hypertables with retention policies

## Security Rules

- Rate limiting on API routes (100 req/min)
- Auth on all non-public endpoints
- Parameterized queries only — never interpolate user input into SQL
- Environment variables for all API keys. Never hardcode
- Never log PII or financial details

## UI Rules

- Dashboard-first design, not chat-only
- Color system: green=buy, amber=hold, red=avoid
- Skeleton screens for loading, not spinners
- Lazy-load maps and charts with `next/dynamic`
- Mobile-first responsive design

## Agent Architecture

14 agents in `.claude/agents/`. See each file for domain-specific instructions.

### Analysis Agents
| Task | Agent | Model |
|------|-------|-------|
| Market trends, demographics, economics | `market-researcher` | sonnet |
| Property valuation, comps, AVM | `property-valuator` | sonnet |
| Financial modeling, deal grading | `deal-analyzer` | sonnet |
| Risk scoring (7 dimensions) | `risk-assessor` | sonnet |

### Quant & Signal Agents
| Task | Agent | Model |
|------|-------|-------|
| DCF, Monte Carlo, waterfall, stress testing, forecasting | `quant-modeler` | opus |
| Signal aggregation, consensus, timing, bubble detection | `signal-intelligence` | opus |
| AI advisory, thesis generation, NLP, anomaly detection | `ai-strategist` | opus |

### Workflow & Marketplace Agents
| Task | Agent | Model |
|------|-------|-------|
| Deal rooms, pipeline, discovery, comparison, memos | `deal-room` | sonnet |
| Lending, exchange, capital stack, debt/equity | `capital-markets` | sonnet |

### Infrastructure Agents
| Task | Agent | Model |
|------|-------|-------|
| API integrations, ETL, data wiring | `data-pipeline` | sonnet |
| UI components, charts, maps, pages | `ui-architect` | sonnet |
| Database schema, queries, migrations | `database-engineer` | sonnet |
| Unit, integration, E2E tests | `test-engineer` | sonnet |
| Code quality, security, PR reviews | `code-reviewer` | sonnet |

### Workflows

1. **Full Analysis**: `data-pipeline` → `property-valuator` + `market-researcher` (parallel) → `deal-analyzer` + `quant-modeler` (parallel) → `risk-assessor` → `signal-intelligence`
2. **AI Advisory**: `data-pipeline` → `deal-analyzer` + `market-researcher` (parallel) → `ai-strategist`
3. **Deal Pipeline**: `deal-room` → `deal-analyzer` + `quant-modeler` (parallel) → `risk-assessor` → `ai-strategist` (memo)
4. **Capital Markets**: `capital-markets` + `deal-analyzer` (parallel) → `quant-modeler` (waterfall)
5. **Signal Dashboard**: `market-researcher` + `risk-assessor` (parallel) → `signal-intelligence`
6. **New Feature**: `ui-architect` + `database-engineer` (parallel) → `data-pipeline` → `test-engineer`
7. **Quality Pass**: `code-reviewer` → `test-engineer`

## Data Source Priority

- **P0**: ATTOM, RentCast, Census ACS
- **P1**: FRED, BLS, Walk Score, GreatSchools
- **P2**: Bright Data MCP, ClimateCheck, AirDNA

## File-to-Agent Routing

When a file is modified, use the corresponding agent:

| File Path Pattern | Agent |
|-------------------|-------|
| `**/engines/demographic-engine*`, `**/engines/economic-engine*`, `**/engines/supply-demand-engine*`, `**/engines/capital-migration-engine*`, `**/engines/institutional-capital-engine*`, `**/engines/follow-the-money-engine*`, `**/engines/alternative-signals-engine*` | `market-researcher` |
| `**/engines/comps-engine*`, `**/engines/appreciation-engine*` | `property-valuator` |
| `**/calculator*`, `**/engines/financial-engine*`, `**/engines/deal-finder-engine*`, `**/engines/rental-analysis-engine*`, `**/engines/cost-insurance-engine*`, `**/engines/microeconomics-engine*`, `**/engines/transaction-pipeline-engine*` | `deal-analyzer` |
| `**/engines/macro-risk-engine*`, `**/engines/infrastructure-engine*`, `**/engines/quality-of-life-engine*`, `**/engines/city-development-engine*`, `**/engines/hyper-score-engine*`, `**/engines/kpi-drivers-engine*` | `risk-assessor` |
| `**/engines/dcf-engine*`, `**/engines/monte-carlo-engine*`, `**/engines/waterfall-engine*`, `**/engines/stress-test-engine*`, `**/engines/market-forecast-engine*` | `quant-modeler` |
| `**/engines/derived-metrics-engine*`, `**/engines/stacked-signal-engine*`, `**/engines/timing-engine*`, `**/engines/insight-engine*`, `**/engines/institutional-metrics*`, `**/engines/leading-indicator-engine*`, `**/engines/bubble-detection-engine*`, `**/engines/capital-flow-composite-engine*` | `signal-intelligence` |
| `**/engines/ai-advisor-engine*`, `**/engines/ai-analysis-engine*`, `**/engines/memo-generator*` | `ai-strategist` |
| `**/engines/data-sources*`, `**/engines/data-bridge*`, `**/mock/*` | `data-pipeline` |
| `**/stores/*`, `**/deal-room*`, `**/pipeline*`, `**/discover*`, `**/compare*`, `**/pathway*`, `**/stores/deal-pipeline*`, `**/stores/buybox*`, `**/stores/decision-journal*` | `deal-room` |
| `**/stores/capital*`, `**/stores/lender*`, `**/stores/exchange*`, `**/dashboard/capital*`, `**/dashboard/lending*`, `**/dashboard/exchange*`, `**/dashboard/rates*` | `capital-markets` |
| `**/components/*`, `**/app/layout*`, `**/app/page*`, `**/globals.css*`, `tailwind.config*` | `ui-architect` |
| `database/**`, `**/migrations/*` | `database-engineer` |
| `**/__tests__/**`, `**/*.test.*`, `**/*.spec.*` | `test-engineer` |
| `**/api/*/route.ts` | `code-reviewer` (review) + domain agent (logic) |

## Commands

```bash
# LootVue (primary frontend)
cd lootvue && npm run dev               # Dev server
cd lootvue && npm run build             # Production build
cd lootvue && npm run lint              # Lint

# Property Analyzer (backend/API)
cd property-analyzer && npm run dev      # Dev server
cd property-analyzer && npm run build    # Production build
cd property-analyzer && npm test         # Run tests
```
