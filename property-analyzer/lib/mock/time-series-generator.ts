import type {
  TimeSeriesPoint,
  TimeSeriesBand,
  MultiSeries,
  CapitalFlowPoint,
  ScenarioSeries,
  KPIDriverBar,
  SankeyLink,
  SankeyNode,
} from "@/lib/types/time-series";

// ============================================================
// Deterministic time-series mock data generator
// Uses zip code hash for consistency across page loads
// ============================================================

function hashZip(zip: string): number {
  return zip.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

/** Seeded pseudo-random number generator (deterministic from seed) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Format date as "MMM 'YY" */
function formatMonth(year: number, month: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month - 1]} '${String(year).slice(2)}`;
}

/** Format date as ISO "YYYY-MM" */
function isoMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ============================================================
// Core generators
// ============================================================

/** Generate monthly time-series with trend + noise + seasonality */
export function generateTimeSeries(
  zip: string,
  options: {
    startValue: number;
    monthlyGrowthRate?: number;  // e.g., 0.003 for ~3.6% annual
    volatility?: number;         // e.g., 0.02 for 2% noise
    seasonalAmplitude?: number;  // e.g., 0.05 for 5% seasonal swing
    months?: number;             // default 24
    startYear?: number;
    startMonth?: number;
  }
): TimeSeriesPoint[] {
  const {
    startValue,
    monthlyGrowthRate = 0.003,
    volatility = 0.02,
    seasonalAmplitude = 0,
    months = 24,
    startYear = 2024,
    startMonth = 3,
  } = options;

  const rand = seededRandom(hashZip(zip) + Math.round(startValue));
  const points: TimeSeriesPoint[] = [];
  let value = startValue;

  for (let i = 0; i < months; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);
    const seasonal = seasonalAmplitude * Math.sin(((m - 1) / 12) * Math.PI * 2);
    const noise = (rand() - 0.5) * 2 * volatility;
    value = value * (1 + monthlyGrowthRate + seasonal + noise);
    points.push({ date: formatMonth(y, m), value: Math.round(value * 100) / 100 });
  }

  return points;
}

/** Generate time-series with confidence bands (for forecasts) */
export function generateForecastSeries(
  zip: string,
  options: {
    startValue: number;
    monthlyGrowthRate?: number;
    months?: number;
    confidenceWidthPct?: number; // % band width, widens over time
  }
): TimeSeriesBand[] {
  const {
    startValue,
    monthlyGrowthRate = 0.003,
    months = 36,
    confidenceWidthPct = 0.15,
  } = options;

  const rand = seededRandom(hashZip(zip) + Math.round(startValue * 7));
  const points: TimeSeriesBand[] = [];
  let value = startValue;

  for (let i = 0; i < months; i++) {
    const m = ((2 + i) % 12) + 1;
    const y = 2024 + Math.floor((2 + i) / 12);
    const noise = (rand() - 0.5) * 0.01;
    value = value * (1 + monthlyGrowthRate + noise);
    const spread = value * confidenceWidthPct * (i / months);
    points.push({
      date: formatMonth(y, m),
      value: Math.round(value),
      upper: Math.round(value + spread),
      lower: Math.round(value - spread),
    });
  }

  return points;
}

/** Generate multi-metric time-series (price + rent + population + jobs) */
export function generateMultiSeries(
  zip: string,
  months: number = 24
): MultiSeries[] {
  const h = hashZip(zip);
  const rand = seededRandom(h);
  const data: MultiSeries[] = [];

  let price = 300000 + (h % 300) * 1000;
  let rent = 1400 + (h % 10) * 100;
  let pop = 40000 + (h % 50) * 1000;
  let jobs = 20000 + (h % 30) * 1000;

  for (let i = 0; i < months; i++) {
    const m = ((2 + i) % 12) + 1;
    const y = 2024 + Math.floor((2 + i) / 12);
    price *= 1 + 0.003 + (rand() - 0.5) * 0.01;
    rent *= 1 + 0.004 + (rand() - 0.5) * 0.008;
    pop *= 1 + 0.002 + (rand() - 0.5) * 0.001;
    jobs *= 1 + 0.003 + (rand() - 0.5) * 0.005;

    data.push({
      date: formatMonth(y, m),
      price: Math.round(price),
      rent: Math.round(rent),
      population: Math.round(pop),
      jobs: Math.round(jobs),
    });
  }

  return data;
}

// ============================================================
// Scenario generators
// ============================================================

/** Generate bull/base/bear scenario projections */
export function generateScenarios(
  zip: string,
  currentPrice: number = 400000
): ScenarioSeries[] {
  const bullData = generateForecastSeries(zip, {
    startValue: currentPrice,
    monthlyGrowthRate: 0.006,
    months: 60,
    confidenceWidthPct: 0.12,
  });

  const baseData = generateForecastSeries(zip, {
    startValue: currentPrice,
    monthlyGrowthRate: 0.003,
    months: 60,
    confidenceWidthPct: 0.08,
  });

  const bearData = generateForecastSeries(zip, {
    startValue: currentPrice,
    monthlyGrowthRate: -0.001,
    months: 60,
    confidenceWidthPct: 0.10,
  });

  return [
    { name: "bull", color: "#22c55e", data: bullData },
    { name: "base", color: "#3b82f6", data: baseData },
    { name: "bear", color: "#ef4444", data: bearData },
  ];
}

