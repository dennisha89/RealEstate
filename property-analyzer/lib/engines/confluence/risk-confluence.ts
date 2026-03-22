/**
 * Risk Confluence Engine — "What could KILL this investment?"
 * Stacks 6 risk dimensions into a single score with red/yellow flag
 * detection and actionable mitigation suggestions.
 * Weights: Macro(20%) Cost(15%) Signal(20%) Concentration(15%) Bubble(20%) Fragility(10%)
 */

export interface RiskConfluenceInput {
  climateRiskScore: number; regulatoryRiskScore: number;
  rateSensitivity: number; macroRiskScore: number;
  insurerNetChange: number; premiumChange5yr: number;
  municipalFiscalHealth: "strong" | "stable" | "weak" | "distressed";
  costInsuranceScore: number;
  bearishSignalCount: number; totalSignalCount: number; bearishConcordance: number;
  stateConcentration: number; marketConcentration: number; propertyTypeConcentration: number;
  priceRentDivergence: number; priceToIncomeRatio: number;
  affordabilityIndex: number; priceChangeVsHistorical: number;
  stressTestPasses: boolean; cashFlowAtStress: number; breakEvenVacancy: number;
}

interface ComponentScore { score: number; weight: number; source: string }

export interface RiskConfluenceResult {
  overallRiskScore: number;
  riskLevel: "minimal" | "low" | "moderate" | "elevated" | "high" | "critical";
  componentScores: {
    macroEnvironment: ComponentScore; costPressure: ComponentScore;
    signalDivergence: ComponentScore; concentrationRisk: ComponentScore;
    bubbleIndicators: ComponentScore; financialFragility: ComponentScore;
  };
  redFlags: string[]; yellowFlags: string[];
  mitigations: string[]; worstCaseScenario: string; hedgingSuggestions: string[];
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const FISCAL = { strong: 0, stable: 10, weak: 25, distressed: 45 } as const;

function scoreMacro(i: RiskConfluenceInput): number {
  return cl(i.climateRiskScore * 0.35 + i.regulatoryRiskScore * 0.30
    + i.rateSensitivity * 0.20 + i.macroRiskScore * 0.15, 0, 100);
}

function scoreCost(i: RiskConfluenceInput): number {
  const ins = i.insurerNetChange < 0 ? Math.min(Math.abs(i.insurerNetChange) * 15, 50) : 0;
  return cl(ins * 0.30 + cl(i.premiumChange5yr / 2, 0, 30) * 0.25
    + FISCAL[i.municipalFiscalHealth] * 0.20 + (100 - i.costInsuranceScore) * 0.25, 0, 100);
}

function scoreSignal(i: RiskConfluenceInput): number {
  if (i.totalSignalCount === 0) return 50;
  return cl((i.bearishSignalCount / i.totalSignalCount) * 60 + i.bearishConcordance * 40, 0, 100);
}

function scoreConcentration(i: RiskConfluenceInput): number {
  return cl(i.stateConcentration * 0.35 + i.marketConcentration * 0.40
    + i.propertyTypeConcentration * 0.25, 0, 100);
}

function scoreBubble(i: RiskConfluenceInput): number {
  return cl(
    cl(i.priceRentDivergence * 12, 0, 60) * 0.30
    + cl((i.priceToIncomeRatio - 4) * 12, 0, 50) * 0.25
    + cl((i.affordabilityIndex - 25) * 3, 0, 40) * 0.20
    + cl((i.priceChangeVsHistorical - 1) * 25, 0, 50) * 0.25, 0, 100);
}

function scoreFragility(i: RiskConfluenceInput): number {
  let s = i.stressTestPasses ? 0 : 40;
  if (i.cashFlowAtStress < 0) s += cl(Math.abs(i.cashFlowAtStress) / 20, 0, 30);
  if (i.breakEvenVacancy < 10) s += cl((10 - i.breakEvenVacancy) * 4, 0, 30);
  return cl(s, 0, 100);
}

function detectRedFlags(i: RiskConfluenceInput): string[] {
  const f: string[] = [];
  if (i.insurerNetChange < -3)
    f.push(`${Math.abs(i.insurerNetChange)} insurers have exited — coverage crisis risk`);
  if (i.priceRentDivergence > 5)
    f.push(`Price-rent divergence at ${i.priceRentDivergence.toFixed(1)}% — bubble territory`);
  if (!i.stressTestPasses && i.breakEvenVacancy < 5)
    f.push(`Fails stress test with ${i.breakEvenVacancy.toFixed(1)}% break-even vacancy — extremely fragile`);
  if (i.municipalFiscalHealth === "distressed")
    f.push("Municipality fiscally distressed — service cuts and tax hikes likely");
  if (i.stateConcentration > 80)
    f.push(`${i.stateConcentration.toFixed(0)}% portfolio in one state — catastrophic event exposure`);
  return f;
}

function detectYellowFlags(i: RiskConfluenceInput): string[] {
  const f: string[] = [];
  if (i.insurerNetChange < 0 && i.insurerNetChange >= -3)
    f.push(`${Math.abs(i.insurerNetChange)} insurer(s) exiting — premiums may rise`);
  if (i.priceRentDivergence > 3 && i.priceRentDivergence <= 5)
    f.push(`Price-rent divergence at ${i.priceRentDivergence.toFixed(1)}% — early bubble signal`);
  if (i.priceToIncomeRatio > 6)
    f.push(`Price-to-income at ${i.priceToIncomeRatio.toFixed(1)}x — affordability ceiling`);
  if (i.affordabilityIndex > 35)
    f.push(`Affordability index at ${i.affordabilityIndex.toFixed(0)}% — market stretched`);
  if (i.breakEvenVacancy < 10 && i.stressTestPasses)
    f.push(`Break-even vacancy at ${i.breakEvenVacancy.toFixed(1)}% — limited safety margin`);
  if (i.premiumChange5yr > 40)
    f.push(`Insurance premiums up ${i.premiumChange5yr.toFixed(0)}% in 5yr — cost pressure accelerating`);
  if (i.climateRiskScore > 70) f.push("Elevated long-term climate risk");
  if (i.marketConcentration > 50)
    f.push(`${i.marketConcentration.toFixed(0)}% of portfolio in one ZIP — diversify`);
  return f;
}

function buildMitigations(i: RiskConfluenceInput, hasRedFlags: boolean): string[] {
  const m: string[] = [];
  if (i.stateConcentration > 50) m.push("Diversify into a different state to reduce geographic correlation");
  if (i.marketConcentration > 40) m.push("Spread acquisitions across multiple ZIP codes");
  if (i.propertyTypeConcentration > 60) m.push("Add a different property type to reduce sector risk");
  if (i.insurerNetChange < -1) m.push("Lock in multi-year insurance policies before further exits");
  if (i.rateSensitivity > 60) m.push("Consider rate cap or fixed-rate refi to limit rate exposure");
  if (!i.stressTestPasses) m.push("Build a 6-month cash reserve to survive stress scenarios");
  if (i.priceRentDivergence > 3) m.push("Focus on cash-flow-positive deals, avoid appreciation speculation");
  if (i.climateRiskScore > 60) m.push("Obtain climate risk insurance and budget for mitigation upgrades");
  if (!hasRedFlags && m.length === 0) m.push("No urgent mitigations — continue monitoring quarterly");
  return m;
}

function buildHedging(i: RiskConfluenceInput): string[] {
  const s: string[] = [];
  if (i.stateConcentration > 40) s.push("Diversify to a different state with uncorrelated economics");
  if (i.rateSensitivity > 50) s.push("Buy rate cap insurance or lock fixed-rate debt");
  if (i.climateRiskScore > 50) s.push("Invest in climate-resilient markets");
  if (i.priceRentDivergence > 3) s.push("Shift to cash-flow markets where rents outpace prices");
  if (i.propertyTypeConcentration > 50) s.push("Add a different asset class for diversification");
  if (i.municipalFiscalHealth === "weak" || i.municipalFiscalHealth === "distressed")
    s.push("Target municipalities with strong credit ratings and growing tax bases");
  return s;
}

function buildWorstCase(i: RiskConfluenceInput): string {
  const p: string[] = [];
  if (i.rateSensitivity > 50) p.push("rates spike 2%+");
  if (i.priceRentDivergence > 3) p.push("price-rent gap corrects sharply");
  if (i.insurerNetChange < -1) p.push("remaining insurers exit forcing state-backed coverage");
  if (i.municipalFiscalHealth === "distressed") p.push("municipal services collapse and taxes surge");
  if (i.breakEvenVacancy < 10) p.push(`vacancy exceeds ${i.breakEvenVacancy.toFixed(0)}% threshold`);
  if (p.length === 0)
    return "Worst case is a mild downturn with temporary negative cash flow — fundamentals provide a safety net.";
  const loss = Math.abs(Math.min(i.cashFlowAtStress, 0)).toLocaleString();
  return `If ${p.join(", and ")}, expect sustained negative cash flow of $${loss}/month with limited exit options.`;
}

// ============================================================
// Core Engine
// ============================================================

const WEIGHTS = {
  macroEnvironment: 0.20, costPressure: 0.15, signalDivergence: 0.20,
  concentrationRisk: 0.15, bubbleIndicators: 0.20, financialFragility: 0.10,
} as const;

const SOURCES = {
  macroEnvironment: "ClimateCheck, regulatory DB, FRED rates",
  costPressure: "Insurance carriers, premium history, municipal bonds",
  signalDivergence: "StackedSignal Engine bearish concordance",
  concentrationRisk: "Portfolio holdings analysis",
  bubbleIndicators: "FRED, Census ACS, RentCast",
  financialFragility: "Stress test engine, financial model",
} as const;

export function computeRiskConfluence(input: RiskConfluenceInput): RiskConfluenceResult {
  const raw = {
    macroEnvironment: scoreMacro(input), costPressure: scoreCost(input),
    signalDivergence: scoreSignal(input), concentrationRisk: scoreConcentration(input),
    bubbleIndicators: scoreBubble(input), financialFragility: scoreFragility(input),
  };

  let weighted = 0;
  const componentScores = {} as RiskConfluenceResult["componentScores"];
  for (const k of Object.keys(raw) as Array<keyof typeof raw>) {
    const w = WEIGHTS[k];
    weighted += raw[k] * w;
    componentScores[k] = { score: Math.round(raw[k]), weight: w, source: SOURCES[k] };
  }

  const redFlags = detectRedFlags(input);
  const yellowFlags = detectYellowFlags(input);

  let overallRiskScore = cl(Math.round(weighted), 0, 100);
  if (redFlags.length >= 3) overallRiskScore = Math.max(overallRiskScore, 85);
  else if (redFlags.length >= 1) overallRiskScore = Math.max(overallRiskScore, 70);

  const riskLevel: RiskConfluenceResult["riskLevel"] =
    overallRiskScore >= 85 ? "critical" : overallRiskScore >= 70 ? "high" :
    overallRiskScore >= 50 ? "elevated" : overallRiskScore >= 30 ? "moderate" :
    overallRiskScore >= 15 ? "low" : "minimal";

  return {
    overallRiskScore, riskLevel, componentScores, redFlags, yellowFlags,
    mitigations: buildMitigations(input, redFlags.length > 0),
    worstCaseScenario: buildWorstCase(input),
    hedgingSuggestions: buildHedging(input),
  };
}
