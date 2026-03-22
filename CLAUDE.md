# LootVue — Real Estate Intelligence Platform

Multi-agent real estate investment analysis. Next.js 14 (App Router) + PostgreSQL/TimescaleDB.

## Project Structure

- **`lootvue/`** — Primary frontend application (dashboard, components, stores, frontend engines)
- **`property-analyzer/`** — Backend API + analysis engines (API routes, calculator, backend engines)
- **`database/`** — PostgreSQL/TimescaleDB schema and migrations
- **`xuan/`** — Legacy/inactive frontend (do NOT use)

## MANDATORY: Research Before Every Decision

**ALWAYS use WebSearch/WebFetch before any architectural, library, API, or implementation decision.** Verify current docs, latest versions, known issues, and competitor approaches. No exceptions. Document what you researched.

## MANDATORY: Challenge & Validate Ideas

- **Challenge ideas that don't make sense.** Don't blindly build. If a feature is redundant, over-engineered, or contradicts existing architecture — push back with evidence.
- **Validate every idea online before building.** Search for: competitor implementations, known failures, market data that confirms/contradicts the assumption, and proven patterns in fintech/proptech.
- **Show proof of validation.** State what was searched, what was found, and whether it supports the idea.
- **Suggest better alternatives** when they exist. Present 2-3 options with tradeoffs.

## Quant Model Status (Updated 2026-03-16)

### Validated Signals (USE THESE — ordered by strength)
- **Months of supply (inverted)**: rho=0.33, perfect quintile monotonicity, 9.22pp spread — weight 0.30 — STRONGEST
- **Building permits z-score**: rho=0.35, 8-16pp quintile spread — weight 0.25
- **HPI momentum**: rho=0.33, strong but partially momentum-chasing — weight 0.20
- **Employment growth**: rho=0.11, walk-forward 79%, INDEPENDENT of all others — weight 0.15
- **Mortgage rate environment**: rho=0.13, national-level only — weight 0.10
- **Pairwise confluence (L1)**: rho=0.56 — BEST confluence depth, agree=1.15x, disagree=0.85x
- Confluence count: 0 bullish = -2.1%, 4+ bullish = +13.1%

### DEAD Signals (DO NOT USE IN SCORING)
- IRS migration AGI: rho=0.01 — ZERO predictive power, removed from engines
- M2 velocity: rho=-0.008 — ZERO predictive power, removed from engines

### Untested Signals (BACKTEST BEFORE USING)
- HMDA investor loan share — needs CFPB API backtest
- Google Trends HSI — >40% explanatory power in published research
- Saiz supply elasticity — static modifier, R²=0.91 in literature, data unavailable (Wharton 404)

### Nested Confluence Rules
- 1 level of nesting is OPTIMAL (L1 rho=0.56)
- L2 meta-confluence DEGRADES signal (rho=0.26) — DO NOT BUILD
- L3 momentum is NOISE (rho=0.11) — DO NOT BUILD
- Maximum 3 independent signal layers with current data volume
- Minimum 100 observations per confluence bucket or label as 'low confidence'

### Architecture: 3-Layer Decision Tree
- Layer 1: Market Structure (months-of-supply + permits + employment) = 'Is this a growth market?'
- Layer 2: Macro Timing (rates + HPI momentum) = 'Is now a good time to buy?'
- Layer 3: Deal Quality (cap rate + DSCR + cash flow) = 'Is this deal good?'
- Convergence check: all 3 agree = HIGH CONFIDENCE, diverge = flag + explain
- Layer 4 (guardrail): GSADF bubble test + price-to-rent + price-to-income

### Plain English Requirement
- Every metric MUST have a tooltip explanation at 8th grade reading level
- Example: 'Building permits are up 34% — builders bet their money on growth'
- Never show raw z-scores to users. Always translate to plain English.
- Use MetricDisplay interface: value, label, plainEnglish, confidenceLevel, asOfDate, source

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
- **Dark theme** — true black `#000000` surfaces, NOT white/light
- **Color system**: gold=primary accent `#C9A227`, emerald=buy/positive `#10B981`, amber=hold/caution `#F59E0B`, rose=avoid/negative `#EF4444`
- **Cards**: `.card` = `bg-surface-card border border-surface-border rounded-xl p-5` — see `globals.css` for full component classes
- **Typography**: Inter (body), Plus Jakarta Sans (display), JetBrains Mono (numbers). Use `.metric-value` for financial figures (tabular-nums)
- **CSS classes**: Use existing utility classes from `globals.css` — `.card`, `.card-glass`, `.card-gold`, `.badge-emerald`, `.badge-rose`, `.btn-primary`, `.btn-emerald`, `.skeleton`
- Skeleton screens for loading (`.skeleton` class), never spinners
- Lazy-load maps and charts with `next/dynamic`
- Mobile-first responsive design

## App Architecture: 7-Page Compacted Design

LootVue is compacted from 29 pages to 7 core pages. Each page is a dense workspace with tabs/panels — not a single view.

