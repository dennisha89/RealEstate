# Component Hierarchy — Page Wireframes

## Dashboard Home (`(dashboard)/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│ HeaderBar                                                     │
│ [Logo] [Search: Enter address or zip...]  [Notifications] [👤]│
├────────┬─────────────────────────────────────────────────────┤
│Sidebar │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│        │  │Portfolio │ │Monthly  │ │Avg Cap  │ │Active   │  │
│ 📊 Dash│  │Value    │ │Cash Flow│ │Rate     │ │Deals    │  │
│ 🔍 Ana │  │$1.2M ↑5%│ │$3,400 ↑ │ │7.2% →  │ │4       │  │
│ 🏠 Prop│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│ 💰 Deal│                                                     │
│ 📈 Mkts│  ┌──────────────────────────────────────────────┐  │
│ ⚙️ Set │  │                                              │  │
│        │  │        Interactive Map (Mapbox)               │  │
│        │  │     Property pins colored by deal grade       │  │
│        │  │      + Market heatmap overlay                 │  │
│        │  │                                              │  │
│        │  └──────────────────────────────────────────────┘  │
│        │                                                     │
│        │  ┌──────────────────┐  ┌────────────────────────┐  │
│        │  │ Recent Analyses  │  │ Market Alerts           │  │
│        │  │ ─────────────── │  │ ──────────────────────  │  │
│        │  │ 123 Main  A+ ↑  │  │ Austin: inventory ↓15% │  │
│        │  │ 456 Oak   B  →  │  │ Denver: rates ↑ 25bps  │  │
│        │  │ 789 Elm   C  ↓  │  │ Phoenix: cap rates ↑   │  │
│        │  └──────────────────┘  └────────────────────────┘  │
└────────┴─────────────────────────────────────────────────────┘
```

**Components used:**
- `DashboardLayout` → `Sidebar` + `HeaderBar` + content area
- `MetricCard` × 4 (portfolio value, cash flow, cap rate, active deals)
- `PropertyMap` (Mapbox with deal-grade colored pins)
- `Card` for recent analyses (table of saved analyses)
- `MarketAlertsFeed` (scrollable feed of market signals)

## Property Analysis (`(dashboard)/analyze/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│ HeaderBar                                                     │
├────────┬─────────────────────────────────────────────────────┤
│Sidebar │                                                     │
│        │  ┌──────────────────────────────────────────────┐  │
│        │  │ PropertyForm (EXISTING — enhanced)            │  │
│        │  │ [Address autocomplete          ] [Analyze →]  │  │
│        │  │ Price: [$___] Down: [___%] Rate: [___%]      │  │
│        │  └──────────────────────────────────────────────┘  │
│        │                                                     │
│        │  ┌──────────────────────────────────────────────┐  │
│        │  │ ResultsDisplay (refactored)                   │  │
│        │  │                                              │  │
│        │  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │  │
│        │  │ │Grade │ │Cap   │ │CoC   │ │DSCR  │         │  │
│        │  │ │ A+   │ │7.2%  │ │12.1% │ │1.45  │         │  │
│        │  │ └──────┘ └──────┘ └──────┘ └──────┘         │  │
│        │  │                                              │  │
│        │  │ [Financials] [Comps] [Market] [Risk] [AI]    │  │
│        │  │ ┌────────────────────────────────────────┐   │  │
│        │  │ │ Active Tab Content                     │   │  │
│        │  │ │ (CashFlowChart / CompsTable /          │   │  │
│        │  │ │  MarketMetrics / RiskRadar /           │   │  │
│        │  │ │  AIAnalysisStream)                     │   │  │
│        │  │ └────────────────────────────────────────┘   │  │
│        │  └──────────────────────────────────────────────┘  │
└────────┴─────────────────────────────────────────────────────┘
```

**Components used:**
- `PropertyForm` (existing — add Zod, address autocomplete)
- `MetricCard` × 4+ (deal grade, cap rate, CoC, DSCR)
- `Tabs` → `AnalysisTabs`
  - Financials: `FinancialBreakdown` + `CashFlowChart` + `StressTestPanel`
  - Comps: `CompsTable` + `CompsRadiusMap`
  - Market: `MarketComparisonChart` + demographic/economic metrics
  - Risk: `RiskRadarChart` + `RiskAssessmentPanel`
  - AI: `AIAnalysisStream` (streaming markdown)

## Deal Scanner (`(dashboard)/deals/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│ HeaderBar                                                     │
├────────┬─────────────────────────────────────────────────────┤
│Sidebar │                                                     │
│        │  ┌──────────────────────────────────────────────┐  │
│        │  │ Filters: [Location ▾] [Price ▾] [Type ▾]     │  │
│        │  │          [Min Cap Rate ▾] [Min CoC ▾] [Search]│  │
│        │  └──────────────────────────────────────────────┘  │
│        │                                                     │
│        │  ┌────────────────────┬─────────────────────────┐  │
│        │  │                    │  Deal List               │  │
│        │  │   DealHeatmap      │  ┌─────┬─────┬───┬────┐ │  │
│        │  │   (Mapbox)         │  │Addr │Price│Grd│CoC │ │  │
│        │  │                    │  ├─────┼─────┼───┼────┤ │  │
│        │  │   Pins colored:    │  │123..|$250k│A+ │12% │ │  │
│        │  │   🟢 A+/A (buy)   │  │456..|$180k│A  │ 9% │ │  │
│        │  │   🟡 B (hold)     │  │789..|$320k│B  │ 6% │ │  │
│        │  │   🔴 C/D (avoid)  │  │012..|$150k│C  │ 3% │ │  │
│        │  │                    │  └─────┴─────┴───┴────┘ │  │
│        │  │   Click pin →      │  ← Click row =          │  │
│        │  │   highlight row    │    highlight pin         │  │
│        │  └────────────────────┴─────────────────────────┘  │
└────────┴─────────────────────────────────────────────────────┘
```

**Components used:**
- Filter bar with `Select` + `Input` components
- `DealHeatmap` (Mapbox with deal-grade pins)
- `Card` table with TanStack Table (sortable, filterable)
- `DealGradeBadge` for grade display
- Map ↔ Table interaction (click sync)

## Market Research (`(dashboard)/markets/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│ HeaderBar                                                     │
├────────┬─────────────────────────────────────────────────────┤
│Sidebar │                                                     │
│        │  ┌──────────────────────────────────────────────┐  │
│        │  │ Search: [Enter city, zip, or metro area...]   │  │
│        │  └──────────────────────────────────────────────┘  │
│        │                                                     │
│        │  ┌────────────────────┬─────────────────────────┐  │
│        │  │                    │ Market Metrics           │  │
│        │  │  MarketOverlayMap  │ ┌─────────┐ ┌─────────┐ │  │
│        │  │  (demographic or   │ │Pop Growth│ │Med Income│ │  │
│        │  │   economic heatmap)│ │ +2.3% ↑  │ │$78k ↑   │ │  │
│        │  │                    │ ├─────────┤ ├─────────┤ │  │
│        │  │  Toggle overlays:  │ │Job Growth│ │Inventory │ │  │
│        │  │  □ Population      │ │ +4.1% ↑  │ │2.1mo ↓  │ │  │
│        │  │  □ Income          │ └─────────┘ └─────────┘ │  │
│        │  │  □ Price/sqft      │                          │  │
│        │  │  □ Cap rates       │ PriceHistoryChart        │  │
│        │  │                    │ [2yr price trend line]   │  │
│        │  └────────────────────┴─────────────────────────┘  │
└────────┴─────────────────────────────────────────────────────┘
```
