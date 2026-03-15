/**
 * Insight Engine — turns raw data into human-readable investment narratives.
 *
 * Every number in the app should answer THREE questions:
 * 1. WHAT is the number?
 * 2. Is it GOOD or BAD? (context vs benchmarks)
 * 3. WHY does it matter? (what happens next because of this)
 *
 * This engine generates contextual insights, causal chains,
 * and actionable narratives from raw metrics.
 */

// ============================================================
// Metric Context — "Is this number good or bad?"
// ============================================================

export interface MetricContext {
  value: number;
  label: string;
  formatted: string;
  rating: "excellent" | "strong" | "average" | "weak" | "poor";
  percentile: number; // 0-100 vs national benchmarks
  benchmark: string; // e.g., "National avg: 5.2%"
  insight: string; // one-line contextual explanation
}

const BENCHMARKS = {
  capRate: { excellent: 8, strong: 6, average: 5, weak: 4, national: 5.2 },
  cashOnCash: { excellent: 12, strong: 8, average: 5, weak: 3, national: 6.1 },
  dscr: { excellent: 1.5, strong: 1.25, average: 1.1, weak: 1.0, national: 1.2 },
  priceToIncome: { excellent: 3, strong: 4, average: 5, weak: 6, national: 4.8 },
  priceToRent: { excellent: 15, strong: 18, average: 20, weak: 25, national: 19.5 },
  popGrowth: { excellent: 3, strong: 2, average: 1, weak: 0, national: 0.5 },
  jobGrowth: { excellent: 4, strong: 3, average: 2, weak: 1, national: 1.8 },
  inventoryMonths: { excellent: 2, strong: 3, average: 4, weak: 5, national: 3.8 },
  appreciation1yr: { excellent: 8, strong: 5, average: 3, weak: 0, national: 3.5 },
  mortgageRate: { low: 5, moderate: 6.5, high: 7.5, veryHigh: 8.5, current: 6.95 },
  vacancy: { excellent: 3, strong: 5, average: 7, weak: 10, national: 6.2 },
  dom: { hot: 15, strong: 30, balanced: 45, slow: 60, national: 38 },
};

export function contextualizeMetric(
  metric: keyof typeof BENCHMARKS,
  value: number
): MetricContext {
  const b = BENCHMARKS[metric];
  const isInverse = ["priceToIncome", "priceToRent", "inventoryMonths", "mortgageRate", "vacancy", "dom"].includes(metric);

  let rating: MetricContext["rating"];
  let percentile: number;

  if (isInverse) {
    // Lower is better
    const keys = Object.keys(b) as string[];
    const thresholds = Object.values(b).filter((v): v is number => typeof v === "number" && v !== (b as Record<string, number>).national && v !== (b as Record<string, number>).current);
    if (value <= thresholds[0]) { rating = "excellent"; percentile = 90; }
    else if (value <= thresholds[1]) { rating = "strong"; percentile = 70; }
    else if (value <= thresholds[2]) { rating = "average"; percentile = 50; }
    else if (value <= thresholds[3]) { rating = "weak"; percentile = 25; }
    else { rating = "poor"; percentile = 10; }
  } else {
    // Higher is better
    const vals = Object.values(b).filter((v): v is number => typeof v === "number");
    if (value >= vals[0]) { rating = "excellent"; percentile = 90; }
    else if (value >= vals[1]) { rating = "strong"; percentile = 70; }
    else if (value >= vals[2]) { rating = "average"; percentile = 50; }
    else if (value >= vals[3]) { rating = "weak"; percentile = 25; }
    else { rating = "poor"; percentile = 10; }
  }

  const national = (b as Record<string, number>).national ?? (b as Record<string, number>).current ?? 0;

  return {
    value,
    label: METRIC_LABELS[metric] || metric,
    formatted: formatMetricValue(metric, value),
    rating,
    percentile,
    benchmark: `National avg: ${formatMetricValue(metric, national)}`,
    insight: generateMetricInsight(metric, value, rating, national),
  };
}

const METRIC_LABELS: Record<string, string> = {
  capRate: "Cap Rate",
  cashOnCash: "Cash-on-Cash Return",
  dscr: "Debt Service Coverage",
  priceToIncome: "Price-to-Income Ratio",
  priceToRent: "Price-to-Rent Ratio",
  popGrowth: "Population Growth",
  jobGrowth: "Job Growth",
  inventoryMonths: "Months of Inventory",
  appreciation1yr: "1-Year Appreciation",
  mortgageRate: "Mortgage Rate",
  vacancy: "Vacancy Rate",
  dom: "Days on Market",
};

