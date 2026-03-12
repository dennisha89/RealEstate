import { NextRequest, NextResponse } from "next/server";
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
    const {
      property,
      financialInputs,
      marketData,
    } = body as {
      property: CompProperty & { estimatedRent: number };
      financialInputs: {
        downPaymentPct: number;
        interestRate: number;
      };
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

    if (!property?.address) {
      return NextResponse.json({ error: "Property address is required" }, { status: 400 });
    }

    // --- Dimension 1: Financial Fundamentals ---
    const financials = analyzeFinancials({
      purchasePrice: property.price,
      estimatedValue: property.price,
      monthlyRent: property.estimatedRent,
      downPaymentPct: financialInputs?.downPaymentPct ?? 20,
      interestRate: financialInputs?.interestRate ?? 7.5,
    });
    const financialScore = scoreFinancials(financials);

    // --- Dimension 2: Comps ---
    const compsData = marketData?.comps ?? generateMockComps(property);
    const comps = analyzeComps(
      { subject: property },
      compsData.properties,
      compsData.distances
    );
    const compsScore = scoreComps(comps);

    // --- Dimension 3: Demographics ---
    const demoData = marketData?.demographics ?? generateMockDemographics();
    const demographics = analyzeDemographics(demoData);
    const demographicScore = scoreDemographics(demographics);

    // --- Dimension 4: Economy ---
    const econData = marketData?.economy ?? generateMockEconomy();
    const economy = analyzeEconomy(econData);
    const economicScore = scoreEconomy(economy);

    // --- Dimension 5: Infrastructure ---
    const infraData = marketData?.infrastructure ?? generateMockInfrastructure();
    const infrastructure = analyzeInfrastructure(infraData);
    const infrastructureScore = scoreInfrastructure(infrastructure);

    // --- Dimension 6: Quality of Life ---
    const qolData = marketData?.qualityOfLife ?? generateMockQualityOfLife();
    const qualityOfLife = analyzeQualityOfLife(qolData);
    const qualityOfLifeScore = scoreQualityOfLife(qualityOfLife);

    // --- Dimension 7: Supply-Demand ---
    const sdData = marketData?.supplyDemand ?? generateMockSupplyDemand();
    const supplyDemand = analyzeSupplyDemand(sdData);
    const supplyDemandScore = scoreSupplyDemand(supplyDemand);

    // --- Dimension 8: Macro & Risk ---
    const macroData = marketData?.macroRisk ?? generateMockMacroRisk(financialInputs?.interestRate ?? 7.5, property.price * 0.8);
    const macroRisk = analyzeMacroRisk(macroData);
    const macroRiskScore = scoreMacroRisk(macroRisk);

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
      dataFreshness: {
        financial: "real-time",
        comps: "mock",
        demographics: "mock",
        economy: "mock",
        infrastructure: "mock",
        qualityOfLife: "mock",
        supplyDemand: "mock",
        macroRisk: "mock",
      },
    };

    return NextResponse.json({
      analysis: result,
      summary: generateHyperScoreSummary(hyperScore),
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
// ============================================================

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
