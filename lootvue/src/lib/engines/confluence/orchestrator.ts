/**
 * Confluence Orchestrator
 *
 * Takes raw market/property/signal/rate/portfolio data, transforms it into
 * each confluence engine's expected format, runs all 12 engines, feeds
 * results into master-confluence, and returns the final verdict.
 */

import { computeMarketSelectionConfluence, type MarketSelectionInput } from "./market-selection-confluence";
import { computeDealQualityConfluence, type DealQualityInput } from "./deal-quality-confluence";
import { computeEntryTimingConfluence, type EntryTimingInput } from "./entry-timing-confluence";
import { computeRiskConfluence, type RiskConfluenceInput } from "./risk-confluence";
import { computePortfolioOptimization, type PortfolioOptimizationInput } from "./portfolio-optimization-confluence";
import { computeRateTransmissionConfluence, type RateTransmissionInput } from "./rate-transmission-confluence";
import { computeSupplyPipelineConfluence, type SupplyPipelineInput } from "./supply-pipeline-confluence";
import { computeDemandVelocityConfluence, type DemandVelocityInput } from "./demand-velocity-confluence";
import { computeExitStrategyConfluence, type ExitStrategyInput } from "./exit-strategy-confluence";
import { computeMicroLocationConfluence, type MicroLocationInput } from "./micro-location-confluence";
import { computeFinancingConfluence, type FinancingInput } from "./financing-confluence";
import { computeTaxEfficiencyConfluence, type TaxEfficiencyInput } from "./tax-efficiency-confluence";
import { computeTransactionIntelligence, type TransactionIntelligenceInput } from "./transaction-intelligence-confluence";
import { computeMasterConfluence, type MasterConfluenceResult } from "./master-confluence";

export interface ConfluenceOrchestratorInput {
  market: {
    zip: string;
    name: string;
    state: string;
    hyperScore: number;
    demographicScore: number;
    economicScore: number;
    infrastructureScore: number;
    capRate: number;
    medianPrice: number;
    priceChange: number;
    popGrowth: number;
    jobGrowth: number;
    inventory: number;
    daysOnMarket: number;
  };

  property?: {
    address: string;
    askingPrice: number;
    impliedValue: number;
    capRate: number;
    cashOnCash: number;
    monthlyCashFlow: number;
    dscr: number;
    hyperScore: number;
    pricePerSqft: number;
    compsPricePerSqft: number;
    daysOnMarket: number;
    stressTestSurvival: boolean;
    cashFlowAtWorstCase: number;
    breakEvenVacancy: number;
  };

  signals: {
    compositeScore: number;
    compositeScorePrevMonth: number;
    probability: number;
    leadingLayerScore: number;
    leadingConcordance: number;
    bearishCount: number;
    totalSignals: number;
    bearishConcordance: number;
  };

  rates: {
    mortgageRate30yr: number;
    mortgageRateChange6mo: number;
    fedFundsRate: number;
    rateDirection: "falling" | "stable" | "rising";
  };

  portfolio?: {
    properties: Array<{
      address: string;
      city: string;
      state: string;
      value: number;
      monthlyCashFlow: number;
      capRate: number;
      appreciation: number;
      purchasePrice: number;
      monthlyRent: number;
      monthlyExpenses: number;
      mortgage: number;
    }>;
    cashReserves?: number;
    goalMonthlyCashFlow?: number;
  };

  // ── Extended inputs for additional confluence engines ──────────
  // All optional — engines use neutral defaults when not provided

  rateEnvironment?: {
    fedFundsRatePrior?: number;
    fedDirection?: "hiking" | "pausing" | "cutting";
    treasury2yr?: number;
    treasury10yr?: number;
    sofrRate?: number;
    sofrForwardCurve?: "rising" | "flat" | "falling";
    medianPaymentToIncome?: number;
    buyerPoolChange?: number;
    mortgageAppVolume?: "surging" | "growing" | "stable" | "declining" | "collapsing";
    approvalRate?: number;
    avgDenialRate?: number;
    creditTightening?: "loosening" | "stable" | "tightening" | "severe";
  };

  supply?: {
    residentialPermitsYoY?: number;
    commercialPermitsYoY?: number;
    permitTrend?: "accelerating" | "stable" | "decelerating" | "collapsing";
    housingStarts?: number;
    housingStartsYoY?: number;
    completions?: number;
    completionsYoY?: number;
    startsToCompletionRatio?: number;
    avgConstructionTimeline?: number;
    constructionCostIndex?: number;
    constructionCostYoY?: number;
    lumberPriceYoY?: number;
    laborAvailability?: "surplus" | "adequate" | "tight" | "severe_shortage";
    contractorBacklog?: number;
    entitledUnbuiltLots?: number;
    entitledUnbuiltTrend?: "growing" | "stable" | "shrinking";
    expiredPermits?: number;
    demolitionPermits?: number;
    officeToResidentialConversions?: number;
    multifamilyUnitsUnderConstruction?: number;
    multifamilyDeliveryNext12mo?: number;
    multifamilyAbsorptionRate?: number;
  };

