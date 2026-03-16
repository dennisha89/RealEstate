// ============================================================
// Capital Migration Tracker
// Tracks where investment capital is moving between markets:
// 1031 exchanges, HMDA mortgage data, foreign capital (FIRPTA),
// crowdfunding flows, and tax migration patterns.
//
// ============================================================
// BACKTEST WARNING — 2026-03-16
// ============================================================
// The IRS SOI AGI migration data (TaxMigrationPatterns) was backtested
// against FHFA HPI (2010-2022, 51 states).
//
// Result: rho = 0.011, p = 0.66
//
// This signal does NOT predict house price appreciation. The IRS migration
// data shows where people are moving and how much income is relocating,
// but this has essentially ZERO correlation with subsequent home price
// changes at the state level.
//
// USE FOR INFORMATIONAL DISPLAY ONLY:
//   - "Where are high-income households moving?" — valid use case
//   - "Where will home prices appreciate?" — INVALID use case
//
// The scoreCapitalMigration() function in this file has been adjusted
// to reduce the weight of tax migration signals from +/-15 to +/-5.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface CapitalMigrationProfile {
  zipCode: string;
  exchange1031Flows: Exchange1031Flows;
  hmdaMortgageIntel: HMDAMortgageIntel;
  foreignCapitalFlows: ForeignCapitalFlows;
  taxMigrationPatterns: TaxMigrationPatterns;
  capitalOriginMap: CapitalOriginEntry[];
  netCapitalMigrationScore: number; // 0-100
  capitalMigrationSignals: string[];
}

/** 1031 Exchange flow tracking */
export interface Exchange1031Flows {
  // Where exchange capital is flowing FROM into this market
  inboundExchangeVolume: TrendMetric; // $ flowing IN via 1031
  outboundExchangeVolume: TrendMetric; // $ flowing OUT via 1031
  netExchangeFlow: number; // positive = capital flowing in
  topOriginMarkets: { market: string; volume: number; dealCount: number }[];
  topDestinationMarkets: { market: string; volume: number; dealCount: number }[];
  avgExchangePropertyValue: number;
  exchangeAsPercentOfSales: TrendMetric; // % of total sales that are 1031 exchanges
  deferredGainsEstimate: number; // total deferred capital gains in market
  // Signal: heavy 1031 inflow = sophisticated investors choosing this market
}

/** HMDA Mortgage Intelligence */
export interface HMDAMortgageIntel {
  totalApplications: TrendMetric;
  approvalRate: TrendMetric;
  avgLoanAmount: TrendMetric;
  avgApplicantIncome: TrendMetric;
  avgLoanToValueRatio: TrendMetric;

  // Investor vs owner-occupant split
  investorLoanPct: TrendMetric; // non-owner-occupied loans
  ownerOccupantPct: TrendMetric;

  // Denial analysis (signals market health)
  denialRate: TrendMetric;
  topDenialReasons: {
    reason: string; // "debt_to_income", "credit_history", "collateral", "employment"
    pct: number;
    trend: "increasing" | "stable" | "decreasing";
  }[];

  // Lender activity
  activeLenders: number;
  topLenders: { name: string; marketShare: number; avgRate: number }[];
  nonBankLenderPct: TrendMetric; // fintech/non-bank share (growing = accessibility)

  // Loan type mix
  conventionalPct: number;
  fhaPct: number;
  vaPct: number;
  jumboLoanPct: TrendMetric; // high jumbo % = wealthy buyers

  // Refinance vs purchase
  purchasePct: TrendMetric;
  refinancePct: TrendMetric;
  cashOutRefiPct: TrendMetric; // homeowners extracting equity

  // Racial/ethnic lending patterns (fair housing + gentrification)
  applicantDemographicShifts: {
    demographic: string;
    applicationPctChange: number; // YoY change in % of applications
    approvalRateChange: number;
  }[];
}

/** Foreign capital tracking */
export interface ForeignCapitalFlows {
  foreignBuyerPct: TrendMetric; // % of sales to foreign buyers
  totalForeignVolume: TrendMetric; // $
  topOriginCountries: { country: string; volume: number; pctOfForeignTotal: number; trend: string }[];
  firptaWithholdings: TrendMetric; // FIRPTA withholding volume (selling)
  foreignBuyerPropertyTypes: { type: string; pct: number }[];
  avgForeignPurchasePrice: TrendMetric;
  foreignVsDomesticPremium: number; // % that foreign buyers pay above market
  cashPurchasePctForeign: number; // most foreign purchases are cash
  visaBuyerCorrelation: {
    visaType: string; // "EB-5", "H-1B", "L-1", "student"
    buyerPct: number;
    trend: string;
  }[];
  currencyImpact: {
    currency: string;
    exchangeRateTrend: string; // "strengthening" = more buying power
    estimatedImpact: string;
  }[];
}

