/**
 * Rate Transmission Confluence Engine — how Fed policy transmits through
 * the capital stack to affect real estate prices.
 * Weights: FedPolicy(20%) YieldCurve(15%) Mortgage(25%) Floating(10%) Affordability(15%) Credit(15%)
 * Pure functions, no side effects.
 */
export interface RateTransmissionInput {
  fedFundsRate: number; fedFundsRatePrior: number;
  fedDirection: "hiking" | "pausing" | "cutting";
  treasury2yr: number; treasury10yr: number;
  yieldCurveSpread: number; yieldCurveSpreadPrior: number;
  mortgageRate30yr: number; mortgageRate30yrPrior: number;
  mortgageToFedSpread: number; mortgageToFedSpreadHistorical: number;
  sofrRate: number; sofrForwardCurve: "rising" | "flat" | "falling";
  medianPaymentToIncome: number; buyerPoolChange: number;
  mortgageAppVolume: "surging" | "growing" | "stable" | "declining" | "collapsing";
  approvalRate: number; avgDenialRate: number;
  creditTightening: "loosening" | "stable" | "tightening" | "severe";
}

interface ComponentScore { score: number; weight: number; source: string }

export interface RateTransmissionResult {
  confluenceScore: number;
  componentScores: {
    fedPolicy: ComponentScore; yieldCurve: ComponentScore;
    mortgageEnvironment: ComponentScore; floatingRate: ComponentScore;
    affordability: ComponentScore; creditConditions: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "TAILWIND" | "FAVORABLE" | "NEUTRAL" | "HEADWIND" | "SEVERE_HEADWIND";
  rateRegime: string; transmissionLag: string;
  recessionProbability: string; spreadAnalysis: string;
  thesis: string; catalysts: string[]; risks: string[];
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const W = { fedPolicy: 0.20, yieldCurve: 0.15, mortgageEnvironment: 0.25,
  floatingRate: 0.10, affordability: 0.15, creditConditions: 0.15 } as const;
const SOURCES = {
  fedPolicy: "FRED fed funds rate, FOMC minutes",
  yieldCurve: "Treasury yield curve (2yr/10yr spread)",
  mortgageEnvironment: "FRED PMMS 30yr, mortgage-to-Fed spread analysis",
  floatingRate: "SOFR rate, CME SOFR futures curve",
  affordability: "Census ACS income, FRED PMMS, NAR affordability index",
  creditConditions: "MBA mortgage apps, HMDA approval/denial, Fed SLOOS",
} as const;

function scoreFedPolicy(i: RateTransmissionInput): number {
  const dir = { cutting: 80, pausing: 50, hiking: 20 } as const;
  const magnitude = cl((i.fedFundsRatePrior - i.fedFundsRate) * 15, -25, 25);
  return cl(Math.round(dir[i.fedDirection] + magnitude), 0, 100);
}

function scoreYieldCurve(i: RateTransmissionInput): number {
  const shape = i.yieldCurveSpread < -0.5 ? 15 : i.yieldCurveSpread < 0 ? 30
    : i.yieldCurveSpread < 1 ? 55 : cl(Math.round(55 + (i.yieldCurveSpread - 1) * 20), 55, 90);
  const trend = cl(Math.round((i.yieldCurveSpread - i.yieldCurveSpreadPrior) * 15), -15, 15);
  return cl(shape + trend, 0, 100);
}

function scoreMortgageEnv(i: RateTransmissionInput): number {
  const rate = cl(Math.round(100 - (i.mortgageRate30yr - 3) * 12), 10, 95);
  const dir = cl(Math.round((i.mortgageRate30yrPrior - i.mortgageRate30yr) * 10), -20, 20);
  const spread = cl(Math.round(-(i.mortgageToFedSpread - i.mortgageToFedSpreadHistorical) * 12), -15, 10);
  return cl(rate + dir + spread, 0, 100);
}

function scoreFloatingRate(i: RateTransmissionInput): number {
  const fwd = { falling: 80, flat: 50, rising: 20 } as const;
  return cl(fwd[i.sofrForwardCurve] + cl(Math.round((5 - i.sofrRate) * 8), -20, 20), 0, 100);
}

function scoreAffordability(i: RateTransmissionInput): number {
  const pti = i.medianPaymentToIncome <= 28 ? 85
    : i.medianPaymentToIncome >= 35 ? cl(Math.round(25 - (i.medianPaymentToIncome - 35) * 3), 5, 25)
    : cl(Math.round(85 - (i.medianPaymentToIncome - 28) * (60 / 7)), 25, 85);
  return cl(pti + cl(Math.round(i.buyerPoolChange * 2), -20, 20), 0, 100);
}

function scoreCreditConditions(i: RateTransmissionInput): number {
  const vol = { surging: 90, growing: 70, stable: 50, declining: 30, collapsing: 10 } as const;
  const tight = { loosening: 85, stable: 55, tightening: 25, severe: 10 } as const;
  const appr = cl(Math.round((i.approvalRate - 60) * 1.5), -15, 15);
  const deny = cl(Math.round((i.avgDenialRate - 15) * 1.5), -10, 15);
  return cl(Math.round(vol[i.mortgageAppVolume] * 0.35 + tight[i.creditTightening] * 0.35
    + (50 + appr) * 0.15 + (50 - deny) * 0.15), 0, 100);
}

function deriveRateRegime(i: RateTransmissionInput): string {
  if (i.fedDirection === "cutting" && i.mortgageRate30yr < i.mortgageRate30yrPrior)
    return "Easing cycle — rates falling across the stack";
  if (i.fedDirection === "cutting") return "Fed easing but mortgage rates sticky — transmission lag in effect";
  if (i.fedDirection === "hiking") return "Tightening cycle — rates rising, demand compression underway";
  if (i.yieldCurveSpread < 0) return "Fed pausing with inverted curve — market pricing future cuts";
  return "Fed pausing — rate stability, market in wait-and-see mode";
}

function deriveRecessionProb(spread: number): string {
  if (spread < -0.5) return "Elevated (60-80%) — deeply inverted curve signals recession within 12-18 months";
  if (spread < 0) return "Moderate (30-50%) — mild inversion, recession risk within 18-24 months";
  if (spread < 1) return "Low (10-25%) — flat but positive curve, expansion likely continues";
  return "Minimal (<10%) — healthy yield curve slope, no recession signal";
}

function deriveSpreadAnalysis(i: RateTransmissionInput): string {
  const dev = i.mortgageToFedSpread - i.mortgageToFedSpreadHistorical;
  const sp = i.mortgageToFedSpread.toFixed(2);
  if (dev > 0.75) return `Mortgage-to-Fed spread ${sp}% is ${dev.toFixed(2)}pp above historical avg — banks demanding extra risk premium. Rates have room to fall even without Fed cuts.`;
  if (dev < -0.25) return `Mortgage-to-Fed spread ${sp}% is ${Math.abs(dev).toFixed(2)}pp below historical avg — unusually competitive lending. Limited room for further compression.`;
  return `Mortgage-to-Fed spread ${sp}% is near historical norms (${i.mortgageToFedSpreadHistorical.toFixed(2)}%) — standard transmission.`;
}

function buildCatalystsAndRisks(i: RateTransmissionInput) {
  const catalysts: string[] = [], risks: string[] = [];
  if (i.fedDirection === "cutting")
    catalysts.push("Fed rate cuts in progress — mortgage rates should follow with 3-6 month lag");
  if (i.sofrForwardCurve === "falling")
    catalysts.push("SOFR forward curve falling — floating-rate debt costs declining");
  if (i.mortgageToFedSpread > i.mortgageToFedSpreadHistorical + 0.5)
    catalysts.push("Elevated mortgage spread has room to compress — rates can fall without Fed action");
  if (i.buyerPoolChange > 5)
    catalysts.push(`Buyer pool expanding ${i.buyerPoolChange.toFixed(0)}% — demand recovery underway`);
  if (i.creditTightening === "loosening")
    catalysts.push("Credit conditions loosening — more borrowers gaining access");
  if (i.yieldCurveSpread > i.yieldCurveSpreadPrior + 0.3)
    catalysts.push("Yield curve steepening — normalization signals economic confidence");
  if (i.fedDirection === "hiking")
    risks.push("Active rate hikes compressing buyer affordability and deal economics");
  if (i.yieldCurveSpread < -0.5)
    risks.push("Deeply inverted yield curve — elevated recession probability within 12-18 months");
  if (i.medianPaymentToIncome > 35)
    risks.push(`Payment-to-income at ${i.medianPaymentToIncome.toFixed(0)}% — affordability ceiling limits price growth`);
  if (i.creditTightening === "severe")
    risks.push("Severe credit tightening — deal flow and refinancing at risk");
  if (i.mortgageAppVolume === "collapsing")
    risks.push("Mortgage applications collapsing — demand destruction in progress");
  if (i.buyerPoolChange < -10)
    risks.push(`Buyer pool shrinking ${Math.abs(i.buyerPoolChange).toFixed(0)}% — fewer qualified purchasers`);
  return { catalysts, risks };
}

export function computeRateTransmissionConfluence(input: RateTransmissionInput): RateTransmissionResult {
  const raw = {
    fedPolicy: scoreFedPolicy(input), yieldCurve: scoreYieldCurve(input),
    mortgageEnvironment: scoreMortgageEnv(input), floatingRate: scoreFloatingRate(input),
    affordability: scoreAffordability(input), creditConditions: scoreCreditConditions(input),
  };

  const cs = {} as RateTransmissionResult["componentScores"];
  let confluenceScore = 0;
  for (const k of Object.keys(raw) as Array<keyof typeof raw>) {
    cs[k] = { score: Math.round(raw[k]), weight: W[k], source: SOURCES[k] };
    confluenceScore += raw[k] * W[k];
  }
  confluenceScore = Math.round(confluenceScore);

  const scores = Object.values(raw);
  const bull = scores.filter(s => s > 60).length;
  const bear = scores.filter(s => s < 40).length;
  const agreement: RateTransmissionResult["agreement"] =
    bull >= 5 ? "strong" : bull >= 4 ? "moderate" : bear >= 4 ? "divergent" : "mixed";
  const agreementDetail = `${bull}/6 favorable (>60), ${bear}/6 unfavorable (<40). `
    + (agreement === "strong" ? "Rate environment broadly supportive across all layers."
      : agreement === "moderate" ? "Most rate signals favorable, minor headwinds."
      : agreement === "divergent" ? "Rate signals broadly negative — headwind environment."
      : "Rate signals are split — no clear directional consensus.");

  const verdict: RateTransmissionResult["verdict"] =
    confluenceScore >= 75 ? "TAILWIND" : confluenceScore >= 60 ? "FAVORABLE"
    : confluenceScore >= 40 ? "NEUTRAL" : confluenceScore >= 25 ? "HEADWIND" : "SEVERE_HEADWIND";

  const { catalysts, risks } = buildCatalystsAndRisks(input);
  const top2 = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 2).map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim());

