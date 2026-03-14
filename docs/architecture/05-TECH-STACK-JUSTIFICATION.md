# Tech Stack Justification — RealEstate Intelligence Platform

## Product Context

This is a **real estate investment analysis platform** — NOT a property management SaaS. The tech stack is optimized for:
- Parallel multi-source data fetching (11 external APIs)
- Compute-heavy financial analysis (22 engines)
- Interactive data visualization (charts, maps, tables)
- Time-series market data storage and aggregation

---

## Core Framework: Next.js 14 (App Router)

**Why Next.js?**
- Server Components for data-heavy pages (fetch property/market data server-side)
- API Routes as BFF — orchestrate 22 engines without a separate backend
- Streaming for AI analysis output (token-by-token rendering)
- Route groups `(auth)` / `(dashboard)` for layout separation
- Built-in code splitting per route (heavy map/chart pages don't bloat others)

**Why App Router over Pages Router?**
- Server Components reduce client bundle for data-display pages
- Streaming with Suspense for progressive loading of multi-engine results
- Nested layouts for dashboard shell (sidebar persists across pages)

**Alternatives considered:**
- Remix: Great data loading, but smaller ecosystem for maps/charts
- Vite + React Router: No SSR, would need separate API server
- Express.js backend: Adds deployment complexity; Next.js API routes sufficient for current scale

---

## Language: TypeScript 5.4 (Strict)

**Why strict mode?**
- Financial calculations require type safety — a wrong type can mean wrong investment advice
- 22 engines share complex types (MarketIntelligenceResult: 325+ lines of types)
- Zod schemas at API boundaries ensure runtime + compile-time safety
- No `any` types — use `unknown` + type guards

---

## State Management: Zustand + TanStack Query

**Why this combination?**

| Concern | Tool | Reason |
|---------|------|--------|
| Client state (UI) | Zustand | Sidebar state, active tab, theme — no server involvement |
| Server state (data) | TanStack Query | API responses with caching, deduplication, background refetch |

**Why not Redux?**
- Zustand is 1KB vs Redux Toolkit's 11KB
- No providers needed — works in any component
- TanStack Query handles server state better than any Redux pattern

**Current status:** Both installed, neither used yet. Everything is `useState`.

---

## Charts: Recharts

**Why Recharts?**
- React-native components (not a wrapper around D3)
- Composable: AreaChart, BarChart, RadarChart, PieChart all needed
- Responsive containers built-in
- Good TypeScript support

**Specific chart needs:**
| Chart | Component | Use Case |
|-------|-----------|----------|
| PriceHistoryChart | AreaChart | Price trends with confidence bands |
| CashFlowChart | BarChart | Monthly income vs expenses breakdown |
| RiskRadarChart | RadarChart | 7-dimension risk profile |
| MarketComparisonChart | GroupedBarChart | Compare markets side-by-side |
| SparklineChart | LineChart | Inline trend indicators in metric cards |

**Current status:** Not installed.

---

## Maps: Mapbox GL JS

**Why Mapbox?**
- Custom styling for investment-focused overlays (deal grades, demographics)
- Heatmap layers for deal density visualization
- Marker clustering for large property datasets
- Better performance than Google Maps for data-heavy overlays

**Specific map needs:**
| Map | Use Case |
|-----|----------|
| PropertyMap | Single property with nearby comps (radius circles) |
| DealHeatmap | Deal scanner — pins colored by grade (green/amber/red) |
| MarketOverlayMap | Demographic/economic data overlays by zip |
| CompsRadiusMap | Comparable sales with 0.5mi/1mi radius visualization |

**Alternative:** Leaflet (free, lighter) — viable fallback if Mapbox costs are a concern.

**Current status:** Not installed.

---

## Tables: TanStack Table

**Why TanStack Table?**
- Headless — full control over styling (works with Tailwind)
- Built-in sorting, filtering, pagination
- Column resizing and reordering
- TypeScript-first with generic row types

**Use cases:** Comps table (sortable by price, distance, $/sqft), deal scanner list, portfolio overview.

**Current status:** Not installed.

---

## Validation: Zod 3.23

**Why Zod?**
- TypeScript-first: `z.infer<typeof schema>` generates types from schemas
- Runtime validation at API boundaries (all 12 routes need input validation)
- Composable schemas — reuse address, financial input schemas across routes
- Transform support — parse strings to numbers, format monetary values

**Current status:** Installed, not used in any API route.

---

## Database: PostgreSQL 15 + TimescaleDB

**Why PostgreSQL?**
- Supabase provides managed PostgreSQL with auth, RLS, and real-time
- Complex queries for financial analysis (aggregations, window functions)
- JSONB for flexible engine output storage

**Why TimescaleDB?**
- Time-series market data (prices, rates, inventory) needs time-bucket aggregations
- Continuous aggregates for common rollups (daily → weekly → monthly)
- Compression for historical data (10x storage savings)
- Retention policies: raw data 2 years, aggregated 10 years

**Current status:** 5 schema files written, TimescaleDB extension commented out.

---

## Cache: Redis 7

**Why Redis?**
- API response caching with source-specific TTLs:
  - Census ACS: 30 days (changes annually)
  - BLS employment: 7 days (monthly releases)
  - FRED rates: 1 day (daily updates)
  - ATTOM property: 1 day
  - RentCast: 7 days
- Rate limiting counters (100 req/min per user)
- Session caching for Supabase auth

**Current status:** ioredis installed, not connected.

---

## Auth: Supabase Auth

**Why Supabase over NextAuth?**
- Already provides the database (PostgreSQL)
- Row-Level Security for multi-tenant data isolation
- Built-in JWT verification for API routes
- Social auth (Google, GitHub) with minimal config
- Real-time subscriptions for live market alerts

**Current status:** @supabase/supabase-js installed, not wired.

---

## Styling: Tailwind CSS 3.4

**Why Tailwind?**
- Utility-first matches dashboard-heavy UI (lots of layout, spacing, responsive)
- PurgeCSS keeps bundle small despite large component library
- Design tokens via config (colors, spacing) ensure consistency
- Mobile-first responsive utilities for 4 breakpoints (sm/md/lg/xl)

**Component library approach:** Build custom primitives (Card, MetricCard, Badge, Skeleton) rather than using shadcn/ui — keeps dependencies minimal and styling consistent with investment platform branding.

---

## HTTP Client: Axios 1.7

**Why Axios over fetch?**
- Interceptors for auth token injection and error handling
- Request/response transformation (monetary values: cents ↔ dollars)
- Timeout configuration per data source
- Better error objects with status codes

**Current status:** Installed, not used (engines use raw fetch).

---

## Testing: Jest + React Testing Library + Playwright

**Why this stack?**

| Layer | Tool | Target |
|-------|------|--------|
| Unit | Jest | calculator.ts (100% coverage), all 22 engines |
| Integration | Jest + supertest | 12 API routes with mocked data sources |
| Component | React Testing Library | Interactive components (forms, tabs, filters) |
| E2E | Playwright | Critical flows: search → analyze → results |

**Current status:** Playwright installed, no tests written.

---

## AI: Claude API (Anthropic)

**Why Claude?**
- Streaming output for real-time AI analysis rendering
- Strong reasoning for financial analysis narratives
- Tool use for structured data extraction from analysis results
- Context window handles large multi-engine result sets

**Current status:** ai-analysis-engine.ts exists, returns mock data.

---

## Dependency Status Summary

| Package | Installed | Used |
|---------|-----------|------|
| next 14 | Yes | Yes |
| react 18 | Yes | Yes |
| typescript 5.4 | Yes | Yes |
| tailwindcss 3.4 | Yes | Yes |
| zustand 4.5 | Yes | No |
| zod 3.23 | Yes | No |
| axios 1.7 | Yes | No |
| @supabase/supabase-js | Yes | No |
| ioredis | Yes | No |
| playwright | Yes | No |
| recharts | No | — |
| mapbox-gl | No | — |
| @tanstack/react-table | No | — |
| @tanstack/react-query | No | — |
| lucide-react | No | — |
| framer-motion | No | — |
