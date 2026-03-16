/**
 * AI Deal Advisor Engine
 *
 * Generates personalized investment advice by analyzing property metrics
 * against portfolio context. Deterministic — uses real numbers to compute
 * actionable advice. In production, this would call Claude API for NLG.
 */

export interface PortfolioContext {
  properties: Array<{
    address: string; city: string; state: string;
    purchasePrice: number; currentValue: number;
    monthlyRent: number; monthlyExpenses: number; mortgage: number; capRate: number;
  }>;
  cashReserves?: number;
  monthlyIncome?: number;
  riskTolerance?: "conservative" | "moderate" | "aggressive";
  investmentGoal?: string;
}

export interface AdvisorQuery {
  question: string;
  propertyContext?: {
    address: string; price: number; capRate: number;
    cashFlow: number; hyperScore: number; appreciation: number;
  };
  portfolioContext?: PortfolioContext;
}

export interface AdvisorResponse {
  answer: string;
  recommendation: "BUY" | "PASS" | "RESEARCH_MORE" | "PORTFOLIO_ADJUSTMENT";
  confidence: number;
  reasoning: string[];
  suggestedActions: string[];
  portfolioImpact?: { diversificationChange: string; cashFlowImpact: number; riskChange: string };
}

type Prop = AdvisorQuery["propertyContext"];

export function generateAdvisorResponse(query: AdvisorQuery): AdvisorResponse {
  const q = query.question.toLowerCase();
  const { propertyContext: prop, portfolioContext: portfolio } = query;
  if (q.includes("buy") || q.includes("should i") || q.includes("purchase")) return evaluateBuy(prop, portfolio);
  if (q.includes("diversif")) return evaluateDiversification(prop, portfolio);
  if (q.includes("income") || q.includes("cash flow") || q.includes("cashflow")) return evaluateCashFlow(prop, portfolio);
  if (q.includes("risk")) return evaluateRisk(prop, portfolio);
  return evaluateBuy(prop, portfolio);
}

function evaluateBuy(prop?: Prop, portfolio?: PortfolioContext): AdvisorResponse {
  if (!prop) return fallback("No property data provided. Select a property to get a buy recommendation.");
  const reasoning: string[] = [];
  let score = 0;
  if (prop.capRate >= 7) { score += 25; reasoning.push(`Strong ${prop.capRate.toFixed(1)}% cap rate exceeds the 7% investor threshold.`); }
  else if (prop.capRate >= 5) { score += 10; reasoning.push(`Moderate ${prop.capRate.toFixed(1)}% cap rate is within acceptable range.`); }
  else { score -= 15; reasoning.push(`Low ${prop.capRate.toFixed(1)}% cap rate below the typical 5% floor.`); }
  if (prop.cashFlow > 0) { score += 20; reasoning.push(`Positive monthly cash flow of $${prop.cashFlow.toLocaleString()}.`); }
  else { score -= 20; reasoning.push(`Negative cash flow of $${prop.cashFlow.toLocaleString()}/mo is a concern.`); }
  if (prop.hyperScore >= 70) { score += 20; reasoning.push(`HyperScore of ${prop.hyperScore}/100 signals a strong market.`); }
  else if (prop.hyperScore >= 50) { score += 5; reasoning.push(`HyperScore of ${prop.hyperScore}/100 indicates a neutral market.`); }
  else { score -= 15; reasoning.push(`HyperScore of ${prop.hyperScore}/100 suggests a weak market.`); }
  if (prop.appreciation >= 5) { score += 15; reasoning.push(`Projected ${prop.appreciation.toFixed(1)}% appreciation adds equity growth.`); }
  else if (prop.appreciation >= 2) { score += 5; reasoning.push(`Modest ${prop.appreciation.toFixed(1)}% appreciation expected.`); }
  else { score -= 10; reasoning.push(`Low ${prop.appreciation.toFixed(1)}% appreciation limits upside.`); }

  const rec = score >= 35 ? "BUY" as const : score >= 10 ? "RESEARCH_MORE" as const : "PASS" as const;
  const verdict = rec === "BUY"
    ? `${prop.address} scores well across key metrics. The combination of yield, market strength, and appreciation potential makes this a compelling acquisition.`
    : rec === "RESEARCH_MORE"
    ? `${prop.address} shows mixed signals. Some fundamentals are attractive, but further due diligence is recommended before committing capital.`
    : `${prop.address} does not meet investment thresholds. The risk-reward profile suggests waiting for better opportunities.`;
  return { answer: verdict, recommendation: rec, confidence: Math.min(95, Math.max(30, 50 + score)), reasoning, suggestedActions: buildActions(rec, prop), portfolioImpact: computeImpact(prop, portfolio) };
}

