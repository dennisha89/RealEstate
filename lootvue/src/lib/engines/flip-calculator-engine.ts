/**
 * Flip Calculator Engine — ARV-Based House Flip Analysis
 *
 * Implements:
 * 1. 70% Rule / Maximum Allowable Offer (MAO)
 * 2. Total project cost waterfall (acquisition → rehab → holding → financing → selling)
 * 3. Profit margin, ROI, annualized ROI, cash-on-cash
 * 4. Break-even ARV, rehab overrun buffer, maximum holding months before profit = 0
 * 5. Three stress scenarios (base, rehab overrun, extended hold)
 * 6. Verdict grading: STRONG_FLIP / MARGINAL_FLIP / TOO_THIN / LOSS
 *
 * All monetary values are in whole dollars (not cents) matching dcf-engine.ts convention.
 * UI layer uses Intl.NumberFormat for display.
 *
 * Mathematical references:
 *   - 70% Rule: MAO = ARV × 0.70 − repair costs (BiggerPockets; REtipster)
 *   - Annualized ROI: (1 + ROI)^(12/months) − 1 (standard annualization formula)
 *   - Hard money rate benchmarks: 8.5–11.2% national average, 1–3 points (Stormfield Capital 2026)
 *   - Selling cost benchmark: 6–8% gross (agent 5–6% + title/transfer 1–2%)
 */

// ============================================================
// Types
// ============================================================

export interface FlipCalculatorInput {
  /** Purchase (acquisition) price in dollars */
  purchasePrice: number;
  /** After-Repair Value — the projected sale price post-renovation */
  afterRepairValue: number;
  /** Total renovation budget in dollars */
  rehabCosts: number;
  /** Months from purchase date to project completion (rehab done, property listed) */
  rehabTimeline: number;
  /** Total months from purchase to final closing on the sale side */
  holdingPeriodMonths: number;
  /** Buy-side closing costs as % of purchase price (typically 2–3%) */
  closingCostsBuyPct: number;
  /** Sell-side closing costs as % of sale price (typically 6–8%: agent + title) */
  closingCostsSellPct: number;
  /** Financing structure — affects interest calculation method */
  financingType: 'cash' | 'hardMoney' | 'conventional' | 'private';
  /** Loan amount in dollars (required when financingType !== 'cash') */
  loanAmount?: number;
  /** Annual interest rate as a percentage (e.g., 10.5 for 10.5%) */
  interestRate?: number;
  /**
   * Upfront origination points as a percentage of loan amount.
   * Hard money: typically 1–3 points (Stormfield Capital 2026).
   */
  loanPoints?: number;
  monthlyHoldingCosts: {
    /** Monthly property tax portion (annual tax ÷ 12) */
    propertyTax: number;
    /** Monthly insurance premium */
    insurance: number;
    /** Monthly utilities (must stay on during rehab) */
    utilities: number;
    /**
     * Monthly loan payment during hold.
     * Hard money is typically interest-only: loanAmount × (annualRate / 12).
     * Caller should pre-compute and pass this value.
     */
    loanPayment?: number;
  };
}

export interface FlipStressScenario {
  label: string;
  rehabCosts: number;
  holdingPeriodMonths: number;
  salePrice: number;
  profit: number;
  profitMargin: number;
  verdict: FlipVerdict;
}

export type FlipVerdict = 'STRONG_FLIP' | 'MARGINAL_FLIP' | 'TOO_THIN' | 'LOSS';

export interface FlipAnalysisResult {
  // ---- Core Metrics ----
  /** Projected sale price (= afterRepairValue) */
  arv: number;
  /** Purchase + rehab + all closing costs + holding + financing costs */
  totalProjectCost: number;
  /** ARV − selling costs − total project cost */
  expectedProfit: number;
  /** expectedProfit / ARV (%) — industry standard profit margin for flips */
  profitMargin: number;
  /** expectedProfit / totalCashInvested (%) — return on total cash deployed */
  roi: number;
  /**
   * ROI adjusted for holding period to a 12-month basis.
   * Formula: (1 + roi/100)^(12/holdingPeriodMonths) − 1
   */
  annualizedROI: number;
  /** expectedProfit / cashOutOfPocket (%) where cashOutOfPocket = down payment + upfront fees */
  cashOnCash: number;

