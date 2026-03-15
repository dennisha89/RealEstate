import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFinancials, scoreFinancials } from "@/lib/engines/financial-engine";
import { analyzeComps, scoreComps, type CompProperty } from "@/lib/engines/comps-engine";
import { analyzeDemographics, scoreDemographics, type RawDemographicData } from "@/lib/engines/demographic-engine";
import { analyzeEconomy, scoreEconomy, type RawEconomicData } from "@/lib/engines/economic-engine";
import { analyzeInfrastructure, scoreInfrastructure, type RawInfrastructureData } from "@/lib/engines/infrastructure-engine";
import { analyzeQualityOfLife, scoreQualityOfLife, type RawQualityOfLifeData } from "@/lib/engines/quality-of-life-engine";
import { analyzeSupplyDemand, scoreSupplyDemand, type RawSupplyDemandData } from "@/lib/engines/supply-demand-engine";
import { analyzeMacroRisk, scoreMacroRisk, type RawMacroRiskData } from "@/lib/engines/macro-risk-engine";
import { predictAppreciation, extractKPIDrivers, type AppreciationFeatures } from "@/lib/engines/appreciation-engine";
import { computeHyperScore, generateHyperScoreSummary } from "@/lib/engines/hyper-score-engine";
import type { HyperAnalysis } from "@/lib/types/market-intelligence";
import {
  fetchRealDemographics,
  fetchRealFREDData,
  fetchRealBLSData,
  getAvailableDataSources,
  type FREDMacroData,
} from "@/lib/engines/data-bridge";
import { fetchWalkScore, fetchSchoolRatings, fetchRentalEstimate } from "@/lib/engines/data-sources";
import { marketIntelligenceInputSchema, formatZodError } from "@/lib/utils/validation";
import { computeMasterConfluence, type MasterConfluenceResult } from "@/lib/engines/confluence/master-confluence";
import { computeMarketSelectionConfluence, type MarketSelectionInput } from "@/lib/engines/confluence/market-selection-confluence";
import { computeDealQualityConfluence, type DealQualityInput } from "@/lib/engines/confluence/deal-quality-confluence";
import { computeEntryTimingConfluence, type EntryTimingInput } from "@/lib/engines/confluence/entry-timing-confluence";
import { computeRiskConfluence, type RiskConfluenceInput } from "@/lib/engines/confluence/risk-confluence";
import { computePortfolioOptimization, type PortfolioOptimizationInput } from "@/lib/engines/confluence/portfolio-optimization-confluence";

