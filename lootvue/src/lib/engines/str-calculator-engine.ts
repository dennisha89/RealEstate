// ============================================================
// Short-Term Rental (STR) Calculator Engine
// Covers Airbnb, VRBO, and direct-booking revenue models.
// Produces STR-specific metrics plus a side-by-side STR vs LTR
// comparison so callers can make an informed model selection.
//
// Platform fee sources:
//   - Airbnb: 15.5% host-only (Oct 27 2025 transition; was 3% split)
//     Source: airbnb.com/help/article/1857, hostaway.com
//   - VRBO: 8% (5% commission + 3% processing), pay-per-booking
//     Source: hospitable.com/vrbo-fees-for-owners (March 2025)
//   - Direct: 0%
//
// Occupancy benchmarks (AirDNA 2025):
//   - National average occupancy: 52–59% (Sun Belt); 60–75% top markets
//   - RevPAR hit all-time high August 2025
//   Source: airdna.co/blog/us-review-august-2025
//
// Property management (industry 2025):
//   - Full-service STR PM: 20–35% of gross revenue
//   - Half-service: 10–15%
//   Source: awning.com/post/airbnb-management-fees, pricelabs
//
// STR insurance:
//   - $1,500–$3,500/yr for SFR; vs ~$1,000–$1,500/yr for LTR landlord
//   - STR is roughly 1.5–2.5x LTR premium
//   Source: proper.insure, obie, bankrate (2025)
//
// Furnishing:
//   - $15,000–$25,000 for a 2BR from scratch (2025)
//   - Average ~$4,000/bedroom + $2,500 for common areas
//   Source: awning.com/post/furnishing-cost-airbnb, strnumbers.com
// ============================================================

// --- Platform fee constants ---
// Updated to reflect Oct 2025 Airbnb single-fee rollout.
const PLATFORM_FEES: Record<string, number> = {
  airbnb: 0.155,   // 15.5% host-only fee (Oct 2025 standard)
  vrbo: 0.08,      // 5% commission + 3% processing
  direct: 0.00,    // no platform cut
  multi: 0.10,     // blended estimate across platforms
};

// --- Input & Output Types ---

export interface STRSeasonality {
  peakMonths: number[];           // 1-based month numbers (1=Jan … 12=Dec)
  peakADRMultiplier: number;      // e.g. 1.4 means ADR is 40% above baseline
  offSeasonMonths: number[];
  offSeasonADRMultiplier: number; // e.g. 0.6 means ADR is 40% below baseline
}

export interface STRCalculatorInput {
  // Acquisition
  purchasePrice: number;           // dollars
  downPaymentPct: number;          // 0–100
  mortgageRate: number;            // annual %, e.g. 7.25
  loanTerm: number;                // years, typically 30

  // Revenue assumptions
  estimatedADR: number;            // average daily rate, dollars
  estimatedOccupancy: number;      // decimal 0–1, e.g. 0.65
  avgStayLength: number;           // nights per booking, e.g. 3.5
  cleaningFeePerStay: number;      // dollars per turnover

  // Platform & operations
  platform: 'airbnb' | 'vrbo' | 'direct' | 'multi';
  managementPct: number;           // 0 for self-managed; 0.20–0.35 for PM
  furnishingBudget: number;        // one-time dollars (included in total cash invested)

  // Recurring monthly expenses
  monthlyUtilities: number;        // dollars/mo — host pays all utilities for STR
  monthlyInsurance: number;        // STR-specific policy; use estimateSTRInsurance() if unknown
  annualPropertyTax: number;       // dollars/yr

  // Optional: seasonal pricing adjustment
  seasonality?: STRSeasonality;

  // Optional: LTR comparison baseline
  ltrMonthlyRent?: number;         // if provided, enables STRvsLTRComparison

  // Optional overrides (fall back to calculated defaults when absent)
  closingCostsPct?: number;        // default 3%
  maintenancePct?: number;         // % of purchase price / yr; default 1.5% (1.5x LTR)
  capexPct?: number;               // default 1%
  dynamicPricingToolMonthly?: number; // default 35 (mid-range PriceLabs/Wheelhouse)
  annualLinens?: number;           // dollar default derived from bedrooms (below)
  annualConsumables?: number;      // toiletries, coffee, paper goods
  annualPhotography?: number;      // listing refresh; default $350
  annualSmartLocks?: number;       // hardware + subscription; default $200
  annualSecurityCameras?: number;  // exterior only; default $150
  furnitureReplacementYears?: number; // amortization life for furnishing; default 6
}

// --- Revenue sub-types ---

export interface STRSeasonBreakdown {
  label: 'peak' | 'shoulder' | 'off';
  months: string[];
  adr: number;
  occupancy: number;
  nights: number;
  revenue: number;         // nightly revenue for these months
}