  demand?: {
    uspsInboundRatio?: number;
    irsMigrationNetHouseholds?: number;
    irsMigrationNetIncome?: number;
    migrationTrend?: "accelerating" | "stable" | "decelerating" | "reversing";
    corporateRelocationJobs?: number;
    h1bVisaApprovals?: number;
    remoteWorkAdoption?: number;
    googleTrendsIndex?: number;
    googleTrendsYoY?: number;
    listingViewsPerProperty?: number;
    searchToListingRatio?: number;
    householdFormationRate?: number;
    millennialShareOfBuyers?: number;
    firstTimeBuyerShare?: number;
    medianAge?: number;
    utilityNewConnections?: number;
    utilityConnectionsYoY?: number;
    kindergartenEnrollmentChange?: number;
    schoolCapacityUtilization?: number;
    investorPurchaseShare?: number;
    investorShareChange?: number;
    exchange1031Inflows?: number;
    hmdaInvestorLoanGrowth?: number;
  };

  exitStrategy?: {
    yearsHeld?: number;
    remainingLoanBalance?: number;
    monthlyEquityGain?: number;
    depreciationBasis?: number;
    annualDepreciation?: number;
    totalDepreciationTaken?: number;
    marketCyclePosition?: "early_recovery" | "expansion" | "late_cycle" | "peak" | "contraction";
    capRateTrend?: "compressing" | "stable" | "expanding";
    capRateVsHistorical?: number;
    replacementPropertyAvailable?: boolean;
    capitalGainsTaxRate?: number;
    depreciationRecaptureRate?: number;
    stateIncomeTaxRate?: number;
  };

  microLocation?: {
    walkScore?: number;
    transitScore?: number;
    bikeScore?: number;
    avgSchoolRating?: number;
    topSchoolRating?: number;
    schoolCount?: number;
    crimeIndex?: number;
    violentCrimeRate?: number;
    propertyCrimeRate?: number;
    crimeYoYChange?: number;
    groceryMinutes?: number;
    hospitalMinutes?: number;
    employmentCenterMinutes?: number;
    airportMinutes?: number;
    restaurantCount500m?: number;
    floodZone?: boolean;
    floodZoneType?: string;
    wildfireRisk?: "minimal" | "low" | "moderate" | "high" | "extreme";
    noiseLevel?: "quiet" | "moderate" | "noisy" | "very_noisy";
    newRestaurantsLast12mo?: number;
    newBusinessesLast12mo?: number;
    medianHomeAgeYears?: number;
    recentRenovationPermits?: number;
    artGalleriesOrBreweries?: number;
  };

  financing?: {
    creditScore?: number;
    annualIncome?: number;
    existingDebt?: number;
    cashAvailable?: number;
    isVeteran?: boolean;
    isFirstTimeBuyer?: boolean;
    conventionalRate?: number;
    fhaRate?: number;
    vaRate?: number;
    dscrLoanRate?: number;
    hardMoneyRate?: number;
  };

  tax?: {
    landValuePct?: number;
    federalTaxBracket?: number;
    stateIncomeTaxRate?: number;
    capitalGainsRate?: number;
    filingStatus?: "single" | "married" | "head_of_household";
    isREProfessional?: boolean;
    activeParticipation?: boolean;
    adjustedGrossIncome?: number;
    costSegregationDone?: boolean;
    holdPeriodPlanned?: number;
    sellingCosts?: number;
    will1031Exchange?: boolean;
  };

  transactionIntel?: {
    cashBuyerPct?: number;
    investorPurchasePct?: number;
    firstTimeBuyerPct?: number;
    listToSaleRatio?: number;
    avgOfferCount?: number;
    biddingWarPct?: number;
    aboveAskingPct?: number;
    sellerConcessionPct?: number;
    avgConcessionAmount?: number;
    priceReductionPct?: number;
    avgPriceReduction?: number;
    expiredListingPct?: number;
    withdrawnListingPct?: number;
    daysToFirstOffer?: number;
    domTrend?: "shortening" | "stable" | "lengthening";
    pendingSalesYoY?: number;
    closedSalesYoY?: number;
    monthsOfSupply?: number;
    newListingsYoY?: number;
    absorptionRate?: number;
  };
}

