/**
 * Portfolio Optimization Confluence Engine
 *
 * Answers: "What should I do NEXT?" for investors who already own properties.
 * Stacks: wealth attribution, goal progress, watchlist alerts, market timing, deal scanner.
 * Pure functions, no side effects.
 */

export interface PortfolioOptimizationInput {
  portfolio: {
    totalValue: number; totalEquity: number; monthlyIncome: number;
    propertyCount: number; avgCapRate: number;
    properties: Array<{ state: string; city: string; value: number; monthlyCashFlow: number; capRate: number; appreciation: number }>;
  };
  goalMonthlyCashFlow: number;
  currentMonthlyCashFlow: number;
  monthlyAppreciation: number;
  monthlyDebtPaydown: number;
  monthlyCashFlowIncome: number;
  watchlistAlerts: Array<{ marketName: string; zip: string; alertType: string; currentValue: number; threshold: number }>;
  watchedMarketTimings: Array<{ marketName: string; zip: string; timingSignal: "BUY_NOW" | "FAVORABLE" | "NEUTRAL" | "WAIT" | "MARKET_PEAKING"; hyperScore: number }>;
  topDeals: Array<{ address: string; market: string; price: number; capRate: number; monthlyCashFlow: number; hyperScore: number; dealType: string }>;
}

type Action = "BUY_NOW" | "RESEARCH_MARKET" | "OPTIMIZE_EXISTING" | "HOLD_AND_WAIT" | "REBALANCE" | "SELL_UNDERPERFORMER";
type Urgency = "immediate" | "this_month" | "this_quarter" | "no_rush";
type OpUrgency = "high" | "medium" | "low";