  // ---- 70% Rule ----
  /** ARV × 0.70 − rehabCosts (BiggerPockets MAO formula) */
  maxAllowableOffer: number;
  /** true if purchasePrice ≤ maxAllowableOffer */
  maoMeetsPrice: boolean;
  /** (purchasePrice + rehabCosts) / ARV (%) — how much of ARV is consumed by costs */
  actualPctOfARV: number;

  // ---- Cost Waterfall ----
  /** purchasePrice + buy-side closing costs */
  acquisitionCosts: number;
  /** Renovation budget (as input) */
  rehabCosts: number;
  /** monthlyHoldingCosts sum × holdingPeriodMonths */
  holdingCosts: number;
  /** Interest paid + origination points */
  financingCosts: number;
  /** Sell-side closing costs (commissions + title) */
  sellingCosts: number;
  /** Sum of all cost buckets */
  totalCosts: number;

  // ---- Risk Metrics ----
  /** Minimum ARV needed to break even (profit = 0) */
  breakEvenARV: number;
  /** How much rehab can go over budget before profit turns negative */
  rehabOverrunBuffer: number;
  /** How many additional months you can hold before profit reaches zero */
  maxAdditionalHoldingMonths: number;

  // ---- Stress Scenarios ----
  scenarios: {
    base: FlipStressScenario;
    rehabOverrun: FlipStressScenario;      // +20% rehab cost, +1 month hold
    extendedHold: FlipStressScenario;      // +3 months hold, ARV −3%
  };

  // ---- Verdict ----
  verdict: FlipVerdict;
  plainEnglish: string;
  risks: string[];

  // ---- Input echo (for UI rendering) ----
  holdingPeriodMonths: number;
  totalCashInvested: number;
  cashOutOfPocket: number;
}

// ============================================================
// Internal helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compute interest-only cost for hard money / private money.
 * Interest accrues on the outstanding balance for the full hold period.
 * No principal paydown assumed (hard money is typically IO during the flip).
 */
