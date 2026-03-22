/**
 * Deal Quality Confluence Engine
 *
 * Answers: "Is this specific property a good deal?"
 * Cross-validates financials, comps, deal classification,
 * scenario sensitivity, and portfolio fit into a single confluence score.
 */

export interface DealQualityInput {
  capRate: number; cashOnCash: number; monthlyCashFlow: number;
  dscr: number; stressTestSurvival: boolean;
  askingPrice: number; impliedValue: number;
  pricePerSqft: number; compsPricePerSqft: number;
  priceDirection: "rising" | "stable" | "falling";
  dealType: "below_market_value" | "cash_flow_play" | "appreciation_bet" | "motivated_seller" | "standard";
  daysOnMarket: number; hyperScore: number;
  cashFlowAtWorstCase: number; breakEvenVacancy: number;
  portfolioContext?: {
    existingPropertyCount: number; stateConcentration: number;
    avgPortfolioCapRate: number; currentMonthlyCashFlow: number;
  };
}

interface ComponentScore { score: number; weight: number; source: string; }

export interface DealQualityResult {
  confluenceScore: number;
  componentScores: {
    financialStrength: ComponentScore; relativeValue: ComponentScore;
    dealOpportunity: ComponentScore; resilience: ComponentScore;
    portfolioFit: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "EXCEPTIONAL_DEAL" | "STRONG_DEAL" | "GOOD_DEAL" | "FAIR" | "WEAK" | "PASS";
  thesis: string;
  dealBreakers: string[];
  strengths: string[];
  concerns: string[];
  negotiationLeverage: string[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(v: number, iMin: number, iMax: number, oMin: number, oMax: number): number {
  return oMin + clamp((v - iMin) / (iMax - iMin), 0, 1) * (oMax - oMin);
}

function scoreFinancialStrength(i: DealQualityInput): number {
  const cap = lerp(i.capRate, 3, 10, 10, 100);
  const coc = lerp(i.cashOnCash, 0, 15, 10, 100);
  const dscr = i.dscr >= 1.5 ? 100 : i.dscr >= 1.25 ? 80 : i.dscr >= 1.0 ? 50 : lerp(i.dscr, 0.5, 1.0, 0, 50);
  const cf = i.monthlyCashFlow > 0 ? lerp(i.monthlyCashFlow, 0, 1000, 50, 100) : lerp(i.monthlyCashFlow, -500, 0, 0, 40);
  return Math.round(cap * 0.3 + coc * 0.25 + dscr * 0.25 + cf * 0.2);
}

function scoreRelativeValue(i: DealQualityInput): number {
  const disc = lerp((i.impliedValue - i.askingPrice) / i.impliedValue, -0.10, 0.20, 0, 100);
  const sqft = lerp((i.compsPricePerSqft - i.pricePerSqft) / i.compsPricePerSqft, -0.10, 0.20, 0, 100);
  const dir = i.priceDirection === "rising" ? 15 : i.priceDirection === "falling" ? -15 : 0;
  return Math.round(clamp(disc * 0.55 + sqft * 0.45 + dir, 0, 100));
}

function scoreDealOpportunity(i: DealQualityInput): number {
  const typeMap: Record<DealQualityInput["dealType"], number> = {
    below_market_value: 95, motivated_seller: 85, cash_flow_play: 75, appreciation_bet: 60, standard: 40,
  };
  const dom = i.daysOnMarket >= 90 ? 90 : i.daysOnMarket >= 60 ? 70 : i.daysOnMarket >= 30 ? 50 : 30;
  return Math.round(typeMap[i.dealType] * 0.4 + dom * 0.3 + lerp(i.hyperScore, 30, 90, 20, 100) * 0.3);
}

function scoreResilience(i: DealQualityInput): number {
  const stress = i.stressTestSurvival ? 80 : 20;
  const vacancy = lerp(i.breakEvenVacancy, 0, 30, 0, 100);
  const worst = i.cashFlowAtWorstCase > 0 ? lerp(i.cashFlowAtWorstCase, 0, 500, 60, 100) : lerp(i.cashFlowAtWorstCase, -1000, 0, 0, 50);
  return Math.round(stress * 0.35 + vacancy * 0.35 + worst * 0.3);
}

function scorePortfolioFit(i: DealQualityInput): number | null {
  const ctx = i.portfolioContext;
  if (!ctx) return null;
  const divers = ctx.stateConcentration > 60 ? 30 : ctx.stateConcentration > 40 ? 60 : 90;
  const capDelta = i.capRate - ctx.avgPortfolioCapRate;
  const capImp = capDelta > 0 ? lerp(capDelta, 0, 3, 50, 100) : lerp(capDelta, -3, 0, 20, 50);
  const cfImp = i.monthlyCashFlow > 0 ? lerp(i.monthlyCashFlow / Math.max(ctx.currentMonthlyCashFlow, 1) * 100, 0, 30, 40, 100) : 20;
  return Math.round(divers * 0.35 + capImp * 0.35 + cfImp * 0.3);
}

export function computeDealQualityConfluence(input: DealQualityInput): DealQualityResult {
  const dealBreakers: string[] = [];
  if (input.monthlyCashFlow < 0) dealBreakers.push("Negative cash flow at base case");
  if (input.dscr < 0.9) dealBreakers.push(`DSCR of ${input.dscr.toFixed(2)} is below 0.9 — cannot service debt`);
  if (!input.stressTestSurvival && input.breakEvenVacancy < 5)
    dealBreakers.push("Fails stress test with break-even vacancy under 5%");

  const fs = scoreFinancialStrength(input), rv = scoreRelativeValue(input);
  const dopp = scoreDealOpportunity(input), res = scoreResilience(input);
  const pf = scorePortfolioFit(input);
  const hasPf = pf !== null;

  const w = hasPf
    ? { f: 0.30, r: 0.25, o: 0.20, s: 0.15, p: 0.10 }
    : { f: 0.33, r: 0.28, o: 0.22, s: 0.17, p: 0 };

  const componentScores = {
    financialStrength: { score: fs, weight: w.f, source: "financial-engine + stress-test" },
    relativeValue: { score: rv, weight: w.r, source: "comps-engine + market data" },
    dealOpportunity: { score: dopp, weight: w.o, source: "deal-finder-engine + hyper-score" },
    resilience: { score: res, weight: w.s, source: "scenario-engine + stress-test" },
    portfolioFit: { score: hasPf ? pf : 0, weight: w.p, source: "portfolio-moat-engine" },
  };

  const raw = fs * w.f + rv * w.r + dopp * w.o + res * w.s + (hasPf ? pf * w.p : 0);
  const confluenceScore = Math.round(clamp(raw, 0, 100));

  // Agreement: standard deviation across component scores
  const all = [fs, rv, dopp, res, ...(hasPf ? [pf] : [])];
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  const sd = Math.sqrt(all.reduce((s, v) => s + (v - avg) ** 2, 0) / all.length);
  const agreement: DealQualityResult["agreement"] =
    sd < 10 ? "strong" : sd < 18 ? "moderate" : sd < 28 ? "mixed" : "divergent";
  const agreementDetail =
    agreement === "strong" ? `All engines converge tightly (std dev ${sd.toFixed(0)}). High-confidence signal.` :
    agreement === "moderate" ? `Engines mostly agree (std dev ${sd.toFixed(0)}) with minor divergences.` :
    agreement === "mixed" ? `Engines show notable spread (std dev ${sd.toFixed(0)}). Some dimensions conflict.` :
    `Significant disagreement across engines (std dev ${sd.toFixed(0)}). Investigate diverging signals.`;

  let verdict: DealQualityResult["verdict"];
  if (dealBreakers.length > 0) verdict = "PASS";
  else if (confluenceScore >= 85) verdict = "EXCEPTIONAL_DEAL";
  else if (confluenceScore >= 72) verdict = "STRONG_DEAL";
  else if (confluenceScore >= 58) verdict = "GOOD_DEAL";
  else if (confluenceScore >= 42) verdict = "FAIR";
  else if (confluenceScore >= 28) verdict = "WEAK";
  else verdict = "PASS";

  // Strengths
  const strengths: string[] = [];
  if (input.capRate >= 7) strengths.push(`Strong ${input.capRate.toFixed(1)}% cap rate`);
  if (input.dscr >= 1.4) strengths.push(`DSCR ${input.dscr.toFixed(2)} — solid debt service cushion`);
  if (input.impliedValue > input.askingPrice * 1.1)
    strengths.push(`${((input.impliedValue / input.askingPrice - 1) * 100).toFixed(0)}% below comp-implied value`);
  if (input.breakEvenVacancy >= 20) strengths.push(`${input.breakEvenVacancy.toFixed(0)}% break-even vacancy — wide safety margin`);
  if (input.stressTestSurvival) strengths.push("Survives +2% rate stress test");
  if (input.dealType === "below_market_value") strengths.push("Below-market-value opportunity");

  // Concerns
  const concerns: string[] = [];
  if (input.dscr < 1.25 && input.dscr >= 0.9) concerns.push(`Thin DSCR (${input.dscr.toFixed(2)})`);
  if (input.monthlyCashFlow > 0 && input.monthlyCashFlow < 200) concerns.push("Slim cash flow — vulnerable to surprises");
  if (input.priceDirection === "falling") concerns.push("Declining market prices");
  if (!input.stressTestSurvival) concerns.push("Fails +2% rate stress test");
  if (input.breakEvenVacancy < 10) concerns.push(`Low break-even vacancy (${input.breakEvenVacancy.toFixed(0)}%)`);
  if (input.cashFlowAtWorstCase < 0) concerns.push("Negative cash flow under worst-case scenario");

  // Negotiation leverage
  const negotiationLeverage: string[] = [];
  if (input.daysOnMarket >= 60) negotiationLeverage.push(`${input.daysOnMarket} DOM suggests seller flexibility`);
  if (input.priceDirection === "falling") negotiationLeverage.push("Declining market gives pricing power");
  if (input.askingPrice > input.impliedValue)
    negotiationLeverage.push(`Asking exceeds implied value by ${((input.askingPrice / input.impliedValue - 1) * 100).toFixed(0)}%`);
  if (input.dealType === "motivated_seller") negotiationLeverage.push("Motivated seller — room to negotiate");

  const discPct = ((input.impliedValue - input.askingPrice) / input.impliedValue * 100).toFixed(0);
  const thesis = dealBreakers.length > 0
    ? `PASS — ${dealBreakers.length} deal breaker(s). ${dealBreakers[0]}. Do not proceed without resolution.`
    : `${verdict.replace(/_/g, " ")} (${confluenceScore}/100). ` +
      `Financials ${fs} (cap ${input.capRate.toFixed(1)}%, DSCR ${input.dscr.toFixed(2)}), ` +
      `value ${rv} (${Number(discPct) >= 0 ? `${discPct}% discount` : `${Math.abs(Number(discPct))}% premium`}). ` +
      `${agreement === "strong" || agreement === "moderate" ? "Engines converge." : "Mixed signals — investigate."}`;

  return {
    confluenceScore: dealBreakers.length > 0 ? Math.min(confluenceScore, 25) : confluenceScore,
    componentScores, agreement, agreementDetail, verdict, thesis,
    dealBreakers, strengths, concerns, negotiationLeverage,
  };
}
