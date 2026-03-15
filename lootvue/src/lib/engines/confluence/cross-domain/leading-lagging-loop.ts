/**
 * Leading-Lagging Loop Engine (ECHO) — "Were our predictions correct?"
 * Tracks whether leading indicators correctly predicted what lagging
 * indicators confirmed. Self-improving loop: when predictions are
 * correct, boost confidence; when wrong, identify misleading signals.
 * Pure functions, no side effects.
 */
export interface LeadingLaggingInput {
  leadingPrediction: {
    date: string; predictedDirection: "bullish" | "bearish" | "neutral";
    predictedAppreciation: number; confidence: number; keyLeadingSignals: string[];
  };
  laggingConfirmation: { date: string; actualPriceChange: number; actualRentChange: number; actualInventoryChange: number };
}

export interface LeadingLaggingResult {
  predictionAccurate: boolean; accuracyScore: number; directionCorrect: boolean; magnitudeError: number;
  confidenceCalibration: string; adjustmentRecommendation: string; trackRecord: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cl = (v: number) => clamp(Math.round(v), 0, 100);

function actualDirection(price: number, rent: number): "bullish" | "bearish" | "neutral" {
  const c = price * 0.6 + rent * 0.4;
  return c > 1.5 ? "bullish" : c < -1.5 ? "bearish" : "neutral";
}

function computeAccuracy(dirCorrect: boolean, magError: number, invAligned: boolean): number {
  return cl((dirCorrect ? 50 : 0) + cl(35 - magError * 5) + (invAligned ? 15 : 0));
}

function buildCalibration(confidence: number, accurate: boolean, magnitudeError: number): string {
  if (accurate && confidence >= 70) {
    return `Model was ${confidence}% confident and was correct (${magnitudeError.toFixed(1)}% magnitude error). Well-calibrated high-conviction call.`;
  }
  if (accurate && confidence < 40) {
    return `Model was only ${confidence}% confident but was correct. Under-confident — boost weight for the leading signals that fired.`;
  }
  if (!accurate && confidence >= 70) {
    return `Model was ${confidence}% confident but was WRONG (${magnitudeError.toFixed(1)}% error). Overconfident — reduce signal weights or add contrary indicators.`;
  }
  if (!accurate && confidence < 40) {
    return `Model was ${confidence}% confident and was wrong. Low conviction matched poor outcome — calibration is acceptable but signals need improvement.`;
  }
  if (accurate) {
    return `Model was ${confidence}% confident and directionally correct. Moderate calibration — magnitude error of ${magnitudeError.toFixed(1)}% suggests room for tuning.`;
  }
  return `Model was ${confidence}% confident but missed the call. Review which leading signals were misleading for this market.`;
}

function buildAdjustment(
  directionCorrect: boolean,
  magnitudeError: number,
  confidence: number,
  signals: string[]
): string {
  if (directionCorrect && magnitudeError < 2) {
    return `Leading signals (${signals.slice(0, 3).join(", ")}) performed well. Boost their weight by 10% for this market type.`;
  }
  if (directionCorrect && magnitudeError >= 2) {
    return `Direction correct but magnitude off by ${magnitudeError.toFixed(1)}%. Scale factor needs adjustment — predicted move was ${magnitudeError > 0 ? "under" : "over"}-estimated.`;
  }
  if (!directionCorrect && confidence >= 60) {
    return `High-confidence miss. Investigate which of [${signals.slice(0, 3).join(", ")}] gave a false signal. Reduce their weight by 15% for similar markets.`;
  }
  if (!directionCorrect) {
    return `Direction wrong. Leading signals (${signals.slice(0, 3).join(", ")}) were misleading in this context. Add contrary indicator checks before trusting these signals.`;
  }
  return `Inconclusive. More data points needed to determine if leading signals are reliable for this market.`;
}

function buildTrackRecord(accuracyScore: number, directionCorrect: boolean): string {
  if (accuracyScore >= 80) return "Strong prediction track record. Model is well-calibrated for this market type.";
  if (accuracyScore >= 60 && directionCorrect) return "Directionally reliable but magnitude estimation needs work. Trust the direction, size positions conservatively.";
  if (accuracyScore >= 40) return "Mixed prediction accuracy. Use as one input among many, not a primary decision driver.";
  return "Weak prediction performance. Leading indicators may not be appropriate for this market's dynamics. Reassess signal selection.";
}

export function computeLeadingLaggingLoop(input: LeadingLaggingInput): LeadingLaggingResult {
  const { leadingPrediction, laggingConfirmation } = input;

  const actual = actualDirection(laggingConfirmation.actualPriceChange, laggingConfirmation.actualRentChange);
  const directionCorrect = leadingPrediction.predictedDirection === actual;
  const magnitudeError = Math.abs(leadingPrediction.predictedAppreciation - laggingConfirmation.actualPriceChange);

  // Inventory alignment: if predicted bullish, inventory should decrease (and vice versa)
  const inventoryAligned = (leadingPrediction.predictedDirection === "bullish" && laggingConfirmation.actualInventoryChange < 0)
    || (leadingPrediction.predictedDirection === "bearish" && laggingConfirmation.actualInventoryChange > 0)
    || (leadingPrediction.predictedDirection === "neutral" && Math.abs(laggingConfirmation.actualInventoryChange) < 5);

  const accuracyScore = computeAccuracy(directionCorrect, magnitudeError, inventoryAligned);
  const predictionAccurate = directionCorrect && magnitudeError < 3;

  return {
    predictionAccurate,
    accuracyScore,
    directionCorrect,
    magnitudeError: Math.round(magnitudeError * 100) / 100,
    confidenceCalibration: buildCalibration(leadingPrediction.confidence, predictionAccurate, magnitudeError),
    adjustmentRecommendation: buildAdjustment(directionCorrect, magnitudeError, leadingPrediction.confidence, leadingPrediction.keyLeadingSignals),
    trackRecord: buildTrackRecord(accuracyScore, directionCorrect),
  };
}
