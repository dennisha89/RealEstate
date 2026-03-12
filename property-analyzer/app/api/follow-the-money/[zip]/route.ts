import { NextRequest, NextResponse } from "next/server";
import {
  computeCompositeScore,
  unifySignals,
  assessTiming,
  summarizeCapitalFlows,
  type FollowTheMoneyProfile,
} from "@/lib/engines/follow-the-money-engine";
import {
  detectInstitutionalPatterns,
  scoreInstitutionalCapital,
  determineInstitutionalSentiment,
  type InstitutionalCapitalProfile,
  type LLCPurchaseActivity,
  type REITDeployment,
  type PEActivity,
  type IBuyerActivity,
  type CorporateRelocation,
  type CrowdfundingDeployment,
} from "@/lib/engines/institutional-capital-engine";
import {
  generatePipelineSignals,
  scorePipeline,
  type TransactionPipelineProfile,
} from "@/lib/engines/transaction-pipeline-engine";
import {
  generateAlternativeSignals,
  scoreAlternativeSignals,
  type AlternativeSignalsProfile,
} from "@/lib/engines/alternative-signals-engine";
import {
  generateCostSignals,
  scoreCostInsurance,
  type CostInsuranceProfile,
} from "@/lib/engines/cost-insurance-engine";
import type { CapitalMigrationProfile } from "@/lib/engines/capital-migration-engine";
import { buildTrendMetric, type TimeSeriesData } from "@/lib/engines/demographic-engine";

