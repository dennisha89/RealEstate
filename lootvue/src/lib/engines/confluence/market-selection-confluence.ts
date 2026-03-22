/**
 * Market Selection Confluence Engine
 * Answers: "WHERE should I invest?" by cross-validating 5 independent engines.
 * Stacks: HyperScore, StackedSignals leading layer, FollowTheMoney, DerivedMetrics, community demand.
 */

export interface MarketSelectionInput {
  hyperScore: number;                    // 0-100
  demographicScore: number;              // 0-100
  economicScore: number;                 // 0-100
  infrastructureScore: number;           // 0-100
  leadingLayerScore: number;             // -100 to +100
  leadingConcordance: number;            // 0-1
  capitalFlowDirection: "strong_inflow" | "inflow" | "balanced" | "outflow" | "strong_outflow";
  capitalFlowScore: number;              // 0-100
  institutionalActivity: "increasing" | "stable" | "decreasing";
  priceToRentRatio: number;
  priceToIncomeRatio: number;
  affordabilityIndex: number;            // monthly mortgage as % of income
  rentYield: number;                     // %
  investorWatcherCount?: number;
  searchVolumeChange?: number;           // % weekly change
  communityHotness?: number;             // 0-100
}

interface ComponentScore { score: number; weight: number; source: string }

export interface MarketSelectionResult {
  confluenceScore: number;               // 0-100
  componentScores: {
    fundamentals: ComponentScore; momentum: ComponentScore; capitalFlow: ComponentScore;
    valueMetrics: ComponentScore; crowdIntel: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "TOP_PICK" | "STRONG" | "PROMISING" | "NEUTRAL" | "WEAK" | "AVOID";
  thesis: string;
  strengths: string[];
  concerns: string[];
  bestFor: string[];
}

const WEIGHTS = { fundamentals: 0.30, momentum: 0.25, capitalFlow: 0.20, valueMetrics: 0.15, crowdIntel: 0.10 } as const;
const BULLISH_THRESHOLD = 60;
const FLOW_SCORES: Record<string, number> = { strong_inflow: 95, inflow: 75, balanced: 50, outflow: 25, strong_outflow: 5 };
const INST_MOD: Record<string, number> = { increasing: 10, stable: 0, decreasing: -10 };
const NAMES: Record<string, string> = { fundamentals: "Fundamentals", momentum: "Momentum", capitalFlow: "Capital flow", valueMetrics: "Value metrics", crowdIntel: "Crowd intelligence" };

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function cl(v: number): number { return clamp(Math.round(v), 0, 100); }

function scoreFundamentals(i: MarketSelectionInput): number {
  return cl((i.demographicScore + i.economicScore + i.infrastructureScore) / 3);
}

function scoreMomentum(i: MarketSelectionInput): number {
  return cl(((i.leadingLayerScore + 100) / 2) * (0.7 + i.leadingConcordance * 0.6));
}

function scoreCapitalFlow(i: MarketSelectionInput): number {
  return cl(i.capitalFlowScore * 0.6 + (FLOW_SCORES[i.capitalFlowDirection] ?? 0) * 0.4 + (INST_MOD[i.institutionalActivity] ?? 0));
}

function scoreValueMetrics(i: MarketSelectionInput): number {
  const ptr = cl((25 - i.priceToRentRatio) / 10 * 100);
  const aff = cl((40 - i.affordabilityIndex) / 20 * 100);
  const yld = cl((i.rentYield - 4) / 6 * 100);
  const pti = cl((7 - i.priceToIncomeRatio) / 4 * 100);
  return cl((ptr + aff + yld + pti) / 4);
}

function scoreCrowdIntel(i: MarketSelectionInput): number {
  const hotness = i.communityHotness ?? 50;
  const search = i.searchVolumeChange != null ? cl(50 + i.searchVolumeChange * 5) : 50;
  const watcher = i.investorWatcherCount != null ? clamp(Math.round(i.investorWatcherCount / 10), 0, 15) : 0;
  return cl(hotness * 0.5 + search * 0.5 + watcher);
}

function buildThesis(scores: MarketSelectionResult["componentScores"], agreement: string, bullish: number, conf: number): string {
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b.score - a.score);
  const top = NAMES[sorted[0]![0]], bot = NAMES[sorted[sorted.length - 1]![0]];
  const topScore = sorted[0]![1].score, botScore = sorted[sorted.length - 1]![1].score;
  if (agreement === "strong" || agreement === "moderate")
    return `${bullish} of 5 engines signal bullish conditions with a confluence score of ${conf}. ${top} is the standout at ${topScore}/100. High cross-engine agreement suggests conviction in this market's trajectory.`;
  if (agreement === "mixed")
    return `Mixed signals produce a ${conf}/100 confluence score. ${top} scores well (${topScore}/100), but ${bot} lags at ${botScore}/100. Selective opportunity — dig deeper before committing capital.`;
  return `Engines disagree: only ${bullish}/5 bullish, yielding ${conf}/100. ${bot} is the primary concern at ${botScore}/100. Wait for conditions to improve or look for distressed pricing.`;
}