export interface STRRevenueModel {
  averageDailyRate: number;          // ADR — blended across all months
  occupancyRate: number;             // blended occupancy
  revPAR: number;                    // ADR × occupancy
  grossNightlyRevenue: number;       // ADR × occupancy × 365
  cleaningFeeIncome: number;         // cleaning fee × annual stays
  totalGrossRevenue: number;         // nightly + cleaning
  annualStays: number;               // number of turnovers per year
  peakSeason: STRSeasonBreakdown;
  shoulderSeason: STRSeasonBreakdown;
  offSeason: STRSeasonBreakdown;
}

// --- Expense sub-type ---

export interface STRExpenses {
  // Platform
  platformFees: number;             // % of gross nightly revenue
  // Cleaning & supplies
  cleaningCosts: number;            // cost per turnover × annual turnovers
  linens: number;                   // annual linen replacement
  consumables: number;              // toiletries, coffee, etc.
  // Furnishing
  furnishingAmortized: number;      // one-time budget / amortization years
  furnitureReservePct: number;      // % of furnishing budget set aside annually
  // Listing & tech
  photography: number;
  dynamicPricingTool: number;
  // Operations
  propertyManagement: number;       // % of gross revenue
  utilities: number;
  wifi: number;                     // included in utilities input or separate
  // Property costs
  insurance: number;
  propertyTax: number;
  maintenance: number;
  capex: number;
  // Amenity optionals
  smartLocks: number;
  securityCameras: number;
  // Derived totals
  totalOperatingExpenses: number;   // everything except debt service
  totalWithDebtService: number;     // + monthly mortgage × 12
}

// --- Core metrics ---

export interface STRMetrics {
  monthlyCashFlow: number;
  annualCashFlow: number;
  annualNOI: number;
  capRate: number;                  // NOI / purchase price, %
  cashOnCashReturn: number;         // annual cash flow / total cash invested, %
  totalCashInvested: number;        // down payment + closing costs + furnishing
  dscr: number;                     // NOI / annual debt service
  grossRentMultiplier: number;      // purchase price / annual gross revenue
  breakEvenOccupancy: number;       // occupancy required to cover all costs, %
  strPremiumVsLTR?: number;         // % revenue uplift vs LTR (if ltrMonthlyRent provided)
  // Confidence ranges (±)
  cashFlowRange: { low: number; mid: number; high: number };
  capRateRange: { low: number; mid: number; high: number };
  cocRange: { low: number; mid: number; high: number };
  // Guardrails
  guardrailFlags: string[];
  // Plain English
  plainEnglish: string;
}

// --- Scenario outputs ---

export interface STRScenario {
  label: 'base' | 'downside' | 'upside';
  assumptions: {
    adr: number;
    occupancy: number;
    rateShockBps: number;
    appreciationPct: number;
  };
  annualRevenue: number;
  annualExpenses: number;
  noi: number;
  cashFlow: number;
  dscr: number;
  capRate: number;
  cocReturn: number;
  breakEvenOccupancy: number;
  viable: boolean;
  plainEnglish: string;
}

// --- STR vs LTR comparison ---

export interface STRvsLTRComparison {
  strAnnualRevenue: number;
  ltrAnnualRent: number;
  strAnnualExpenses: number;
  ltrAnnualExpenses: number;
  strCashFlow: number;
  ltrCashFlow: number;
  strCoC: number;
  ltrCoC: number;
  strBreakEvenOccupancy: number;    // occupancy % at which STR cash flow equals LTR
  revenueUplift: number;            // (STR revenue - LTR rent) / LTR rent, %
  expenseOverhead: number;          // STR-only additional annual expenses vs LTR
  recommendation: 'STR' | 'LTR' | 'EITHER';
  plainEnglish: string;
}

// --- Full engine output ---

export interface STRCalculatorResult {
  asOfDate: string;                 // ISO date string of calculation
  source: string;
  input: STRCalculatorInput;
  revenue: STRRevenueModel;
  expenses: STRExpenses;
  metrics: STRMetrics;
  scenarios: STRScenario[];         // base, downside, upside
  comparison?: STRvsLTRComparison;  // only if ltrMonthlyRent provided
  selfManagedNote?: string;         // hours/week estimate if managementPct === 0
}

// ============================================================
// Internal helpers
// ============================================================

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Standard mortgage payment formula (returns dollars, rounded to nearest cent).
 * P × [r(1+r)^n] / [(1+r)^n − 1]
 */