function buildMarketInput(input: ConfluenceOrchestratorInput): MarketSelectionInput {
  const { market, signals } = input;
  const medianIncome = 65000; // national median fallback
  const monthlyMortgage = market.medianPrice * 0.8 * (input.rates.mortgageRate30yr / 100 / 12);
  const annualRent = market.medianPrice / 18; // rough rent estimate from price

  return {
    hyperScore: market.hyperScore,
    demographicScore: market.demographicScore,
    economicScore: market.economicScore,
    infrastructureScore: market.infrastructureScore,
    leadingLayerScore: signals.leadingLayerScore,
    leadingConcordance: signals.leadingConcordance,
    capitalFlowDirection: market.popGrowth > 1.5 ? "strong_inflow" : market.popGrowth > 0.5 ? "inflow"
      : market.popGrowth > -0.5 ? "balanced" : market.popGrowth > -1.5 ? "outflow" : "strong_outflow",
    capitalFlowScore: Math.round(Math.max(0, Math.min(100, 50 + market.popGrowth * 15 + market.jobGrowth * 10))),
    institutionalActivity: market.priceChange > 5 ? "increasing" : market.priceChange > -2 ? "stable" : "decreasing",
    priceToRentRatio: annualRent > 0 ? market.medianPrice / annualRent : 18,
    priceToIncomeRatio: market.medianPrice / medianIncome,
    affordabilityIndex: medianIncome > 0 ? (monthlyMortgage / (medianIncome / 12)) * 100 : 35,
    rentYield: market.capRate > 0 ? market.capRate : (annualRent / market.medianPrice) * 100,
  };
}

function buildDealInput(input: ConfluenceOrchestratorInput): DealQualityInput {
  const prop = input.property;
  if (!prop) {
    // Neutral deal placeholder when no property provided
    return {
      capRate: input.market.capRate, cashOnCash: 8, monthlyCashFlow: 300,
      dscr: 1.25, stressTestSurvival: true,
      askingPrice: input.market.medianPrice, impliedValue: input.market.medianPrice,
      pricePerSqft: 150, compsPricePerSqft: 150,
      priceDirection: input.market.priceChange > 2 ? "rising" : input.market.priceChange < -2 ? "falling" : "stable",
      dealType: "standard", daysOnMarket: input.market.daysOnMarket,
      hyperScore: input.market.hyperScore,
      cashFlowAtWorstCase: 0, breakEvenVacancy: 15,
    };
  }

  return {
    capRate: prop.capRate, cashOnCash: prop.cashOnCash, monthlyCashFlow: prop.monthlyCashFlow,
    dscr: prop.dscr, stressTestSurvival: prop.stressTestSurvival,
    askingPrice: prop.askingPrice, impliedValue: prop.impliedValue,
    pricePerSqft: prop.pricePerSqft, compsPricePerSqft: prop.compsPricePerSqft,
    priceDirection: input.market.priceChange > 2 ? "rising" : input.market.priceChange < -2 ? "falling" : "stable",
    dealType: prop.impliedValue > prop.askingPrice * 1.1 ? "below_market_value"
      : prop.monthlyCashFlow > 500 ? "cash_flow_play" : "standard",
    daysOnMarket: prop.daysOnMarket, hyperScore: prop.hyperScore,
    cashFlowAtWorstCase: prop.cashFlowAtWorstCase, breakEvenVacancy: prop.breakEvenVacancy,
    portfolioContext: input.portfolio && input.portfolio.properties.length > 0
      ? buildPortfolioContext(input) : undefined,
  };
}

function buildPortfolioContext(input: ConfluenceOrchestratorInput) {
  const props = input.portfolio!.properties;
  const totalCf = props.reduce((s, p) => s + p.monthlyCashFlow, 0);
  const avgCap = props.reduce((s, p) => s + p.capRate, 0) / props.length;
  const stateValues: Record<string, number> = {};
  const totalValue = props.reduce((s, p) => { stateValues[p.state] = (stateValues[p.state] ?? 0) + p.value; return s + p.value; }, 0);
  const maxConc = totalValue > 0 ? (Math.max(...Object.values(stateValues)) / totalValue) * 100 : 100;

  return { existingPropertyCount: props.length, stateConcentration: maxConc, avgPortfolioCapRate: avgCap, currentMonthlyCashFlow: totalCf };
}

