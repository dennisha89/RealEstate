// Multi-Variable Correlated Stress Test Engine
// Applies correlated macro shocks simultaneously — the way real downturns work.

import { calculateMortgagePayment } from "./financial-engine";

export interface StressScenario {
  name: string;
  description: string;
  severity: "mild" | "moderate" | "severe" | "extreme";
  variables: {
    rentChange: number;       // % change
    vacancyChange: number;    // pp added
    rateChange: number;       // pp added to mortgage rate
    expenseChange: number;    // % change in opex
    valueChange: number;      // % change in property value
    insuranceChange: number;  // % change in insurance premium
  };
}

export interface StressTestInput {
  monthlyRent: number;
  vacancy: number;           // current %
  mortgageRate: number;      // current %
  loanAmount: number;
  monthlyExpenses: number;   // operating expenses
  propertyValue: number;
  monthlyInsurance: number;
  downPayment: number;
}

export interface StressTestResult {
  scenarios: Array<{
    scenario: StressScenario;
    results: {
      monthlyCashFlow: number; annualCashFlow: number; dscr: number;
      capRate: number; cashOnCash: number; ltv: number;
      equityRemaining: number; monthsOfReservesNeeded: number;
    };
    survives: boolean;
    breaksAt: string;
    comparison: { cashFlowChange: number; dscrChange: number; equityChange: number };
  }>;
  resilience: "fortress" | "strong" | "adequate" | "fragile" | "paper_thin";
  worstSurvivableScenario: string;
  firstScenarioToFail: string;
  monthsOfReserves: number;
  thesis: string;
}

export const PRESET_SCENARIOS: StressScenario[] = [
  { name: "Mild Recession", description: "GDP slows, rates hold, slight rent pressure", severity: "mild",
    variables: { rentChange: -3, vacancyChange: 2, rateChange: 0, expenseChange: 3, valueChange: -5, insuranceChange: 5 } },
  { name: "Rate Shock", description: "Fed hikes aggressively, demand drops, values fall", severity: "moderate",
    variables: { rentChange: -5, vacancyChange: 3, rateChange: 2, expenseChange: 5, valueChange: -10, insuranceChange: 8 } },
  { name: "2008-Style Correction", description: "Credit freeze, values crash, high vacancy", severity: "severe",
    variables: { rentChange: -10, vacancyChange: 8, rateChange: 1.5, expenseChange: 5, valueChange: -25, insuranceChange: 10 } },
  { name: "Insurance Crisis (FL/LA)", description: "Carriers exit, premiums spike, values pressured", severity: "moderate",
    variables: { rentChange: 0, vacancyChange: 2, rateChange: 0, expenseChange: 15, valueChange: -8, insuranceChange: 60 } },
  { name: "Perfect Storm", description: "Rates spike + recession + insurance crisis simultaneously", severity: "extreme",
    variables: { rentChange: -12, vacancyChange: 10, rateChange: 3, expenseChange: 20, valueChange: -30, insuranceChange: 40 } },
  { name: "Inflationary Boom", description: "High inflation, rates rise but rents rise faster", severity: "mild",
    variables: { rentChange: 8, vacancyChange: -2, rateChange: 1.5, expenseChange: 10, valueChange: 5, insuranceChange: 15 } },
];

const ZERO_VARS = { rentChange: 0, vacancyChange: 0, rateChange: 0, expenseChange: 0, valueChange: 0, insuranceChange: 0 };
const SEVERITY_ORDER = ["mild", "moderate", "severe", "extreme"] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;