### Core Pages
| Page | Route | Purpose | Absorbs |
|------|-------|---------|---------|
| Dashboard | `/dashboard` | Home base: portfolio summary, rates card, recent analyses, market pulse, quick-analyze search bar | rates, pulse, portfolio overview |
| Analyze | `/dashboard/analyze` | THE BEAST: address → 10-sec verdict (BUY/PASS/DIG DEEPER) → tabs: Summary / Financials / Risk / Market Context / Financing | analyze + pathway + lending |
| Markets | `/dashboard/markets` | Choropleth heatmap → state → MSA → ZIP drill-down. Table toggle. Comparison mode (2-5 markets). Signal convergence. | markets + consensus + capital flow explorer |
| Discover | `/dashboard/discover` | Map + list split. Buy box filters. Instant screen (GRM, 1% rule). Bulk screen mode. | discover |
| Pipeline | `/dashboard/pipeline` | Kanban (Discovered → Analyzing → Offer → Contract → Closed/Passed). Side panel comparison. Deal journal. | pipeline + deal-room + compare + decision journal |
| Simulator | `/dashboard/simulator` | DCF + Monte Carlo playground. 20 sliders, sensitivity heatmap. Import from analysis. | simulator |
| Settings | `/dashboard/settings` | Profile, buy box, notifications, API keys, billing | settings |

### Killed Pages (permanently removed)
- Consensus, Leaderboard, Pulse → no user decision value
- Capital Marketplace, Exchange → need real users first (Phase 3 someday)
- Deal Room → absorbed into Pipeline
- Pathway → navigation IS the pathway
- Compare → absorbed into Pipeline side panel
- Rates → absorbed into Dashboard card
- Portfolio → absorbed into Dashboard section

### Journey Flow
```
Dashboard → Markets (where?) → Discover (what's available?) → Analyze (is it good?) → Pipeline (track it)
                                                                    ↓
                                                              Simulator (what-if?)
```

## Agent Architecture

18 agents in `.claude/agents/`. See each file for domain-specific instructions.

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
| Signal aggregation, timing, bubble detection, confluence | `signal-intelligence` | opus |
| AI advisory, thesis generation, NLP, anomaly detection | `ai-strategist` | opus |
| Research papers, data sources, methodology validation | `quant-researcher` | opus |
| Python backtests against forward HPI returns | `signal-backtester` | opus |
| TypeScript engine building, mock→real, scoring logic | `engine-builder` | opus |

### Workflow Agents
| Task | Agent | Model |
|------|-------|-------|
| Pipeline, discovery, comparison, memos | `deal-room` | sonnet |
| Financing tab, loan products, capital stack | `capital-markets` | sonnet |

### Infrastructure Agents
| Task | Agent | Model |
|------|-------|-------|
| API integrations, ETL, data wiring | `data-pipeline` | sonnet |
| UI components, charts, maps, pages | `ui-architect` | sonnet |
| Database schema, queries, migrations | `database-engineer` | sonnet |
| Unit, integration, E2E tests | `test-engineer` | sonnet |
| Code quality, security, PR reviews | `code-reviewer` | sonnet |
| Dead code, broken imports, endpoint wiring, engine sync | `code-integrity` | sonnet |

### Workflows

1. **Full Analysis**: `data-pipeline` → `property-valuator` + `market-researcher` (parallel) → `deal-analyzer` + `quant-modeler` (parallel) → `risk-assessor` → `signal-intelligence`
2. **AI Advisory**: `data-pipeline` → `deal-analyzer` + `market-researcher` (parallel) → `ai-strategist`
3. **Deal Pipeline**: `deal-room` → `deal-analyzer` + `quant-modeler` (parallel) → `risk-assessor` → `ai-strategist` (memo)
4. **Signal Validation**: `quant-researcher` → `signal-backtester` → `engine-builder` (if signal passes)
5. **Market Intelligence**: `market-researcher` + `risk-assessor` (parallel) → `signal-intelligence`
6. **New Feature**: `ui-architect` + `database-engineer` (parallel) → `data-pipeline` → `test-engineer`
7. **Quality Pass**: `code-reviewer` → `test-engineer`
8. **Data Wiring**: `data-pipeline` → `engine-builder` → `test-engineer`

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
| `**/engines/derived-metrics-engine*`, `**/engines/stacked-signal-engine*`, `**/engines/timing-engine*`, `**/engines/insight-engine*`, `**/engines/institutional-metrics*`, `**/engines/leading-indicator-engine*`, `**/engines/bubble-detection-engine*`, `**/engines/capital-flow-composite-engine*`, `**/engines/municipal-prediction-engine*`, `**/engines/confluence/**`, `**/engines/oracle/**` | `signal-intelligence` |
| `**/engines/ai-advisor-engine*`, `**/engines/ai-analysis-engine*`, `**/engines/memo-generator*` | `ai-strategist` |
| `**/engines/data-sources*`, `**/engines/data-bridge*`, `**/mock/*` | `data-pipeline` |
| `**/stores/deal-pipeline*`, `**/stores/buybox*`, `**/stores/decision-journal*`, `**/pipeline*`, `**/discover*` | `deal-room` |
| `**/stores/capital*`, `**/stores/lender*`, `**/stores/exchange*` | `capital-markets` |
| `backtest/**` | `signal-backtester` |
| `**/stores/analysis-store*`, `**/stores/watchlist-store*` | `deal-analyzer` |
| `**/stores/ui-store*`, `**/stores/user-profile-store*`, `**/app/login*`, `**/app/signup*`, `**/app/onboarding*`, `**/app/pricing*`, `**/app/about*`, `**/app/privacy*`, `**/app/terms*`, `**/app/disclaimer*` | `ui-architect` |
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
