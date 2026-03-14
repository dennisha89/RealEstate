---
globs: property-analyzer/__tests__/**/*.ts, property-analyzer/__tests__/**/*.tsx
---

# Testing Rules

- `lib/calculator.ts` must have 100% coverage (4 functions: calculateMortgagePayment, calculateMonthlyExpenses, calculateMetrics, calculateAIScore).
- Financial tests verify to 2 decimal places.
- Mock external APIs (axios) — never call real services in tests.
- Test names describe scenarios, not implementations.
- No `test.skip` or `test.todo` in committed code.
- Every bug fix includes a regression test.
- `__tests__/` directory does not exist yet — create it when adding first test.