function calcMortgage(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/**
 * Given a set of monthly month-indexes (1-12), return the complement set as shoulder.
 */
function shoulderMonths(peakMonths: number[], offMonths: number[]): number[] {
  const all = [1,2,3,4,5,6,7,8,9,10,11,12];
  const excluded = new Set([...peakMonths, ...offMonths]);
  return all.filter(m => !excluded.has(m));
}

/**
 * Build the seasonal revenue breakdown into three bands.
 * When no seasonality is provided every month uses baseline ADR and occupancy
 * (shoulder band covers all 12 months, peak and off are empty).
 */
function buildSeasonalRevenue(
  baseADR: number,
  baseOccupancy: number,
  seasonality?: STRSeasonality
): { peak: STRSeasonBreakdown; shoulder: STRSeasonBreakdown; off: STRSeasonBreakdown } {
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31]; // non-leap year

  if (!seasonality) {
    const totalNights = 365;
    return {
      peak: {
        label: 'peak', months: [], adr: baseADR, occupancy: baseOccupancy,
        nights: 0, revenue: 0,
      },
      shoulder: {
        label: 'shoulder',
        months: MONTH_NAMES,
        adr: baseADR,
        occupancy: baseOccupancy,
        nights: totalNights,
        revenue: Math.round(baseADR * baseOccupancy * totalNights),
      },
      off: {
        label: 'off', months: [], adr: baseADR, occupancy: baseOccupancy,
        nights: 0, revenue: 0,
      },
    };
  }

  const { peakMonths, peakADRMultiplier, offSeasonMonths, offSeasonADRMultiplier } = seasonality;
  const shoulder = shoulderMonths(peakMonths, offSeasonMonths);

  function bandRevenue(months: number[], adrMultiplier: number, occMultiplier = 1.0) {
    const names = months.map(m => MONTH_NAMES[m - 1]!);
    const nights = months.reduce((s, m) => s + (daysInMonth[m - 1] ?? 30), 0);
    const adr = Math.round(baseADR * adrMultiplier);
    // Peak months naturally have higher occupancy; off-season lower
    const occ = Math.min(1, Math.max(0, baseOccupancy * occMultiplier));
    return { names, nights, adr, occ, revenue: Math.round(adr * occ * nights) };
  }

  const p = bandRevenue(peakMonths, peakADRMultiplier, 1.15);     // peak: +15% occ uplift
  const s = bandRevenue(shoulder, 1.0, 1.0);
  const o = bandRevenue(offSeasonMonths, offSeasonADRMultiplier, 0.80); // off: -20% occ

  return {
    peak:    { label: 'peak',    months: p.names, adr: p.adr, occupancy: p.occ, nights: p.nights, revenue: p.revenue },
    shoulder:{ label: 'shoulder',months: s.names, adr: s.adr, occupancy: s.occ, nights: s.nights, revenue: s.revenue },
    off:     { label: 'off',     months: o.names, adr: o.adr, occupancy: o.occ, nights: o.nights, revenue: o.revenue },
  };
}

/**
 * Blended ADR and occupancy across all three seasonal bands.
 * Weighted by nights in each band.
 */
function blendSeasonalMetrics(
  peak: STRSeasonBreakdown,
  shoulder: STRSeasonBreakdown,
  off: STRSeasonBreakdown
): { adr: number; occupancy: number } {
  const totalNights = peak.nights + shoulder.nights + off.nights;
  if (totalNights === 0) return { adr: 0, occupancy: 0 };
  const blendedADR = (peak.adr * peak.nights + shoulder.adr * shoulder.nights + off.adr * off.nights) / totalNights;
  const blendedOcc = (peak.occupancy * peak.nights + shoulder.occupancy * shoulder.nights + off.occupancy * off.nights) / totalNights;
  return { adr: Math.round(blendedADR), occupancy: Math.round(blendedOcc * 1000) / 1000 };
}

// ============================================================
// Exported helper: estimate STR insurance if caller doesn't have it
// LTR landlord insurance is roughly insuranceRate × purchasePrice.
// STR is 1.5–2.5x; we default to 2.0x midpoint.
// Source: proper.insure, obie, bankrate 2025.
// ============================================================
export function estimateSTRInsurance(
  purchasePrice: number,
  ltrInsuranceRate = 0.007  // 0.7% of purchase price per year (LTR baseline)
): { annual: number; monthly: number; multiplierUsed: number } {
  const multiplier = 2.0;
  const annual = Math.round(purchasePrice * ltrInsuranceRate * multiplier);
  return { annual, monthly: Math.round(annual / 12), multiplierUsed: multiplier };
}

// ============================================================
// Core calculation: STR revenue model
// ============================================================
function calcRevenue(input: STRCalculatorInput): STRRevenueModel {
  const bands = buildSeasonalRevenue(input.estimatedADR, input.estimatedOccupancy, input.seasonality);
  const { adr: blendedADR, occupancy: blendedOcc } = blendSeasonalMetrics(
    bands.peak, bands.shoulder, bands.off
  );

  const grossNightlyRevenue = Math.round(blendedADR * blendedOcc * 365);
  const annualStays = input.avgStayLength > 0
    ? Math.round((blendedOcc * 365) / input.avgStayLength)
    : 0;
  const cleaningFeeIncome = Math.round(annualStays * input.cleaningFeePerStay);
  const totalGrossRevenue = grossNightlyRevenue + cleaningFeeIncome;
  const revPAR = Math.round(blendedADR * blendedOcc * 100) / 100;

  return {
    averageDailyRate: blendedADR,
    occupancyRate: blendedOcc,
    revPAR,
    grossNightlyRevenue,
    cleaningFeeIncome,
    totalGrossRevenue,
    annualStays,
    peakSeason: bands.peak,
    shoulderSeason: bands.shoulder,
    offSeason: bands.off,
  };
}

