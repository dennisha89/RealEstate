// ============================================================
// Microeconomics Engine
// Tracks granular capital flows, money movement, and
// micro-level economic indicators at zip/neighborhood level
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, calculateCAGR, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface MicroeconomicProfile {
  zipCode: string;
  capitalFlows: CapitalFlows;
  businessActivity: BusinessActivity;
  constructionActivity: ConstructionActivity;
  consumerSpending: ConsumerSpending;
  creditMarket: CreditMarket;
  laborMicroMetrics: LaborMicroMetrics;
  housingMicroMetrics: HousingMicroMetrics;
  wealthIndicators: WealthIndicators;
  moneyVelocityScore: number; // 0-100: how fast money is moving through this market
}

/** Where capital is flowing in/out */
export interface CapitalFlows {
  // Investment capital
  foreignDirectInvestment: TrendMetric; // FDI into the area
  ventureCapitalDeals: TrendMetric; // VC/startup funding activity
  commercialREInvestment: TrendMetric; // CRE capital deployed
  residentialREInvestment: TrendMetric; // Total residential transaction volume

  // Bank lending
  mortgageOriginationVolume: TrendMetric; // $ of new mortgages originated
  sbaLoanVolume: TrendMetric; // Small Business Administration loans
  commercialLoanVolume: TrendMetric;

  // Government spending
  federalGrantsReceived: TrendMetric; // Federal grants flowing into area
  stateInfrastructureSpending: TrendMetric;
  municipalBondIssuance: TrendMetric;

  // Tax revenue (proxy for economic activity)
  salesTaxRevenue: TrendMetric;
  propertyTaxRevenue: TrendMetric;
  incomeTaxRevenue: TrendMetric;

  // Net capital flow direction
  netCapitalFlowDirection: "strong_inflow" | "inflow" | "neutral" | "outflow" | "strong_outflow";
  capitalFlowScore: number; // 0-100
}

/** Business creation/destruction signals */
export interface BusinessActivity {
  newBusinessFormations: TrendMetric; // LLC/Corp filings
  businessDissolutions: TrendMetric;
  netNewBusinesses: number;
  businessLicenseApplications: TrendMetric;
  commercialLeaseAbsorption: TrendMetric; // sq ft leased
  commercialVacancyRate: TrendMetric;
  retailStoreOpenings: number;
  retailStoreClosings: number;
  restaurantOpenings: number;
  restaurantClosings: number;
  franchiseExpansions: { brand: string; type: string; count: number }[];
  coworkingSpaceGrowth: TrendMetric;
}

/** Construction and development pipeline */
export interface ConstructionActivity {
  residentialPermitsValue: TrendMetric; // $ value of residential permits
  commercialPermitsValue: TrendMetric;
  demolitionPermits: TrendMetric;
  renovationPermits: TrendMetric;
  activeConstructionProjects: number;
  constructionEmployment: TrendMetric;
  concreteAndSteelOrders: TrendMetric; // leading indicator
  architecturalBillingsIndex: number; // leading indicator (>50 = growth)
  avgConstructionTimeline: number; // months
  constructionCostIndex: TrendMetric;
}

/** Consumer spending patterns */
export interface ConsumerSpending {
  retailSalesPerCapita: TrendMetric;
  restaurantSpendingPerCapita: TrendMetric;
  grocerySpendingIndex: TrendMetric; // 100 = national avg
  luxuryRetailPresence: number; // count of luxury brands
  ecommerceDeliveryDensity: TrendMetric; // packages per household
  autoSalesRegistrations: TrendMetric; // new car registrations
  avgNewCarPrice: TrendMetric; // wealth signal
  discretionarySpendingRatio: number; // % income on non-essentials
}

