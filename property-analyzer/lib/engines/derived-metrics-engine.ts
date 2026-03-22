/**
 * Derived Metrics Engine — computes investment-relevant RATIOS and RELATIONSHIPS
 * from raw market data. Raw numbers are useless. Ratios tell the story.
 *
 * Every chart should show a RELATIONSHIP, not a single variable.
 */

// ============================================================
// Core Ratio Types
// ============================================================

export interface DerivedMetricPoint {
  date: string;
  value: number;
  components?: Record<string, number>; // the raw values that produced this ratio
}

export interface CorrelationPair {
  x: number;
  y: number;
  label: string;
  color?: string;
  size?: number;
}

export interface DerivedMarketProfile {
  priceToRent: DerivedMetricPoint[];        // Price / (Annual Rent) — lower = better for buyers
  priceToIncome: DerivedMetricPoint[];      // Price / Median Income — affordability
  rentYield: DerivedMetricPoint[];          // (Annual Rent / Price) × 100 — investor return
  capRateTrend: DerivedMetricPoint[];       // NOI / Price over time
  inventoryAbsorption: DerivedMetricPoint[]; // Months to clear current inventory
  affordabilityIndex: DerivedMetricPoint[]; // Mortgage payment as % of income
  pricePerSqft: DerivedMetricPoint[];       // Normalized price
  rentPerSqft: DerivedMetricPoint[];        // Normalized rent
  cashFlowPerUnit: DerivedMetricPoint[];    // Monthly cash flow per door
  appreciationVsRentGrowth: DerivedMetricPoint[]; // Price growth - Rent growth (divergence)
}

// ============================================================
// Ratio Generators
// ============================================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function formatMonth(year: number, month: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month - 1]} '${String(year).slice(2)}`;
}

/**
 * Generate full derived market profile for a market.
 * In production: computed from real FRED/Census/BLS data.
 * For now: deterministic from market parameters.
 */
export function computeDerivedMetrics(market: {
  name: string;
  zip: string;
  medianPrice: number;
  medianRent: number;
  medianIncome: number;
  priceGrowthRate: number; // annual %
  rentGrowthRate: number;  // annual %
  incomeGrowthRate: number;
  mortgageRate: number;
  inventory: number;
  monthlyExpenseRatio: number; // expenses as % of rent
}, months: number = 36): DerivedMarketProfile {
  const rand = seededRandom(market.zip.split("").reduce((a, c) => a + c.charCodeAt(0), 0));

  let price = market.medianPrice * 0.92;
  let rent = market.medianRent * 0.94;
  let income = market.medianIncome * 0.95;
  let inventory = market.inventory + 0.5;

  const priceToRent: DerivedMetricPoint[] = [];
  const priceToIncome: DerivedMetricPoint[] = [];
  const rentYield: DerivedMetricPoint[] = [];
  const capRateTrend: DerivedMetricPoint[] = [];
  const inventoryAbsorption: DerivedMetricPoint[] = [];
  const affordabilityIndex: DerivedMetricPoint[] = [];
  const pricePerSqft: DerivedMetricPoint[] = [];
  const rentPerSqft: DerivedMetricPoint[] = [];
  const cashFlowPerUnit: DerivedMetricPoint[] = [];
  const appreciationVsRentGrowth: DerivedMetricPoint[] = [];

  const avgSqft = 1600;
  const downPct = 0.20;

  for (let i = 0; i < months; i++) {
    const m = ((2 + i) % 12) + 1;
    const y = 2023 + Math.floor((2 + i) / 12);
    const date = formatMonth(y, m);

    const noise = (rand() - 0.5) * 0.01;
    price *= 1 + market.priceGrowthRate / 100 / 12 + noise;
    rent *= 1 + market.rentGrowthRate / 100 / 12 + (rand() - 0.5) * 0.008;
    income *= 1 + market.incomeGrowthRate / 100 / 12 + (rand() - 0.5) * 0.003;
    inventory += (rand() - 0.5) * 0.15;
    inventory = Math.max(0.5, inventory);

    const annualRent = rent * 12;
    const noi = annualRent * (1 - market.monthlyExpenseRatio);
    const loanAmt = price * (1 - downPct);
    const monthlyRate = market.mortgageRate / 100 / 12;
    const mortgagePayment = loanAmt * monthlyRate * Math.pow(1 + monthlyRate, 360) / (Math.pow(1 + monthlyRate, 360) - 1);
    const monthlyExpenses = rent * market.monthlyExpenseRatio;
    const cashFlow = rent - mortgagePayment - monthlyExpenses;

    priceToRent.push({ date, value: Math.round(price / annualRent * 10) / 10, components: { price: Math.round(price), annualRent: Math.round(annualRent) } });
    priceToIncome.push({ date, value: Math.round(price / income * 10) / 10, components: { price: Math.round(price), income: Math.round(income) } });
    rentYield.push({ date, value: Math.round(annualRent / price * 1000) / 10, components: { annualRent: Math.round(annualRent), price: Math.round(price) } });
    capRateTrend.push({ date, value: Math.round(noi / price * 1000) / 10, components: { noi: Math.round(noi), price: Math.round(price) } });
    inventoryAbsorption.push({ date, value: Math.round(inventory * 10) / 10 });
    affordabilityIndex.push({ date, value: Math.round(mortgagePayment / (income / 12) * 1000) / 10, components: { mortgagePayment: Math.round(mortgagePayment), monthlyIncome: Math.round(income / 12) } });
    pricePerSqft.push({ date, value: Math.round(price / avgSqft) });
    rentPerSqft.push({ date, value: Math.round(rent / avgSqft * 100) / 100 });
    cashFlowPerUnit.push({ date, value: Math.round(cashFlow) });

    // Price appreciation vs rent growth divergence
    const priceChgPct = i > 0 ? ((price / (price / (1 + market.priceGrowthRate / 100 / 12 + noise))) - 1) * 100 * 12 : market.priceGrowthRate;
    const rentChgPct = i > 0 ? market.rentGrowthRate : market.rentGrowthRate;
    appreciationVsRentGrowth.push({ date, value: Math.round((priceChgPct - rentChgPct) * 10) / 10, components: { priceGrowth: Math.round(priceChgPct * 10) / 10, rentGrowth: Math.round(rentChgPct * 10) / 10 } });
  }

  return {
    priceToRent,
    priceToIncome,
    rentYield,
    capRateTrend,
    inventoryAbsorption,
    affordabilityIndex,
    pricePerSqft,
    rentPerSqft,
    cashFlowPerUnit,
    appreciationVsRentGrowth,
  };
}

