/**
 * BRRRR Calculator Engine — Buy, Rehab, Rent, Refinance, Repeat
 *
 * Implements:
 * 1. Buy phase: acquisition cost, initial financing, cash deployed
 * 2. Rehab phase: forced appreciation, equity created, ARV-based valuation
 * 3. Rent phase (pre-refi): cash flow, DSCR on initial hard money loan
 * 4. Refinance phase: new loan sizing at ARV × LTV, cash-out proceeds,
 *    cash remaining in deal, infinite return detection
 * 5. Rent phase (post-refi): stable DSCR, CoC, cap rate on long-term loan
 * 6. Repeat: recycled capital and cycle ROI for portfolio velocity analysis
 * 7. Three stress scenarios (base, low appraisal, rate spike)
 * 8. Verdict: INFINITE_RETURN / STRONG_BRRRR / PARTIAL_RECYCLE / CASH_TRAP
 *
 * All monetary values are in whole dollars (not cents) matching dcf-engine.ts convention.
 * UI layer uses Intl.NumberFormat for display.
 *
 * Mathematical references:
 *   - Mortgage payment: P × r(1+r)^n / ((1+r)^n − 1)
 *   - DSCR: NOI / annual debt service — lender benchmark ≥ 1.25x (Fannie Mae 2026)
 *   - Cash-out refi LTV: 70–75% of ARV for investment properties (The Mortgage Reports 2026)
 *   - Seasoning requirement: 6–12 months before conventional refi (Fannie Mae)
 *   - Infinite return: coined by David Greene / BiggerPockets — all capital recycled out
 *   - Cycle ROI: equity created / initial cash invested (portfolio velocity metric)
 */

// ============================================================
// Types
// ============================================================

export interface BRRRRInitialFinancing {
  /** Loan structure for the acquisition/rehab phase */
  type: 'cash' | 'hardMoney' | 'privateMoney' | 'conventional';
  /** Loan amount in dollars */
  loanAmount: number;
  /** Annual interest rate as a percentage (e.g., 11.0 for 11%) */
  interestRate: number;
  /**
   * Upfront origination points as % of loan amount.
   * Hard money: 1–3 points (Stormfield Capital 2026).
   */
  loanPoints?: number;
  /** Term of the initial loan in months (hard money: 12–24) */
  termMonths: number;
}

export interface BRRRRInput {
  // ---- Buy ----
  /** Purchase price in dollars */
  purchasePrice: number;
  /** Initial acquisition / bridge financing */
  initialFinancing: BRRRRInitialFinancing;
  /** Buy-side closing costs as % of purchase price (typically 2–3%) */
  closingCostsBuyPct: number;

  // ---- Rehab ----
  /** Total renovation budget in dollars */
  rehabCosts: number;
  /** Rehab duration in months */
  rehabMonths: number;
  /** Projected appraised value after renovations (ARV) */
  afterRepairValue: number;

  // ---- Rent ----
  /** Gross monthly market rent after stabilization */
  monthlyRent: number;
  /** Vacancy rate as a percentage (e.g., 8 for 8%) */
  vacancy: number;
  /**
   * Monthly operating expenses (property tax + insurance + maintenance + mgmt + CapEx reserves).
   * Does NOT include debt service (that is computed from the loan).
   */
  monthlyExpenses: number;

  // ---- Refinance ----
  /**
   * LTV applied to ARV for the cash-out refinance.
   * Fannie Mae investment property cash-out max: 70–75% (The Mortgage Reports 2026).
   * DSCR loans may allow up to 80%.
   */
  refinanceLTV: number;
  /** Annual interest rate on the new long-term loan (%) */
  refinanceRate: number;
  /** Amortization term for the new loan in years (typically 30) */
  refinanceTerm: number;
  /** Refinance closing costs as a flat dollar amount */
  refinanceClosingCosts: number;
  /**
   * Seasoning months before the refi can close.
   * Fannie Mae: 6 months minimum; conservative: 12 months.
   * Hard money lender term may impose its own constraint.
   */
  monthsBeforeRefi: number;
}