function buildTimingInput(input: ConfluenceOrchestratorInput): EntryTimingInput {
  const { signals, rates, market } = input;
  const score = signals.compositeScore;
  const timingSignal: EntryTimingInput["timingSignal"] =
    score > 50 ? "BUY_NOW" : score > 20 ? "FAVORABLE" : score > -20 ? "NEUTRAL" : score > -50 ? "WAIT" : "MARKET_PEAKING";

  return {
    timingSignal, timingConfidence: signals.probability * 100,
    trajectoryDirection: signals.compositeScore > signals.compositeScorePrevMonth + 5 ? "improving"
      : signals.compositeScore < signals.compositeScorePrevMonth - 5 ? "deteriorating" : "stable",
    optimalWindowMonths: rates.rateDirection === "falling" ? 3 : rates.rateDirection === "rising" ? 9 : 6,
    compositeScore: signals.compositeScore, compositeScorePrevMonth: signals.compositeScorePrevMonth,
    probability: signals.probability, signalConcordance: signals.leadingConcordance,
    transactionVelocity: market.inventory < 3 ? "accelerating" : market.inventory > 6 ? "decelerating" : "stable",
    capitalDeploymentRate: market.priceChange > 5 ? "fast" : market.priceChange < 0 ? "slow" : "normal",
    daysOnMarket: market.daysOnMarket,
    mortgageAppRate: rates.mortgageRate30yr < 5.5 ? "high" : rates.mortgageRate30yr > 7 ? "low" : "normal",
    currentMonth: new Date().getMonth() + 1,
    mortgageRateChange6mo: rates.mortgageRateChange6mo,
    rateDirection: rates.rateDirection,
    uspsMigrationTrend: market.popGrowth > 1.5 ? "strong_inflow" : market.popGrowth > 0.5 ? "moderate_inflow"
      : market.popGrowth > -0.5 ? "stable" : market.popGrowth > -1.5 ? "moderate_outflow" : "strong_outflow",
    utilityConnectionsTrend: market.jobGrowth > 2 ? "expansion" : market.jobGrowth < -1 ? "contraction" : "stable",
    searchVolumeTrend: market.priceChange > 8 ? "surging" : market.priceChange > 3 ? "growing"
      : market.priceChange > -2 ? "stable" : "declining",
  };
}

function buildRiskInput(input: ConfluenceOrchestratorInput): RiskConfluenceInput {
  const { signals, rates, market, property, portfolio } = input;
  const props = portfolio?.properties ?? [];
  const totalValue = props.reduce((s, p) => s + p.value, 0);
  const stateValues: Record<string, number> = {};
  for (const p of props) stateValues[p.state] = (stateValues[p.state] ?? 0) + p.value;
  const maxStateConc = totalValue > 0 ? (Math.max(...Object.values(stateValues)) / totalValue) * 100 : 50;

  return {
    climateRiskScore: 30, regulatoryRiskScore: 25, // neutral defaults — no climate/regulatory data in input
    rateSensitivity: Math.min(100, Math.abs(rates.mortgageRateChange6mo) * 30 + (rates.rateDirection === "rising" ? 20 : 0)),
    macroRiskScore: Math.max(0, Math.min(100, 50 - market.jobGrowth * 10)),
    insurerNetChange: 0, premiumChange5yr: 15, // neutral defaults
    municipalFiscalHealth: market.economicScore > 70 ? "strong" : market.economicScore > 50 ? "stable" : market.economicScore > 30 ? "weak" : "distressed",
    costInsuranceScore: 60,
    bearishSignalCount: signals.bearishCount,
    totalSignalCount: signals.totalSignals,
    bearishConcordance: signals.bearishConcordance,
    stateConcentration: maxStateConc,
    marketConcentration: props.length > 0 ? 100 / props.length : 50,
    propertyTypeConcentration: 60, // default — no property type data in input
    priceRentDivergence: Math.max(0, market.priceChange - 3),
    priceToIncomeRatio: market.medianPrice / 65000,
    affordabilityIndex: (market.medianPrice * 0.8 * (rates.mortgageRate30yr / 100 / 12)) / (65000 / 12) * 100,
    priceChangeVsHistorical: market.priceChange / 3.5, // 3.5% = long-run average
    stressTestPasses: property?.stressTestSurvival ?? true,
    cashFlowAtStress: property?.cashFlowAtWorstCase ?? 200,
    breakEvenVacancy: property?.breakEvenVacancy ?? 15,
  };
}

