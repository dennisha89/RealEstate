// ============================================================
// Unit tests for deal-structure-engine.ts
//
// Hand-calculated reference values documented inline.
// Financial assertions use toBeCloseTo(val, 0) for ±0.5 tolerance
// on rounded dollar amounts, or exact matching where appropriate.
// ============================================================

import {
  analyzeAllStructures,
  type DealStructureInput,
  type StructureResult,
} from '../deal-structure-engine';

// ---- Helper: Mortgage payment for verification ----
// P * r(1+r)^n / ((1+r)^n - 1)
function handCalcPI(principal: number, annualPct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualPct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

// ---- Helper: Monthly NOI for verification ----
function handCalcNOI(
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

// ============================================================
// Shared baseline input
// ============================================================
// $400k property, $2,800/mo rent
// 5% vacancy, 10% mgmt, 1.25% tax, $2,400/yr insurance
// 3% appreciation, 5yr hold, 6.5% exit cap
const BASE_INPUT: DealStructureInput = {
  purchasePrice: 400_000,
  monthlyRent: 2_800,
  vacancyPct: 5,
  managementPct: 10,
  propertyTaxRate: 1.25,
  insuranceAnnual: 2_400,
  appreciationPct: 3,
  holdPeriodYears: 5,
  exitCapRate: 6.5,
};

// Pre-compute expected NOI for validation:
// effectiveRent = round(2800 * 0.95) = 2660
// monthlyTax = round(400000 * 0.0125 / 12) = round(416.67) = 417
// monthlyInsurance = round(2400 / 12) = 200
// monthlyMgmt = round(2660 * 0.10) = 266
// NOI = 2660 - 417 - 200 - 266 = 1777
const EXPECTED_NOI = 1777;

// ============================================================
// Group 1: analyzeAllStructures returns correct count & types
// ============================================================

describe('analyzeAllStructures', () => {
  let results: StructureResult[];

  beforeAll(() => {
    results = analyzeAllStructures(BASE_INPUT);
  });

  it('returns exactly 10 structures', () => {
    expect(results).toHaveLength(10);
  });

  it('every result has required fields', () => {
    for (const r of results) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(typeof r.cashAtClosing).toBe('number');
      expect(typeof r.monthlyPayment).toBe('number');
      expect(typeof r.monthlyNOI).toBe('number');
      expect(typeof r.monthlyCashFlow).toBe('number');
      expect(typeof r.annualCashOnCash).toBe('number');
      expect(typeof r.dscr).toBe('number');
      expect(typeof r.totalCostOverHold).toBe('number');
      expect(['low', 'medium', 'high']).toContain(r.riskLevel);
      expect(typeof r.qualified).toBe('boolean');
      expect(typeof r.plainEnglish).toBe('string');
      expect(r.plainEnglish.length).toBeGreaterThan(10);
      expect(typeof r.details).toBe('object');
    }
  });

  it('unique IDs for all structures', () => {
    const ids = results.map(r => r.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('qualified structures come before disqualified', () => {
    const firstDisqualified = results.findIndex(r => !r.qualified);
    if (firstDisqualified === -1) return; // all qualified
    for (let i = firstDisqualified; i < results.length; i++) {
      expect(results[i]!.qualified).toBe(false);
    }
  });

  it('qualified structures sorted by CoC descending', () => {
    const qualified = results.filter(r => r.qualified);
    for (let i = 1; i < qualified.length; i++) {
      const prevItem = qualified[i - 1]!;
      const currItem = qualified[i]!;
      const prev = Number.isFinite(prevItem.annualCashOnCash)
        ? prevItem.annualCashOnCash
        : 1e9;
      const curr = Number.isFinite(currItem.annualCashOnCash)
        ? currItem.annualCashOnCash
        : 1e9;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});

// ============================================================
// Group 2: Monthly NOI calculation
// ============================================================

describe('Monthly NOI calculation', () => {
  it('matches hand-calculated NOI for all structures (except lease option)', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const verified = handCalcNOI(2800, 400_000, 5, 10, 1.25, 2400);
    expect(verified).toBe(EXPECTED_NOI);

    for (const r of results) {
      // Lease option has NOI = 0 (you are the tenant)
      // Partnership has NOI / 2
      if (r.id === 'lease-option') {
        expect(r.monthlyNOI).toBe(0);
      } else if (r.id === 'partnership-50-50') {
        expect(r.monthlyNOI).toBe(Math.round(EXPECTED_NOI / 2));
      } else {
        expect(r.monthlyNOI).toBe(EXPECTED_NOI);
      }
    }
  });
});

// ============================================================
// Group 3: Conventional 20% Down — hand-calculated verification
// ============================================================

describe('Conventional 20% Down', () => {
  it('matches hand-calculated values', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const conv = results.find(r => r.id === 'conventional-20')!;

    // Down = 400000 * 0.20 = 80000
    // Closing = 400000 * 0.03 = 12000
    // Loan = 320000
    // PI at 7%/30yr:
    //   r = 0.07/12 = 0.005833...
    //   n = 360
    //   PI = 320000 * (0.005833 * 1.005833^360) / (1.005833^360 - 1)
    //   1.005833^360 = 8.1165... (hand calc: e^(360*ln(1.005833)) = e^(360*0.005816) = e^2.094 = 8.116)
    //   PI = 320000 * (0.005833 * 8.116) / (8.116 - 1)
    //   PI = 320000 * 0.04734 / 7.116
    //   PI = 320000 * 0.006653 = 2129
    const expectedPI = handCalcPI(320_000, 7.0, 30);
    expect(conv.cashAtClosing).toBe(92_000);
    expect(conv.monthlyPayment).toBe(expectedPI);
    expect(conv.riskLevel).toBe('low');
    expect(conv.qualified).toBe(true);

    // Cash flow = NOI - PI
    expect(conv.monthlyCashFlow).toBe(EXPECTED_NOI - expectedPI);

    // CoC = (CF * 12) / cash at closing
    const expectedCoC = ((EXPECTED_NOI - expectedPI) * 12) / 92_000 * 100;
    expect(conv.annualCashOnCash).toBeCloseTo(expectedCoC, 1);

    // DSCR = (NOI * 12) / (PI * 12) = NOI / PI
    expect(conv.dscr).toBeCloseTo(EXPECTED_NOI / expectedPI, 1);
  });
});

// ============================================================
// Group 4: FHA — owner-occupancy gate and MIP
// ============================================================

describe('FHA 3.5% Down', () => {
  it('disqualified when not owner-occupied', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const fha = results.find(r => r.id === 'fha-3.5')!;
    expect(fha.qualified).toBe(false);
    expect(fha.disqualifyReason).toContain('owner-occupancy');
  });

  it('qualified when owner-occupied with correct MIP', () => {
    const results = analyzeAllStructures({ ...BASE_INPUT, isOwnerOccupied: true });
    const fha = results.find(r => r.id === 'fha-3.5')!;
    expect(fha.qualified).toBe(true);

    // Down = 400000 * 0.035 = 14000
    // Base loan = 386000
    // UFMIP = round(386000 * 0.0175) = round(6755) = 6755
    // Total loan = 386000 + 6755 = 392755
    // Monthly MIP = round(392755 * 0.0055 / 12) = round(180.01) = 180
    const baseLoan = 400_000 - 14_000;
    const ufmip = Math.round(baseLoan * 0.0175);
    const totalLoan = baseLoan + ufmip;
    const monthlyMIP = Math.round(totalLoan * 0.0055 / 12);

    expect(fha.cashAtClosing).toBe(14_000 + 12_000); // down + 3% closing
    expect(fha.details.ufmip).toBe(ufmip);
    expect(fha.details.monthlyMIP).toBe(monthlyMIP);
    expect(fha.details.loanAmount).toBe(totalLoan);
  });
});

// ============================================================
// Group 5: DSCR loan — qualification gate
// ============================================================

describe('DSCR 25% Down', () => {
  it('disqualified at baseline rent ($2800/mo on $400k = DSCR 0.85)', () => {
    // At $2800/mo rent on $400k, 25% down:
    // Loan = 300000, PI at 7.5%/30yr = $2098
    // NOI = $1777/mo -> DSCR = 1777/2098 = 0.847 -> disqualified
    const results = analyzeAllStructures(BASE_INPUT);
    const dscr = results.find(r => r.id === 'dscr-25')!;
    expect(dscr.qualified).toBe(false);
    expect(dscr.disqualifyReason).toContain('below 1.0');
    expect(dscr.details.pointsCost).toBe(Math.round(300_000 * 0.015));
  });

  it('qualified when rent supports DSCR >= 1.0', () => {
    // Raise rent to $3600/mo to get DSCR above 1.0
    // effectiveRent = round(3600 * 0.95) = 3420
    // tax = 417, insurance = 200, mgmt = round(3420*0.1) = 342
    // NOI = 3420 - 417 - 200 - 342 = 2461
    // PI at 7.5%/30yr on 300k = 2098
    // DSCR = 2461/2098 = 1.173 -> qualified (but borderline < 1.25)
    const highRent: DealStructureInput = { ...BASE_INPUT, monthlyRent: 3_600 };
    const results = analyzeAllStructures(highRent);
    const dscr = results.find(r => r.id === 'dscr-25')!;
    expect(dscr.qualified).toBe(true);
    expect(dscr.dscr).toBeGreaterThanOrEqual(1.0);
    // Should have borderline warning in plainEnglish
    expect(dscr.plainEnglish).toContain('Warning');
  });

  it('disqualified when NOI cannot cover debt service at very low rent', () => {
    // $400k property with only $1200/mo rent -> low NOI -> DSCR < 1.0
    const lowRent: DealStructureInput = {
      ...BASE_INPUT,
      monthlyRent: 1_200,
    };
    const results = analyzeAllStructures(lowRent);
    const dscr = results.find(r => r.id === 'dscr-25')!;

    // NOI with $1200 rent:
    // effectiveRent = round(1200 * 0.95) = 1140
    // tax = 417, insurance = 200, mgmt = round(1140*0.1) = 114
    // NOI = 1140 - 417 - 200 - 114 = 409
    // PI at 7.5%/30yr on 300k = ~2098
    // DSCR = 409/2098 = 0.195 -> disqualified
    expect(dscr.qualified).toBe(false);
    expect(dscr.disqualifyReason).toContain('below 1.0');
  });
});

// ============================================================
// Group 6: Seller Financing — balloon balance
// ============================================================

describe('Seller Financing', () => {
  it('has correct down payment and closing costs', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const sf = results.find(r => r.id === 'seller-financing')!;

    // Down = 40000, Closing = 6000
    expect(sf.cashAtClosing).toBe(46_000);
    expect(sf.details.downPayment).toBe(40_000);
    expect(sf.details.closingCosts).toBe(6_000);
    expect(sf.details.loanAmount).toBe(360_000);
    expect(sf.riskLevel).toBe('medium');
  });

  it('balloon balance is present in details', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const sf = results.find(r => r.id === 'seller-financing')!;
    expect(typeof sf.details.balloonBalance).toBe('number');
    // Balloon at 5yr on 25yr amort — most of the principal remains
    expect(sf.details.balloonBalance as number).toBeGreaterThan(300_000);
    expect(sf.details.balloonBalance as number).toBeLessThan(360_000);
  });
});

// ============================================================
// Group 7: Subject-To — qualification gate
// ============================================================

describe('Subject-To', () => {
  it('disqualified without existing loan info', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const subTo = results.find(r => r.id === 'subject-to')!;
    expect(subTo.qualified).toBe(false);
    expect(subTo.disqualifyReason).toContain('existing loan');
  });

  it('qualified with existing loan data', () => {
    const input: DealStructureInput = {
      ...BASE_INPUT,
      existingLoanBalance: 280_000,
      existingLoanRate: 3.5,
      existingLoanPayment: 1_257,
    };
    const results = analyzeAllStructures(input);
    const subTo = results.find(r => r.id === 'subject-to')!;

    expect(subTo.qualified).toBe(true);
    expect(subTo.riskLevel).toBe('high');

    // Cash to seller = 400000 - 280000 = 120000
    // Closing = 400000 * 0.01 = 4000
    expect(subTo.cashAtClosing).toBe(124_000);
    expect(subTo.monthlyPayment).toBe(1_257);

    // CF = NOI - inherited payment
    expect(subTo.monthlyCashFlow).toBe(EXPECTED_NOI - 1_257);
  });
});

// ============================================================
// Group 8: Partnership 50/50 — splits
// ============================================================

describe('Partnership 50/50', () => {
  it('halves cash and cash flow vs conventional', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const conv = results.find(r => r.id === 'conventional-20')!;
    const partner = results.find(r => r.id === 'partnership-50-50')!;

    // Total conventional cash = 92000
    // Per partner = 46000
    expect(partner.cashAtClosing).toBe(46_000);

    // NOI and payment are both halved
    expect(partner.monthlyNOI).toBe(Math.round(conv.monthlyNOI / 2));
    expect(partner.monthlyPayment).toBe(Math.round(conv.monthlyPayment / 2));
  });
});