export type BRRRRVerdict =
  | 'INFINITE_RETURN'
  | 'STRONG_BRRRR'
  | 'PARTIAL_RECYCLE'
  | 'CASH_TRAP';

export interface BRRRRStressScenario {
  label: string;
  arvUsed: number;
  refinanceRate: number;
  newLoanAmount: number;
  cashOutProceeds: number;
  cashLeftInDeal: number;
  postRefiMonthlyCF: number;
  postRefiDSCR: number;
  verdict: BRRRRVerdict;
}

export interface BRRRRResult {
  // ---- Buy Phase ----
  /** purchasePrice + buy closing costs + rehab costs */
  totalAcquisitionCost: number;
  /** Cash deployed = down payment + buy closing + origination points + rehab costs */
  cashInvested: number;
  /** ARV − initial loan balance at time of refi */
  initialEquity: number;

  // ---- Rehab Phase ----
  /** = afterRepairValue (echoed for clarity) */
  arvPostRehab: number;
  /** ARV − purchasePrice — value created through renovation */
  forcedAppreciation: number;
  /** ARV − totalAcquisitionCost — net equity created */
  equityCreated: number;

  // ---- Rent Phase (pre-refi) ----
  /**
   * Monthly cash flow during the seasoning period on the initial hard money loan.
   * = effectiveRent − monthlyExpenses − initialMonthlyPayment
   */
  monthlyRentCFPreRefi: number;
  /** NOI / annual initial debt service */
  preRefiDSCR: number;

  // ---- Refinance Phase ----
  /** ARV × refinanceLTV */
  newLoanAmount: number;
  /** newLoanAmount − initial loan payoff − refinanceClosingCosts */
  cashOutProceeds: number;
  /** cashInvested − cashOutProceeds (negative = all money back + extra) */
  cashLeftInDeal: number;
  /**
   * True when cashLeftInDeal ≤ 0.
   * The "infinite return" condition — you have recovered all (or more than all)
   * of your initial capital while still owning the asset.
   * Source: David Greene, "Buy, Rehab, Rent, Refinance, Repeat" (BiggerPockets Press)
   */
  infiniteReturn: boolean;

  // ---- Rent Phase (post-refi) ----
  /** Monthly P+I on the new 30-year refinance loan */
  newMonthlyPayment: number;
  /** effectiveRent − monthlyExpenses − newMonthlyPayment */
  postRefiMonthlyCF: number;
  /** postRefiMonthlyCF × 12 */
  postRefiAnnualCF: number;
  /** NOI / annual new debt service */
  postRefiDSCR: number;
  /**
   * Annual cash flow / cash left in deal (%).
   * Returns Infinity when cashLeftInDeal ≤ 0 (infinite return scenario).
   */
  postRefiCoC: number;
  /** Annual NOI / ARV (%) */
  postRefiCapRate: number;

  // ---- Repeat Phase ----
  /** Capital available for the next BRRRR deal = cashOutProceeds (reusable equity) */
  recycledCapital: number;
  /** equityCreated / cashInvested (%) — measures value creation relative to capital deployed */
  cycleROI: number;
  /** rehabMonths + monthsBeforeRefi */
  cycleDurationMonths: number;
  /** cycleROI annualized to 12-month basis */
  annualizedROI: number;

  // ---- Stress Scenarios ----
  scenarios: {
    base: BRRRRStressScenario;
    lowAppraisal: BRRRRStressScenario;    // ARV −10%, tighter LTV
    rateSpike: BRRRRStressScenario;        // refi rate +200bps
  };

  // ---- Verdict ----
  verdict: BRRRRVerdict;
  plainEnglish: string;
  risks: string[];

  // ---- Input echo (for UI rendering) ----
  monthlyExpenses: number;
  effectiveMonthlyRent: number;
  annualNOI: number;
}

// ============================================================
// Internal helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Standard amortizing mortgage payment.
 * Formula: P × r(1+r)^n / ((1+r)^n − 1)
 * Zero-rate edge case returns equal principal splits.
 *
 * @param principal   - loan amount in dollars
 * @param annualPct   - annual interest rate as percentage (e.g., 7.0)
 * @param termYears   - amortization period in years
 */