// ============================================================
// Core calculation: STR expense model
// ============================================================
function calcExpenses(
  input: STRCalculatorInput,
  revenue: STRRevenueModel,
  monthlyMortgage: number
): STRExpenses {
  const {
    purchasePrice,
    platform,
    managementPct,
    furnishingBudget,
    monthlyUtilities,
    monthlyInsurance,
    annualPropertyTax,
    closingCostsPct = 3,
    maintenancePct = 0.015,  // 1.5% — 1.5x LTR (which defaults to 1%)
    capexPct = 0.01,
    dynamicPricingToolMonthly = 35,
    annualLinens = 600,
    annualConsumables = 1200,
    annualPhotography = 350,
    annualSmartLocks = 200,
    annualSecurityCameras = 150,
    furnitureReplacementYears = 6,
  } = input;

  // Platform fee applies to nightly revenue only (cleaning fees are pass-through)
  const platformFeeRate = PLATFORM_FEES[platform] ?? PLATFORM_FEES['airbnb']!;
  const platformFees = Math.round(revenue.grossNightlyRevenue * platformFeeRate);

  // Cleaning: cost per turnover × annual turnovers
  // Industry: $75–$150 per clean for standard unit; we estimate 40% of cleaning fee income
  // as the actual cost to the host. Caller can override via no-overrides pattern.
  // Rule of thumb: cleaning revenue (fees charged) ≈ cleaning cost + small margin.
  // We calculate cleaning cost as 85% of fee income as a conservative default.
  const cleaningCosts = Math.round(revenue.cleaningFeeIncome * 0.85);

  // Furnishing: straight-line over furnitureReplacementYears
  const furnishingAmortized = Math.round(furnishingBudget / furnitureReplacementYears);
  // Annual reserve: 15% of furnishing budget for incremental replacements
  const furnitureReservePct = Math.round(furnishingBudget * 0.15);

  // Management: % of total gross revenue (including cleaning fees)
  const propertyManagement = Math.round(revenue.totalGrossRevenue * managementPct);

  // Utilities (annual)
  const utilities = monthlyUtilities * 12;

  // Insurance (annual)
  const insurance = monthlyInsurance * 12;

  // Property tax
  const propertyTax = annualPropertyTax;

  // Maintenance: percentage of purchase price / year (1.5× LTR)
  const maintenance = Math.round(purchasePrice * maintenancePct);

  // CapEx reserve
  const capex = Math.round(purchasePrice * capexPct);

  // Dynamic pricing tool
  const dynamicPricingTool = dynamicPricingToolMonthly * 12;

  const totalOperatingExpenses =
    platformFees +
    cleaningCosts +
    annualLinens +
    annualConsumables +
    furnishingAmortized +
    furnitureReservePct +
    annualPhotography +
    dynamicPricingTool +
    propertyManagement +
    utilities +
    insurance +
    propertyTax +
    maintenance +
    capex +
    annualSmartLocks +
    annualSecurityCameras;

  const totalWithDebtService = totalOperatingExpenses + monthlyMortgage * 12;

  return {
    platformFees,
    cleaningCosts,
    linens: annualLinens,
    consumables: annualConsumables,
    furnishingAmortized,
    furnitureReservePct,
    photography: annualPhotography,
    dynamicPricingTool,
    propertyManagement,
    utilities,
    wifi: 0,               // assumed bundled in utilities; separate if caller provides it
    insurance,
    propertyTax,
    maintenance,
    capex,
    smartLocks: annualSmartLocks,
    securityCameras: annualSecurityCameras,
    totalOperatingExpenses,
    totalWithDebtService,
  };
}

