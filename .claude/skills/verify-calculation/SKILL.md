---
name: verify-calculation
description: Verify financial calculation accuracy against known formulas. Use when implementing or modifying mortgage, metrics, or AI score calculations.
user_invocable: true
---

Verify financial calculations in the LootVue platform:

## Core Calculator (property-analyzer)
1. Read `property-analyzer/lib/calculator.ts` (4 core functions)
2. Verify each calculation against authoritative formulas:
   - Mortgage payment: standard amortization formula M = P[r(1+r)^n]/[(1+r)^n-1]
   - Monthly expenses: all components accounted for (tax, insurance, PMI, HOA, maintenance, vacancy, CapEx)
   - Metrics: cap rate = NOI/price, cash-on-cash = annual cash flow/cash invested, DSCR = NOI/ADS, GRM = price/gross annual rent
   - AI score: weighting and normalization
3. Check that all monetary values use integers (cents), formatted only in UI

## Quant Engines (both projects)
4. Check `lootvue/src/lib/engines/dcf-engine.ts` — NPV formula, IRR convergence, terminal value
5. Check `lootvue/src/lib/engines/monte-carlo-engine.ts` — Cholesky decomposition, distribution sampling, convergence
6. Check `lootvue/src/lib/engines/waterfall-engine.ts` — preferred return, catch-up, promote tiers
7. Check `lootvue/src/lib/engines/stress-test-engine.ts` — scenario parameters, break-even calculations
8. Check `lootvue/src/lib/engines/bubble-detection-engine.ts` — z-score calculations, composite scoring

## Validation
9. Verify confidence intervals are included (not just point estimates)
10. Verify guardrails flag results outside typical ranges (cap rate 1-15%, DSCR 0.5-3.0, IRR -10% to 30%)
11. Run existing tests: `cd property-analyzer && npm test -- --testPathPattern=calculator`
12. Report accuracy assessment with any discrepancies found