// ============================================================
// Capital flow generators
// ============================================================

/** Generate capital flow timeline (stacked area data) */
export function generateCapitalFlowTimeline(
  zip: string,
  months: number = 24
): CapitalFlowPoint[] {
  const rand = seededRandom(hashZip(zip) + 999);
  const data: CapitalFlowPoint[] = [];

  let inst = 5 + (hashZip(zip) % 10);
  let retail = 20 + (hashZip(zip) % 15);
  let foreign = 2 + (hashZip(zip) % 5);
  let ex1031 = 8 + (hashZip(zip) % 8);
  let crowd = 1 + (hashZip(zip) % 3);

  for (let i = 0; i < months; i++) {
    const m = ((2 + i) % 12) + 1;
    const y = 2024 + Math.floor((2 + i) / 12);

    inst *= 1 + (rand() - 0.4) * 0.1;
    retail *= 1 + (rand() - 0.45) * 0.08;
    foreign *= 1 + (rand() - 0.4) * 0.12;
    ex1031 *= 1 + (rand() - 0.4) * 0.1;
    crowd *= 1 + (rand() - 0.35) * 0.15;

    data.push({
      date: formatMonth(y, m),
      institutional: Math.round(inst * 1000000),
      retail: Math.round(retail * 1000000),
      foreign: Math.round(foreign * 1000000),
      exchange1031: Math.round(ex1031 * 1000000),
      crowdfunding: Math.round(crowd * 1000000),
      netFlow: Math.round((inst + retail + foreign + ex1031 + crowd) * 1000000),
    });
  }

  return data;
}

/** Generate Sankey flow data for money flow visualization */
export function generateSankeyData(zip: string): {
  nodes: SankeyNode[];
  links: SankeyLink[];
} {
  const h = hashZip(zip);
  const s = (h % 100) / 100;

  const nodes: SankeyNode[] = [
    { name: "1031 Exchange" },
    { name: "Institutional" },
    { name: "Foreign Capital" },
    { name: "Tax Migration" },
    { name: "Retail/Organic" },
    { name: "Crowdfunding" },
    { name: "Residential" },
    { name: "Commercial" },
    { name: "Mixed-Use" },
    { name: "Land" },
  ];

  const links: SankeyLink[] = [
    { source: "1031 Exchange", target: "Residential", value: Math.round(25 + s * 20) },
    { source: "1031 Exchange", target: "Commercial", value: Math.round(10 + s * 15) },
    { source: "1031 Exchange", target: "Land", value: Math.round(3 + s * 5) },
    { source: "Institutional", target: "Residential", value: Math.round(8 + s * 12) },
    { source: "Institutional", target: "Commercial", value: Math.round(12 + s * 10) },
    { source: "Institutional", target: "Mixed-Use", value: Math.round(5 + s * 8) },
    { source: "Foreign Capital", target: "Residential", value: Math.round(5 + s * 8) },
    { source: "Foreign Capital", target: "Commercial", value: Math.round(3 + s * 5) },
    { source: "Tax Migration", target: "Residential", value: Math.round(20 + s * 15) },
    { source: "Tax Migration", target: "Commercial", value: Math.round(5 + s * 5) },
    { source: "Retail/Organic", target: "Residential", value: Math.round(30 + s * 10) },
    { source: "Retail/Organic", target: "Mixed-Use", value: Math.round(3 + s * 5) },
    { source: "Crowdfunding", target: "Mixed-Use", value: Math.round(3 + s * 4) },
    { source: "Crowdfunding", target: "Commercial", value: Math.round(2 + s * 3) },
  ];

  return { nodes, links };
}

// ============================================================
// KPI driver generators
// ============================================================

