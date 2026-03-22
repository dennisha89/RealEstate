/**
 * Behavioral-Fundamental Engine (MIRROR) — "Does the crowd see what the data sees?"
 * Compares what fundamentals say vs what investors are actually doing.
 * The best alpha signal: fundamentals HIGH + behavior LOW = hidden opportunity.
 * The worst trap: fundamentals LOW + behavior HIGH = crowded trade.
 * Pure functions, no side effects.
 */
export interface BehavioralFundamentalInput {
  fundamentalScore: number; fundamentalVerdict: string;
  watcherCount: number; watcherChange7d: number; analysisCount: number;
  buyVerdictPct: number; searchVolumeChange: number; communityHotness: number;
}

export interface BehavioralFundamentalResult {
  alignment: "confirmed" | "hidden_opportunity" | "crowded_trade" | "justified_skepticism" | "divergent";
  alphaSignal: string; interpretation: string; actionImplication: string; crowdAwareness: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cl = (v: number) => clamp(Math.round(v), 0, 100);

function computeCrowdAwareness(input: BehavioralFundamentalInput): number {
  const watcherScore = cl(Math.min(input.watcherCount / 50, 1) * 100);
  const changeScore = cl(50 + input.watcherChange7d * 2);
  const analysisScore = cl(Math.min(input.analysisCount / 20, 1) * 100);
  const verdictScore = cl(input.buyVerdictPct);
  const searchScore = cl(50 + input.searchVolumeChange * 1.5);
  const hotness = cl(input.communityHotness);
  return cl(
    watcherScore * 0.15 + changeScore * 0.15 + analysisScore * 0.15
    + verdictScore * 0.20 + searchScore * 0.15 + hotness * 0.20
  );
}

function classifyAlignment(fund: number, crowd: number): BehavioralFundamentalResult["alignment"] {
  if (fund >= 60 && crowd >= 60) return "confirmed";
  if (fund >= 60 && crowd < 40) return "hidden_opportunity";
  if (fund < 40 && crowd >= 60) return "crowded_trade";
  if (fund < 40 && crowd < 40) return "justified_skepticism";
  return "divergent";
}

function buildAlpha(alignment: BehavioralFundamentalResult["alignment"], fund: number, crowd: number): string {
  switch (alignment) {
    case "confirmed":
      return `Convergence at fund=${fund}, crowd=${crowd}. Consensus trade — alpha is limited, but directional risk is low.`;
    case "hidden_opportunity":
      return `Data says buy (${fund}), crowd hasn't found it (${crowd}). Maximum alpha window — act before awareness spreads.`;
    case "crowded_trade":
      return `Crowd is excited (${crowd}) but fundamentals don't support it (${fund}). Classic trap — hype without substance.`;
    case "justified_skepticism":
      return `Both data (${fund}) and crowd (${crowd}) are bearish. Correctly avoided — no contrarian value here.`;
    default:
      return `Moderate divergence: fund=${fund}, crowd=${crowd}. Signals are ambiguous — wait for clearer separation.`;
  }
}

function buildInterpretation(alignment: BehavioralFundamentalResult["alignment"], input: BehavioralFundamentalInput, crowd: number): string {
  const { watcherCount: watchers, analysisCount: analyses } = input;
  switch (alignment) {
    case "confirmed":
      return `${watchers} watchers and ${analyses} analyses this week confirm what ${input.fundamentalVerdict} fundamentals show. `
        + `Everyone sees this opportunity — execution speed and deal terms will differentiate winners.`;
    case "hidden_opportunity":
      return `Fundamentals grade ${input.fundamentalVerdict} (${input.fundamentalScore}/100), but only ${watchers} watchers `
        + `and ${analyses} analyses this week. The crowd hasn't discovered this market yet.`;
    case "crowded_trade":
      return `${watchers} watchers and ${input.buyVerdictPct}% buy verdicts despite weak fundamentals (${input.fundamentalScore}/100). `
        + `Herd behavior is driving attention without data support. High risk of correction.`;
    case "justified_skepticism":
      return `Low fundamental score (${input.fundamentalScore}/100) correctly matched by low crowd interest (${crowd}/100). `
        + `No contrarian case here — the crowd is right to avoid this market.`;
    default:
      return `Partial divergence: fundamentals at ${input.fundamentalScore}/100, crowd awareness at ${crowd}/100. `
        + `Neither a clear opportunity nor a clear trap. Monitor for convergence.`;
  }
}

function buildAction(alignment: BehavioralFundamentalResult["alignment"]): string {
  switch (alignment) {
    case "confirmed":
      return "Compete on execution, not discovery. Offer fast close, flexible terms. Alpha comes from deal structure, not market selection.";
    case "hidden_opportunity":
      return "Move quickly and quietly. This is the highest-alpha window. Build position before crowd awareness catches up.";
    case "crowded_trade":
      return "Do NOT follow the crowd. If already holding, consider taking profits. If considering entry, wait for hype to deflate.";
    case "justified_skepticism":
      return "Stay away. Both data and crowd agree this market is weak. Deploy capital elsewhere.";
    default:
      return "Wait for clearer signal. Set alerts for fundamental improvement or crowd sentiment shifts.";
  }
}

export function computeBehavioralFundamental(input: BehavioralFundamentalInput): BehavioralFundamentalResult {
  const crowdAwareness = computeCrowdAwareness(input);
  const alignment = classifyAlignment(input.fundamentalScore, crowdAwareness);

  return {
    alignment,
    alphaSignal: buildAlpha(alignment, input.fundamentalScore, crowdAwareness),
    interpretation: buildInterpretation(alignment, input, crowdAwareness),
    actionImplication: buildAction(alignment),
    crowdAwareness,
  };
}