function formatMetricValue(metric: string, value: number): string {
  if (["capRate", "cashOnCash", "popGrowth", "jobGrowth", "appreciation1yr", "mortgageRate", "vacancy"].includes(metric)) {
    return `${value.toFixed(1)}%`;
  }
  if (metric === "dscr") return value.toFixed(2) + "x";
  if (metric === "priceToIncome" || metric === "priceToRent") return value.toFixed(1) + "x";
  if (metric === "inventoryMonths") return value.toFixed(1) + " months";
  if (metric === "dom") return Math.round(value) + " days";
  return value.toFixed(1);
}

function generateMetricInsight(
  metric: string,
  value: number,
  rating: string,
  national: number
): string {
  const diff = ((value - national) / national * 100).toFixed(0);
  const above = value > national;

  const insights: Record<string, Record<string, string>> = {
    capRate: {
      excellent: `At ${value.toFixed(1)}%, this property generates exceptional income relative to its price — ${diff}% above the national average. Strong cash flow potential.`,
      strong: `${value.toFixed(1)}% cap rate exceeds the investor threshold of 6%. This property should cash flow positive from day one.`,
      average: `Cap rate of ${value.toFixed(1)}% is near the national average. Returns are moderate — consider whether appreciation will compensate.`,
      weak: `At ${value.toFixed(1)}%, this cap rate is below typical investor thresholds. You're relying on appreciation rather than income for returns.`,
      poor: `Cap rate of ${value.toFixed(1)}% signals an overpriced asset relative to its income. Negative leverage risk if rates stay elevated.`,
    },
    popGrowth: {
      excellent: `Population growing at ${value.toFixed(1)}% annually — ${Math.abs(Number(diff))}% faster than the national average. This creates sustained housing demand pressure. Historically, markets with 3%+ population growth see 2-3x the price appreciation.`,
      strong: `Solid ${value.toFixed(1)}% population growth. More people = more housing demand = upward price pressure. This is a leading indicator for 12-24 month appreciation.`,
      average: `Population growth of ${value.toFixed(1)}% is modest. Enough to maintain demand but not enough to create supply pressure on its own.`,
      weak: `Population growth of only ${value.toFixed(1)}% is below the national average. Without migration inflow, demand growth will be limited.`,
      poor: `Flat or negative population growth signals a market losing residents. This is a structural headwind for property values — fewer people means less demand.`,
    },
    jobGrowth: {
      excellent: `Job growth of ${value.toFixed(1)}% is exceptional — nearly ${(value / 1.8).toFixed(1)}x the national rate. Job creation is the #1 predictor of housing demand. When employers add jobs, housing follows within 6-12 months.`,
      strong: `${value.toFixed(1)}% job growth indicates a healthy, expanding local economy. New jobs bring new residents who need housing — a strong demand driver.`,
      average: `Job growth at ${value.toFixed(1)}% is tracking near national levels. Economy is stable but not a standout growth driver.`,
      weak: `Job growth of ${value.toFixed(1)}% is below average. Without strong employment, housing demand relies on migration from other markets.`,
      poor: `Weak job growth signals potential economic headwinds. Watch for employer layoffs or relocations that could accelerate the trend.`,
    },
    inventoryMonths: {
      excellent: `Only ${value.toFixed(1)} months of inventory — this is a seller's market. When inventory drops below 3 months, prices typically accelerate. Buyers are competing for limited supply.`,
      strong: `${value.toFixed(1)} months of inventory indicates a healthy market leaning toward sellers. Supply is constrained enough to support price growth.`,
      average: `${value.toFixed(1)} months of inventory represents a balanced market. Neither buyers nor sellers have a significant advantage.`,
      weak: `${value.toFixed(1)} months of supply is building toward buyer's market territory. Sellers may need to compete on price.`,
      poor: `${value.toFixed(1)}+ months of inventory signals oversupply. Expect price negotiations, longer selling times, and potential price declines.`,
    },
    appreciation1yr: {
      excellent: `${value.toFixed(1)}% annual appreciation significantly outperforms the national average. On a $400K property, that's $${Math.round(400000 * value / 100).toLocaleString()} in equity gained in one year.`,
      strong: `${value.toFixed(1)}% appreciation is solid — above inflation and building equity. Combined with cash flow, this creates a compelling total return.`,
      average: `${value.toFixed(1)}% appreciation is modest but positive. Roughly keeping pace with inflation-adjusted growth.`,
      weak: `Appreciation at ${value.toFixed(1)}% is barely keeping pace. Your returns are coming from cash flow, not value growth.`,
      poor: `Negative or flat appreciation means the market is softening. Timing is critical — this could be a buying opportunity if fundamentals are strong, or a warning to wait.`,
    },
    dom: {
      excellent: `Properties selling in ${Math.round(value)} days — a hot market. Low DOM means strong buyer demand and sellers have pricing power.`,
      strong: `${Math.round(value)} days on market indicates healthy demand. Properties are moving at a good pace.`,
      average: `${Math.round(value)} days is a balanced market. Properties sell within a reasonable timeframe.`,
      weak: `${Math.round(value)} days on market is slow. Buyers have more negotiation leverage and sellers may accept below asking.`,
      poor: `Properties sitting ${Math.round(value)}+ days signals weak demand. This is a strong negotiation position for buyers — motivated sellers likely.`,
    },
  };

  return insights[metric]?.[rating] ||
    `${METRIC_LABELS[metric] || metric}: ${formatMetricValue(metric, value)} (${above ? "above" : "below"} national avg of ${formatMetricValue(metric, national)})`;
}