// ============================================================
// Core calculation: investment metrics
// ============================================================
function calcMetrics(
  input: STRCalculatorInput,
  revenue: STRRevenueModel,
  expenses: STRExpenses,
  monthlyMortgage: number
): STRMetrics {
  const {
    purchasePrice,
    downPaymentPct,
    furnishingBudget,
    closingCostsPct = 3,
    ltrMonthlyRent,
  } = input;

  const downPayment = Math.round(purchasePrice * (downPaymentPct / 100));
  const closingCosts = Math.round(purchasePrice * (closingCostsPct / 100));

  // STR CoC must include furnishing — it's a real cash outlay at closing.
  // Omitting it would overstate returns by 3–15% on typical deals.
  const totalCashInvested = downPayment + closingCosts + furnishingBudget;

  const annualDebtService = monthlyMortgage * 12;
  const annualNOI = revenue.totalGrossRevenue - expenses.totalOperatingExpenses;
  const annualCashFlow = annualNOI - annualDebtService;
  const monthlyCashFlow = Math.round(annualCashFlow / 12);

  const capRate = purchasePrice > 0 ? (annualNOI / purchasePrice) * 100 : 0;
  const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
  const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : Infinity;
  const grossRentMultiplier = revenue.totalGrossRevenue > 0
    ? purchasePrice / revenue.totalGrossRevenue
    : 0;

  // Break-even occupancy: what % occupancy makes revenue = all annual costs
  // Revenue at 100% occ = ADR × 365 + cleaning fees at 100% occ
  // We solve: ADR × occ × 365 + cleaning × occ × (365 / avgStay) = totalWithDebtService
  const adr = revenue.averageDailyRate;
  const avgStay = input.avgStayLength > 0 ? input.avgStayLength : 3.5;
  const cleanPerNight = input.cleaningFeePerStay / avgStay;  // cleaning fee amortized per booked night
  const revenuePerBookedNight = adr + cleanPerNight;
  const breakEvenNights = revenuePerBookedNight > 0
    ? expenses.totalWithDebtService / revenuePerBookedNight
    : 365;
  const breakEvenOccupancy = Math.min(100, Math.round((breakEvenNights / 365) * 100 * 10) / 10);

  // STR revenue premium vs LTR
  const strPremiumVsLTR = ltrMonthlyRent && ltrMonthlyRent > 0
    ? ((revenue.totalGrossRevenue - ltrMonthlyRent * 12) / (ltrMonthlyRent * 12)) * 100
    : undefined;

  // --- Confidence ranges ---
  // Revenue uncertainty: ±10% on occupancy-driven revenue
  const revLow = Math.round(revenue.totalGrossRevenue * 0.90);
  const revHigh = Math.round(revenue.totalGrossRevenue * 1.10);
  const expLow = Math.round(expenses.totalOperatingExpenses * 0.95);  // expenses can compress
  const expHigh = Math.round(expenses.totalOperatingExpenses * 1.10);

  const noiLow = revLow - expHigh;
  const noiHigh = revHigh - expLow;
  const cfLow = Math.round((noiLow - annualDebtService) / 12);
  const cfHigh = Math.round((noiHigh - annualDebtService) / 12);
  const capLow = purchasePrice > 0 ? Math.round((noiLow / purchasePrice) * 1000) / 10 : 0;
  const capHigh = purchasePrice > 0 ? Math.round((noiHigh / purchasePrice) * 1000) / 10 : 0;
  const cocLow = totalCashInvested > 0 ? Math.round(((noiLow - annualDebtService) / totalCashInvested) * 1000) / 10 : 0;
  const cocHigh = totalCashInvested > 0 ? Math.round(((noiHigh - annualDebtService) / totalCashInvested) * 1000) / 10 : 0;

  // --- Guardrails ---
  const flags: string[] = [];
  if (capRate < 1) flags.push('GUARDRAIL: Cap rate below 1% — verify ADR and occupancy inputs');
  if (capRate > 15) flags.push('GUARDRAIL: Cap rate above 15% — unusually high, verify inputs');
  if (cashOnCashReturn < -20) flags.push('GUARDRAIL: CoC below −20% — deal is significantly cash-flow negative');
  if (cashOnCashReturn > 30) flags.push('GUARDRAIL: CoC above 30% — verify occupancy and expenses are realistic');
  if (dscr < 0.5) flags.push('GUARDRAIL: DSCR below 0.5 — revenue covers less than half of debt service');
  if (dscr > 3.0) flags.push('GUARDRAIL: DSCR above 3.0 — verify debt service calculation');
  if (breakEvenOccupancy > 85) flags.push('RISK: Break-even occupancy above 85% — thin margin for slow seasons or market downturns');
  if (revenue.occupancyRate > 0.90) flags.push('ASSUMPTION: Occupancy above 90% is rare — national top-market average is 65–75% (AirDNA 2025)');
  if (input.managementPct === 0) flags.push('NOTE: Self-managed STR requires ~15–20 hours/week of active owner involvement');

  // --- Plain English ---
  const grade = cashOnCashReturn >= 12 ? 'strong' : cashOnCashReturn >= 8 ? 'solid' : cashOnCashReturn >= 4 ? 'modest' : 'negative';
  const plainEnglish = [
    `This STR generates an estimated $${revenue.totalGrossRevenue.toLocaleString()} in gross annual revenue`,
    `at ${(revenue.occupancyRate * 100).toFixed(1)}% occupancy and a $${revenue.averageDailyRate} average nightly rate.`,
    `After all operating expenses ($${expenses.totalOperatingExpenses.toLocaleString()}) and debt service ($${annualDebtService.toLocaleString()}),`,
    `the deal produces a ${grade} ${annualCashFlow >= 0 ? 'positive' : 'negative'} annual cash flow of`,
    `$${Math.abs(annualCashFlow).toLocaleString()} ($${Math.abs(monthlyCashFlow).toLocaleString()}/mo).`,
    `Cap rate: ${capRate.toFixed(1)}%. CoC return: ${cashOnCashReturn.toFixed(1)}%. DSCR: ${isFinite(dscr) ? dscr.toFixed(2) : 'N/A'}x.`,
    `Break-even occupancy is ${breakEvenOccupancy}% — the property needs to be booked`,
    `at least ${breakEvenOccupancy}% of nights to cover all costs including the mortgage.`,
  ].join(' ');

  return {
    monthlyCashFlow,
    annualCashFlow,
    annualNOI,
    capRate: Math.round(capRate * 100) / 100,
    cashOnCashReturn: Math.round(cashOnCashReturn * 100) / 100,
    totalCashInvested,
    dscr: isFinite(dscr) ? Math.round(dscr * 100) / 100 : 0,
    grossRentMultiplier: Math.round(grossRentMultiplier * 100) / 100,
    breakEvenOccupancy,
    strPremiumVsLTR: strPremiumVsLTR !== undefined
      ? Math.round(strPremiumVsLTR * 100) / 100
      : undefined,
    cashFlowRange: { low: cfLow, mid: monthlyCashFlow, high: cfHigh },
    capRateRange: { low: capLow, mid: Math.round(capRate * 10) / 10, high: capHigh },
    cocRange: { low: cocLow, mid: Math.round(cashOnCashReturn * 10) / 10, high: cocHigh },
    guardrailFlags: flags,
    plainEnglish,
  };
}

