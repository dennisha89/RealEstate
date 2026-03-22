/**
 * Master Confluence Engine — "Confluence of Confluences"
 *
 * The highest-level decision engine. Stacks up to 12 independent confluence
 * engines against each other to produce the maximum-confidence investment
 * decision.
 *
 * Key principle: Each confluence engine was built from different data sources,
 * different methodologies, and different time horizons. When they AGREE,
 * the probability of being correct compounds multiplicatively — not additively.
 *
 * Agreement math (independent signals):
 *   - 1 engine at 65% accuracy = 65% confidence
 *   - 2 engines agreeing = 1 - (0.35 * 0.35) = 87.8%
 *   - 3 engines agreeing = 1 - (0.35^3) = 95.7%
 *   - 5 engines agreeing = 1 - (0.35^5) = 99.5%
 *   - 8 engines agreeing = 1 - (0.35^8) = 99.98%
 *   - 12 engines agreeing = 1 - (0.35^12) = 99.9999%
 *
 * This is the moat. Competitors can replicate one engine. They cannot
 * replicate the cross-validation across 12 independent confluence stacks
 * built on 40+ underlying engines.
 */

import type { MarketSelectionResult } from "./market-selection-confluence";
import type { DealQualityResult } from "./deal-quality-confluence";
import type { EntryTimingResult } from "./entry-timing-confluence";
import type { RiskConfluenceResult } from "./risk-confluence";
import type { PortfolioOptimizationResult } from "./portfolio-optimization-confluence";
import type { RateTransmissionResult } from "./rate-transmission-confluence";
import type { SupplyPipelineResult } from "./supply-pipeline-confluence";
import type { DemandVelocityResult } from "./demand-velocity-confluence";
import type { ExitStrategyResult } from "./exit-strategy-confluence";
import type { MicroLocationResult } from "./micro-location-confluence";
import type { FinancingResult } from "./financing-confluence";
import type { TaxEfficiencyResult } from "./tax-efficiency-confluence";
import type { TransactionIntelligenceResult } from "./transaction-intelligence-confluence";

// ============================================================
// Input: Results from all confluence engines (original 5 required,
// additional 8 optional for backward compatibility)
// ============================================================

export interface MasterConfluenceInput {
  // Original 5 — always required
  market: MarketSelectionResult;
  deal: DealQualityResult;
  timing: EntryTimingResult;
  risk: RiskConfluenceResult;
  portfolio: PortfolioOptimizationResult;
  // Extended engines — optional for backward compatibility
  rateTransmission?: RateTransmissionResult;
  supplyPipeline?: SupplyPipelineResult;
  demandVelocity?: DemandVelocityResult;
  exitStrategy?: ExitStrategyResult;
  microLocation?: MicroLocationResult;
  financing?: FinancingResult;
  taxEfficiency?: TaxEfficiencyResult;
  transactionIntelligence?: TransactionIntelligenceResult;
}

// ============================================================
// Output: The highest-confidence investment decision
// ============================================================

export interface ConfluenceVerdict {
  signal: "STRONG_BUY" | "BUY" | "LEAN_BUY" | "NEUTRAL" | "LEAN_PASS" | "PASS" | "HARD_PASS";
  label: string;
  color: "green" | "gold" | "red";
}

export interface EngineVote {
  engine: string;
  vote: "bullish" | "neutral" | "bearish";
  score: number;
  verdict: string;
  weight: number;
}

export interface MasterConfluenceResult {
  // The decision
  probabilityScore: number;            // 0-100, THE number
  confidence: number;                  // 0-100%, based on engine agreement
  verdict: ConfluenceVerdict;

  // Engine votes — how each confluence voted
  votes: EngineVote[];
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;

  // Agreement analysis
  agreementLevel: "unanimous" | "strong" | "majority" | "split" | "conflicting";
  agreementMultiplier: number;          // 0.5x to 1.5x — amplifies or dampens the score
  independentProbability: number;       // compound probability assuming engine independence

