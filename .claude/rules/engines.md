---
globs: "**/lib/engines/**/*.ts"
---

# Engine Rules

- **34 engines** in `property-analyzer/lib/engines/`, **38 engines** in `lootvue/src/lib/engines/` (4 extra: market-forecast, leading-indicator, bubble-detection, capital-flow-composite).
- Each engine has a single responsibility and is owned by exactly one agent — see File-to-Agent Routing in CLAUDE.md.
- `data-sources.ts` is the ONLY file for API connectors. ALL currently return mock data via `generateMock*()`.
- NEVER ship mock data to production. Every `generateMock*()` must be replaced with real API calls.
- All data fetching must return `DataSourceResult<T>` with status: fresh | cached | stale | error.
- Validate API responses with Zod schemas before processing.
- Financial calculations require confidence intervals, not point estimates.
- Every new calculation needs a unit test.
- When modifying an engine, keep `property-analyzer` and `lootvue` copies in sync — backend is source of truth.