// ============================================================
// Stress test scenarios
// ============================================================
function buildScenarios(
  input: STRCalculatorInput,
  expenses: STRExpenses,
  baseRevenue: STRRevenueModel,
  monthlyMortgage: number
): STRScenario[] {
  const { purchasePrice, downPaymentPct, closingCostsPct = 3, furnishingBudget, loanTerm, mortgageRate } = input;
  const downPayment = Math.round(purchasePrice * (downPaymentPct / 100));
  const closingCosts = Math.round(purchasePrice * (closingCostsPct / 100));
  const totalCashInvested = downPayment + closingCosts + furnishingBudget;
  const loanAmount = purchasePrice - downPayment;

  function buildOne(
    label: 'base' | 'downside' | 'upside',
    adrMult: number,
    occDelta: number,
    rateShockBps: number,
    appreciationPct: number
  ): STRScenario {
    const adr = Math.round(baseRevenue.averageDailyRate * adrMult);
    const occ = Math.min(1, Math.max(0, baseRevenue.occupancyRate + occDelta));
    const annualStays = input.avgStayLength > 0
      ? Math.round((occ * 365) / input.avgStayLength)
      : 0;
    const grossNightly = Math.round(adr * occ * 365);
    const cleaning = Math.round(annualStays * input.cleaningFeePerStay);
    const annualRevenue = grossNightly + cleaning;

    // Expenses scale with revenue for variable items; fixed items stay constant
    const platformFeeRate = PLATFORM_FEES[input.platform] ?? PLATFORM_FEES['airbnb']!;
    const varExpenses = Math.round(grossNightly * platformFeeRate)       // platform
      + Math.round(cleaning * 0.85)                                       // cleaning cost
      + Math.round(annualRevenue * input.managementPct);                  // management
    const fixedExpenses = expenses.linens + expenses.consumables +
      expenses.furnishingAmortized + expenses.furnitureReservePct +
      expenses.photography + expenses.dynamicPricingTool +
      expenses.utilities + expenses.insurance + expenses.propertyTax +
      expenses.maintenance + expenses.capex +
      expenses.smartLocks + expenses.securityCameras;
    const annualExpenses = varExpenses + fixedExpenses;

    const stressedMortgageRate = mortgageRate + rateShockBps / 100;
    const stressedMonthly = calcMortgage(loanAmount, stressedMortgageRate, loanTerm);
    const annualDebtService = stressedMonthly * 12;

    const noi = annualRevenue - annualExpenses;
    const cashFlow = noi - annualDebtService;
    const dscr = annualDebtService > 0 ? noi / annualDebtService : Infinity;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    const cocReturn = totalCashInvested > 0 ? (cashFlow / totalCashInvested) * 100 : 0;

    const cleanPerNight = input.cleaningFeePerStay / (input.avgStayLength > 0 ? input.avgStayLength : 3.5);
    const revenuePerBookedNight = adr + cleanPerNight;
    const beNights = revenuePerBookedNight > 0
      ? (annualExpenses + annualDebtService) / revenuePerBookedNight
      : 365;
    const breakEvenOccupancy = Math.min(100, Math.round((beNights / 365) * 100 * 10) / 10);

    const viable = cashFlow > 0 && dscr > 1.0;
    const dirStr = cashFlow >= 0 ? `positive $${cashFlow.toLocaleString()}` : `negative ($${Math.abs(cashFlow).toLocaleString()})`;

    const plainEnglish = label === 'base'
      ? `Base scenario at ${(occ*100).toFixed(0)}% occupancy and $${adr} ADR: annual cash flow ${dirStr}. DSCR ${isFinite(dscr) ? dscr.toFixed(2) : 'N/A'}x.`
      : label === 'downside'
      ? `Downside stress (−10% ADR, −15pp occupancy, +200bps rates): cash flow ${dirStr}. DSCR ${isFinite(dscr) ? dscr.toFixed(2) : 'N/A'}x. Deal is ${viable ? 'still viable' : 'cash-flow negative under stress'}.`
      : `Upside scenario (+5% ADR, +5pp occupancy, ${appreciationPct}% appreciation): cash flow ${dirStr}. DSCR ${isFinite(dscr) ? dscr.toFixed(2) : 'N/A'}x.`;

    return {
      label,
      assumptions: { adr, occupancy: occ, rateShockBps, appreciationPct },
      annualRevenue,
      annualExpenses,
      noi,
      cashFlow,
      dscr: isFinite(dscr) ? Math.round(dscr * 100) / 100 : 0,
      capRate: Math.round(capRate * 100) / 100,
      cocReturn: Math.round(cocReturn * 100) / 100,
      breakEvenOccupancy,
      viable,
      plainEnglish,
    };
  }

  return [
    buildOne('base',     1.00,  0.00,   0,  3.0),   // current market
    buildOne('downside', 0.90, -0.15, 200,  0.0),   // −10% ADR, −15pp occ, +200bps, no appreciation
    buildOne('upside',   1.05,  0.05,   0,  5.0),   // +5% ADR, +5pp occ, market+2% appreciation
  ];
}