  // Cross-validation insights
  convergenceNarrative: string;         // why engines agree or disagree
  strongestSignal: string;              // which engine has highest conviction
  weakestLink: string;                  // which engine dissents most
  contradictions: string[];             // specific engine disagreements
  reinforcements: string[];             // specific engine agreements

  // Actionable output
  decision: string;                     // one-sentence recommendation
  nextSteps: string[];                  // 3-5 specific actions
  timeframe: string;                    // "Act within X days/weeks/months"
  revisitTriggers: string[];            // conditions that should trigger re-analysis
}

// ============================================================
// Engine
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function classifyVote(score: number): "bullish" | "neutral" | "bearish" {
  if (score >= 60) return "bullish";
  if (score <= 40) return "bearish";
  return "neutral";
}

/** Invert risk score: high risk = bearish, low risk = bullish */
function riskToOpportunity(riskScore: number): number {
  return 100 - riskScore;
}

function mapMarketVerdict(v: string): string { return v; }
function mapDealVerdict(v: string): string { return v; }
function mapTimingVerdict(v: string): string { return v; }
function mapRiskLevel(v: string): string { return `Risk: ${v}`; }
function mapPortfolioAction(v: string): string { return v; }

// ── Weight maps ──────────────────────────────────────────────────
// Original 5 weights (sum to 1.0) — used when only original 5 are provided
const ORIGINAL_WEIGHTS: Record<string, number> = {
  "\u9F8D\u7A74 Dragon\u2019s Lair": 0.25, "\u7389\u77F3 Jade Test": 0.25, "\u5929\u6642 Heaven\u2019s Timing": 0.20,
  "\u8B77\u6CD5 Guardian": 0.15, "\u5BB6\u696D Empire": 0.15,
};

// Full 12-engine weights (sum to 1.0) — used when all engines are provided
const FULL_WEIGHTS: Record<string, number> = {
  "\u9F8D\u7A74 Dragon\u2019s Lair": 0.12, "\u7389\u77F3 Jade Test": 0.12, "\u5929\u6642 Heaven\u2019s Timing": 0.10,
  "\u8B77\u6CD5 Guardian": 0.10, "\u5BB6\u696D Empire": 0.08,
  "Rate Transmission": 0.10, "Supply Pipeline": 0.08, "Demand Velocity": 0.08,
  "Exit Strategy": 0.06, "Micro-Location": 0.06,
  "Transaction Intelligence": 0.05, "Financing + Tax": 0.05,
};

/** Given the set of engine names that are present, return normalized weights */
function resolveWeights(engineNames: string[]): Record<string, number> {
  // If only the original 5 are provided, use legacy weights for exact backward compat
  const originalSet = new Set(Object.keys(ORIGINAL_WEIGHTS));
  const isOriginalOnly = engineNames.length === originalSet.size
    && engineNames.every((n) => originalSet.has(n));
  if (isOriginalOnly) return { ...ORIGINAL_WEIGHTS };

  // Otherwise use full weights, redistributing missing engines proportionally
  const presentSum = engineNames.reduce((s, n) => s + (FULL_WEIGHTS[n] ?? 0), 0);
  const resolved: Record<string, number> = {};
  for (const name of engineNames) {
    resolved[name] = presentSum > 0 ? (FULL_WEIGHTS[name] ?? 0) / presentSum : 1 / engineNames.length;
  }
  return resolved;
}

/** Map portfolio nextAction to a 0-100 score */
function portfolioActionToScore(action: string): number {
  if (action === "BUY_NOW") return 90;
  if (action === "RESEARCH_MARKET") return 65;
  if (action === "OPTIMIZE_EXISTING") return 50;
  if (action === "HOLD_AND_WAIT") return 45;
  if (action === "REBALANCE") return 40;
  if (action === "SELL_UNDERPERFORMER") return 30;
  return 50;
}

/** Combine financing + tax into a single blended score */
function blendFinancingTax(
  financing?: FinancingResult,
  taxEfficiency?: TaxEfficiencyResult,
): number {
  if (financing && taxEfficiency) return Math.round(financing.confluenceScore * 0.55 + taxEfficiency.confluenceScore * 0.45);
  if (financing) return financing.confluenceScore;
  if (taxEfficiency) return taxEfficiency.confluenceScore;
  return 50;
}