/**
 * Tax migration patterns (IRS SOI data).
 *
 * NOTE: IRS AGI migration was backtested against FHFA HPI (2010-2022, 51 states).
 * Result: rho=0.011, p=0.66. This signal does NOT predict house price appreciation.
 * Use for informational display only, not for scoring/prediction.
 */
export interface TaxMigrationPatterns {
  netDomesticMigration: TrendMetric; // returns: positive = net inflow
  avgIncomeMigrants: TrendMetric; // avg AGI of people moving in vs out
  incomeInflowTotal: TrendMetric; // total AGI flowing in via migration
  incomeOutflowTotal: TrendMetric;
  netIncomeFlow: number; // positive = wealth flowing in
  topInflowOrigins: {
    county: string;
    state: string;
    returnCount: number;
    avgAGI: number;
    totalAGI: number;
  }[];
  topOutflowDestinations: {
    county: string;
    state: string;
    returnCount: number;
    avgAGI: number;
    totalAGI: number;
  }[];
  wealthMigrationTrend: "wealth_influx" | "stable" | "wealth_exodus";
  stateIncomeTaxArbitrage: {
    fromState: string;
    toState: string;
    taxSavings: number; // estimated annual savings per household
    migrationVolume: number;
  }[];
}

/** Where is capital coming from? */
export interface CapitalOriginEntry {
  source: string; // "California 1031", "Foreign Chinese", "NYC REIT", etc.
  type: "domestic_exchange" | "foreign" | "institutional" | "migration" | "government";
  volume: number;
  pctOfTotal: number;
  trend: "increasing" | "stable" | "decreasing";
  avgTicketSize: number;
}

// --- Analysis Functions ---

/**
 * Build capital migration profile from raw data
 */
export function analyzeCapitalMigration(
  exchange1031: Raw1031Data,
  hmda: RawHMDAData,
  foreign: RawForeignCapitalData,
  migration: RawMigrationData
): CapitalMigrationProfile {
  const exchange1031Flows = analyze1031Flows(exchange1031);
  const hmdaIntel = analyzeHMDA(hmda);
  const foreignFlows = analyzeForeignCapital(foreign);
  const taxMigration = analyzeTaxMigration(migration);

  const capitalOriginMap = buildCapitalOriginMap(exchange1031Flows, foreignFlows, taxMigration);
  const signals = generateMigrationSignals(exchange1031Flows, hmdaIntel, foreignFlows, taxMigration);
  const score = scoreCapitalMigration(exchange1031Flows, hmdaIntel, foreignFlows, taxMigration);

  return {
    zipCode: exchange1031.zipCode,
    exchange1031Flows,
    hmdaMortgageIntel: hmdaIntel,
    foreignCapitalFlows: foreignFlows,
    taxMigrationPatterns: taxMigration,
    capitalOriginMap,
    netCapitalMigrationScore: score,
    capitalMigrationSignals: signals,
  };
}

function analyze1031Flows(data: Raw1031Data): Exchange1031Flows {
  return {
    inboundExchangeVolume: buildTrendMetric(data.inbound.current, data.inbound.oneYearAgo, data.inbound.threeYearAgo, data.inbound.fiveYearAgo),
    outboundExchangeVolume: buildTrendMetric(data.outbound.current, data.outbound.oneYearAgo, data.outbound.threeYearAgo, data.outbound.fiveYearAgo),
    netExchangeFlow: data.inbound.current - data.outbound.current,
    topOriginMarkets: data.topOrigins,
    topDestinationMarkets: data.topDestinations,
    avgExchangePropertyValue: data.avgPropertyValue,
    exchangeAsPercentOfSales: buildTrendMetric(data.exchangePct.current, data.exchangePct.oneYearAgo, data.exchangePct.threeYearAgo, data.exchangePct.fiveYearAgo),
    deferredGainsEstimate: data.deferredGains,
  };
}

