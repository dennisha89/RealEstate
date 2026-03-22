/**
 * Deal Structure Engine — Compare Every Way to Acquire a Property
 *
 * Generates side-by-side comparison of 10 acquisition structures so the
 * investor can see which path gives the best risk-adjusted return for
 * their specific deal.
 *
 * All monetary values in whole dollars (not cents), matching dcf-engine.ts
 * and brrrr-calculator-engine.ts convention. UI layer formats with
 * Intl.NumberFormat.
 *
 * Mortgage formula: P * r(1+r)^n / ((1+r)^n - 1)
 * where r = annualRate / 100 / 12, n = termYears * 12
 * Source: standard amortization; verified against financial-engine.ts
 *
 * Rate assumptions as of March 2026:
 *   Conventional investment: ~7.00% (Freddie Mac PMMS + inv. spread)
 *   FHA 30yr: ~6.25% (HUD/Bankrate March 2026)
 *   DSCR: 7.50% midpoint (Defy Mortgage / Home Abroad 2026 survey)
 *   Hard money: 11% (North Coast Financial / GELT 2026 guide)
 *   HELOC: 8.50% conservative (Bankrate national avg 7.17%, padded)
 *   Seller financing: 6.50% (negotiable, no standard)
 */

// ============================================================
// Types
// ============================================================

export interface DealStructureInput {
  purchasePrice: number;
  monthlyRent: number;
  vacancyPct: number;
  managementPct: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  appreciationPct: number;
  holdPeriodYears: number;
  exitCapRate: number;
  existingLoanBalance?: number;
  existingLoanRate?: number;
  existingLoanPayment?: number;
  rehabBudget?: number;
  afterRepairValue?: number;
  isOwnerOccupied?: boolean;
}

export interface StructureResult {
  id: string;
  name: string;
  cashAtClosing: number;
  monthlyPayment: number;
  monthlyNOI: number;
  monthlyCashFlow: number;
  annualCashOnCash: number;
  dscr: number;
  totalCostOverHold: number;
  riskLevel: 'low' | 'medium' | 'high';
  qualified: boolean;
  disqualifyReason?: string;
  plainEnglish: string;
  details: Record<string, number | string>;
}

// ============================================================
// Defaults
// ============================================================

const DEFAULTS = {
  vacancyPct: 5,
  managementPct: 10,
  propertyTaxRate: 1.25,
  insuranceAnnual: 2400,
  appreciationPct: 3,
  holdPeriodYears: 5,
  exitCapRate: 6.5,
} as const;

// ============================================================
// Helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/**
 * Standard amortizing P&I payment.
 * Handles r=0 edge case (interest-free loan).
 */
function calcPI(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/**
 * Interest-only monthly payment.
 */
function calcIO(principal: number, annualRatePct: number): number {
  if (principal <= 0 || annualRatePct <= 0) return 0;
  return Math.round(principal * (annualRatePct / 100) / 12);
}

/**
 * Compute monthly NOI (before debt service).
 * NOI = effective rent - opex (tax + insurance + management + vacancy reserve)
 */
function calcMonthlyNOI(
  monthlyRent: number,
  purchasePrice: number,
  vacancyPct: number,
  managementPct: number,
  propertyTaxRate: number,
  insuranceAnnual: number,
): number {
  const effectiveRent = Math.round(monthlyRent * (1 - vacancyPct / 100));
  const monthlyTax = Math.round(purchasePrice * (propertyTaxRate / 100) / 12);
  const monthlyInsurance = Math.round(insuranceAnnual / 12);
  const monthlyMgmt = Math.round(effectiveRent * (managementPct / 100));
  return effectiveRent - monthlyTax - monthlyInsurance - monthlyMgmt;
}

/**
 * Remaining loan balance after N months of amortization.
 * Used for balloon balance calculation.
 */
function loanBalanceAfterMonths(
  principal: number,
  annualRatePct: number,
  amortYears: number,
  months: number,
): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return Math.max(0, principal - (principal / n) * months);
  const factor = Math.pow(1 + r, n);
  const payment = principal * (r * factor) / (factor - 1);
  let balance = principal;
  for (let m = 0; m < months && balance > 0.01; m++) {
    const interest = balance * r;
    balance = Math.max(0, balance - (payment - interest));
  }
  return Math.round(balance);
}

/**
 * Total cost over hold period: cash at closing + sum of monthly payments.
 */
