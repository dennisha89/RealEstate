/**
 * DCF & IRR Engine — Institutional-Grade Investment Analysis
 *
 * Implements:
 * 1. Newton-Raphson IRR solver (levered + unlevered)
 * 2. Full 10-year pro forma DCF with monthly/annual granularity
 * 3. Net Present Value (NPV) at configurable discount rates
 * 4. Equity Multiple calculation
 * 5. Debt Yield analysis
 * 6. Exit analysis at multiple cap rates and hold periods
 *
 * All monetary values are in dollars (not cents) for readability
 * in financial modeling contexts. UI layer converts as needed.
 *
 * Mathematical references:
 *   - Newton-Raphson: NPV(r) = sum CF[t]/(1+r)^t = 0; r_new = r - NPV(r)/NPV'(r)
 *   - Debt Yield: NOI / Loan Amount; institutional benchmark 8-12% (OCC)
 *   - Equity Multiple: Total Distributions / Total Equity Invested
 *   - IRR formula verified against Adventures in CRE and Wall Street Prep methodology
 */

// ============================================================
// Types
// ============================================================

export interface DCFInput {
  // Acquisition
  purchasePrice: number;
  closingCostsPct: number;       // % of purchase price (typically 2-4%)
  renovationBudget: number;      // upfront capex

  // Financing
  loanAmount: number;            // absolute dollar amount
  interestRate: number;          // annual % (e.g., 7.0 for 7%)
  loanTermYears: number;         // balloon term (e.g., 5 or 10)
  amortizationYears: number;     // amortization schedule length (e.g., 30)
  loanOriginationFeePct: number; // origination points (e.g., 1.0 for 1%)

  // Income
  monthlyRent: number;           // gross monthly rent at acquisition
  annualRentGrowthPct: number;   // projected annual rent growth (e.g., 2.0)
  otherIncome: number;           // monthly: laundry, parking, storage, etc.

  // Expenses
  vacancyPct: number;            // % of gross potential rent (typical 5-8%)
  propertyTaxRate: number;       // annual % of purchase price (e.g., 1.25)
  insuranceAnnual: number;       // annual insurance premium in dollars
  managementPct: number;         // % of effective gross income (e.g., 10)
  maintenancePct: number;        // % of purchase price annually (e.g., 1.0)
  capexReservePct: number;       // % of purchase price annually (e.g., 1.0)

  // Growth assumptions
  annualExpenseGrowthPct: number; // operating expense inflation (typically 2-3%)
  annualAppreciationPct: number;  // property value appreciation (e.g., 3.0)

  // Exit assumptions
  holdPeriodYears: number;        // intended hold (typically 5-10)
  exitCapRate: number;            // terminal cap rate at sale (e.g., 6.5)
  sellingCostsPct: number;        // broker + transfer + closing (typically 5-6%)
}

export interface AnnualCashFlow {
  year: number;
  grossRent: number;
  otherIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  debtService: number;
  cashFlowBeforeTax: number;
  principalPaydown: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  cashOnCash: number;  // %
  capRate: number;     // %
  debtYield: number;   // %
  dscr: number;        // NOI / annual debt service
}

export interface ExitAnalysis {
  salePrice: number;
  sellingCosts: number;
  loanPayoff: number;
  netProceedsFromSale: number;
  totalProfit: number;
  profitOnEquity: number;    // %
  annualizedReturn: number;  // % (= leveredIRR)
}

export interface DCFResult {
  // Summary metrics
  leveredIRR: number;            // % — equity return including debt
  unleveredIRR: number;          // % — all-cash return; isolates asset from leverage
  equityMultiple: number;        // total distributions / total equity invested
  netPresentValue: number;       // NPV at the supplied discount rate
  debtYield: number;             // Year 1 NOI / loan amount (%)
  cashOnCashByYear: number[];    // annual CoC returns array

  // Annual pro forma
  annualCashFlows: AnnualCashFlow[];

  // Exit analysis
  exitAnalysis: ExitAnalysis;

  // Capital summary
  totalEquityInvested: number;
  totalCashDistributed: number;  // operating CFs + net sale proceeds
  totalAppreciation: number;     // exit property value minus purchase price
  totalDebtPaydown: number;      // loan balance reduction over hold period