/** Local credit and lending */
export interface CreditMarket {
  avgCreditScore: TrendMetric;
  mortgageApprovalRate: TrendMetric;
  mortgageDelinquencyRate: TrendMetric;
  foreclosureRate: TrendMetric;
  avgDebtToIncomeRatio: TrendMetric;
  refinanceVolume: TrendMetric;
  helocOriginations: TrendMetric; // home equity line of credit
  avgMortgageAmount: TrendMetric;
  cashBuyerPercentage: TrendMetric; // high = investor activity
}

/** Granular labor market */
export interface LaborMicroMetrics {
  jobPostingsCount: TrendMetric; // Indeed/LinkedIn postings
  avgSalaryPosted: TrendMetric;
  techJobPostings: TrendMetric;
  healthcareJobPostings: TrendMetric;
  constructionJobPostings: TrendMetric;
  remoteWorkPercentage: TrendMetric;
  commuteTimeAvg: TrendMetric; // minutes
  commutePatterns: {
    driveAlone: number;
    publicTransit: number;
    workFromHome: number;
    walk: number;
    other: number;
  };
  giniCoefficient: TrendMetric; // income inequality (0-1)
  underemploymentRate: TrendMetric;
  laborForceParticipation: TrendMetric;
}

/** Granular housing market */
export interface HousingMicroMetrics {
  medianPriceByBedroom: {
    oneBed: TrendMetric;
    twoBed: TrendMetric;
    threeBed: TrendMetric;
    fourPlusBed: TrendMetric;
  };
  pricePerSqftByAge: {
    newConstruction: TrendMetric; // built within 5 years
    midAge: TrendMetric; // 5-20 years
    older: TrendMetric; // 20+ years
  };
  flipActivity: {
    flipsCompleted: TrendMetric;
    avgFlipProfit: TrendMetric;
    avgFlipTimeline: number; // days
  };
  investorPurchasePercentage: TrendMetric; // % of sales to investors
  firstTimeBuyerPercentage: TrendMetric;
  cashOfferPercentage: TrendMetric;
  priceReductionPercentage: TrendMetric; // % of listings with price cuts
  avgPriceReductionAmount: TrendMetric;
  expiredListingsPercentage: TrendMetric;
  newListingsVsPendingSales: TrendMetric; // ratio
  shadowInventory: number; // pre-foreclosure + REO not yet listed
}

/** Wealth and prosperity indicators */
export interface WealthIndicators {
  medianNetWorth: TrendMetric;
  savingsRate: TrendMetric;
  bankruptcyFilings: TrendMetric;
  charitableDonationsPerCapita: TrendMetric;
  privateSchoolEnrollmentPct: TrendMetric;
  countryClubMemberships: TrendMetric; // per capita
  boatRegistrations: TrendMetric; // per capita (wealth proxy)
  avgHomeSalePrice: TrendMetric;
  millionDollarHomesPct: TrendMetric; // % of homes worth $1M+
  luxuryCarRegistrations: TrendMetric;
}

// --- Analysis Functions ---

/**
 * Calculate money velocity score: how fast capital is moving through the market
 * High velocity = active, growing economy. Low = stagnant.
 */
