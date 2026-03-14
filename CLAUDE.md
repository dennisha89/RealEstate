# RealEstate Intelligence Platform

Multi-agent real estate investment analysis. Next.js 14 (App Router) + PostgreSQL/TimescaleDB.

## MANDATORY: Research Before Every Decision

**ALWAYS use WebSearch/WebFetch before any architectural, library, API, or implementation decision.** Verify current docs, latest versions, known issues, and competitor approaches. No exceptions. Document what you researched.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript 5.4 (strict), Tailwind CSS 3.4, Zustand, Recharts, Lucide React
- **Backend**: Next.js API routes, PostgreSQL 15 + TimescaleDB, Redis 7, Supabase Auth
- **Validation**: Zod 3.23 at all API boundaries
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

9 agents in `.claude/agents/`. See each file for domain-specific instructions.

| Task | Agent |
|------|-------|
| Market trends, demographics, economics | `market-researcher` |
| Property valuation, comps, AVM | `property-valuator` |
| Financial modeling, deal grading | `deal-analyzer` |
| Risk scoring (7 dimensions) | `risk-assessor` |
| API integrations, ETL, data wiring | `data-pipeline` |
| UI components, charts, maps, pages | `ui-architect` |
| Database schema, queries, migrations | `database-engineer` |
| Unit, integration, E2E tests | `test-engineer` |
| Code quality, security, PR reviews | `code-reviewer` |

### Workflows

1. **Full Analysis**: `data-pipeline` → `property-valuator` + `market-researcher` (parallel) → `deal-analyzer` → `risk-assessor`
2. **New Feature**: `ui-architect` + `database-engineer` (parallel) → `data-pipeline` → `test-engineer`
3. **Quality Pass**: `code-reviewer` → `test-engineer`

## Data Source Priority

- **P0**: ATTOM, RentCast, Census ACS
- **P1**: FRED, BLS, Walk Score, GreatSchools
- **P2**: Bright Data MCP, ClimateCheck, AirDNA

## Commands

```bash
cd property-analyzer && npm run dev      # Dev server
cd property-analyzer && npm run build    # Production build
cd property-analyzer && npm test         # Run tests
```