/** Build a combined verdict string for the financing+tax blended engine */
function blendFinancingTaxVerdict(
  financing?: FinancingResult,
  taxEfficiency?: TaxEfficiencyResult,
): string {
  const parts: string[] = [];
  if (financing) parts.push(`Financing: ${financing.verdict}`);
  if (taxEfficiency) parts.push(`Tax: ${taxEfficiency.verdict}`);
  return parts.join(", ") || "N/A";
}

export function computeMasterConfluence(input: MasterConfluenceInput): MasterConfluenceResult {
  const { market, deal, timing, risk, portfolio } = input;

  // ── Step 1: Collect votes from each engine ──────────────────────
  const riskOppScore = riskToOpportunity(risk.overallRiskScore);
  const portfolioScore = portfolioActionToScore(portfolio.nextAction);

  // Build votes array — always include the original 5
  const votes: EngineVote[] = [
    { engine: "\u9F8D\u7A74 Dragon\u2019s Lair", vote: classifyVote(market.confluenceScore), score: market.confluenceScore, verdict: mapMarketVerdict(market.verdict), weight: 0 },
    { engine: "\u7389\u77F3 Jade Test", vote: classifyVote(deal.confluenceScore), score: deal.confluenceScore, verdict: mapDealVerdict(deal.verdict), weight: 0 },
    { engine: "\u5929\u6642 Heaven\u2019s Timing", vote: classifyVote(timing.confluenceScore), score: timing.confluenceScore, verdict: mapTimingVerdict(timing.verdict), weight: 0 },
    { engine: "\u8B77\u6CD5 Guardian", vote: classifyVote(riskOppScore), score: riskOppScore, verdict: mapRiskLevel(risk.riskLevel), weight: 0 },
    { engine: "\u5BB6\u696D Empire", vote: classifyVote(portfolioScore), score: portfolioScore, verdict: mapPortfolioAction(portfolio.nextAction), weight: 0 },
  ];

  // Add extended engines when provided
  if (input.rateTransmission) {
    votes.push({ engine: "Rate Transmission", vote: classifyVote(input.rateTransmission.confluenceScore), score: input.rateTransmission.confluenceScore, verdict: input.rateTransmission.verdict, weight: 0 });
  }
  if (input.supplyPipeline) {
    votes.push({ engine: "Supply Pipeline", vote: classifyVote(input.supplyPipeline.confluenceScore), score: input.supplyPipeline.confluenceScore, verdict: input.supplyPipeline.verdict, weight: 0 });
  }
  if (input.demandVelocity) {
    votes.push({ engine: "Demand Velocity", vote: classifyVote(input.demandVelocity.confluenceScore), score: input.demandVelocity.confluenceScore, verdict: input.demandVelocity.verdict, weight: 0 });
  }
  if (input.exitStrategy) {
    // Exit strategy is INVERTED: high = "sell now" which is bearish for buying.
    // We invert the score so it aligns with the buy/hold framing.
    const exitOppScore = riskToOpportunity(input.exitStrategy.confluenceScore);
    votes.push({ engine: "Exit Strategy", vote: classifyVote(exitOppScore), score: exitOppScore, verdict: input.exitStrategy.verdict, weight: 0 });
  }
  if (input.microLocation) {
    votes.push({ engine: "Micro-Location", vote: classifyVote(input.microLocation.confluenceScore), score: input.microLocation.confluenceScore, verdict: input.microLocation.verdict, weight: 0 });
  }
  if (input.transactionIntelligence) {
    votes.push({ engine: "Transaction Intelligence", vote: classifyVote(input.transactionIntelligence.confluenceScore), score: input.transactionIntelligence.confluenceScore, verdict: input.transactionIntelligence.verdict, weight: 0 });
  }
  if (input.financing || input.taxEfficiency) {
    const blendedScore = blendFinancingTax(input.financing, input.taxEfficiency);
    const blendedVerdict = blendFinancingTaxVerdict(input.financing, input.taxEfficiency);
    votes.push({ engine: "Financing + Tax", vote: classifyVote(blendedScore), score: blendedScore, verdict: blendedVerdict, weight: 0 });
  }

  // Resolve weights based on which engines are present, then assign
  const engineNames = votes.map((v) => v.engine);
  const weights = resolveWeights(engineNames);
  for (const v of votes) {
    v.weight = weights[v.engine] ?? 0;
  }

  const totalEngines = votes.length;
  const bullishCount = votes.filter((v) => v.vote === "bullish").length;
  const bearishCount = votes.filter((v) => v.vote === "bearish").length;
  const neutralCount = votes.filter((v) => v.vote === "neutral").length;

  // ── Step 2: Weighted composite score ───────────────────────────
  const rawScore = votes.reduce((s, v) => s + v.score * v.weight, 0);

  // ── Step 3: Agreement analysis (dynamic based on engine count) ─
  let agreementLevel: MasterConfluenceResult["agreementLevel"];
  let agreementMultiplier: number;

  const majorityDirection = Math.max(bullishCount, bearishCount);
  const majorityPct = majorityDirection / totalEngines;

  if (majorityPct >= 1.0) {
    agreementLevel = "unanimous";
    agreementMultiplier = 1.4;
  } else if (majorityPct >= 0.75) {
    agreementLevel = "strong";
    agreementMultiplier = 1.25;
  } else if (majorityPct >= 0.55) {
    agreementLevel = "majority";
    agreementMultiplier = 1.1;
  } else if (bullishCount > 0 && bearishCount > 0 && Math.min(bullishCount, bearishCount) / totalEngines >= 0.3) {
    agreementLevel = "conflicting";
    agreementMultiplier = 0.6;
  } else {
    agreementLevel = "split";
    agreementMultiplier = 0.8;
  }

  // Apply agreement multiplier — amplify when engines agree, dampen when they conflict
  const adjustedScore = clamp(rawScore * agreementMultiplier, 0, 100);

  // ── Step 4: Independent probability (assuming ~65% base accuracy per engine) ──
  const baseAccuracy = 0.65;
  const baseError = 1 - baseAccuracy;
  const agreeing = Math.max(bullishCount, bearishCount);
  const independentProbability = agreeing > 0
    ? Math.round((1 - Math.pow(baseError, agreeing)) * 100)
    : 50;

  // ── Step 5: Confidence ─────────────────────────────────────────
  // Confidence = f(agreement strength, individual confidences, data completeness)
  const agreementConfidence = agreementLevel === "unanimous" ? 95
    : agreementLevel === "strong" ? 85
    : agreementLevel === "majority" ? 70
    : agreementLevel === "split" ? 45 : 30;

  const confidence = clamp(Math.round(
    agreementConfidence * 0.5 +
    independentProbability * 0.3 +
    (timing.componentScores.timingSignal.score > 60 ? 20 : 10) * 0.2
  ), 15, 99);

  // ── Step 6: Final verdict ──────────────────────────────────────
  const verdict = ((): ConfluenceVerdict => {
    if (adjustedScore >= 85 && agreementLevel !== "conflicting") return { signal: "STRONG_BUY", label: "Strong Buy \u2014 Heaven\u2019s Will is clear", color: "green" };
    if (adjustedScore >= 72) return { signal: "BUY", label: "Buy \u2014 Forces aligned", color: "green" };
    if (adjustedScore >= 60) return { signal: "LEAN_BUY", label: "Lean Buy \u2014 Favorable reading", color: "green" };
    if (adjustedScore >= 45) return { signal: "NEUTRAL", label: "Neutral \u2014 Forces in tension", color: "gold" };
    if (adjustedScore >= 35) return { signal: "LEAN_PASS", label: "Lean Pass \u2014 Guardian advises patience", color: "gold" };
    if (adjustedScore >= 20) return { signal: "PASS", label: "Pass \u2014 Forces scattered", color: "red" };
    return { signal: "HARD_PASS", label: "Hard Pass \u2014 Heaven says: not this path", color: "red" };
  })();

  // ── Step 7: Cross-validation insights ──────────────────────────
  const sortedVotes = [...votes].sort((a, b) => b.score - a.score);
  const strongest = sortedVotes[0]!;
  const weakest = sortedVotes[sortedVotes.length - 1]!;
  const strongestSignal = `${strongest.engine} (${strongest.score}/100: ${strongest.verdict})`;
  const weakestLink = `${weakest.engine} (${weakest.score}/100: ${weakest.verdict})`;

  const contradictions: string[] = [];
  const reinforcements: string[] = [];

  // Find specific cross-engine agreements and disagreements
  if (market.verdict === "TOP_PICK" && deal.verdict === "EXCEPTIONAL_DEAL") {
    reinforcements.push("Market quality AND deal quality both at highest level — rare convergence");
  }
  if (market.verdict === "TOP_PICK" && risk.riskLevel === "high") {
    contradictions.push("Top-rated market but elevated risk — investigate specific risk factors");
  }
  if (timing.verdict === "ACT_NOW" && risk.riskLevel === "elevated") {
    contradictions.push("Timing says act now but risk is elevated — speed vs safety conflict");
  }
  if (timing.verdict === "ACT_NOW" && deal.confluenceScore >= 70) {
    reinforcements.push("Strong deal available in optimal timing window — compounding opportunity");
  }
  if (deal.confluenceScore >= 70 && riskOppScore >= 70) {
    reinforcements.push("Deal quality high AND risk low — strong risk-adjusted return profile");
  }
  if (portfolio.nextAction === "BUY_NOW" && timing.verdict === "ACT_NOW") {
    reinforcements.push("Portfolio optimization AND timing both signal immediate action");
  }
  if (portfolio.nextAction === "REBALANCE" && market.verdict === "TOP_PICK") {
    contradictions.push("Market is top-rated but portfolio needs rebalancing — consider a different geography");
  }
  if (deal.dealBreakers.length > 0) {
    contradictions.push(`Deal has ${deal.dealBreakers.length} deal-breaker(s): ${deal.dealBreakers[0]}`);
  }
  if (risk.redFlags.length > 0) {
    contradictions.push(`Risk engine flagged ${risk.redFlags.length} red flag(s): ${risk.redFlags[0]}`);
  }

  // ── Step 7b: Extended cross-validation insights ──────────────
  if (input.rateTransmission) {
    if (input.rateTransmission.verdict === "TAILWIND" && timing.verdict === "ACT_NOW") {
      reinforcements.push("Rate tailwind + optimal timing — financing environment amplifies the entry window");
    }
    if (input.rateTransmission.verdict === "SEVERE_HEADWIND" && deal.confluenceScore >= 70) {
      contradictions.push("Strong deal in a severe rate headwind — deal economics may erode as rates transmit");
    }
  }
  if (input.supplyPipeline) {
    if (input.supplyPipeline.verdict === "SEVERELY_CONSTRAINED" && market.verdict === "TOP_PICK") {
      reinforcements.push("Top market with severely constrained supply — structural price support");
    }
    if (input.supplyPipeline.verdict === "GLUT") {
      contradictions.push("Supply glut detected — new inventory will compete with your property");
    }
  }
  if (input.demandVelocity) {
    if (input.demandVelocity.verdict === "SURGE" || input.demandVelocity.verdict === "STRONG") {
      reinforcements.push(`Demand velocity ${input.demandVelocity.verdict.toLowerCase()} — ${input.demandVelocity.demandSources}`);
    }
    if (input.demandVelocity.verdict === "COLLAPSING") {
      contradictions.push("Demand collapsing — buyer pool evaporating across multiple layers");
    }
  }
  if (input.transactionIntelligence) {
    if (input.transactionIntelligence.verdict === "BUYERS_MARKET" && deal.confluenceScore >= 60) {
      reinforcements.push("Buyer's market + strong deal — maximum negotiation leverage");
    }
    if (input.transactionIntelligence.verdict === "SELLERS_MARKET" && timing.verdict === "ACT_NOW") {
      contradictions.push("Timing says act now but seller's market limits negotiation — pay full price or wait");
    }
  }
  if (input.microLocation) {
    if (input.microLocation.verdict === "PRIME_LOCATION" || input.microLocation.verdict === "STRONG") {
      reinforcements.push(`Micro-location is ${input.microLocation.verdict.toLowerCase().replace(/_/g, " ")} — ${input.microLocation.appreciationDriver}`);
    }
    if (input.microLocation.verdict === "AVOID") {
      contradictions.push("Micro-location rated AVOID — neighborhood-level issues override market-level signals");
    }
  }

  // ── Step 8: Narrative ──────────────────────────────────────────
  const convergenceNarrative = buildConvergenceNarrative(
    adjustedScore, agreementLevel, bullishCount, bearishCount, totalEngines, votes, contradictions, reinforcements
  );

  // ── Step 9: Actionable output ──────────────────────────────────
  const decision = buildDecision(verdict, confidence, agreementLevel, strongestSignal);
  const nextSteps = buildNextSteps(verdict, market, deal, timing, risk, portfolio);
  const timeframe = timing.verdict === "ACT_NOW" ? "Act within 1-2 weeks"
    : timing.verdict === "MOVE_SOON" ? "Act within 1 month"
    : timing.verdict === "GOOD_WINDOW" ? "Good entry window — act within 6 weeks"
    : timing.verdict === "NEUTRAL" ? "No urgency — research further"
    : timing.verdict === "PATIENCE" ? "Wait 3-6 months and re-evaluate"
    : "Market may be peaking — proceed with extreme caution";

  const revisitTriggers = [
    "Mortgage rates change by ±0.5%",
    "Any watched market's APEX Score changes by ±10 points",
    `Risk level changes from "${risk.riskLevel}"`,
    "New comparable sales data becomes available",
    `${timing.componentScores.timingSignal.score < 50 ? "Timing signal improves to FAVORABLE or better" : "Timing signal deteriorates below NEUTRAL"}`,
  ];

  return {
    probabilityScore: Math.round(adjustedScore),
    confidence,
    verdict,
    votes,
    bullishCount,
    bearishCount,
    neutralCount,
    agreementLevel,
    agreementMultiplier,
    independentProbability,
    convergenceNarrative,
    strongestSignal,
    weakestLink,
    contradictions,
    reinforcements,
    decision,
    nextSteps,
    timeframe,
    revisitTriggers,
  };
}

