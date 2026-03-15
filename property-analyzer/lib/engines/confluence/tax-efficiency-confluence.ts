/**
 * Tax Efficiency Confluence Engine — "What's my AFTER-TAX return?"
 * Scores depreciation, state advantage, passive loss, exit strategy, tax drag.
 */
export interface TaxEfficiencyInput {
  purchasePrice: number; landValuePct: number;
  annualCashFlow: number; annualAppreciation: number;
  federalTaxBracket: number; stateIncomeTaxRate: number; capitalGainsRate: number;
  filingStatus: "single" | "married" | "head_of_household";
  isREProfessional: boolean; activeParticipation: boolean; adjustedGrossIncome: number;
  yearsHeld: number; costSegregationDone: boolean;
  holdPeriodPlanned: number; expectedSalePrice: number; sellingCosts: number;
  will1031Exchange: boolean;
}

interface ComponentScore { score: number; weight: number; source: string }

export interface TaxEfficiencyResult {
  confluenceScore: number;
  componentScores: {
    depreciationBenefit: ComponentScore; stateAdvantage: ComponentScore;
    passiveLossUtility: ComponentScore; exitTaxEfficiency: ComponentScore;
    overallTaxDrag: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "TAX_OPTIMIZED" | "FAVORABLE" | "NEUTRAL" | "INEFFICIENT" | "TAX_HEAVY";
  annualDepreciation: number; taxSavingsFromDepreciation: number;
  effectiveTaxRateOnCashFlow: number; afterTaxCashFlow: number; afterTaxCashOnCash: number;
  totalDepreciationRecapture: number; capitalGainsTaxAtSale: number;
  netProceedsAfterTax: number; taxDeferredVia1031: number;
  preVsPostTaxReturn: { preTax: number; afterTax: number; taxDrag: number };
  thesis: string; taxStrategies: string[]; warnings: string[];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function calcDepreciation(price: number, landPct: number, costSeg: boolean, year: number): number {
  const depreciableBasis = price * (1 - landPct);
  const straightLine = depreciableBasis / 27.5;
  if (!costSeg) return straightLine;
  // Cost segregation accelerates ~30% of basis into first 5 years
  const acceleratedPortion = depreciableBasis * 0.30;
  if (year <= 5) return (acceleratedPortion / 5) + ((depreciableBasis - acceleratedPortion) / 27.5);
  return (depreciableBasis - acceleratedPortion) / 27.5;
}

function scoreDepreciationBenefit(i: TaxEfficiencyInput): number {
  const annualDepr = calcDepreciation(i.purchasePrice, i.landValuePct, i.costSegregationDone, i.yearsHeld);
  const combinedRate = (i.federalTaxBracket + i.stateIncomeTaxRate) / 100;
  const taxSaved = annualDepr * combinedRate;
  if (i.annualCashFlow <= 0) return clamp(Math.round(taxSaved / 1000 * 10), 0, 100);
  const shelterRatio = annualDepr / Math.max(i.annualCashFlow, 1);
  const base = clamp(shelterRatio * 50, 0, 70);
  const costSegBonus = i.costSegregationDone ? 15 : 0;
  const bracketBonus = clamp((i.federalTaxBracket - 22) / 15 * 15, 0, 15);
  return clamp(Math.round(base + costSegBonus + bracketBonus), 0, 100);
}

function scoreStateAdvantage(i: TaxEfficiencyInput): number {
  if (i.stateIncomeTaxRate === 0) return 100;
  if (i.stateIncomeTaxRate <= 3) return 80;
  if (i.stateIncomeTaxRate <= 5) return 60;
  if (i.stateIncomeTaxRate <= 8) return 40;
  if (i.stateIncomeTaxRate <= 10) return 25;
  return 10;
}

function scorePassiveLossUtility(i: TaxEfficiencyInput): number {
  if (i.isREProfessional) return 95;
  if (i.activeParticipation && i.adjustedGrossIncome <= 100000) return 80;
  if (i.activeParticipation && i.adjustedGrossIncome <= 150000) {
    const phaseout = clamp((i.adjustedGrossIncome - 100000) / 50000, 0, 1);
    return Math.round(80 - phaseout * 55);
  }
  return 15; // Losses trapped as passive — can only offset passive income
}

function scoreExitTaxEfficiency(i: TaxEfficiencyInput): number {
  if (i.will1031Exchange) return 95;
  // Lower capital gains rate = better
  const cgScore = i.capitalGainsRate === 0 ? 90 : i.capitalGainsRate <= 15 ? 60 : 35;
  // Longer hold = more depreciation recaptured (bad), but more appreciation (context-dependent)
  const holdPenalty = clamp(i.holdPeriodPlanned * 1.5, 0, 15);
  return clamp(Math.round(cgScore - holdPenalty), 0, 100);
}

function scoreTaxDrag(i: TaxEfficiencyInput): number {
  const annualDepr = calcDepreciation(i.purchasePrice, i.landValuePct, i.costSegregationDone, i.yearsHeld);
  const combinedRate = (i.federalTaxBracket + i.stateIncomeTaxRate) / 100;
  const taxableIncome = Math.max(i.annualCashFlow - annualDepr, 0);
  const taxOwed = taxableIncome * combinedRate;
  const grossReturn = i.annualCashFlow + i.annualAppreciation;
  if (grossReturn <= 0) return 50;
  const dragPct = (taxOwed / grossReturn) * 100;
  // INVERTED: lower drag = higher score
  return clamp(Math.round(100 - dragPct * 3), 0, 100);
}

export function computeTaxEfficiencyConfluence(input: TaxEfficiencyInput): TaxEfficiencyResult {
  const WEIGHTS = { dep: 0.25, state: 0.20, passive: 0.20, exit: 0.20, drag: 0.15 };

  const depScore = scoreDepreciationBenefit(input);
  const stateScore = scoreStateAdvantage(input);
  const passiveScore = scorePassiveLossUtility(input);
  const exitScore = scoreExitTaxEfficiency(input);
  const dragScore = scoreTaxDrag(input);

  const componentScores: TaxEfficiencyResult["componentScores"] = {
    depreciationBenefit: { score: depScore, weight: WEIGHTS.dep, source: "IRS depreciation schedule / cost segregation" },
    stateAdvantage: { score: stateScore, weight: WEIGHTS.state, source: "State income tax rate" },
    passiveLossUtility: { score: passiveScore, weight: WEIGHTS.passive, source: "RE professional status / AGI phase-out" },
    exitTaxEfficiency: { score: exitScore, weight: WEIGHTS.exit, source: "1031 exchange / capital gains bracket" },
    overallTaxDrag: { score: dragScore, weight: WEIGHTS.drag, source: "Effective tax vs gross return" },
  };

  const raw = depScore * WEIGHTS.dep + stateScore * WEIGHTS.state + passiveScore * WEIGHTS.passive
    + exitScore * WEIGHTS.exit + dragScore * WEIGHTS.drag;
  const confluenceScore = Math.round(clamp(raw, 0, 100));

  // Agreement via standard deviation
  const all = [depScore, stateScore, passiveScore, exitScore, dragScore];
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  const sd = Math.sqrt(all.reduce((s, v) => s + (v - avg) ** 2, 0) / all.length);
  const agreement: TaxEfficiencyResult["agreement"] =
    sd < 10 ? "strong" : sd < 18 ? "moderate" : sd < 28 ? "mixed" : "divergent";
  const agreementDetail = `Component std dev ${sd.toFixed(0)} — ${agreement} agreement across tax dimensions`;

  const verdict: TaxEfficiencyResult["verdict"] =
    confluenceScore >= 80 ? "TAX_OPTIMIZED" : confluenceScore >= 65 ? "FAVORABLE" :
    confluenceScore >= 45 ? "NEUTRAL" : confluenceScore >= 30 ? "INEFFICIENT" : "TAX_HEAVY";

  // Tax calculations
  const annualDepreciation = Math.round(calcDepreciation(input.purchasePrice, input.landValuePct, input.costSegregationDone, input.yearsHeld));
  const combinedRate = (input.federalTaxBracket + input.stateIncomeTaxRate) / 100;
  const taxSavingsFromDepreciation = Math.round(annualDepreciation * combinedRate);
  const taxableIncome = Math.max(input.annualCashFlow - annualDepreciation, 0);
  const taxOwed = Math.round(taxableIncome * combinedRate);
  const afterTaxCashFlow = input.annualCashFlow - taxOwed;
  const effectiveTaxRateOnCashFlow = input.annualCashFlow > 0
    ? Math.round(taxOwed / input.annualCashFlow * 10000) / 100
    : 0;
  const afterTaxCashOnCash = input.purchasePrice > 0
    ? Math.round(afterTaxCashFlow / (input.purchasePrice * 0.20) * 10000) / 100
    : 0;

  // Exit tax analysis
  const totalDeprTaken = annualDepreciation * Math.min(input.yearsHeld, input.holdPeriodPlanned);
  const totalDepreciationRecapture = Math.round(totalDeprTaken * 0.25);
  const sellCosts = Math.round(input.expectedSalePrice * input.sellingCosts);
  const gainAboveBasis = input.expectedSalePrice - sellCosts - (input.purchasePrice - totalDeprTaken);
  const capitalGainsTaxAtSale = Math.round(Math.max(gainAboveBasis, 0) * input.capitalGainsRate / 100);
  const totalTaxAtSale = totalDepreciationRecapture + capitalGainsTaxAtSale;
  const netProceedsAfterTax = Math.round(input.expectedSalePrice - sellCosts - totalTaxAtSale);
  const taxDeferredVia1031 = input.will1031Exchange ? totalTaxAtSale : 0;

  // Pre vs post tax return
  const grossReturn = input.annualCashFlow + input.annualAppreciation;
  const netReturn = afterTaxCashFlow + input.annualAppreciation;
  const preTax = input.purchasePrice > 0 ? Math.round(grossReturn / input.purchasePrice * 10000) / 100 : 0;
  const afterTaxPct = input.purchasePrice > 0 ? Math.round(netReturn / input.purchasePrice * 10000) / 100 : 0;

  const taxStrategies: string[] = [];
  if (!input.costSegregationDone && input.purchasePrice > 200000) taxStrategies.push("Cost segregation study could accelerate $" + Math.round(input.purchasePrice * (1 - input.landValuePct) * 0.30).toLocaleString() + " of depreciation into years 1-5");
  if (!input.isREProfessional && input.adjustedGrossIncome > 150000) taxStrategies.push("Qualifying as RE professional would unlock unlimited passive loss deductions against W2 income");
  if (!input.will1031Exchange) taxStrategies.push("1031 exchange at sale would defer $" + totalTaxAtSale.toLocaleString() + " in taxes");
  if (input.stateIncomeTaxRate > 5) taxStrategies.push("Investing in a no-income-tax state (TX, FL, NV, WY, TN, WA, SD) saves " + input.stateIncomeTaxRate.toFixed(1) + "% on rental income");
  if (input.federalTaxBracket >= 32) taxStrategies.push("High bracket amplifies depreciation benefit — each $1 of depreciation saves $" + (input.federalTaxBracket / 100).toFixed(2));

  const warnings: string[] = [];
  if (effectiveTaxRateOnCashFlow > 30) warnings.push(`Effective tax rate on cash flow is ${effectiveTaxRateOnCashFlow.toFixed(1)}% — consider tax optimization`);
  if (totalDepreciationRecapture > input.annualCashFlow * 2) warnings.push("Depreciation recapture at sale ($" + totalDepreciationRecapture.toLocaleString() + ") is significant — plan for it");
  if (!input.will1031Exchange && capitalGainsTaxAtSale > 50000) warnings.push("Capital gains tax at sale exceeds $50K — strongly consider 1031 exchange");
  if (input.yearsHeld > 27 && !input.will1031Exchange) warnings.push("Depreciation fully exhausted — rental income now fully taxable");

  const thesis = `${verdict.replace(/_/g, " ")} (${confluenceScore}/100). ` +
    `Depreciation shelters $${taxSavingsFromDepreciation.toLocaleString()}/yr, ` +
    `effective tax rate ${effectiveTaxRateOnCashFlow.toFixed(1)}% on cash flow. ` +
    `Pre-tax ${preTax.toFixed(1)}% vs after-tax ${afterTaxPct.toFixed(1)}% return (${(preTax - afterTaxPct).toFixed(1)}% drag).`;

  return {
    confluenceScore, componentScores, agreement, agreementDetail, verdict,
    annualDepreciation, taxSavingsFromDepreciation, effectiveTaxRateOnCashFlow,
    afterTaxCashFlow, afterTaxCashOnCash,
    totalDepreciationRecapture, capitalGainsTaxAtSale, netProceedsAfterTax, taxDeferredVia1031,
    preVsPostTaxReturn: { preTax, afterTax: afterTaxPct, taxDrag: Math.round((preTax - afterTaxPct) * 100) / 100 },
    thesis, taxStrategies, warnings,
  };
}