function calcInterestCost(
  loanAmount: number,
  annualRatePct: number,
  holdMonths: number
): number {
  if (loanAmount <= 0 || annualRatePct <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  return Math.round(loanAmount * monthlyRate * holdMonths);
}

/**
 * Compute total monthly holding costs (tax + insurance + utilities + loan payment).
 */
function calcMonthlyHold(costs: FlipCalculatorInput['monthlyHoldingCosts']): number {
  return (
    costs.propertyTax +
    costs.insurance +
    costs.utilities +
    (costs.loanPayment ?? 0)
  );
}

/**
 * Build profit and margin for an arbitrary scenario variant.
 * Pure function — no side effects.
 */
function calcScenarioProfit(params: {
  arv: number;
  purchasePrice: number;
  closingCostsBuyPct: number;
  closingCostsSellPct: number;
  rehabCosts: number;
  holdMonths: number;
  monthlyHold: number;
  financingCosts: number;
}): { profit: number; profitMargin: number; totalCosts: number } {
  const {
    arv,
    purchasePrice,
    closingCostsBuyPct,
    closingCostsSellPct,
    rehabCosts,
    holdMonths,
    monthlyHold,
    financingCosts,
  } = params;

  const acquisitionCosts = Math.round(purchasePrice * (1 + closingCostsBuyPct / 100));
  const holdingCosts = Math.round(monthlyHold * holdMonths);
  const sellingCosts = Math.round(arv * (closingCostsSellPct / 100));
  // Profit = ARV − sell closing − (purchase + buy closing + rehab + holding + financing)
  // Selling costs are excluded from totalCosts so profit = ARV − sellingCosts − totalCosts
  const nonSellCosts = acquisitionCosts + rehabCosts + holdingCosts + financingCosts;
  const profit = arv - sellingCosts - nonSellCosts;
  const profitMargin = arv > 0 ? round2((profit / arv) * 100) : 0;

  return {
    profit: Math.round(profit),
    profitMargin,
    totalCosts: nonSellCosts,
  };
}

/**
 * Derive verdict from profit margin and 70% rule compliance.
 *
 * Grade thresholds (BiggerPockets / CCIM flip benchmarks):
 *   STRONG_FLIP  : margin > 15% AND ROI > 25% AND passes 70% rule
 *   MARGINAL_FLIP: margin 8–15% OR fails 70% rule by < 5%
 *   TOO_THIN     : margin 0–8%
 *   LOSS         : margin < 0%
 */
function deriveVerdict(
  profitMargin: number,
  roi: number,
  maoMeetsPrice: boolean,
  maoShortfallPct: number   // how far over MAO the purchase price is (positive = over)
): FlipVerdict {
  if (profitMargin < 0) return 'LOSS';
  if (profitMargin < 8) return 'TOO_THIN';
  if (profitMargin > 15 && roi > 25 && maoMeetsPrice) return 'STRONG_FLIP';
  if (profitMargin >= 8 && profitMargin <= 15) return 'MARGINAL_FLIP';
  if (!maoMeetsPrice && maoShortfallPct < 5) return 'MARGINAL_FLIP';
  // profitMargin > 15% but fails ROI or 70% rule by more than 5%
  return 'MARGINAL_FLIP';
}

// ============================================================
// Main export
// ============================================================

/**
 * Analyze a house flip deal from purchase through sale.
 *
 * Chain of calculation:
 *   1. Acquisition costs  = purchasePrice + buy closing
 *   2. Financing costs    = interest (IO) + origination points
 *   3. Holding costs      = monthly hold × holdingPeriodMonths
 *   4. Selling costs      = ARV × sellClosingPct
 *   5. Total costs        = (1) + rehabCosts + (2) + (3)
 *   6. Expected profit    = ARV − (4) − (5)
 *   7. Profit margin      = profit / ARV
 *   8. ROI                = profit / totalCashInvested
 *   9. Annualized ROI     = (1 + ROI)^(12/months) − 1
 *  10. MAO                = ARV × 0.70 − rehabCosts
 *
 * @param input  - All deal parameters
 * @returns      - Full flip analysis with verdict and stress scenarios
 */
export function analyzeFlip(input: FlipCalculatorInput): FlipAnalysisResult {
  // ---- Guard Rails ----
  if (input.afterRepairValue <= 0) {
    throw new RangeError('afterRepairValue must be positive');
  }
  if (input.purchasePrice <= 0) {
    throw new RangeError('purchasePrice must be positive');
  }
  if (input.holdingPeriodMonths < 1 || input.holdingPeriodMonths > 60) {
    throw new RangeError('holdingPeriodMonths must be between 1 and 60');
  }
  if (input.rehabCosts < 0) {
    throw new RangeError('rehabCosts cannot be negative');
  }

  const {
    purchasePrice,
    afterRepairValue: arv,
    rehabCosts,
    holdingPeriodMonths,
    closingCostsBuyPct,
    closingCostsSellPct,
    financingType,
    loanAmount = 0,
    interestRate = 0,
    loanPoints = 0,
    monthlyHoldingCosts,
  } = input;

  // ---- Step 1: Acquisition Costs ----
  const buyClosure = Math.round(purchasePrice * (closingCostsBuyPct / 100));
  const acquisitionCosts = purchasePrice + buyClosure;

  // ---- Step 2: Financing Costs ----
  // Interest: IO for hard money / private; estimated standard for conventional
  let interestCost = 0;
  let pointsCost = 0;

  if (financingType !== 'cash' && loanAmount > 0) {
    interestCost = calcInterestCost(loanAmount, interestRate, holdingPeriodMonths);
    pointsCost = Math.round(loanAmount * (loanPoints / 100));
  }

  const financingCosts = interestCost + pointsCost;

  // ---- Step 3: Holding Costs ----
  const monthlyHold = calcMonthlyHold(monthlyHoldingCosts);
  const holdingCosts = Math.round(monthlyHold * holdingPeriodMonths);

  // ---- Step 4: Selling Costs ----
  const sellingCosts = Math.round(arv * (closingCostsSellPct / 100));

  // ---- Step 5: Total Project Cost (acquisition + rehab + holding + financing; selling excluded) ----
  // Industry convention separates "project costs" (what you spend to acquire and rehab)
  // from "selling costs" (what you pay to exit). Both are deducted from ARV for profit.
  const totalProjectCost = acquisitionCosts + rehabCosts + holdingCosts + financingCosts;

  // ---- Step 6: Expected Profit ----
  // Profit = what you net at closing minus everything you spent
  // = ARV − sell closing − (purchase + buy closing + rehab + holding + financing)
  const expectedProfit = arv - sellingCosts - totalProjectCost;

  // ---- Step 7: Profit Margin ----
  // Industry standard: profit / ARV (not profit / cost)
  // This is the "gross margin" a lender or JV partner evaluates.
  // Source: BiggerPockets, CCIM flip underwriting
  const profitMargin = arv > 0 ? round2((expectedProfit / arv) * 100) : 0;

  // ---- Step 8: ROI ----
  // Total cash invested = all cash you actually wrote checks for
  // Cash deals: full purchase price + closing + rehab + holding
  // Financed deals: down payment + closing + rehab + holding + points
  const downPayment = financingType === 'cash' ? purchasePrice : purchasePrice - loanAmount;
  const cashOutOfPocket = downPayment + buyClosure + pointsCost;
  const totalCashInvested = cashOutOfPocket + rehabCosts + holdingCosts + interestCost;

  const roi = totalCashInvested > 0
    ? round2((expectedProfit / totalCashInvested) * 100)
    : 0;

  const cashOnCash = cashOutOfPocket > 0
    ? round2((expectedProfit / cashOutOfPocket) * 100)
    : 0;

  // ---- Step 9: Annualized ROI ----
  // Convert deal ROI to annual equivalent using the holding period.
  // Formula: (1 + ROI/100)^(12 / holdingPeriodMonths) − 1
  // This is the time-value-adjusted version of ROI for comparing flips of different durations.
  let annualizedROI = 0;
  if (holdingPeriodMonths > 0 && totalCashInvested > 0) {
    const roiDecimal = expectedProfit / totalCashInvested;
    annualizedROI = round2(
      (Math.pow(1 + roiDecimal, 12 / holdingPeriodMonths) - 1) * 100
    );
  }

  // ---- Step 10: 70% Rule ----
  // MAO = ARV × 0.70 − repair costs
  // Source: BiggerPockets 70% Rule Calculator; Lima One Capital
  const maxAllowableOffer = Math.round(arv * 0.70 - rehabCosts);
  const maoMeetsPrice = purchasePrice <= maxAllowableOffer;
  const actualPctOfARV = arv > 0
    ? round2(((purchasePrice + rehabCosts) / arv) * 100)
    : 0;
  const maoShortfallPct = arv > 0
    ? round2(((purchasePrice - maxAllowableOffer) / arv) * 100)
    : 0;

  // ---- Break-even Metrics ----
  // Break-even ARV: the minimum sale price that covers all costs (profit = 0)
  // breakEvenARV = (totalProjectCost + breakEvenSellCost) solved simultaneously:
  //   breakEvenARV = totalProjectCost / (1 − closingCostsSellPct/100)
  const breakEvenARV = Math.round(
    totalProjectCost / (1 - closingCostsSellPct / 100)
  );

  // Rehab overrun buffer: how much over budget rehab can go before profit = 0
  // At profit = 0: expectedProfit − overrun = 0 → overrun = expectedProfit
  const rehabOverrunBuffer = Math.max(0, Math.round(expectedProfit));

  // Max additional holding months before profit reaches zero
  // Each additional month costs monthlyHold (but also increases sell costs proportionally with
  // ARV which is fixed). Additional monthly cost = monthlyHold only (ARV doesn't change).
  // months = expectedProfit / monthlyHold
  const maxAdditionalHoldingMonths = monthlyHold > 0
    ? Math.max(0, Math.floor(expectedProfit / monthlyHold))
    : 999;

  // ---- Stress Scenarios ----
  const baseSale = calcScenarioProfit({
    arv,
    purchasePrice,
    closingCostsBuyPct,
    closingCostsSellPct,
    rehabCosts,
    holdMonths: holdingPeriodMonths,
    monthlyHold,
    financingCosts,
  });

  // Scenario: rehab overrun (+20%) and one extra month
  const rehabOverrunAmount = Math.round(rehabCosts * 1.20);
  const rehabOverrunHold = holdingPeriodMonths + 1;
  const rehabOverrunFinancing = financingType !== 'cash' && loanAmount > 0
    ? calcInterestCost(loanAmount, interestRate, rehabOverrunHold) + pointsCost
    : 0;
  const rehabOverrunScenario = calcScenarioProfit({
    arv,
    purchasePrice,
    closingCostsBuyPct,
    closingCostsSellPct,
    rehabCosts: rehabOverrunAmount,
    holdMonths: rehabOverrunHold,
    monthlyHold,
    financingCosts: rehabOverrunFinancing,
  });

  // Scenario: extended hold (+3 months) and ARV −3% (market softens during hold)
  const extendedHoldMonths = holdingPeriodMonths + 3;
  const extendedHoldARV = Math.round(arv * 0.97);
  const extendedHoldFinancing = financingType !== 'cash' && loanAmount > 0
    ? calcInterestCost(loanAmount, interestRate, extendedHoldMonths) + pointsCost
    : 0;
  const extendedHoldScenario = calcScenarioProfit({
    arv: extendedHoldARV,
    purchasePrice,
    closingCostsBuyPct,
    closingCostsSellPct,
    rehabCosts,
    holdMonths: extendedHoldMonths,
    monthlyHold,
    financingCosts: extendedHoldFinancing,
  });

  // ---- Verdict ----
  const verdict = deriveVerdict(profitMargin, roi, maoMeetsPrice, maoShortfallPct);

  // ---- Plain English ----
  const profitDisplay = expectedProfit >= 0
    ? `$${expectedProfit.toLocaleString()} profit`
    : `($${Math.abs(expectedProfit).toLocaleString()}) loss`;

  const holdStr = `${holdingPeriodMonths}-month hold`;

  const verdictCopy: Record<FlipVerdict, string> = {
    STRONG_FLIP: `Strong flip. ${profitDisplay} on a ${holdStr} — ${profitMargin.toFixed(1)}% margin and ${annualizedROI.toFixed(1)}% annualized return. Passes the 70% rule.`,
    MARGINAL_FLIP: `Marginal flip. ${profitDisplay} on a ${holdStr} — ${profitMargin.toFixed(1)}% margin. Any rehab overrun or extended hold erodes returns quickly.`,
    TOO_THIN: `Too thin. ${profitDisplay} on a ${holdStr}. The margin (${profitMargin.toFixed(1)}%) leaves no room for the unexpected. Negotiate a lower purchase price or reduce rehab scope.`,
    LOSS: `Loss. At current inputs this deal loses ${profitDisplay} before any contingencies. Do not proceed without renegotiating the purchase price or reducing rehab costs.`,
  };

  const plainEnglish = verdictCopy[verdict];

  // ---- Risks ----
  const risks: string[] = [];

  if (!maoMeetsPrice) {
    risks.push(
      `Purchase price ($${purchasePrice.toLocaleString()}) exceeds the 70% rule MAO of $${maxAllowableOffer.toLocaleString()} by $${(purchasePrice - maxAllowableOffer).toLocaleString()}.`
    );
  }
  if (arv > purchasePrice * 1.5) {
    risks.push(
      `ARV ($${arv.toLocaleString()}) is more than 50% above purchase price — verify ARV with recent comparable sales, not just Zestimate.`
    );
  }
  if (rehabCosts > arv * 0.30) {
    risks.push(
      `Rehab budget ($${rehabCosts.toLocaleString()}) exceeds 30% of ARV — high scope projects carry significant cost overrun risk. Add a 15–20% contingency.`
    );
  }
  if (holdingPeriodMonths > 9) {
    risks.push(
      `${holdingPeriodMonths}-month hold is long for a flip. Each additional month adds $${monthlyHold.toLocaleString()} in holding costs.`
    );
  }
  if (financingType === 'hardMoney' && (interestRate ?? 0) > 12) {
    risks.push(
      `Hard money rate of ${interestRate}% is above the 2026 national average of 8.5–11.2% (Stormfield Capital). Explore DSCR or conventional bridge options.`
    );
  }
  if (rehabOverrunScenario.profit < 0) {
    risks.push(
      `A 20% rehab overrun + 1 extra month turns this deal into a loss of ($${Math.abs(rehabOverrunScenario.profit).toLocaleString()}). Contractor bids and scope must be locked before closing.`
    );
  }
  if (extendedHoldScenario.profit < 0) {
    risks.push(
      `A 3-month hold extension with ARV softening 3% turns this deal into a loss of ($${Math.abs(extendedHoldScenario.profit).toLocaleString()}). Have a backup rental exit plan.`
    );
  }
  if (profitMargin < 10 && profitMargin >= 0) {
    risks.push(
      `${profitMargin.toFixed(1)}% profit margin is below the 10% minimum most experienced flippers require as a safety cushion.`
    );
  }
  if (input.rehabTimeline > input.holdingPeriodMonths) {
    risks.push(
      `Rehab timeline (${input.rehabTimeline} months) exceeds total hold period (${holdingPeriodMonths} months) — the property would still be under construction at the planned sale date.`
    );
  }

  return {
    arv,
    totalProjectCost,
    expectedProfit: Math.round(expectedProfit),
    profitMargin,
    roi,
    annualizedROI,
    cashOnCash,
    maxAllowableOffer,
    maoMeetsPrice,
    actualPctOfARV,
    acquisitionCosts,
    rehabCosts,
    holdingCosts,
    financingCosts,
    sellingCosts,
    totalCosts: totalProjectCost,
    breakEvenARV,
    rehabOverrunBuffer,
    maxAdditionalHoldingMonths,
    scenarios: {
      base: {
        label: 'Base case',
        rehabCosts,
        holdingPeriodMonths,
        salePrice: arv,
        profit: baseSale.profit,
        profitMargin: baseSale.profitMargin,
        verdict: deriveVerdict(baseSale.profitMargin, roi, maoMeetsPrice, maoShortfallPct),
      },
      rehabOverrun: {
        label: 'Rehab overrun +20%, +1 month',
        rehabCosts: rehabOverrunAmount,
        holdingPeriodMonths: rehabOverrunHold,
        salePrice: arv,
        profit: rehabOverrunScenario.profit,
        profitMargin: rehabOverrunScenario.profitMargin,
        verdict: deriveVerdict(
          rehabOverrunScenario.profitMargin,
          // approximate ROI for scenario (not recalculated in full — indicative)
          totalCashInvested > 0
            ? (rehabOverrunScenario.profit / totalCashInvested) * 100
            : 0,
          maoMeetsPrice,
          maoShortfallPct
        ),
      },
      extendedHold: {
        label: 'Extended hold +3 months, ARV −3%',
        rehabCosts,
        holdingPeriodMonths: extendedHoldMonths,
        salePrice: extendedHoldARV,
        profit: extendedHoldScenario.profit,
        profitMargin: extendedHoldScenario.profitMargin,
        verdict: deriveVerdict(
          extendedHoldScenario.profitMargin,
          totalCashInvested > 0
            ? (extendedHoldScenario.profit / totalCashInvested) * 100
            : 0,
          maoMeetsPrice,
          maoShortfallPct
        ),
      },
    },
    verdict,
    plainEnglish,
    risks,
    holdingPeriodMonths,
    totalCashInvested: Math.round(totalCashInvested),
    cashOutOfPocket: Math.round(cashOutOfPocket),
  };
}
