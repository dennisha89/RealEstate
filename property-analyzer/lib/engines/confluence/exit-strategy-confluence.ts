/**
 * Exit Strategy Confluence Engine
 *
 * Answers: "WHEN and HOW should I sell?" by stacking hold-period optimality,
 * market cycle position, 1031 exchange readiness, cap-rate window,
 * refi-vs-sell analysis, and tax impact. Pure functions, no side effects.
 */
export interface ExitStrategyInput {
  purchasePrice: number; currentValue: number; yearsHeld: number;
  remainingLoanBalance: number; monthlyEquityGain: number; monthlyCashFlow: number;
  depreciationBasis: number; annualDepreciation: number; totalDepreciationTaken: number;
  marketCyclePosition: "early_recovery" | "expansion" | "late_cycle" | "peak" | "contraction";
  priceChangeYoY: number; priceChangePrevYear: number;
  currentCapRate: number; capRateTrend: "compressing" | "stable" | "expanding";
  capRateVsHistorical: number;
  identificationDeadlineDays?: number; exchangeDeadlineDays?: number;
  replacementPropertyAvailable: boolean;
  currentRate: number; marketRate: number; estimatedRefiCashout: number;
  capitalGainsTaxRate: number; depreciationRecaptureRate: number; stateIncomeTaxRate: number;
}

interface ComponentScore { score: number; weight: number; source: string }