/**
 * GET /api/follow-the-money/:zip
 *
 * Unified money flow intelligence for a zip code.
 * Aggregates institutional capital, capital migration, transaction pipeline,
 * alternative data signals, and cost/insurance data into a single profile.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zip: string }> }
) {
  try {
    const { zip } = await params;

    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: "Valid 5-digit zip code required" }, { status: 400 });
    }

    // In production, these would come from real data sources.
    // For now, generate comprehensive mock data for demonstration.
    const institutionalProfile = buildMockInstitutionalProfile(zip);
    const migrationProfile = buildMockMigrationProfile(zip);
    const pipelineProfile = buildMockPipelineProfile(zip);
    const alternativeProfile = buildMockAlternativeProfile(zip);
    const costProfile = buildMockCostProfile(zip);

    // Score each engine
    const institutionalScore = institutionalProfile.institutionalCapitalScore;
    const migrationScore = 62; // from capital migration engine
    const pipelineScore = scorePipeline(pipelineProfile);
    const alternativeScore = scoreAlternativeSignals(alternativeProfile);
    const costScore = scoreCostInsurance(costProfile);

    // Compute composite
    const compositeScore = computeCompositeScore(
      institutionalScore,
      migrationScore,
      pipelineScore,
      alternativeScore,
      costScore
    );

    // Generate signals from each engine
    const smartMoneySignals = institutionalProfile.smartMoneySignals;
    const pipelineSignals = generatePipelineSignals(pipelineProfile);
    const emergingSignals = generateAlternativeSignals(alternativeProfile);
    const costSignals = generateCostSignals(costProfile);

    // Unify signals
    const allSignals = unifySignals(smartMoneySignals, pipelineSignals, emergingSignals, costSignals);
    const topSignals = allSignals.slice(0, 5);

    // Capital flow summary
    const capitalFlowSummary = summarizeCapitalFlows(migrationProfile, institutionalProfile);

    // Timing assessment
    const timingAssessment = assessTiming(compositeScore.overall, allSignals);

    // Money velocity
    const moneyVelocity = {
      transactionVelocity: "accelerating" as const,
      capitalDeploymentRate: "fast" as const,
      daysOnMarket: 22,
      inventoryTurnover: 4.2,
      mortgageApplicationRate: "high" as const,
      velocityScore: 68,
      interpretation: "Money is moving quickly through this market. Fast transaction velocity and high mortgage applications indicate strong demand momentum.",
    };

    const profile: FollowTheMoneyProfile = {
      zipCode: zip,
      generatedAt: new Date().toISOString(),
      institutionalCapital: institutionalProfile,
      capitalMigration: migrationProfile,
      transactionPipeline: pipelineProfile,
      alternativeSignals: alternativeProfile,
      costInsurance: costProfile,
      compositeScore,
      allSignals,
      topSignals,
      capitalFlowSummary,
      moneyVelocity,
      timingAssessment,
    };

    return NextResponse.json({
      profile,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Follow the money error:", error);
    return NextResponse.json({ error: "Follow the money analysis failed" }, { status: 500 });
  }
}

// --- Mock Data Builders ---

function tm(current: number, yearAgo: number): ReturnType<typeof buildTrendMetric> {
  return buildTrendMetric([
    { date: "2021-01", value: yearAgo * 0.85 },
    { date: "2022-01", value: yearAgo * 0.92 },
    { date: "2023-01", value: yearAgo },
    { date: "2024-01", value: current * 0.96 },
    { date: "2025-01", value: current },
  ]);
}

function buildMockInstitutionalProfile(zip: string): InstitutionalCapitalProfile {
  const llcActivity: LLCPurchaseActivity = {
    totalLLCPurchases: tm(145, 110),
    llcPurchasePctOfTotal: tm(22, 17),
    uniqueEntitiesBuying: 38,
    topBuyingEntities: [
      { entityName: "Sunbelt Capital LLC", entityType: "llc", purchaseCount: 12, totalVolume: 4200000, avgPurchasePrice: 350000, propertyTypes: ["SFR"], firstPurchaseDate: "2023-06-15", mostRecentPurchase: "2025-11-20", strategy: "buy_and_hold" },
      { entityName: "Keystone RE Holdings", entityType: "fund", parentCompany: "Keystone Partners", purchaseCount: 8, totalVolume: 6800000, avgPurchasePrice: 850000, propertyTypes: ["multifamily"], firstPurchaseDate: "2024-01-10", mostRecentPurchase: "2025-12-05", estimatedAUM: 150000000, strategy: "value_add" },
    ],
    bulkPurchases: [{ entity: "Sunbelt Capital LLC", count: 5, totalVolume: 1750000, dateRange: "2025-09 to 2025-11" }],
    newEntitiesEntering: 8,
    avgEntityHoldPeriod: 28,
    entitySellingVsBuying: 1.6,
  };

  const reitDeployments: REITDeployment[] = [
    { reitName: "Invitation Homes", ticker: "INVH", sector: "SFR", activityInMarket: "expanding", propertiesOwned: 85, recentAcquisitions: 22, recentDispositions: 3, capitalDeployed: 7500000, publicStatements: "Targeting Sun Belt markets with strong job growth", source: "earnings call" },
    { reitName: "American Homes 4 Rent", ticker: "AMH", sector: "SFR", activityInMarket: "entering", propertiesOwned: 12, recentAcquisitions: 12, recentDispositions: 0, capitalDeployed: 4200000, source: "10-K" },
  ];

  const peActivity: PEActivity = {
    activeFundsTargetingMarket: 4,
    totalFundCapitalRaised: 85000000,
    recentFundFormations: [{ fundName: "Metro Growth Fund III", targetSize: 50000000, strategy: "value-add multifamily", filingDate: "2025-08-15" }],
    formDFilings: tm(6, 3),
    dryPowder: 120000000,
  };

  const iBuyer: IBuyerActivity = {
    activeBuyers: ["Opendoor", "Offerpad"],
    purchaseVolume: tm(35, 22),
    resaleVolume: tm(28, 18),
    avgHoldPeriod: 62,
    avgMarkup: 8.5,
    marketShare: 4.2,
    inventoryOnHand: 18,
    pricingVsMarket: 2.1,
    signal: "expanding",
  };

  const corporateRelocations: CorporateRelocation[] = [
    { companyName: "TechVenture Inc", industry: "Technology", relocationType: "regional_office", estimatedJobs: 800, avgSalary: 95000, announcementDate: "2025-06-01", expectedMoveDate: "2026-09-01", incentivesReceived: 12000000, estimatedHousingDemand: 650, estimatedRentalDemand: 400, salaryToMedianIncomeRatio: 1.45, source: "Press release" },
  ];

  const crowdfunding: CrowdfundingDeployment = {
    activePlatforms: ["Fundrise", "RealtyMogul", "CrowdStreet"],
    totalRaised: tm(8500000, 4200000),
    activeProjects: 5,
    avgProjectSize: 1700000,
    projectTypes: [{ type: "multifamily", count: 3, totalRaised: 5100000 }, { type: "mixed-use", count: 2, totalRaised: 3400000 }],
    consensusSignal: true,
  };

  const signals = detectInstitutionalPatterns(llcActivity, reitDeployments, peActivity, iBuyer, corporateRelocations, crowdfunding);
  const score = scoreInstitutionalCapital(llcActivity, signals);
  const sentiment = determineInstitutionalSentiment(score, llcActivity);

  return {
    zipCode: zip,
    llcPurchaseActivity: llcActivity,
    reitDeployment: reitDeployments,
    privateEquityActivity: peActivity,
    iBuyerActivity: iBuyer,
    corporateRelocations,
    crowdfundingDeployment: crowdfunding,
    institutionalSentiment: sentiment,
    institutionalCapitalScore: score,
    smartMoneySignals: signals,
  };
}

function buildMockMigrationProfile(zip: string): CapitalMigrationProfile {
  return {
    zipCode: zip,
    exchange1031: {
      inboundVolume: tm(45000000, 32000000),
      outboundVolume: tm(18000000, 22000000),
      netExchangeFlow: 27000000,
      avgExchangeValue: 520000,
      topOriginMarkets: [
        { market: "San Francisco, CA", volume: 12000000, count: 18, avgValue: 666666 },
        { market: "New York, NY", volume: 8000000, count: 12, avgValue: 666666 },
        { market: "Los Angeles, CA", volume: 6000000, count: 10, avgValue: 600000 },
      ],
      topDestinationMarkets: [
        { market: "Miami, FL", volume: 5000000, count: 8, avgValue: 625000 },
        { market: "Nashville, TN", volume: 4000000, count: 6, avgValue: 666666 },
      ],
      exchangePropertyTypes: { residential: 45, commercial: 30, industrial: 15, land: 10 },
      avgDeferredGain: 180000,
      exchangeCompletionRate: 72,
      signal: "strong_inbound" as const,
    },
    hmdaMortgageIntelligence: {
      totalApplications: tm(2800, 2200),
      approvalRate: tm(68, 65),
      avgLoanAmount: tm(320000, 295000),
      investorVsOwnerOccupied: { investor: 28, ownerOccupied: 72 },
      investorLoanTrend: "accelerating" as const,
      denialReasons: [
        { reason: "Debt-to-income ratio", pct: 32 },
        { reason: "Credit history", pct: 25 },
        { reason: "Insufficient collateral", pct: 18 },
      ],
      lenderConcentration: 0.15,
      topLenders: [
        { lender: "Wells Fargo", marketShare: 18, avgRate: 6.8 },
        { lender: "Chase", marketShare: 15, avgRate: 6.75 },
      ],
      loanTypeMix: { conventional: 55, fha: 25, va: 12, usda: 3, jumbo: 5 },
      jumboLoanTrend: tm(85, 62),
      cashOutRefiVolume: tm(180, 220),
      purchaseVsRefi: { purchase: 72, refinance: 28 },
      demographicShifts: {
        firstTimeHomeBuyerPct: tm(38, 42),
        avgBorrowerAge: 36,
        avgBorrowerIncome: 85000,
        minorityLendingPct: tm(32, 28),
      },
    },
    foreignCapital: {
      totalInvestmentVolume: tm(15000000, 10000000),
      foreignBuyerPct: tm(5.2, 3.8),
      topOriginCountries: [
        { country: "Canada", volume: 5000000, count: 12, avgPurchase: 416666, trendDirection: "increasing" as const },
        { country: "China", volume: 3500000, count: 6, avgPurchase: 583333, trendDirection: "stable" as const },
        { country: "Mexico", volume: 2500000, count: 8, avgPurchase: 312500, trendDirection: "increasing" as const },
      ],
      firptaWithholdings: tm(2100000, 1500000),
      visaBuyerCorrelation: { eb5: 3, h1b: 15, l1: 8 },
      currencyImpact: [
        { currency: "CAD", exchangeRateChange: -3.2, impactOnPurchasing: "slightly_negative" as const },
      ],
      signal: "increasing" as const,
    },
    taxMigration: {
      irsSoiNetMigration: tm(2800, 2100),
      avgIncomOfInMigrants: 92000,
      avgIncomeOfOutMigrants: 68000,
      netIncomeFlow: 42000000,
      topOriginStates: [
        { state: "California", netMigrants: 850, avgIncome: 105000, taxSavings: 8500 },
        { state: "New York", netMigrants: 620, avgIncome: 98000, taxSavings: 7200 },
        { state: "Illinois", netMigrants: 380, avgIncome: 82000, taxSavings: 4100 },
      ],
      topDestinationStates: [
        { state: "Florida", netMigrants: -120, avgIncome: 72000 },
      ],
      stateIncomeTaxArbitrage: 5.8,
      saltDeductionImpact: "moderate_driver" as const,
      retireeMigrationPct: 22,
      signal: "strong_inflow" as const,
    },
    capitalOriginMap: {
      domestic1031: 45000000,
      foreignDirect: 15000000,
      taxMigration: 42000000,
      institutional: 18000000,
      organic: 30000000,
      totalEstimatedCapitalInflow: 150000000,
    },
  };
}

function buildMockPipelineProfile(zip: string): TransactionPipelineProfile {
  return {
    zipCode: zip,
    titleInsurance: {
      orderVolume: tm(420, 350),
      closingVolume: tm(380, 340),
      orderToCloseRatio: 1.11,
      avgDaysToClose: tm(38, 42),
      commercialVsResidentialMix: { residential: 78, commercial: 22 },
      refinanceOrderPct: tm(22, 28),
      purchaseOrderPct: tm(78, 72),
      cancelationRate: tm(8, 6),
      signal: "pipeline_building",
    },
    foreclosurePipeline: {
      noticeOfDefault: tm(35, 42),
      lisPendens: tm(22, 28),
      scheduledAuctions: tm(15, 18),
      auctionSales: tm(12, 14),
      reoInventory: tm(8, 12),
      totalPipelineVolume: 92,
      pipelineFlowRate: "decelerating",
      avgForeclosureTimeline: 240,
      estimatedDistressedInventory6Mo: 45,
      estimatedDistressedInventory12Mo: 75,
      shortSales: tm(5, 8),
      loanModifications: tm(18, 12),
      forbearanceExits: { total: 85, cured: 45, modifiedToPerforming: 22, delinquentAfterExit: 12, inForeclosure: 6 },
    },
    probateEstateActivity: {
      newFilings: tm(28, 25),
      estimatedPropertyValue: 8500000,
      avgTimeToSale: 14,
      estatesSoldBelowMarket: 8,
      avgDiscountToMarket: 12,
      propertiesStillHeldByEstate: 15,
      probateAsPercentOfListings: tm(3.2, 2.8),
    },
    hardMoneyLending: {
      loanVolume: tm(12000000, 8500000),
      loanCount: tm(42, 30),
      avgLoanAmount: tm(285000, 283000),
      avgInterestRate: 11.5,
      avgLTV: 68,
      avgLoanTerm: 12,
      defaultRate: tm(3.2, 2.8),
      activeLenders: 8,
      purposeBreakdown: { fix_and_flip: 55, bridge: 20, construction: 10, rehab: 12, other: 3 },
      signal: "high_flip_activity",
    },
    evictionMetrics: {
      filingRate: tm(4.2, 3.8),
      filingCount: tm(125, 110),
      executedEvictions: tm(62, 58),
      avgDaysToEviction: 45,
      topReasons: [{ reason: "Non-payment", pct: 68 }, { reason: "Lease violation", pct: 22 }, { reason: "Holdover", pct: 10 }],
      filingRateVsMetro: -8,
      serialEvictionProperties: 12,
      evictionMoratoriumActive: false,
      signal: "stable",
    },
    propertyTaxAppeals: {
      appealVolume: tm(180, 150),
      appealRate: 3.5,
      avgRequestedReduction: 12,
      successRate: tm(42, 38),
      avgGrantedReduction: 6.5,
      totalAssessedValueReduction: 2800000,
      signal: "normal_activity",
    },
    permitToCompletionVelocity: {
      avgPermitToStartDays: tm(45, 52),
      avgStartToCompletionDays: tm(180, 165),
      totalPipelineDays: tm(225, 217),
      permitsExpiredUnbuilt: tm(18, 22),
      completionRate: 72,
      bottleneck: "labor",
      supplyImplication: "Moderate labor constraints slowing new construction. Expected supply arriving 20% later than planned.",
    },
    transactionPipelineScore: 0,
    pipelineSignals: [],
  };
}

function buildMockAlternativeProfile(zip: string): AlternativeSignalsProfile {
  return {
    zipCode: zip,
    uspsMailMigration: {
      totalChangesOfAddress: tm(1850, 1500),
      inboundVsOutbound: 1.45,
      inboundVolume: tm(1100, 850),
      outboundVolume: tm(750, 650),
      topOriginZips: [
        { zip: "90210", city: "Beverly Hills", state: "CA", volume: 85, avgIncome: 145000 },
        { zip: "10001", city: "New York", state: "NY", volume: 62, avgIncome: 120000 },
      ],
      topDestinationZips: [
        { zip: "33139", city: "Miami Beach", state: "FL", volume: 35 },
      ],
      businessCOA: tm(120, 95),
      seasonalPattern: [
        { month: "Jan", netFlow: 20 }, { month: "Feb", netFlow: 15 }, { month: "Mar", netFlow: 30 },
        { month: "Apr", netFlow: 35 }, { month: "May", netFlow: 45 }, { month: "Jun", netFlow: 55 },
        { month: "Jul", netFlow: 50 }, { month: "Aug", netFlow: 40 }, { month: "Sep", netFlow: 25 },
        { month: "Oct", netFlow: 15 }, { month: "Nov", netFlow: 10 }, { month: "Dec", netFlow: 10 },
      ],
      incomeProfileOfMovers: {
        avgIncome: 92000,
        medianIncome: 85000,
        highIncomeMovers: 42,
        incomeShift: "upgrading",
      },
      signal: "strong_inflow",
    },
    utilityConnections: {
      newElectricConnections: tm(280, 220),
      electricDisconnections: tm(150, 160),
      netConnections: 130,
      newWaterConnections: tm(245, 195),
      newGasConnections: tm(210, 175),
      commercialConnections: tm(45, 32),
      averageUsagePerHousehold: tm(1100, 1050),
      vacantPropertyEstimate: 185,
      vacancyTrend: "falling",
      constructionConnections: 35,
      signal: "expansion",
    },
    schoolEnrollment: {
      totalEnrollment: tm(12500, 11800),
      publicSchoolEnrollment: tm(9800, 9400),
      privateSchoolEnrollment: tm(1800, 1600),
      charterSchoolEnrollment: tm(900, 800),
      kindergartenEnrollment: tm(950, 880),
      transfersIn: tm(380, 310),
      transfersOut: tm(180, 200),
      netTransfers: 200,
      waitlistLength: 85,
      newSchoolsPlanned: 1,
      schoolCapacityUtilization: 88,
      homeschoolRate: tm(4.2, 3.8),
      avgClassSize: tm(24, 23),
      perPupilSpending: tm(12500, 11800),
      signal: "family_influx",
    },
    searchIntelligence: {
      realEstateSearchVolume: tm(8500, 6200),
      rentalSearchVolume: tm(5200, 4100),
      relocationSearchVolume: tm(3200, 2100),
      topSearchTerms: [
        { term: "homes for sale", volume: 8500, trend: "rising" },
        { term: "apartments for rent", volume: 5200, trend: "rising" },
        { term: "best neighborhoods", volume: 2800, trend: "rising" },
        { term: "school ratings", volume: 2200, trend: "stable" },
      ],
      zillow_trulia_views: tm(45000, 32000),
      costOfLivingSearches: tm(1800, 1200),
      jobSearchVolume: tm(6500, 5000),
      schoolSearchVolume: tm(2200, 1800),
      crimeSearchVolume: tm(900, 850),
      searchVolumeVsNational: 35,
      intentScore: 78,
      signal: "surging_interest",
    },
    mobilityPatterns: {
      avgCommuteTime: tm(28, 26),
      commuteTimeDelta: 2,
      trafficCongestionIndex: tm(6.2, 5.5),
      transitRidership: tm(15000, 13500),
      rideshareTripsPerCapita: tm(12, 9.5),
      weekendActivityIndex: tm(72, 65),
      airportPassengerVolume: tm(850000, 720000),
      newRouteAnnouncements: 3,
      remoteWorkAdoption: tm(28, 22),
      coworkingOccupancy: tm(78, 65),
      peakTrafficHours: [{ hour: 8, congestion: 8.5 }, { hour: 17, congestion: 9.1 }],
      signal: "increasing_activity",
    },
    strRegulationArbitrage: {
      currentRegulation: "moderate",
      regulationTrend: "stable",
      permitRequired: true,
      annualCap: null,
      activeSTRListings: tm(320, 250),
      strRevenue: tm(3200, 2800),
      strOccupancy: tm(72, 68),
      strVsLongTermPremium: 45,
      neighboringMarketRegulation: [
        { market: "Downtown core", regulation: "restrictive", strCount: 80, spilloverEffect: true },
        { market: "Beach district", regulation: "permissive", strCount: 450, spilloverEffect: false },
      ],
      pendingRegulationChanges: ["Proposed 120-day annual cap under review"],
      arbitrageOpportunity: "moderate",
      estimatedAnnualSTRRevenue: 38400,
      estimatedLongTermAnnualRent: 22200,
    },
    socialSentiment: {
      neighborhoodSentiment: 45,
      sentimentTrend: "improving",
      topPositiveThemes: ["new restaurants", "park improvements", "growing tech scene", "safe neighborhood"],
      topNegativeThemes: ["traffic congestion", "rising costs", "parking issues"],
      yelpNewBusinessRating: 4.2,
      googleReviewTrend: "improving",
      redditMentionVolume: tm(85, 55),
      nextdoorActivityLevel: "high",
      mediaArticleSentiment: 32,
      instagramGeotagVolume: tm(12000, 8500),
    },
    alternativeSignalScore: 0,
    emergingSignals: [],
  };
}

function buildMockCostProfile(zip: string): CostInsuranceProfile {
  return {
    zipCode: zip,
    constructionCosts: {
      costPerSqft: tm(185, 165),
      commercialCostPerSqft: tm(225, 200),
      laborCostIndex: tm(118, 108),
      materialCostIndex: tm(112, 105),
      concreteCost: tm(155, 140),
      lumberCost: tm(4.8, 4.2),
      steelCost: tm(1100, 980),
      laborAvailability: "tight",
      avgContractorBacklog: 8,
      subcontractorPricing: "firm",
      permitFees: tm(8500, 7200),
      impactFees: tm(12000, 10500),
      totalSoftCosts: 22,
      costBreakdown: {
        foundation: 12, framing: 18, roofing: 8, electrical: 10,
        plumbing: 10, hvac: 8, finishing: 15, landscaping: 5, softCosts: 14,
      },
      renovationCosts: {
        kitchenRemodel: { low: 15000, mid: 35000, high: 75000 },
        bathroomRemodel: { low: 8000, mid: 20000, high: 45000 },
        roofReplacement: { low: 8000, mid: 15000, high: 30000 },
        hvacReplacement: { low: 5000, mid: 10000, high: 18000 },
        windowReplacement: { low: 5000, mid: 12000, high: 25000 },
        additionPerSqft: { low: 120, mid: 200, high: 350 },
      },
      signal: "costs_rising",
    },
    insuranceLandscape: {
      avgHomeownerPremium: tm(2400, 2050),
      premiumPerSqft: tm(1.2, 1.02),
      premiumChange5yr: 38,
      activeInsurers: 12,
      insurerExits: [{ insurer: "Pacific Mutual", exitDate: "2025-03-01", reason: "Climate risk exposure" }],
      insurerEntries: [],
      netInsurerChange: -1,
      floodInsurance: {
        required: false,
        avgPremium: 850,
        nfipPolicies: 1200,
        privatePolicies: 350,
        repetitiveLossProperties: 8,
        zoneChanges: ["Zone X to Zone AE for 3 properties"],
      },
      windstormInsurance: {
        required: false,
        avgPremium: 0,
        separateDeductible: false,
        deductiblePct: 0,
      },
      claimsDensity: tm(42, 38),
      avgClaimAmount: tm(18500, 15000),
      topClaimTypes: [
        { type: "Wind/Hail", pct: 35, avgAmount: 12000 },
        { type: "Water damage", pct: 28, avgAmount: 15000 },
        { type: "Fire", pct: 8, avgAmount: 85000 },
        { type: "Theft", pct: 12, avgAmount: 5000 },
        { type: "Liability", pct: 10, avgAmount: 22000 },
      ],
      catastropheExposure: {
        hurricaneRisk: "low",
        earthquakeRisk: "none",
        wildfireRisk: "low",
        floodRisk: "moderate",
        tornadoRisk: "moderate",
        hailRisk: "moderate",
      },
      insurabilityRisk: "normal",
      signal: "stable",
    },
    replacementCostAnalysis: {
      estimatedReplacementPerSqft: 195,
      totalReplacementCost: 390000,
      replacementVsMarketValue: 1.12,
      demolitionCost: 12,
      siteWorkCost: 18,
      timeToRebuild: 10,
      codeComplianceAdder: 8,
      greenBuildingPremium: 12,
      historicPreservationAdder: 0,
      trend: "replacement_cost_rising",
    },
    muniBondSignals: {
      generalObligationYield: tm(3.8, 3.2),
      revenueRondYield: tm(4.2, 3.6),
      yieldSpreadVsAAA: 85,
      creditRating: "AA",
      creditRatingTrend: "stable",
      recentIssuances: [
        { purpose: "School construction", amount: 45000000, term: 20, yield: 3.9, date: "2025-09-15" },
        { purpose: "Water infrastructure", amount: 22000000, term: 15, yield: 3.7, date: "2025-06-20" },
      ],
      totalOutstandingDebt: 280000000,
      debtPerCapita: 4200,
      debtServiceRatio: 0.12,
      pensionFundingRatio: 82,
      recentRatingActions: [],
      fiscalHealthSignal: "adequate",
    },
    utilityAndTaxBurden: {
      propertyTaxRate: tm(1.15, 1.10),
      avgAnnualPropertyTax: tm(4025, 3650),
      specialAssessments: [{ name: "Stormwater improvement", annualCost: 180, endDate: "2029-12-31" }],
      hoaFees: { avg: 250, median: 225, trend: "rising" },
      avgMonthlyUtilities: {
        electric: 145, gas: 65, water: 55, sewer: 40, trash: 25, internet: 70, total: 400,
      },
      utilityTrend: "rising",
      transferTaxRate: 0.5,
      recordingFees: 125,
      closingCostEstimate: 2.8,
    },
    costOfOwnership: {
      monthlyMortgageMedian: 2250,
      monthlyPropertyTax: 335,
      monthlyInsurance: 200,
      monthlyHOA: 225,
      monthlyUtilities: 400,
      monthlyMaintenance: 290,
      totalMonthlyCost: 3700,
      totalAnnualCost: 44400,
      costAsPercentOfMedianIncome: 34,
      costVsRenting: 8,
      breakEvenYears: 4.5,
      fiveYearCostComparison: {
        owning: 222000,
        renting: 198000,
        equityBuilt: 65000,
        netAdvantage: 41000,
      },
    },
    costInsuranceScore: 0,
    costSignals: [],
  };
}