function analyzeHMDA(data: RawHMDAData): HMDAMortgageIntel {
  return {
    totalApplications: buildTrendMetric(data.applications.current, data.applications.oneYearAgo, data.applications.threeYearAgo, data.applications.fiveYearAgo),
    approvalRate: buildTrendMetric(data.approvalRate.current, data.approvalRate.oneYearAgo, data.approvalRate.threeYearAgo, data.approvalRate.fiveYearAgo),
    avgLoanAmount: buildTrendMetric(data.avgLoan.current, data.avgLoan.oneYearAgo, data.avgLoan.threeYearAgo, data.avgLoan.fiveYearAgo),
    avgApplicantIncome: buildTrendMetric(data.avgIncome.current, data.avgIncome.oneYearAgo, data.avgIncome.threeYearAgo, data.avgIncome.fiveYearAgo),
    avgLoanToValueRatio: buildTrendMetric(data.avgLTV.current, data.avgLTV.oneYearAgo, data.avgLTV.threeYearAgo, data.avgLTV.fiveYearAgo),
    investorLoanPct: buildTrendMetric(data.investorPct.current, data.investorPct.oneYearAgo, data.investorPct.threeYearAgo, data.investorPct.fiveYearAgo),
    ownerOccupantPct: buildTrendMetric(100 - data.investorPct.current, 100 - data.investorPct.oneYearAgo, 100 - data.investorPct.threeYearAgo, 100 - data.investorPct.fiveYearAgo),
    denialRate: buildTrendMetric(data.denialRate.current, data.denialRate.oneYearAgo, data.denialRate.threeYearAgo, data.denialRate.fiveYearAgo),
    topDenialReasons: data.denialReasons,
    activeLenders: data.activeLenders,
    topLenders: data.topLenders,
    nonBankLenderPct: buildTrendMetric(data.nonBankPct.current, data.nonBankPct.oneYearAgo, data.nonBankPct.threeYearAgo, data.nonBankPct.fiveYearAgo),
    conventionalPct: data.conventionalPct,
    fhaPct: data.fhaPct,
    vaPct: data.vaPct,
    jumboLoanPct: buildTrendMetric(data.jumboPct.current, data.jumboPct.oneYearAgo, data.jumboPct.threeYearAgo, data.jumboPct.fiveYearAgo),
    purchasePct: buildTrendMetric(data.purchasePct.current, data.purchasePct.oneYearAgo, data.purchasePct.threeYearAgo, data.purchasePct.fiveYearAgo),
    refinancePct: buildTrendMetric(data.refiPct.current, data.refiPct.oneYearAgo, data.refiPct.threeYearAgo, data.refiPct.fiveYearAgo),
    cashOutRefiPct: buildTrendMetric(data.cashOutRefiPct.current, data.cashOutRefiPct.oneYearAgo, data.cashOutRefiPct.threeYearAgo, data.cashOutRefiPct.fiveYearAgo),
    applicantDemographicShifts: data.demographicShifts,
  };
}

function analyzeForeignCapital(data: RawForeignCapitalData): ForeignCapitalFlows {
  return {
    foreignBuyerPct: buildTrendMetric(data.foreignPct.current, data.foreignPct.oneYearAgo, data.foreignPct.threeYearAgo, data.foreignPct.fiveYearAgo),
    totalForeignVolume: buildTrendMetric(data.foreignVolume.current, data.foreignVolume.oneYearAgo, data.foreignVolume.threeYearAgo, data.foreignVolume.fiveYearAgo),
    topOriginCountries: data.topCountries,
    firptaWithholdings: buildTrendMetric(data.firpta.current, data.firpta.oneYearAgo, data.firpta.threeYearAgo, data.firpta.fiveYearAgo),
    foreignBuyerPropertyTypes: data.propertyTypes,
    avgForeignPurchasePrice: buildTrendMetric(data.avgForeignPrice.current, data.avgForeignPrice.oneYearAgo, data.avgForeignPrice.threeYearAgo, data.avgForeignPrice.fiveYearAgo),
    foreignVsDomesticPremium: data.premiumPct,
    cashPurchasePctForeign: data.cashPctForeign,
    visaBuyerCorrelation: data.visaCorrelation,
    currencyImpact: data.currencyImpact,
  };
}

