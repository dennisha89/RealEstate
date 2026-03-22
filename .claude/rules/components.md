---
globs: "**/{components,app}/**/*.{tsx,ts}"
---

# UI Component Rules

- Components under 200 lines. Extract sub-components when exceeding.
- `"use client"` only on interactive components (hooks, event handlers).
- **DARK THEME** — LootVue uses true black (#000000) surfaces. NEVER use white backgrounds, `bg-white`, `bg-gray-*`, or light-mode patterns.
- Use existing CSS classes from `globals.css`: `.card`, `.card-glass`, `.card-gold`, `.btn-primary`, `.badge-emerald`, `.skeleton`, `.metric-value`, `.metric-label`.
- Skeleton screens for loading (`.skeleton` class — `animate-pulse bg-surface-elevated rounded-lg`), never bare spinners.
- Lazy-load maps and charts with `next/dynamic({ ssr: false })`.
- Format money with `Intl.NumberFormat` — no manual string concatenation. Use `formatCurrency()` if available.
- Color system: gold=primary `#C9A227`, emerald=buy/positive, amber=hold/caution, rose=avoid/negative.
- Color-blind safe: always pair color with icon or text indicator.
- Numbers: `font-mono tabular-nums` for all financial figures. Use `.metric-value` class.
- Icons: `lucide-react`, `w-3.5 h-3.5` (small) or `w-4 h-4` (default).
- Mobile-first. All layouts work at 375px+.
- Primary frontend is `lootvue/`. `property-analyzer/` has minimal UI (PropertyForm, ResultsDisplay).
- LootVue has 19 dashboard pages — see `ui-architect` agent for the full page-to-agent map.
- Zustand stores in `lootvue/src/lib/stores/` — 13 stores for state management.