function evaluateDiversification(prop?: Prop, portfolio?: PortfolioContext): AdvisorResponse {
  if (!portfolio || portfolio.properties.length === 0) return fallback("Add properties to your portfolio to get diversification analysis.");
  const stateCounts: Record<string, number> = {};
  for (const p of portfolio.properties) stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
  const total = portfolio.properties.length;
  const states = Object.keys(stateCounts);
  const maxConc = Math.max(...Object.values(stateCounts)) / total;
  const reasoning: string[] = [];
  if (states.length === 1) reasoning.push(`100% concentrated in ${states[0]} — high geographic risk.`);
  else if (maxConc > 0.6) { const d = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]!; reasoning.push(`${(maxConc * 100).toFixed(0)}% concentrated in ${d[0]}.`); }
  else reasoning.push(`Spread across ${states.length} states — reasonable diversification.`);
  const avgCap = portfolio.properties.reduce((s, p) => s + p.capRate, 0) / total;
  reasoning.push(`Portfolio average cap rate: ${avgCap.toFixed(1)}%.`);
  reasoning.push(`${total} properties across ${states.length} state(s).`);
  return {
    answer: maxConc > 0.6
      ? "Your portfolio is heavily concentrated in one state. Consider acquiring in a different market to reduce geographic risk."
      : "Your portfolio has reasonable geographic diversification. Continue targeting under-represented markets.",
    recommendation: "PORTFOLIO_ADJUSTMENT", confidence: 72, reasoning,
    suggestedActions: [maxConc > 0.6 ? "Target properties in a different state" : "Maintain current diversification strategy", "Review correlation between your markets' economic drivers", "Consider a property type mix (SFR, multi-family, commercial)"],
    portfolioImpact: computeImpact(prop, portfolio),
  };
}

function evaluateCashFlow(prop?: Prop, portfolio?: PortfolioContext): AdvisorResponse {
  const reasoning: string[] = [];
  let totalCF = 0;
  if (portfolio && portfolio.properties.length > 0) {
    for (const p of portfolio.properties) totalCF += p.monthlyRent - p.monthlyExpenses - p.mortgage;
    reasoning.push(`Current portfolio cash flow: $${totalCF.toLocaleString()}/mo.`);
    reasoning.push(`${portfolio.properties.length} properties generating rental income.`);
  }
  if (prop) { reasoning.push(`This property adds $${prop.cashFlow.toLocaleString()}/mo.`); reasoning.push(`Combined would be $${(totalCF + prop.cashFlow).toLocaleString()}/mo.`); }
  const annual = (totalCF + (prop?.cashFlow ?? 0)) * 12;
  reasoning.push(`Projected annual cash flow: $${annual.toLocaleString()}.`);
  return {
    answer: annual > 0
      ? `Your portfolio is cash-flow positive at $${annual.toLocaleString()}/yr. ${prop ? `Adding this property ${prop.cashFlow > 0 ? "strengthens" : "weakens"} that position.` : ""}`
      : "Your portfolio is cash-flow negative. Focus on properties with strong positive cash flow to stabilize.",
    recommendation: annual > 0 && (prop?.cashFlow ?? 0) > 0 ? "BUY" : "RESEARCH_MORE", confidence: 68, reasoning,
    suggestedActions: [prop && prop.cashFlow < 0 ? "Negotiate a lower purchase price to improve cash flow" : "Lock in favorable financing terms", "Build 6 months of reserves before next acquisition", "Explore value-add opportunities to increase rents"],
    portfolioImpact: computeImpact(prop, portfolio),
  };
}

