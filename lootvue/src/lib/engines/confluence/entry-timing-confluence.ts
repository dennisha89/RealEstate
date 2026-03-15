/**
 * Entry Timing Confluence Engine
 *
 * Answers: "WHEN should I pull the trigger?" by stacking the fastest-moving
 * signals: timing engine, momentum delta, money-flow velocity, seasonal
 * patterns, rate forecast lag (Goldman 30-mo), and early-demand indicators.
 *
 * Pure functions, no side effects.
 */
export interface EntryTimingInput {
  timingSignal: "BUY_NOW" | "FAVORABLE" | "NEUTRAL" | "WAIT" | "MARKET_PEAKING";
  timingConfidence: number; trajectoryDirection: "improving" | "stable" | "deteriorating";
  optimalWindowMonths: number;
  compositeScore: number; compositeScorePrevMonth: number; // -100 to +100
  probability: number; signalConcordance: number; // 0-1
  transactionVelocity: "accelerating" | "stable" | "decelerating";
  capitalDeploymentRate: "fast" | "normal" | "slow";
  daysOnMarket: number; mortgageAppRate: "high" | "normal" | "low";
  currentMonth: number; // 1-12
  mortgageRateChange6mo: number; rateDirection: "falling" | "stable" | "rising";
  uspsMigrationTrend: "strong_inflow" | "moderate_inflow" | "stable" | "moderate_outflow" | "strong_outflow";
  utilityConnectionsTrend: "expansion" | "stable" | "contraction";
  searchVolumeTrend: "surging" | "growing" | "stable" | "declining";
}

interface ComponentScore { score: number; weight: number; source: string }

export interface EntryTimingResult {
  confluenceScore: number; // 0-100
  componentScores: {
    timingSignal: ComponentScore; momentum: ComponentScore; velocity: ComponentScore;
    seasonal: ComponentScore; rateForecast: ComponentScore; earlyDemand: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "ACT_NOW" | "MOVE_SOON" | "GOOD_WINDOW" | "NEUTRAL" | "PATIENCE" | "WAIT_FOR_CORRECTION";
  optimalWindowWeeks: number;
  thesis: string;
  catalysts: string[];
  windowClosingSignals: string[];
  waitingBenefits: string[];
}

// -- Helpers ------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pick = <K extends string>(map: Record<K, number>, key: K) => map[key];
const avg = (...ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) / ns.length);

const TIMING_MAP: Record<EntryTimingInput["timingSignal"], number> = {
  BUY_NOW: 95, FAVORABLE: 75, NEUTRAL: 50, WAIT: 25, MARKET_PEAKING: 15,
};
const SEASONAL: Record<number, number> = {
  1: 40, 2: 50, 3: 70, 4: 75, 5: 65, 6: 50, 7: 45, 8: 45, 9: 60, 10: 65, 11: 55, 12: 35,
};
const W = { timingSignal: 0.25, momentum: 0.20, velocity: 0.20, seasonal: 0.10, rateForecast: 0.15, earlyDemand: 0.10 } as const;
const WINDOW: Record<EntryTimingResult["verdict"], number> = {
  ACT_NOW: 0, MOVE_SOON: 3, GOOD_WINDOW: 6, NEUTRAL: 10, PATIENCE: 16, WAIT_FOR_CORRECTION: 24,
};

// -- Component Scorers --------------------------------------------------------

function scoreTimingSignal(i: EntryTimingInput): number {
  const adj = i.trajectoryDirection === "improving" ? 5 : i.trajectoryDirection === "deteriorating" ? -10 : 0;
  return clamp(TIMING_MAP[i.timingSignal] + adj, 0, 100);
}

function scoreMomentum(i: EntryTimingInput): number {
  const delta = clamp((i.compositeScore - i.compositeScorePrevMonth + 20) * 2.5, 0, 100);
  const concAdj = (i.signalConcordance - 0.5) * 20;
  const lvlAdj = clamp((i.compositeScore + 100) / 4, 0, 25) - 12.5;
  return clamp(Math.round(delta + concAdj + lvlAdj), 0, 100);
}

function scoreVelocity(i: EntryTimingInput): number {
  const t3 = { accelerating: 80, stable: 50, decelerating: 20 } as const;
  const c3 = { fast: 80, normal: 50, slow: 20 } as const;
  const a3 = { high: 80, normal: 50, low: 20 } as const;
  const dom = clamp(Math.round(100 - (i.daysOnMarket - 10)), 10, 95);
  return avg(pick(t3, i.transactionVelocity), pick(c3, i.capitalDeploymentRate), dom, pick(a3, i.mortgageAppRate));
}

function scoreRateForecast(i: EntryTimingInput): number {
  const base = { falling: 80, stable: 50, rising: 25 } as const;
  const sign = i.rateDirection === "falling" ? 1 : i.rateDirection === "rising" ? -1 : 0;
  return clamp(Math.round(base[i.rateDirection] + clamp(Math.abs(i.mortgageRateChange6mo) * 15, 0, 20) * sign), 0, 100);
}

function scoreEarlyDemand(i: EntryTimingInput): number {
  const u = { strong_inflow: 95, moderate_inflow: 70, stable: 50, moderate_outflow: 30, strong_outflow: 10 } as const;
  const c = { expansion: 85, stable: 50, contraction: 15 } as const;
  const s = { surging: 90, growing: 70, stable: 50, declining: 20 } as const;
  return avg(pick(u, i.uspsMigrationTrend), pick(c, i.utilityConnectionsTrend), pick(s, i.searchVolumeTrend));
}

// -- Signal Generators --------------------------------------------------------

