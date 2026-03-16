/**
 * ORACLE — Outcome Tracking & Self-Improvement Engine
 *
 * Tracks predictions vs reality. Core feedback loop for self-improvement.
 * Measures: verdict accuracy, engine vote accuracy, calibration, market-level accuracy.
 */

export interface Prediction {
  id: string;
  createdAt: string;
  market: { zip: string; name: string; state: string };
  property?: { address: string; price: number };
  predictions: {
    prismVerdict: string;
    convictionScore: number;
    confidenceLevel: number;
    harmonicLevel: string;
    predictedAppreciation1yr: number;
    predictedCashFlow: number;
    predictedCapRate: number;
    timingVerdict: string;
    riskLevel: string;
  };
  engineVotes: Array<{
    engine: string;
    vote: "bullish" | "neutral" | "bearish";
    score: number;
  }>;
  outcomes?: {
    recordedAt: string;
    actualAppreciation: number;
    actualCashFlow?: number;
    actualCapRate?: number;
    userAction: "bought" | "passed" | "watching";
    wasCorrect?: boolean;
  };
}

export interface OracleStats {
  totalPredictions: number;
  predictionsWithOutcomes: number;
  accuracyRate: number;
  avgConfidenceWhenCorrect: number;
  avgConfidenceWhenWrong: number;
  strongBuyAccuracy: number;
  passAccuracy: number;
  bestPerformingEngine: string;
  worstPerformingEngine: string;
  marketAccuracy: Record<string, number>;
}

// --- Helpers ---

