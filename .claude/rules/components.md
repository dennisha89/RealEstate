---
globs: "**/{components,app}/**/*.{tsx,ts}"
---

# UI Component Rules

- Components under 200 lines. Extract sub-components when exceeding.
- `"use client"` only on interactive components (hooks, event handlers).
- Skeleton screens for loading (`animate-pulse bg-gray-200 rounded`), never bare spinners.
- Lazy-load maps and charts with `next/dynamic({ ssr: false })`.
- Format money with `Intl.NumberFormat` — no manual string concatenation.
- Color system: green=buy/positive, amber=hold/caution, red=avoid/negative.
- Color-blind safe: always pair color with icon or text indicator.
- Mobile-first. All layouts work at 375px+.
- Primary frontend is `lootvue/`. `property-analyzer/` has minimal UI (PropertyForm, ResultsDisplay).
- LootVue has 19 dashboard pages — see `ui-architect` agent for the full page-to-agent map.
- Zustand stores in `lootvue/src/lib/stores/` — 13 stores for state management.