// ============================================================
// Causal Chain — "Why is this happening and what comes next?"
// ============================================================

export interface CausalLink {
  cause: string;
  effect: string;
  direction: "positive" | "negative";
  confidence: "high" | "medium" | "low";
  timeframe: string;
}

export interface CausalChain {
  title: string;
  summary: string;
  links: CausalLink[];
  conclusion: string;
  actionability: "act_now" | "monitor" | "wait";
}

export function buildCausalChain(metrics: {
  popGrowth?: number;
  jobGrowth?: number;
  inventory?: number;
  dom?: number;
  priceChange?: number;
  mortgageRate?: number;
  permits?: number;
  migration?: number;
  capRate?: number;
}): CausalChain {
  const links: CausalLink[] = [];
  let bullishCount = 0;
  let bearishCount = 0;

  // Job growth → population growth
  if (metrics.jobGrowth && metrics.jobGrowth > 2) {
    links.push({
      cause: `Job growth at ${metrics.jobGrowth.toFixed(1)}%`,
      effect: "Attracting workers from other markets → population growth",
      direction: "positive",
      confidence: "high",
      timeframe: "6-12 months",
    });
    bullishCount++;
  }

  // Population growth → housing demand
  if (metrics.popGrowth && metrics.popGrowth > 1.5) {
    links.push({
      cause: `Population growing ${metrics.popGrowth.toFixed(1)}%/yr`,
      effect: "More households forming → increased housing demand",
      direction: "positive",
      confidence: "high",
      timeframe: "Ongoing",
    });
    bullishCount++;
  }

  // Low inventory → price pressure
  if (metrics.inventory && metrics.inventory < 3) {
    links.push({
      cause: `Only ${metrics.inventory.toFixed(1)} months of inventory`,
      effect: "Supply constrained → buyers compete → prices accelerate",
      direction: "positive",
      confidence: "high",
      timeframe: "1-6 months",
    });
    bullishCount++;
  } else if (metrics.inventory && metrics.inventory > 5) {
    links.push({
      cause: `${metrics.inventory.toFixed(1)} months of inventory building`,
      effect: "Oversupply forming → sellers compete → price pressure downward",
      direction: "negative",
      confidence: "medium",
      timeframe: "3-9 months",
    });
    bearishCount++;
  }

  // DOM falling → market heating
  if (metrics.dom && metrics.dom < 25) {
    links.push({
      cause: `Properties selling in ${Math.round(metrics.dom)} days`,
      effect: "Strong demand signal → multiple offers likely → prices bid up",
      direction: "positive",
      confidence: "high",
      timeframe: "Current",
    });
    bullishCount++;
  } else if (metrics.dom && metrics.dom > 60) {
    links.push({
      cause: `Properties sitting ${Math.round(metrics.dom)}+ days`,
      effect: "Weak demand → motivated sellers → negotiation leverage for buyers",
      direction: "negative",
      confidence: "medium",
      timeframe: "Current",
    });
    bearishCount++;
  }

  // High mortgage rates → demand dampening
  if (metrics.mortgageRate && metrics.mortgageRate > 7) {
    links.push({
      cause: `Mortgage rates at ${metrics.mortgageRate.toFixed(2)}%`,
      effect: "Higher monthly payments → reduced buyer pool → price resistance",
      direction: "negative",
      confidence: "medium",
      timeframe: "Ongoing (rates take 2.5 years to fully impact prices)",
    });
    bearishCount++;
  }

  // Permits declining → future supply shortage
  if (metrics.permits && metrics.permits < 0) {
    links.push({
      cause: `Building permits declining ${Math.abs(metrics.permits).toFixed(0)}%`,
      effect: "Less construction → future supply shortage → price support in 12-18 months",
      direction: "positive",
      confidence: "high",
      timeframe: "12-18 months",
    });
    bullishCount++;
  }

  // Migration inflow
  if (metrics.migration && metrics.migration > 1000) {
    links.push({
      cause: `Net migration inflow of ${metrics.migration.toLocaleString()} households/yr`,
      effect: "Outside capital + demand entering market → sustained price appreciation",
      direction: "positive",
      confidence: "high",
      timeframe: "12-24 months",
    });
    bullishCount++;
  }

  // Build conclusion
  const netSentiment = bullishCount - bearishCount;
  let conclusion: string;
  let actionability: CausalChain["actionability"];

  if (netSentiment >= 3) {
    conclusion = "Multiple converging bullish signals create a strong case for investment. The fundamentals support continued price appreciation and healthy cash flow. This is a market where capital is flowing in and supply can't keep up.";
    actionability = "act_now";
  } else if (netSentiment >= 1) {
    conclusion = "The balance of indicators leans positive, but not overwhelmingly so. The market has growth potential but also some headwinds to monitor. Consider entry at current levels with appropriate risk management.";
    actionability = "monitor";
  } else if (netSentiment === 0) {
    conclusion = "Mixed signals — positive and negative factors are roughly balanced. This market could go either way. Wait for a clearer signal before committing capital.";
    actionability = "wait";
  } else {
    conclusion = "Headwinds outweigh tailwinds in this market. Multiple risk factors suggest caution. If already invested, monitor closely. If considering entry, look for a more favorable price or wait for conditions to improve.";
    actionability = "wait";
  }

  return {
    title: netSentiment >= 2 ? "Bullish Market Thesis" : netSentiment >= 0 ? "Neutral Outlook" : "Cautious Outlook",
    summary: `${bullishCount} bullish factors, ${bearishCount} bearish factors identified.`,
    links,
    conclusion,
    actionability,
  };
}