/**
 * POST /api/market-intelligence
 *
 * Full hyper-multidimensional analysis for a property + market.
 * Accepts property details and market data, returns the complete
 * 8-dimension analysis with HyperScore, appreciation prediction,
 * and KPI drivers.
 *
 * In production, market data would be fetched from external APIs
 * (Census, BLS, FRED, GreatSchools, Walk Score, etc).
 * For now, the client passes market data or we use mock data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const bodySchema = z.object({
      property: z.object({
        address: z.string().min(5),
        price: z.number().positive(),
        sqft: z.number().positive(),
        pricePerSqft: z.number().optional(),
        bedrooms: z.number().int().nonnegative(),
        bathrooms: z.number().nonnegative(),
        yearBuilt: z.number().int(),
        estimatedRent: z.number().positive(),
        daysOnMarket: z.number().optional(),
        lotSize: z.number().optional(),
        saleDate: z.string().optional(),
      }),
      financialInputs: z.object({
        downPaymentPct: z.number().min(0).max(100).default(20),
        interestRate: z.number().min(0).max(30).default(7.5),
      }).optional(),
      marketData: z.record(z.string(), z.unknown()).optional(),
    });

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: parsed.error.issues.map(i => ({ field: i.path.join("."), message: i.message })),
      }, { status: 400 });
    }

    const { property, financialInputs, marketData } = parsed.data as {
      property: CompProperty & { estimatedRent: number };
      financialInputs?: { downPaymentPct: number; interestRate: number };
      marketData?: {
        demographics?: RawDemographicData;
        economy?: RawEconomicData;
        infrastructure?: RawInfrastructureData;
        qualityOfLife?: RawQualityOfLifeData;
        supplyDemand?: RawSupplyDemandData;
        macroRisk?: RawMacroRiskData;
        comps?: { properties: CompProperty[]; distances: number[] };
      };
    };

    // Extract zip code from address for API calls
    const zipMatch = property.address.match(/\b(\d{5})\b/);
    const zipCode = zipMatch?.[1];

    // Fetch real data in parallel when API keys are configured
    const availableSources = getAvailableDataSources();

    // Data freshness tracking — records whether each dimension used real API, client-provided, or mock data
    const dataFreshness: Record<string, { source: string; fetchedAt: string; status: string }> = {};
    const now = new Date().toISOString();

    const [realDemographics, realFRED, realBLS, realWalkScore, realSchools, realRental] = await Promise.allSettled([
      zipCode && availableSources.census ? fetchRealDemographics(zipCode) : Promise.resolve(null),
      availableSources.fred ? fetchRealFREDData() : Promise.resolve(null),
      // BLS requires a FIPS code — use zip as fallback placeholder; caller should provide FIPS for accuracy
      zipCode && availableSources.bls ? fetchRealBLSData(zipCode) : Promise.resolve(null),
      // Walk Score requires lat/lng — only fetch if client provides coordinates or we can geocode
      availableSources.walkScore && property.address
        ? fetchWalkScore(process.env.WALKSCORE_API_KEY!, property.address, 0, 0)
        : Promise.resolve(null),
      // GreatSchools requires lat/lng
      availableSources.greatSchools
        ? fetchSchoolRatings(process.env.GREATSCHOOLS_API_KEY!, 0, 0)
        : Promise.resolve(null),
      // RentCast rental estimate
      availableSources.rentcast && property.address
        ? fetchRentalEstimate(process.env.RENTCAST_API_KEY!, property.address)
        : Promise.resolve(null),
    ]);

    const realDemoData = realDemographics.status === "fulfilled" ? realDemographics.value : null;
    const realFREDData = realFRED.status === "fulfilled" ? realFRED.value : null;
    const realBLSData = realBLS.status === "fulfilled" ? realBLS.value : null;
    const realWalkScoreData = realWalkScore.status === "fulfilled" && realWalkScore.value && "data" in realWalkScore.value ? realWalkScore.value : null;
    const realSchoolData = realSchools.status === "fulfilled" && realSchools.value && "data" in realSchools.value ? realSchools.value : null;
    const realRentalData = realRental.status === "fulfilled" && realRental.value && "data" in realRental.value ? realRental.value : null;

    // Extract FRED macro data for rate environment
    const fredData: FREDMacroData | null = realFREDData?.data ?? null;

    // --- Dimension 1: Financial Fundamentals ---
    // Use real FRED mortgage rate if available, otherwise client-provided or default
    const effectiveRate = fredData?.mortgageRate30yr ?? financialInputs?.interestRate ?? 7.5;
    const financials = analyzeFinancials({
      purchasePrice: property.price,
      estimatedValue: property.price,
      monthlyRent: property.estimatedRent,
      downPaymentPct: financialInputs?.downPaymentPct ?? 20,
      interestRate: effectiveRate,
    });
    const financialScore = scoreFinancials(financials);
    dataFreshness.financial = { source: "real-time (client input)", fetchedAt: now, status: "fresh" };

    // --- Dimension 2: Comps ---
    // TODO: Try real ATTOM/RentCast comps data when available
    const compsData = marketData?.comps ?? generateMockComps(property);
    const comps = analyzeComps(
      { subject: property },
      compsData.properties,
      compsData.distances
    );
    const compsScore = scoreComps(comps);
    dataFreshness.comps = {
      source: marketData?.comps ? "client-provided" : "mock",
      fetchedAt: now,
      status: marketData?.comps ? "fresh" : "mock",
    };

    // --- Dimension 3: Demographics ---
    // Priority: client-provided > real Census API > mock
    const demoData = marketData?.demographics ?? realDemoData?.data ?? generateMockDemographics();
    const demographics = analyzeDemographics(demoData);
    const demographicScore = scoreDemographics(demographics);
    dataFreshness.demographics = {
      source: marketData?.demographics ? "client-provided" : realDemoData ? realDemoData.source : "mock",
      fetchedAt: now,
      status: marketData?.demographics ? "fresh" : realDemoData ? "fresh" : "mock",
    };

    // --- Dimension 4: Economy ---
    // Priority: client-provided > real BLS/FRED enriched > mock
    let econData = marketData?.economy ?? generateMockEconomy();
    // Enrich with real BLS employment data if available
    if (!marketData?.economy && realBLSData) {
      econData = {
        ...econData,
        unemployment: {
          ...econData.unemployment,
          current: realBLSData.data.unemploymentRate,
        },
        jobGrowth: {
          ...econData.jobGrowth,
          current: realBLSData.data.jobGrowthPct,
        },
      };
    }
    // Enrich with real FRED macro data if available
    if (!marketData?.economy && fredData) {
      econData = {
        ...econData,
        unemployment: {
          ...econData.unemployment,
          current: fredData.unemploymentRate || econData.unemployment.current,
          nationalAvg: fredData.unemploymentRate || econData.unemployment.nationalAvg,
        },
      };
    }
    const economy = analyzeEconomy(econData);
    const economicScore = scoreEconomy(economy);
    dataFreshness.economy = {
      source: marketData?.economy ? "client-provided" : realBLSData ? realBLSData.source : fredData ? "FRED (partial)" : "mock",
      fetchedAt: now,
      status: marketData?.economy ? "fresh" : realBLSData || fredData ? "fresh" : "mock",
    };

    // --- Dimension 5: Infrastructure ---
    const infraData = marketData?.infrastructure ?? generateMockInfrastructure();
    const infrastructure = analyzeInfrastructure(infraData);
    const infrastructureScore = scoreInfrastructure(infrastructure);
    dataFreshness.infrastructure = {
      source: marketData?.infrastructure ? "client-provided" : "mock",
      fetchedAt: now,
      status: marketData?.infrastructure ? "fresh" : "mock",
    };

    // --- Dimension 6: Quality of Life ---
    // Priority: client-provided > real APIs enriched > mock
    let qolData = marketData?.qualityOfLife ?? generateMockQualityOfLife();
    // Enrich with real Walk Score data if available
    if (!marketData?.qualityOfLife && realWalkScoreData && realWalkScoreData.status !== "error") {
      qolData = {
        ...qolData,
        walkScore: realWalkScoreData.data.walkScore || qolData.walkScore,
        transitScore: realWalkScoreData.data.transitScore || qolData.transitScore,
        bikeScore: realWalkScoreData.data.bikeScore || qolData.bikeScore,
      };
    }
    // Enrich with real GreatSchools data if available
    if (!marketData?.qualityOfLife && realSchoolData && realSchoolData.status !== "error" && Array.isArray(realSchoolData.data) && realSchoolData.data.length > 0) {
      const schools = realSchoolData.data as Array<{ name: string; type: string; rating: number; distance: number }>;
      const elementary = schools.filter(s => s.type === "elementary").map(s => ({ name: s.name, rating: s.rating, distance: s.distance, previousRating: s.rating, trend: "stable" as const }));
      const middle = schools.filter(s => s.type === "middle").map(s => ({ name: s.name, rating: s.rating, distance: s.distance, previousRating: s.rating, trend: "stable" as const }));
      const high = schools.filter(s => s.type === "high").map(s => ({ name: s.name, rating: s.rating, distance: s.distance, previousRating: s.rating, trend: "stable" as const }));
      if (elementary.length > 0 || middle.length > 0 || high.length > 0) {
        qolData = {
          ...qolData,
          schools: {
            elementary: elementary.length > 0 ? elementary : qolData.schools.elementary,
            middle: middle.length > 0 ? middle : qolData.schools.middle,
            high: high.length > 0 ? high : qolData.schools.high,
          },
        };
      }
    }
    const qualityOfLife = analyzeQualityOfLife(qolData);
    const qualityOfLifeScore = scoreQualityOfLife(qualityOfLife);
    {
      const sources: string[] = [];
      if (marketData?.qualityOfLife) sources.push("client-provided");
      else {
        if (realWalkScoreData) sources.push("Walk Score API");
        if (realSchoolData) sources.push("GreatSchools API");
        if (sources.length === 0) sources.push("mock");
      }
      dataFreshness.qualityOfLife = {
        source: sources.join(" + "),
        fetchedAt: now,
        status: marketData?.qualityOfLife ? "fresh" : sources.includes("mock") ? "mock" : "fresh",
      };
    }

    // --- Dimension 7: Supply-Demand ---
    // Priority: client-provided > real RentCast enriched > mock
    let sdData = marketData?.supplyDemand ?? generateMockSupplyDemand();
    // Enrich with real RentCast rental data if available
    if (!marketData?.supplyDemand && realRentalData && realRentalData.status !== "error" && realRentalData.data.estimate > 0) {
      sdData = {
        ...sdData,
        rental: {
          ...sdData.rental,
          medianRent: realRentalData.data.estimate,
        },
      };
    }
    // Enrich with FRED median home price if available
    if (!marketData?.supplyDemand && fredData && fredData.medianHomePrice > 0) {
      sdData = {
        ...sdData,
        rental: {
          ...sdData.rental,
          medianHomePrice: fredData.medianHomePrice,
        },
        affordability: {
          ...sdData.affordability,
          medianHomePrice: fredData.medianHomePrice,
          currentMortgageRate: fredData.mortgageRate30yr || sdData.affordability.currentMortgageRate,
        },
      };
    }
    const supplyDemand = analyzeSupplyDemand(sdData);
    const supplyDemandScore = scoreSupplyDemand(supplyDemand);
    dataFreshness.supplyDemand = {
      source: marketData?.supplyDemand ? "client-provided" : realRentalData ? "RentCast API" : "mock",
      fetchedAt: now,
      status: marketData?.supplyDemand ? "fresh" : realRentalData ? "fresh" : "mock",
    };

    // --- Dimension 8: Macro & Risk ---
    // Use real FRED rates if available to improve macro risk accuracy
    const macroInterestRate = fredData?.mortgageRate30yr ?? financialInputs?.interestRate ?? 7.5;
    const macroData = marketData?.macroRisk ?? generateMockMacroRisk(macroInterestRate, property.price * 0.8);
    // Enrich with real FRED data if available and not client-provided
    if (!marketData?.macroRisk && fredData) {
      macroData.interestRate = {
        ...macroData.interestRate,
        current: fredData.mortgageRate30yr || macroData.interestRate.current,
        forecastDirection: fredData.mortgageRate30yr > fredData.mortgageRate30yrPrior ? "rising"
          : fredData.mortgageRate30yr < fredData.mortgageRate30yrPrior ? "falling" : "stable",
      };
    }
    const macroRisk = analyzeMacroRisk(macroData);
    const macroRiskScore = scoreMacroRisk(macroRisk);
    dataFreshness.macroRisk = {
      source: marketData?.macroRisk ? "client-provided" : fredData ? "FRED API" : "mock",
      fetchedAt: now,
      status: marketData?.macroRisk ? "fresh" : fredData ? "fresh" : "mock",
    };

    // --- Appreciation Prediction ---
    const appreciationFeatures = buildAppreciationFeatures(demographics, economy, supplyDemand, infrastructure, qualityOfLife, macroRisk);
    const appreciation = predictAppreciation(appreciationFeatures);

    // --- KPI Drivers ---
    const kpiDrivers = extractKPIDrivers(appreciationFeatures, {
      financial: financialScore.score,
      comps: compsScore.score,
      demographic: demographicScore.score,
      economic: economicScore.score,
      infrastructure: infrastructureScore.score,
      qualityOfLife: qualityOfLifeScore.score,
      supplyDemand: supplyDemandScore.score,
      macroRisk: macroRiskScore.score,
    });

    // --- Composite HyperScore ---
    const hyperScore = computeHyperScore({
      financial: financialScore,
      comps: compsScore,
      demographic: demographicScore,
      economic: economicScore,
      infrastructure: infrastructureScore,
      qualityOfLife: qualityOfLifeScore,
      supplyDemand: supplyDemandScore,
      macroRisk: macroRiskScore,
    }, kpiDrivers);

    // --- Rate Environment (from FRED macro data) ---
    const rateChange6mo = (fredData?.mortgageRate30yr ?? 6.95) - (fredData?.mortgageRate30yrPrior ?? 6.80);
    const rateEnvironment = {
      mortgageRate30yr: fredData?.mortgageRate30yr ?? 6.95,
      fedFundsRate: fredData?.fedFundsRate ?? 5.33,
      rateChange6mo,
      rateDirection: rateChange6mo > 0.25 ? "rising" as const
        : rateChange6mo < -0.25 ? "falling" as const
        : "stable" as const,
      source: fredData ? "FRED API" : "default estimates",
    };

    // --- Confluence Analysis (best-effort) ---
    // Runs the 5 confluence engines + master confluence after all dimensions are scored.
    // This is the highest-confidence decision layer — it cross-validates independent engines.
    let confluence: MasterConfluenceResult | null = null;
    try {
      // Build inputs for each confluence engine from dimension scores
      const marketSelectionInput: MarketSelectionInput = {
        hyperScore: hyperScore.overall,
        demographicScore: demographicScore.score,
        economicScore: economicScore.score,
        infrastructureScore: infrastructureScore.score,
        leadingLayerScore: 0,       // Would come from stacked signals if available
        leadingConcordance: 0.5,    // Default moderate concordance
        capitalFlowDirection: "balanced",
        capitalFlowScore: 50,
        institutionalActivity: "stable",
        priceToRentRatio: property.price / (property.estimatedRent * 12),
        priceToIncomeRatio: supplyDemand.affordability.priceToIncomeRatio,
        affordabilityIndex: supplyDemand.affordability.affordabilityIndex,
        rentYield: (property.estimatedRent * 12) / property.price * 100,
      };

      const dealQualityInput: DealQualityInput = {
        capRate: financials.capRate,
        cashOnCash: financials.cashOnCashReturn,
        monthlyCashFlow: financials.monthlyCashFlow,
        dscr: financials.debtServiceCoverageRatio,
        stressTestSurvival: financials.mortgageStressTest.scenarios.every(s => s.cashFlow > 0),
        askingPrice: property.price,
        impliedValue: comps.summary.impliedValue,
        pricePerSqft: property.pricePerSqft || (property.price / property.sqft),
        compsPricePerSqft: comps.summary.medianPricePerSqft,
        priceDirection: comps.summary.priceDirection === "accelerating" ? "rising"
          : comps.summary.priceDirection === "decelerating" ? "falling" : "stable",
        dealType: "standard",
        daysOnMarket: property.daysOnMarket ?? comps.summary.medianDaysOnMarket,
        hyperScore: hyperScore.overall,
        cashFlowAtWorstCase: financials.mortgageStressTest.scenarios.length > 0
          ? financials.mortgageStressTest.scenarios[financials.mortgageStressTest.scenarios.length - 1].cashFlow
          : financials.monthlyCashFlow,
        breakEvenVacancy: financials.breakEvenOccupancy,
      };

      const entryTimingInput: EntryTimingInput = {
        timingSignal: macroRisk.marketCyclePosition === "early_expansion" || macroRisk.marketCyclePosition === "recovery" ? "BUY_NOW"
          : macroRisk.marketCyclePosition === "mid_expansion" ? "FAVORABLE"
          : macroRisk.marketCyclePosition === "late_expansion" || macroRisk.marketCyclePosition === "peak" ? "MARKET_PEAKING"
          : macroRisk.marketCyclePosition === "trough" ? "WAIT" : "NEUTRAL",
        timingConfidence: 60,
        trajectoryDirection: "stable",
        optimalWindowMonths: 6,
        compositeScore: 0,
        compositeScorePrevMonth: 0,
        probability: 50,
        signalConcordance: 0.5,
        transactionVelocity: supplyDemand.marketTemperature === "hot" ? "accelerating"
          : supplyDemand.marketTemperature === "cold" ? "decelerating" : "stable",
        capitalDeploymentRate: "normal",
        daysOnMarket: supplyDemand.daysOnMarket.current,
        mortgageAppRate: "normal",
        currentMonth: new Date().getMonth() + 1,
        mortgageRateChange6mo: rateChange6mo,
        rateDirection: rateEnvironment.rateDirection,
        uspsMigrationTrend: demographics.netMigration.trend === "accelerating" ? "strong_inflow"
          : demographics.netMigration.oneYearChange > 0 ? "moderate_inflow"
          : demographics.netMigration.oneYearChange < 0 ? "moderate_outflow" : "stable",
        utilityConnectionsTrend: "stable",
        searchVolumeTrend: "stable",
      };

      const riskConfluenceInput: RiskConfluenceInput = {
        climateRiskScore: macroRisk.climateRisk.overallScore,
        regulatoryRiskScore: 100 - macroRisk.regulatoryRisk.landlordFriendlinessScore,
        rateSensitivity: Math.abs(macroRisk.interestRateSensitivity.paymentImpactPer1Pct) / 10,
        macroRiskScore: macroRiskScore.score,
        insurerNetChange: 0,
        premiumChange5yr: macroRisk.insuranceRisk.insuranceCostTrend.fiveYearCAGR,
        municipalFiscalHealth: "stable",
        costInsuranceScore: 60,
        bearishSignalCount: 0,
        totalSignalCount: 0,
        bearishConcordance: 0,
        stateConcentration: 0,
        marketConcentration: 0,
        propertyTypeConcentration: 0,
        priceRentDivergence: (property.price / (property.estimatedRent * 12)) > 20 ? 30 : 0,
        priceToIncomeRatio: supplyDemand.affordability.priceToIncomeRatio,
        affordabilityIndex: supplyDemand.affordability.affordabilityIndex,
        priceChangeVsHistorical: 0,
        stressTestPasses: financials.mortgageStressTest.scenarios.every(s => s.cashFlow > 0),
        cashFlowAtStress: financials.mortgageStressTest.scenarios.length > 0
          ? financials.mortgageStressTest.scenarios[financials.mortgageStressTest.scenarios.length - 1].cashFlow
          : financials.monthlyCashFlow,
        breakEvenVacancy: financials.breakEvenOccupancy,
      };

      // Portfolio optimization uses defaults when no portfolio context is provided
      const portfolioInput: PortfolioOptimizationInput = {
        portfolio: {
          totalValue: 0, totalEquity: 0, monthlyIncome: 0,
          propertyCount: 0, avgCapRate: 0, properties: [],
        },
        goalMonthlyCashFlow: 5000,
        currentMonthlyCashFlow: 0,
        monthlyAppreciation: 0,
        monthlyDebtPaydown: 0,
        monthlyCashFlowIncome: 0,
        watchlistAlerts: [],
        watchedMarketTimings: [],
        topDeals: [{
          address: property.address,
          market: zipCode ?? "unknown",
          price: property.price,
          capRate: financials.capRate,
          monthlyCashFlow: financials.monthlyCashFlow,
          hyperScore: hyperScore.overall,
          dealType: "standard",
        }],
      };

      const marketResult = computeMarketSelectionConfluence(marketSelectionInput);
      const dealResult = computeDealQualityConfluence(dealQualityInput);
      const timingResult = computeEntryTimingConfluence(entryTimingInput);
      const riskResult = computeRiskConfluence(riskConfluenceInput);
      const portfolioResult = computePortfolioOptimization(portfolioInput);

      confluence = computeMasterConfluence({
        market: marketResult,
        deal: dealResult,
        timing: timingResult,
        risk: riskResult,
        portfolio: portfolioResult,
      });
    } catch (confluenceError) {
      // Confluence is best-effort — log but don't fail the entire analysis
      console.warn("Confluence analysis failed (non-fatal):", confluenceError);
    }

    const result: HyperAnalysis = {
      property,
      financial: financials,
      comps,
      demographics,
      economy,
      infrastructure,
      qualityOfLife,
      supplyDemand,
      macroRisk,
      hyperScore,
      appreciation,
      generatedAt: new Date().toISOString(),
      dataFreshness: Object.fromEntries(
        Object.entries(dataFreshness).map(([k, v]) => [k, v.source])
      ),
    };

    return NextResponse.json({
      analysis: result,
      summary: generateHyperScoreSummary(hyperScore),
      rateEnvironment,
      confluence,
      dataFreshness,
      availableDataSources: availableSources,
    });
  } catch (error) {
    console.error("Market intelligence error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

// --- Build appreciation features from analyzed dimensions ---
function buildAppreciationFeatures(
  demographics: ReturnType<typeof analyzeDemographics>,
  economy: ReturnType<typeof analyzeEconomy>,
  supplyDemand: ReturnType<typeof analyzeSupplyDemand>,
  infrastructure: ReturnType<typeof analyzeInfrastructure>,
  qualityOfLife: ReturnType<typeof analyzeQualityOfLife>,
  macroRisk: ReturnType<typeof analyzeMacroRisk>
): AppreciationFeatures {
  return {
    populationGrowthRate3yr: demographics.populationGrowth.threeYearCAGR,
    medianIncomeGrowthRate3yr: demographics.medianHouseholdIncome.threeYearCAGR,
    jobGrowthRate3yr: economy.jobGrowthRate.threeYearCAGR,
    buildingPermitsTrend: infrastructure.buildingPermits.residential.oneYearChange,
    monthsOfInventoryTrend: supplyDemand.monthsOfInventory.oneYearChange,
    rentGrowthRate3yr: supplyDemand.rentalMarket.rentGrowthRate.threeYearCAGR,
    schoolRatingChange: qualityOfLife.schoolRatings.ratingTrend === "improving" ? 0.5 : qualityOfLife.schoolRatings.ratingTrend === "declining" ? -0.5 : 0,
    crimeRateChange: qualityOfLife.crimeRate.overallTrend === "improving" ? -1 : qualityOfLife.crimeRate.overallTrend === "worsening" ? 1 : 0,
    transitScoreChange: 0, // Would come from Walk Score API delta
    majorEmployerEvents: economy.majorEmployers.filter(e => e.recentEvent === "expanding" || e.recentEvent === "relocating_in").length - economy.majorEmployers.filter(e => e.recentEvent === "relocating_out" || e.recentEvent === "layoffs").length,
    zoningChangeImpact: infrastructure.zoningChanges.filter(z => z.densityImpact === "increase").length - infrastructure.zoningChanges.filter(z => z.densityImpact === "decrease").length,
    interestRateForecast: macroRisk.interestRateSensitivity.forecastDirection === "falling" ? -0.5 : macroRisk.interestRateSensitivity.forecastDirection === "rising" ? 0.5 : 0,
    walkScoreChange: 0,
    affordabilityIndex: supplyDemand.affordability.affordabilityIndex / 100,
    daysOnMarketTrend: supplyDemand.daysOnMarket.oneYearChange,
    listToSaleRatioTrend: supplyDemand.listToSaleRatio.oneYearChange,
  };
}

// ============================================================
// Mock data generators (for development / demo)
// In production, these are replaced by real API calls
// TODO: Replace with import from @/lib/mock/generators
// ============================================================

// TODO: Replace with import from @/lib/mock/generators
function generateMockComps(subject: CompProperty) {
  const basePrice = subject.price;
  const comps: CompProperty[] = [];
  const distances: number[] = [];

  for (let i = 0; i < 6; i++) {
    const priceDelta = (Math.random() - 0.5) * 0.2 * basePrice;
    const sqftDelta = Math.round((Math.random() - 0.5) * 400);
    comps.push({
      address: `${100 + i * 20} ${["Oak", "Elm", "Pine", "Maple", "Cedar", "Birch"][i]} St`,
      price: Math.round(basePrice + priceDelta),
      sqft: subject.sqft + sqftDelta,
      pricePerSqft: 0,
      bedrooms: subject.bedrooms + Math.round((Math.random() - 0.5) * 2),
      bathrooms: subject.bathrooms + Math.round(Math.random()),
      yearBuilt: subject.yearBuilt + Math.round((Math.random() - 0.5) * 10),
      daysOnMarket: Math.round(Math.random() * 60) + 5,
      saleDate: new Date(Date.now() - Math.random() * 180 * 86400000).toISOString().split("T")[0],
    });
    comps[i].pricePerSqft = Math.round(comps[i].price / comps[i].sqft);
    distances.push(Math.round((0.1 + Math.random() * 0.9) * 10) / 10);
  }

  return { properties: comps, distances };
}

// TODO: Replace with import from @/lib/mock/generators
function generateMockDemographics(): RawDemographicData {
  return {
    population: { current: 52000, oneYearAgo: 50800, threeYearAgo: 48000, fiveYearAgo: 45000, nationalAvg: 0 },
    medianIncome: { current: 78000, oneYearAgo: 74000, threeYearAgo: 68000, fiveYearAgo: 62000, nationalAvg: 75000 },
    netMigration: { current: 1200, oneYearAgo: 1000, threeYearAgo: 800, fiveYearAgo: 500 },
    professionals: {
      doctors: { current: 3.2, oneYearAgo: 3.0, threeYearAgo: 2.7, fiveYearAgo: 2.4 },
      engineers: { current: 5.1, oneYearAgo: 4.8, threeYearAgo: 4.2, fiveYearAgo: 3.5 },
      tech: { current: 8.5, oneYearAgo: 7.8, threeYearAgo: 6.5, fiveYearAgo: 5.0 },
      highIncome: { current: 18.5, oneYearAgo: 17.2, threeYearAgo: 15.0, fiveYearAgo: 13.0 },
    },
    education: {
      bachelors: { current: 42, oneYearAgo: 40.5, threeYearAgo: 38, fiveYearAgo: 35, nationalAvg: 33 },
      graduate: { current: 15, oneYearAgo: 14.5, threeYearAgo: 13, fiveYearAgo: 12, nationalAvg: 13 },
    },
    ageCohorts: {
      millennials: { current: 28, oneYearAgo: 27, threeYearAgo: 25, fiveYearAgo: 23 },
      youngFamilies: { current: 15, oneYearAgo: 14.5, threeYearAgo: 13, fiveYearAgo: 12 },
      retirees: { current: 12, oneYearAgo: 12.5, threeYearAgo: 13, fiveYearAgo: 14 },
    },
    householdFormation: { current: 2.1, oneYearAgo: 1.9, threeYearAgo: 1.7, fiveYearAgo: 1.5 },
  };
}

// TODO: Replace with import from @/lib/mock/generators
function generateMockEconomy(): RawEconomicData {
  return {
    jobGrowth: { current: 3.2, oneYearAgo: 2.8, threeYearAgo: 2.0, fiveYearAgo: 1.5, nationalAvg: 1.8 },
    unemployment: { current: 3.8, oneYearAgo: 4.1, threeYearAgo: 4.5, fiveYearAgo: 5.2, nationalAvg: 4.0 },
    wageGrowth: { current: 4.5, oneYearAgo: 4.0, threeYearAgo: 3.5, fiveYearAgo: 3.0, nationalAvg: 3.8 },
    costOfLivingIndex: 105,
    costOfLivingGrowthRate: 3.2,
    businessPermits: { current: 450, oneYearAgo: 400, threeYearAgo: 350, fiveYearAgo: 280 },
    metroGDP: { current: 4.1, oneYearAgo: 3.8, threeYearAgo: 3.2, fiveYearAgo: 2.8, nationalAvg: 2.5 },
    majorEmployers: [
      { name: "Regional Medical Center", industry: "Healthcare", employees: 3500, recentEvent: "expanding" },
      { name: "TechCorp", industry: "Technology", employees: 2200, recentEvent: "relocating_in", eventDate: "2025-06", impactAssessment: "Adding 800 jobs over 3 years" },
      { name: "State University", industry: "Education", employees: 4000, recentEvent: "stable" },
    ],
    industries: [
      { name: "Healthcare", pctEmployment: 18 },
      { name: "Technology", pctEmployment: 15 },
      { name: "Education", pctEmployment: 12 },
      { name: "Retail", pctEmployment: 10 },
      { name: "Manufacturing", pctEmployment: 8 },
      { name: "Finance", pctEmployment: 7 },
      { name: "Government", pctEmployment: 6 },
      { name: "Other", pctEmployment: 24 },
    ],
  };
}

// TODO: Replace with import from @/lib/mock/generators
function generateMockInfrastructure(): RawInfrastructureData {
  return {
    buildingPermitsResidential: { current: 320, oneYearAgo: 280, threeYearAgo: 220, fiveYearAgo: 180 },
    buildingPermitsCommercial: { current: 45, oneYearAgo: 38, threeYearAgo: 30, fiveYearAgo: 25 },
    permitTotalValue: { current: 180000000, oneYearAgo: 150000000, threeYearAgo: 120000000, fiveYearAgo: 90000000 },
    zoningChanges: [
      { area: "Downtown Corridor", fromZone: "C-2", toZone: "MX-3", densityImpact: "increase", estimatedUnits: 500, status: "approved", date: "2025-09" },
    ],
    transitProjects: [
      { name: "BRT Line Extension", type: "transit", investment: 85000000, status: "under_construction", completionDate: "2027-06", impactRadius: 2, valueImpactEstimate: 8 },
    ],
    commercialDevelopment: [
      { name: "Town Center Mixed Use", type: "mixed_use", investment: 45000000, status: "under_construction", completionDate: "2026-12", impactRadius: 1, valueImpactEstimate: 5 },
    ],
    medicalFacilities: [
      { name: "Urgent Care Expansion", type: "medical", investment: 12000000, status: "planned", completionDate: "2027-03", impactRadius: 3, valueImpactEstimate: 2 },
    ],
    schoolProjects: [
      { name: "New Elementary School", type: "school", investment: 35000000, status: "under_construction", completionDate: "2027-08", impactRadius: 2, valueImpactEstimate: 4 },
    ],
    techOfficeOpenings: [
      { name: "TechCorp Regional HQ", type: "office", investment: 60000000, status: "under_construction", completionDate: "2026-09", impactRadius: 3, valueImpactEstimate: 6 },
    ],
  };
}

// TODO: Replace with import from @/lib/mock/generators
function generateMockQualityOfLife(): RawQualityOfLifeData {
  return {
    schools: {
      elementary: [
        { name: "Lincoln Elementary", rating: 8, distance: 0.5, previousRating: 7, trend: "improving" },
        { name: "Washington Elementary", rating: 7, distance: 1.2, previousRating: 7, trend: "stable" },
      ],
      middle: [
        { name: "Jefferson Middle", rating: 7, distance: 1.5, previousRating: 6, trend: "improving" },
      ],
      high: [
        { name: "Roosevelt High", rating: 8, distance: 2.0, previousRating: 8, trend: "stable" },
      ],
    },
    crime: {
      violentPer1000: { current: 2.1, oneYearAgo: 2.3, threeYearAgo: 2.8, fiveYearAgo: 3.2 },
      propertyPer1000: { current: 15.5, oneYearAgo: 16.2, threeYearAgo: 18.0, fiveYearAgo: 20.0 },
      metroAvgViolent: 2.8,
      metroAvgProperty: 18.0,
    },
    walkScore: 72,
    transitScore: 55,
    bikeScore: 65,
    healthcare: { doctorsPerCapita: 3.2, nearestHospitalMiles: 2.5, hospitalRating: 4 },
    greenSpace: { parkAcresPerCapita: 0.08, nearestParkMiles: 0.3 },
    neighborhood: { restaurantsPerCapita: 0.006, retailDensity: 12, nightlifeScore: 6 },
  };
}

// TODO: Replace with import from @/lib/mock/generators
function generateMockSupplyDemand(): RawSupplyDemandData {
  return {
    monthsOfInventory: { current: 3.2, oneYearAgo: 3.8, threeYearAgo: 4.5, fiveYearAgo: 5.5 },
    daysOnMarket: { current: 28, oneYearAgo: 35, threeYearAgo: 42, fiveYearAgo: 55 },
    listToSaleRatio: { current: 0.99, oneYearAgo: 0.97, threeYearAgo: 0.95, fiveYearAgo: 0.93 },
    newConstruction: {
      unitsPlanned: 350,
      unitsUnderConstruction: 180,
      estimatedDeliveryMonths: 18,
      monthlySalesRate: 25,
    },
    rental: {
      vacancyRate: { current: 4.2, oneYearAgo: 4.8, threeYearAgo: 5.5, fiveYearAgo: 6.2 },
      rentGrowthRate: { current: 5.5, oneYearAgo: 4.8, threeYearAgo: 3.5, fiveYearAgo: 2.8 },
      medianRent: 1800,
      medianHomePrice: 380000,
    },
    affordability: {
      medianHomePrice: 380000,
      medianHouseholdIncome: 78000,
      currentMortgageRate: 7.0,
    },
  };
}

// TODO: Replace with import from @/lib/mock/generators
function generateMockMacroRisk(interestRate: number, loanAmount: number): RawMacroRiskData {
  return {
    interestRate: { current: interestRate, forecastDirection: "stable", loanAmount, loanTermYears: 30 },
    propertyTax: {
      currentRate: 0.0125,
      assessmentHistory: { current: 380000, oneYearAgo: 360000, threeYearAgo: 320000, fiveYearAgo: 280000 },
    },
    insurance: {
      floodZone: false,
      wildfireRisk: "low",
      hurricaneRisk: "low",
      earthquakeRisk: "low",
      insuranceCostHistory: { current: 1800, oneYearAgo: 1650, threeYearAgo: 1400, fiveYearAgo: 1200 },
    },
    climate: { overallScore: 25, heatRisk: "low", seaLevelRisk: "none", droughtRisk: "low" },
    regulatory: { rentControlActive: false, rentControlProposed: false, evictionMoratoriumHistory: false, landlordFriendlinessScore: 75 },
    marketCyclePosition: "mid_expansion",
  };
}
