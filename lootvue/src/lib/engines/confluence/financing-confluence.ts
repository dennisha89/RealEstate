/**
 * Financing Confluence Engine — "What's the best financing strategy for THIS deal?"
 * Evaluates conventional, FHA, VA, DSCR, hard money, seller financing.
 */
export interface FinancingInput {
  purchasePrice: number; estimatedRent: number;
  propertyType: "sfr" | "duplex" | "triplex" | "fourplex" | "multifamily";
  creditScore: number; annualIncome: number; existingDebt: number;
  cashAvailable: number; existingProperties: number;
  isVeteran: boolean; isFirstTimeBuyer: boolean;
  conventionalRate: number; fhaRate: number; vaRate: number;
  dscrLoanRate: number; hardMoneyRate: number; propertyCashFlow: number;
}

type LoanType = "conventional" | "fha" | "va" | "dscr" | "hard_money" | "seller_financing";

interface LoanOption {
  type: LoanType; eligible: boolean; reasonIfNot?: string;
  downPayment: number; downPaymentPct: number; monthlyPayment: number;
  rate: number; pmi: number; totalMonthlyHousingCost: number;
  monthlyCashFlowAfterDebt: number; cashOnCashReturn: number; dscr: number;
  cashNeeded: number; cashRemaining: number; pros: string[]; cons: string[];
}

export interface FinancingResult {
  confluenceScore: number; bestOption: LoanOption; allOptions: LoanOption[];
  verdict: "EXCELLENT_TERMS" | "GOOD_OPTIONS" | "LIMITED" | "CHALLENGING" | "CASH_ONLY";
  bestCashFlow: LoanOption; bestReturn: LoanOption; lowestCashNeeded: LoanOption;
  leverageAnalysis: string; cashReserveWarning?: string;
  scalabilityNote: string; thesis: string; recommendation: string;
}

function calcPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function buildOption(
  type: LoanOption["type"], i: FinancingInput, rate: number,
  dpPct: number, termYears: number, pmiMonthly: number,
  closingCostPct: number, pros: string[], cons: string[],
): LoanOption {
  const dp = Math.round(i.purchasePrice * dpPct);
  const loan = i.purchasePrice - dp;
  const monthly = calcPayment(loan, rate, termYears);
  const closing = Math.round(i.purchasePrice * closingCostPct);
  const totalHousing = monthly + pmiMonthly;
  const cf = i.propertyCashFlow - totalHousing;
  const totalCash = dp + closing;
  const coc = totalCash > 0 ? (cf * 12) / totalCash * 100 : 0;
  const dscr = totalHousing > 0 ? i.propertyCashFlow / totalHousing : Infinity;
  return {
    type, eligible: true, downPayment: dp, downPaymentPct: dpPct * 100,
    monthlyPayment: monthly, rate, pmi: pmiMonthly,
    totalMonthlyHousingCost: totalHousing, monthlyCashFlowAfterDebt: cf,
    cashOnCashReturn: Math.round(coc * 100) / 100, dscr: Math.round(dscr * 100) / 100,
    cashNeeded: totalCash, cashRemaining: i.cashAvailable - totalCash, pros, cons,
  };
}

function ineligible(type: LoanOption["type"], reason: string): LoanOption {
  return {
    type, eligible: false, reasonIfNot: reason, downPayment: 0, downPaymentPct: 0,
    monthlyPayment: 0, rate: 0, pmi: 0, totalMonthlyHousingCost: 0,
    monthlyCashFlowAfterDebt: 0, cashOnCashReturn: 0, dscr: 0,
    cashNeeded: 0, cashRemaining: 0, pros: [], cons: [],
  };
}

function evaluateConventional(i: FinancingInput): LoanOption {
  const dti = (i.existingDebt * 12) / i.annualIncome;
  if (i.creditScore < 620) return ineligible("conventional", "Credit score below 620");
  if (dti > 0.45) return ineligible("conventional", `DTI ${(dti * 100).toFixed(0)}% exceeds 45% limit`);
  if (i.existingProperties >= 10) return ineligible("conventional", "Exceeds 10 financed property limit");
  const dpPct = i.creditScore >= 740 ? 0.20 : 0.25;
  const pmi = dpPct < 0.20 ? Math.round(i.purchasePrice * 0.005 / 12) : 0;
  return buildOption("conventional", i, i.conventionalRate, dpPct, 30, pmi, 0.03,
    ["Lowest rate available", "No prepayment penalty", "Up to 10 properties"],
    [dpPct > 0.20 ? "25% down required at this credit tier" : "20% down required", "Income verification required"]);
}

