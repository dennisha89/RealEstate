---
name: test
description: Run test suite with coverage. Usage: /test [unit|integration|e2e|all|lootvue]
user_invocable: true
---

Run the LootVue / Property Analyzer test suite:

$ARGUMENTS determines scope:
- "unit" or empty → `cd property-analyzer && npm test -- --coverage`
- "integration" → `cd property-analyzer && npm test -- --testPathPattern=integration`
- "e2e" → `cd property-analyzer && npx playwright test`
- "all" → `cd property-analyzer && npm test -- --coverage && npx playwright test`
- "lootvue" → `cd lootvue && npm test -- --coverage` (frontend engine tests)

After running, report pass/fail counts, coverage percentages, and any failures.
Verify lib/calculator.ts has 100% coverage (4 functions: calculateMortgagePayment, calculateMonthlyExpenses, calculateMetrics, calculateAIScore).