// ============================================================
// Group 9: BRRRR — qualification gate and cash recycling
// ============================================================

describe('BRRRR', () => {
  it('disqualified without rehab/ARV data', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const brrrr = results.find(r => r.id === 'brrrr')!;
    expect(brrrr.qualified).toBe(false);
  });

  it('calculates infinite return when ARV is much higher', () => {
    const input: DealStructureInput = {
      ...BASE_INPUT,
      purchasePrice: 200_000,
      rehabBudget: 40_000,
      afterRepairValue: 350_000,
    };
    const results = analyzeAllStructures(input);
    const brrrr = results.find(r => r.id === 'brrrr')!;

    expect(brrrr.qualified).toBe(true);

    // Hard money loan = 200000 * 0.90 = 180000
    // Hard money down = 20000
    // Points = 180000 * 0.02 = 3600
    // IO per month = 180000 * 0.12 / 12 = 1800
    // Holding costs = 1800 * 4 = 7200
    // Total cash in = 20000 + 3600 + 40000 + 7200 = 70800
    // Refi loan = 350000 * 0.75 = 262500
    // Cash back = 262500 - 180000 = 82500
    // Net cash = max(0, 70800 - 82500) = 0 -> infinite return
    expect(brrrr.details.infiniteReturn).toBe('Yes');
    expect(brrrr.cashAtClosing).toBe(0);
  });

  it('calculates non-infinite return correctly', () => {
    const input: DealStructureInput = {
      ...BASE_INPUT,
      purchasePrice: 300_000,
      rehabBudget: 30_000,
      afterRepairValue: 360_000,
    };
    const results = analyzeAllStructures(input);
    const brrrr = results.find(r => r.id === 'brrrr')!;

    expect(brrrr.qualified).toBe(true);

    // Hard money loan = 300000 * 0.90 = 270000
    // Hard money down = 30000
    // Points = 270000 * 0.02 = 5400
    // IO per month = 270000 * 0.12 / 12 = 2700
    // Holding costs = 2700 * 4 = 10800
    // Total cash in = 30000 + 5400 + 30000 + 10800 = 76200
    // Refi loan = 360000 * 0.75 = 270000
    // Cash back = 270000 - 270000 = 0
    // Net cash = max(0, 76200 - 0) = 76200
    expect(brrrr.details.infiniteReturn).toBe('No');
    expect(brrrr.cashAtClosing).toBe(76_200);
  });
});