export interface ExitStrategyResult {
  confluenceScore: number;
  componentScores: {
    holdPeriodOptimality: ComponentScore; marketCycle: ComponentScore;
    exchange1031: ComponentScore; capRateWindow: ComponentScore;
    refiVsSell: ComponentScore; taxImpact: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "SELL_NOW" | "SELL_SOON" | "HOLD_AND_REFI" | "HOLD" | "ACCUMULATE_MORE";
  optimalExitWindow: string; taxConsequence: string; refiAnalysis: string;
  holdVsSellComparison: {
    sellNowNetProceeds: number; holdOneMoreYearValue: number;
    holdThreeMoreYearsValue: number; recommendation: string;
  };
  thesis: string; exitActions: string[]; holdReasons: string[];
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const W = { hp: 0.20, mc: 0.25, ex: 0.15, cr: 0.15, rs: 0.15, tx: 0.10 } as const;

function calcTax(i: ExitStrategyInput) {
  const gain = i.currentValue - i.purchasePrice;
  const capGains = Math.max(gain - i.totalDepreciationTaken, 0) * i.capitalGainsTaxRate;
  const recapture = i.totalDepreciationTaken * i.depreciationRecaptureRate;
  const state = gain * i.stateIncomeTaxRate;
  return { gain, capGains, recapture, state, total: capGains + recapture + state };
}

function scoreHoldPeriod(i: ExitStrategyInput): number {
  const depYrsLeft = i.annualDepreciation > 0
    ? (i.depreciationBasis - i.totalDepreciationTaken) / i.annualDepreciation : 0;
  const dep = depYrsLeft > 15 ? 20 : depYrsLeft > 8 ? 35 : depYrsLeft > 3 ? 60 : 85;
  const eqR = i.monthlyCashFlow > 0 ? i.monthlyEquityGain / i.monthlyCashFlow : 0.5;
  const eq = eqR > 1.5 ? 30 : eqR > 0.8 ? 50 : 70;
  const yr = i.yearsHeld < 3 ? 20 : i.yearsHeld <= 5 ? 50 : i.yearsHeld <= 7 ? 75 : i.yearsHeld <= 10 ? 85 : 90;
  return Math.round(dep * 0.35 + eq * 0.30 + yr * 0.35);
}

function scoreMarketCycle(i: ExitStrategyInput): number {
  const base = { early_recovery: 10, expansion: 25, late_cycle: 70, peak: 95, contraction: 40 }[i.marketCyclePosition];
  const decel = i.priceChangeYoY > 0 && i.priceChangePrevYear > i.priceChangeYoY
    ? cl((i.priceChangePrevYear - i.priceChangeYoY) * 5, 0, 15) : 0;
  const mom = i.priceChangeYoY > 8 ? 10 : i.priceChangeYoY < -2 ? -15 : 0;
  return cl(Math.round(base + decel + mom), 0, 100);
}

function score1031(i: ExitStrategyInput): number {
  if (!i.replacementPropertyAvailable) return 25;
  const id = i.identificationDeadlineDays ?? 45, ex = i.exchangeDeadlineDays ?? 180;
  return id >= 30 && ex >= 120 ? 85 : id >= 15 ? 60 : 35;
}

function scoreCapRate(i: ExitStrategyInput): number {
  const base = { compressing: 85, stable: 50, expanding: 20 }[i.capRateTrend];
  return cl(Math.round(base + cl(-i.capRateVsHistorical * 15, -20, 20)), 0, 100);
}

function scoreRefi(i: ExitStrategyInput): number {
  const sp = i.marketRate - i.currentRate;
  const rate = sp > 1.5 ? 85 : sp > 0.5 ? 65 : sp > -0.5 ? 45 : sp > -1.5 ? 25 : 15;
  const eq = i.currentValue - i.remainingLoanBalance;
  const coR = eq > 0 ? i.estimatedRefiCashout / eq : 0;
  const co = coR > 0.6 && sp < 0.5 ? 20 : coR > 0.4 ? 40 : coR > 0.2 ? 60 : 80;
  return Math.round(rate * 0.55 + co * 0.45);
}

function scoreTax(i: ExitStrategyInput): number {
  const { gain, total } = calcTax(i);
  const effRate = gain > 0 ? total / gain : 0;
  return cl(Math.round(100 - effRate * 200), 0, 100);
}

export function computeExitStrategyConfluence(input: ExitStrategyInput): ExitStrategyResult {
  const cs = {
    holdPeriodOptimality: { score: scoreHoldPeriod(input), weight: W.hp, source: "Depreciation schedule + equity velocity" },
    marketCycle: { score: scoreMarketCycle(input), weight: W.mc, source: "Market cycle position + YoY momentum" },
    exchange1031: { score: score1031(input), weight: W.ex, source: "1031 exchange timeline + replacement availability" },
    capRateWindow: { score: scoreCapRate(input), weight: W.cr, source: "Cap rate trend vs 10yr historical avg" },
    refiVsSell: { score: scoreRefi(input), weight: W.rs, source: "Rate spread + cashout refi capacity" },
    taxImpact: { score: scoreTax(input), weight: W.tx, source: "Capital gains + depreciation recapture + state tax" },
  };

  const confluenceScore = Math.round(Object.values(cs).reduce((s, c) => s + c.score * c.weight, 0));
  const scores = Object.values(cs).map(c => c.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sd = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length);

  const agreement: ExitStrategyResult["agreement"] =
    sd < 12 ? "strong" : sd < 20 ? "moderate" : sd < 30 ? "mixed" : "divergent";
  const agreementDetail = { strong: "Tight convergence", moderate: "Engines mostly align",
    mixed: "Notable spread", divergent: "Significant disagreement" }[agreement]
    + ` (std dev ${sd.toFixed(0)}).`;

  const refiAttractive = input.marketRate < input.currentRate - 0.5
    && input.estimatedRefiCashout > (input.currentValue - input.remainingLoanBalance) * 0.3;

  let verdict: ExitStrategyResult["verdict"];
  if (confluenceScore >= 78 && agreement !== "divergent") verdict = "SELL_NOW";
  else if (confluenceScore >= 62) verdict = "SELL_SOON";
  else if (confluenceScore >= 45 && refiAttractive) verdict = "HOLD_AND_REFI";
  else if (confluenceScore >= 30) verdict = "HOLD";
  else verdict = "ACCUMULATE_MORE";

  const windowMap = { SELL_NOW: "Sell within 3 months — window is open.",
    SELL_SOON: "Sell within 6-12 months while conditions are favorable.",
    HOLD_AND_REFI: "Refinance now and hold 2-4 more years.",
    HOLD: "Hold 3+ more years — exit conditions are not favorable.",
    ACCUMULATE_MORE: "Continue accumulating — early in the value creation cycle." };

  // Tax & refi narratives
  const tax = calcTax(input);
  const tt = Math.round(tax.total);
  const taxConsequence = input.replacementPropertyAvailable
    ? `Selling triggers $${tt.toLocaleString()} in taxes. A 1031 exchange defers all of it.`
    : `Selling triggers $${tt.toLocaleString()} in taxes ($${Math.round(tax.recapture).toLocaleString()} recapture). No 1031 replacement identified.`;

  const sp = input.marketRate - input.currentRate;
  const refiAnalysis = sp < -0.5
    ? `Refi extracts $${input.estimatedRefiCashout.toLocaleString()} at ${input.marketRate.toFixed(2)}% (${Math.abs(sp).toFixed(2)}% below current) — strong hold+refi case.`
    : sp < 0.5
      ? `Refi at ${input.marketRate.toFixed(2)}% (similar to ${input.currentRate.toFixed(2)}%) — modest cashout of $${input.estimatedRefiCashout.toLocaleString()}.`
      : `Market rate ${input.marketRate.toFixed(2)}% is ${sp.toFixed(2)}% above current — refi unattractive. Sell if exit signals align.`;

  // Hold vs sell projection
  const eq = input.currentValue - input.remainingLoanBalance;
  const sellNow = Math.round(eq - tax.total);
  const annApp = input.priceChangeYoY / 100, annCF = input.monthlyCashFlow * 12, annEq = input.monthlyEquityGain * 12;
  const h1 = Math.round(sellNow + input.currentValue * annApp + annCF + annEq);
  const h3 = Math.round(sellNow + input.currentValue * annApp * 3 + annCF * 3 + annEq * 3);
  const d1 = h1 - sellNow;
  const rec = d1 > sellNow * 0.05 ? "Holding adds meaningful value — sell only if cycle or 1031 timing demands it."
    : d1 < 0 ? "Holding is value-destructive at current trajectory — consider exiting."
    : "Marginal hold benefit — exit timing should be driven by tax and cycle factors.";

  // Exit actions & hold reasons
  const exitActions: string[] = [], holdReasons: string[] = [];
  if (input.marketCyclePosition === "peak" || input.marketCyclePosition === "late_cycle")
    exitActions.push("Market at or near peak — capture appreciation before correction.");
  if (input.capRateTrend === "compressing") exitActions.push("Cap rates compressing — favorable sell window.");
  if (input.yearsHeld >= 7) exitActions.push("Held 7+ years — redeployment may yield higher returns.");
  if (input.replacementPropertyAvailable) exitActions.push("1031 replacement identified — tax-deferred exit feasible.");
  if (input.priceChangeYoY > 0 && input.priceChangePrevYear > input.priceChangeYoY)
    exitActions.push("Appreciation decelerating — sell before momentum reverses.");
  if (input.marketCyclePosition === "early_recovery" || input.marketCyclePosition === "expansion")
    holdReasons.push("Market in growth phase — ride the appreciation curve.");
  if (input.annualDepreciation > 0 && input.totalDepreciationTaken < input.depreciationBasis * 0.5)
    holdReasons.push("Significant depreciation tax benefit remaining.");
  if (refiAttractive) holdReasons.push("Attractive refinance available — extract equity without selling.");
  if (input.capRateTrend === "expanding") holdReasons.push("Cap rates expanding — selling into weakness.");
  if (input.monthlyCashFlow > 500) holdReasons.push(`Strong $${input.monthlyCashFlow.toLocaleString()}/mo cash flow justifies hold.`);

  const top2 = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 2).map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim());
  const cycle = input.marketCyclePosition.replace(/_/g, " ");
  const thesis = verdict === "SELL_NOW" || verdict === "SELL_SOON"
    ? `Exit confluence ${confluenceScore}/100 (${agreement}). ${top2[0]} and ${top2[1]} drive the sell case. `
      + `${cycle} cycle + ${input.capRateTrend} caps. `
      + (input.replacementPropertyAvailable ? "1031 ready." : `$${tt.toLocaleString()} tax on exit.`)
    : verdict === "HOLD_AND_REFI"
      ? `Exit confluence ${confluenceScore}/100 — not optimal. Refi extracts $${input.estimatedRefiCashout.toLocaleString()} at ${input.marketRate.toFixed(2)}%. Reassess in 12-18 months.`
      : `Exit confluence ${confluenceScore}/100 favors holding. ${top2[0]} and ${top2[1]} support patience. ${cycle} cycle, ${holdReasons.length} hold factors active.`;

  return {
    confluenceScore, componentScores: cs, agreement, agreementDetail, verdict,
    optimalExitWindow: windowMap[verdict], taxConsequence, refiAnalysis,
    holdVsSellComparison: { sellNowNetProceeds: sellNow, holdOneMoreYearValue: h1, holdThreeMoreYearsValue: h3, recommendation: rec },
    thesis, exitActions, holdReasons,
  };
}