  let thesis: string;
  if (verdict === "TAILWIND" || verdict === "FAVORABLE") {
    thesis = `Rate confluence ${confluenceScore}/100 with ${agreement} agreement — ${verdict.toLowerCase().replace("_", " ")}. `
      + `${top2[0]} and ${top2[1]} lead the case. `
      + `${input.fedDirection === "cutting" ? "Fed easing" : "Stable policy"} with ${input.mortgageRate30yr.toFixed(2)}% mortgage rates supports acquisition and refinancing activity.`;
  } else if (verdict === "NEUTRAL") {
    thesis = `Rate confluence ${confluenceScore}/100 — neutral environment. ${top2[0]} is the strongest signal but ${agreement} agreement limits conviction. `
      + `Focus on deals with strong standalone fundamentals rather than macro rate tailwinds.`;
  } else {
    thesis = `Rate confluence ${confluenceScore}/100 — ${verdict.toLowerCase().replace(/_/g, " ")}. `
      + `${input.fedDirection === "hiking" ? "Active tightening" : "Restrictive conditions"} with ${input.mortgageRate30yr.toFixed(2)}% mortgage rates compress deal economics. `
      + `Favor assumable mortgages, seller financing, and cash deals.`;
  }

  return {
    confluenceScore, componentScores: cs, agreement, agreementDetail, verdict,
    rateRegime: deriveRateRegime(input),
    transmissionLag: "Fed rate changes have a 6-18 month lag to home prices; mortgage rate changes transmit in 3-6 months via affordability.",
    recessionProbability: deriveRecessionProb(input.yieldCurveSpread),
    spreadAnalysis: deriveSpreadAnalysis(input),
    thesis, catalysts, risks,
  };
}
