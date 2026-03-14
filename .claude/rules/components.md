---
globs: property-analyzer/components/**/*.tsx, property-analyzer/app/**/*.tsx
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
- Currently only 2 components exist (PropertyForm.tsx, ResultsDisplay.tsx). Dashboard, charts, maps are TODO.
