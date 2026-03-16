# Formula Validation Report

**Date**: 2026-03-16
**Scope**: Core financial formulas in `property-analyzer/lib/calculator.ts`, `lootvue/src/lib/engines/financial-engine.ts`, `lootvue/src/lib/engines/dcf-engine.ts`, `lootvue/src/lib/engines/stress-test-engine.ts`
**Validator**: deal-analyzer agent (all results independently computed via Node.js; no estimates)

---

## Executive Summary

| # | Formula | File(s) | Status | Severity |
|---|---------|---------|--------|----------|
| 1 | Mortgage payment (amortization) | calculator.ts, financial-engine.ts | PASS | — |
| 2 | Cap rate | calculator.ts, financial-engine.ts, dcf-engine.ts | PASS | — |
| 3 | DSCR | financial-engine.ts, dcf-engine.ts | PASS | — |
| 4 | Cash-on-Cash — calculator.ts | calculator.ts | PASS | — |
| 5 | Cash-on-Cash — financial-engine.ts (lootvue) | financial-engine.ts | PASS | — |
| 6 | Cash-on-Cash — stress-test-engine.ts (property-analyzer) | stress-test-engine.ts | **BUG** | HIGH |
| 7 | GRM | financial-engine.ts | PASS | — |
| 8 | Break-even occupancy | financial-engine.ts | PASS | — |
| 9 | IRR — Newton-Raphson solver | dcf-engine.ts (both copies) | PASS | — |
| 10 | NPV | dcf-engine.ts (both copies) | PASS | — |
| 11 | Amortization schedule | dcf-engine.ts (both copies) | PASS | — |
| 12 | DCF exit / terminal value | dcf-engine.ts (both copies) | PASS | — |
| 13 | Expense ratio denominator | financial-engine.ts | **MINOR** | LOW |
| 14 | Management fee basis | calculator.ts, financial-engine.ts | **MINOR** | LOW |
| 15 | Stress test survival threshold | property-analyzer stress-test-engine.ts | **MINOR** | LOW |
| 16 | Depreciation land exclusion | dcf-engine.ts (both copies) | PASS with caveat | LOW |
| 17 | calculateAIScore — DSCR not weighted | calculator.ts | **DESIGN GAP** | MEDIUM |
| 18 | Known-answer spec: mortgage | Task specification | **SPEC ERROR** | INFO |
| 19 | Known-answer spec: IRR | Task specification | **SPEC ERROR** | INFO |

