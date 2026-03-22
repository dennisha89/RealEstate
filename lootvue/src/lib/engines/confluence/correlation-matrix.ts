/**
 * Correlation Matrix Engine
 *
 * Tracks multi-dimensional correlation pairs across all 8 confluence engines.
 * Detects when historically-correlated signals DIVERGE (alpha / warning) or
 * independent signals CONVERGE (high-confidence setup).
 *
 * Pure functions, no side effects.
 */

export interface CorrelationMatrixInput {
  marketSelection: number; dealQuality: number; entryTiming: number;
  riskScore: number; portfolioOptimization: number; rateTransmission: number;
  supplyPipeline: number; demandVelocity: number;
  metrics: {
    yieldCurveSpread: number; housingStartsYoY: number; permitGrowthYoY: number;
    priceChangeYoY: number; migrationNetHouseholds: number; rentGrowthYoY: number;
    institutionalBuyShare: number; daysOnMarket: number; fedFundsRate: number;
    marketCapRate: number; priceToRentRatio: number; priceToIncomeRatio: number;
    constructionCostPerSqft: number; medianPricePerSqft: number;
    mortgageAppTrend: number; inventoryMonths: number;
    insurancePremiumChangeYoY: number; populationGrowthYoY: number;
    kindergartenEnrollmentChange: number;
  };
}

interface CorrelationPair {
  name: string;
  metric1: { name: string; value: number }; metric2: { name: string; value: number };
  expectedRelationship: "positive" | "negative" | "independent";
  actualRelationship: "aligned" | "diverging" | "converging";
  significance: "critical" | "important" | "notable";
  interpretation: string; actionImplication: string;
}

