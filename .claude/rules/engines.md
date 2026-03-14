---
globs: property-analyzer/lib/engines/**/*.ts
---

# Engine Rules

- All 22 engines are in `lib/engines/`. Each must have a single responsibility.
- `data-sources.ts` is the ONLY file for API connectors. ALL currently return mock data via `generateMock*()`.
- NEVER ship mock data to production. Every `generateMock*()` must be replaced with real API calls.
- All data fetching must return `DataSourceResult<T>` with status: fresh | cached | stale | error.
- Validate API responses with Zod schemas before processing.
- Financial calculations require confidence intervals, not point estimates.
- Every new calculation needs a unit test.