function totalCost(cashAtClosing: number, monthlyPayment: number, holdYears: number): number {
  return Math.round(cashAtClosing + monthlyPayment * holdYears * 12);
}

/**
 * Build a single StructureResult.
 * Cash-on-cash = annual cash flow / cash at closing.
 * DSCR = annual NOI / annual debt service.
 */
function buildResult(params: {
  id: string;
  name: string;
  cashAtClosing: number;
  monthlyPayment: number;
  monthlyNOI: number;
  holdYears: number;
  riskLevel: 'low' | 'medium' | 'high';
  qualified: boolean;
  disqualifyReason?: string;
  plainEnglish: string;
  details: Record<string, number | string>;
}): StructureResult {
  const monthlyCashFlow = params.monthlyNOI - params.monthlyPayment;
  const annualCF = monthlyCashFlow * 12;
  const annualCashOnCash = params.cashAtClosing > 0
    ? round2((annualCF / params.cashAtClosing) * 100)
    : annualCF > 0 ? Infinity : 0;

  const annualDebtService = params.monthlyPayment * 12;
  const annualNOI = params.monthlyNOI * 12;
  const dscr = annualDebtService > 0 ? round2(annualNOI / annualDebtService) : Infinity;

  return {
    id: params.id,
    name: params.name,
    cashAtClosing: Math.round(params.cashAtClosing),
    monthlyPayment: Math.round(params.monthlyPayment),
    monthlyNOI: Math.round(params.monthlyNOI),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualCashOnCash,
    dscr,
    totalCostOverHold: totalCost(params.cashAtClosing, params.monthlyPayment, params.holdYears),
    riskLevel: params.riskLevel,
    qualified: params.qualified,
    disqualifyReason: params.disqualifyReason,
    plainEnglish: params.plainEnglish,
    details: params.details,
  };
}

// ============================================================
// Structure Calculators
// ============================================================

function conventional20(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice, holdPeriodYears } = input;
  const rate = 7.0;
  const downPct = 20;
  const closingPct = 3;
  const down = Math.round(purchasePrice * downPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);
  const loanAmount = purchasePrice - down;
  const pi = calcPI(loanAmount, rate, 30);

  return buildResult({
    id: 'conventional-20',
    name: 'Conventional 20% Down',
    cashAtClosing: down + closing,
    monthlyPayment: pi,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'low',
    qualified: true,
    plainEnglish: `Put ${fmt.format(down)} down, borrow at ${rate}% fixed for 30 years with no PMI.`,
    details: {
      downPayment: down,
      loanAmount,
      interestRate: `${rate}%`,
      closingCosts: closing,
      term: '30yr fixed',
    },
  });
}

function fhaHouseHack(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice, holdPeriodYears, isOwnerOccupied } = input;
  const qualified = isOwnerOccupied === true;
  const rate = 6.25;
  const downPct = 3.5;
  const closingPct = 3;
  const down = Math.round(purchasePrice * downPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);

  // UFMIP: 1.75% of base loan, rolled into loan balance (HUD 2026)
  const baseLoan = purchasePrice - down;
  const ufmip = Math.round(baseLoan * 1.75 / 100);
  const loanAmount = baseLoan + ufmip;

  const pi = calcPI(loanAmount, rate, 30);

  // Annual MIP: 0.55% of loan balance for >15yr term, LTV > 90% (HUD MIP chart 2026)
  // For simplicity, applied on original loan amount (slightly conservative —
  // actual MIP declines with balance, but HUD bases it on original amortization schedule).
  const monthlyMIP = Math.round(loanAmount * 0.55 / 100 / 12);

  const totalMonthly = pi + monthlyMIP;

  return buildResult({
    id: 'fha-3.5',
    name: 'FHA 3.5% Down (House Hack)',
    cashAtClosing: down + closing,
    monthlyPayment: totalMonthly,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'low',
    qualified,
    disqualifyReason: qualified ? undefined : 'FHA requires owner-occupancy — set isOwnerOccupied to true',
    plainEnglish: qualified
      ? `Move in with just ${fmt.format(down)} down. MIP of ${fmt.format(monthlyMIP)}/mo is the cost of low entry.`
      : 'FHA requires you to live in the property. Not available for pure investment.',
    details: {
      downPayment: down,
      baseLoan,
      ufmip,
      loanAmount,
      interestRate: `${rate}%`,
      monthlyMIP,
      annualMIPRate: '0.55%',
      mipDuration: 'Life of loan (LTV > 90%)',
      closingCosts: closing,
      term: '30yr fixed',
    },
  });
}