function calcMonthlyPayment(
  principal: number,
  annualPct: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  const r = annualPct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round(
    (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  );
}

/**
 * Interest-only payment — used for hard money / private money during hold.
 * IO = principal × (annualRate / 12)
 */
function calcInterestOnlyPayment(
  principal: number,
  annualPct: number
): number {
  if (principal <= 0 || annualPct <= 0) return 0;
  return Math.round(principal * (annualPct / 100) / 12);
}

/**
 * Estimate initial loan balance at the time of refinance.
 * For hard money (IO), the balance equals the original loan amount.
 * For amortizing loans, we apply a simplified paydown over the seasoning period.
 */
function estimateLoanBalanceAtRefi(
  financing: BRRRRInitialFinancing,
  monthsBeforeRefi: number
): number {
  if (financing.type === 'cash') return 0;

  if (
    financing.type === 'hardMoney' ||
    financing.type === 'privateMoney'
  ) {
    // Hard money is interest-only — no principal paydown
    return financing.loanAmount;
  }

  // Conventional: approximate amortization over seasoning period
  // Use 30-year amortization as proxy for early-phase paydown
  const r = financing.interestRate / 100 / 12;
  const n = 30 * 12;
  if (r === 0) {
    return Math.round(
      financing.loanAmount - (financing.loanAmount / n) * monthsBeforeRefi
    );
  }
  const payment =
    (financing.loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  let balance = financing.loanAmount;
  for (let m = 0; m < monthsBeforeRefi && balance > 0; m++) {
    const interest = balance * r;
    balance = Math.max(0, balance - (payment - interest));
  }
  return Math.round(balance);
}

/**
 * Build scenario-level metrics for a given ARV and refi rate combination.
 * Used for both the base case and stress scenarios.
 */
function calcScenario(params: {
  arv: number;
  refinanceLTV: number;
  refinanceRate: number;
  refinanceTerm: number;
  refinanceClosingCosts: number;
  initialLoanBalance: number;
  cashInvested: number;
  monthlyRent: number;
  vacancy: number;
  monthlyExpenses: number;
}): {
  newLoanAmount: number;
  cashOutProceeds: number;
  cashLeftInDeal: number;
  infiniteReturn: boolean;
  newMonthlyPayment: number;
  postRefiMonthlyCF: number;
  postRefiDSCR: number;
  postRefiCapRate: number;
} {
  const {
    arv,
    refinanceLTV,
    refinanceRate,
    refinanceTerm,
    refinanceClosingCosts,
    initialLoanBalance,
    cashInvested,
    monthlyRent,
    vacancy,
    monthlyExpenses,
  } = params;

  const newLoanAmount = Math.round(arv * (refinanceLTV / 100));
  const cashOutProceeds = newLoanAmount - initialLoanBalance - refinanceClosingCosts;
  const cashLeftInDeal = cashInvested - cashOutProceeds;
  const infiniteReturn = cashLeftInDeal <= 0;

  const newMonthlyPayment = calcMonthlyPayment(newLoanAmount, refinanceRate, refinanceTerm);

  const effectiveRent = Math.round(monthlyRent * (1 - vacancy / 100));
  const monthlyNOI = effectiveRent - monthlyExpenses;
  const annualNOI = monthlyNOI * 12;

  const postRefiMonthlyCF = monthlyNOI - newMonthlyPayment;
  const annualDebtService = newMonthlyPayment * 12;

  const postRefiDSCR = annualDebtService > 0
    ? round2(annualNOI / annualDebtService)
    : Infinity;

  const postRefiCapRate = arv > 0
    ? round2((annualNOI / arv) * 100)
    : 0;

  return {
    newLoanAmount,
    cashOutProceeds: Math.round(cashOutProceeds),
    cashLeftInDeal: Math.round(cashLeftInDeal),
    infiniteReturn,
    newMonthlyPayment,
    postRefiMonthlyCF: Math.round(postRefiMonthlyCF),
    postRefiDSCR,
    postRefiCapRate,
  };
}

/**
 * Derive BRRRR verdict from cash recycled and post-refi DSCR.
 *
 * Grade logic:
 *   INFINITE_RETURN : cashLeftInDeal ≤ 0 (BiggerPockets definition)
 *   STRONG_BRRRR    : cashLeft < 30% of original AND postRefiDSCR > 1.2
 *   PARTIAL_RECYCLE : got some cash back but > 30% of capital still locked in
 *   CASH_TRAP       : couldn't refi enough to recycle meaningful capital
 */
function deriveVerdict(
  cashLeftInDeal: number,
  cashInvested: number,
  postRefiDSCR: number,
  infiniteReturn: boolean
): BRRRRVerdict {
  if (infiniteReturn) return 'INFINITE_RETURN';

  const pctLeft = cashInvested > 0 ? cashLeftInDeal / cashInvested : 1;

  if (pctLeft < 0.30 && postRefiDSCR > 1.2) return 'STRONG_BRRRR';
  if (pctLeft < 0.70) return 'PARTIAL_RECYCLE';
  return 'CASH_TRAP';
}

// ============================================================
// Main export
// ============================================================

/**
 * Analyze a full BRRRR cycle from purchase through refinance.
 *
 * Chain of calculation:
 *   1. Buy phase: totalAcquisitionCost = purchase + closing + rehab
 *   2. Cash invested = down payment + closing + points + rehab
 *   3. Rehab phase: forcedAppreciation = ARV − purchase
 *   4. Rent pre-refi: DSCR on initial IO loan
 *   5. Refi phase: newLoan = ARV × LTV; cashOut = newLoan − oldBalance − closingCosts
 *   6. cashLeft = cashInvested − cashOut (≤0 = infinite return)
 *   7. Rent post-refi: DSCR, CoC, cap rate on new amortizing loan
 *   8. Repeat: recycledCapital, cycleROI, annualized cycle return
 *
 * @param input  - All BRRRR deal parameters
 * @returns      - Full BRRRR analysis with verdict and stress scenarios
 */
export function analyzeBRRRR(input: BRRRRInput): BRRRRResult {
  // ---- Guard Rails ----
  if (input.purchasePrice <= 0) {
    throw new RangeError('purchasePrice must be positive');
  }
  if (input.afterRepairValue <= 0) {
    throw new RangeError('afterRepairValue must be positive');
  }
  if (input.afterRepairValue < input.purchasePrice) {
    // This can legitimately happen in a market where the deal is a cash-flow play
    // without forced appreciation — flag as a warning rather than throwing.
    // The engine still runs; the caller should surface this warning.
    console.warn(
      `[BRRRR] afterRepairValue ($${input.afterRepairValue.toLocaleString()}) is less than purchasePrice ($${input.purchasePrice.toLocaleString()}). Verify ARV estimate.`
    );
  }
  if (input.refinanceLTV <= 0 || input.refinanceLTV > 100) {
    throw new RangeError('refinanceLTV must be between 1 and 100');
  }
  if (input.rehabMonths < 0 || input.rehabMonths > 36) {
    throw new RangeError('rehabMonths must be between 0 and 36');
  }

  const {
    purchasePrice,
    initialFinancing,
    closingCostsBuyPct,
    rehabCosts,
    rehabMonths,
    afterRepairValue: arv,
    monthlyRent,
    vacancy,
    monthlyExpenses,
    refinanceLTV,
    refinanceRate,
    refinanceTerm,
    refinanceClosingCosts,
    monthsBeforeRefi,
  } = input;

  // ---- Step 1: Buy Phase ----
  const buyClosure = Math.round(purchasePrice * (closingCostsBuyPct / 100));
  const pointsCost = initialFinancing.loanAmount > 0
    ? Math.round(initialFinancing.loanAmount * ((initialFinancing.loanPoints ?? 0) / 100))
    : 0;
  const downPayment = initialFinancing.type === 'cash'
    ? purchasePrice
    : purchasePrice - initialFinancing.loanAmount;

  // Total cash deployed at closing and through rehab
  const cashInvested = downPayment + buyClosure + pointsCost + rehabCosts;
  const totalAcquisitionCost = purchasePrice + buyClosure + rehabCosts;

  // ---- Step 2: Rehab Phase ----
  const forcedAppreciation = arv - purchasePrice;
  const equityCreated = arv - totalAcquisitionCost;

  // ---- Step 3: Pre-Refi Rent Phase ----
  const effectiveMonthlyRent = Math.round(monthlyRent * (1 - vacancy / 100));
  const monthlyNOI = effectiveMonthlyRent - monthlyExpenses;
  const annualNOI = monthlyNOI * 12;

  // Initial loan payment — hard money is typically IO
  const initialMonthlyPayment =
    initialFinancing.type === 'hardMoney' || initialFinancing.type === 'privateMoney'
      ? calcInterestOnlyPayment(initialFinancing.loanAmount, initialFinancing.interestRate)
      : calcMonthlyPayment(
          initialFinancing.loanAmount,
          initialFinancing.interestRate,
          // Use the term in years; convert months → years
          Math.max(1, Math.round(initialFinancing.termMonths / 12))
        );

  const monthlyRentCFPreRefi = monthlyNOI - initialMonthlyPayment;
  const annualInitialDebtService = initialMonthlyPayment * 12;
  const preRefiDSCR = annualInitialDebtService > 0
    ? round2(annualNOI / annualInitialDebtService)
    : Infinity;

  // ---- Step 4: Refinance Phase ----
  // Estimate loan balance at refi — hard money is IO so balance = original
  const initialLoanBalance = estimateLoanBalanceAtRefi(initialFinancing, monthsBeforeRefi);
  const initialEquity = arv - initialLoanBalance;

  const baseScenario = calcScenario({
    arv,
    refinanceLTV,
    refinanceRate,
    refinanceTerm,
    refinanceClosingCosts,
    initialLoanBalance,
    cashInvested,
    monthlyRent,
    vacancy,
    monthlyExpenses,
  });

  const {
    newLoanAmount,
    cashOutProceeds,
    cashLeftInDeal,
    infiniteReturn,
    newMonthlyPayment,
    postRefiMonthlyCF,
    postRefiDSCR,
    postRefiCapRate,
  } = baseScenario;

  const postRefiAnnualCF = postRefiMonthlyCF * 12;

  // Post-refi CoC: annual cash flow / cash remaining in the deal
  // Infinity when all capital has been recycled out (infinite return)
  const postRefiCoC =
    infiniteReturn || cashLeftInDeal <= 0
      ? Infinity
      : round2((postRefiAnnualCF / cashLeftInDeal) * 100);

  // ---- Step 5: Repeat Phase ----
  const recycledCapital = Math.max(0, cashOutProceeds);
  const cycleROI = cashInvested > 0
    ? round2((equityCreated / cashInvested) * 100)
    : 0;

  const cycleDurationMonths = rehabMonths + monthsBeforeRefi;
  let annualizedROI = 0;
  if (cycleDurationMonths > 0 && cashInvested > 0) {
    const cycleROIDecimal = equityCreated / cashInvested;
    annualizedROI = round2(
      (Math.pow(1 + cycleROIDecimal, 12 / cycleDurationMonths) - 1) * 100
    );
  }

  // ---- Stress Scenarios ----

  // Scenario: low appraisal — ARV comes in 10% below expectation, LTV tightened to 70%
  const lowAppraisalARV = Math.round(arv * 0.90);
  const lowAppraisalLTV = Math.min(refinanceLTV, 70);
  const lowAppraisalData = calcScenario({
    arv: lowAppraisalARV,
    refinanceLTV: lowAppraisalLTV,
    refinanceRate,
    refinanceTerm,
    refinanceClosingCosts,
    initialLoanBalance,
    cashInvested,
    monthlyRent,
    vacancy,
    monthlyExpenses,
  });

  // Scenario: rate spike — refi rate +200bps
  const rateSpikeRate = refinanceRate + 2.0;
  const rateSpikeData = calcScenario({
    arv,
    refinanceLTV,
    refinanceRate: rateSpikeRate,
    refinanceTerm,
    refinanceClosingCosts,
    initialLoanBalance,
    cashInvested,
    monthlyRent,
    vacancy,
    monthlyExpenses,
  });

  // ---- Verdict ----
  const verdict = deriveVerdict(
    cashLeftInDeal,
    cashInvested,
    postRefiDSCR,
    infiniteReturn
  );

  // ---- Plain English ----
  const cashLeftDisplay = cashLeftInDeal <= 0
    ? `recycled ALL capital plus an extra $${Math.abs(cashLeftInDeal).toLocaleString()}`
    : `$${cashLeftInDeal.toLocaleString()} remains in the deal`;

  const verdictCopy: Record<BRRRRVerdict, string> = {
    INFINITE_RETURN: `Infinite return. You ${cashLeftDisplay} after refinance while keeping a property generating $${postRefiMonthlyCF.toLocaleString()}/mo cash flow. Capital is fully recycled for the next deal.`,
    STRONG_BRRRR: `Strong BRRRR. ${cashLeftDisplay} (under 30% of original investment) with DSCR of ${postRefiDSCR.toFixed(2)}x. Capital recycling is strong and the rental holds up under lending scrutiny.`,
    PARTIAL_RECYCLE: `Partial recycle. ${cashLeftDisplay} after refinance. You get some capital back but significant equity remains locked in the property. Consider a higher-LTV DSCR lender or wait for additional appreciation.`,
    CASH_TRAP: `Cash trap. The refinance did not generate meaningful capital to recycle. ARV may need to increase, rehab costs need to drop, or a higher-LTV lender is required to make the BRRRR cycle work.`,
  };

  const plainEnglish = verdictCopy[verdict];

  // ---- Risks ----
  const risks: string[] = [];

  if (arv < purchasePrice) {
    risks.push(
      `ARV ($${arv.toLocaleString()}) is below purchase price ($${purchasePrice.toLocaleString()}). The deal destroys value before rehab — verify ARV with local comps.`
    );
  }
  if (rehabCosts > arv * 0.35) {
    risks.push(
      `Rehab budget ($${rehabCosts.toLocaleString()}) is more than 35% of ARV — appraisers may not give full credit for the improvement. Scope creep risk is significant.`
    );
  }
  if (refinanceLTV > 75) {
    risks.push(
      `${refinanceLTV}% LTV exceeds the 2026 Fannie Mae investment property cash-out maximum of 70–75% (The Mortgage Reports). Model with 70–75% for realistic planning.`
    );
  }
  if (monthsBeforeRefi < 6) {
    risks.push(
      `${monthsBeforeRefi}-month seasoning is below the 6-month minimum Fannie Mae requires for investment property cash-out refis (effective April 2023). Plan for at least 6 months.`
    );
  }
  if (preRefiDSCR < 1.0) {
    risks.push(
      `Pre-refi DSCR of ${preRefiDSCR.toFixed(2)}x means the property is cash-flow negative on the initial hard money loan. You will need reserves to cover the gap during the seasoning period.`
    );
  }
  if (postRefiDSCR < 1.25) {
    risks.push(
      `Post-refi DSCR of ${postRefiDSCR.toFixed(2)}x is below the 1.25x lender minimum. The refinance may be declined or require rate concessions.`
    );
  }
  if (lowAppraisalData.cashLeftInDeal > cashInvested * 0.80) {
    risks.push(
      `If the appraisal comes in 10% below ARV ($${lowAppraisalARV.toLocaleString()}), the deal becomes a cash trap — $${lowAppraisalData.cashLeftInDeal.toLocaleString()} locked in with limited recycle.`
    );
  }
  if (rateSpikeData.postRefiMonthlyCF < 0) {
    risks.push(
      `A +200bps rate spike pushes the post-refi cash flow negative at $${rateSpikeData.postRefiMonthlyCF.toLocaleString()}/mo. Lock the rate at refi or ensure reserves can absorb a rate environment shift.`
    );
  }
  if (initialFinancing.type === 'hardMoney' && (initialFinancing.interestRate ?? 0) > 12) {
    risks.push(
      `Hard money rate of ${initialFinancing.interestRate}% is above the 2026 national average of 8.5–11.2% (Stormfield Capital). High carrying cost during the seasoning period compresses returns.`
    );
  }
  if (equityCreated < 0) {
    risks.push(
      `Negative equity created ($${equityCreated.toLocaleString()}) — total costs exceed ARV. The rehab must increase value more than costs to make this a viable BRRRR.`
    );
  }
  if (cycleDurationMonths > 18) {
    risks.push(
      `${cycleDurationMonths}-month cycle (rehab + seasoning) slows portfolio velocity significantly. Each BRRRR repeat takes over 18 months to recycle capital.`
    );
  }

  return {
    // Buy
    totalAcquisitionCost,
    cashInvested: Math.round(cashInvested),
    initialEquity: Math.round(initialEquity),
    // Rehab
    arvPostRehab: arv,
    forcedAppreciation: Math.round(forcedAppreciation),
    equityCreated: Math.round(equityCreated),
    // Pre-refi rent
    monthlyRentCFPreRefi: Math.round(monthlyRentCFPreRefi),
    preRefiDSCR,
    // Refi
    newLoanAmount,
    cashOutProceeds: Math.round(cashOutProceeds),
    cashLeftInDeal: Math.round(cashLeftInDeal),
    infiniteReturn,
    // Post-refi rent
    newMonthlyPayment,
    postRefiMonthlyCF: Math.round(postRefiMonthlyCF),
    postRefiAnnualCF: Math.round(postRefiAnnualCF),
    postRefiDSCR,
    postRefiCoC,
    postRefiCapRate,
    // Repeat
    recycledCapital: Math.round(recycledCapital),
    cycleROI,
    cycleDurationMonths,
    annualizedROI,
    // Stress scenarios
    scenarios: {
      base: {
        label: 'Base case',
        arvUsed: arv,
        refinanceRate,
        newLoanAmount: baseScenario.newLoanAmount,
        cashOutProceeds: baseScenario.cashOutProceeds,
        cashLeftInDeal: baseScenario.cashLeftInDeal,
        postRefiMonthlyCF: baseScenario.postRefiMonthlyCF,
        postRefiDSCR: baseScenario.postRefiDSCR,
        verdict: deriveVerdict(
          baseScenario.cashLeftInDeal,
          cashInvested,
          baseScenario.postRefiDSCR,
          baseScenario.infiniteReturn
        ),
      },
      lowAppraisal: {
        label: 'Appraisal −10%, LTV capped at 70%',
        arvUsed: lowAppraisalARV,
        refinanceRate,
        newLoanAmount: lowAppraisalData.newLoanAmount,
        cashOutProceeds: lowAppraisalData.cashOutProceeds,
        cashLeftInDeal: lowAppraisalData.cashLeftInDeal,
        postRefiMonthlyCF: lowAppraisalData.postRefiMonthlyCF,
        postRefiDSCR: lowAppraisalData.postRefiDSCR,
        verdict: deriveVerdict(
          lowAppraisalData.cashLeftInDeal,
          cashInvested,
          lowAppraisalData.postRefiDSCR,
          lowAppraisalData.infiniteReturn
        ),
      },
      rateSpike: {
        label: 'Refi rate +200bps',
        arvUsed: arv,
        refinanceRate: rateSpikeRate,
        newLoanAmount: rateSpikeData.newLoanAmount,
        cashOutProceeds: rateSpikeData.cashOutProceeds,
        cashLeftInDeal: rateSpikeData.cashLeftInDeal,
        postRefiMonthlyCF: rateSpikeData.postRefiMonthlyCF,
        postRefiDSCR: rateSpikeData.postRefiDSCR,
        verdict: deriveVerdict(
          rateSpikeData.cashLeftInDeal,
          cashInvested,
          rateSpikeData.postRefiDSCR,
          rateSpikeData.infiniteReturn
        ),
      },
    },
    verdict,
    plainEnglish,
    risks,
    // Echoed for UI
    monthlyExpenses,
    effectiveMonthlyRent,
    annualNOI: Math.round(annualNOI),
  };
}
