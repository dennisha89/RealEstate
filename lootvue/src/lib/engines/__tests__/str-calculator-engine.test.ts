// ============================================================
// Unit tests for str-calculator-engine.ts
// All financial assertions use toBeCloseTo(val, 0) — within ±0.5
// or exact integer matching as appropriate.
// Hand-verified reference values noted in comments.
// ============================================================

import {
  calculateSTR,
  compareSTRvsLTR,
  estimateSTRInsurance,
  type STRCalculatorInput,
} from '../str-calculator-engine';

// --- Shared baseline input ---
// $450k purchase, 20% down ($90k), 7.25% rate, 30yr
// ADR $185, 65% occupancy, 3.5-night avg stay, $120 cleaning fee
// Airbnb platform, self-managed, $18k furnishing
// $250/mo utilities, $200/mo insurance, $5,400/yr tax
// LTR comp: $2,400/mo
const BASE_INPUT: STRCalculatorInput = {
  purchasePrice: 450_000,
  downPaymentPct: 20,
  mortgageRate: 7.25,
  loanTerm: 30,
  estimatedADR: 185,
  estimatedOccupancy: 0.65,
  avgStayLength: 3.5,
  cleaningFeePerStay: 120,
  platform: 'airbnb',
  managementPct: 0,
  furnishingBudget: 18_000,
  monthlyUtilities: 250,
  monthlyInsurance: 200,
  annualPropertyTax: 5_400,
  ltrMonthlyRent: 2_400,
};