function dscrLoan(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice, holdPeriodYears } = input;
  const rate = 7.5;
  const downPct = 25;
  const closingPct = 2;
  const pointsPct = 1.5;
  const down = Math.round(purchasePrice * downPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);
  const loanAmount = purchasePrice - down;
  const points = Math.round(loanAmount * pointsPct / 100);
  const pi = calcPI(loanAmount, rate, 30);

  const annualNOI = noi * 12;
  const annualDS = pi * 12;
  const dscrVal = annualDS > 0 ? round2(annualNOI / annualDS) : Infinity;
  const qualified = dscrVal >= 1.0;
  const borderline = dscrVal >= 1.0 && dscrVal < 1.25;

  let plainEnglish = `No income docs needed. ${fmt.format(down)} down at ${rate}%. Lender only cares about rental income.`;
  if (borderline) {
    plainEnglish += ` Warning: DSCR of ${dscrVal.toFixed(2)}x is below the 1.25x most lenders prefer.`;
  }

  return buildResult({
    id: 'dscr-25',
    name: 'DSCR 25% Down',
    cashAtClosing: down + closing + points,
    monthlyPayment: pi,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'medium',
    qualified,
    disqualifyReason: qualified ? undefined : `DSCR of ${dscrVal.toFixed(2)}x is below 1.0 — rental income does not cover debt service`,
    plainEnglish,
    details: {
      downPayment: down,
      loanAmount,
      interestRate: `${rate}%`,
      closingCosts: closing,
      pointsCost: points,
      pointsRate: `${pointsPct}%`,
      calculatedDSCR: dscrVal,
      term: '30yr fixed',
      incomeVerification: 'None',
    },
  });
}

function sellerFinancing(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice, holdPeriodYears } = input;
  const rate = 6.5;
  const downPct = 10;
  const closingPct = 1.5;
  const amortYears = 25;
  const balloonYears = 5;
  const down = Math.round(purchasePrice * downPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);
  const loanAmount = purchasePrice - down;
  const pi = calcPI(loanAmount, rate, amortYears);

  const balloonMonths = balloonYears * 12;
  const balloonBalance = loanBalanceAfterMonths(loanAmount, rate, amortYears, balloonMonths);

  return buildResult({
    id: 'seller-financing',
    name: 'Seller Financing 10% Down',
    cashAtClosing: down + closing,
    monthlyPayment: pi,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'medium',
    qualified: true,
    plainEnglish: `The seller acts as your bank. ${fmt.format(down)} down, ${rate}% over 25 years with a balloon at year ${balloonYears}.`,
    details: {
      downPayment: down,
      loanAmount,
      interestRate: `${rate}%`,
      closingCosts: closing,
      amortization: `${amortYears}yr`,
      balloonAtYear: balloonYears,
      balloonBalance,
      term: `${amortYears}yr amortization, ${balloonYears}yr balloon`,
    },
  });
}

function subjectTo(input: DealStructureInput, noi: number): StructureResult {
  const {
    purchasePrice, holdPeriodYears,
    existingLoanBalance, existingLoanRate, existingLoanPayment,
  } = input;

  const hasData = existingLoanBalance != null
    && existingLoanRate != null
    && existingLoanPayment != null;

  if (!hasData) {
    return buildResult({
      id: 'subject-to',
      name: 'Subject-To (Assume Existing Loan)',
      cashAtClosing: 0,
      monthlyPayment: 0,
      monthlyNOI: noi,
      holdYears: holdPeriodYears,
      riskLevel: 'high',
      qualified: false,
      disqualifyReason: 'Requires existing loan details (balance, rate, payment)',
      plainEnglish: 'Take over the seller\'s existing mortgage without formally refinancing. Needs existing loan info.',
      details: {},
    });
  }

  const balance = existingLoanBalance!;
  const rate = existingLoanRate!;
  const payment = existingLoanPayment!;
  const cashToSeller = Math.max(0, purchasePrice - balance);
  const closingPct = 1;
  const closing = Math.round(purchasePrice * closingPct / 100);

  return buildResult({
    id: 'subject-to',
    name: 'Subject-To (Assume Existing Loan)',
    cashAtClosing: cashToSeller + closing,
    monthlyPayment: payment,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'high',
    qualified: true,
    plainEnglish: `Take over the seller's ${rate}% mortgage. Pay ${fmt.format(cashToSeller)} to the seller for their equity plus ${fmt.format(closing)} closing costs.`,
    details: {
      cashToSeller,
      existingLoanBalance: balance,
      existingLoanRate: `${rate}%`,
      existingLoanPayment: payment,
      closingCosts: closing,
      risk: 'Due-on-sale clause — lender can call the loan',
    },
  });
}

