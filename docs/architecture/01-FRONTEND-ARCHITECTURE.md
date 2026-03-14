# Frontend Architecture — RealEstate Intelligence Platform

## Product: Real Estate Investment Analysis (NOT Property Management)

This platform analyzes properties for investors — valuations, deal scoring, market intelligence, risk assessment. It is NOT a property management SaaS (no landlords/tenants/contractors/maintenance).

## Current State

| Area | Status |
|------|--------|
| Pages | 1 landing page (`app/page.tsx`) — form + results |
| Components | 2: PropertyForm.tsx (197 lines), ResultsDisplay.tsx (197 lines) |
| Charts | None — all data shown as text/numbers |
| Maps | None — no geographic visualization |
| Tables | None — no sortable/filterable data tables |
| Auth | Supabase installed, not wired |
| State | Zustand installed, not used — everything is local useState |
| Navigation | None — no sidebar, no header, no routing |
| Streaming | None — AI analysis is static text |
| Tests | None |

## Target Architecture

### Page Structure

```
app/
├── (auth)/
│   ├── login/page.tsx                    # Supabase auth
│   └── signup/page.tsx
├── (dashboard)/                          # Protected layout with sidebar
│   ├── layout.tsx                        # DashboardLayout (sidebar + header)
│   ├── page.tsx                          # Dashboard home (portfolio overview)
│   ├── analyze/page.tsx                  # Property analysis form + results
│   ├── property/[id]/page.tsx            # Single property deep-dive
│   ├── deals/page.tsx                    # Deal scanner (map + list)
│   ├── markets/page.tsx                  # Market research (map + metrics)
│   ├── markets/[zip]/page.tsx            # Single market deep-dive
│   └── settings/page.tsx                 # User preferences, API keys
└── page.tsx                              # Public landing/marketing page
```

### Route Groups Explained

- `(auth)` — Public auth pages, no sidebar
- `(dashboard)` — Protected by Supabase session, shared sidebar layout
- Root `page.tsx` — Public marketing/landing page (current page.tsx)

### Server vs Client Component Split

```
Server Components (default):
├── (dashboard)/layout.tsx       → Fetch user session, render sidebar
├── (dashboard)/page.tsx         → Fetch portfolio data, render metrics
├── property/[id]/page.tsx       → Fetch property data, pass to client
├── markets/page.tsx             → Fetch market overview data
└── deals/page.tsx               → Fetch initial deal list

Client Components ("use client"):
├── components/PropertyForm.tsx  → Form state, validation, submission
├── components/charts/*.tsx      → Interactive Recharts wrappers
├── components/maps/*.tsx        → Mapbox GL interactive maps
├── components/dashboard/*.tsx   → Interactive widgets (filters, tabs)
├── components/analysis/*.tsx    → Streaming AI output, tabbed views
└── components/ui/*.tsx          → Buttons, inputs, modals (interactive)
```

### Component Architecture

```
components/
├── ui/                          # Design system primitives
│   ├── Button.tsx               # Variants: primary, secondary, ghost, danger
│   ├── Card.tsx                 # Content container with optional header
│   ├── MetricCard.tsx           # Value + label + trend (↑↓→) + color
│   ├── Badge.tsx                # Status badges (A+, B, C, D deal grades)
│   ├── Input.tsx                # Form input with label + error
│   ├── Select.tsx               # Dropdown select
│   ├── Tabs.tsx                 # Tab navigation
│   ├── Skeleton.tsx             # Loading placeholder
│   ├── Toast.tsx                # Notification system
│   └── Modal.tsx                # Dialog/modal
│
├── charts/                      # Recharts wrappers (all "use client")
│   ├── PriceHistoryChart.tsx    # AreaChart — price trends with confidence band
│   ├── CashFlowChart.tsx        # BarChart — monthly income vs expenses
│   ├── RiskRadarChart.tsx       # RadarChart — 7-dimension risk profile
│   ├── MarketComparisonChart.tsx # GroupedBarChart — compare markets
│   ├── PortfolioDonutChart.tsx  # PieChart — allocation breakdown
│   └── SparklineChart.tsx       # Mini LineChart — inline trend indicator
│
├── maps/                        # Mapbox GL wrappers (all "use client", lazy-loaded)
│   ├── PropertyMap.tsx          # Single property with nearby comps
│   ├── DealHeatmap.tsx          # Deal scanner heatmap by zip/market
│   ├── MarketOverlayMap.tsx     # Demographic/economic overlays
│   └── CompsRadiusMap.tsx       # Comp radius visualization (0.5mi/1mi circles)
│
├── dashboard/                   # Dashboard layout + widgets
│   ├── DashboardLayout.tsx      # Sidebar + header + main content area
│   ├── Sidebar.tsx              # Navigation sidebar
│   ├── HeaderBar.tsx            # Top bar (search, user menu, notifications)
│   ├── PortfolioSummary.tsx     # Portfolio value, cash flow, returns
│   └── MarketAlertsFeed.tsx     # Recent market signals feed
│
├── analysis/                    # Property analysis components
│   ├── AnalysisTabs.tsx         # Tabbed view: Financials | Comps | Market | Risk | AI
│   ├── FinancialBreakdown.tsx   # Cash flow table + charts
│   ├── CompsTable.tsx           # Sortable comps table with adjustments
│   ├── RiskAssessmentPanel.tsx  # Risk radar + dimension breakdown
│   ├── AIAnalysisStream.tsx     # Streaming AI output with markdown
│   ├── StressTestPanel.tsx      # 3-scenario stress test results
│   └── DealGradeBadge.tsx       # A+ to D grade with color
│
├── PropertyForm.tsx             # EXISTING — needs Zod validation
└── ResultsDisplay.tsx           # EXISTING — refactor into analysis/
```

