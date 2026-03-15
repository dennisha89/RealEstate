/**
 * Geographic Spillover Engine (RIPPLE) — "Is the region moving together?"
 * Adjacent market confirmation: when neighboring markets confirm a target's
 * direction, regional momentum is real. Isolated strength is fragile.
 * Hot adjacents + cold target = spillover incoming. Pure functions.
 */
export interface GeographicSpilloverInput {
  targetMarket: { zip: string; name: string; hyperScore: number; priceChange: number; inventory: number };
  adjacentMarkets: Array<{
    zip: string; name: string; hyperScore: number; priceChange: number; inventory: number;
    distanceMiles: number;
  }>;
}

export interface GeographicSpilloverResult {
  confluenceScore: number; adjacentAgreement: number; leadingMarket: string;
  regionalMomentum: "strong_regional_trend" | "spillover_likely" | "isolated_market" | "regional_cooling";
  interpretation: string; spilloverRisk: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cl = (v: number) => clamp(Math.round(v), 0, 100);

const sameDir = (a: number, b: number, t: number) => (a >= t && b >= t) || (a < t && b < t);
const distWeight = (mi: number) => mi <= 5 ? 1.0 : mi <= 15 ? 0.8 : mi <= 30 ? 0.6 : mi <= 50 ? 0.4 : 0.2;

export function computeGeographicSpillover(input: GeographicSpilloverInput): GeographicSpilloverResult {
  const { targetMarket, adjacentMarkets } = input;

  if (adjacentMarkets.length === 0) {
    return { confluenceScore: 30, regionalMomentum: "isolated_market", adjacentAgreement: 0,
      leadingMarket: targetMarket.name, interpretation: "No adjacent market data available. Cannot assess regional momentum.",
      spilloverRisk: "Isolated analysis — regional context unknown. Treat with caution." };
  }

  const targetBullish = targetMarket.hyperScore >= 55;
  const adjacentAgreement = adjacentMarkets.filter(m => sameDir(m.hyperScore, targetMarket.hyperScore, 55)).length;

  let weightedSum = 0, weightTotal = 0;
  for (const m of adjacentMarkets) { const w = distWeight(m.distanceMiles); weightedSum += m.hyperScore * w; weightTotal += w; }
  const avgAdjacentScore = weightTotal > 0 ? weightedSum / weightTotal : 50;
  const adjacentBullish = avgAdjacentScore >= 55;

  // Leading market: highest hyperScore among all markets
  const allMarkets = [{ name: targetMarket.name, hyperScore: targetMarket.hyperScore }, ...adjacentMarkets];
  const leading = allMarkets.reduce((best, m) => m.hyperScore > best.hyperScore ? m : best);
  const leadingMarket = leading.name;

  // Regional momentum classification
  const agreementRatio = adjacentAgreement / adjacentMarkets.length;
  let regionalMomentum: GeographicSpilloverResult["regionalMomentum"];
  if (targetBullish && adjacentBullish && agreementRatio >= 0.6) {
    regionalMomentum = "strong_regional_trend";
  } else if (!targetBullish && adjacentBullish && agreementRatio < 0.4) {
    regionalMomentum = "spillover_likely";
  } else if (targetBullish && !adjacentBullish && agreementRatio < 0.4) {
    regionalMomentum = "isolated_market";
  } else {
    regionalMomentum = "regional_cooling";
  }

  // Confluence score: target score weighted with regional alignment
  const alignmentBonus = regionalMomentum === "strong_regional_trend" ? 10
    : regionalMomentum === "spillover_likely" ? 5
    : regionalMomentum === "isolated_market" ? -10 : -5;
  const confluenceScore = cl(
    targetMarket.hyperScore * 0.5 + avgAdjacentScore * 0.3 + agreementRatio * 100 * 0.2 + alignmentBonus
  );

  // Build interpretation
  let interpretation: string;
  switch (regionalMomentum) {
    case "strong_regional_trend":
      interpretation = `Strong regional alignment: ${adjacentAgreement}/${adjacentMarkets.length} adjacent markets confirm ${targetMarket.name}'s direction. `
        + `Regional avg score ${Math.round(avgAdjacentScore)}, target ${targetMarket.hyperScore}. ${leadingMarket} leads the trend.`;
      break;
    case "spillover_likely":
      interpretation = `Adjacent markets are hot (avg ${Math.round(avgAdjacentScore)}) but ${targetMarket.name} (${targetMarket.hyperScore}) lags. `
        + `Demand spillover from ${leadingMarket} is likely as buyers seek relative value.`;
      break;
    case "isolated_market":
      interpretation = `${targetMarket.name} (${targetMarket.hyperScore}) is bullish but ${adjacentAgreement}/${adjacentMarkets.length} adjacent markets agree. `
        + `Isolated strength — investigate local catalysts. Fragile without regional support.`;
      break;
    default:
      interpretation = `Regional cooling: avg adjacent score ${Math.round(avgAdjacentScore)}, target ${targetMarket.hyperScore}. `
        + `${adjacentAgreement}/${adjacentMarkets.length} markets agree on direction. Macro headwinds may be at play.`;
  }

  const spilloverRisk = regionalMomentum === "strong_regional_trend"
    ? `Broad regional strength anchors ${targetMarket.name}. Low risk of isolated pullback.`
    : regionalMomentum === "spillover_likely"
    ? `Hot adjacent markets may push demand into ${targetMarket.name}. Early-mover opportunity before prices catch up.`
    : regionalMomentum === "isolated_market"
    ? `Isolated strength is fragile. If the local catalyst fades, no regional floor exists to catch prices.`
    : `Regional weakness creates contagion risk. Even strong local fundamentals may not resist the macro tide.`;

  return { confluenceScore, regionalMomentum, adjacentAgreement, leadingMarket, interpretation, spilloverRisk };
}