function identifyStrengths(s: MarketSelectionResult["componentScores"], i: MarketSelectionInput): string[] {
  const r: string[] = [];
  if (s.fundamentals.score >= 70) r.push("Strong demographic, economic, and infrastructure fundamentals");
  if (s.momentum.score >= 70) r.push("Leading indicators point to future price appreciation");
  if (s.capitalFlow.score >= 70) r.push("Capital flowing in — institutional confidence");
  if (s.valueMetrics.score >= 70) r.push(`Attractive value: ${i.rentYield.toFixed(1)}% rent yield, ${i.priceToRentRatio.toFixed(1)}x price-to-rent`);
  if (s.crowdIntel.score >= 70) r.push("Rising investor attention and community demand");
  if (i.leadingConcordance >= 0.8) r.push("High signal concordance — strong predictive confidence");
  return r.slice(0, 3);
}

function identifyConcerns(s: MarketSelectionResult["componentScores"], i: MarketSelectionInput): string[] {
  const r: string[] = [];
  if (s.fundamentals.score < 40) r.push("Weak fundamentals — demographic or economic headwinds");
  if (s.momentum.score < 40) r.push("Leading indicators bearish — price softening likely");
  if (s.capitalFlow.score < 40) r.push("Capital outflow — institutional investors may be exiting");
  if (s.valueMetrics.score < 40) r.push(`Stretched valuations: ${i.priceToRentRatio.toFixed(1)}x P/R, ${i.affordabilityIndex.toFixed(0)}% affordability`);
  if (s.crowdIntel.score < 40) r.push("Low investor interest — market may lack catalysts");
  if (i.leadingConcordance < 0.4) r.push("Low signal concordance — high uncertainty");
  return r.slice(0, 3);
}

function identifyBestFor(s: MarketSelectionResult["componentScores"], i: MarketSelectionInput): string[] {
  const r: string[] = [];
  if (i.rentYield >= 7) r.push("Cash flow investors");
  if (s.momentum.score >= 70) r.push("Appreciation seekers");
  if (i.affordabilityIndex < 25) r.push("First-time investors (affordable entry)");
  if (s.capitalFlow.score >= 70 && s.fundamentals.score >= 70) r.push("Long-term buy-and-hold");
  if (i.priceToRentRatio < 16) r.push("BRRRR strategy candidates");
  if (s.crowdIntel.score >= 70 && s.momentum.score >= 60) r.push("Short-term rental operators");
  if (r.length === 0) r.push("Patient investors waiting for better entry");
  return r.slice(0, 3);
}

export function computeMarketSelectionConfluence(input: MarketSelectionInput): MarketSelectionResult {
  const componentScores: MarketSelectionResult["componentScores"] = {
    fundamentals: { score: scoreFundamentals(input), weight: WEIGHTS.fundamentals, source: "HyperScore Engine" },
    momentum: { score: scoreMomentum(input), weight: WEIGHTS.momentum, source: "StackedSignals Leading Layer" },
    capitalFlow: { score: scoreCapitalFlow(input), weight: WEIGHTS.capitalFlow, source: "FollowTheMoney Engine" },
    valueMetrics: { score: scoreValueMetrics(input), weight: WEIGHTS.valueMetrics, source: "DerivedMetrics Engine" },
    crowdIntel: { score: scoreCrowdIntel(input), weight: WEIGHTS.crowdIntel, source: "Community Signals (Moat 7)" },
  };

  const confluenceScore = cl(
    componentScores.fundamentals.score * WEIGHTS.fundamentals +
    componentScores.momentum.score * WEIGHTS.momentum +
    componentScores.capitalFlow.score * WEIGHTS.capitalFlow +
    componentScores.valueMetrics.score * WEIGHTS.valueMetrics +
    componentScores.crowdIntel.score * WEIGHTS.crowdIntel
  );

  const entries = Object.values(componentScores);
  const bullishCount = entries.filter(s => s.score >= BULLISH_THRESHOLD).length;
  const agreement: MarketSelectionResult["agreement"] =
    bullishCount >= 5 ? "strong" : bullishCount >= 4 ? "moderate" : bullishCount >= 3 ? "mixed" : "divergent";

  const verdict: MarketSelectionResult["verdict"] =
    confluenceScore >= 80 && agreement === "strong" ? "TOP_PICK" :
    confluenceScore >= 70 ? "STRONG" : confluenceScore >= 55 ? "PROMISING" :
    confluenceScore >= 40 ? "NEUTRAL" : confluenceScore >= 25 ? "WEAK" : "AVOID";

  return {
    confluenceScore,
    componentScores,
    agreement,
    agreementDetail: `${bullishCount}/5 engines bullish`,
    verdict,
    thesis: buildThesis(componentScores, agreement, bullishCount, confluenceScore),
    strengths: identifyStrengths(componentScores, input),
    concerns: identifyConcerns(componentScores, input),
    bestFor: identifyBestFor(componentScores, input),
  };
}