function buildSignals(i: EntryTimingInput, seasonalScore: number) {
  const cat: string[] = [], close: string[] = [], wait: string[] = [];
  if (i.rateDirection === "falling") {
    cat.push("Falling rates boost affordability — prices follow with ~30-month lag.");
    close.push("Rate cuts in motion; price appreciation will accelerate once buyers respond.");
  }
  if (i.rateDirection === "rising")
    wait.push("Rising rates suppressing demand — prices may soften over 6-12 months.");
  if (i.transactionVelocity === "accelerating")
    close.push("Transaction velocity accelerating — competition for deals increasing.");
  if (i.transactionVelocity === "decelerating")
    wait.push("Transaction velocity slowing — more negotiating leverage ahead.");
  if (i.uspsMigrationTrend === "strong_inflow" || i.uspsMigrationTrend === "moderate_inflow")
    close.push("Net migration inflows rising — demand pipeline building before it hits listings.");
  if (i.uspsMigrationTrend === "moderate_outflow" || i.uspsMigrationTrend === "strong_outflow")
    wait.push("Population outflows signal softening demand — prices may decline.");
  if (i.trajectoryDirection === "improving") cat.push("Market trajectory improving — momentum favors early entry.");
  if (i.trajectoryDirection === "deteriorating") wait.push("Deteriorating trajectory — patience may yield better entry.");
  if (i.searchVolumeTrend === "surging") close.push("Search volume surging — demand wave incoming within 1-3 months.");
  if (seasonalScore >= 65) cat.push("Seasonal tailwind: buying season increases inventory and competition.");
  return { catalysts: cat, windowClosingSignals: close, waitingBenefits: wait };
}

// -- Core Engine --------------------------------------------------------------

export function computeEntryTimingConfluence(input: EntryTimingInput): EntryTimingResult {
  const cs = {
    timingSignal: { score: scoreTimingSignal(input), weight: W.timingSignal, source: "TimingEngine" },
    momentum: { score: scoreMomentum(input), weight: W.momentum, source: "StackedSignals MoM delta" },
    velocity: { score: scoreVelocity(input), weight: W.velocity, source: "FollowTheMoney velocity" },
    seasonal: { score: SEASONAL[input.currentMonth] ?? 50, weight: W.seasonal, source: "Calendar seasonal pattern" },
    rateForecast: { score: scoreRateForecast(input), weight: W.rateForecast, source: "Goldman 30-month rate lag model" },
    earlyDemand: { score: scoreEarlyDemand(input), weight: W.earlyDemand, source: "USPS migration + utility + search" },
  };

  const confluenceScore = Math.round(Object.values(cs).reduce((s, c) => s + c.score * c.weight, 0));
  const scores = Object.values(cs).map(c => c.score);
  const bull = scores.filter(s => s > 60).length;
  const bear = scores.filter(s => s < 40).length;

  const agreement: EntryTimingResult["agreement"] =
    bull >= 5 ? "strong" : bull >= 4 ? "moderate" : bear >= 4 ? "divergent" : "mixed";
  const agreementDetail = `${bull}/6 bullish (>60), ${bear}/6 bearish (<40). `
    + (agreement === "strong" ? "Near-unanimous urgency across all signal layers."
      : agreement === "moderate" ? "Most signals favor acting, minor divergence."
      : agreement === "divergent" ? "Signals broadly favor patience or caution."
      : "Signals are split — no clear directional consensus.");

  let verdict: EntryTimingResult["verdict"];
  if (confluenceScore >= 80 && agreement !== "mixed" && agreement !== "divergent") verdict = "ACT_NOW";
  else if (confluenceScore >= 68) verdict = "MOVE_SOON";
  else if (confluenceScore >= 55) verdict = "GOOD_WINDOW";
  else if (confluenceScore >= 42) verdict = "NEUTRAL";
  else if (confluenceScore >= 28) verdict = "PATIENCE";
  else verdict = "WAIT_FOR_CORRECTION";

  const { catalysts, windowClosingSignals, waitingBenefits } = buildSignals(input, cs.seasonal.score);

  const top2 = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 2).map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim());

  let thesis: string;
  if (verdict === "ACT_NOW" || verdict === "MOVE_SOON") {
    thesis = `Confluence ${confluenceScore}/100 with ${agreement} agreement signals urgency. `
      + `${top2[0]} and ${top2[1]} drive the case. The ${input.timingSignal.replace(/_/g, " ").toLowerCase()} `
      + `signal aligns with ${input.transactionVelocity} velocity and ${input.rateDirection} rates. `
      + `Waiting risks missing the window as leading indicators point to tightening conditions.`;
  } else if (verdict === "GOOD_WINDOW" || verdict === "NEUTRAL") {
    thesis = `Confluence ${confluenceScore}/100 suggests a ${verdict === "GOOD_WINDOW" ? "reasonable" : "neutral"} window. `
      + `${top2[0]} leads, but ${agreement} agreement means moderate conviction. `
      + `Act on properties with strong standalone fundamentals rather than relying on macro timing.`;
  } else {
    thesis = `Confluence ${confluenceScore}/100 favors patience. `
      + `${agreement === "divergent" ? "Broadly bearish signals" : "Mixed signals"} with ${input.rateDirection} rates `
      + `and ${input.transactionVelocity} velocity. Wait for improving momentum or a clearer seasonal window.`;
  }

  return {
    confluenceScore, componentScores: cs, agreement, agreementDetail,
    verdict, optimalWindowWeeks: WINDOW[verdict], thesis,
    catalysts, windowClosingSignals, waitingBenefits,
  };
}
