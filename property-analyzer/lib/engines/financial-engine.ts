// ============================================================
// Dimension 1: Financial Fundamentals Engine (Enhanced)
// ============================================================

import type { FinancialFundamentals, MortgageStressTest, DimensionScore } from "../types/market-intelligence";

interface FinancialInput {
  purchasePrice: number;
  estimatedValue: number;
  monthlyRent: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears?: number;
  propertyTaxRate?: number;
  insuranceRate?: number;
  managementPct?: number;
  maintenancePct?: number;
  capexPct?: number;
  vacancyPct?: number;
}

export function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number = 30
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

export function analyzeFinancials(input: FinancialInput): FinancialFundamentals {
  const {
    purchasePrice,
    monthlyRent,
    downPaymentPct,
    interestRate,
    loanTermYears = 30,
    propertyTaxRate = 0.0125,
    insuranceRate = 0.007,
    managementPct = 0.10,
    maintenancePct = 0.01,
    capexPct = 0.01,
    vacancyPct = 0.08,
  } = input;

  const downPayment = purchasePrice * (downPaymentPct / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyMortgage = calculateMortgagePayment(loanAmount, interestRate, loanTermYears);

  // Monthly expenses
  const propertyTax = Math.round((purchasePrice * propertyTaxRate) / 12);
  const insurance = Math.round((purchasePrice * insuranceRate) / 12);
  const management = Math.round(monthlyRent * managementPct);
  const maintenance = Math.round((purchasePrice * maintenancePct) / 12);
  const capex = Math.round((purchasePrice * capexPct) / 12);
  const vacancy = Math.round(monthlyRent * vacancyPct);

  const totalMonthlyExpenses = propertyTax + insurance + management + maintenance + capex + vacancy;
  const effectiveGrossIncome = monthlyRent * (1 - vacancyPct);

  // Core metrics
  const monthlyCashFlow = monthlyRent - monthlyMortgage - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  const annualNOI = (monthlyRent * 12) - (totalMonthlyExpenses * 12);
  const capRate = (annualNOI / purchasePrice) * 100;

  const cashOnCashReturn = downPayment > 0
    ? (annualCashFlow / downPayment) * 100
    : 0;

  const grossRentMultiplier = purchasePrice / (monthlyRent * 12);

  const annualDebtService = monthlyMortgage * 12;
  const debtServiceCoverageRatio = annualDebtService > 0
    ? annualNOI / annualDebtService
    : Infinity;

  const expenseRatio = totalMonthlyExpenses / (monthlyRent || 1);

  // Break-even occupancy: what occupancy % covers all costs
  const totalMonthlyCosts = monthlyMortgage + propertyTax + insurance + management + maintenance + capex;
  const breakEvenOccupancy = monthlyRent > 0
    ? (totalMonthlyCosts / monthlyRent) * 100
    : 100;

  // Mortgage stress test
  const stressScenarios = [-1, -0.5, 0, 0.5, 1, 1.5, 2].map(delta => {
    const testRate = interestRate + delta;
    const testPayment = calculateMortgagePayment(loanAmount, testRate, loanTermYears);
    return {
      rate: testRate,
      payment: testPayment,
      cashFlow: monthlyRent - testPayment - totalMonthlyExpenses,
    };
  });

  const mortgageStressTest: MortgageStressTest = {
    currentRate: interestRate,
    currentPayment: monthlyMortgage,
    scenarios: stressScenarios,
  };

  return {
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    cashOnCashReturn,
    grossRentMultiplier,
    debtServiceCoverageRatio,
    expenseRatio,
    breakEvenOccupancy,
    mortgageStressTest,
  };
}

export function scoreFinancials(fundamentals: FinancialFundamentals): DimensionScore {
  let score = 50;
  const keyFactors: string[] = [];

  // Cash flow scoring (30 points possible)
  if (fundamentals.monthlyCashFlow > 500) {
    score += 25;
    keyFactors.push(`Strong cash flow: $${fundamentals.monthlyCashFlow}/mo`);
  } else if (fundamentals.monthlyCashFlow > 200) {
    score += 15;
    keyFactors.push(`Positive cash flow: $${fundamentals.monthlyCashFlow}/mo`);
  } else if (fundamentals.monthlyCashFlow > 0) {
    score += 5;
    keyFactors.push(`Thin cash flow: $${fundamentals.monthlyCashFlow}/mo`);
  } else {
    score -= 20;
    keyFactors.push(`Negative cash flow: $${fundamentals.monthlyCashFlow}/mo`);
  }

  // Cap rate scoring (15 points)
  if (fundamentals.capRate > 8) {
    score += 15;
    keyFactors.push(`Excellent cap rate: ${fundamentals.capRate.toFixed(1)}%`);
  } else if (fundamentals.capRate > 6) {
    score += 10;
  } else if (fundamentals.capRate > 4) {
    score += 5;
  } else {
    score -= 10;
    keyFactors.push(`Low cap rate: ${fundamentals.capRate.toFixed(1)}%`);
  }

  // DSCR scoring (10 points)
  if (fundamentals.debtServiceCoverageRatio > 1.5) {
    score += 10;
    keyFactors.push(`Strong DSCR: ${fundamentals.debtServiceCoverageRatio.toFixed(2)}x`);
  } else if (fundamentals.debtServiceCoverageRatio > 1.2) {
    score += 5;
  } else if (fundamentals.debtServiceCoverageRatio < 1.0) {
    score -= 15;
    keyFactors.push(`DSCR below 1.0 - expenses exceed income`);
  }

  // CoC return scoring (10 points)
  if (fundamentals.cashOnCashReturn > 12) {
    score += 10;
    keyFactors.push(`CoC return: ${fundamentals.cashOnCashReturn.toFixed(1)}%`);
  } else if (fundamentals.cashOnCashReturn > 8) {
    score += 5;
  } else if (fundamentals.cashOnCashReturn < 0) {
    score -= 10;
  }

  // Stress test: can it survive +2% rate hike?
  const worstCase = fundamentals.mortgageStressTest.scenarios.find(s =>
    s.rate === fundamentals.mortgageStressTest.currentRate + 2
  );
  if (worstCase && worstCase.cashFlow > 0) {
    score += 5;
    keyFactors.push("Survives +2% rate stress test");
  } else if (worstCase && worstCase.cashFlow < -200) {
    score -= 5;
    keyFactors.push("Vulnerable to rate increases");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.20,
    weightedScore: score * 0.20,
    keyFactors,
    dataCompleteness: 100,
  };
}