function buildPortfolioInput(input: ConfluenceOrchestratorInput): PortfolioOptimizationInput {
  const props = input.portfolio?.properties ?? [];
  const totalValue = props.reduce((s, p) => s + p.value, 0);
  const totalEquity = props.reduce((s, p) => s + (p.value - (p.purchasePrice * 0.8)), 0); // rough equity
  const monthlyIncome = props.reduce((s, p) => s + p.monthlyCashFlow, 0);
  const avgCap = props.length > 0 ? props.reduce((s, p) => s + p.capRate, 0) / props.length : 0;

  return {
    portfolio: {
      totalValue, totalEquity: Math.max(0, totalEquity), monthlyIncome,
      propertyCount: props.length, avgCapRate: avgCap,
      properties: props.map(p => ({
        state: p.state, city: p.city, value: p.value,
        monthlyCashFlow: p.monthlyCashFlow, capRate: p.capRate, appreciation: p.appreciation,
      })),
    },
    goalMonthlyCashFlow: input.portfolio?.goalMonthlyCashFlow ?? 5000,
    currentMonthlyCashFlow: monthlyIncome,
    monthlyAppreciation: props.reduce((s, p) => s + (p.value * (p.appreciation / 100) / 12), 0),
    monthlyDebtPaydown: props.reduce((s, p) => s + Math.max(0, p.mortgage * 0.3), 0), // ~30% of payment is principal
    monthlyCashFlowIncome: monthlyIncome,
    watchlistAlerts: [],
    watchedMarketTimings: [{
      marketName: input.market.name, zip: input.market.zip,
      timingSignal: input.signals.compositeScore > 50 ? "BUY_NOW" : input.signals.compositeScore > 20 ? "FAVORABLE" : "NEUTRAL",
      hyperScore: input.market.hyperScore,
    }],
    topDeals: input.property ? [{
      address: input.property.address, market: input.market.name,
      price: input.property.askingPrice, capRate: input.property.capRate,
      monthlyCashFlow: input.property.monthlyCashFlow, hyperScore: input.property.hyperScore,
      dealType: input.property.impliedValue > input.property.askingPrice * 1.1 ? "below_market_value" : "standard",
    }] : [],
  };
}

// ── Build functions for extended engines ────────────────────────

function buildRateTransmissionInput(input: ConfluenceOrchestratorInput): RateTransmissionInput {
  const re = input.rateEnvironment ?? {};
  const spread = input.rates.mortgageRate30yr - input.rates.fedFundsRate;
  return {
    fedFundsRate: input.rates.fedFundsRate,
    fedFundsRatePrior: re.fedFundsRatePrior ?? input.rates.fedFundsRate,
    fedDirection: re.fedDirection ?? (input.rates.rateDirection === "falling" ? "cutting" : input.rates.rateDirection === "rising" ? "hiking" : "pausing"),
    treasury2yr: re.treasury2yr ?? input.rates.fedFundsRate + 0.3,
    treasury10yr: re.treasury10yr ?? input.rates.fedFundsRate + 1.0,
    yieldCurveSpread: (re.treasury10yr ?? input.rates.fedFundsRate + 1.0) - (re.treasury2yr ?? input.rates.fedFundsRate + 0.3),
    yieldCurveSpreadPrior: (re.treasury10yr ?? input.rates.fedFundsRate + 1.0) - (re.treasury2yr ?? input.rates.fedFundsRate + 0.3),
    mortgageRate30yr: input.rates.mortgageRate30yr,
    mortgageRate30yrPrior: input.rates.mortgageRate30yr + input.rates.mortgageRateChange6mo,
    mortgageToFedSpread: spread,
    mortgageToFedSpreadHistorical: 1.75, // long-run historical average
    sofrRate: re.sofrRate ?? input.rates.fedFundsRate + 0.05,
    sofrForwardCurve: re.sofrForwardCurve ?? (input.rates.rateDirection === "falling" ? "falling" : input.rates.rateDirection === "rising" ? "rising" : "flat"),
    medianPaymentToIncome: re.medianPaymentToIncome ?? 30, // neutral default
    buyerPoolChange: re.buyerPoolChange ?? 0,
    mortgageAppVolume: re.mortgageAppVolume ?? "stable",
    approvalRate: re.approvalRate ?? 70,
    avgDenialRate: re.avgDenialRate ?? 15,
    creditTightening: re.creditTightening ?? "stable",
  };
}

function buildSupplyPipelineInput(input: ConfluenceOrchestratorInput): SupplyPipelineInput {
  const s = input.supply ?? {};
  return {
    residentialPermitsYoY: s.residentialPermitsYoY ?? 0,
    commercialPermitsYoY: s.commercialPermitsYoY ?? 0,
    permitTrend: s.permitTrend ?? "stable",
    housingStarts: s.housingStarts ?? 1000,
    housingStartsYoY: s.housingStartsYoY ?? 0,
    completions: s.completions ?? 900,
    completionsYoY: s.completionsYoY ?? 0,
    startsToCompletionRatio: s.startsToCompletionRatio ?? 1.1,
    avgConstructionTimeline: s.avgConstructionTimeline ?? 14,
    constructionCostIndex: s.constructionCostIndex ?? 100,
    constructionCostYoY: s.constructionCostYoY ?? 3,
    lumberPriceYoY: s.lumberPriceYoY ?? 0,
    laborAvailability: s.laborAvailability ?? "adequate",
    contractorBacklog: s.contractorBacklog ?? 5,
    entitledUnbuiltLots: s.entitledUnbuiltLots ?? 100,
    entitledUnbuiltTrend: s.entitledUnbuiltTrend ?? "stable",
    expiredPermits: s.expiredPermits ?? 5,
    demolitionPermits: s.demolitionPermits ?? 3,
    officeToResidentialConversions: s.officeToResidentialConversions ?? 1,
    multifamilyUnitsUnderConstruction: s.multifamilyUnitsUnderConstruction ?? 500,
    multifamilyDeliveryNext12mo: s.multifamilyDeliveryNext12mo ?? 300,
    multifamilyAbsorptionRate: s.multifamilyAbsorptionRate ?? 70,
  };
}