  // Cumulative break-even
  breakEvenMonth: number | null; // month when cumulative levered CF turns positive
}

export interface ExitSensitivityResult {
  exitCapRates: number[];          // column headers
  holdPeriods: number[];           // row headers
  irrMatrix: number[][];           // [holdPeriod index][exitCap index] = IRR %
  equityMultipleMatrix: number[][]; // [holdPeriod index][exitCap index] = EM
}

// ============================================================
// Internal helpers
// ============================================================

interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Build a full monthly amortization schedule up to loanTermYears (balloon).
 * Payments are sized on amortizationYears but the schedule stops at loanTermYears
 * to represent the balloon balance.
 *
 * @param loanAmount     - original principal
 * @param annualRate     - annual interest rate as a percentage (e.g., 7.0)
 * @param amortYears     - full amortization period determining payment size
 * @param termYears      - actual loan term before balloon (may equal amortYears)
 */
function buildAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  amortYears: number,
  termYears: number
): AmortizationEntry[] {
  if (loanAmount <= 0) return [];

  const monthlyRate = annualRate / 100 / 12;
  const totalAmortMonths = amortYears * 12;
  const termMonths = termYears * 12;

  // Standard mortgage payment formula. Handles zero-rate edge case.
  let payment: number;
  if (monthlyRate === 0) {
    payment = loanAmount / totalAmortMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, totalAmortMonths);
    payment = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  const schedule: AmortizationEntry[] = [];
  let balance = loanAmount;

  for (let month = 1; month <= termMonths && balance > 0.005; month++) {
    const interest = balance * monthlyRate;
    // In the final month of the term, the entire remaining balance is due (balloon).
    const isBalloon = month === termMonths;
    const principal = isBalloon
      ? balance
      : Math.min(payment - interest, balance);

    balance = isBalloon ? 0 : Math.max(0, balance - principal);

    schedule.push({
      month,
      payment: round2(isBalloon ? interest + principal : payment),
      principal: round2(principal),
      interest: round2(interest),
      balance: round2(balance),
    });
  }

  return schedule;
}

// ============================================================
// IRR Solver — Newton-Raphson with Bisection Fallback
// ============================================================

/**
 * Evaluate NPV and its first derivative at a given rate.
 * NPV(r)  = sum_{t=0}^{n} CF[t] / (1+r)^t
 * NPV'(r) = sum_{t=1}^{n} -t * CF[t] / (1+r)^(t+1)
 */