function partnership5050(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice, holdPeriodYears } = input;
  const rate = 7.0;
  const downPct = 20;
  const closingPct = 3;
  const down = Math.round(purchasePrice * downPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);
  const loanAmount = purchasePrice - down;
  const pi = calcPI(loanAmount, rate, 30);

  const totalCash = down + closing;
  const perPartner = Math.round(totalCash / 2);
  const perPartnerCF = Math.round((noi - pi) / 2);
  const annualPerPartnerCF = perPartnerCF * 12;
  const cocPerPartner = perPartner > 0
    ? round2((annualPerPartnerCF / perPartner) * 100)
    : 0;

  return buildResult({
    id: 'partnership-50-50',
    name: 'Partnership 50/50',
    cashAtClosing: perPartner,
    monthlyPayment: Math.round(pi / 2),
    monthlyNOI: Math.round(noi / 2),
    holdYears: holdPeriodYears,
    riskLevel: 'medium',
    qualified: true,
    plainEnglish: `Split everything 50/50 with a partner. Each puts in ${fmt.format(perPartner)} and splits the ${fmt.format(perPartnerCF)}/mo cash flow.`,
    details: {
      totalDownPayment: down,
      perPartnerCash: perPartner,
      loanAmount,
      interestRate: `${rate}%`,
      closingCosts: closing,
      perPartnerMonthlyCF: perPartnerCF,
      perPartnerCoC: `${cocPerPartner}%`,
      term: '30yr fixed',
      structure: '50/50 equity split',
    },
  });
}

function brrrr(input: DealStructureInput, noi: number): StructureResult {
  const {
    purchasePrice, holdPeriodYears,
    rehabBudget, afterRepairValue,
  } = input;

  const hasData = rehabBudget != null && afterRepairValue != null;

  if (!hasData) {
    return buildResult({
      id: 'brrrr',
      name: 'BRRRR',
      cashAtClosing: 0,
      monthlyPayment: 0,
      monthlyNOI: noi,
      holdYears: holdPeriodYears,
      riskLevel: 'high',
      qualified: false,
      disqualifyReason: 'Requires rehabBudget and afterRepairValue',
      plainEnglish: 'Buy, Rehab, Rent, Refinance, Repeat. Needs rehab budget and ARV to analyze.',
      details: {},
    });
  }

  const arv = afterRepairValue!;
  const rehab = rehabBudget!;

  // Phase 1: Hard money acquisition
  const hardMoneyRate = 12;
  const hardMoneyLTV = 90;
  const hardMoneyPoints = 2;
  const hardMoneyLoan = Math.round(purchasePrice * hardMoneyLTV / 100);
  const hardMoneyDown = purchasePrice - hardMoneyLoan;
  const pointsCost = Math.round(hardMoneyLoan * hardMoneyPoints / 100);
  const rehabHoldMonths = 4;
  const monthlyIO = calcIO(hardMoneyLoan, hardMoneyRate);
  const holdingCosts = monthlyIO * rehabHoldMonths;

  // Total cash deployed before refi
  const totalCashIn = hardMoneyDown + pointsCost + rehab + holdingCosts;

  // Phase 2: Refinance at 75% of ARV into conventional
  const refiLTV = 75;
  const refiRate = 7.0;
  const refiLoan = Math.round(arv * refiLTV / 100);
  const refiPI = calcPI(refiLoan, refiRate, 30);

  // Cash back from refi = new loan - hard money payoff
  const cashBack = refiLoan - hardMoneyLoan;
  const netCashInDeal = Math.max(0, totalCashIn - Math.max(0, cashBack));

  const infiniteReturn = cashBack >= totalCashIn;

  let plainEnglish: string;
  if (infiniteReturn) {
    plainEnglish = `Infinite return: all ${fmt.format(totalCashIn)} recycled out after refinance at 75% of ${fmt.format(arv)} ARV.`;
  } else {
    plainEnglish = `Buy distressed at ${fmt.format(purchasePrice)}, rehab for ${fmt.format(rehab)}, refi at ${fmt.format(arv)} ARV. ${fmt.format(netCashInDeal)} left in deal.`;
  }

  return buildResult({
    id: 'brrrr',
    name: 'BRRRR',
    cashAtClosing: netCashInDeal,
    monthlyPayment: refiPI,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'high',
    qualified: true,
    plainEnglish,
    details: {
      hardMoneyLoan,
      hardMoneyRate: `${hardMoneyRate}%`,
      hardMoneyDown,
      pointsCost,
      rehabBudget: rehab,
      rehabHoldMonths,
      holdingCosts,
      totalCashDeployed: totalCashIn,
      afterRepairValue: arv,
      refiLoan,
      refiRate: `${refiRate}%`,
      cashBackFromRefi: Math.max(0, cashBack),
      netCashInDeal,
      infiniteReturn: infiniteReturn ? 'Yes' : 'No',
    },
  });
}

