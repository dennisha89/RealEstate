import {
  calculateMortgagePayment,
  calculateMonthlyExpenses,
  calculateMetrics,
  calculateAIScore,
  type PropertyData,
  type FinancialInputs,
  type ScoringFactors,
} from "@/lib/calculator";

// =============================================================================
// calculateMortgagePayment
// =============================================================================

describe("calculateMortgagePayment", () => {
  it("calculates standard 30-year mortgage at 7% correctly", () => {
    // $300,000 loan at 7% for 30 years => ~$1,996/month
    const payment = calculateMortgagePayment(300000, 7, 30);
    expect(payment).toBe(1996);
  });

  it("calculates 15-year mortgage correctly", () => {
    // $300,000 loan at 7% for 15 years => ~$2,696/month
    const payment = calculateMortgagePayment(300000, 7, 15);
    expect(payment).toBe(2696);
  });

  it("calculates 0% interest rate as simple division", () => {
    // $360,000 loan at 0% for 30 years => $1,000/month
    const payment = calculateMortgagePayment(360000, 0, 30);
    expect(payment).toBe(1000);
  });

  it("returns 0 for zero principal", () => {
    expect(calculateMortgagePayment(0, 7)).toBe(0);
  });

  it("returns 0 for negative principal", () => {
    expect(calculateMortgagePayment(-100000, 7)).toBe(0);
  });

  it("defaults to 30-year term when not specified", () => {
    const withDefault = calculateMortgagePayment(300000, 7);
    const explicit30 = calculateMortgagePayment(300000, 7, 30);
    expect(withDefault).toBe(explicit30);
  });

  it("handles very low interest rates", () => {
    const payment = calculateMortgagePayment(300000, 0.5, 30);
    // $300k at 0.5% for 30yr => ~$898/month
    expect(payment).toBe(898);
  });

  it("handles high interest rates", () => {
    const payment = calculateMortgagePayment(300000, 15, 30);
    // $300k at 15% for 30yr => ~$3,793/month
    expect(payment).toBe(3793);
  });
});

// =============================================================================
// calculateMonthlyExpenses
// =============================================================================

describe("calculateMonthlyExpenses", () => {
  it("calculates all expense components for a $400k property renting at $2,500", () => {
    const expenses = calculateMonthlyExpenses(400000, 2500);

    // Property tax: (400000 * 0.0125) / 12 = 416.67 => 417
    expect(expenses.propertyTax).toBe(417);

    // Insurance: (400000 * 0.007) / 12 = 233.33 => 233
    expect(expenses.insurance).toBe(233);

    // Property management: 2500 * 0.1 = 250
    expect(expenses.propertyManagement).toBe(250);

    // Maintenance: (400000 * 0.01) / 12 = 333.33 => 333
    expect(expenses.maintenance).toBe(333);

    // CapEx: (400000 * 0.01) / 12 = 333.33 => 333
    expect(expenses.capex).toBe(333);

    // Vacancy: 2500 * 0.08 = 200
    expect(expenses.vacancy).toBe(200);

    // Total = sum of all components
    expect(expenses.total).toBe(
      expenses.propertyTax +
        expenses.insurance +
        expenses.propertyManagement +
        expenses.maintenance +
        expenses.capex +
        expenses.vacancy
    );
  });

  it("uses default 1.25% tax rate when not specified", () => {
    const expenses = calculateMonthlyExpenses(400000, 2500);
    expect(expenses.propertyTax).toBe(417); // (400000 * 0.0125) / 12
  });

  it("uses custom tax rate when provided", () => {
    const expenses = calculateMonthlyExpenses(400000, 2500, 0.02); // 2% tax rate
    // (400000 * 0.02) / 12 = 666.67 => 667
    expect(expenses.propertyTax).toBe(667);
  });

  it("handles zero purchase price", () => {
    const expenses = calculateMonthlyExpenses(0, 2500);
    expect(expenses.propertyTax).toBe(0);
    expect(expenses.insurance).toBe(0);
    expect(expenses.maintenance).toBe(0);
    expect(expenses.capex).toBe(0);
    // Rent-based expenses still apply
    expect(expenses.propertyManagement).toBe(250);
    expect(expenses.vacancy).toBe(200);
  });

  it("handles zero rent", () => {
    const expenses = calculateMonthlyExpenses(400000, 0);
    expect(expenses.propertyManagement).toBe(0);
    expect(expenses.vacancy).toBe(0);
    // Price-based expenses still apply
    expect(expenses.propertyTax).toBe(417);
  });
});

// =============================================================================
// calculateMetrics
// =============================================================================

