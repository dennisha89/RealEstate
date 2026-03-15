---
name: test
description: Run Jest test suite with coverage. Usage: /test [unit|integration|e2e|all]
user_invocable: true
---

Run the RealEstate test suite:

$ARGUMENTS determines scope:
- "unit" or empty → `cd property-analyzer && npm test -- --coverage`
- "integration" → `cd property-analyzer && npm test -- --testPathPattern=integration`
- "e2e" → `cd property-analyzer && npx playwright test`
- "all" → `cd property-analyzer && npm test -- --coverage && npx playwright test`

After running, report pass/fail counts, coverage percentages, and any failures.
Verify lib/calculator.ts has 100% coverage (4 functions: calculateMortgagePayment, calculateMonthlyExpenses, calculateMetrics, calculateAIScore).