function compute(input: StressTestInput, v = ZERO_VARS) {
  const rent = input.monthlyRent * (1 + v.rentChange / 100);
  const vacPct = Math.max(0, Math.min(100, input.vacancy + v.vacancyChange));
  const effectiveRent = rent * (1 - vacPct / 100);
  const mortgage = calculateMortgagePayment(input.loanAmount, input.mortgageRate + v.rateChange);
  const expenses = input.monthlyExpenses * (1 + v.expenseChange / 100);
  const insurance = input.monthlyInsurance * (1 + v.insuranceChange / 100);
  const propValue = input.propertyValue * (1 + v.valueChange / 100);

  const monthlyCF = effectiveRent - mortgage - expenses - insurance;
  const annualNOI = (effectiveRent - expenses - insurance) * 12;
  const annualDebt = mortgage * 12;

  return {
    monthlyCashFlow: Math.round(monthlyCF),
    annualCashFlow: Math.round(monthlyCF * 12),
    dscr: r2(annualDebt > 0 ? annualNOI / annualDebt : Infinity),
    capRate: r2(propValue > 0 ? (annualNOI / propValue) * 100 : 0),
    cashOnCash: r2(input.downPayment > 0 ? (monthlyCF * 12 / input.downPayment) * 100 : 0),
    ltv: r2(propValue > 0 ? (input.loanAmount / propValue) * 100 : 100),
    equityRemaining: Math.round(propValue - input.loanAmount),
    monthsOfReservesNeeded: monthlyCF < 0 ? 12 : 0,
  };
}

function findBreaker(input: StressTestInput, scenario: StressScenario, baselineCF: number): string {
  const labels: Array<[keyof StressScenario["variables"], string]> = [
    ["rentChange", "rent decline"], ["vacancyChange", "vacancy increase"],
    ["rateChange", "rate increase"], ["expenseChange", "expense increase"],
    ["valueChange", "value decline"], ["insuranceChange", "insurance increase"],
  ];
  let worst = 0, label = "combined stress";
  for (const [key, name] of labels) {
    if (scenario.variables[key] === 0) continue;
    const isolated = compute(input, { ...ZERO_VARS, [key]: scenario.variables[key] });
    const impact = baselineCF - isolated.monthlyCashFlow;
    if (impact > worst) { worst = impact; label = name; }
  }
  return label;
}

export function runMultiVariableStressTest(
  input: StressTestInput,
  scenarios?: StressScenario[]
): StressTestResult {
  const baseline = compute(input);
  const sorted = [...(scenarios ?? PRESET_SCENARIOS)].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  let survived = 0, worstSurvivable = "none", firstToFail = "none", maxReserve = 0;

  const out = sorted.map((scenario) => {
    const results = compute(input, scenario.variables);
    const survives = results.monthlyCashFlow > 0 && results.dscr > 0.9;
    const breaksAt = survives ? "n/a" : findBreaker(input, scenario, baseline.monthlyCashFlow);

    if (survives) { survived++; worstSurvivable = scenario.name; }
    else if (firstToFail === "none") firstToFail = scenario.name;
    if (results.monthlyCashFlow < 0) maxReserve = Math.max(maxReserve, 12);

    return {
      scenario, results, survives, breaksAt,
      comparison: {
        cashFlowChange: results.monthlyCashFlow - baseline.monthlyCashFlow,
        dscrChange: r2(results.dscr - baseline.dscr),
        equityChange: results.equityRemaining - baseline.equityRemaining,
      },
    };
  });

  const ratio = sorted.length > 0 ? survived / sorted.length : 0;
  const resilience: StressTestResult["resilience"] =
    ratio >= 1 ? "fortress" : ratio >= 0.8 ? "strong" : ratio >= 0.5 ? "adequate" : ratio >= 0.25 ? "fragile" : "paper_thin";
  const reserveRec = maxReserve > 0 ? maxReserve : survived === sorted.length ? 3 : 6;

  const thesis =
    resilience === "fortress" ? "This deal survives every stress scenario tested. Exceptionally defensive position." :
    resilience === "strong" ? `Solid resilience. Survives through ${worstSurvivable}. First failure at ${firstToFail}.` :
    resilience === "adequate" ? `Moderate resilience. Breaks at ${firstToFail}. Maintain ${reserveRec} months of reserves.` :
    resilience === "fragile" ? `Fragile deal. Only survives mild scenarios. ${firstToFail} would require cash injection.` :
    "Paper-thin margins. Fails under almost any stress. Reconsider this deal or restructure with more equity.";

  return { scenarios: out, resilience, worstSurvivableScenario: worstSurvivable, firstScenarioToFail: firstToFail, monthsOfReserves: reserveRec, thesis };
}