/** Generate KPI driver bars for horizontal bar chart */
export function generateKPIDrivers(zip: string): KPIDriverBar[] {
  const h = hashZip(zip);
  const s = (h % 100) / 100;

  return [
    { name: "Job Growth", impact: 15 + s * 10, dimension: "Economic", value: `+${(2 + s * 3).toFixed(1)}%`, trend: "accelerating" },
    { name: "Population Growth", impact: 10 + s * 8, dimension: "Demographic", value: `+${(1 + s * 2).toFixed(1)}%`, trend: "stable" },
    { name: "Low Inventory", impact: 8 + s * 12, dimension: "Supply/Demand", value: `${(2 + s * 2).toFixed(1)} months`, trend: "tightening" },
    { name: "Income Growth", impact: 6 + s * 8, dimension: "Demographic", value: `+${(3 + s * 3).toFixed(1)}%`, trend: "accelerating" },
    { name: "Transit Projects", impact: 5 + s * 6, dimension: "Infrastructure", value: `$${(50 + s * 100).toFixed(0)}M`, trend: "expanding" },
    { name: "School Ratings", impact: 3 + s * 5, dimension: "Quality of Life", value: `${(7 + s * 2).toFixed(1)}/10`, trend: "improving" },
    { name: "Rising Insurance", impact: -(3 + s * 5), dimension: "Macro Risk", value: `+${(8 + s * 15).toFixed(0)}% YoY`, trend: "accelerating" },
    { name: "Interest Rates", impact: -(4 + s * 6), dimension: "Macro Risk", value: `${(6.5 + s * 1.5).toFixed(2)}%`, trend: "elevated" },
    { name: "Affordability", impact: -(2 + s * 4), dimension: "Supply/Demand", value: `${(90 + s * 30).toFixed(0)} index`, trend: "declining" },
    { name: "Crime Rate", impact: -(1 + s * 3), dimension: "Quality of Life", value: `${(2 + s * 3).toFixed(1)}/1K`, trend: "stable" },
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

/** Generate dimension breakdown for stacked bars */
export function generateDimensionBreakdown(zip: string): Array<{
  dimension: string;
  score: number;
  weight: number;
  weightedScore: number;
  color: string;
  subMetrics: Array<{ name: string; score: number; impact: string }>;
}> {
  const h = hashZip(zip);
  const s = (h % 100) / 100;

  return [
    {
      dimension: "Financial",
      score: Math.round(55 + s * 35),
      weight: 0.20,
      weightedScore: Math.round((55 + s * 35) * 0.20),
      color: "#22c55e",
      subMetrics: [
        { name: "Cap Rate", score: Math.round(50 + s * 40), impact: "positive" },
        { name: "Cash Flow", score: Math.round(40 + s * 45), impact: "positive" },
        { name: "DSCR", score: Math.round(55 + s * 30), impact: "positive" },
      ],
    },
    {
      dimension: "Comps",
      score: Math.round(50 + s * 30),
      weight: 0.15,
      weightedScore: Math.round((50 + s * 30) * 0.15),
      color: "#3b82f6",
      subMetrics: [
        { name: "Price vs Comps", score: Math.round(45 + s * 35), impact: "neutral" },
        { name: "DOM Trend", score: Math.round(55 + s * 30), impact: "positive" },
      ],
    },
    {
      dimension: "Demographic",
      score: Math.round(60 + s * 30),
      weight: 0.12,
      weightedScore: Math.round((60 + s * 30) * 0.12),
      color: "#a855f7",
      subMetrics: [
        { name: "Pop Growth", score: Math.round(55 + s * 35), impact: "positive" },
        { name: "Income Growth", score: Math.round(60 + s * 30), impact: "positive" },
        { name: "Migration", score: Math.round(50 + s * 40), impact: "positive" },
      ],
    },
    {
      dimension: "Economic",
      score: Math.round(55 + s * 35),
      weight: 0.12,
      weightedScore: Math.round((55 + s * 35) * 0.12),
      color: "#f59e0b",
      subMetrics: [
        { name: "Job Growth", score: Math.round(60 + s * 30), impact: "positive" },
        { name: "Wage Growth", score: Math.round(50 + s * 35), impact: "positive" },
        { name: "Diversification", score: Math.round(55 + s * 25), impact: "neutral" },
      ],
    },
    {
      dimension: "Infrastructure",
      score: Math.round(50 + s * 40),
      weight: 0.10,
      weightedScore: Math.round((50 + s * 40) * 0.10),
      color: "#06b6d4",
      subMetrics: [
        { name: "Permits", score: Math.round(55 + s * 30), impact: "positive" },
        { name: "Transit", score: Math.round(45 + s * 40), impact: "positive" },
      ],
    },
    {
      dimension: "Quality of Life",
      score: Math.round(60 + s * 25),
      weight: 0.10,
      weightedScore: Math.round((60 + s * 25) * 0.10),
      color: "#ec4899",
      subMetrics: [
        { name: "Schools", score: Math.round(65 + s * 20), impact: "positive" },
        { name: "Crime", score: Math.round(55 + s * 30), impact: "neutral" },
        { name: "Walkability", score: Math.round(50 + s * 35), impact: "positive" },
      ],
    },
    {
      dimension: "Supply/Demand",
      score: Math.round(55 + s * 35),
      weight: 0.12,
      weightedScore: Math.round((55 + s * 35) * 0.12),
      color: "#14b8a6",
      subMetrics: [
        { name: "Inventory", score: Math.round(60 + s * 30), impact: "positive" },
        { name: "Rent Growth", score: Math.round(55 + s * 35), impact: "positive" },
        { name: "Affordability", score: Math.round(40 + s * 30), impact: "negative" },
      ],
    },
    {
      dimension: "Macro Risk",
      score: Math.round(45 + s * 30),
      weight: 0.09,
      weightedScore: Math.round((45 + s * 30) * 0.09),
      color: "#ef4444",
      subMetrics: [
        { name: "Rate Sensitivity", score: Math.round(40 + s * 25), impact: "negative" },
        { name: "Insurance", score: Math.round(50 + s * 30), impact: "neutral" },
        { name: "Climate", score: Math.round(55 + s * 30), impact: "neutral" },
      ],
    },
  ];
}