// ============================================================
// Market Narrative — full paragraph summary
// ============================================================

export function generateMarketNarrative(data: {
  marketName: string;
  hyperScore: number;
  popGrowth: number;
  jobGrowth: number;
  medianPrice: number;
  priceChange: number;
  capRate: number;
  inventory: number;
  dom: number;
  migration?: number;
  topEmployer?: string;
}): string {
  const { marketName, hyperScore, popGrowth, jobGrowth, medianPrice, priceChange, capRate, inventory, dom } = data;

  const priceDirection = priceChange > 3 ? "appreciating strongly" : priceChange > 0 ? "growing modestly" : priceChange > -2 ? "softening slightly" : "declining";
  const marketTemp = inventory < 2 ? "hot" : inventory < 3 ? "warm" : inventory < 4 ? "balanced" : inventory < 5 ? "cooling" : "cold";
  const investorVerdict = hyperScore >= 75 ? "This is an active buy zone" : hyperScore >= 60 ? "This market merits serious consideration" : hyperScore >= 45 ? "Selective opportunities may exist" : "Caution is warranted";

  let narrative = `${marketName} scores ${hyperScore}/100 on our HyperScore index, with prices ${priceDirection} at ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}% year-over-year. `;

  narrative += `The median home price of $${(medianPrice / 1000).toFixed(0)}K supports a ${capRate.toFixed(1)}% cap rate — ${capRate >= 6 ? "above" : "near"} the investor threshold. `;

  narrative += `With ${inventory.toFixed(1)} months of inventory and properties moving in ${Math.round(dom)} days, this is a ${marketTemp} market. `;

  if (popGrowth > 2 && jobGrowth > 3) {
    narrative += `The growth engine is strong: ${popGrowth.toFixed(1)}% population growth fueled by ${jobGrowth.toFixed(1)}% job creation${data.topEmployer ? `, led by employers like ${data.topEmployer}` : ""}. `;
  } else if (popGrowth > 1) {
    narrative += `Population is growing at ${popGrowth.toFixed(1)}% with ${jobGrowth.toFixed(1)}% job growth — steady fundamentals. `;
  } else {
    narrative += `Growth is modest at ${popGrowth.toFixed(1)}% population and ${jobGrowth.toFixed(1)}% jobs — not a high-growth story. `;
  }

  if (data.migration && data.migration > 500) {
    narrative += `Net inbound migration of ${data.migration.toLocaleString()} households annually brings outside capital and demand into the market. `;
  }

  narrative += `${investorVerdict}.`;

  return narrative;
}

