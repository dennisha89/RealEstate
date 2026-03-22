/**
 * Predictive Entry Timing Engine
 *
 * Combines stacked signal trajectory, leading indicator z-scores,
 * seasonal patterns, Goldman's rate-lag coefficient (~30mo), and
 * market velocity to determine optimal entry timing.
 *
 * Pure functions, no side effects.
 */

export interface TimingInput {
  compositeScore: number;          // -100 to +100
  compositeScorePrevMonth: number; // previous month's score
  probability: number;             // 0-100%
  permitGrowth: number;            // % change YoY
  mortgageRateChange: number;      // change in 6 months
  migrationInflow: number;         // net households/year
  currentMonth: number;            // 1-12
  inventoryMonths: number;
  daysOnMarket: number;
  priceCutPercent: number;
}

export interface TimingResult {
  signal: "BUY_NOW" | "FAVORABLE" | "NEUTRAL" | "WAIT" | "MARKET_PEAKING";
  confidence: number;              // 0-100%
  optimalWindowMonths: number;     // 0 = now
  reasoning: string[];             // 3-5 bullets
  seasonalAdjustment: number;      // -10 to +10
  trajectoryDirection: "improving" | "stable" | "deteriorating";
  rateImpact: {
    direction: "favorable" | "neutral" | "headwind";
    lagMonths: number;
    explanation: string;
  };
}

// -- Constants ---------------------------------------------------------------

const SEASONAL: Record<number, number> = {
  1: -2, 2: -2, 3: 5, 4: 5, 5: 5, 6: 0, 7: 0, 8: 0, 9: 3, 10: 3, 11: 3, 12: -2,
};
const RATE_LAG = 30;
const Z = { permit: { m: 0, s: 10 }, rate: { m: 0, s: 0.5 }, migration: { m: 500, s: 1500 } } as const;

// -- Helpers -----------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const zScore = (v: number, m: number, s: number) => (s === 0 ? 0 : clamp((v - m) / s, -3, 3));

function trajectory(cur: number, prev: number): TimingResult["trajectoryDirection"] {
  const d = cur - prev;
  return d > 5 ? "improving" : d < -5 ? "deteriorating" : "stable";
}

function rateImpact(rc: number): TimingResult["rateImpact"] {
  if (rc < -0.25) return { direction: "favorable", lagMonths: RATE_LAG,
    explanation: `Rates dropped ${Math.abs(rc).toFixed(2)}% in 6mo. Full price impact in ~${RATE_LAG}mo (Goldman lag). Early entry captures appreciation before it's priced in.` };
  if (rc > 0.25) return { direction: "headwind", lagMonths: RATE_LAG,
    explanation: `Rates rose ${rc.toFixed(2)}% in 6mo. Price suppression intensifies over ~${RATE_LAG}mo. Waiting may yield better entry.` };
  return { direction: "neutral", lagMonths: RATE_LAG,
    explanation: `Rates moved ${rc >= 0 ? "+" : ""}${rc.toFixed(2)}% in 6mo — normal range. No significant rate-driven price pressure.` };
}

// -- Core Engine -------------------------------------------------------------

export function computeEntryTiming(input: TimingInput): TimingResult {
  const traj = trajectory(input.compositeScore, input.compositeScorePrevMonth);
  const delta = input.compositeScore - input.compositeScorePrevMonth;

  // Leading indicator momentum (inverted for rates: rate up = bearish)
  const zP = zScore(input.permitGrowth, Z.permit.m, Z.permit.s);
  const zR = -zScore(input.mortgageRateChange, Z.rate.m, Z.rate.s);
  const zM = zScore(input.migrationInflow, Z.migration.m, Z.migration.s);
  const momentum = (zP + zR + zM) / 3;

  const seasonal = SEASONAL[input.currentMonth] ?? 0;
  const rate = rateImpact(input.mortgageRateChange);
  const adjusted = input.compositeScore + seasonal + momentum * 5;

  const improving = traj === "improving";
  const favorable = rate.direction === "favorable";
  const peaking = input.compositeScore > 40 && traj === "deteriorating";

  // Signal determination
  let signal: TimingResult["signal"];
  if (peaking || (input.compositeScore > 40 && input.priceCutPercent < 5 && traj === "deteriorating")) {
    signal = "MARKET_PEAKING";
  } else if (adjusted > 30 && improving && favorable) {
    signal = "BUY_NOW";
  } else if (adjusted > 15 && (improving || favorable)) {
    signal = "FAVORABLE";
  } else if (adjusted < -15 && traj === "deteriorating") {
    signal = "WAIT";
  } else {
    signal = "NEUTRAL";
  }

  const windowMap = { BUY_NOW: 0, FAVORABLE: 1, NEUTRAL: 3, WAIT: 6, MARKET_PEAKING: 3 };

  // Confidence from trajectory clarity + momentum + score strength
  const confidence = Math.round(clamp(
    ((traj !== "stable" ? 0.3 : 0.1) + Math.min(Math.abs(momentum) / 2, 0.3) + Math.min(Math.abs(input.compositeScore) / 60, 0.3) + 0.1) * 100,
    15, 95,
  ));

  // Build reasoning (3-5 bullets)
  const reasons: string[] = [];
  if (traj === "improving") reasons.push(`Positive momentum: score moved +${Math.round(delta)} pts month-over-month.`);
  else if (traj === "deteriorating") reasons.push(`Weakening momentum: score dropped ${Math.abs(Math.round(delta))} pts month-over-month.`);
  else reasons.push(`Range-bound: score changed only ${Math.abs(Math.round(delta))} pts month-over-month.`);

  if (momentum > 0.5) reasons.push(`Leading indicators collectively bullish (z-score +${momentum.toFixed(1)}).`);
  else if (momentum < -0.5) reasons.push(`Leading indicators flashing caution (z-score ${momentum.toFixed(1)}).`);

  reasons.push(rate.explanation);

  if (input.inventoryMonths < 3) reasons.push(`Tight supply (${input.inventoryMonths.toFixed(1)}mo inventory) favors sellers.`);
  else if (input.inventoryMonths > 5) reasons.push(`Elevated inventory (${input.inventoryMonths.toFixed(1)}mo) gives buyers leverage.`);

  if (seasonal > 0) reasons.push(`Seasonal tailwind: +${seasonal} pts (buying season, more inventory).`);
  else if (seasonal < 0) reasons.push(`Seasonal headwind: ${seasonal} pts (low winter activity).`);

  return {
    signal,
    confidence,
    optimalWindowMonths: windowMap[signal],
    reasoning: reasons.slice(0, 5),
    seasonalAdjustment: seasonal,
    trajectoryDirection: traj,
    rateImpact: rate,
  };
}