function analyzeTaxMigration(data: RawMigrationData): TaxMigrationPatterns {
  const netIncome = data.incomeInflow.current - data.incomeOutflow.current;
  let wealthTrend: TaxMigrationPatterns["wealthMigrationTrend"] = "stable";
  if (netIncome > 100_000_000) wealthTrend = "wealth_influx";
  else if (netIncome < -100_000_000) wealthTrend = "wealth_exodus";

  return {
    netDomesticMigration: buildTrendMetric(data.netMigration.current, data.netMigration.oneYearAgo, data.netMigration.threeYearAgo, data.netMigration.fiveYearAgo),
    avgIncomeMigrants: buildTrendMetric(data.avgIncome.current, data.avgIncome.oneYearAgo, data.avgIncome.threeYearAgo, data.avgIncome.fiveYearAgo),
    incomeInflowTotal: buildTrendMetric(data.incomeInflow.current, data.incomeInflow.oneYearAgo, data.incomeInflow.threeYearAgo, data.incomeInflow.fiveYearAgo),
    incomeOutflowTotal: buildTrendMetric(data.incomeOutflow.current, data.incomeOutflow.oneYearAgo, data.incomeOutflow.threeYearAgo, data.incomeOutflow.fiveYearAgo),
    netIncomeFlow: netIncome,
    topInflowOrigins: data.topInflows,
    topOutflowDestinations: data.topOutflows,
    wealthMigrationTrend: wealthTrend,
    stateIncomeTaxArbitrage: data.taxArbitrage,
  };
}

function buildCapitalOriginMap(
  exchange: Exchange1031Flows,
  foreign: ForeignCapitalFlows,
  migration: TaxMigrationPatterns
): CapitalOriginEntry[] {
  const entries: CapitalOriginEntry[] = [];

  // 1031 exchange capital
  for (const origin of exchange.topOriginMarkets.slice(0, 5)) {
    entries.push({
      source: `1031 Exchange from ${origin.market}`,
      type: "domestic_exchange",
      volume: origin.volume,
      pctOfTotal: 0, // calculated after all entries
      trend: "increasing",
      avgTicketSize: origin.volume / Math.max(origin.dealCount, 1),
    });
  }

  // Foreign capital
  for (const country of foreign.topOriginCountries.slice(0, 5)) {
    entries.push({
      source: `Foreign: ${country.country}`,
      type: "foreign",
      volume: country.volume,
      pctOfTotal: 0,
      trend: country.trend as "increasing" | "stable" | "decreasing",
      avgTicketSize: foreign.avgForeignPurchasePrice.current,
    });
  }

  // Tax migration
  for (const origin of migration.topInflowOrigins.slice(0, 5)) {
    entries.push({
      source: `Migration from ${origin.county}, ${origin.state}`,
      type: "migration",
      volume: origin.totalAGI,
      pctOfTotal: 0,
      trend: "increasing",
      avgTicketSize: origin.avgAGI,
    });
  }

  // Calculate percentages
  const total = entries.reduce((s, e) => s + e.volume, 0);
  for (const entry of entries) {
    entry.pctOfTotal = total > 0 ? Math.round((entry.volume / total) * 1000) / 10 : 0;
  }

  return entries.sort((a, b) => b.volume - a.volume);
}

function generateMigrationSignals(
  exchange: Exchange1031Flows,
  hmda: HMDAMortgageIntel,
  foreign: ForeignCapitalFlows,
  migration: TaxMigrationPatterns
): string[] {
  const signals: string[] = [];

  if (exchange.netExchangeFlow > 0) {
    signals.push(`Net $${(exchange.netExchangeFlow / 1_000_000).toFixed(1)}M flowing IN via 1031 exchanges — experienced investors choosing this market`);
  }
  if (hmda.investorLoanPct.trend === "accelerating") {
    signals.push(`Investor mortgage applications accelerating (${hmda.investorLoanPct.current.toFixed(1)}% of total) — institutional demand growing`);
  }
  if (hmda.jumboLoanPct.trend === "accelerating") {
    signals.push(`Jumbo loan share rising — wealthier buyers entering market`);
  }
  if (hmda.cashOutRefiPct.current > 30) {
    signals.push(`${hmda.cashOutRefiPct.current.toFixed(0)}% of refis are cash-out — homeowners extracting equity (confidence signal or overleverage risk)`);
  }
  if (foreign.foreignBuyerPct.trend === "accelerating") {
    signals.push(`Foreign buyer share accelerating (${foreign.foreignBuyerPct.current.toFixed(1)}% of sales) — international capital influx`);
  }
  if (migration.wealthMigrationTrend === "wealth_influx") {
    signals.push(`Net wealth influx: $${(migration.netIncomeFlow / 1_000_000).toFixed(0)}M in AGI flowing in via domestic migration`);
  }
  if (migration.wealthMigrationTrend === "wealth_exodus") {
    signals.push(`WARNING: Net wealth outflow of $${(Math.abs(migration.netIncomeFlow) / 1_000_000).toFixed(0)}M — high-income households leaving`);
  }
  if (hmda.denialRate.trend === "accelerating") {
    signals.push(`Mortgage denial rates rising — buyer pool may be shrinking`);
  }

  return signals;
}