// ============================================================
// Property Insight — why should I buy this specific property?
// ============================================================

export function generatePropertyInsightText(data: {
  address: string;
  price: number;
  estimatedValue: number;
  predictedAppreciation: number;
  capRate: number;
  cashFlow: number;
  hyperScore: number;
  distance: number;
  dom: number;
  reasons: string[];
}): string {
  const { address, price, estimatedValue, predictedAppreciation, capRate, cashFlow, hyperScore, distance, dom, reasons } = data;

  const undervalued = price < estimatedValue;
  const discount = undervalued ? ((1 - price / estimatedValue) * 100).toFixed(0) : "0";
  const equityGain = Math.round(price * predictedAppreciation / 100);

  let text = "";

  // Lead with the strongest signal
  if (undervalued && Number(discount) > 5) {
    text += `This property at ${address} is priced ${discount}% below its estimated market value of $${estimatedValue.toLocaleString()} — that's $${(estimatedValue - price).toLocaleString()} in built-in equity from day one. `;
  } else if (predictedAppreciation > 5) {
    text += `${address} sits in a market projected to appreciate ${predictedAppreciation.toFixed(1)}% over the next year — that's approximately $${equityGain.toLocaleString()} in value growth on a $${price.toLocaleString()} investment. `;
  } else if (capRate > 7) {
    text += `At a ${capRate.toFixed(1)}% cap rate, ${address} generates strong income relative to its price — well above the 6% investor threshold. `;
  } else {
    text += `${address} is a ${hyperScore >= 70 ? "strong" : "moderate"} investment opportunity at $${price.toLocaleString()}, scoring ${hyperScore}/100 on our multi-dimensional analysis. `;
  }

  // Cash flow context
  if (cashFlow > 0) {
    text += `The property cash flows +$${cashFlow.toLocaleString()}/month after expenses — that's $${(cashFlow * 12).toLocaleString()}/year in passive income. `;
  }

  // DOM context
  if (dom > 45) {
    text += `At ${dom} days on market, there may be negotiation leverage — the seller could be motivated. `;
  } else if (dom < 15) {
    text += `Only ${dom} days on market — this property is generating strong interest. Move quickly if interested. `;
  }

  // Distance
  text += `Located ${distance.toFixed(1)} miles from your current position.`;

  return text;
}

// ============================================================
// Signal Explanation — why is this signal important?
// ============================================================

export function explainSignal(signal: string, strength: number): string {
  const explanations: Record<string, string> = {
    "Institutional buyers increasing": "When institutional investors (REITs, PE funds, iBuyers) increase purchases, it validates the market's fundamentals. Smart money has done due diligence you haven't — their entry is a leading indicator of 6-12 month appreciation.",
    "1031 exchange inflows rising": "Tax-deferred exchange capital flowing INTO this market from higher-priced markets means experienced investors see relative value here. This capital is 'sticky' — it must be deployed within 180 days, creating urgency-driven demand.",
    "Net migration positive": "More people moving in than out means growing demand for housing. Each household needs somewhere to live — this creates organic price support independent of investor activity.",
    "Building permits declining": "Fewer permits = less future construction = tighter supply in 12-18 months. The construction pipeline is shrinking, which supports prices even if current demand is flat.",
    "Google search volume rising": "When search volume for '[city] homes for sale' spikes, it's a 1-3 month leading indicator of actual buyer activity. Research shows 89% directional accuracy.",
    "Corporate relocation announced": "A major employer entering the market brings jobs, which brings housing demand. Research shows +10% housing price growth at the ZIP level, starting 1 year before the relocation and lasting 2 years after.",
  };

  for (const [key, explanation] of Object.entries(explanations)) {
    if (signal.toLowerCase().includes(key.toLowerCase().slice(0, 20))) {
      return explanation;
    }
  }

  return strength > 70
    ? "This is a high-confidence signal — historically correlated with market outperformance in the following 6-12 months."
    : strength > 40
    ? "A moderate signal worth monitoring. Combined with other indicators, it helps build the investment thesis."
    : "A weak signal on its own, but valuable as part of the broader market picture.";
}