export interface PortfolioOptimizationResult {
  nextAction: Action; actionDetail: string; urgency: Urgency;
  goalProgress: { percentComplete: number; monthlyGap: number; propertiesNeeded: number; estimatedMonthsToGoal: number; acceleration: string };
  wealthGrowthRate: {
    monthlyTotal: number; annualizedReturn: number;
    breakdown: { appreciation: { amount: number; percent: number }; debtPaydown: { amount: number; percent: number }; cashFlow: { amount: number; percent: number } };
  };
  portfolioHealth: { diversificationScore: number; concentrationWarnings: string[]; underperformers: string[]; optimizationOpportunities: string[] };
  topOpportunities: Array<{ type: "new_acquisition" | "market_alert" | "portfolio_action"; title: string; detail: string; impact: string; urgency: OpUrgency }>;
  watchlistSummary: { totalWatched: number; alertsTriggered: number; bestTimingMarket: string; recommendation: string };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function computeGoalProgress(input: PortfolioOptimizationInput): PortfolioOptimizationResult["goalProgress"] {
  const { goalMonthlyCashFlow: goal, currentMonthlyCashFlow: current, portfolio: p, topDeals } = input;
  const percentComplete = goal > 0 ? clamp(Math.round((current / goal) * 100), 0, 100) : 0;
  const monthlyGap = Math.max(0, goal - current);
  const avgCf = p.propertyCount > 0 ? p.monthlyIncome / p.propertyCount
    : topDeals.length > 0 ? topDeals.reduce((s, d) => s + d.monthlyCashFlow, 0) / topDeals.length : 500;
  const propertiesNeeded = avgCf > 0 ? Math.ceil(monthlyGap / avgCf) : 0;
  const estimatedMonthsToGoal = monthlyGap <= 0 ? 0 : propertiesNeeded * 6;
  const bestDeal = topDeals.length > 0 ? topDeals.reduce((b, d) => d.monthlyCashFlow > b.monthlyCashFlow ? d : b, topDeals[0]!) : null;
  const acceleration = bestDeal && monthlyGap > 0
    ? `Add one property now to reach goal ${Math.max(1, Math.round(bestDeal.monthlyCashFlow / avgCf * 6))} months sooner`
    : monthlyGap <= 0 ? "Goal reached — consider raising your target" : "Acquire your first cash-flowing property to start progressing";
  return { percentComplete, monthlyGap, propertiesNeeded, estimatedMonthsToGoal, acceleration };
}

function computeWealthGrowth(input: PortfolioOptimizationInput): PortfolioOptimizationResult["wealthGrowthRate"] {
  const { monthlyAppreciation: app, monthlyDebtPaydown: debt, monthlyCashFlowIncome: cf, portfolio } = input;
  const monthlyTotal = app + debt + cf;
  const pct = (a: number) => monthlyTotal > 0 ? Math.round((a / monthlyTotal) * 100) : 0;
  const annualizedReturn = portfolio.totalEquity > 0 ? Math.round((monthlyTotal * 12) / portfolio.totalEquity * 1000) / 10 : 0;
  return { monthlyTotal, annualizedReturn, breakdown: {
    appreciation: { amount: app, percent: pct(app) }, debtPaydown: { amount: debt, percent: pct(debt) }, cashFlow: { amount: cf, percent: pct(cf) },
  }};
}

function getStateValues(properties: PortfolioOptimizationInput["portfolio"]["properties"]): Record<string, number> {
  const sv: Record<string, number> = {};
  for (const p of properties) sv[p.state] = (sv[p.state] ?? 0) + p.value;
  return sv;
}

function computePortfolioHealth(input: PortfolioOptimizationInput): PortfolioOptimizationResult["portfolioHealth"] {
  const { properties, avgCapRate } = input.portfolio;
  const states = new Set(properties.map(p => p.state));
  const cities = new Set(properties.map(p => p.city));
  const stateScore = states.size >= 4 ? 100 : states.size >= 3 ? 75 : states.size >= 2 ? 50 : 25;
  const cityScore = cities.size >= 5 ? 100 : cities.size >= 3 ? 70 : cities.size >= 2 ? 45 : 20;
  const diversificationScore = clamp(Math.round(stateScore * 0.6 + cityScore * 0.4), 0, 100);

  const totalValue = properties.reduce((s, p) => s + p.value, 0);
  const stateValues = getStateValues(properties);
  const concentrationWarnings: string[] = [];
  for (const [state, val] of Object.entries(stateValues)) {
    const share = totalValue > 0 ? (val / totalValue) * 100 : 0;
    if (share > 70) concentrationWarnings.push(`${Math.round(share)}% of portfolio value concentrated in ${state}`);
  }
  if (states.size === 1 && properties.length > 1) concentrationWarnings.push("All properties in a single state — vulnerable to local economic shifts");

  const underperformers = properties.filter(p => p.capRate < avgCapRate * 0.85)
    .map(p => `${p.city}, ${p.state} (${p.capRate.toFixed(1)}% cap rate vs ${avgCapRate.toFixed(1)}% avg)`);

  const ops: string[] = [];
  for (const p of properties) {
    if (p.monthlyCashFlow < 0) ops.push(`${p.city}, ${p.state} has negative cash flow — consider raising rent or refinancing`);
    if (p.appreciation < 0) ops.push(`${p.city}, ${p.state} is depreciating (${p.appreciation.toFixed(1)}% YoY) — evaluate exit`);
  }
  if (properties.length > 3 && underperformers.length > 0) ops.push("Sell weakest performer and 1031-exchange into a higher-yield market");

  return { diversificationScore, concentrationWarnings, underperformers, optimizationOpportunities: ops.slice(0, 3) };
}

function computeWatchlistSummary(input: PortfolioOptimizationInput): PortfolioOptimizationResult["watchlistSummary"] {
  const { watchlistAlerts, watchedMarketTimings } = input;
  const bestTiming = watchedMarketTimings.filter(m => m.timingSignal === "BUY_NOW" || m.timingSignal === "FAVORABLE")
    .sort((a, b) => b.hyperScore - a.hyperScore)[0];
  const bestTimingMarket = bestTiming?.marketName ?? "None";
  const n = watchlistAlerts.length;
  const recommendation = n > 0 && bestTiming?.timingSignal === "BUY_NOW"
    ? `${bestTimingMarket} has triggered alerts and timing is optimal — prioritize research`
    : n > 0 ? `${n} alert(s) triggered — review watchlist markets for entry opportunities`
    : bestTiming ? `${bestTimingMarket} shows favorable timing (score ${bestTiming.hyperScore}) — monitor for alerts`
    : "No actionable signals — continue monitoring";
  return { totalWatched: watchedMarketTimings.length, alertsTriggered: n, bestTimingMarket, recommendation };
}

function buildOpportunities(input: PortfolioOptimizationInput, health: PortfolioOptimizationResult["portfolioHealth"]): PortfolioOptimizationResult["topOpportunities"] {
  const ops: PortfolioOptimizationResult["topOpportunities"] = [];
  for (const d of input.topDeals.slice(0, 2))
    ops.push({ type: "new_acquisition", title: `${d.dealType} in ${d.market}`, detail: d.address,
      impact: `Would add $${Math.round(d.monthlyCashFlow).toLocaleString()}/mo cash flow at ${d.capRate.toFixed(1)}% cap rate`,
      urgency: d.hyperScore >= 75 ? "high" : d.hyperScore >= 55 ? "medium" : "low" });
  for (const a of input.watchlistAlerts.slice(0, 2))
    ops.push({ type: "market_alert", title: `Alert: ${a.alertType}`, detail: `${a.marketName} (${a.zip})`,
      impact: `Current value ${a.currentValue} crossed threshold ${a.threshold}`, urgency: "high" });
  for (const o of health.optimizationOpportunities.slice(0, 1))
    ops.push({ type: "portfolio_action", title: "Portfolio optimization", detail: o, impact: "Improve portfolio yield and reduce risk", urgency: "medium" });
  const rank: Record<OpUrgency, number> = { high: 0, medium: 1, low: 2 };
  return ops.sort((a, b) => rank[a.urgency] - rank[b.urgency]).slice(0, 5);
}

function decideNextAction(input: PortfolioOptimizationInput, health: PortfolioOptimizationResult["portfolioHealth"], goal: PortfolioOptimizationResult["goalProgress"]): { nextAction: Action; actionDetail: string; urgency: Urgency } {
  const { watchlistAlerts, watchedMarketTimings, topDeals, portfolio } = input;
  const alertedBuyNow = watchedMarketTimings.filter(m => m.timingSignal === "BUY_NOW")
    .filter(m => watchlistAlerts.some(a => a.zip === m.zip));

  if (alertedBuyNow.length > 0) {
    const best = alertedBuyNow.sort((a, b) => b.hyperScore - a.hyperScore)[0]!;
    return { nextAction: "BUY_NOW", actionDetail: `${best.marketName} triggered your watchlist alert and timing is optimal (HyperScore ${best.hyperScore}). Research deals in this market immediately.`, urgency: "immediate" };
  }

  const stateValues = getStateValues(portfolio.properties);
  const totalValue = portfolio.properties.reduce((s, p) => s + p.value, 0);
  const maxConc = totalValue > 0 ? Math.max(...Object.values(stateValues).map(v => v / totalValue)) : 0;
  if (maxConc > 0.7 && portfolio.propertyCount > 2) {
    const state = Object.entries(stateValues).sort(([, a], [, b]) => b - a)[0]![0];
    return { nextAction: "REBALANCE", actionDetail: `${Math.round(maxConc * 100)}% of portfolio is in ${state}. Diversify into a new state to reduce geographic risk.`, urgency: "this_quarter" };
  }

  if (health.underperformers.length > 0 && portfolio.propertyCount > 3)
    return { nextAction: "SELL_UNDERPERFORMER", actionDetail: `${health.underperformers[0]!} is dragging returns. Consider selling and redeploying capital into a higher-yield market via 1031 exchange.`, urgency: "this_quarter" };

  if (goal.percentComplete < 50 && topDeals.some(d => d.hyperScore >= 65)) {
    const best = [...topDeals].sort((a, b) => b.hyperScore - a.hyperScore)[0]!;
    return { nextAction: "RESEARCH_MARKET", actionDetail: `You're ${goal.percentComplete}% to your income goal. ${best.market} has a ${best.capRate.toFixed(1)}% cap rate deal (HyperScore ${best.hyperScore}). Research this market.`, urgency: "this_month" };
  }

  if (health.optimizationOpportunities.length > 0)
    return { nextAction: "OPTIMIZE_EXISTING", actionDetail: health.optimizationOpportunities[0]!, urgency: "this_month" };

  return { nextAction: "HOLD_AND_WAIT", actionDetail: "No urgent action needed. Continue monitoring your watchlist and building reserves for the next opportunity.", urgency: "no_rush" };
}

export function computePortfolioOptimization(input: PortfolioOptimizationInput): PortfolioOptimizationResult {
  const goalProgress = computeGoalProgress(input);
  const wealthGrowthRate = computeWealthGrowth(input);
  const portfolioHealth = computePortfolioHealth(input);
  const watchlistSummary = computeWatchlistSummary(input);
  const { nextAction, actionDetail, urgency } = decideNextAction(input, portfolioHealth, goalProgress);
  const topOpportunities = buildOpportunities(input, portfolioHealth);
  return { nextAction, actionDetail, urgency, goalProgress, wealthGrowthRate, portfolioHealth, topOpportunities, watchlistSummary };
}