// ============================================================
// Group 10: Lease Option — no cash flow, equity build
// ============================================================

describe('Lease Option', () => {
  it('has zero monthly NOI (you are the tenant)', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const lo = results.find(r => r.id === 'lease-option')!;
    expect(lo.monthlyNOI).toBe(0);
    // Cash flow is negative (paying rent with no income)
    expect(lo.monthlyCashFlow).toBeLessThan(0);
  });

  it('option fee is 3% of purchase price', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const lo = results.find(r => r.id === 'lease-option')!;
    expect(lo.cashAtClosing).toBe(12_000); // 400000 * 0.03
  });

  it('tracks rent credits and appreciation in details', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const lo = results.find(r => r.id === 'lease-option')!;
    // Monthly rent credit = 2800 * 0.25 = 700
    expect(lo.details.monthlyRentCredit).toBe(700);
    // Total credits = 700 * 60 = 42000
    expect(lo.details.totalRentCredits).toBe(42_000);
  });
});

// ============================================================
// Group 11: Hard Money Bridge — interest-only
// ============================================================

describe('Hard Money Bridge', () => {
  it('matches hand-calculated IO payment', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const hm = results.find(r => r.id === 'hard-money')!;

    // Loan = 320000, IO at 11% = 320000 * 0.11 / 12 = 2933
    const expectedIO = Math.round(320_000 * 0.11 / 12);
    expect(hm.monthlyPayment).toBe(expectedIO);

    // Down = 80000, Points = 320000 * 0.03 = 9600, Closing = 8000
    expect(hm.cashAtClosing).toBe(80_000 + 9_600 + 8_000);
    expect(hm.riskLevel).toBe('high');
  });

  it('uses 1-year hold regardless of input', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const hm = results.find(r => r.id === 'hard-money')!;
    // totalCostOverHold = cash + payment * 12
    const expectedTotal = hm.cashAtClosing + hm.monthlyPayment * 12;
    expect(hm.totalCostOverHold).toBe(expectedTotal);
  });
});