function evaluateFHA(i: FinancingInput): LoanOption {
  const dti = (i.existingDebt * 12) / i.annualIncome;
  if (i.creditScore < 580) return ineligible("fha", "Credit score below 580");
  if (dti > 0.43) return ineligible("fha", `DTI ${(dti * 100).toFixed(0)}% exceeds 43% limit`);
  const isSmallMulti = ["duplex", "triplex", "fourplex"].includes(i.propertyType);
  if (i.propertyType === "multifamily") return ineligible("fha", "FHA limited to 1-4 units");
  if (!i.isFirstTimeBuyer && !isSmallMulti) return ineligible("fha", "FHA best suited for primary residence / first-time buyer");
  const dpPct = i.creditScore >= 580 ? 0.035 : 0.10;
  const mip = Math.round(i.purchasePrice * (1 - dpPct) * 0.0085 / 12);
  return buildOption("fha", i, i.fhaRate, dpPct, 30, mip, 0.035,
    ["Only 3.5% down", "Lower credit requirements", "House-hack 2-4 units"],
    ["Permanent MIP on 30yr loans", "Must be primary residence", "Loan limits apply"]);
}

function evaluateVA(i: FinancingInput): LoanOption {
  if (!i.isVeteran) return ineligible("va", "Must be veteran or active-duty military");
  if (i.propertyType === "multifamily") return ineligible("va", "VA limited to 1-4 units");
  const fundingFee = i.existingProperties === 0 ? 0.023 : 0.036;
  return buildOption("va", i, i.vaRate, 0, 30, 0, fundingFee,
    ["0% down payment", "No PMI", "Competitive rates", "No DTI hard cap"],
    ["Primary residence only", "Funding fee applies", "Single use unless prior loan paid off"]);
}

function evaluateDSCR(i: FinancingInput): LoanOption {
  if (i.creditScore < 680) return ineligible("dscr", "Credit score below 680 for DSCR loans");
  const dpPct = i.creditScore >= 720 ? 0.20 : 0.25;
  const opt = buildOption("dscr", i, i.dscrLoanRate, dpPct, 30, 0, 0.03,
    ["No income verification", "Unlimited properties", "Scales portfolio without DTI limits"],
    ["Higher rate than conventional", `${(dpPct * 100).toFixed(0)}% down required`, "DSCR >= 1.0 required"]);
  if (opt.dscr < 1.0) return ineligible("dscr", `DSCR ${opt.dscr.toFixed(2)} is below 1.0 minimum`);
  return opt;
}

function evaluateHardMoney(i: FinancingInput): LoanOption {
  return buildOption("hard_money", i, i.hardMoneyRate, 0.25, 2, 0, 0.04,
    ["Fast close (7-14 days)", "Any credit accepted", "Bridge/flip financing"],
    ["Very high rate (10-14%)", "Short term (12-24mo)", "25-30% down", "Must refinance or sell quickly"]);
}

function evaluateSellerFinancing(i: FinancingInput): LoanOption {
  const rate = i.conventionalRate + 1.0;
  return buildOption("seller_financing", i, rate, 0.10, 20, 0, 0.01,
    ["Negotiable terms", "No bank qualification", "Low closing costs", "10% down possible"],
    ["Seller must agree", "Higher rate than bank", "Shorter term (15-20yr)", "Balloon payment risk"]);
}