export function calculateMoneyVelocityScore(
  capitalFlows: CapitalFlows,
  businessActivity: BusinessActivity,
  construction: ConstructionActivity,
  spending: ConsumerSpending
): number {
  let score = 50;

  // Capital inflows
  if (capitalFlows.netCapitalFlowDirection === "strong_inflow") score += 20;
  else if (capitalFlows.netCapitalFlowDirection === "inflow") score += 10;
  else if (capitalFlows.netCapitalFlowDirection === "outflow") score -= 10;
  else if (capitalFlows.netCapitalFlowDirection === "strong_outflow") score -= 20;

  // Business creation vs destruction
  if (businessActivity.netNewBusinesses > 50) score += 10;
  else if (businessActivity.netNewBusinesses > 0) score += 5;
  else if (businessActivity.netNewBusinesses < -20) score -= 10;

  // Construction activity (leading indicator)
  if (construction.architecturalBillingsIndex > 55) score += 10;
  else if (construction.architecturalBillingsIndex < 45) score -= 10;

  // Consumer spending momentum
  if (spending.retailSalesPerCapita.trend === "accelerating") score += 5;
  if (spending.restaurantSpendingPerCapita.trend === "accelerating") score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine net capital flow direction from individual flow metrics
 */
export function determineCapitalFlowDirection(
  flows: Omit<CapitalFlows, "netCapitalFlowDirection" | "capitalFlowScore">
): { direction: CapitalFlows["netCapitalFlowDirection"]; score: number } {
  let inflowSignals = 0;
  let outflowSignals = 0;

  // Count accelerating inflows
  const inflowMetrics = [
    flows.mortgageOriginationVolume,
    flows.sbaLoanVolume,
    flows.ventureCapitalDeals,
    flows.commercialREInvestment,
    flows.residentialREInvestment,
    flows.federalGrantsReceived,
    flows.stateInfrastructureSpending,
  ];

  for (const metric of inflowMetrics) {
    if (metric.trend === "accelerating") inflowSignals += 2;
    else if (metric.trend === "stable" && metric.oneYearChange > 0) inflowSignals += 1;
    else if (metric.trend === "declining") outflowSignals += 2;
    else if (metric.trend === "decelerating") outflowSignals += 1;
  }

  // Tax revenue as confirmation signal
  const taxMetrics = [flows.salesTaxRevenue, flows.propertyTaxRevenue, flows.incomeTaxRevenue];
  for (const metric of taxMetrics) {
    if (metric.oneYearChange > 5) inflowSignals += 1;
    else if (metric.oneYearChange < -2) outflowSignals += 1;
  }

  const netSignal = inflowSignals - outflowSignals;
  const score = Math.max(0, Math.min(100, 50 + netSignal * 5));

  let direction: CapitalFlows["netCapitalFlowDirection"];
  if (netSignal > 8) direction = "strong_inflow";
  else if (netSignal > 3) direction = "inflow";
  else if (netSignal < -8) direction = "strong_outflow";
  else if (netSignal < -3) direction = "outflow";
  else direction = "neutral";

  return { direction, score };
}

/**
 * Analyze full microeconomic profile for a zip code
 */
export function analyzeMicroeconomics(data: RawMicroeconomicData): MicroeconomicProfile {
  // Build capital flows
  const capitalFlowsPartial = {
    foreignDirectInvestment: buildTrendMetric(data.fdi.current, data.fdi.oneYearAgo, data.fdi.threeYearAgo, data.fdi.fiveYearAgo),
    ventureCapitalDeals: buildTrendMetric(data.vcDeals.current, data.vcDeals.oneYearAgo, data.vcDeals.threeYearAgo, data.vcDeals.fiveYearAgo),
    commercialREInvestment: buildTrendMetric(data.creInvestment.current, data.creInvestment.oneYearAgo, data.creInvestment.threeYearAgo, data.creInvestment.fiveYearAgo),
    residentialREInvestment: buildTrendMetric(data.rreInvestment.current, data.rreInvestment.oneYearAgo, data.rreInvestment.threeYearAgo, data.rreInvestment.fiveYearAgo),
    mortgageOriginationVolume: buildTrendMetric(data.mortgageOrigination.current, data.mortgageOrigination.oneYearAgo, data.mortgageOrigination.threeYearAgo, data.mortgageOrigination.fiveYearAgo),
    sbaLoanVolume: buildTrendMetric(data.sbaLoans.current, data.sbaLoans.oneYearAgo, data.sbaLoans.threeYearAgo, data.sbaLoans.fiveYearAgo),
    commercialLoanVolume: buildTrendMetric(data.commercialLoans.current, data.commercialLoans.oneYearAgo, data.commercialLoans.threeYearAgo, data.commercialLoans.fiveYearAgo),
    federalGrantsReceived: buildTrendMetric(data.federalGrants.current, data.federalGrants.oneYearAgo, data.federalGrants.threeYearAgo, data.federalGrants.fiveYearAgo),
    stateInfrastructureSpending: buildTrendMetric(data.stateSpending.current, data.stateSpending.oneYearAgo, data.stateSpending.threeYearAgo, data.stateSpending.fiveYearAgo),
    municipalBondIssuance: buildTrendMetric(data.muniBonds.current, data.muniBonds.oneYearAgo, data.muniBonds.threeYearAgo, data.muniBonds.fiveYearAgo),
    salesTaxRevenue: buildTrendMetric(data.salesTax.current, data.salesTax.oneYearAgo, data.salesTax.threeYearAgo, data.salesTax.fiveYearAgo),
    propertyTaxRevenue: buildTrendMetric(data.propertyTaxRev.current, data.propertyTaxRev.oneYearAgo, data.propertyTaxRev.threeYearAgo, data.propertyTaxRev.fiveYearAgo),
    incomeTaxRevenue: buildTrendMetric(data.incomeTaxRev.current, data.incomeTaxRev.oneYearAgo, data.incomeTaxRev.threeYearAgo, data.incomeTaxRev.fiveYearAgo),
  };

  const { direction, score: capitalScore } = determineCapitalFlowDirection(capitalFlowsPartial);

  const capitalFlows: CapitalFlows = {
    ...capitalFlowsPartial,
    netCapitalFlowDirection: direction,
    capitalFlowScore: capitalScore,
  };

  // Business activity
  const businessActivity: BusinessActivity = {
    newBusinessFormations: buildTrendMetric(data.newBusinesses.current, data.newBusinesses.oneYearAgo, data.newBusinesses.threeYearAgo, data.newBusinesses.fiveYearAgo),
    businessDissolutions: buildTrendMetric(data.closedBusinesses.current, data.closedBusinesses.oneYearAgo, data.closedBusinesses.threeYearAgo, data.closedBusinesses.fiveYearAgo),
    netNewBusinesses: data.newBusinesses.current - data.closedBusinesses.current,
    businessLicenseApplications: buildTrendMetric(data.bizLicenses.current, data.bizLicenses.oneYearAgo, data.bizLicenses.threeYearAgo, data.bizLicenses.fiveYearAgo),
    commercialLeaseAbsorption: buildTrendMetric(data.leaseAbsorption.current, data.leaseAbsorption.oneYearAgo, data.leaseAbsorption.threeYearAgo, data.leaseAbsorption.fiveYearAgo),
    commercialVacancyRate: buildTrendMetric(data.commVacancy.current, data.commVacancy.oneYearAgo, data.commVacancy.threeYearAgo, data.commVacancy.fiveYearAgo),
    retailStoreOpenings: data.retailOpenings,
    retailStoreClosings: data.retailClosings,
    restaurantOpenings: data.restaurantOpenings,
    restaurantClosings: data.restaurantClosings,
    franchiseExpansions: data.franchiseExpansions,
    coworkingSpaceGrowth: buildTrendMetric(data.coworking.current, data.coworking.oneYearAgo, data.coworking.threeYearAgo, data.coworking.fiveYearAgo),
  };

  // Construction
  const constructionActivity: ConstructionActivity = {
    residentialPermitsValue: buildTrendMetric(data.resPermitValue.current, data.resPermitValue.oneYearAgo, data.resPermitValue.threeYearAgo, data.resPermitValue.fiveYearAgo),
    commercialPermitsValue: buildTrendMetric(data.commPermitValue.current, data.commPermitValue.oneYearAgo, data.commPermitValue.threeYearAgo, data.commPermitValue.fiveYearAgo),
    demolitionPermits: buildTrendMetric(data.demoPermits.current, data.demoPermits.oneYearAgo, data.demoPermits.threeYearAgo, data.demoPermits.fiveYearAgo),
    renovationPermits: buildTrendMetric(data.renoPermits.current, data.renoPermits.oneYearAgo, data.renoPermits.threeYearAgo, data.renoPermits.fiveYearAgo),
    activeConstructionProjects: data.activeProjects,
    constructionEmployment: buildTrendMetric(data.constructionJobs.current, data.constructionJobs.oneYearAgo, data.constructionJobs.threeYearAgo, data.constructionJobs.fiveYearAgo),
    concreteAndSteelOrders: buildTrendMetric(data.materialOrders.current, data.materialOrders.oneYearAgo, data.materialOrders.threeYearAgo, data.materialOrders.fiveYearAgo),
    architecturalBillingsIndex: data.abiIndex,
    avgConstructionTimeline: data.avgConstructionMonths,
    constructionCostIndex: buildTrendMetric(data.constructionCost.current, data.constructionCost.oneYearAgo, data.constructionCost.threeYearAgo, data.constructionCost.fiveYearAgo),
  };

  // Consumer spending
  const consumerSpending: ConsumerSpending = {
    retailSalesPerCapita: buildTrendMetric(data.retailSales.current, data.retailSales.oneYearAgo, data.retailSales.threeYearAgo, data.retailSales.fiveYearAgo),
    restaurantSpendingPerCapita: buildTrendMetric(data.restaurantSpend.current, data.restaurantSpend.oneYearAgo, data.restaurantSpend.threeYearAgo, data.restaurantSpend.fiveYearAgo),
    grocerySpendingIndex: buildTrendMetric(data.groceryIndex.current, data.groceryIndex.oneYearAgo, data.groceryIndex.threeYearAgo, data.groceryIndex.fiveYearAgo),
    luxuryRetailPresence: data.luxuryRetailCount,
    ecommerceDeliveryDensity: buildTrendMetric(data.ecommDensity.current, data.ecommDensity.oneYearAgo, data.ecommDensity.threeYearAgo, data.ecommDensity.fiveYearAgo),
    autoSalesRegistrations: buildTrendMetric(data.autoSales.current, data.autoSales.oneYearAgo, data.autoSales.threeYearAgo, data.autoSales.fiveYearAgo),
    avgNewCarPrice: buildTrendMetric(data.avgCarPrice.current, data.avgCarPrice.oneYearAgo, data.avgCarPrice.threeYearAgo, data.avgCarPrice.fiveYearAgo),
    discretionarySpendingRatio: data.discretionaryRatio,
  };

  // Credit market
  const creditMarket: CreditMarket = {
    avgCreditScore: buildTrendMetric(data.creditScore.current, data.creditScore.oneYearAgo, data.creditScore.threeYearAgo, data.creditScore.fiveYearAgo),
    mortgageApprovalRate: buildTrendMetric(data.mortgageApproval.current, data.mortgageApproval.oneYearAgo, data.mortgageApproval.threeYearAgo, data.mortgageApproval.fiveYearAgo),
    mortgageDelinquencyRate: buildTrendMetric(data.delinquency.current, data.delinquency.oneYearAgo, data.delinquency.threeYearAgo, data.delinquency.fiveYearAgo),
    foreclosureRate: buildTrendMetric(data.foreclosure.current, data.foreclosure.oneYearAgo, data.foreclosure.threeYearAgo, data.foreclosure.fiveYearAgo),
    avgDebtToIncomeRatio: buildTrendMetric(data.dti.current, data.dti.oneYearAgo, data.dti.threeYearAgo, data.dti.fiveYearAgo),
    refinanceVolume: buildTrendMetric(data.refiVolume.current, data.refiVolume.oneYearAgo, data.refiVolume.threeYearAgo, data.refiVolume.fiveYearAgo),
    helocOriginations: buildTrendMetric(data.heloc.current, data.heloc.oneYearAgo, data.heloc.threeYearAgo, data.heloc.fiveYearAgo),
    avgMortgageAmount: buildTrendMetric(data.avgMortgage.current, data.avgMortgage.oneYearAgo, data.avgMortgage.threeYearAgo, data.avgMortgage.fiveYearAgo),
    cashBuyerPercentage: buildTrendMetric(data.cashBuyers.current, data.cashBuyers.oneYearAgo, data.cashBuyers.threeYearAgo, data.cashBuyers.fiveYearAgo),
  };

  // Labor micro
  const laborMicroMetrics: LaborMicroMetrics = {
    jobPostingsCount: buildTrendMetric(data.jobPostings.current, data.jobPostings.oneYearAgo, data.jobPostings.threeYearAgo, data.jobPostings.fiveYearAgo),
    avgSalaryPosted: buildTrendMetric(data.avgSalary.current, data.avgSalary.oneYearAgo, data.avgSalary.threeYearAgo, data.avgSalary.fiveYearAgo),
    techJobPostings: buildTrendMetric(data.techJobs.current, data.techJobs.oneYearAgo, data.techJobs.threeYearAgo, data.techJobs.fiveYearAgo),
    healthcareJobPostings: buildTrendMetric(data.healthJobs.current, data.healthJobs.oneYearAgo, data.healthJobs.threeYearAgo, data.healthJobs.fiveYearAgo),
    constructionJobPostings: buildTrendMetric(data.constructionJobPostings.current, data.constructionJobPostings.oneYearAgo, data.constructionJobPostings.threeYearAgo, data.constructionJobPostings.fiveYearAgo),
    remoteWorkPercentage: buildTrendMetric(data.remoteWork.current, data.remoteWork.oneYearAgo, data.remoteWork.threeYearAgo, data.remoteWork.fiveYearAgo),
    commuteTimeAvg: buildTrendMetric(data.commuteTime.current, data.commuteTime.oneYearAgo, data.commuteTime.threeYearAgo, data.commuteTime.fiveYearAgo),
    commutePatterns: data.commutePatterns,
    giniCoefficient: buildTrendMetric(data.gini.current, data.gini.oneYearAgo, data.gini.threeYearAgo, data.gini.fiveYearAgo),
    underemploymentRate: buildTrendMetric(data.underemployment.current, data.underemployment.oneYearAgo, data.underemployment.threeYearAgo, data.underemployment.fiveYearAgo),
    laborForceParticipation: buildTrendMetric(data.lfp.current, data.lfp.oneYearAgo, data.lfp.threeYearAgo, data.lfp.fiveYearAgo),
  };

  // Housing micro
  const housingMicroMetrics: HousingMicroMetrics = {
    medianPriceByBedroom: {
      oneBed: buildTrendMetric(data.price1bed.current, data.price1bed.oneYearAgo, data.price1bed.threeYearAgo, data.price1bed.fiveYearAgo),
      twoBed: buildTrendMetric(data.price2bed.current, data.price2bed.oneYearAgo, data.price2bed.threeYearAgo, data.price2bed.fiveYearAgo),
      threeBed: buildTrendMetric(data.price3bed.current, data.price3bed.oneYearAgo, data.price3bed.threeYearAgo, data.price3bed.fiveYearAgo),
      fourPlusBed: buildTrendMetric(data.price4bed.current, data.price4bed.oneYearAgo, data.price4bed.threeYearAgo, data.price4bed.fiveYearAgo),
    },
    pricePerSqftByAge: {
      newConstruction: buildTrendMetric(data.psfNew.current, data.psfNew.oneYearAgo, data.psfNew.threeYearAgo, data.psfNew.fiveYearAgo),
      midAge: buildTrendMetric(data.psfMid.current, data.psfMid.oneYearAgo, data.psfMid.threeYearAgo, data.psfMid.fiveYearAgo),
      older: buildTrendMetric(data.psfOld.current, data.psfOld.oneYearAgo, data.psfOld.threeYearAgo, data.psfOld.fiveYearAgo),
    },
    flipActivity: {
      flipsCompleted: buildTrendMetric(data.flips.current, data.flips.oneYearAgo, data.flips.threeYearAgo, data.flips.fiveYearAgo),
      avgFlipProfit: buildTrendMetric(data.flipProfit.current, data.flipProfit.oneYearAgo, data.flipProfit.threeYearAgo, data.flipProfit.fiveYearAgo),
      avgFlipTimeline: data.avgFlipDays,
    },
    investorPurchasePercentage: buildTrendMetric(data.investorPct.current, data.investorPct.oneYearAgo, data.investorPct.threeYearAgo, data.investorPct.fiveYearAgo),
    firstTimeBuyerPercentage: buildTrendMetric(data.ftbPct.current, data.ftbPct.oneYearAgo, data.ftbPct.threeYearAgo, data.ftbPct.fiveYearAgo),
    cashOfferPercentage: buildTrendMetric(data.cashOffers.current, data.cashOffers.oneYearAgo, data.cashOffers.threeYearAgo, data.cashOffers.fiveYearAgo),
    priceReductionPercentage: buildTrendMetric(data.priceReductions.current, data.priceReductions.oneYearAgo, data.priceReductions.threeYearAgo, data.priceReductions.fiveYearAgo),
    avgPriceReductionAmount: buildTrendMetric(data.avgReduction.current, data.avgReduction.oneYearAgo, data.avgReduction.threeYearAgo, data.avgReduction.fiveYearAgo),
    expiredListingsPercentage: buildTrendMetric(data.expiredPct.current, data.expiredPct.oneYearAgo, data.expiredPct.threeYearAgo, data.expiredPct.fiveYearAgo),
    newListingsVsPendingSales: buildTrendMetric(data.listVsPending.current, data.listVsPending.oneYearAgo, data.listVsPending.threeYearAgo, data.listVsPending.fiveYearAgo),
    shadowInventory: data.shadowInventory,
  };

  // Wealth indicators
  const wealthIndicators: WealthIndicators = {
    medianNetWorth: buildTrendMetric(data.netWorth.current, data.netWorth.oneYearAgo, data.netWorth.threeYearAgo, data.netWorth.fiveYearAgo),
    savingsRate: buildTrendMetric(data.savings.current, data.savings.oneYearAgo, data.savings.threeYearAgo, data.savings.fiveYearAgo),
    bankruptcyFilings: buildTrendMetric(data.bankruptcies.current, data.bankruptcies.oneYearAgo, data.bankruptcies.threeYearAgo, data.bankruptcies.fiveYearAgo),
    charitableDonationsPerCapita: buildTrendMetric(data.donations.current, data.donations.oneYearAgo, data.donations.threeYearAgo, data.donations.fiveYearAgo),
    privateSchoolEnrollmentPct: buildTrendMetric(data.privateSchool.current, data.privateSchool.oneYearAgo, data.privateSchool.threeYearAgo, data.privateSchool.fiveYearAgo),
    countryClubMemberships: buildTrendMetric(data.countryClub.current, data.countryClub.oneYearAgo, data.countryClub.threeYearAgo, data.countryClub.fiveYearAgo),
    boatRegistrations: buildTrendMetric(data.boats.current, data.boats.oneYearAgo, data.boats.threeYearAgo, data.boats.fiveYearAgo),
    avgHomeSalePrice: buildTrendMetric(data.avgHomePrice.current, data.avgHomePrice.oneYearAgo, data.avgHomePrice.threeYearAgo, data.avgHomePrice.fiveYearAgo),
    millionDollarHomesPct: buildTrendMetric(data.millionHomes.current, data.millionHomes.oneYearAgo, data.millionHomes.threeYearAgo, data.millionHomes.fiveYearAgo),
    luxuryCarRegistrations: buildTrendMetric(data.luxuryCars.current, data.luxuryCars.oneYearAgo, data.luxuryCars.threeYearAgo, data.luxuryCars.fiveYearAgo),
  };

  const moneyVelocityScore = calculateMoneyVelocityScore(capitalFlows, businessActivity, constructionActivity, consumerSpending);

  return {
    zipCode: data.zipCode,
    capitalFlows,
    businessActivity,
    constructionActivity,
    consumerSpending,
    creditMarket,
    laborMicroMetrics,
    housingMicroMetrics,
    wealthIndicators,
    moneyVelocityScore,
  };
}

// --- Raw input type ---
export interface RawMicroeconomicData {
  zipCode: string;
  // Capital flows
  fdi: TimeSeriesData; vcDeals: TimeSeriesData; creInvestment: TimeSeriesData; rreInvestment: TimeSeriesData;
  mortgageOrigination: TimeSeriesData; sbaLoans: TimeSeriesData; commercialLoans: TimeSeriesData;
  federalGrants: TimeSeriesData; stateSpending: TimeSeriesData; muniBonds: TimeSeriesData;
  salesTax: TimeSeriesData; propertyTaxRev: TimeSeriesData; incomeTaxRev: TimeSeriesData;
  // Business
  newBusinesses: TimeSeriesData; closedBusinesses: TimeSeriesData; bizLicenses: TimeSeriesData;
  leaseAbsorption: TimeSeriesData; commVacancy: TimeSeriesData;
  retailOpenings: number; retailClosings: number; restaurantOpenings: number; restaurantClosings: number;
  franchiseExpansions: { brand: string; type: string; count: number }[];
  coworking: TimeSeriesData;
  // Construction
  resPermitValue: TimeSeriesData; commPermitValue: TimeSeriesData;
  demoPermits: TimeSeriesData; renoPermits: TimeSeriesData;
  activeProjects: number; constructionJobs: TimeSeriesData; materialOrders: TimeSeriesData;
  abiIndex: number; avgConstructionMonths: number; constructionCost: TimeSeriesData;
  // Consumer
  retailSales: TimeSeriesData; restaurantSpend: TimeSeriesData; groceryIndex: TimeSeriesData;
  luxuryRetailCount: number; ecommDensity: TimeSeriesData;
  autoSales: TimeSeriesData; avgCarPrice: TimeSeriesData; discretionaryRatio: number;
  // Credit
  creditScore: TimeSeriesData; mortgageApproval: TimeSeriesData; delinquency: TimeSeriesData;
  foreclosure: TimeSeriesData; dti: TimeSeriesData; refiVolume: TimeSeriesData;
  heloc: TimeSeriesData; avgMortgage: TimeSeriesData; cashBuyers: TimeSeriesData;
  // Labor
  jobPostings: TimeSeriesData; avgSalary: TimeSeriesData; techJobs: TimeSeriesData;
  healthJobs: TimeSeriesData; constructionJobPostings: TimeSeriesData;
  remoteWork: TimeSeriesData; commuteTime: TimeSeriesData;
  commutePatterns: { driveAlone: number; publicTransit: number; workFromHome: number; walk: number; other: number };
  gini: TimeSeriesData; underemployment: TimeSeriesData; lfp: TimeSeriesData;
  // Housing micro
  price1bed: TimeSeriesData; price2bed: TimeSeriesData; price3bed: TimeSeriesData; price4bed: TimeSeriesData;
  psfNew: TimeSeriesData; psfMid: TimeSeriesData; psfOld: TimeSeriesData;
  flips: TimeSeriesData; flipProfit: TimeSeriesData; avgFlipDays: number;
  investorPct: TimeSeriesData; ftbPct: TimeSeriesData; cashOffers: TimeSeriesData;
  priceReductions: TimeSeriesData; avgReduction: TimeSeriesData; expiredPct: TimeSeriesData;
  listVsPending: TimeSeriesData; shadowInventory: number;
  // Wealth
  netWorth: TimeSeriesData; savings: TimeSeriesData; bankruptcies: TimeSeriesData;
  donations: TimeSeriesData; privateSchool: TimeSeriesData; countryClub: TimeSeriesData;
  boats: TimeSeriesData; avgHomePrice: TimeSeriesData; millionHomes: TimeSeriesData; luxuryCars: TimeSeriesData;
}