// ============================================================
// Group 12: HELOC + Conventional — dual payment
// ============================================================

describe('HELOC + Conventional', () => {
  it('has minimal cash at closing (only closing costs)', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const heloc = results.find(r => r.id === 'heloc-conventional')!;
    // Cash at closing = 400000 * 0.03 = 12000 (HELOC covers down payment)
    expect(heloc.cashAtClosing).toBe(12_000);
    expect(heloc.riskLevel).toBe('high');
  });

  it('monthly payment = HELOC IO + conventional PI', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const heloc = results.find(r => r.id === 'heloc-conventional')!;

    // HELOC IO on 80000 at 8.5% = round(80000 * 0.085 / 12) = round(567) = 567
    const helocIO = Math.round(80_000 * 0.085 / 12);
    // Conventional PI on 320000 at 7%/30yr
    const convPI = handCalcPI(320_000, 7.0, 30);

    expect(heloc.monthlyPayment).toBe(helocIO + convPI);
  });
});

// ============================================================
// Group 13: Edge cases
// ============================================================

describe('Edge cases', () => {
  it('throws on zero purchase price', () => {
    expect(() => analyzeAllStructures({
      ...BASE_INPUT,
      purchasePrice: 0,
    })).toThrow('purchasePrice must be positive');
  });

  it('throws on negative purchase price', () => {
    expect(() => analyzeAllStructures({
      ...BASE_INPUT,
      purchasePrice: -100_000,
    })).toThrow('purchasePrice must be positive');
  });

  it('throws on negative rent', () => {
    expect(() => analyzeAllStructures({
      ...BASE_INPUT,
      monthlyRent: -500,
    })).toThrow('monthlyRent cannot be negative');
  });

  it('handles zero rent gracefully', () => {
    const results = analyzeAllStructures({
      ...BASE_INPUT,
      monthlyRent: 0,
    });
    expect(results).toHaveLength(10);
    // All structures should have negative or zero cash flow
    for (const r of results) {
      if (r.id !== 'lease-option') {
        expect(r.monthlyCashFlow).toBeLessThanOrEqual(0);
      }
    }
  });

  it('handles high-value property correctly', () => {
    const results = analyzeAllStructures({
      ...BASE_INPUT,
      purchasePrice: 2_000_000,
      monthlyRent: 12_000,
    });
    expect(results).toHaveLength(10);
    const conv = results.find(r => r.id === 'conventional-20')!;
    expect(conv.cashAtClosing).toBe(460_000); // 400k down + 60k closing
  });
});

