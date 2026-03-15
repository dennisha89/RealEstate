---
name: verify-calculation
description: Verify financial calculation accuracy against known formulas. Use when implementing or modifying mortgage, metrics, or AI score calculations.
user_invocable: true
---

Verify financial calculations in the RealEstate project:

1. Read `lib/calculator.ts` (the 4 core functions)
2. Verify each calculation against authoritative formulas:
   - Mortgage payment: standard amortization formula
   - Monthly expenses: all components accounted for
   - Metrics: cap rate, cash-on-cash, DSCR, GRM
   - AI score: weighting and normalization
3. Check that all monetary values use integers (cents), formatted only in UI
4. Verify confidence intervals are included (not just point estimates)
5. Verify guardrails flag results outside typical ranges (cap rate 1-15%, DSCR 0.5-3.0)
6. Run existing tests: `cd property-analyzer && npm test -- --testPathPattern=calculator`
7. Report accuracy assessment