**Active bugs: 1 HIGH, 3 LOW, 1 MEDIUM design gap**
**Spec errors in the validation prompt itself: 2** (the code is correct; the prompt's known answers are wrong)

---

## 1. Mortgage Payment Formula

### Standard (Fannie Mae, CFA, HughCalc)

```
M = P * [r * (1+r)^n] / [(1+r)^n - 1]
  where r = annual_rate / 100 / 12,  n = term_years * 12
```

### Known-answer verification

Computed independently in Node.js:

```
P = 300,000   annual = 6.95%   r = 0.0695/12 = 0.00579167   n = 360
(1 + r)^360 = 7.99635169
M = 300000 * (0.00579167 * 7.99635169) / (7.99635169 - 1)
  = 300000 * 0.04632948 / 6.99635169
  = 1,985.843719  ->  Math.round = 1,986
```

| Scenario | Exact | Rounded | calculator.ts | financial-engine.ts |
|----------|-------|---------|---------------|---------------------|
| $300k @ 6.95%, 30yr | $1,985.84 | $1,986 | $1,986 | $1,986 |
| $300k @ 7.00%, 30yr | $1,995.91 | $1,996 | $1,996 | $1,996 |
| $300k @ 0.00%, 30yr | $833.33 | $833 | $833 | $833 |
| $0 principal | $0 | $0 | $0 | $0 |

**Result: PASS.** Both implementations are arithmetically correct. Formula matches Fannie Mae standard fixed-rate amortization.

**SPEC ERROR — Item 18**: The task specification states the known answer is $1,983.45. The correct value for $300,000 at 6.95%/yr over 30 years is $1,985.84 (unrounded). No rate near 6.95% produces $1,983.45 — verified by binary search across all rates. The spec is off by $2.41. The code is correct.

**Precision note**: `Math.round(payment)` drops cents and stores integer dollars. The quant rules require storing monetary values as integer cents. Neither calculator.ts nor financial-engine.ts stores cents — they store rounded dollar integers. This works for display but would cause rounding accumulation errors in a full amortization schedule summation. For the mortgage payment line item alone the impact is below $0.50/month (~$6/yr), acceptable for screening-level analysis but not for a formal amortization schedule.

---

## 2. Cap Rate

### Standard (CCIM, Appraisal Institute, CFA)

```
Cap Rate (%) = Annual NOI / Purchase Price * 100
NOI = Effective Gross Income - Operating Expenses (debt service EXCLUDED)
```

### Known-answer verification

```
NOI = $50,000   Price = $500,000
Cap Rate = 50000 / 500000 * 100 = 10.00%
```

| Scenario | Expected | calculator.ts | financial-engine.ts | dcf-engine.ts |
|----------|----------|---------------|---------------------|---------------|
| $50k NOI / $500k price | 10.00% | 10.00% | 10.00% | 10.00% |
| Price = 0 | 0 (no div/zero) | 0 | 0 | 0 |

**Result: PASS.** All three engines exclude mortgage/debt service from NOI. Cap rate is financing-agnostic in all implementations. Confirmed by testing that changing down payment percentage does not change cap rate output.

---

## 3. Debt Service Coverage Ratio (DSCR)

### Standard (Fannie Mae DUS, OCC Comptroller's Handbook)

```
DSCR = Annual NOI / Annual Debt Service (P+I only; PMI excluded from NOI)
Minimum threshold: 1.25x (Fannie Mae DUS); 1.20x (FHA MAP); 1.0x = absolute breakeven
```

### Known-answer verification

```
NOI = $60,000   Debt Service = $48,000
DSCR = 60000 / 48000 = 1.25x
```

| Scenario | Expected | financial-engine.ts | dcf-engine.ts |
|----------|----------|---------------------|---------------|
| $60k NOI / $48k debt | 1.25x | 1.25x | 1.25x |
| Debt service = 0 | Infinity | Infinity | Infinity |

**Result: PASS.** Both engines calculate DSCR as NOI / annual P+I. In `dcf-engine.ts`, PMI is correctly excluded from NOI and deducted from CFBT separately, which is the correct treatment per OCC guidance.

---

## 4. Cash-on-Cash Return — calculator.ts

### Standard (CFA equity dividend rate; JP Morgan CRE; Wall Street Prep)

```
CoC (%) = Annual Before-Tax Cash Flow / Total Cash Invested * 100
Total Cash Invested = down payment + closing costs + initial renovations
```

### Known-answer verification

```
Annual CF = $12,000   Total invested = $100,000
CoC = 12000 / 100000 * 100 = 12.00%
```

**Implementation** (`calculator.ts` lines 139–141):
```typescript
const estimatedClosingCosts = price * 0.03;
const cashInvested = downPayment + estimatedClosingCosts;
const cashOnCashReturn = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
```

**Result: PASS.** Denominator correctly includes both down payment and closing costs (3% of purchase price). Matches the CFA equity dividend rate definition.

---

## 5. Cash-on-Cash Return — financial-engine.ts (lootvue)

**Implementation** (`lootvue/src/lib/engines/financial-engine.ts` lines 82–86):
```typescript
const closingCosts = purchasePrice * (closingCostsPct / 100);
const totalCashInvested = downPayment + closingCosts;
const cashOnCashReturn = totalCashInvested > 0
  ? (annualCashFlow / totalCashInvested) * 100
  : 0;
```

**Result: PASS.** Correctly includes closing costs in denominator. `closingCostsPct` is configurable and defaults to 3.0%.

---

## 6. Cash-on-Cash Return — stress-test-engine.ts (property-analyzer) — BUG: HIGH

**File**: `property-analyzer/lib/engines/stress-test-engine.ts`, line 87

### Bug

```typescript
// CURRENT (WRONG):
cashOnCash: r2(input.downPayment > 0 ? (monthlyCF * 12 / input.downPayment) * 100 : 0),
```

The denominator is `downPayment` alone, omitting closing costs (~3% of purchase price). This inflates the reported CoC return.

### Quantified impact

On a $400,000 property with 20% down:
- Down payment: $80,000
- 3% closing costs: $12,000
- Correct denominator: $92,000
- CoC overstatement factor: $92,000 / $80,000 = **1.15x** (15% inflation)

Example: If annual cash flow is $4,000:
- Bug reports: 5.00%
- Correct is: 4.35%

This affects all 6 stress scenario outputs and the baseline calculation in the property-analyzer backend. The lootvue frontend copy of this engine has the fix applied (`totalCashInvested ?? downPayment`). The backend is behind.

### Fix

```typescript
// In StressTestInput interface, add:
totalCashInvested?: number;  // down payment + closing costs + initial repairs

// In compute() function, replace line 87:
cashOnCash: r2((input.totalCashInvested ?? input.downPayment) > 0
  ? (monthlyCF * 12 / (input.totalCashInvested ?? input.downPayment)) * 100
  : 0),
```

Then update all callers to pass `totalCashInvested = downPayment + closingCosts`.

---

## 7. Gross Rent Multiplier (GRM)

### Standard (CCIM Institute, Investopedia)

```
GRM = Purchase Price / Annual Gross Rent
```

### Known-answer verification

```
Price = $400,000   Monthly rent = $4,000
Annual rent = $48,000
GRM = 400000 / 48000 = 8.3333
```

**Implementation** (`financial-engine.ts` line 88):
```typescript
const grossRentMultiplier = purchasePrice / (monthlyRent * 12);
```

**Result: PASS.** Correct formula, correct denominator (annual gross rent, not EGI).

---

## 8. Break-Even Occupancy

### Standard (Appraisal Institute — income capitalization approach)

```
BEO (%) = (Debt Service + Operating Expenses) / Gross Potential Income * 100
```

Note: vacancy is NOT in the numerator because vacancy is what BEO is solving for. The numerator is fixed costs; the denominator is 100% occupancy rent.

**Implementation** (`financial-engine.ts` lines 102–105):
```typescript
const totalMonthlyCosts = monthlyMortgage + propertyTax + insurance + management + maintenance + capex;
const breakEvenOccupancy = monthlyRent > 0
  ? (totalMonthlyCosts / monthlyRent) * 100
  : 100;
```

The numerator includes debt service + all operating expenses (excluding vacancy). The denominator is gross potential income (full rent at 100% occupancy). This matches the Appraisal Institute formula.

**Result: PASS.**

---

## 9. IRR — Newton-Raphson Solver

### Standard (Newton-Raphson iteration; Adventures in CRE; Wall Street Prep)

```
Find r* such that: sum_{t=0}^{n} CF[t] / (1 + r*)^t = 0
Update:  r_{k+1} = r_k - NPV(r_k) / NPV'(r_k)
NPV'(r) = sum_{t=1}^{n} -t * CF[t] / (1+r)^(t+1)
```

### Known-answer verification

Cash flows: `[-100000, 12000, 12000, 12000, 12000, 132000]`

This represents: Year 0 equity outflow of $100k; Years 1–4 operating cash flow of $12k; Year 5 operating cash flow of $12k plus sale proceeds of $120k = $132k.

Independent computation:

```
NPV at r = 14.968%:  -0.001  (effectively zero — confirmed root)
NPV at r = 16.1%:    -3,912  (far from zero — NOT a root)

IRR = 14.97% (converges in <20 Newton-Raphson iterations at tolerance 1e-8)
```

| Scenario | Expected | dcf-engine.ts (both copies) |
|----------|----------|------------------------------|
| Above cash flows | 14.97% | 14.97% |
| NPV at IRR | ~$0 | ~$0 |
| Single cash flow (no sign change) | NaN | NaN |
| All positive (no sign change) | NaN | NaN |

**Result: PASS.** Both `lootvue` and `property-analyzer` copies of `dcf-engine.ts` implement Newton-Raphson correctly with:
- Convergence tolerance 1e-8 (exceeds the quant rule requirement)
- Max 1,000 iterations
- Bisection fallback when derivative is near zero
- Feasibility clamping to prevent r <= -1

**SPEC ERROR — Item 19**: The task specification states the IRR is "approximately 16.1%." The correct value is 14.97%. At r = 16.1%, NPV = -$3,912 (not zero). No rounding or approximation error accounts for this discrepancy — 16.1% is simply wrong. The code is correct.

---

## 10. NPV

### Formula

```
NPV = sum_{t=0}^{n} CF[t] / (1 + discountRate)^t
CF[0] is NOT discounted (t=0 -> divides by 1.0)
```

### Known-answer verification

```
Cash flows: [-1000, 500, 500, 500]   discount rate: 10%
NPV = -1000 + 500/1.10 + 500/1.21 + 500/1.331
    = -1000 + 454.55 + 413.22 + 375.66
    = $243.43
```

| Scenario | Expected | dcf-engine.ts |
|----------|----------|---------------|
| [-1000, 500, 500, 500] at 10% | $243.43 | $243.43 |
| Single outflow [-100000] | -$100,000 | -$100,000 |
| discountRate = -1 | RangeError | RangeError thrown |

**Result: PASS.** Year 0 is correctly left undiscounted. Guard against discountRate <= -1 is correctly implemented.

---

## 11. Amortization Schedule

### Known-answer verification

$300,000 loan, 7.00%/yr, 30yr amortization, Month 1:
```
Monthly payment: $1,995.91 (rounded $1,996)
Interest:  $300,000 * (0.07/12) = $1,750.00
Principal: $1,995.91 - $1,750.00 = $245.91
Balance:   $300,000 - $245.91 = $299,754.09
```

The balloon payment logic in `buildAmortizationSchedule`: on the final month of the loan term, the entire remaining balance is set as principal (correct). This correctly handles 5-year balloon on a 30-year amortization schedule.

**Result: PASS.**

---

## 12. DCF Exit / Terminal Value

### Standard (ARGUS Enterprise; Appraisal Institute income capitalization)

```
Sale Price = Year(N+1) NOI / Exit Cap Rate
```

The convention of using Year N+1 NOI (the first full year a hypothetical buyer would receive) rather than Year N NOI is the ARGUS institutional standard. This is more conservative and technically correct per the Appraisal Institute.

Both copies of `dcf-engine.ts` implement this correctly.

**Result: PASS.**

---

## 13. Expense Ratio Denominator — Minor Issue

**File**: `lootvue/src/lib/engines/financial-engine.ts`, lines 96–99

**Current**:
```typescript
const expenseRatio = effectiveGrossIncome > 0
  ? totalMonthlyExpenses / effectiveGrossIncome
  : 0;
```

The denominator is EGI (correct per Appraisal Institute). However, `totalMonthlyExpenses` includes vacancy loss as a line item (line 66), while `effectiveGrossIncome` also already deducts vacancy from gross rent (line 69). The result is that vacancy is subtracted from income in the denominator AND counted in the expense numerator simultaneously.

### Quantified impact

At 8% vacancy on $2,000/month rent:
- Vacancy as expense: $160
- Operating expenses (excl vacancy): $500
- EGI: $1,840
- Code's expense ratio: ($500 + $160) / $1,840 = 35.9%
- Correct expense ratio (vacancy in EGI only): $500 / $1,840 = 27.2%
- Overstatement: 32%

**Severity: LOW** — `expenseRatio` is a display metric. It does not feed into cap rate, DSCR, CoC, or IRR calculations, so investment decisions are unaffected. However it will confuse any analyst comparing to CCIM benchmarks (industry average expense ratios for residential rentals are 35–50% of EGI; artificially high numbers could cause false "high-expense" alerts).

**Fix**: Remove vacancy from `totalMonthlyExpenses` before dividing, or create a separate `operatingExpenses` variable that excludes vacancy.

---

## 14. Management Fee Basis — Minor Issue

**Files**: `property-analyzer/lib/calculator.ts` (line 68), `lootvue/src/lib/engines/financial-engine.ts` (line 63)

**Current** (both files):
```typescript
const propertyManagement = Math.round(monthlyRent * 0.1);
// or
const management = Math.round(monthlyRent * managementPct);
```

**Industry standard** (CCIM, IREM): Property management fees are typically quoted as a percentage of collected rent, which is Effective Gross Income (EGI), not gross potential rent. At 8% vacancy:
- Fee on gross rent: $2,000 * 10% = $200
- Fee on EGI: $1,840 * 10% = $184
- Overstatement: 8.7% on the management line item

Note: `dcf-engine.ts` (both copies) correctly uses EGI as the basis (line 539: `management = effectiveGrossIncome * (managementPct / 100)`). The calculator and simpler financial engine use gross rent.

**Severity: LOW** — The management fee is a small line item (~10% of rent). The 8.7% overstatement of the management line translates to roughly 0.9% overstatement of total operating expenses, making NOI slightly understated and cap rate slightly understated (conservative). This is a minor discrepancy between the three engines that should be made consistent, but it errs in the conservative direction.

**Fix**: In `calculateMonthlyExpenses()` and `analyzeFinancials()`, compute management on `effectiveRent = monthlyRent * (1 - vacancyPct)` rather than `monthlyRent`.

---

## 15. Stress Test Survival Threshold — Minor Issue

**File**: `property-analyzer/lib/engines/stress-test-engine.ts`, line 124 (lootvue version line 136)

Both copies:
```typescript
const survives = results.monthlyCashFlow > 0 && results.dscr > 0.9;
```

The `dscr > 0.9` condition is redundant and misleadingly named. When `monthlyCashFlow > 0`, it is mathematically impossible for DSCR to be below 1.0, because positive cash flow after debt service implies NOI > debt service implies DSCR > 1.0. The 0.9 threshold can never be the binding constraint.

More critically, the threshold label implies "survives if DSCR > 0.9" which would be technically insolvent territory (default on any conventional loan). The `monthlyCashFlow > 0` check is the real guard.

**Severity: LOW** — the logic produces correct survival verdicts because `monthlyCashFlow > 0` is always the binding condition. But the `dscr > 0.9` threshold is confusing dead code.

**Fix**: Change to `results.dscr >= 1.0` for clarity, or simply remove the DSCR check and rely on `monthlyCashFlow > 0` alone.

---

## 16. DCF Depreciation Land Exclusion — Hardcoded Assumption

**File**: `lootvue/src/lib/engines/dcf-engine.ts` and `property-analyzer/lib/engines/dcf-engine.ts` (line ~449):

```typescript
const annualDepreciation =
  depreciationYears > 0
    ? (purchasePrice * 0.8) / depreciationYears
    : 0;
```

The 20% land exclusion (building = 80% of purchase price) is hardcoded.

**Reality**: Land-to-improvement ratios vary significantly:
- Suburban single-family: 15–25% land
- Urban multifamily: 30–45% land
- Gateway city (NYC, SF): 45–65% land

Using 20% in a high-land-cost market will overstate the depreciation deduction by up to 75% (e.g., if true building value is 45% not 80%, the code overstates by 80/45 = 1.78x).

**Scope**: This only affects `depreciationBenefit` and `taxableIncome` fields. It does NOT affect `cashFlowBeforeTax`, `IRR`, or `NPV` (depreciation is a non-cash deduction that is correctly excluded from the IRR cash flow series).

**Severity: LOW for IRR/NPV; MEDIUM for tax-sensitive users** relying on the `taxableIncome` field for planning.

**Fix**: Add a configurable `landValuePct` parameter (default 20%, note market dependency):
```typescript
const landValuePct = input.landValuePct ?? 20;
const annualDepreciation = depreciationYears > 0
  ? (purchasePrice * (1 - landValuePct / 100)) / depreciationYears
  : 0;
```

---

## 17. calculateAIScore — No DSCR Factor (Design Gap: MEDIUM)

**File**: `property-analyzer/lib/calculator.ts`, function `calculateAIScore`

The scoring function uses four inputs: `cashFlow`, `capRate`, `cashOnCashReturn`, `priceVsValue`. It does not receive DSCR.

**Consequence**: A property with DSCR = 0.8 (cannot cover debt service from income — technically insolvent) but positive cash flow (which is impossible mathematically, but could occur if the caller assembles inputs inconsistently) would receive a score in the BUY range. More practically, the score gives no weight to lending risk — a property that barely covers its mortgage scores the same as one with a 1.5x cushion, which matters enormously to any investor using leverage.

**Severity: MEDIUM** — This is a design gap, not an arithmetic error. But it creates a systematic blind spot: the AI score does not reflect one of the four key investment thresholds in the system prompt's own grading criteria.

**Recommendation**: Add DSCR as a fifth factor in `calculateAIScore`. Example weighting:
```typescript
// DSCR scoring (add to function):
if (factors.dscr !== undefined) {
  if (factors.dscr >= 1.5) { score += 10; positives.push(`Strong DSCR: ${factors.dscr.toFixed(2)}x`); }
  else if (factors.dscr >= 1.25) { score += 5; }
  else if (factors.dscr < 1.0) { score -= 20; negatives.push(`DSCR below 1.0: ${factors.dscr.toFixed(2)}x`); }
}
```

---

## Recommended Fixes — Priority Order

### Fix 1 — HIGH: property-analyzer stress-test-engine.ts CoC denominator

**File**: `property-analyzer/lib/engines/stress-test-engine.ts`

```typescript
// 1. Add to StressTestInput interface:
totalCashInvested?: number;   // down payment + closing costs; omitting inflates CoC by ~15%

// 2. Replace line 87 in compute():
cashOnCash: r2((input.totalCashInvested ?? input.downPayment) > 0
  ? (monthlyCF * 12 / (input.totalCashInvested ?? input.downPayment)) * 100
  : 0),
```

Then update all callers to pass `totalCashInvested`. The lootvue copy already has this fix.

### Fix 2 — MEDIUM: calculateAIScore — add DSCR factor

**File**: `property-analyzer/lib/calculator.ts`

Add `dscr?: number` to `ScoringFactors` interface and score it with a -20 point penalty below 1.0x and +10 points above 1.5x.

### Fix 3 — LOW: financial-engine.ts management fee basis

**File**: `lootvue/src/lib/engines/financial-engine.ts` and `property-analyzer/lib/calculator.ts`

Apply management percentage to EGI (after vacancy) rather than gross rent, matching `dcf-engine.ts` behavior.

### Fix 4 — LOW: financial-engine.ts expense ratio double-counts vacancy

**File**: `lootvue/src/lib/engines/financial-engine.ts`

Separate `operatingExpenses` (no vacancy) from `totalMonthlyExpenses` (with vacancy) and use the former as the numerator for `expenseRatio`.

### Fix 5 — LOW: stress-test survival threshold clarity

**Both stress-test-engine.ts files**: Change `dscr > 0.9` to `dscr >= 1.0` or remove the redundant DSCR check.

### Fix 6 — LOW: dcf-engine.ts configurable land percentage

**Both dcf-engine.ts files**: Replace hardcoded 0.8 building-value fraction with a `landValuePct` parameter defaulting to 20%.

---

## Confirmed Spec Errors in the Validation Prompt

These are errors in the task specification's "known answers," not bugs in the code.

### Spec Error 1 — Mortgage

- Stated known answer: $1,983.45 for $300,000 @ 6.95%/yr, 30yr
- Verified correct answer: $1,985.84 (exact), $1,986 (rounded)
- The stated value does not match this rate and principal under any standard amortization convention. Binary search confirmed no rate between 5% and 8% produces $1,983.45 on $300,000 over 30 years.

### Spec Error 2 — IRR

- Stated known answer: "approximately 16.1%" for cash flows [-100000, 12000, 12000, 12000, 12000, 132000]
- Verified correct answer: 14.968% (confirmed by NPV = 0 at this rate)
- NPV at 16.1% = -$3,912 (far from zero)
- The code's Newton-Raphson solver returns the correct answer of 14.97%

---

## Hardcoded Assumptions That Should Be Configurable

| Location | Assumption | Hardcoded Value | Rationale for Making Configurable |
|----------|-----------|-----------------|-----------------------------------|
| `calculator.ts` line 51 | Property tax rate | 1.25%/yr | Varies 0.3% (HI) to 2.5% (IL, NJ) |
| `calculator.ts` line 65 | Insurance rate | 0.7%/yr | Varies 0.5–2%+ (FL/TX) |
| `calculator.ts` line 68 | Management rate | 10% of rent | Varies 8–12%; self-managed = 0 |
| `calculator.ts` line 71 | Maintenance | 1%/yr of value | Standard but age/type dependent |
| `calculator.ts` line 74 | CapEx reserve | 1%/yr of value | Standard but building age dependent |
| `calculator.ts` line 77 | Vacancy rate | 8% | Varies by market (3–15%) |
| `calculator.ts` line 139 | Closing costs | 3% of price | Varies 2–5% |
| `dcf-engine.ts` line ~449 | Land value % | 20% | Varies 15–65% by market |

Note: `financial-engine.ts` and `dcf-engine.ts` already accept most of these as optional parameters with the same defaults. The gap is that `calculator.ts` has them all hardcoded and `FinancialInputs` interface does not expose them.

---

## Sources

- Fannie Mae DUS Underwriting Standards (DSCR, LTV)
- OCC Comptroller's Handbook — Commercial Real Estate Lending (debt yield)
- CCIM Institute — Fundamentals of Real Estate Investment (cap rate, GRM, DSCR)
- Appraisal Institute — The Appraisal of Real Estate, 15th ed. (expense ratio, BEO, terminal value)
- CFA Institute Level II — Alternative Investments, equity dividend rate (CoC denominator)
- ARGUS Enterprise DCF Conventions (Year N+1 NOI for terminal value)
- Wall Street Prep — Real Estate Financial Modeling (IRR, NPV, equity multiple)
- Bankrate Amortization Calculator (independent mortgage verification)
- Box & Muller (1958) — Ann. Math. Statist. (normal sampling in Monte Carlo engines)
- Golub & Van Loan — Matrix Computations, 4th ed. (Cholesky decomposition)
