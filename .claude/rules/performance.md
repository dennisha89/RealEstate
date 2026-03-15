---
globs: "**/*.{ts,tsx}"
---

# Performance Rules

- **Bundle size**: Lazy-load all chart libraries (`recharts`), map libraries (`react-map-gl`), and heavy components with `next/dynamic({ ssr: false })`.
- **API response time**: Target <500ms for single-property analysis, <2s for market intelligence (multi-engine).
- **No N+1 queries**: Batch database queries. Use `Promise.all()` for parallel API calls to independent engines.
- **Memoization**: Use `React.memo` for expensive chart/table components. Use `useMemo`/`useCallback` only when profiling shows re-render issues — don't pre-optimize.
- **Images**: Use `next/image` with proper `width`/`height`. Never load unoptimized images.
- **Data pagination**: API responses with >50 items must be paginated. Frontend tables use virtual scrolling for >100 rows.
- **Cache strategy**: Use SWR or React Query patterns — stale-while-revalidate for market data, no-cache for real-time signals.
- **Engine parallelization**: Independent engines must run in parallel (`Promise.all`), not sequentially.