function scoreCapitalMigration(
  exchange: Exchange1031Flows,
  hmda: HMDAMortgageIntel,
  foreign: ForeignCapitalFlows,
  migration: TaxMigrationPatterns
): number {
  let score = 50;

  // 1031 net inflow
  if (exchange.netExchangeFlow > 0) score += 10;
  if (exchange.exchangeAsPercentOfSales.trend === "accelerating") score += 5;

  // HMDA signals
  if (hmda.approvalRate.trend === "accelerating") score += 5;
  if (hmda.avgApplicantIncome.trend === "accelerating") score += 8;
  if (hmda.investorLoanPct.trend === "accelerating") score += 5;
  if (hmda.denialRate.trend === "accelerating") score -= 10;

  // Foreign capital
  if (foreign.foreignBuyerPct.current > 5 && foreign.foreignBuyerPct.trend === "accelerating") score += 8;

  // Tax migration (IRS AGI)
  // BACKTEST 2026-03-16: IRS AGI migration showed rho=0.011 (p=0.66) against FHFA HPI.
  // No predictive power for house price appreciation. Weight reduced from +/-15 to +/-5.
  // Retained as informational context (where people are moving), not as a price predictor.
  if (migration.wealthMigrationTrend === "wealth_influx") score += 5;
  else if (migration.wealthMigrationTrend === "wealth_exodus") score -= 5;

  return Math.max(0, Math.min(100, score));
}

// --- Raw data input types ---

export interface Raw1031Data {
  zipCode: string;
  inbound: TimeSeriesData;
  outbound: TimeSeriesData;
  topOrigins: { market: string; volume: number; dealCount: number }[];
  topDestinations: { market: string; volume: number; dealCount: number }[];
  avgPropertyValue: number;
  exchangePct: TimeSeriesData;
  deferredGains: number;
}

export interface RawHMDAData {
  applications: TimeSeriesData;
  approvalRate: TimeSeriesData;
  avgLoan: TimeSeriesData;
  avgIncome: TimeSeriesData;
  avgLTV: TimeSeriesData;
  investorPct: TimeSeriesData;
  denialRate: TimeSeriesData;
  denialReasons: { reason: string; pct: number; trend: "increasing" | "stable" | "decreasing" }[];
  activeLenders: number;
  topLenders: { name: string; marketShare: number; avgRate: number }[];
  nonBankPct: TimeSeriesData;
  conventionalPct: number;
  fhaPct: number;
  vaPct: number;
  jumboPct: TimeSeriesData;
  purchasePct: TimeSeriesData;
  refiPct: TimeSeriesData;
  cashOutRefiPct: TimeSeriesData;
  demographicShifts: { demographic: string; applicationPctChange: number; approvalRateChange: number }[];
}

export interface RawForeignCapitalData {
  foreignPct: TimeSeriesData;
  foreignVolume: TimeSeriesData;
  topCountries: { country: string; volume: number; pctOfForeignTotal: number; trend: string }[];
  firpta: TimeSeriesData;
  propertyTypes: { type: string; pct: number }[];
  avgForeignPrice: TimeSeriesData;
  premiumPct: number;
  cashPctForeign: number;
  visaCorrelation: { visaType: string; buyerPct: number; trend: string }[];
  currencyImpact: { currency: string; exchangeRateTrend: string; estimatedImpact: string }[];
}

export interface RawMigrationData {
  netMigration: TimeSeriesData;
  avgIncome: TimeSeriesData;
  incomeInflow: TimeSeriesData;
  incomeOutflow: TimeSeriesData;
  topInflows: { county: string; state: string; returnCount: number; avgAGI: number; totalAGI: number }[];
  topOutflows: { county: string; state: string; returnCount: number; avgAGI: number; totalAGI: number }[];
  taxArbitrage: { fromState: string; toState: string; taxSavings: number; migrationVolume: number }[];
}