function buildDemandVelocityInput(input: ConfluenceOrchestratorInput): DemandVelocityInput {
  const d = input.demand ?? {};
  return {
    uspsInboundRatio: d.uspsInboundRatio ?? (input.market.popGrowth > 0 ? 1.0 + input.market.popGrowth * 0.1 : 0.9),
    irsMigrationNetHouseholds: d.irsMigrationNetHouseholds ?? Math.round(input.market.popGrowth * 500),
    irsMigrationNetIncome: d.irsMigrationNetIncome ?? Math.round(input.market.popGrowth * 50_000_000),
    migrationTrend: d.migrationTrend ?? (input.market.popGrowth > 1.5 ? "accelerating" : input.market.popGrowth > 0 ? "stable" : input.market.popGrowth > -1 ? "decelerating" : "reversing"),
    jobGrowthRate: input.market.jobGrowth,
    corporateRelocationJobs: d.corporateRelocationJobs ?? Math.round(input.market.jobGrowth * 10),
    h1bVisaApprovals: d.h1bVisaApprovals ?? 30,
    remoteWorkAdoption: d.remoteWorkAdoption ?? 15,
    googleTrendsIndex: d.googleTrendsIndex ?? 50,
    googleTrendsYoY: d.googleTrendsYoY ?? 0,
    listingViewsPerProperty: d.listingViewsPerProperty ?? 100,
    searchToListingRatio: d.searchToListingRatio ?? 10,
    householdFormationRate: d.householdFormationRate ?? 1.2,
    millennialShareOfBuyers: d.millennialShareOfBuyers ?? 30,
    firstTimeBuyerShare: d.firstTimeBuyerShare ?? 25,
    medianAge: d.medianAge ?? 34,
    utilityNewConnections: d.utilityNewConnections ?? 20,
    utilityConnectionsYoY: d.utilityConnectionsYoY ?? 0,
    kindergartenEnrollmentChange: d.kindergartenEnrollmentChange ?? 0,
    schoolCapacityUtilization: d.schoolCapacityUtilization ?? 80,
    investorPurchaseShare: d.investorPurchaseShare ?? 15,
    investorShareChange: d.investorShareChange ?? 0,
    exchange1031Inflows: d.exchange1031Inflows ?? 1_000_000,
    hmdaInvestorLoanGrowth: d.hmdaInvestorLoanGrowth ?? 0,
  };
}

function buildExitStrategyInput(input: ConfluenceOrchestratorInput): ExitStrategyInput {
  const e = input.exitStrategy ?? {};
  const prop = input.property;
  const price = prop?.askingPrice ?? input.market.medianPrice;
  const yearsHeld = e.yearsHeld ?? 0;
  const depBasis = e.depreciationBasis ?? price * 0.8; // exclude 20% land
  const annualDepr = e.annualDepreciation ?? depBasis / 27.5;
  return {
    purchasePrice: price,
    currentValue: prop?.impliedValue ?? price,
    yearsHeld,
    remainingLoanBalance: e.remainingLoanBalance ?? price * 0.75,
    monthlyEquityGain: e.monthlyEquityGain ?? 200,
    monthlyCashFlow: prop?.monthlyCashFlow ?? 300,
    depreciationBasis: depBasis,
    annualDepreciation: annualDepr,
    totalDepreciationTaken: e.totalDepreciationTaken ?? annualDepr * yearsHeld,
    marketCyclePosition: e.marketCyclePosition ?? (input.market.priceChange > 8 ? "late_cycle" : input.market.priceChange > 3 ? "expansion" : input.market.priceChange > -2 ? "early_recovery" : "contraction"),
    priceChangeYoY: input.market.priceChange,
    priceChangePrevYear: input.market.priceChange, // same as current when no prior data
    currentCapRate: prop?.capRate ?? input.market.capRate,
    capRateTrend: e.capRateTrend ?? "stable",
    capRateVsHistorical: e.capRateVsHistorical ?? 0,
    identificationDeadlineDays: 45,
    exchangeDeadlineDays: 180,
    replacementPropertyAvailable: e.replacementPropertyAvailable ?? false,
    currentRate: input.rates.mortgageRate30yr,
    marketRate: input.rates.mortgageRate30yr,
    estimatedRefiCashout: Math.round((prop?.impliedValue ?? price) * 0.15),
    capitalGainsTaxRate: e.capitalGainsTaxRate ?? 15,
    depreciationRecaptureRate: e.depreciationRecaptureRate ?? 25,
    stateIncomeTaxRate: e.stateIncomeTaxRate ?? 5,
  };
}