// ============================================================
// Cross-Market Correlation Data
// ============================================================

/**
 * Generate scatter plot data showing relationship between two metrics
 * across multiple markets — e.g., "Price-to-Rent vs Appreciation"
 */
export function computeCorrelation(
  markets: Array<{
    name: string;
    color: string;
    xValue: number;
    yValue: number;
    size?: number;
  }>
): CorrelationPair[] {
  return markets.map((m) => ({
    x: m.xValue,
    y: m.yValue,
    label: m.name,
    color: m.color,
    size: m.size || 8,
  }));
}

/**
 * Compute multi-market ratio comparison for parallel coordinates
 * Each market gets normalized ratios across key dimensions
 */
export function computeMarketRatios(markets: Array<{
  name: string;
  color: string;
  medianPrice: number;
  medianRent: number;
  medianIncome: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  priceChange: number;
}>): Array<{
  name: string;
  color: string;
  values: number[];
  labels: string[];
}> {
  return markets.map((m) => {
    const priceToRent = m.medianPrice / (m.medianRent * 12);
    const priceToIncome = m.medianPrice / m.medianIncome;
    const rentYield = (m.medianRent * 12) / m.medianPrice * 100;
    const affordability = m.medianPrice / m.medianIncome;

    return {
      name: m.name,
      color: m.color,
      values: [
        Math.round(priceToRent * 10) / 10,
        Math.round(priceToIncome * 10) / 10,
        Math.round(rentYield * 10) / 10,
        m.popGrowth,
        m.jobGrowth,
        m.inventory,
        m.priceChange,
      ],
      labels: [
        "Price/Rent",
        "Price/Income",
        "Rent Yield %",
        "Pop Growth %",
        "Job Growth %",
        "Inventory (mo)",
        "Price Chg %",
      ],
    };
  });
}

// ============================================================
// Ratio Descriptions — what each ratio MEANS
// ============================================================

export const RATIO_DESCRIPTIONS: Record<string, {
  name: string;
  formula: string;
  interpretation: string;
  bullish: string;
  bearish: string;
  benchmark: number;
  unit: string;
}> = {
  priceToRent: {
    name: "Price-to-Rent Ratio",
    formula: "Home Price ÷ Annual Rent",
    interpretation: "How many years of rent it takes to equal the purchase price. Lower = better value for buyers/investors.",
    bullish: "Below 15 — buying is significantly cheaper than renting. Strong investor value.",
    bearish: "Above 25 — market is overvalued relative to rents. Cash flow will be negative.",
    benchmark: 19.5,
    unit: "x",
  },
  priceToIncome: {
    name: "Price-to-Income Ratio",
    formula: "Median Home Price ÷ Median Household Income",
    interpretation: "Affordability measure. How many years of income to buy a home. Lower = more affordable = more potential buyers.",
    bullish: "Below 4x — affordable market with a deep buyer pool. Prices have room to grow.",
    bearish: "Above 6x — affordability ceiling. First-time buyers priced out. Growth limited.",
    benchmark: 4.8,
    unit: "x",
  },
  rentYield: {
    name: "Gross Rent Yield",
    formula: "(Annual Rent ÷ Home Price) × 100",
    interpretation: "Annual rental income as % of property value. Higher = better cash flow potential. Inverse of price-to-rent.",
    bullish: "Above 7% — strong cash flow market. Properties likely to be cash-flow positive.",
    bearish: "Below 4% — appreciation-dependent market. Need significant price growth to justify.",
    benchmark: 5.1,
    unit: "%",
  },
  affordabilityIndex: {
    name: "Affordability Index",
    formula: "Monthly Mortgage Payment ÷ Monthly Income × 100",
    interpretation: "What % of income goes to the mortgage. The 28% rule says above 28% is unaffordable.",
    bullish: "Below 25% — affordable, deep buyer pool, demand support.",
    bearish: "Above 35% — stretched. Vulnerable to rate increases or income shocks.",
    benchmark: 28,
    unit: "%",
  },
  appreciationVsRentGrowth: {
    name: "Price-Rent Divergence",
    formula: "Annual Price Growth % − Annual Rent Growth %",
    interpretation: "When prices grow faster than rents, yields compress. When rents grow faster, yields expand. Divergence signals unsustainability.",
    bullish: "Negative (rents growing faster) — yields expanding, cash flow improving.",
    bearish: "Positive >3% (prices outpacing rents) — bubble signal, yields compressing.",
    benchmark: 0,
    unit: "pp",
  },
};