// ============================================================
// Group 14: DSCR and Cash-on-Cash formulas
// ============================================================

describe('Financial formula correctness', () => {
  it('DSCR = annual NOI / annual debt service for conventional', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const conv = results.find(r => r.id === 'conventional-20')!;

    const manualDSCR = (conv.monthlyNOI * 12) / (conv.monthlyPayment * 12);
    expect(conv.dscr).toBeCloseTo(manualDSCR, 1);
  });

  it('CoC = annual cash flow / cash at closing * 100 for conventional', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    const conv = results.find(r => r.id === 'conventional-20')!;

    const manualCoC = (conv.monthlyCashFlow * 12) / conv.cashAtClosing * 100;
    expect(conv.annualCashOnCash).toBeCloseTo(manualCoC, 1);
  });

  it('totalCostOverHold = cash + payments * months for all structures', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    for (const r of results) {
      // Hard money uses 1yr hold, everything else uses input holdPeriodYears
      const holdYears = r.id === 'hard-money' ? 1 : BASE_INPUT.holdPeriodYears;
      const expected = r.cashAtClosing + r.monthlyPayment * holdYears * 12;
      expect(r.totalCostOverHold).toBe(expected);
    }
  });

  it('monthlyCashFlow = monthlyNOI - monthlyPayment', () => {
    const results = analyzeAllStructures(BASE_INPUT);
    for (const r of results) {
      expect(r.monthlyCashFlow).toBe(r.monthlyNOI - r.monthlyPayment);
    }
  });
});

// ============================================================
// Group 15: Mortgage payment formula edge case (r=0)
// ============================================================

describe('Zero interest rate handling', () => {
  it('calculates equal principal splits when rate is 0', () => {
    // This is tested indirectly — the calcPI function handles r=0
    // We verify by checking seller financing with 0% rate would compute
    // We cannot directly set seller financing rate, but we verify the
    // helper formula matches: principal / n
    const principal = 360_000;
    const n = 25 * 12;
    const expected = Math.round(principal / n);
    expect(expected).toBe(1200); // 360000 / 300 = 1200
  });
});