function leaseOption(input: DealStructureInput, _noi: number): StructureResult {
  const { purchasePrice, monthlyRent, holdPeriodYears, appreciationPct } = input;
  const optionFeePct = 3;
  const rentCreditPct = 25;
  const optionFee = Math.round(purchasePrice * optionFeePct / 100);
  const monthlyLease = monthlyRent;
  const monthlyRentCredit = Math.round(monthlyLease * rentCreditPct / 100);
  const totalRentCredits = monthlyRentCredit * holdPeriodYears * 12;

  // Projected value at exercise
  const futureValue = Math.round(
    purchasePrice * Math.pow(1 + appreciationPct / 100, holdPeriodYears)
  );
  const builtInEquity = futureValue - purchasePrice + totalRentCredits;

  // No cash flow — you are the tenant, paying market rent
  // CoC is based on the equity built through credits + appreciation vs option fee
  const annualEquityBuild = Math.round(builtInEquity / holdPeriodYears);
  const coc = optionFee > 0 ? round2((annualEquityBuild / optionFee) * 100) : 0;

  return buildResult({
    id: 'lease-option',
    name: 'Lease Option',
    cashAtClosing: optionFee,
    monthlyPayment: monthlyLease,
    // NOI is zero for a lease option — you are the tenant, not the landlord yet
    monthlyNOI: 0,
    holdYears: holdPeriodYears,
    riskLevel: 'medium',
    qualified: true,
    plainEnglish: `Lock in today's price with just ${fmt.format(optionFee)}. ${rentCreditPct}% of rent goes toward purchase. If the property appreciates, you profit without owning yet.`,
    details: {
      optionFee,
      monthlyLease,
      monthlyRentCredit,
      totalRentCredits,
      projectedValueAtExercise: futureValue,
      builtInEquity,
      appreciationAssumption: `${appreciationPct}%/yr`,
      annualizedEquityReturn: `${coc}%`,
      note: 'No rental cash flow — you are the tenant until exercise',
    },
  });
}

function hardMoneyBridge(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice } = input;
  const rate = 11;
  const downPct = 20;
  const pointsPct = 3;
  const termMonths = 12;
  const closingPct = 2;
  const down = Math.round(purchasePrice * downPct / 100);
  const loanAmount = purchasePrice - down;
  const points = Math.round(loanAmount * pointsPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);
  const monthlyIO = calcIO(loanAmount, rate);

  const totalInterest = monthlyIO * termMonths;
  const totalCostOfCapital = points + totalInterest + closing;

  return buildResult({
    id: 'hard-money',
    name: 'Hard Money (Bridge)',
    cashAtClosing: down + points + closing,
    monthlyPayment: monthlyIO,
    monthlyNOI: noi,
    // Hard money is short-term; use 1yr hold regardless of input
    holdYears: 1,
    riskLevel: 'high',
    qualified: true,
    plainEnglish: `Short-term bridge at ${rate}% interest-only. ${fmt.format(totalCostOfCapital)} total cost of capital over ${termMonths} months. Exit via sale or refi.`,
    details: {
      downPayment: down,
      loanAmount,
      interestRate: `${rate}%`,
      pointsCost: points,
      pointsRate: `${pointsPct}%`,
      closingCosts: closing,
      termMonths,
      monthlyInterestOnly: monthlyIO,
      totalInterestPaid: totalInterest,
      totalCostOfCapital,
      paymentType: 'Interest-only',
      exitStrategy: 'Refinance or sell within 12 months',
    },
  });
}