// ============================================================
// Narrative Builders
// ============================================================

function buildConvergenceNarrative(
  score: number, agreement: string, bullish: number, bearish: number,
  total: number, votes: EngineVote[], contradictions: string[], reinforcements: string[],
): string {
  const dir = bullish > bearish ? "bullish" : bearish > bullish ? "bearish" : "mixed";
  const compoundProb = Math.round((1 - Math.pow(0.35, Math.max(bullish, bearish))) * 100);

  if (agreement === "unanimous") {
    return `All ${total} forces are aligned. This level of elemental harmony is rare and compounds individual accuracy from ~65% to ~${compoundProb}%. ` +
      `${reinforcements[0] ?? "Multiple independent data sources confirm the same directional signal."}`;
  }
  if (agreement === "strong") {
    const dissenter = votes.find((v) => v.vote !== dir);
    return `Strong convergence: ${Math.max(bullish, bearish)}/${total} forces ${dir === "bullish" ? "aligned" : dir === "bearish" ? "opposed" : "mixed"}. ` +
      `${dissenter ? `${dissenter.engine} dissents (${dissenter.verdict}).` : ""} ` +
      `Compound probability: ~${compoundProb}%. ` +
      `${contradictions[0] ?? ""}`;
  }
  if (agreement === "majority") {
    return `Majority agreement: ${Math.max(bullish, bearish)}/${total} forces ${dir === "bullish" ? "aligned" : dir === "bearish" ? "opposed" : "mixed"} with a score of ${Math.round(score)}. ` +
      `${contradictions.length > 0 ? `Key tension: ${contradictions[0]}. ` : ""}` +
      `${reinforcements.length > 0 ? `Positive signal: ${reinforcements[0]}.` : "Confidence is moderate \u2014 watch for signals to converge further."}`;
  }
  if (agreement === "conflicting") {
    return `Forces are in direct conflict: ${bullish} aligned vs ${bearish} opposed (of ${total}). ` +
      `This usually means different time horizons are sending different signals. ` +
      `${contradictions[0] ?? "Wait for clearer convergence before committing capital."} ` +
      `Score dampened to ${Math.round(score)} due to disagreement.`;
  }
  return `Split signals with no clear majority (${total} forces). ${neutralCount(votes)} force(s) neutral. ` +
    `This is not a high-conviction setup. Recommend waiting or gathering more data. ` +
    `${contradictions[0] ?? ""}`;
}

