/**
 * Temporal Confluence Engine (CHRONOS) — "Do all timeframes agree?"
 * Multi-resolution temporal confirmation: same signal confirmed across
 * short-term (1-3mo), medium-term (3-12mo), and long-term (1-5yr).
 * When all 3 agree: highest confidence. Divergence reveals
 * temporary spikes vs structural trends. Pure functions, no side effects.
 */
export interface TemporalInput {
  shortTermSignals: { googleTrendsChange: number; newListingsChange: number; showingActivityChange: number; mortgageAppChange: number };
  mediumTermSignals: { migrationTrend: number; permitTrend: number; priceChange6mo: number; inventoryChange6mo: number };
  longTermSignals: { populationGrowth5yr: number; incomeGrowth5yr: number; kindergartenEnrollmentChange: number; infrastructureInvestment: number };
}

export interface TemporalResult {
  confluenceScore: number; shortTermScore: number; mediumTermScore: number; longTermScore: number;
  alignment: "all_agree" | "short_medium_agree" | "medium_long_agree" | "short_long_diverge" | "all_diverge";
  interpretation: string; sustainabilityAssessment: string; actionImplication: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cl = (v: number) => clamp(Math.round(v), 0, 100);

function scoreShortTerm(s: TemporalInput["shortTermSignals"]): number {
  return cl(cl(50 + s.googleTrendsChange * 2) * 0.25 + cl(50 + s.newListingsChange * 1.5) * 0.25
    + cl(50 + s.showingActivityChange * 2) * 0.25 + cl(50 + s.mortgageAppChange * 1.5) * 0.25);
}
function scoreMediumTerm(s: TemporalInput["mediumTermSignals"]): number {
  return cl(cl(50 + s.migrationTrend / 100) * 0.30 + cl(50 + s.permitTrend * 2) * 0.20
    + cl(50 + s.priceChange6mo * 4) * 0.30 + cl(50 - s.inventoryChange6mo * 2) * 0.20);
}
function scoreLongTerm(s: TemporalInput["longTermSignals"]): number {
  return cl(cl(50 + s.populationGrowth5yr * 20) * 0.30 + cl(50 + s.incomeGrowth5yr * 3) * 0.30
    + cl(50 + s.kindergartenEnrollmentChange * 5) * 0.15 + cl(s.infrastructureInvestment) * 0.25);
}

function classifyAlignment(short: number, med: number, long: number): TemporalResult["alignment"] {
  const bull = (s: number) => s >= 55;
  const bear = (s: number) => s < 45;
  const sB = bull(short), mB = bull(med), lB = bull(long);
  const sR = bear(short), mR = bear(med), lR = bear(long);
  if ((sB && mB && lB) || (sR && mR && lR)) return "all_agree";
  if ((sB && mB) || (sR && mR)) return "short_medium_agree";
  if ((mB && lB) || (mR && lR)) return "medium_long_agree";
  if ((sB && lR) || (sR && lB)) return "short_long_diverge";
  return "all_diverge";
}

function buildInterpretation(alignment: TemporalResult["alignment"], s: number, m: number, l: number): string {
  const dir = (v: number) => v >= 55 ? "bullish" : v < 45 ? "bearish" : "neutral";
  switch (alignment) {
    case "all_agree":
      return `All timeframes ${dir(s)}: short ${s}, medium ${m}, long ${l}. Highest-confidence signal — structural and cyclical forces aligned.`;
    case "short_medium_agree":
      return `Short (${s}) and medium (${m}) ${dir(s)}, but long-term ${dir(l)} (${l}). Current momentum may not have structural backing.`;
    case "medium_long_agree":
      return `Medium (${m}) and long (${l}) ${dir(m)}, but short-term ${dir(s)} (${s}). Near-term noise diverges from the structural trend.`;
    case "short_long_diverge":
      return `Short-term (${s}) ${dir(s)} diverges from long-term (${l}) ${dir(l)}. Classic signal conflict — investigate causation.`;
    default:
      return `No timeframe alignment: short ${s}, medium ${m}, long ${l}. Low conviction — wait for signals to converge.`;
  }
}

function buildSustainability(alignment: TemporalResult["alignment"], s: number, l: number): string {
  if (alignment === "all_agree" && s >= 55) return "Long-term fundamentals support short-term surge. Sustainable growth trajectory.";
  if (alignment === "all_agree" && s < 45) return "Structural decline confirmed across all timeframes. Expect continued weakness.";
  if (s >= 60 && l < 45) return "Temporary spike without structural support. Short-term momentum will likely fade.";
  if (s < 40 && l >= 60) return "Short-term headwinds mask a strong structural trend. Patience will be rewarded.";
  if (alignment === "medium_long_agree" && l >= 55) return "Structural trend is intact despite near-term noise. Medium-term conviction warranted.";
  return "Mixed sustainability signals. Monitor for emerging alignment before taking a position.";
}

function buildAction(alignment: TemporalResult["alignment"], score: number, s: number, l: number): string {
  if (alignment === "all_agree" && score >= 65) return "All timeframes confirm — deploy capital with conviction. Size up.";
  if (alignment === "all_agree" && score < 35) return "All timeframes bearish — avoid or short. No structural floor.";
  if (s >= 60 && l < 45) return "Do not buy for long-term hold. Short-term trade only with tight exit discipline.";
  if (s < 40 && l >= 60) return "Patience — structural trend is your friend. Accumulate on short-term dips.";
  if (alignment === "medium_long_agree" && l >= 55) return "Ignore short-term noise. Medium-term entry with structural backing.";
  return "Wait for convergence across at least 2 timeframes before committing capital.";
}

export function computeTemporalConfluence(input: TemporalInput): TemporalResult {
  const shortTermScore = scoreShortTerm(input.shortTermSignals);
  const mediumTermScore = scoreMediumTerm(input.mediumTermSignals);
  const longTermScore = scoreLongTerm(input.longTermSignals);

  const alignment = classifyAlignment(shortTermScore, mediumTermScore, longTermScore);

  // Weight long-term more heavily for investment decisions
  const raw = shortTermScore * 0.25 + mediumTermScore * 0.35 + longTermScore * 0.40;
  // Bonus for alignment, penalty for divergence
  const alignmentMod = alignment === "all_agree" ? 8 : alignment === "all_diverge" ? -8
    : alignment === "short_long_diverge" ? -5 : 3;
  const confluenceScore = cl(raw + alignmentMod);

  return {
    confluenceScore,
    shortTermScore,
    mediumTermScore,
    longTermScore,
    alignment,
    interpretation: buildInterpretation(alignment, shortTermScore, mediumTermScore, longTermScore),
    sustainabilityAssessment: buildSustainability(alignment, shortTermScore, longTermScore),
    actionImplication: buildAction(alignment, confluenceScore, shortTermScore, longTermScore),
  };
}