### State Management Strategy

```
Zustand Stores (client state):
├── useAuthStore          # User session, preferences
├── useAnalysisStore      # Current analysis state, form data
└── useUIStore            # Sidebar open/closed, active tab, theme

TanStack Query (server state):
├── usePropertyAnalysis   # POST /api/analyze — with cache
├── useMarketIntelligence # POST /api/market-intelligence — with cache
├── useDealScan           # POST /api/deals/scan
├── useComps              # Uses analyze response data
└── usePortfolio          # User's saved analyses
```

### Data Fetching Pattern

```tsx
// Server Component — fetch at page level
export default async function PropertyPage({ params }: { params: { id: string } }) {
  const property = await getPropertyAnalysis(params.id);
  return <PropertyDetail data={property} />;
}

// Client Component — interactive with streaming
"use client";
export function AIAnalysisStream({ propertyId }: { propertyId: string }) {
  const [text, setText] = useState("");
  // ReadableStream for token-by-token AI output
  const response = await fetch(`/api/ai-analysis/${propertyId}`, { method: "POST" });
  const reader = response.body?.getReader();
  // ... stream tokens into setText
}
```

### Responsive Breakpoints

| Breakpoint | Target | Layout |
|-----------|--------|--------|
| `<640px` (sm) | Mobile | Single column, bottom nav, stacked cards |
| `640-1024px` (md) | Tablet | Sidebar collapsed, 2-column grid |
| `1024-1280px` (lg) | Laptop | Sidebar expanded, 2-3 column grid |
| `>1280px` (xl) | Desktop | Full dashboard with map + sidebar + content |

### Library Installation Plan

```bash
# Charts + icons (install first — needed for all dashboard pages)
npm install recharts lucide-react

# Maps (install when building map components)
npm install mapbox-gl react-map-gl @types/mapbox-gl

# Tables (install when building comps/deals tables)
npm install @tanstack/react-table

# Server state (install when adding data fetching hooks)
npm install @tanstack/react-query

# Animations (install last — nice-to-have)
npm install framer-motion
```

### Implementation Priority

| Priority | What | Why |
|----------|------|-----|
| P0 | DashboardLayout + Sidebar + HeaderBar | Everything else lives inside this |
| P0 | MetricCard + Card + Badge + Skeleton | Used by every page |
| P0 | Recharts installation + chart wrappers | Data without charts is useless |
| P1 | Analyze page (refactored from current page.tsx) | Core user flow |
| P1 | Property detail page with tabs | Deep-dive on a single property |
| P1 | Auth (Supabase login/signup) | Required for saved analyses |
| P2 | Deal scanner page (map + list) | Core feature but depends on maps |
| P2 | Mapbox installation + map components | Visual differentiation |
| P2 | Markets page | Market-level analysis |
| P3 | Portfolio page | Requires saved analyses |
| P3 | Streaming AI output | Enhancement |
| P3 | Settings page | Low priority |