export interface CorrelationMatrixResult {
  engineAgreement: {
    totalPairs: number; alignedPairs: number; divergingPairs: number;
    convergingPairs: number; overallCoherence: number;
  };
  enginePairs: Array<{
    engine1: string; engine2: string;
    expectedCorrelation: "positive" | "negative" | "independent";
    actualAlignment: "aligned" | "diverging"; insight: string;
  }>;
  criticalPairs: CorrelationPair[];
  confirmingPairs: CorrelationPair[];
  matrixVerdict: "HIGH_CONVICTION" | "CONFIRMED" | "NORMAL" | "ANOMALY_DETECTED" | "MULTIPLE_DIVERGENCES";
  confidenceModifier: number;
  matrixNarrative: string; anomalies: string[]; confirmations: string[];
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sent = (v: number, neutral: number, scale: number) => cl((v - neutral) / scale, -1, 1);
const aligned = (a: number, b: number) => (a >= 60 && b >= 60) || (a < 40 && b < 40);

function analyzeEnginePairs(i: CorrelationMatrixInput): CorrelationMatrixResult["enginePairs"] {
  const riskOpp = 100 - i.riskScore;
  type EP = CorrelationMatrixResult["enginePairs"][0];
  const ep = (e1: string, e2: string, exp: EP["expectedCorrelation"], al: boolean, ins: [string, string, string]): EP =>
    ({ engine1: e1, engine2: e2, expectedCorrelation: exp, actualAlignment: al ? "aligned" : "diverging",
       insight: al ? ins[0] : ins[1] || ins[2] });

  return [
    ep("Market Selection", "Risk Assessment", "negative", aligned(i.marketSelection, riskOpp),
      ["Market quality and risk assessment agree — consistent data picture",
       i.marketSelection >= 60 && i.riskScore >= 60 ? "Strong market but elevated risk — investigate specific risk factors" : "",
       "Weak market but low risk — may be undervalued or stagnant"]),
    ep("Demand Velocity", "Supply Pipeline", "independent",
      (i.supplyPipeline >= 60 && i.demandVelocity >= 60) || (i.supplyPipeline < 40 && i.demandVelocity < 40),
      ["Supply constrained AND demand surging — strongest price appreciation signal",
       "", "Supply and demand sending mixed signals — normal market dynamics"]),
    ep("Rate Transmission", "Entry Timing", "positive", aligned(i.rateTransmission, i.entryTiming),
      ["Rate environment and timing signals are in sync",
       i.rateTransmission >= 60 ? "Rates favorable but timing poor — market may need time to respond" : "",
       "Timing looks good despite rate headwinds — structural opportunity"]),
    ep("Deal Quality", "Risk Assessment", "negative", aligned(i.dealQuality, riskOpp),
      ["Deal quality and risk profile are consistent",
       i.dealQuality >= 60 && i.riskScore >= 60 ? "Strong deal in high-risk market — verify risk is priced in" : "",
       "Weak deal but low risk — deal-specific issue, not market-level"]),
    ep("Supply Pipeline", "Demand Velocity", "independent",
      i.supplyPipeline >= 70 && i.demandVelocity >= 70,
      ["Maximum bullish: supply constrained + demand surging = price pressure building",
       "", "Supply-demand balance does not indicate extreme directional pressure"]),
  ];
}

function analyzeMetricPairs(m: CorrelationMatrixInput["metrics"]): { critical: CorrelationPair[]; confirming: CorrelationPair[] } {
  const all: CorrelationPair[] = [];
  const push = (name: string, m1: [string, number], m2: [string, number],
    exp: CorrelationPair["expectedRelationship"], div: boolean, sig: CorrelationPair["significance"],
    interp: [string, string], action: [string, string]) => {
    all.push({ name, metric1: { name: m1[0], value: m1[1] }, metric2: { name: m2[0], value: m2[1] },
      expectedRelationship: exp, actualRelationship: div ? "diverging" : "aligned",
      significance: sig, interpretation: div ? interp[0] : interp[1], actionImplication: div ? action[0] : action[1] });
  };

  // 1. Yield curve x Housing starts
  const ycS = sent(m.yieldCurveSpread, 0.5, 2), hsS = sent(m.housingStartsYoY, 0, 15);
  const ycDiv = (ycS < -0.3 && hsS > 0.3) || (ycS > 0.3 && hsS < -0.3);
  push("Yield Curve x Housing Starts", ["Yield curve spread", m.yieldCurveSpread], ["Housing starts YoY", m.housingStartsYoY],
    "positive", ycDiv, "critical",
    [m.yieldCurveSpread < 0 ? "Curve inverted but starts rising — builders betting against recession" : "Curve positive but starts falling — builders see weakness ahead",
     m.yieldCurveSpread < 0 ? "Both falling — recession confirmed by builder pullback" : "Yield curve and housing starts aligned — normal transmission"],
    ["Investigate: one signal is wrong. Verify local vs national builder sentiment.", "Consistent macro signal — factor into timing."]);

  // 2. Permits x Price change
  const pmS = sent(m.permitGrowthYoY, 0, 20), pcS = sent(m.priceChangeYoY, 3, 10);
  push("Permits x Price Change", ["Permit growth YoY", m.permitGrowthYoY], ["Price change YoY", m.priceChangeYoY],
    "positive", (pmS < -0.3 && pcS > 0.3) || (pmS > 0.3 && pcS < -0.3), "critical",
    [m.permitGrowthYoY < 0 ? "Permits down + prices up — supply constrained. Bullish but watch snap-back." : "Permits up + prices down — oversupply building.",
     "Permits and prices moving together — normal supply-price transmission."],
    [m.permitGrowthYoY < 0 ? "Supply floor forming — prices have support." : "Monitor absorption rates.", "Standard dynamics — no anomaly."]);

  // 3. Migration x Rent growth
  const miS = sent(m.migrationNetHouseholds, 0, 5000), rgS = sent(m.rentGrowthYoY, 2, 8);
  push("Migration x Rent Growth", ["Net migration", m.migrationNetHouseholds], ["Rent growth YoY", m.rentGrowthYoY],
    "positive", (miS > 0.3 && rgS < -0.1) || (miS < -0.3 && rgS > 0.3), "critical",
    [m.migrationNetHouseholds > 0 ? "Migration up but rents flat — affordability ceiling reached" : "Migration out but rents rising — captive tenant base",
     "Migration and rent growth in sync — demand-price relationship intact."],
    ["Verify income growth supports rent trajectory.", "Demand fundamentals support rental projections."]);

  // 4. Institutional buy % x DOM
  const ibS = sent(m.institutionalBuyShare, 15, 15), domS = sent(m.daysOnMarket, 30, 30);
  push("Institutional Buy % x Days on Market", ["Institutional share", m.institutionalBuyShare], ["Days on market", m.daysOnMarket],
    "negative", (ibS > 0.3 && domS > 0.3) || (ibS < -0.3 && domS < -0.3), "critical",
    [m.institutionalBuyShare > 20 ? "Institutions buying but DOM rising — smart money may be wrong" : "Institutions pulling back but DOM falling — retail drives demand",
     "Institutional activity and market velocity consistent."],
    ["Verify institutional strategy (bulk buys vs quality picks).", "Market participants and velocity aligned."]);

  // 5. Fed rate x Cap rate spread
  const capSpread = m.marketCapRate - m.fedFundsRate;
  push("Fed Rate x Cap Rate Spread", ["Fed funds rate", m.fedFundsRate], ["Market cap rate", m.marketCapRate],
    "positive", capSpread < 2 || capSpread > 4, "critical",
    [capSpread < 2 ? `Spread ${capSpread.toFixed(2)}pp — risk underpriced.` : `Spread ${capSpread.toFixed(2)}pp — wide, signals opportunity or distress.`,
     `Spread ${capSpread.toFixed(2)}pp — within normal 2-4% band.`],
    [capSpread < 2 ? "Demand higher cap rates or expect pain if rates rise." : "Wide spread = value play if fundamentals intact.",
     "Normal risk compensation — standard underwriting."]);

  // 6. Price-to-rent x Price-to-income
  const ptrHi = m.priceToRentRatio > 20, ptiHi = m.priceToIncomeRatio > 5;
  push("Price-to-Rent x Price-to-Income", ["P/R ratio", m.priceToRentRatio], ["P/I ratio", m.priceToIncomeRatio],
    "positive", ptrHi !== ptiHi, "critical",
    [ptrHi ? "P/R elevated but income normal — structural shift toward renting" : "Income stretched but rents support prices",
     ptrHi && ptiHi ? "Both elevated — bubble characteristics. Prices outpaced rents and incomes." : "Both normal — healthy valuations."],
    [ptrHi !== ptiHi ? "Structural shift — model both scenarios." : "",
     ptrHi && ptiHi ? "Extreme caution — correction risk is real." : "Valuations supported by fundamentals."]);

  // 7. Construction cost x Median price
  const ctp = m.constructionCostPerSqft / m.medianPricePerSqft;
  push("Construction Cost x Median Price", ["Cost/sqft", m.constructionCostPerSqft], ["Price/sqft", m.medianPricePerSqft],
    "positive", ctp > 0.85 || ctp < 0.6, "important",
    [ctp > 0.85 ? `Cost-to-price ${(ctp*100).toFixed(0)}% — can't profitably build. Supply floor.` : `Cost-to-price ${(ctp*100).toFixed(0)}% — profitable to build. Supply incoming.`,
     `Cost-to-price ${(ctp*100).toFixed(0)}% — moderate build economics.`],
    [ctp > 0.85 ? "Existing inventory has pricing power." : "Watch new construction absorbing demand.", "Normal replacement cost dynamics."]);

  // 8. Mortgage apps x Inventory
  const maS = sent(m.mortgageAppTrend, 0, 50), invS = sent(m.inventoryMonths, 4, 4);
  const appUp = maS > 0.2 && invS < -0.2, appDn = maS < -0.2 && invS > 0.2;
  push("Mortgage Apps x Inventory", ["App trend", m.mortgageAppTrend], ["Inventory months", m.inventoryMonths],
    "negative", !(appUp || appDn), "important",
    ["Demand and inventory not in expected inverse pattern — transitional market.",
     appUp ? "Apps rising + inventory falling — overheating." : "Apps declining + inventory building — cooling."],
    ["Monitor trend — market at inflection point.",
     appUp ? "Act fast or wait for cooldown." : "Negotiate aggressively — seller motivation increasing."]);

  const critical = all.filter(p => p.actualRelationship === "diverging" && p.significance === "critical");
  const confirming = all.filter(p =>
    (p.expectedRelationship === "independent" && p.actualRelationship === "aligned") ||
    (p.actualRelationship === "aligned" && p.significance === "critical"));
  return { critical, confirming };
}

export function computeCorrelationMatrix(input: CorrelationMatrixInput): CorrelationMatrixResult {
  const enginePairs = analyzeEnginePairs(input);
  const alignedEP = enginePairs.filter(p => p.actualAlignment === "aligned").length;
  const divergingEP = enginePairs.filter(p => p.actualAlignment === "diverging").length;
  const { critical, confirming } = analyzeMetricPairs(input.metrics);
  const divCrit = critical.length, convConf = confirming.length;
  const totalPairs = enginePairs.length + 8;
  const totalAligned = alignedEP + convConf;
  const coherence = Math.round((totalAligned / totalPairs) * 100);

  let matrixVerdict: CorrelationMatrixResult["matrixVerdict"];
  let confidenceModifier: number;
  if (divCrit >= 3) { matrixVerdict = "MULTIPLE_DIVERGENCES"; confidenceModifier = cl(-15 - divCrit, -20, -15); }
  else if (divCrit >= 2) { matrixVerdict = "ANOMALY_DETECTED"; confidenceModifier = cl(-10 - divCrit * 2, -15, -10); }
  else if (divCrit === 0 && convConf >= 3) { matrixVerdict = "HIGH_CONVICTION"; confidenceModifier = cl(15 + Math.min(convConf, 5), 15, 20); }
  else if (divCrit <= 1 && convConf >= 1) { matrixVerdict = "CONFIRMED"; confidenceModifier = cl(5 + convConf * 2, 5, 10); }
  else { matrixVerdict = "NORMAL"; confidenceModifier = 0; }

  const anomalies = critical.map(p => `${p.name}: ${p.interpretation}`);
  const confirmations = confirming.map(p => `${p.name}: ${p.interpretation}`);
  const matrixNarrative = buildNarrative(matrixVerdict, coherence, divCrit, convConf, anomalies, confirmations);

  return {
    engineAgreement: { totalPairs, alignedPairs: totalAligned, divergingPairs: divergingEP + divCrit, convergingPairs: convConf, overallCoherence: coherence },
    enginePairs, criticalPairs: critical, confirmingPairs: confirming,
    matrixVerdict, confidenceModifier, matrixNarrative, anomalies, confirmations,
  };
}

function buildNarrative(
  verdict: CorrelationMatrixResult["matrixVerdict"], coherence: number,
  div: number, conv: number, anomalies: string[], confirmations: string[],
): string {
  switch (verdict) {
    case "MULTIPLE_DIVERGENCES":
      return `ALERT: ${div} critical pairs diverging — historical relationships breaking down. Coherence ${coherence}%. `
        + `Primary: ${anomalies[0] ?? "Multiple contradictions."}. Reduce sizing and widen scenario ranges.`;
    case "ANOMALY_DETECTED":
      return `${div} critical pair(s) diverging. Coherence: ${coherence}%. ${anomalies[0] ?? "Investigate."} `
        + `Divergences can signal opportunity — verify before acting.`;
    case "HIGH_CONVICTION":
      return `High-conviction: ${conv} confirming pairs, zero critical divergences. Coherence: ${coherence}%. `
        + `${confirmations[0] ?? "Multiple streams agree."} Rare agreement — larger position sizing warranted.`;
    case "CONFIRMED":
      return `Matrix confirms bias: ${conv} confirming, ${div} divergence(s). Coherence: ${coherence}%. `
        + `${confirmations[0] ?? "Signals aligned."} Proceed with standard conviction.`;
    default:
      return `Matrix neutral: coherence ${coherence}%. No critical divergences, insufficient convergence. Standard assumptions apply.`;
  }
}