function npvAndDerivative(
  cashFlows: number[],
  rate: number
): { npv: number; dnpv: number } {
  let npv = 0;
  let dnpv = 0;

  for (let t = 0; t < cashFlows.length; t++) {
    const denom = Math.pow(1 + rate, t);
    npv += cashFlows[t] / denom;
    if (t > 0) {
      dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
  }

  return { npv, dnpv };
}

/**
 * Bisection fallback — slower but guaranteed to converge when a root exists
 * in [-0.99, 10]. Used when Newton-Raphson diverges or stalls.
 *
 * Time complexity: O(log((high - low) / tolerance)) — roughly 50 iterations
 * for the default range and tolerance.
 */
function calculateIRRBisection(
  cashFlows: number[],
  tolerance: number = 1e-8
): number {
  const evalNPV = (r: number): number =>
    cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);

  // Search in a practical range for real estate returns
  let low = -0.9999;
  let high = 10.0;

  const npvLow = evalNPV(low);
  const npvHigh = evalNPV(high);

  // No sign change means no real root in this interval
  if (npvLow * npvHigh > 0) return NaN;

  for (let i = 0; i < 2000; i++) {
    const mid = (low + high) / 2;
    const val = evalNPV(mid);

    if (Math.abs(val) < tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }

    if (val * npvLow < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculate IRR using Newton-Raphson iteration with bisection fallback.
 *
 * The IRR is the discount rate r* such that:
 *   sum_{t=0}^{n} CF[t] / (1 + r*)^t = 0
 *
 * Newton-Raphson converges quadratically — typically 10-20 iterations
 * to 1e-8 precision. Bisection is used as a fallback when the derivative
 * is near zero or the iterate leaves the feasible region.
 *
 * @param cashFlows  - array where cashFlows[0] is typically the negative
 *                     initial investment; subsequent values are periodic returns
 * @param guess      - initial rate estimate as a decimal (default 0.10 = 10%)
 * @param maxIter    - maximum Newton-Raphson iterations (default 1000)
 * @param tolerance  - convergence tolerance on |NPV| (default 1e-8)
 * @returns          - IRR as a decimal (0.15 = 15%), NaN if no real solution
 */
export function calculateIRR(
  cashFlows: number[],
  guess: number = 0.10,
  maxIter: number = 1000,
  tolerance: number = 1e-8
): number {
  // Guard: need at least one sign change in cash flows for a real root
  if (cashFlows.length < 2) return NaN;

  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf > 0) hasPositive = true;
    if (cf < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) return NaN;

  let rate = guess;

  for (let i = 0; i < maxIter; i++) {
    const { npv, dnpv } = npvAndDerivative(cashFlows, rate);

    // Converged
    if (Math.abs(npv) < tolerance) return rate;

    // Derivative too small — avoid division by near-zero
    if (Math.abs(dnpv) < 1e-12) {
      return calculateIRRBisection(cashFlows, tolerance);
    }

    const step = npv / dnpv;
    let newRate = rate - step;

    // Clamp to keep iterate in feasible region — IRR cannot be <= -100%
    if (newRate <= -0.9999) newRate = (rate + (-0.9999)) / 2;
    else if (newRate > 10.0) newRate = (rate + 10.0) / 2;

    // If the step is negligible, we have converged
    if (Math.abs(newRate - rate) < 1e-12) return newRate;

    rate = newRate;
  }

  // Newton-Raphson did not converge; fall back to bisection
  return calculateIRRBisection(cashFlows, tolerance);
}

// ============================================================
// NPV
// ============================================================

/**
 * Calculate Net Present Value of a cash flow series at a given discount rate.
 *
 * NPV = sum_{t=0}^{n} CF[t] / (1 + discountRate)^t
 *
 * Positive NPV: deal returns more than the hurdle rate (value-creating).
 * Negative NPV: deal destroys value at this required return.
 *
 * @param cashFlows    - period cash flows; [0] is typically the outflow (negative)
 * @param discountRate - required rate of return as a decimal (e.g., 0.08 = 8%)
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  if (discountRate <= -1) {
    throw new RangeError("discountRate must be greater than -1");
  }

  return cashFlows.reduce((sum, cf, t) => {
    return sum + cf / Math.pow(1 + discountRate, t);
  }, 0);
}

// ============================================================
// Full DCF Analysis
// ============================================================

/**
 * Run a complete institutional-grade DCF analysis.
 *
 * Methodology:
 *   Year 0: total equity out = purchase - loan + closing costs + reno + origination fee
 *   Years 1-N: levered CF = NOI - annual debt service (P+I)
 *   Exit year: add net sale proceeds = sale price - selling costs - loan payoff
 *   Levered IRR: Newton-Raphson on equity cash flows
 *   Unlevered IRR: Newton-Raphson on all-cash (NOI-based) flows using full acquisition cost
 *
 * @param input        - all deal parameters
 * @param discountRate - hurdle rate for NPV (decimal; default 0.08 = 8%)
 */
export function runDCF(input: DCFInput, discountRate: number = 0.08): DCFResult {
  const {
    purchasePrice,
    closingCostsPct,
    renovationBudget,
    loanAmount,
    interestRate,
    loanTermYears,
    amortizationYears,
    loanOriginationFeePct,
    monthlyRent,
    annualRentGrowthPct,
    otherIncome,
    vacancyPct,
    propertyTaxRate,
    insuranceAnnual,
    managementPct,
    maintenancePct,
    capexReservePct,
    annualExpenseGrowthPct,
    annualAppreciationPct,
    holdPeriodYears,
    exitCapRate,
    sellingCostsPct,
  } = input;

  // ---- Guard Rails ----
  if (holdPeriodYears < 1 || holdPeriodYears > 30) {
    throw new RangeError("holdPeriodYears must be between 1 and 30");
  }
  if (exitCapRate <= 0) {
    throw new RangeError("exitCapRate must be positive");
  }

  // ---- Capital Stack (Year 0 outflows) ----
  const closingCosts = purchasePrice * (closingCostsPct / 100);
  const loanOriginationFee = loanAmount * (loanOriginationFeePct / 100);

  // Total equity invested = everything you write a check for at closing
  // = down payment + closing costs + reno budget + loan origination fee
  const downPayment = purchasePrice - loanAmount;
  const totalEquityInvested =
    downPayment + closingCosts + renovationBudget + loanOriginationFee;

  // ---- Amortization Schedule ----
  const amortSchedule = buildAmortizationSchedule(
    loanAmount,
    interestRate,
    amortizationYears,
    loanTermYears
  );

  // Monthly debt service is constant (based on amortization, not balloon term)
  const monthlyDebtService =
    amortSchedule.length > 0 ? amortSchedule[0].payment : 0;
  const annualDebtService = monthlyDebtService * 12;

  // ---- Pro Forma Setup ----
  const annualCashFlows: AnnualCashFlow[] = [];

  // Levered cash flows: equity perspective (includes debt benefit and burden)
  //   Year 0: -totalEquityInvested
  //   Years 1-N: cashFlowBeforeTax
  //   Exit year: += netProceedsFromSale
  const leveredCFs: number[] = [-totalEquityInvested];

  // Unlevered cash flows: all-cash perspective (ignores financing)
  //   Year 0: -(purchasePrice + closingCosts + renovationBudget)
  //   Years 1-N: NOI
  //   Exit year: += (salePrice - sellingCosts)
  const unleveredInitialOutlay = purchasePrice + closingCosts + renovationBudget;
  const unleveredCFs: number[] = [-unleveredInitialOutlay];

  let cumulativeLeveredCF = -totalEquityInvested;
  let breakEvenMonth: number | null = null;

  for (let year = 1; year <= holdPeriodYears; year++) {
    // -- Income --
    // Rent grows by annualRentGrowthPct compound each year.
    // Year 1 uses the acquisition-year rent (growth factor = 1.0 at year 0 = (1+g)^0).
    const rentGrowthFactor = Math.pow(1 + annualRentGrowthPct / 100, year - 1);
    const grossRent = monthlyRent * 12 * rentGrowthFactor;
    const otherIncomeAnnual = otherIncome * 12 * rentGrowthFactor;

    // Vacancy is applied to gross potential income (rent + other income)
    const vacancyLoss = (grossRent + otherIncomeAnnual) * (vacancyPct / 100);
    const effectiveGrossIncome = grossRent + otherIncomeAnnual - vacancyLoss;

    // -- Expenses --
    // Fixed-base expenses grow at annualExpenseGrowthPct compound.
    const expGrowth = Math.pow(1 + annualExpenseGrowthPct / 100, year - 1);

    // Property tax: based on acquisition price (conservative; ignores reassessments)
    const propertyTax = purchasePrice * (propertyTaxRate / 100) * expGrowth;

    // Insurance: fixed annual amount that escalates
    const insurance = insuranceAnnual * expGrowth;

    // Management: % of effective gross income (variable with revenue)
    const management = effectiveGrossIncome * (managementPct / 100);

    // Maintenance and CapEx reserves: % of purchase price (normalized to asset value)
    const maintenance = purchasePrice * (maintenancePct / 100) * expGrowth;
    const capexReserve = purchasePrice * (capexReservePct / 100) * expGrowth;

    const operatingExpenses =
      propertyTax + insurance + management + maintenance + capexReserve;

    // -- NOI --
    const noi = effectiveGrossIncome - operatingExpenses;

    // -- Levered Cash Flow --
    // Cash flow before tax = NOI minus debt service (principal + interest)
    const cashFlowBeforeTax = noi - annualDebtService;

    // -- Property Value --
    // Appreciation compounds on the original purchase price.
    const propertyValue =
      purchasePrice * Math.pow(1 + annualAppreciationPct / 100, year);

    // -- Loan Balance at end of this year --
    // amortSchedule is indexed 0-based; end-of-year-Y balance is at month (Y*12 - 1)
    const endMonthIdx = year * 12 - 1; // 0-based index
    const loanBalance =
      endMonthIdx < amortSchedule.length
        ? amortSchedule[endMonthIdx].balance
        : 0;

    // -- Principal Paydown this year --
    const startMonthIdx = (year - 1) * 12 - 1; // 0-based; -1 for year 1 = original balance
    const startBalance =
      year === 1
        ? loanAmount
        : startMonthIdx >= 0 && startMonthIdx < amortSchedule.length
          ? amortSchedule[startMonthIdx].balance
          : 0;

    const principalPaydown = startBalance - loanBalance;

    // -- Derived Metrics --
    const equity = propertyValue - loanBalance;

    // Cash-on-cash: levered annual cash flow / total equity invested at closing
    const cashOnCash =
      totalEquityInvested > 0
        ? (cashFlowBeforeTax / totalEquityInvested) * 100
        : 0;

    // Cap rate: based on current-year property value (going-in cap shifts as value grows)
    const capRate = propertyValue > 0 ? (noi / propertyValue) * 100 : 0;

    // Debt yield: lender-facing metric — uses original loan amount per OCC guidance
    const debtYield = loanAmount > 0 ? (noi / loanAmount) * 100 : 0;

    // DSCR: must exceed 1.25x for conventional commercial lending
    const dscr = annualDebtService > 0 ? noi / annualDebtService : Infinity;

    annualCashFlows.push({
      year,
      grossRent: Math.round(grossRent),
      otherIncome: Math.round(otherIncomeAnnual),
      vacancyLoss: Math.round(vacancyLoss),
      effectiveGrossIncome: Math.round(effectiveGrossIncome),
      operatingExpenses: Math.round(operatingExpenses),
      netOperatingIncome: Math.round(noi),
      debtService: Math.round(annualDebtService),
      cashFlowBeforeTax: Math.round(cashFlowBeforeTax),
      principalPaydown: Math.round(principalPaydown),
      propertyValue: Math.round(propertyValue),
      loanBalance: Math.round(loanBalance),
      equity: Math.round(equity),
      cashOnCash: round2(cashOnCash),
      capRate: round2(capRate),
      debtYield: round2(debtYield),
      dscr: round2(dscr),
    });

    // Accumulate IRR series (exit proceeds added after the loop)
    leveredCFs.push(Math.round(cashFlowBeforeTax));
    unleveredCFs.push(Math.round(noi));

    // Break-even: first month when cumulative levered CF turns positive
    cumulativeLeveredCF += cashFlowBeforeTax;
    if (breakEvenMonth === null && cumulativeLeveredCF > 0) {
      breakEvenMonth = year * 12;
    }
  }

  // ---- Exit Analysis ----
  // ARGUS/institutional standard: apply exit cap rate to Year N+1 NOI
  // (the first full year a new buyer would receive), not Year N.
  // We project Year N+1 NOI by growing the final year's NOI by one year
  // of rent growth and expense growth.
  // Source: ARGUS Enterprise DCF conventions; Appraisal Institute income approach.
  const finalYearFlow = annualCashFlows[annualCashFlows.length - 1];
  const nextYearRentGrowth = 1 + annualRentGrowthPct / 100;
  const nextYearExpenseGrowth = 1 + annualExpenseGrowthPct / 100;
  const nextYearEGI = finalYearFlow.effectiveGrossIncome * nextYearRentGrowth;
  const nextYearOpEx = finalYearFlow.operatingExpenses * nextYearExpenseGrowth;
  const exitNOI = Math.round(nextYearEGI - nextYearOpEx);

  // Sale price = Year N+1 NOI / exit cap rate (direct capitalization)
  const salePrice =
    exitCapRate > 0 ? Math.round(exitNOI / (exitCapRate / 100)) : 0;

  const sellingCosts = Math.round(salePrice * (sellingCostsPct / 100));
  const loanPayoff = finalYearFlow.loanBalance;
  const netProceedsFromSale = salePrice - sellingCosts - loanPayoff;

  // Add exit proceeds to the final period of each IRR series
  leveredCFs[leveredCFs.length - 1] += netProceedsFromSale;
  unleveredCFs[unleveredCFs.length - 1] += salePrice - sellingCosts;

  // ---- IRR (Newton-Raphson, decimal output — multiply by 100 for %) ----
  const leveredIRRDecimal = calculateIRR(leveredCFs);
  const unleveredIRRDecimal = calculateIRR(unleveredCFs);

  const leveredIRR = isNaN(leveredIRRDecimal)
    ? NaN
    : round2(leveredIRRDecimal * 100);
  const unleveredIRR = isNaN(unleveredIRRDecimal)
    ? NaN
    : round2(unleveredIRRDecimal * 100);

  // ---- Equity Multiple ----
  // Total cash returned to equity / total equity put in
  const totalOperatingCFs = annualCashFlows.reduce(
    (s, y) => s + y.cashFlowBeforeTax,
    0
  );
  const totalCashDistributed = totalOperatingCFs + netProceedsFromSale;
  const equityMultiple =
    totalEquityInvested > 0
      ? round2(totalCashDistributed / totalEquityInvested)
      : 0;

  // ---- NPV ----
  const netPresentValue = Math.round(calculateNPV(leveredCFs, discountRate));

  // ---- Debt Yield (Year 1, per OCC convention) ----
  const year1NOI = annualCashFlows[0]?.netOperatingIncome ?? 0;
  const debtYield = loanAmount > 0 ? round2((year1NOI / loanAmount) * 100) : 0;

  // ---- Capital Summary ----
  const totalAppreciation = Math.round(
    finalYearFlow.propertyValue - purchasePrice
  );
  const totalDebtPaydown = Math.round(loanAmount - finalYearFlow.loanBalance);

  // ---- Exit Analysis Object ----
  const totalProfit = totalCashDistributed - totalEquityInvested;
  const exitAnalysis: ExitAnalysis = {
    salePrice,
    sellingCosts,
    loanPayoff,
    netProceedsFromSale,
    totalProfit: Math.round(totalProfit),
    profitOnEquity:
      totalEquityInvested > 0
        ? round2((totalProfit / totalEquityInvested) * 100)
        : 0,
    annualizedReturn: leveredIRR, // same as IRR
  };

  return {
    leveredIRR,
    unleveredIRR,
    equityMultiple,
    netPresentValue,
    debtYield,
    cashOnCashByYear: annualCashFlows.map((y) => y.cashOnCash),
    annualCashFlows,
    exitAnalysis,
    totalEquityInvested: Math.round(totalEquityInvested),
    totalCashDistributed: Math.round(totalCashDistributed),
    totalAppreciation,
    totalDebtPaydown,
    breakEvenMonth,
  };
}

// ============================================================
// Multi-Exit Sensitivity Analysis
// ============================================================

/**
 * Run DCF across a grid of exit cap rates and hold periods.
 *
 * Produces a matrix of levered IRRs and equity multiples for sensitivity
 * tables — the standard presentation in institutional investment memoranda.
 * Rows = hold periods; columns = exit cap rates.
 *
 * Example usage:
 *   const sensitivity = runExitSensitivity(baseInput);
 *   // sensitivity.irrMatrix[0][2] = IRR at holdPeriod[0] and exitCap[2]
 *
 * @param baseInput    - base case DCF inputs (holdPeriodYears and exitCapRate are overridden)
 * @param exitCapRates - range of terminal cap rates to test (%, e.g., [5.0, 5.5, 6.0])
 * @param holdPeriods  - range of hold periods to test (years, e.g., [3, 5, 7, 10])
 */
export function runExitSensitivity(
  baseInput: DCFInput,
  exitCapRates: number[] = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0],
  holdPeriods: number[] = [3, 5, 7, 10]
): ExitSensitivityResult {
  const irrMatrix: number[][] = [];
  const equityMultipleMatrix: number[][] = [];

  for (const holdPeriod of holdPeriods) {
    const irrRow: number[] = [];
    const emRow: number[] = [];

    for (const exitCap of exitCapRates) {
      const result = runDCF(
        { ...baseInput, holdPeriodYears: holdPeriod, exitCapRate: exitCap },
        0.08
      );
      irrRow.push(result.leveredIRR);
      emRow.push(result.equityMultiple);
    }

    irrMatrix.push(irrRow);
    equityMultipleMatrix.push(emRow);
  }

  return {
    exitCapRates,
    holdPeriods,
    irrMatrix,
    equityMultipleMatrix,
  };
}