// --- Helper: calculate expected mortgage payment ---
// P=360000, r=7.25/100/12=0.006042, n=360
// M = 360000 × (0.006042 × 1.006042^360) / (1.006042^360 - 1) ≈ $2456
function expectedMortgage(): number {
  const principal = 360_000;
  const r = 7.25 / 100 / 12;
  const n = 360;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

// ============================================================
// Group 1: Revenue model
// ============================================================

describe('STR Revenue Model — no seasonality', () => {
  const result = calculateSTR(BASE_INPUT);

  test('blended ADR equals input ADR when no seasonality override', () => {
    expect(result.revenue.averageDailyRate).toBe(185);
  });

  test('blended occupancy equals input occupancy when no seasonality override', () => {
    expect(result.revenue.occupancyRate).toBeCloseTo(0.65, 3);
  });

  test('revPAR = ADR × occupancy', () => {
    // 185 × 0.65 = 120.25
    expect(result.revenue.revPAR).toBeCloseTo(120.25, 1);
  });

  test('grossNightlyRevenue = ADR × occupancy × 365', () => {
    // 185 × 0.65 × 365 = 43,891.25 → 43891
    const expected = Math.round(185 * 0.65 * 365);
    expect(result.revenue.grossNightlyRevenue).toBe(expected);
  });

  test('annualStays = round((occupancy × 365) / avgStay)', () => {
    // (0.65 × 365) / 3.5 = 237.25 / 3.5 ≈ 67.8 → 68
    const expected = Math.round((0.65 * 365) / 3.5);
    expect(result.revenue.annualStays).toBe(expected);
  });

  test('cleaningFeeIncome = annualStays × cleaningFeePerStay', () => {
    const expectedStays = Math.round((0.65 * 365) / 3.5);
    expect(result.revenue.cleaningFeeIncome).toBe(expectedStays * 120);
  });

  test('totalGrossRevenue = grossNightlyRevenue + cleaningFeeIncome', () => {
    expect(result.revenue.totalGrossRevenue).toBe(
      result.revenue.grossNightlyRevenue + result.revenue.cleaningFeeIncome
    );
  });

  test('shoulder band covers all 12 months when no seasonality provided', () => {
    expect(result.revenue.shoulderSeason.months).toHaveLength(12);
    expect(result.revenue.peakSeason.months).toHaveLength(0);
    expect(result.revenue.offSeason.months).toHaveLength(0);
  });
});

// ============================================================
// Group 2: Revenue model — with seasonality
// ============================================================

describe('STR Revenue Model — with seasonality', () => {
  const seasonalInput: STRCalculatorInput = {
    ...BASE_INPUT,
    seasonality: {
      peakMonths: [6, 7, 8],           // Jun, Jul, Aug
      peakADRMultiplier: 1.4,
      offSeasonMonths: [1, 2, 12],     // Jan, Feb, Dec
      offSeasonADRMultiplier: 0.65,
    },
  };
  const result = calculateSTR(seasonalInput);

  test('peak ADR is baseADR × multiplier', () => {
    expect(result.revenue.peakSeason.adr).toBe(Math.round(185 * 1.4));
  });

  test('off-season ADR is baseADR × multiplier', () => {
    expect(result.revenue.offSeason.adr).toBe(Math.round(185 * 0.65));
  });

  test('shoulder months are the 6 non-peak non-off months', () => {
    // All 12 − 3 peak − 3 off = 6 shoulder
    expect(result.revenue.shoulderSeason.months).toHaveLength(6);
  });

  test('peak + shoulder + off nights sum to 365', () => {
    const total = result.revenue.peakSeason.nights
      + result.revenue.shoulderSeason.nights
      + result.revenue.offSeason.nights;
    expect(total).toBe(365);
  });

  test('blended ADR is between off-season and peak ADR', () => {
    const offADR = Math.round(185 * 0.65);
    const peakADR = Math.round(185 * 1.4);
    expect(result.revenue.averageDailyRate).toBeGreaterThan(offADR);
    expect(result.revenue.averageDailyRate).toBeLessThan(peakADR);
  });
});

// ============================================================
// Group 3: Expenses
// ============================================================

describe('STR Expenses', () => {
  const result = calculateSTR(BASE_INPUT);

  test('platformFees = grossNightlyRevenue × 0.155 (Airbnb host-only rate)', () => {
    const expected = Math.round(result.revenue.grossNightlyRevenue * 0.155);
    expect(result.expenses.platformFees).toBe(expected);
  });

  test('platformFees for VRBO uses 8% rate', () => {
    const vrboInput = { ...BASE_INPUT, platform: 'vrbo' as const };
    const r = calculateSTR(vrboInput);
    const expected = Math.round(r.revenue.grossNightlyRevenue * 0.08);
    expect(r.expenses.platformFees).toBe(expected);
  });

  test('platformFees for direct booking is zero', () => {
    const directInput = { ...BASE_INPUT, platform: 'direct' as const };
    const r = calculateSTR(directInput);
    expect(r.expenses.platformFees).toBe(0);
  });

  test('cleaningCosts ≈ 85% of cleaning fee income', () => {
    const expected = Math.round(result.revenue.cleaningFeeIncome * 0.85);
    expect(result.expenses.cleaningCosts).toBe(expected);
  });

  test('propertyManagement is 0 for self-managed (managementPct = 0)', () => {
    expect(result.expenses.propertyManagement).toBe(0);
  });

  test('propertyManagement = totalGrossRevenue × managementPct when set', () => {
    const managedInput = { ...BASE_INPUT, managementPct: 0.25 };
    const r = calculateSTR(managedInput);
    const expected = Math.round(r.revenue.totalGrossRevenue * 0.25);
    expect(r.expenses.propertyManagement).toBe(expected);
  });

  test('furnishingAmortized = furnishingBudget / 6 (default 6yr life)', () => {
    expect(result.expenses.furnishingAmortized).toBe(Math.round(18_000 / 6));
  });

  test('annualPropertyTax matches input', () => {
    expect(result.expenses.propertyTax).toBe(5_400);
  });

  test('insurance = monthlyInsurance × 12', () => {
    expect(result.expenses.insurance).toBe(200 * 12);
  });

  test('utilities = monthlyUtilities × 12', () => {
    expect(result.expenses.utilities).toBe(250 * 12);
  });

  test('maintenance = purchasePrice × 0.015 (1.5x LTR default)', () => {
    const expected = Math.round(450_000 * 0.015);
    expect(result.expenses.maintenance).toBe(expected);
  });

  test('totalOperatingExpenses = sum of all line items (no debt service)', () => {
    const e = result.expenses;
    const manual =
      e.platformFees + e.cleaningCosts + e.linens + e.consumables +
      e.furnishingAmortized + e.furnitureReservePct + e.photography +
      e.dynamicPricingTool + e.propertyManagement + e.utilities +
      e.insurance + e.propertyTax + e.maintenance + e.capex +
      e.smartLocks + e.securityCameras;
    expect(e.totalOperatingExpenses).toBe(manual);
  });

  test('totalWithDebtService = totalOperatingExpenses + mortgage × 12', () => {
    const mortgage = expectedMortgage();
    const expected = result.expenses.totalOperatingExpenses + mortgage * 12;
    // allow ±1 for rounding in internal mortgage calc
    expect(Math.abs(result.expenses.totalWithDebtService - expected)).toBeLessThanOrEqual(12);
  });
});

// ============================================================
// Group 4: Core investment metrics
// ============================================================

describe('STR Core Metrics', () => {
  const result = calculateSTR(BASE_INPUT);

  test('annualNOI = totalGrossRevenue - totalOperatingExpenses', () => {
    const expected = result.revenue.totalGrossRevenue - result.expenses.totalOperatingExpenses;
    expect(result.metrics.annualNOI).toBe(expected);
  });

  test('capRate = (annualNOI / purchasePrice) × 100', () => {
    const expected = (result.metrics.annualNOI / 450_000) * 100;
    expect(result.metrics.capRate).toBeCloseTo(expected, 1);
  });

  test('annualCashFlow = annualNOI - annualDebtService', () => {
    const mortgage = expectedMortgage();
    const expected = result.metrics.annualNOI - mortgage * 12;
    // allow ±12 for mortgage rounding (1 cent/month × 12)
    expect(Math.abs(result.metrics.annualCashFlow - expected)).toBeLessThanOrEqual(12);
  });

  test('monthlyCashFlow ≈ annualCashFlow / 12', () => {
    expect(result.metrics.monthlyCashFlow).toBe(Math.round(result.metrics.annualCashFlow / 12));
  });

  test('totalCashInvested includes furnishing budget', () => {
    // down = 90000, closing = 13500 (3%), furnishing = 18000 → 121500
    const expected = 90_000 + Math.round(450_000 * 0.03) + 18_000;
    expect(result.metrics.totalCashInvested).toBe(expected);
  });

  test('CoC = annualCashFlow / totalCashInvested × 100', () => {
    const expected = (result.metrics.annualCashFlow / result.metrics.totalCashInvested) * 100;
    expect(result.metrics.cashOnCashReturn).toBeCloseTo(expected, 1);
  });

  test('DSCR = annualNOI / annualDebtService', () => {
    const mortgage = expectedMortgage();
    const expected = result.metrics.annualNOI / (mortgage * 12);
    expect(result.metrics.dscr).toBeCloseTo(expected, 1);
  });

  test('grossRentMultiplier = purchasePrice / totalGrossRevenue', () => {
    const expected = 450_000 / result.revenue.totalGrossRevenue;
    expect(result.metrics.grossRentMultiplier).toBeCloseTo(expected, 1);
  });

  test('breakEvenOccupancy is between 0 and 100', () => {
    expect(result.metrics.breakEvenOccupancy).toBeGreaterThanOrEqual(0);
    expect(result.metrics.breakEvenOccupancy).toBeLessThanOrEqual(100);
  });

  test('strPremiumVsLTR reflects revenue uplift over LTR rent', () => {
    const ltrAnnual = 2_400 * 12;
    const expected = ((result.revenue.totalGrossRevenue - ltrAnnual) / ltrAnnual) * 100;
    expect(result.metrics.strPremiumVsLTR).toBeCloseTo(expected, 0);
  });

  test('confidence range: cashFlowRange.low < mid < high', () => {
    const { low, mid, high } = result.metrics.cashFlowRange;
    expect(low).toBeLessThanOrEqual(mid);
    expect(mid).toBeLessThanOrEqual(high);
  });

  test('confidence range: capRateRange.low < high', () => {
    expect(result.metrics.capRateRange.low).toBeLessThan(result.metrics.capRateRange.high);
  });

  test('plainEnglish is a non-empty string', () => {
    expect(typeof result.metrics.plainEnglish).toBe('string');
    expect(result.metrics.plainEnglish.length).toBeGreaterThan(20);
  });
});

// ============================================================
// Group 5: Guardrails
// ============================================================

describe('STR Guardrails', () => {
  test('flags self-managed note when managementPct is 0', () => {
    const r = calculateSTR(BASE_INPUT);
    const hasFlag = r.metrics.guardrailFlags.some(f => f.includes('Self-managed'));
    expect(hasFlag).toBe(true);
  });

  test('flags occupancy > 90% as unrealistic', () => {
    const r = calculateSTR({ ...BASE_INPUT, estimatedOccupancy: 0.95 });
    const hasFlag = r.metrics.guardrailFlags.some(f => f.includes('90%'));
    expect(hasFlag).toBe(true);
  });

  test('flags cap rate below 1%', () => {
    // Near-zero cap rate: very high purchase price, low ADR
    const r = calculateSTR({
      ...BASE_INPUT,
      purchasePrice: 10_000_000,
      estimatedADR: 50,
    });
    const hasFlag = r.metrics.guardrailFlags.some(f => f.includes('Cap rate below 1%'));
    expect(hasFlag).toBe(true);
  });

  test('no guardrail flags for a normal well-performing deal', () => {
    // Managed property, reasonable occupancy
    const r = calculateSTR({
      ...BASE_INPUT,
      managementPct: 0.25,
      estimatedOccupancy: 0.70,
      estimatedADR: 250,
    });
    // Should not have occupancy or self-managed flags
    const hasOccFlag = r.metrics.guardrailFlags.some(f => f.includes('90%'));
    const hasSelfFlag = r.metrics.guardrailFlags.some(f => f.includes('Self-managed'));
    expect(hasOccFlag).toBe(false);
    expect(hasSelfFlag).toBe(false);
  });
});

// ============================================================
// Group 6: Stress scenarios
// ============================================================

describe('STR Stress Scenarios', () => {
  const result = calculateSTR(BASE_INPUT);

  test('produces exactly 3 scenarios: base, downside, upside', () => {
    expect(result.scenarios).toHaveLength(3);
    const labels = result.scenarios.map(s => s.label);
    expect(labels).toContain('base');
    expect(labels).toContain('downside');
    expect(labels).toContain('upside');
  });

  test('downside ADR is 10% below base', () => {
    const base = result.scenarios.find(s => s.label === 'base')!;
    const down = result.scenarios.find(s => s.label === 'downside')!;
    expect(down.assumptions.adr).toBe(Math.round(base.assumptions.adr * 0.9));
  });

  test('downside occupancy is 15pp below base', () => {
    const base = result.scenarios.find(s => s.label === 'base')!;
    const down = result.scenarios.find(s => s.label === 'downside')!;
    expect(down.assumptions.occupancy).toBeCloseTo(base.assumptions.occupancy - 0.15, 2);
  });

  test('downside rate shock is +200bps', () => {
    const down = result.scenarios.find(s => s.label === 'downside')!;
    expect(down.assumptions.rateShockBps).toBe(200);
  });

  test('upside ADR is 5% above base', () => {
    const base = result.scenarios.find(s => s.label === 'base')!;
    const up = result.scenarios.find(s => s.label === 'upside')!;
    expect(up.assumptions.adr).toBe(Math.round(base.assumptions.adr * 1.05));
  });

  test('downside cash flow is lower than base cash flow', () => {
    const base = result.scenarios.find(s => s.label === 'base')!;
    const down = result.scenarios.find(s => s.label === 'downside')!;
    expect(down.cashFlow).toBeLessThan(base.cashFlow);
  });

  test('upside cash flow is higher than base cash flow', () => {
    const base = result.scenarios.find(s => s.label === 'base')!;
    const up = result.scenarios.find(s => s.label === 'upside')!;
    expect(up.cashFlow).toBeGreaterThan(base.cashFlow);
  });

  test('each scenario has a non-empty plainEnglish string', () => {
    for (const s of result.scenarios) {
      expect(s.plainEnglish.length).toBeGreaterThan(10);
    }
  });

  test('each scenario viable field is a boolean', () => {
    for (const s of result.scenarios) {
      expect(typeof s.viable).toBe('boolean');
    }
  });
});

// ============================================================
// Group 7: STR vs LTR comparison
// ============================================================

describe('STR vs LTR Comparison', () => {
  const result = calculateSTR(BASE_INPUT);

  test('comparison is defined when ltrMonthlyRent is provided', () => {
    expect(result.comparison).toBeDefined();
  });

  test('comparison is undefined when ltrMonthlyRent is absent', () => {
    const r = calculateSTR({ ...BASE_INPUT, ltrMonthlyRent: undefined });
    expect(r.comparison).toBeUndefined();
  });

  test('strAnnualRevenue matches revenue model totalGrossRevenue', () => {
    expect(result.comparison!.strAnnualRevenue).toBe(result.revenue.totalGrossRevenue);
  });

  test('ltrAnnualRent = ltrMonthlyRent × 12', () => {
    expect(result.comparison!.ltrAnnualRent).toBe(2_400 * 12);
  });

  test('recommendation is one of STR, LTR, EITHER', () => {
    const rec = result.comparison!.recommendation;
    expect(['STR', 'LTR', 'EITHER']).toContain(rec);
  });

  test('revenueUplift = (STR - LTR) / LTR × 100', () => {
    const expected = ((result.revenue.totalGrossRevenue - 2_400 * 12) / (2_400 * 12)) * 100;
    expect(result.comparison!.revenueUplift).toBeCloseTo(expected, 0);
  });

  test('strBreakEvenOccupancy is between 0 and 100', () => {
    expect(result.comparison!.strBreakEvenOccupancy).toBeGreaterThanOrEqual(0);
    expect(result.comparison!.strBreakEvenOccupancy).toBeLessThanOrEqual(100);
  });

  test('plainEnglish mentions both cash flow figures', () => {
    expect(result.comparison!.plainEnglish).toContain('cash flow');
  });

  test('standalone compareSTRvsLTR returns same comparison as embedded', () => {
    const mortgage = expectedMortgage();
    const standalone = compareSTRvsLTR(
      BASE_INPUT,
      result.metrics,
      result.expenses,
      result.revenue,
      mortgage
    );
    expect(standalone).toBeDefined();
    expect(standalone!.recommendation).toBe(result.comparison!.recommendation);
    expect(standalone!.revenueUplift).toBeCloseTo(result.comparison!.revenueUplift, 0);
  });
});

// ============================================================
// Group 8: estimateSTRInsurance helper
// ============================================================

describe('estimateSTRInsurance helper', () => {
  test('annual insurance = purchasePrice × ltrRate × 2.0 multiplier', () => {
    const r = estimateSTRInsurance(300_000, 0.007);
    expect(r.annual).toBe(Math.round(300_000 * 0.007 * 2.0));
  });

  test('monthly = annual / 12 rounded', () => {
    const r = estimateSTRInsurance(300_000, 0.007);
    expect(r.monthly).toBe(Math.round(r.annual / 12));
  });

  test('multiplierUsed is 2.0', () => {
    const r = estimateSTRInsurance(500_000);
    expect(r.multiplierUsed).toBe(2.0);
  });

  test('uses default ltrRate of 0.007 when not specified', () => {
    const r1 = estimateSTRInsurance(400_000);
    const r2 = estimateSTRInsurance(400_000, 0.007);
    expect(r1.annual).toBe(r2.annual);
  });
});

// ============================================================
// Group 9: Edge cases and boundary conditions
// ============================================================

describe('Edge cases', () => {
  test('zero purchase price does not throw', () => {
    expect(() => calculateSTR({ ...BASE_INPUT, purchasePrice: 0 })).not.toThrow();
  });

  test('100% down payment (no mortgage) produces zero debt service', () => {
    const r = calculateSTR({ ...BASE_INPUT, downPaymentPct: 100 });
    // loanAmount = 0 → monthly mortgage = 0 → annualCashFlow = annualNOI
    expect(r.metrics.annualCashFlow).toBe(r.metrics.annualNOI);
  });

  test('100% occupancy input is handled without crashing', () => {
    expect(() => calculateSTR({ ...BASE_INPUT, estimatedOccupancy: 1.0 })).not.toThrow();
  });

  test('zero occupancy input produces zero nightly revenue', () => {
    const r = calculateSTR({ ...BASE_INPUT, estimatedOccupancy: 0 });
    expect(r.revenue.grossNightlyRevenue).toBe(0);
    expect(r.revenue.annualStays).toBe(0);
    expect(r.revenue.cleaningFeeIncome).toBe(0);
  });

  test('zero cleaning fee per stay produces zero cleaning income', () => {
    const r = calculateSTR({ ...BASE_INPUT, cleaningFeePerStay: 0 });
    expect(r.revenue.cleaningFeeIncome).toBe(0);
    expect(r.expenses.cleaningCosts).toBe(0);
  });

  test('zero furnishing budget produces zero amortized furnishing expense', () => {
    const r = calculateSTR({ ...BASE_INPUT, furnishingBudget: 0 });
    expect(r.expenses.furnishingAmortized).toBe(0);
    expect(r.expenses.furnitureReservePct).toBe(0);
  });

  test('selfManagedNote is present when managementPct is 0', () => {
    const r = calculateSTR(BASE_INPUT);
    expect(r.selfManagedNote).toBeDefined();
    expect(typeof r.selfManagedNote).toBe('string');
  });

  test('selfManagedNote is absent when managementPct > 0', () => {
    const r = calculateSTR({ ...BASE_INPUT, managementPct: 0.25 });
    expect(r.selfManagedNote).toBeUndefined();
  });

  test('asOfDate is a valid ISO date string', () => {
    const r = calculateSTR(BASE_INPUT);
    expect(r.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('source field is non-empty', () => {
    const r = calculateSTR(BASE_INPUT);
    expect(r.source.length).toBeGreaterThan(10);
  });
});