describe("calculateMetrics", () => {
  const baseProperty: PropertyData = {
    address: "123 Main St, Austin, TX",
    estimatedValue: 400000,
    estimatedRent: 2500,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
  };

  const baseFinancials: FinancialInputs = {
    purchasePrice: 400000,
    downPaymentPercent: 20,
    interestRate: 7,
  };

  it("calculates mortgage from loan amount (purchase price minus down payment)", () => {
    const metrics = calculateMetrics(baseProperty, baseFinancials);
    // Loan: 400000 * 0.8 = 320000, at 7% for 30yr => ~$2,129/month
    const expectedMortgage = calculateMortgagePayment(320000, 7, 30);
    expect(metrics.monthlyMortgage).toBe(expectedMortgage);
  });

  it("calculates monthly cash flow as rent minus mortgage minus expenses", () => {
    const metrics = calculateMetrics(baseProperty, baseFinancials);
    const expenses = calculateMonthlyExpenses(400000, 2500);
    const expectedCashFlow = 2500 - metrics.monthlyMortgage - expenses.total;
    expect(metrics.monthlyCashFlow).toBe(expectedCashFlow);
  });

  it("calculates cap rate using NOI (excludes mortgage/debt service)", () => {
    const metrics = calculateMetrics(baseProperty, baseFinancials);
    const annualRent = 2500 * 12;
    const expenses = calculateMonthlyExpenses(400000, 2500);
    const annualExpenses = expenses.total * 12;
    // NOI = annual rent - annual operating expenses (NO mortgage)
    const expectedNOI = annualRent - annualExpenses;
    const expectedCapRate = (expectedNOI / 400000) * 100;
    expect(metrics.capRate).toBeCloseTo(expectedCapRate, 2);
  });

  it("cap rate is independent of financing (same regardless of down payment)", () => {
    const metrics20 = calculateMetrics(baseProperty, { ...baseFinancials, downPaymentPercent: 20 });
    const metrics50 = calculateMetrics(baseProperty, { ...baseFinancials, downPaymentPercent: 50 });
    // Cap rate is an unlevered metric - should NOT change with different financing
    expect(metrics20.capRate).toBeCloseTo(metrics50.capRate, 2);
  });

  it("calculates cash-on-cash return correctly (includes closing costs in equity)", () => {
    const metrics = calculateMetrics(baseProperty, baseFinancials);
    const downPayment = 400000 * 0.2; // $80,000
    const closingCosts = 400000 * 0.03; // $12,000 (3% estimate)
    const totalEquity = downPayment + closingCosts; // $92,000
    const annualCashFlow = metrics.monthlyCashFlow * 12;
    const expectedCoC = (annualCashFlow / totalEquity) * 100;
    expect(metrics.cashOnCashReturn).toBeCloseTo(expectedCoC, 2);
  });

  it("uses estimated value when purchase price is 0", () => {
    const metrics = calculateMetrics(baseProperty, { ...baseFinancials, purchasePrice: 0 });
    // Should fall back to estimatedValue ($400,000)
    const expectedMortgage = calculateMortgagePayment(400000 * 0.8, 7, 30);
    expect(metrics.monthlyMortgage).toBe(expectedMortgage);
  });

  it("returns 0 cap rate when price is 0 (avoids division by zero)", () => {
    const zeroPrice: PropertyData = {
      address: "123 Main St",
      estimatedValue: 0,
      estimatedRent: 2000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1500,
    };
    const metrics = calculateMetrics(zeroPrice, {
      purchasePrice: 0,
      downPaymentPercent: 20,
      interestRate: 7,
    });
    expect(metrics.capRate).toBe(0);
  });

  it("calculates cash-on-cash with zero down payment (closing costs still count as equity)", () => {
    const metrics = calculateMetrics(baseProperty, {
      ...baseFinancials,
      downPaymentPercent: 0,
    });
    // With 0% down, total equity = closing costs only (3% of price = $12,000)
    // CoC should NOT be 0 — the investor still has cash invested via closing costs
    const closingCosts = 400000 * 0.03;
    const annualCashFlow = metrics.monthlyCashFlow * 12;
    const expectedCoC = (annualCashFlow / closingCosts) * 100;
    expect(metrics.cashOnCashReturn).toBeCloseTo(expectedCoC, 2);
  });
});

// =============================================================================
// calculateAIScore
// =============================================================================