function buildMicroLocationInput(input: ConfluenceOrchestratorInput): MicroLocationInput {
  const m = input.microLocation ?? {};
  return {
    walkScore: m.walkScore ?? 50,
    transitScore: m.transitScore ?? 30,
    bikeScore: m.bikeScore ?? 40,
    avgSchoolRating: m.avgSchoolRating ?? 6,
    topSchoolRating: m.topSchoolRating ?? 7,
    schoolCount: m.schoolCount ?? 3,
    crimeIndex: m.crimeIndex ?? 35,
    violentCrimeRate: m.violentCrimeRate ?? 3,
    propertyCrimeRate: m.propertyCrimeRate ?? 20,
    crimeYoYChange: m.crimeYoYChange ?? 0,
    groceryMinutes: m.groceryMinutes ?? 8,
    hospitalMinutes: m.hospitalMinutes ?? 15,
    employmentCenterMinutes: m.employmentCenterMinutes ?? 25,
    airportMinutes: m.airportMinutes ?? 35,
    restaurantCount500m: m.restaurantCount500m ?? 5,
    floodZone: m.floodZone ?? false,
    floodZoneType: m.floodZoneType,
    wildfireRisk: m.wildfireRisk ?? "low",
    noiseLevel: m.noiseLevel ?? "moderate",
    newRestaurantsLast12mo: m.newRestaurantsLast12mo ?? 2,
    newBusinessesLast12mo: m.newBusinessesLast12mo ?? 4,
    medianHomeAgeYears: m.medianHomeAgeYears ?? 30,
    recentRenovationPermits: m.recentRenovationPermits ?? 5,
    artGalleriesOrBreweries: m.artGalleriesOrBreweries ?? 1,
  };
}

function buildFinancingInput(input: ConfluenceOrchestratorInput): FinancingInput {
  const f = input.financing ?? {};
  const prop = input.property;
  const price = prop?.askingPrice ?? input.market.medianPrice;
  const annualRent = price / 18;
  const monthlyRent = annualRent / 12;
  const existingProps = input.portfolio?.properties.length ?? 0;
  return {
    purchasePrice: price,
    estimatedRent: monthlyRent,
    propertyType: "sfr",
    creditScore: f.creditScore ?? 720,
    annualIncome: f.annualIncome ?? 100000,
    existingDebt: f.existingDebt ?? 2000,
    cashAvailable: f.cashAvailable ?? price * 0.3,
    existingProperties: existingProps,
    isVeteran: f.isVeteran ?? false,
    isFirstTimeBuyer: f.isFirstTimeBuyer ?? existingProps === 0,
    conventionalRate: f.conventionalRate ?? input.rates.mortgageRate30yr,
    fhaRate: f.fhaRate ?? input.rates.mortgageRate30yr - 0.25,
    vaRate: f.vaRate ?? input.rates.mortgageRate30yr - 0.5,
    dscrLoanRate: f.dscrLoanRate ?? input.rates.mortgageRate30yr + 1.0,
    hardMoneyRate: f.hardMoneyRate ?? 12,
    propertyCashFlow: prop?.monthlyCashFlow ?? Math.round(monthlyRent * 0.6),
  };
}

function buildTaxEfficiencyInput(input: ConfluenceOrchestratorInput): TaxEfficiencyInput {
  const t = input.tax ?? {};
  const prop = input.property;
  const price = prop?.askingPrice ?? input.market.medianPrice;
  const annualCashFlow = (prop?.monthlyCashFlow ?? 300) * 12;
  const annualAppreciation = price * (input.market.priceChange / 100);
  const holdPlanned = t.holdPeriodPlanned ?? 7;
  return {
    purchasePrice: price,
    landValuePct: t.landValuePct ?? 0.20,
    annualCashFlow,
    annualAppreciation,
    federalTaxBracket: t.federalTaxBracket ?? 24,
    stateIncomeTaxRate: t.stateIncomeTaxRate ?? 5,
    capitalGainsRate: t.capitalGainsRate ?? 15,
    filingStatus: t.filingStatus ?? "married",
    isREProfessional: t.isREProfessional ?? false,
    activeParticipation: t.activeParticipation ?? true,
    adjustedGrossIncome: t.adjustedGrossIncome ?? 120000,
    yearsHeld: input.exitStrategy?.yearsHeld ?? 0,
    costSegregationDone: t.costSegregationDone ?? false,
    holdPeriodPlanned: holdPlanned,
    expectedSalePrice: Math.round(price * Math.pow(1 + input.market.priceChange / 100, holdPlanned)),
    sellingCosts: t.sellingCosts ?? 0.06,
    will1031Exchange: t.will1031Exchange ?? false,
  };
}