export function computeFinancingConfluence(input: FinancingInput): FinancingResult {
  const allOptions: LoanOption[] = [
    evaluateConventional(input), evaluateFHA(input), evaluateVA(input),
    evaluateDSCR(input), evaluateHardMoney(input), evaluateSellerFinancing(input),
  ];

  const eligible = allOptions.filter(o => o.eligible);
  const sorted = [...eligible].sort((a, b) => b.cashOnCashReturn - a.cashOnCashReturn);
  const bestOption = (sorted[0] ?? allOptions[0])!;
  const bestCashFlow = eligible.reduce((best, o) => o.monthlyCashFlowAfterDebt > best.monthlyCashFlowAfterDebt ? o : best, (eligible[0] ?? allOptions[0])!);
  const bestReturn = (sorted[0] ?? allOptions[0])!;
  const lowestCashNeeded = eligible.reduce((best, o) => o.cashNeeded < best.cashNeeded && o.cashNeeded > 0 ? o : best, (eligible[0] ?? allOptions[0])!);

  // Score: eligible options, best CoC, cash remaining
  const eligibleScore = clamp(eligible.length / 5 * 40, 0, 40);
  const cocScore = clamp(bestOption.cashOnCashReturn / 15 * 35, 0, 35);
  const reserveScore = bestOption.cashRemaining > 0
    ? clamp(bestOption.cashRemaining / (input.estimatedRent * 6) * 25, 0, 25)
    : 0;
  const confluenceScore = Math.round(clamp(eligibleScore + cocScore + reserveScore, 0, 100));

  const verdict: FinancingResult["verdict"] =
    confluenceScore >= 80 ? "EXCELLENT_TERMS" : confluenceScore >= 60 ? "GOOD_OPTIONS" :
    confluenceScore >= 40 ? "LIMITED" : eligible.length > 0 ? "CHALLENGING" : "CASH_ONLY";

  const sixMonthReserve = input.estimatedRent * 6;
  const cashReserveWarning = bestOption.eligible && bestOption.cashRemaining < sixMonthReserve
    ? `After closing, you'd have only $${bestOption.cashRemaining.toLocaleString()} — below the recommended 6-month reserve of $${sixMonthReserve.toLocaleString()}`
    : undefined;

  const conv = allOptions.find(o => o.type === "conventional" && o.eligible);
  const dscr = allOptions.find(o => o.type === "dscr" && o.eligible);
  const leverageAnalysis = conv && dscr
    ? `Conventional at ${conv.downPaymentPct.toFixed(0)}% down produces ${conv.cashOnCashReturn.toFixed(1)}% CoC vs DSCR at ${dscr.downPaymentPct.toFixed(0)}% down at ${dscr.cashOnCashReturn.toFixed(1)}% CoC`
    : `Best available option (${bestOption.type.replace(/_/g, " ")}) at ${bestOption.downPaymentPct.toFixed(0)}% down yields ${bestOption.cashOnCashReturn.toFixed(1)}% CoC return`;

  const scalabilityNote = dscr?.eligible
    ? "DSCR loans don't count against personal DTI — scales to unlimited properties"
    : input.existingProperties >= 8
      ? "Approaching conventional loan limit (10). Consider DSCR for future acquisitions"
      : `${10 - input.existingProperties} conventional loan slots remaining before needing DSCR`;

  const thesis = eligible.length === 0
    ? "No standard financing options available. Consider cash purchase, seller financing, or improving credit/DTI."
    : `${verdict.replace(/_/g, " ")} (${confluenceScore}/100). ${eligible.length} eligible loan types. Best: ${bestOption.type.replace(/_/g, " ")} at ${bestOption.rate.toFixed(2)}% with ${bestOption.cashOnCashReturn.toFixed(1)}% CoC return.`;

  const recommendation = bestOption.eligible
    ? `Use ${bestOption.type.replace(/_/g, " ")} — ${bestOption.downPaymentPct.toFixed(0)}% down ($${bestOption.downPayment.toLocaleString()}), $${bestOption.monthlyPayment.toLocaleString()}/mo, netting $${bestOption.monthlyCashFlowAfterDebt.toLocaleString()}/mo cash flow.`
    : "Improve qualifying factors (credit, DTI, cash reserves) before pursuing this deal.";

  return {
    confluenceScore, bestOption, allOptions, verdict,
    bestCashFlow, bestReturn, lowestCashNeeded,
    leverageAnalysis, cashReserveWarning, scalabilityNote,
    thesis, recommendation,
  };
}