describe("calculateAIScore", () => {
  it("returns STRONG BUY for excellent metrics", () => {
    const result = calculateAIScore({
      cashFlow: 600,
      capRate: 9,
      cashOnCashReturn: 12,
      priceVsValue: 0.80, // 20% below market
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.recommendation).toBe("STRONG BUY");
    expect(result.explanation.positives.length).toBeGreaterThan(0);
  });

  it("returns BUY for good metrics", () => {
    // Base 50 + 10 (cashFlow>100) + 5 (capRate>4) + 5 (CoC>5) + 0 = 70
    const result = calculateAIScore({
      cashFlow: 150,
      capRate: 5,
      cashOnCashReturn: 6,
      priceVsValue: 1.0,
    });
    expect(result.score).toBe(70);
    expect(result.recommendation).toBe("BUY");
  });

  it("returns HOLD for mediocre metrics", () => {
    // Base 50 + 5 (cashFlow>0) - 5 (capRate<=4) + 0 + 0 = 50
    const result = calculateAIScore({
      cashFlow: 50,
      capRate: 3.5,
      cashOnCashReturn: 2,
      priceVsValue: 1.0,
    });
    expect(result.score).toBe(50);
    expect(result.recommendation).toBe("HOLD");
  });

  it("returns PASS for poor metrics", () => {
    const result = calculateAIScore({
      cashFlow: -200,
      capRate: 3,
      cashOnCashReturn: -5,
      priceVsValue: 1.15,
    });
    expect(result.score).toBeLessThan(40);
    expect(result.recommendation).toBe("PASS");
    expect(result.explanation.negatives.length).toBeGreaterThan(0);
  });

  it("caps score at 100", () => {
    const result = calculateAIScore({
      cashFlow: 1000,
      capRate: 15,
      cashOnCashReturn: 20,
      priceVsValue: 0.70,
    });
    expect(result.score).toBe(100);
  });

  it("caps score at 0", () => {
    const result = calculateAIScore({
      cashFlow: -1000,
      capRate: 1,
      cashOnCashReturn: -20,
      priceVsValue: 1.50,
    });
    expect(result.score).toBe(0);
  });

  it("starts at baseline 50 and adds/subtracts based on factors", () => {
    // Exactly at thresholds that add nothing
    const result = calculateAIScore({
      cashFlow: 0, // exactly 0 — below all positive thresholds, triggers negative
      capRate: 4, // exactly 4 — hits >4 threshold (+5)
      cashOnCashReturn: 2, // between 0 and 5 — no bonus, no penalty
      priceVsValue: 1.0, // exactly at market — no bonus or penalty
    });
    // Base 50 - 20 (negative cashFlow) - 5 (capRate<=4, since 4 is NOT >4) = 25
    expect(result.score).toBe(25);
  });

  it("includes default positive when no positives generated", () => {
    // All factors at thresholds that only generate negatives
    const result = calculateAIScore({
      cashFlow: -100,
      capRate: 3,
      cashOnCashReturn: -2,
      priceVsValue: 1.06,
    });
    expect(result.explanation.positives).toContain("Standard market-rate property");
  });

  it("includes default negative when no negatives generated", () => {
    const result = calculateAIScore({
      cashFlow: 600,
      capRate: 9,
      cashOnCashReturn: 12,
      priceVsValue: 0.80,
    });
    expect(result.explanation.negatives).toContain("No major concerns identified");
  });

  it("cash flow scoring thresholds are correct", () => {
    // >500 => +30
    const r500 = calculateAIScore({ cashFlow: 501, capRate: 4, cashOnCashReturn: 2, priceVsValue: 1.0 });
    // >300 => +20
    const r300 = calculateAIScore({ cashFlow: 301, capRate: 4, cashOnCashReturn: 2, priceVsValue: 1.0 });
    // >100 => +10
    const r100 = calculateAIScore({ cashFlow: 101, capRate: 4, cashOnCashReturn: 2, priceVsValue: 1.0 });
    // >0 => +5
    const r0 = calculateAIScore({ cashFlow: 1, capRate: 4, cashOnCashReturn: 2, priceVsValue: 1.0 });

    expect(r500.score - r300.score).toBe(10); // +30 vs +20
    expect(r300.score - r100.score).toBe(10); // +20 vs +10
    expect(r100.score - r0.score).toBe(5);   // +10 vs +5
  });

  it("cap rate scoring thresholds are correct", () => {
    // >8 => +15, >6 => +10, >4 => +5, <=4 => -5
    const r8 = calculateAIScore({ cashFlow: 200, capRate: 9, cashOnCashReturn: 2, priceVsValue: 1.0 });
    const r6 = calculateAIScore({ cashFlow: 200, capRate: 7, cashOnCashReturn: 2, priceVsValue: 1.0 });
    const r4 = calculateAIScore({ cashFlow: 200, capRate: 5, cashOnCashReturn: 2, priceVsValue: 1.0 });
    const rLow = calculateAIScore({ cashFlow: 200, capRate: 3, cashOnCashReturn: 2, priceVsValue: 1.0 });

    expect(r8.score - r6.score).toBe(5);   // +15 vs +10
    expect(r6.score - r4.score).toBe(5);   // +10 vs +5
    expect(r4.score - rLow.score).toBe(10); // +5 vs -5
  });

  it("price-vs-value scoring thresholds are correct", () => {
    // <0.85 => +20, <0.95 => +10, >1.05 => -10, >1.10 => -20
    const rDeep = calculateAIScore({ cashFlow: 200, capRate: 5, cashOnCashReturn: 2, priceVsValue: 0.80 });
    const rBelow = calculateAIScore({ cashFlow: 200, capRate: 5, cashOnCashReturn: 2, priceVsValue: 0.90 });
    const rAbove = calculateAIScore({ cashFlow: 200, capRate: 5, cashOnCashReturn: 2, priceVsValue: 1.07 });
    const rWayAbove = calculateAIScore({ cashFlow: 200, capRate: 5, cashOnCashReturn: 2, priceVsValue: 1.15 });

    expect(rDeep.score - rBelow.score).toBe(10);     // +20 vs +10
    expect(rAbove.score - rWayAbove.score).toBe(10);  // -10 vs -20
  });
});