function buildTransactionIntelligenceInput(input: ConfluenceOrchestratorInput): TransactionIntelligenceInput {
  const ti = input.transactionIntel ?? {};
  // Derive neutral defaults from market-level signals
  const isHot = input.market.daysOnMarket < 20 && input.market.priceChange > 5;
  const isCold = input.market.daysOnMarket > 60 && input.market.priceChange < -2;
  return {
    cashBuyerPct: ti.cashBuyerPct ?? 20,
    investorPurchasePct: ti.investorPurchasePct ?? 18,
    firstTimeBuyerPct: ti.firstTimeBuyerPct ?? 25,
    listToSaleRatio: ti.listToSaleRatio ?? (isHot ? 1.03 : isCold ? 0.95 : 1.00),
    avgOfferCount: ti.avgOfferCount ?? (isHot ? 4 : isCold ? 1.2 : 2),
    biddingWarPct: ti.biddingWarPct ?? (isHot ? 35 : isCold ? 5 : 15),
    aboveAskingPct: ti.aboveAskingPct ?? (isHot ? 30 : isCold ? 5 : 15),
    sellerConcessionPct: ti.sellerConcessionPct ?? (isCold ? 40 : isHot ? 5 : 20),
    avgConcessionAmount: ti.avgConcessionAmount ?? (isCold ? 8000 : isHot ? 0 : 3000),
    priceReductionPct: ti.priceReductionPct ?? (isCold ? 35 : isHot ? 8 : 20),
    avgPriceReduction: ti.avgPriceReduction ?? 5,
    expiredListingPct: ti.expiredListingPct ?? (isCold ? 12 : isHot ? 2 : 6),
    withdrawnListingPct: ti.withdrawnListingPct ?? (isCold ? 8 : isHot ? 2 : 4),
    daysToFirstOffer: ti.daysToFirstOffer ?? Math.round(input.market.daysOnMarket * 0.4),
    medianDOM: input.market.daysOnMarket,
    domTrend: ti.domTrend ?? "stable",
    pendingSalesYoY: ti.pendingSalesYoY ?? 0,
    closedSalesYoY: ti.closedSalesYoY ?? 0,
    monthsOfSupply: ti.monthsOfSupply ?? (input.market.inventory > 0 ? input.market.inventory : 4),
    newListingsYoY: ti.newListingsYoY ?? 0,
    absorptionRate: ti.absorptionRate ?? 50,
  };
}

export function runFullConfluence(input: ConfluenceOrchestratorInput): MasterConfluenceResult {
  // ── Original 5 engines (always run) ────────────────────────────
  const marketResult = computeMarketSelectionConfluence(buildMarketInput(input));
  const dealResult = computeDealQualityConfluence(buildDealInput(input));
  const timingResult = computeEntryTimingConfluence(buildTimingInput(input));
  const riskResult = computeRiskConfluence(buildRiskInput(input));
  const portfolioResult = computePortfolioOptimization(buildPortfolioInput(input));

  // ── Extended engines (always run with defaults when specific data unavailable) ──
  const rateTransmissionResult = computeRateTransmissionConfluence(buildRateTransmissionInput(input));
  const supplyPipelineResult = computeSupplyPipelineConfluence(buildSupplyPipelineInput(input));
  const demandVelocityResult = computeDemandVelocityConfluence(buildDemandVelocityInput(input));
  const exitStrategyResult = computeExitStrategyConfluence(buildExitStrategyInput(input));
  const microLocationResult = computeMicroLocationConfluence(buildMicroLocationInput(input));
  const financingResult = computeFinancingConfluence(buildFinancingInput(input));
  const taxEfficiencyResult = computeTaxEfficiencyConfluence(buildTaxEfficiencyInput(input));
  const transactionIntelligenceResult = computeTransactionIntelligence(buildTransactionIntelligenceInput(input));

  return computeMasterConfluence({
    market: marketResult,
    deal: dealResult,
    timing: timingResult,
    risk: riskResult,
    portfolio: portfolioResult,
    rateTransmission: rateTransmissionResult,
    supplyPipeline: supplyPipelineResult,
    demandVelocity: demandVelocityResult,
    exitStrategy: exitStrategyResult,
    microLocation: microLocationResult,
    financing: financingResult,
    taxEfficiency: taxEfficiencyResult,
    transactionIntelligence: transactionIntelligenceResult,
  });
}