function generatePredictionId(): string {
  return `pred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isVerdictCorrect(verdict: string, actualAppreciation: number): boolean {
  const bullish = ["STRONG_BUY", "BUY", "LEAN_BUY"];
  const bearish = ["PASS", "STRONG_PASS", "LEAN_PASS"];
  if (bullish.includes(verdict)) return actualAppreciation > 0;
  if (bearish.includes(verdict)) return actualAppreciation <= 0;
  return Math.abs(actualAppreciation) <= 3; // NEUTRAL correct if within +/- 3%
}

function safeDiv(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

// --- Core Functions ---

export function createPrediction(params: Omit<Prediction, "id" | "createdAt">): Prediction {
  return { ...params, id: generatePredictionId(), createdAt: new Date().toISOString() };
}

export function recordOutcome(
  predictionId: string,
  outcome: NonNullable<Prediction["outcomes"]>,
  predictions: Prediction[]
): Prediction {
  const prediction = predictions.find((p) => p.id === predictionId);
  if (!prediction) throw new Error(`Prediction ${predictionId} not found`);
  const wasCorrect = isVerdictCorrect(prediction.predictions.prismVerdict, outcome.actualAppreciation);
  return { ...prediction, outcomes: { ...outcome, wasCorrect } };
}

export function computeOracleStats(predictions: Prediction[]): OracleStats {
  const withOutcomes = predictions.filter((p) => p.outcomes?.wasCorrect !== undefined);
  const correct = withOutcomes.filter((p) => p.outcomes?.wasCorrect === true);
  const wrong = withOutcomes.filter((p) => p.outcomes?.wasCorrect === false);

  const accuracyRate = Math.round(safeDiv(correct.length, withOutcomes.length) * 100);
  const avgConfidenceWhenCorrect = correct.length > 0
    ? Math.round(correct.reduce((s, p) => s + p.predictions.confidenceLevel, 0) / correct.length)
    : 0;
  const avgConfidenceWhenWrong = wrong.length > 0
    ? Math.round(wrong.reduce((s, p) => s + p.predictions.confidenceLevel, 0) / wrong.length)
    : 0;

  // Verdict-specific accuracy
  const strongBuys = withOutcomes.filter((p) => p.predictions.prismVerdict === "STRONG_BUY");
  const strongBuyAccuracy = Math.round(
    safeDiv(strongBuys.filter((p) => p.outcomes?.wasCorrect).length, strongBuys.length) * 100
  );
  const passes = withOutcomes.filter((p) =>
    ["PASS", "STRONG_PASS", "LEAN_PASS"].includes(p.predictions.prismVerdict)
  );
  const passAccuracy = Math.round(
    safeDiv(passes.filter((p) => p.outcomes?.wasCorrect).length, passes.length) * 100
  );

  // Engine leaderboard
  const engineAccuracies = computeEngineAccuracy(predictions);
  const sorted = [...engineAccuracies].sort((a, b) => b.accuracy - a.accuracy);
  const bestPerformingEngine = sorted[0]?.engine ?? "N/A";
  const worstPerformingEngine = sorted.length > 1 ? sorted[sorted.length - 1]!.engine : "N/A";

  // Market-level accuracy
  const marketAccuracy: Record<string, number> = {};
  const marketGroups = new Map<string, Prediction[]>();
  for (const p of withOutcomes) {
    if (!marketGroups.has(p.market.zip)) marketGroups.set(p.market.zip, []);
    marketGroups.get(p.market.zip)!.push(p);
  }
  for (const [zip, group] of marketGroups) {
    marketAccuracy[zip] = Math.round(
      safeDiv(group.filter((p) => p.outcomes?.wasCorrect).length, group.length) * 100
    );
  }

  return {
    totalPredictions: predictions.length,
    predictionsWithOutcomes: withOutcomes.length,
    accuracyRate,
    avgConfidenceWhenCorrect,
    avgConfidenceWhenWrong,
    strongBuyAccuracy,
    passAccuracy,
    bestPerformingEngine,
    worstPerformingEngine,
    marketAccuracy,
  };
}

export function computeEngineAccuracy(
  predictions: Prediction[]
): Array<{ engine: string; accuracy: number; totalPredictions: number }> {
  const withOutcomes = predictions.filter((p) => p.outcomes !== undefined);
  const engineMap = new Map<string, { correct: number; total: number }>();

  for (const pred of withOutcomes) {
    const appreciated = (pred.outcomes?.actualAppreciation ?? 0) > 0;
    for (const vote of pred.engineVotes) {
      if (!engineMap.has(vote.engine)) engineMap.set(vote.engine, { correct: 0, total: 0 });
      const entry = engineMap.get(vote.engine)!;
      entry.total++;
      const voteCorrect =
        (vote.vote === "bullish" && appreciated) ||
        (vote.vote === "bearish" && !appreciated) ||
        (vote.vote === "neutral" && Math.abs(pred.outcomes?.actualAppreciation ?? 0) <= 3);
      if (voteCorrect) entry.correct++;
    }
  }

  return Array.from(engineMap.entries())
    .map(([engine, stats]) => ({
      engine,
      accuracy: Math.round(safeDiv(stats.correct, stats.total) * 100),
      totalPredictions: stats.total,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

export function getCalibrationData(
  predictions: Prediction[]
): Array<{ confidenceBucket: string; predictedAccuracy: number; actualAccuracy: number; count: number }> {
  const withOutcomes = predictions.filter((p) => p.outcomes?.wasCorrect !== undefined);
  const buckets = [
    { label: "0-20%", min: 0, max: 20, midpoint: 10 },
    { label: "20-40%", min: 20, max: 40, midpoint: 30 },
    { label: "40-60%", min: 40, max: 60, midpoint: 50 },
    { label: "60-80%", min: 60, max: 80, midpoint: 70 },
    { label: "80-100%", min: 80, max: 100, midpoint: 90 },
  ];

  return buckets.map((b) => {
    const inBucket = withOutcomes.filter(
      (p) => p.predictions.confidenceLevel >= b.min && p.predictions.confidenceLevel < b.max
    );
    return {
      confidenceBucket: b.label,
      predictedAccuracy: b.midpoint,
      actualAccuracy: Math.round(safeDiv(inBucket.filter((p) => p.outcomes?.wasCorrect).length, inBucket.length) * 100),
      count: inBucket.length,
    };
  });
}
