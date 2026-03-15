---
globs: "**/{components,app}/**/*.{tsx,ts}"
---

# Data Visualization Rules (Recharts + Financial Data)

## Chart Type Selection
| Data Type | Chart | Library Component |
|-----------|-------|-------------------|
| Price/value over time | Area chart with gradient fill | `<AreaChart>` |
| Cash flow breakdown | Stacked bar chart | `<BarChart>` |
| Risk dimensions | Radar/spider chart | `<RadarChart>` |
| Portfolio allocation | Donut chart (not pie) | `<PieChart>` with `innerRadius` |
| Metric sparklines | Mini line chart (no axis) | `<LineChart>` compact |
| Comparison | Grouped bar chart | `<BarChart>` |
| Distribution (Monte Carlo) | Histogram | Custom `<BarChart>` |
| Sensitivity table | Heatmap grid | Custom component |
| Geographic data | Mapbox GL map | `react-map-gl` |

## Financial Number Formatting
- **Currency**: `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. Compact for >$1M (`notation: 'compact'`).
- **Percentages**: 1-2 decimal places. Cap rate "6.5%", not "6.50000%". Use `minimumFractionDigits: 1, maximumFractionDigits: 2`.
- **Large numbers**: Use compact notation — "$1.2M" not "$1,200,000" in charts. Full number in tooltips.
- **Tabular numbers**: Always use `font-variant-numeric: tabular-nums` for columns of numbers so digits align.
- **Negative values**: Rose text with parentheses for accounting format: `($2,500)` not `-$2,500`. Use `text-rose`.
- **Trend indicators**: `.metric-trend-up` (emerald + ↑), `.metric-trend-down` (rose + ↓), content-secondary + →. Always pair with percentage change.

## Chart Standards
- **Every chart must handle 3 states**: loading (skeleton), empty (helpful message), populated (data).
- **Tooltips**: Show exact values on hover. Include date, value, and context (e.g., "Cap Rate: 6.5% — Market avg: 5.8%").
- **Responsive**: Charts must resize with container. Use `<ResponsiveContainer width="100%" height={300}>`.
- **Axes**: Y-axis for values (formatted), X-axis for time/categories. Label both axes.
- **Grid lines**: Subtle `stroke="#1F1F1F"` (surface-border). DARK THEME — never use light grays like `#f0f0f0`.
- **Axis text**: `fill="#666666"` (content-tertiary). Axis lines: `stroke="#1F1F1F"`.
- **Tooltip background**: `bg-surface-elevated` (#1A1A1A) with `border-surface-border`. NOT white.
- **Colors**: Use the LootVue brand palette. Never use default Recharts colors.
  - Primary data: gold `#C9A227`
  - Secondary data: gold-light `#E8C547`
  - Positive: emerald `#10B981`
  - Negative: rose `#EF4444`
  - Warning: amber `#F59E0B`
  - Neutral: content-tertiary `#666666`
  - Area fill: Use gradients with low opacity (e.g., gold with `fillOpacity={0.1}`)
- **Legends**: Position outside the chart area. Keep concise.

## Lazy Loading
- ALL chart components must be lazy-loaded: `const Chart = dynamic(() => import('./Chart'), { ssr: false })`.
- Show chart-shaped skeleton placeholder while loading.
- Maps (`react-map-gl`) are especially heavy — always lazy-load with `ssr: false`.

## Monte Carlo / Distribution Charts
- Histogram bars colored by percentile zone: P0-P25 rose, P25-P75 amber, P75-P100 emerald.
- Vertical lines for P10, P50, P90 with labels.
- Show probability annotations (e.g., "78% chance of positive returns").

## Interactive Features
- Zoom/pan for time-series charts (price history, trends).
- Click-to-drill on donut/pie segments.
- Toggle data series visibility via legend clicks.
- Crosshair cursor for multi-series time charts.
