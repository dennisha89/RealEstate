export interface PropertyData {
  address: string;
  estimatedValue: number;
  estimatedRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt?: number;
  propertyType?: string;
}

export interface FinancialInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
}

export interface CalculatedMetrics {
  monthlyMortgage: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  /** Expense rates actually used — enables source attribution in the UI */
  expenseRatesUsed: ExpenseRates;
}

export function calculateMortgagePayment(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number = 30
): number {
  if (principal <= 0) return 0;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;

  if (monthlyRate === 0) {
    return Math.round(principal / numPayments);
  }

  const payment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return Math.round(payment);
}

/**
 * Expense rate inputs that replace the old hardcoded defaults.
 * Sourced from Census ACS 5-Year via /api/market/expenses?zip=XXXXX.
 * Each field has a confidence level and source for transparency.
 */
export interface ExpenseRates {
  /**
   * Annual effective property tax rate as a decimal (e.g., 0.0182 = 1.82%).
   * Source: Census ACS B25103_001E / B25077_001E.
   * Fallback: state average → 0.009 national average.
   */
  propertyTaxRate: number;
  /**
   * Rental vacancy rate as a decimal (e.g., 0.065 = 6.5%).
   * Source: Census ACS B25004_002E, B25004_003E, B25003_003E.
   * Fallback: 0.058 national average.
   */
  vacancyRate: number;
  /**
   * Property management fee as a decimal (e.g., 0.09 = 9% of gross rent).
   * Source: MGMT_FEE_BY_STATE lookup keyed to the ZIP's state.
   * Fallback: 0.085 national average.
   */
  managementFeeRate: number;
  /** Data quality: "high" = ZIP-level, "medium" = state fallback, "low" = national */
  confidence: "high" | "medium" | "low";
  /** Source attribution for audit trail */
  source: string;
}

/**
 * Default expense rates used when Census data is unavailable.
 * These are national averages, not property-specific.
 * Always prefer passing real rates from /api/market/expenses.
 */
export const DEFAULT_EXPENSE_RATES: ExpenseRates = {
  propertyTaxRate: 0.009,   // 0.90% — national avg, NAHB/Census 2023
  vacancyRate: 0.058,       // 5.8% — national avg, Census ACS 2022
  managementFeeRate: 0.085, // 8.5% — national avg, NARPM 2024
  confidence: "low",
  source: "national_average",
};

export function calculateMonthlyExpenses(
  purchasePrice: number,
  monthlyRent: number,
  /**
   * Real expense rates from Census ACS via /api/market/expenses.
   * Pass DEFAULT_EXPENSE_RATES when no ZIP data is available.
   * The old signature (propertyTaxRate: number) is preserved for
   * backward compatibility: if a raw number is passed, it is used
   * as the tax rate with the default vacancy and management fee.
   */
  expenseRatesOrTaxRate: ExpenseRates | number = DEFAULT_EXPENSE_RATES
): {
  propertyTax: number;
  insurance: number;
  propertyManagement: number;
  maintenance: number;
  capex: number;
  vacancy: number;
  total: number;
  /** Rates actually used — enables UI to show source attribution */
  ratesUsed: ExpenseRates;
} {
  // Backward-compat: if caller passed a raw number, wrap it
  const rates: ExpenseRates =
    typeof expenseRatesOrTaxRate === "number"
      ? {
          propertyTaxRate: expenseRatesOrTaxRate,
          vacancyRate: DEFAULT_EXPENSE_RATES.vacancyRate,
          managementFeeRate: DEFAULT_EXPENSE_RATES.managementFeeRate,
          confidence: "low",
          source: "caller_provided",
        }
      : expenseRatesOrTaxRate;

  // Property tax (annual / 12)
  const propertyTax = Math.round((purchasePrice * rates.propertyTaxRate) / 12);

  // Insurance (0.7% of home value annually — industry standard)
  const insurance = Math.round((purchasePrice * 0.007) / 12);

  // Property management (% of gross rent — state-sourced)
  const propertyManagement = Math.round(monthlyRent * rates.managementFeeRate);

  // Maintenance & repairs (1% of home value annually)
  const maintenance = Math.round((purchasePrice * 0.01) / 12);

  // CapEx reserves (1% of home value annually)
  const capex = Math.round((purchasePrice * 0.01) / 12);

  // Vacancy (% of gross rent — ZIP-sourced from Census ACS)
  const vacancy = Math.round(monthlyRent * rates.vacancyRate);

  const total =
    propertyTax +
    insurance +
    propertyManagement +
    maintenance +
    capex +
    vacancy;

  return {
    propertyTax,
    insurance,
    propertyManagement,
    maintenance,
    capex,
    vacancy,
    total,
    ratesUsed: rates,
  };
}