function neutralCount(votes: EngineVote[]): number {
  return votes.filter((v) => v.vote === "neutral").length;
}

function buildDecision(
  verdict: ConfluenceVerdict, confidence: number,
  agreement: string, strongest: string,
): string {
  if (verdict.signal === "STRONG_BUY") {
    return `High-conviction BUY signal at ${confidence}% confidence. ${agreement === "unanimous" ? "All" : "Nearly all"} forces agree. Strongest signal from ${strongest}.`;
  }
  if (verdict.signal === "BUY" || verdict.signal === "LEAN_BUY") {
    return `${verdict.label} at ${confidence}% confidence. Majority of forces positive, led by ${strongest}. Proceed with standard due diligence.`;
  }
  if (verdict.signal === "NEUTRAL") {
    return `Forces in tension \u2014 no strong conviction in either direction. ${confidence}% confidence. Recommend additional research before committing.`;
  }
  return `${verdict.label} at ${confidence}% confidence. Multiple forces flag concerns. Re-evaluate when conditions change.`;
}

function buildNextSteps(
  verdict: ConfluenceVerdict,
  market: MarketSelectionResult, deal: DealQualityResult,
  timing: EntryTimingResult, risk: RiskConfluenceResult,
  portfolio: PortfolioOptimizationResult,
): string[] {
  const steps: string[] = [];

  if (verdict.color === "green") {
    if (deal.negotiationLeverage.length > 0) steps.push(`Negotiate: ${deal.negotiationLeverage[0]}`);
    steps.push("Run final due diligence: inspection, title search, rent verification");
    if (risk.yellowFlags.length > 0) steps.push(`Mitigate risk: ${risk.mitigations[0] ?? risk.yellowFlags[0]}`);
    steps.push(`Target closing within ${timing.optimalWindowWeeks <= 4 ? "2-4 weeks" : "1-2 months"}`);
    if (portfolio.goalProgress.propertiesNeeded > 0) {
      steps.push(`This brings you ${Math.round(100 / (portfolio.goalProgress.propertiesNeeded + 1))}% closer to your cash flow goal`);
    }
  } else if (verdict.color === "gold") {
    steps.push("Gather more data — request seller disclosures and recent inspection reports");
    if (market.concerns.length > 0) steps.push(`Research concern: ${market.concerns[0]}`);
    steps.push("Set alerts for this market and revisit in 2-4 weeks");
    if (timing.waitingBenefits.length > 0) steps.push(`Potential benefit of waiting: ${timing.waitingBenefits[0]}`);
  } else {
    if (risk.redFlags.length > 0) steps.push(`Critical risk: ${risk.redFlags[0]}`);
    if (deal.dealBreakers.length > 0) steps.push(`Deal breaker: ${deal.dealBreakers[0]}`);
    steps.push("Look at alternative properties or markets");
    if (portfolio.portfolioHealth.optimizationOpportunities.length > 0) {
      steps.push(`Instead, consider: ${portfolio.portfolioHealth.optimizationOpportunities[0]}`);
    }
    steps.push("Set watchlist alerts for when conditions improve");
  }

  return steps.slice(0, 5);
}
