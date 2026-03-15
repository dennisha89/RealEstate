---
globs: "**/{__tests__,tests}/**/*.{ts,tsx}, **/*.{test,spec}.{ts,tsx}"
---

# Testing Rules

- `property-analyzer/lib/calculator.ts` must have 100% coverage (4 functions: calculateMortgagePayment, calculateMonthlyExpenses, calculateMetrics, calculateAIScore).
- Financial tests verify to 2 decimal places.
- Mock external APIs (axios) — never call real services in tests.
- Test names describe scenarios, not implementations.
- No `test.skip` or `test.todo` in committed code.
- Every bug fix includes a regression test.
- Test both `property-analyzer` (backend engines, API routes) and `lootvue` (frontend engines, stores, components).
- LootVue has 38 engines and 13 stores — all financial logic in frontend engines needs unit tests too.