// ============================================================
// STR vs LTR comparison
// ============================================================
export function compareSTRvsLTR(
  input: STRCalculatorInput,
  strMetrics: STRMetrics,
  strExpenses: STRExpenses,
  strRevenue: STRRevenueModel,
  monthlyMortgage: number
): STRvsLTRComparison | undefined {
  if (!input.ltrMonthlyRent || input.ltrMonthlyRent <= 0) return undefined;

  const {
    purchasePrice,
    downPaymentPct,
    closingCostsPct = 3,
    ltrMonthlyRent,
    annualPropertyTax,
    monthlyInsurance,
    maintenancePct = 0.01,   // LTR uses standard 1% maintenance (not 1.5x)
    capexPct = 0.01,
    managementPct,
  } = input;

  const downPayment = Math.round(purchasePrice * (downPaymentPct / 100));
  const closingCosts = Math.round(purchasePrice * (closingCostsPct / 100));
  // LTR does NOT include furnishing in cash invested
  const ltrCashInvested = downPayment + closingCosts;

  const ltrAnnualRent = ltrMonthlyRent * 12;
  const ltrVacancy = Math.round(ltrAnnualRent * 0.08); // standard 8% LTR vacancy
  const ltrManagement = Math.round(ltrAnnualRent * Math.min(managementPct, 0.10)); // LTR PM is 8-10%
  const ltrMaintenance = Math.round(purchasePrice * maintenancePct);
  const ltrCapex = Math.round(purchasePrice * capexPct);
  const ltrInsurance = Math.round(monthlyInsurance * 12 / 2.0); // reverse out STR 2x multiplier
  const ltrPropertyTax = annualPropertyTax;

  const ltrAnnualExpenses =
    ltrVacancy + ltrManagement + ltrMaintenance + ltrCapex + ltrInsurance + ltrPropertyTax;
  const ltrNOI = ltrAnnualRent - ltrAnnualExpenses;
  const ltrCashFlow = ltrNOI - monthlyMortgage * 12;
  const ltrCoC = ltrCashInvested > 0 ? (ltrCashFlow / ltrCashInvested) * 100 : 0;

  const strAnnualRevenue = strRevenue.totalGrossRevenue;
  const strAnnualExpenses = strExpenses.totalOperatingExpenses;
  const strCashFlow = strMetrics.annualCashFlow;
  const strCoC = strMetrics.cashOnCashReturn;

  // STR break-even occupancy in LTR-equivalent terms:
  // What occupancy makes STR cash flow equal LTR cash flow?
  // STR CF(occ) = (ADR × occ × 365 + cleaning × occ × 365/avgStay) × (1 - platformFee - managePct) - fixed - debt
  // Set equal to LTR CF and solve for occ.
  const avgStay = input.avgStayLength > 0 ? input.avgStayLength : 3.5;
  const platformFeeRate = PLATFORM_FEES[input.platform] ?? PLATFORM_FEES['airbnb']!;
  const adr = strRevenue.averageDailyRate;
  const cleanPerNight = input.cleaningFeePerStay / avgStay;
  const netPerBookedNight = (adr + cleanPerNight) * (1 - platformFeeRate - managementPct);
  const strFixed = strExpenses.linens + strExpenses.consumables +
    strExpenses.furnishingAmortized + strExpenses.furnitureReservePct +
    strExpenses.photography + strExpenses.dynamicPricingTool +
    strExpenses.utilities + strExpenses.insurance + strExpenses.propertyTax +
    strExpenses.maintenance + strExpenses.capex +
    strExpenses.smartLocks + strExpenses.securityCameras;
  const annualDebtService = monthlyMortgage * 12;
  // occ s.t. netPerBookedNight × occ × 365 − fixed − debt = ltrCashFlow
  const requiredNights = netPerBookedNight > 0
    ? (ltrCashFlow + strFixed + annualDebtService) / netPerBookedNight
    : 365;
  const strBreakEvenOccupancy = Math.min(100, Math.max(0, Math.round((requiredNights / 365) * 100 * 10) / 10));

  const revenueUplift = ltrAnnualRent > 0
    ? Math.round(((strAnnualRevenue - ltrAnnualRent) / ltrAnnualRent) * 1000) / 10
    : 0;
  const expenseOverhead = Math.max(0, strAnnualExpenses - ltrAnnualExpenses);

  // Recommendation logic: use risk-adjusted CoC comparison
  // STR has more risk (execution, regulation, seasonality) so we apply a 15% risk premium
  // to STR CoC before comparing. If risk-adjusted STR CoC > LTR CoC by ≥ 2pp, recommend STR.
  const strRiskAdjustedCoC = strCoC * 0.85;
  let recommendation: 'STR' | 'LTR' | 'EITHER';
  if (strRiskAdjustedCoC >= ltrCoC + 2) {
    recommendation = 'STR';
  } else if (ltrCoC >= strRiskAdjustedCoC + 2) {
    recommendation = 'LTR';
  } else {
    recommendation = 'EITHER';
  }

  const plainEnglish = [
    `STR generates $${strAnnualRevenue.toLocaleString()} in annual gross revenue vs. $${ltrAnnualRent.toLocaleString()} in LTR rent — a ${revenueUplift}% revenue uplift.`,
    `However, STR expenses are $${expenseOverhead.toLocaleString()} higher per year due to platform fees, cleaning, furnishing, and higher insurance.`,
    `Net result: STR cash flow is $${strCashFlow.toLocaleString()} vs. LTR cash flow of $${Math.round(ltrCashFlow).toLocaleString()}.`,
    `STR CoC is ${strCoC.toFixed(1)}% vs. LTR CoC of ${ltrCoC.toFixed(1)}%.`,
    `The STR needs at least ${strBreakEvenOccupancy}% occupancy to match LTR returns.`,
    `Recommendation: ${recommendation === 'STR' ? 'Short-term rental offers materially better risk-adjusted returns in this scenario.' : recommendation === 'LTR' ? 'Long-term rental offers better risk-adjusted returns given the STR expense overhead.' : 'Both models produce similar risk-adjusted returns — personal preference and bandwidth should guide the decision.'}`,
  ].join(' ');

  return {
    strAnnualRevenue,
    ltrAnnualRent,
    strAnnualExpenses,
    ltrAnnualExpenses: Math.round(ltrAnnualExpenses),
    strCashFlow,
    ltrCashFlow: Math.round(ltrCashFlow),
    strCoC: Math.round(strCoC * 100) / 100,
    ltrCoC: Math.round(ltrCoC * 100) / 100,
    strBreakEvenOccupancy,
    revenueUplift,
    expenseOverhead,
    recommendation,
    plainEnglish,
  };
}