export function calculateMetrics(
  propertyData: PropertyData,
  financialInputs: FinancialInputs,
  /**
   * Real expense rates from Census ACS.
   * Defaults to national averages when not provided.
   * Pass rates fetched from /api/market/expenses?zip=XXXXX for accurate results.
   */
  expenseRates: ExpenseRates = DEFAULT_EXPENSE_RATES
): CalculatedMetrics {
  const { estimatedValue, estimatedRent } = propertyData;
  const { purchasePrice, downPaymentPercent, interestRate } = financialInputs;

  // Use purchase price if provided, otherwise use estimated value
  const price = purchasePrice || estimatedValue;

  // Calculate down payment and loan amount
  const downPayment = price * (downPaymentPercent / 100);
  const loanAmount = price - downPayment;

  // Calculate monthly mortgage payment
  const monthlyMortgage = calculateMortgagePayment(loanAmount, interestRate);

  // Calculate monthly expenses using real rates
  const expenses = calculateMonthlyExpenses(price, estimatedRent, expenseRates);

  // Total monthly expenses (including mortgage)
  const totalMonthlyExpenses = expenses.total;

  // Monthly cash flow
  const monthlyCashFlow = estimatedRent - monthlyMortgage - totalMonthlyExpenses;

  // Annual metrics
  const annualRent = estimatedRent * 12;
  const annualExpenses = totalMonthlyExpenses * 12;
  const annualCashFlow = monthlyCashFlow * 12;

  // NOI = Net Operating Income (rent minus operating expenses, EXCLUDES debt service)
  // This is the industry-standard definition per CBRE, NAR, and Investopedia
  const annualNOI = annualRent - annualExpenses;

  // Cap rate = NOI / Property Value (unlevered return metric)
  const capRate = price > 0 ? (annualNOI / price) * 100 : 0;

  // Cash-on-cash return = Annual Cash Flow / Total Equity Invested * 100
  // Total equity includes down payment + estimated closing costs (3% of price)
  // Source: CFA Level II "equity dividend rate" — uses total cash invested, not just down payment
  const estimatedClosingCosts = price * 0.03;
  const cashInvested = downPayment + estimatedClosingCosts;
  const cashOnCashReturn = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;

  return {
    monthlyMortgage,
    monthlyExpenses: totalMonthlyExpenses,
    monthlyCashFlow,
    capRate,
    cashOnCashReturn,
    expenseRatesUsed: expenses.ratesUsed,
  };
}

export interface ScoringFactors {
  cashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  priceVsValue: number; // purchase price vs estimated value
}

export function calculateAIScore(factors: ScoringFactors): {
  score: number;
  recommendation: "STRONG BUY" | "BUY" | "HOLD" | "PASS";
  explanation: {
    positives: string[];
    negatives: string[];
  };
} {
  let score = 50; // Baseline
  const positives: string[] = [];
  const negatives: string[] = [];

  // Cash flow scoring (most important)
  if (factors.cashFlow > 500) {
    score += 30;
    positives.push(`Strong cash flow: $${factors.cashFlow.toLocaleString()}/month`);
  } else if (factors.cashFlow > 300) {
    score += 20;
    positives.push(`Good cash flow: $${factors.cashFlow.toLocaleString()}/month`);
  } else if (factors.cashFlow > 100) {
    score += 10;
    positives.push(`Positive cash flow: $${factors.cashFlow.toLocaleString()}/month`);
  } else if (factors.cashFlow > 0) {
    score += 5;
    positives.push(`Minimal cash flow: $${factors.cashFlow.toLocaleString()}/month`);
  } else {
    score -= 20;
    negatives.push(`Negative cash flow: $${factors.cashFlow.toLocaleString()}/month`);
  }

  // Cap rate scoring
  if (factors.capRate > 8) {
    score += 15;
    positives.push(`Excellent cap rate: ${factors.capRate.toFixed(2)}%`);
  } else if (factors.capRate > 6) {
    score += 10;
    positives.push(`Good cap rate: ${factors.capRate.toFixed(2)}%`);
  } else if (factors.capRate > 4) {
    score += 5;
    positives.push(`Acceptable cap rate: ${factors.capRate.toFixed(2)}%`);
  } else {
    score -= 5;
    negatives.push(`Low cap rate: ${factors.capRate.toFixed(2)}%`);
  }

  // Cash-on-cash return scoring
  if (factors.cashOnCashReturn > 10) {
    score += 10;
    positives.push(`Strong CoC return: ${factors.cashOnCashReturn.toFixed(2)}%`);
  } else if (factors.cashOnCashReturn > 5) {
    score += 5;
    positives.push(`Good CoC return: ${factors.cashOnCashReturn.toFixed(2)}%`);
  } else if (factors.cashOnCashReturn < 0) {
    score -= 10;
    negatives.push(`Negative CoC return: ${factors.cashOnCashReturn.toFixed(2)}%`);
  }

  // Price vs value scoring
  if (factors.priceVsValue < 0.85) {
    score += 20;
    positives.push("Property priced 15%+ below market value");
  } else if (factors.priceVsValue < 0.95) {
    score += 10;
    positives.push("Property priced 5-15% below market value");
  } else if (factors.priceVsValue > 1.1) {
    score -= 20;
    negatives.push("Property priced 10%+ above market value");
  } else if (factors.priceVsValue > 1.05) {
    score -= 10;
    negatives.push("Property priced 5-10% above market value");
  }

  // Cap score at 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine recommendation
  let recommendation: "STRONG BUY" | "BUY" | "HOLD" | "PASS";
  if (score >= 80) {
    recommendation = "STRONG BUY";
  } else if (score >= 60) {
    recommendation = "BUY";
  } else if (score >= 40) {
    recommendation = "HOLD";
  } else {
    recommendation = "PASS";
  }

  // Add default positive/negative if lists are empty
  if (positives.length === 0) {
    positives.push("Standard market-rate property");
  }
  if (negatives.length === 0) {
    negatives.push("No major concerns identified");
  }

  return {
    score,
    recommendation,
    explanation: {
      positives,
      negatives,
    },
  };
}