function helocPlusConventional(input: DealStructureInput, noi: number): StructureResult {
  const { purchasePrice, holdPeriodYears } = input;
  const convRate = 7.0;
  const helocRate = 8.5;
  const downPct = 20;
  const closingPct = 3;
  const down = Math.round(purchasePrice * downPct / 100);
  const closing = Math.round(purchasePrice * closingPct / 100);
  const loanAmount = purchasePrice - down;

  // HELOC covers the entire down payment (interest-only during draw period)
  const helocIO = calcIO(down, helocRate);
  const convPI = calcPI(loanAmount, convRate, 30);
  const totalMonthly = helocIO + convPI;

  const totalHELOCInterest = helocIO * holdPeriodYears * 12;

  return buildResult({
    id: 'heloc-conventional',
    name: 'HELOC + Conventional',
    cashAtClosing: closing,
    monthlyPayment: totalMonthly,
    monthlyNOI: noi,
    holdYears: holdPeriodYears,
    riskLevel: 'high',
    qualified: true,
    plainEnglish: `Zero down payment from your own pocket. HELOC covers the ${fmt.format(down)} down payment. You pay ${fmt.format(totalMonthly)}/mo across two loans.`,
    details: {
      conventionalLoan: loanAmount,
      conventionalRate: `${convRate}%`,
      conventionalPI: convPI,
      helocAmount: down,
      helocRate: `${helocRate}% variable`,
      helocIO,
      totalMonthly,
      closingCosts: closing,
      totalHELOCInterest,
      risk: 'Triple exposure: property value + HELOC rate + primary home equity',
      note: 'HELOC rate is variable and may increase',
    },
  });
}

// ============================================================
// Main Export
// ============================================================

/**
 * Analyze all 10 acquisition structures for a given property.
 *
 * Returns results sorted by annualCashOnCash descending (best return first).
 * Disqualified structures are pushed to the end regardless of CoC.
 *
 * @param rawInput - Property deal parameters (missing fields use conservative defaults)
 * @returns Array of 10 StructureResult objects, sorted by return
 */
export function analyzeAllStructures(rawInput: DealStructureInput): StructureResult[] {
  // Apply defaults
  const input: DealStructureInput = {
    ...rawInput,
    vacancyPct: rawInput.vacancyPct ?? DEFAULTS.vacancyPct,
    managementPct: rawInput.managementPct ?? DEFAULTS.managementPct,
    propertyTaxRate: rawInput.propertyTaxRate ?? DEFAULTS.propertyTaxRate,
    insuranceAnnual: rawInput.insuranceAnnual ?? DEFAULTS.insuranceAnnual,
    appreciationPct: rawInput.appreciationPct ?? DEFAULTS.appreciationPct,
    holdPeriodYears: rawInput.holdPeriodYears ?? DEFAULTS.holdPeriodYears,
    exitCapRate: rawInput.exitCapRate ?? DEFAULTS.exitCapRate,
  };

  if (input.purchasePrice <= 0) {
    throw new RangeError('purchasePrice must be positive');
  }
  if (input.monthlyRent < 0) {
    throw new RangeError('monthlyRent cannot be negative');
  }

  const noi = calcMonthlyNOI(
    input.monthlyRent,
    input.purchasePrice,
    input.vacancyPct,
    input.managementPct,
    input.propertyTaxRate,
    input.insuranceAnnual,
  );

  const results: StructureResult[] = [
    conventional20(input, noi),
    fhaHouseHack(input, noi),
    dscrLoan(input, noi),
    sellerFinancing(input, noi),
    subjectTo(input, noi),
    partnership5050(input, noi),
    brrrr(input, noi),
    leaseOption(input, noi),
    hardMoneyBridge(input, noi),
    helocPlusConventional(input, noi),
  ];

  // Sort: qualified first, then by annualCashOnCash descending
  results.sort((a, b) => {
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;

    // Handle Infinity: treat as very high value
    const cocA = Number.isFinite(a.annualCashOnCash) ? a.annualCashOnCash : 1e9;
    const cocB = Number.isFinite(b.annualCashOnCash) ? b.annualCashOnCash : 1e9;
    return cocB - cocA;
  });

  return results;
}