// ============================================================
// Main exported function
// ============================================================

/**
 * Calculate full STR investment metrics for a property.
 *
 * All monetary inputs are dollars. Monetary values in the output
 * are also dollars (suitable for display). Internal intermediates
 * use integer cents only where noted.
 *
 * @example
 * const result = calculateSTR({
 *   purchasePrice: 450000,
 *   downPaymentPct: 20,
 *   mortgageRate: 7.25,
 *   loanTerm: 30,
 *   estimatedADR: 185,
 *   estimatedOccupancy: 0.65,
 *   avgStayLength: 3.5,
 *   cleaningFeePerStay: 120,
 *   platform: 'airbnb',
 *   managementPct: 0,
 *   furnishingBudget: 18000,
 *   monthlyUtilities: 250,
 *   monthlyInsurance: 200,
 *   annualPropertyTax: 5400,
 *   ltrMonthlyRent: 2400,
 * });
 */
export function calculateSTR(input: STRCalculatorInput): STRCalculatorResult {
  // --- Debt service ---
  const downPayment = Math.round(input.purchasePrice * (input.downPaymentPct / 100));
  const loanAmount = input.purchasePrice - downPayment;
  const monthlyMortgage = calcMortgage(loanAmount, input.mortgageRate, input.loanTerm);

  // --- Revenue ---
  const revenue = calcRevenue(input);

  // --- Expenses ---
  const expenses = calcExpenses(input, revenue, monthlyMortgage);

  // --- Metrics ---
  const metrics = calcMetrics(input, revenue, expenses, monthlyMortgage);

  // --- Scenarios ---
  const scenarios = buildScenarios(input, expenses, revenue, monthlyMortgage);

  // --- STR vs LTR comparison ---
  const comparison = compareSTRvsLTR(input, metrics, expenses, revenue, monthlyMortgage);

  // --- Self-managed note ---
  const selfManagedNote = input.managementPct === 0
    ? 'Self-managed STR requires approximately 15–20 hours per week for guest communication, scheduling cleaners, restocking supplies, and handling issues. Factor in your time cost before declaring this model superior to hiring a property manager.'
    : undefined;

  return {
    asOfDate: new Date().toISOString().split('T')[0]!,
    source: 'STR Calculator Engine — LootVue v1.0. Platform fees: Airbnb 15.5% (Oct 2025, airbnb.com/help/article/1857); VRBO 8% (hospitable.com, 2025). Occupancy benchmarks: AirDNA US 2025.',
    input,
    revenue,
    expenses,
    metrics,
    scenarios,
    comparison,
    selfManagedNote,
  };
}