function evaluateRisk(prop?: Prop, portfolio?: PortfolioContext): AdvisorResponse {
  const reasoning: string[] = [];
  if (prop) {
    if (prop.hyperScore < 40) reasoning.push("Low HyperScore indicates elevated market risk.");
    else if (prop.hyperScore < 60) reasoning.push("Moderate HyperScore — some market risk factors present.");
    else reasoning.push("Strong HyperScore suggests lower market risk.");
    if (prop.capRate < 4) reasoning.push("Cap rate below 4% leaves thin margin for unexpected expenses.");
    if (prop.appreciation < 1) reasoning.push("Flat appreciation forecast increases holding risk.");
  }
  if (portfolio && portfolio.properties.length > 0) {
    const totalVal = portfolio.properties.reduce((s, p) => s + p.currentValue, 0);
    const ratio = totalVal > 0 ? (portfolio.cashReserves ?? 0) / totalVal : 0;
    reasoning.push(`Cash reserves are ${(ratio * 100).toFixed(1)}% of portfolio value.`);
    if (ratio < 0.05) reasoning.push("Reserves below 5% — liquidity risk is elevated.");
  }
  reasoning.push(`Your risk tolerance is set to "${portfolio?.riskTolerance ?? "moderate"}".`);
  const hasIssues = reasoning.some(r => r.includes("elevated") || r.includes("below"));
  return {
    answer: `Risk assessment considers market conditions, portfolio concentration, cash reserves, and property-level metrics. ${hasIssues ? "Some risk factors need attention before proceeding." : "Overall risk profile is manageable for your tolerance level."}`,
    recommendation: "RESEARCH_MORE", confidence: 60, reasoning,
    suggestedActions: ["Run a stress test with 20% rent reduction and 2% rate increase", "Verify insurance coverage for property-specific hazards", "Review local vacancy rate trends before committing"],
    portfolioImpact: computeImpact(prop, portfolio),
  };
}

function computeImpact(prop?: Prop, portfolio?: PortfolioContext): AdvisorResponse["portfolioImpact"] {
  if (!prop || !portfolio || portfolio.properties.length === 0) return undefined;
  const stateCount = new Set(portfolio.properties.map(p => p.state)).size;
  return {
    diversificationChange: stateCount < 2 ? "Improves — adds geographic spread" : "Maintains current diversification",
    cashFlowImpact: prop.cashFlow,
    riskChange: prop.hyperScore >= 60 ? "Lowers overall portfolio risk" : prop.hyperScore >= 40 ? "Neutral risk impact" : "Increases portfolio risk",
  };
}

function buildActions(rec: string, prop?: Prop): string[] {
  if (rec === "BUY") return ["Get pre-approved for financing", "Schedule property inspection", `Verify the ${prop?.capRate.toFixed(1)}% cap rate with actual rent comps`];
  if (rec === "RESEARCH_MORE") return ["Request seller disclosures and inspection reports", "Compare with 3-5 nearby comps", "Model cash flow under pessimistic assumptions"];
  return ["Set a price alert for this market", "Explore neighboring zip codes for better deals", "Revisit in 3-6 months if market conditions change"];
}

function fallback(message: string): AdvisorResponse {
  return { answer: message, recommendation: "RESEARCH_MORE", confidence: 20, reasoning: ["Insufficient data to provide a recommendation."], suggestedActions: ["Provide property details or portfolio context for personalized advice."] };
}
