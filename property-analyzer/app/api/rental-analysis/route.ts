import { NextRequest, NextResponse } from "next/server";
import {
  estimateRent,
  buildRentalMarketMetrics,
  analyzeSeasonality,
  calculateInvestorMetrics,
  type ComparableRental,
  type RentalAnalysis,
  type RentalScope,
  type HistoricalRentData,
} from "@/lib/engines/rental-analysis-engine";

/**
 * POST /api/rental-analysis
 *
 * Deep rental analysis at any scope: address, street, zip, city, or state.
 * Returns rent estimate, comps, market metrics, seasonality, tenant demographics,
 * regulatory environment, investor metrics, and historical rent data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scope, property, financials } = body as {
      scope: RentalScope;
      property?: {
        sqft: number;
        bedrooms: number;
        bathrooms: number;
        yearBuilt: number;
        condition?: "new" | "renovated" | "average" | "needs_work";
        amenities?: string[];
        parking?: boolean;
        petFriendly?: boolean;
        propertyValue?: number;
      };
      financials?: {
        monthlyMortgage: number;
        monthlyExpenses: number;
      };
    };

    if (!scope?.type) {
      return NextResponse.json({ error: "Scope type is required (address, street, zip, city, state)" }, { status: 400 });
    }

    // Generate mock data for demo (in production, pull from RentCast, ATTOM, etc.)
    const comps = generateMockComps(scope);
    const marketData = generateMockMarketData(scope);
    const marketMetrics = buildRentalMarketMetrics(marketData);
    const historicalRents = generateMockHistoricalRents();

    // Estimate rent for the specific property if provided
    const rentEstimate = property
      ? estimateRent(property, comps, marketMetrics)
      : undefined;

    // Seasonality analysis
    const seasonality = analyzeSeasonality(historicalRents);

    // Investor metrics if financials provided
    const investorMetrics = property && financials && rentEstimate
      ? calculateInvestorMetrics(
          property.propertyValue || 350000,
          rentEstimate.mid,
          financials.monthlyMortgage,
          financials.monthlyExpenses,
          marketMetrics.vacancyRate.current
        )
      : undefined;

    const analysis: RentalAnalysis = {
      scope,
      rentEstimate: rentEstimate || {
        low: marketMetrics.medianRent.current * 0.9,
        mid: marketMetrics.medianRent.current,
        high: marketMetrics.medianRent.current * 1.1,
        confidence: 50,
        methodology: "Market median (no property details provided)",
        adjustments: [],
        pricePerSqft: { low: 0, mid: 0, high: 0 },
      },
      comparableRentals: comps,
      marketMetrics,
      breakdown: generateMockBreakdown(marketMetrics),
      seasonality,
      tenantDemographics: generateMockTenantDemographics(),
      regulatoryEnvironment: generateMockRegulations(scope),
      investorMetrics: investorMetrics || {
        grossYield: 0, netYield: 0, priceToRentRatio: 0, breakEvenRent: 0,
        cashFlowAtMarketRent: 0, rentCoverageRatio: 0, timeToBreakEven: 0,
        avgTurnoverCost: 0, annualTurnoverRate: 0.4, effectiveGrossIncome: 0,
        operatingExpenseRatio: 0,
      },
      historicalRents,
    };

    return NextResponse.json({
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Rental analysis error:", error);
    return NextResponse.json({ error: "Rental analysis failed" }, { status: 500 });
  }
}

// --- Mock data generators ---

function generateMockComps(scope: RentalScope): ComparableRental[] {
  const baseRent = 1600 + Math.random() * 800;
  const comps: ComparableRental[] = [];

  for (let i = 0; i < 8; i++) {
    const rent = Math.round(baseRent + (Math.random() - 0.5) * 600);
    const sqft = 800 + Math.round(Math.random() * 1200);
    comps.push({
      address: `${100 + i * 25} ${["Oak", "Elm", "Pine", "Maple", "Cedar", "Birch", "Walnut", "Cherry"][i]} ${scope.type === "street" ? scope.street || "St" : "St"}`,
      rent,
      sqft,
      rentPerSqft: Math.round((rent / sqft) * 100) / 100,
      bedrooms: 1 + Math.round(Math.random() * 3),
      bathrooms: 1 + Math.round(Math.random() * 1.5),
      yearBuilt: 1985 + Math.round(Math.random() * 35),
      distance: Math.round((0.1 + Math.random() * 1.5) * 10) / 10,
      daysOnMarket: Math.round(Math.random() * 30) + 3,
      listDate: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split("T")[0],
      amenities: ["Washer/Dryer", "Dishwasher", "Central AC"].slice(0, 1 + Math.round(Math.random() * 2)),
      petPolicy: Math.random() > 0.4 ? "Cats & Dogs OK" : "No Pets",
      parkingIncluded: Math.random() > 0.3,
      utilitiesIncluded: Math.random() > 0.6 ? ["Water", "Trash"] : [],
      similarity: 60 + Math.round(Math.random() * 35),
    });
  }

  return comps.sort((a, b) => b.similarity - a.similarity);
}

function generateMockMarketData(scope: RentalScope) {
  return {
    medianRent: { current: 1850, oneYearAgo: 1720, threeYearAgo: 1500, fiveYearAgo: 1300 },
    averageRent: { current: 1920, oneYearAgo: 1790, threeYearAgo: 1560, fiveYearAgo: 1350 },
    rentPerSqft: { current: 1.45, oneYearAgo: 1.35, threeYearAgo: 1.18, fiveYearAgo: 1.02 },
    vacancyRate: { current: 4.2, oneYearAgo: 4.8, threeYearAgo: 5.5, fiveYearAgo: 6.1 },
    daysToLease: { current: 18, oneYearAgo: 22, threeYearAgo: 28, fiveYearAgo: 35 },
    appVolume: { current: 12, oneYearAgo: 10, threeYearAgo: 8, fiveYearAgo: 6 },
    renewalRate: { current: 62, oneYearAgo: 58, threeYearAgo: 55, fiveYearAgo: 52 },
    rentToIncomeRatio: 0.28,
    affordabilityThreshold: 1950,
    byBedroom: {
      studio: { medianRent: 1200, vacancyRate: 3.5, rentGrowthYoY: 8.5 },
      oneBed: { medianRent: 1500, vacancyRate: 4.0, rentGrowthYoY: 7.8 },
      twoBed: { medianRent: 1850, vacancyRate: 4.2, rentGrowthYoY: 7.5 },
      threeBed: { medianRent: 2200, vacancyRate: 4.5, rentGrowthYoY: 6.8 },
      fourPlusBed: { medianRent: 2800, vacancyRate: 5.2, rentGrowthYoY: 5.5 },
    },
    byPropertyType: {
      singleFamily: { medianRent: 2100, pctOfMarket: 35, rentGrowthYoY: 7.2 },
      apartment: { medianRent: 1600, pctOfMarket: 40, rentGrowthYoY: 8.0 },
      condo: { medianRent: 1900, pctOfMarket: 10, rentGrowthYoY: 6.5 },
      townhouse: { medianRent: 2000, pctOfMarket: 10, rentGrowthYoY: 7.0 },
      duplex: { medianRent: 1750, pctOfMarket: 5, rentGrowthYoY: 7.5 },
    },
  };
}

function generateMockBreakdown(metrics: ReturnType<typeof buildRentalMarketMetrics>) {
  return {
    distribution: { under1000: 5, range1000to1500: 20, range1500to2000: 35, range2000to2500: 25, range2500to3000: 10, over3000: 5 },
    amenityPremiums: [
      { amenity: "In-unit W/D", avgPremium: 125, pctOfListingsWithAmenity: 45 },
      { amenity: "Garage parking", avgPremium: 100, pctOfListingsWithAmenity: 30 },
      { amenity: "Central AC", avgPremium: 75, pctOfListingsWithAmenity: 60 },
      { amenity: "Updated kitchen", avgPremium: 150, pctOfListingsWithAmenity: 35 },
      { amenity: "Fenced yard", avgPremium: 100, pctOfListingsWithAmenity: 25 },
      { amenity: "Pool", avgPremium: 75, pctOfListingsWithAmenity: 10 },
    ],
    locationPremiums: [
      { subArea: "Near downtown", premiumVsZipMedian: 12, reasoning: "Walk to restaurants, nightlife, offices" },
      { subArea: "School district zone A", premiumVsZipMedian: 8, reasoning: "Top-rated elementary school zone" },
      { subArea: "Near transit station", premiumVsZipMedian: 6, reasoning: "Commuter convenience premium" },
      { subArea: "Outer neighborhoods", premiumVsZipMedian: -10, reasoning: "Further from amenities, car-dependent" },
    ],
    conditionAdjustments: { newConstruction: 15, recentlyRenovated: 10, averageCondition: 0, needsWork: -12 },
    furnishedPremium: 35,
    shortTermRental: {
      estimatedNightlyRate: 135,
      estimatedOccupancy: 68,
      estimatedMonthlyRevenue: 2754,
      vsLongTermRent: 49,
      regulatoryAllowed: true,
      permitRequired: true,
      competingListings: 85,
    },
  };
}

function generateMockTenantDemographics() {
  return {
    renterPct: 42, avgAge: 34, avgHouseholdSize: 2.3, avgIncome: 65000,
    avgCreditScore: 680, avgLengthOfStay: 18, topEmployers: ["Regional Medical Center", "TechCorp", "State University"],
    studentPct: 12, militaryPct: 3, section8Pct: 8, petOwnerPct: 45,
    evictionRate: 2.1, avgDaysDelinquent: 5,
  };
}

function generateMockRegulations(scope: RentalScope) {
  return {
    rentControlActive: false, justCauseEviction: false, relocationAssistanceRequired: false,
    shortTermRentalRestrictions: "Permitted with annual permit ($150/yr), 90-day annual cap",
    securityDepositLimit: 2, requiredDisclosures: ["Lead paint (pre-1978)", "Mold", "Sex offender registry"],
    landlordLicenseRequired: true, inspectionRequired: true, leadPaintDisclosure: true,
    bedbugDisclosure: false, habitabilityStandards: "Must meet International Building Code minimums",
  };
}

function generateMockHistoricalRents(): HistoricalRentData[] {
  const data: HistoricalRentData[] = [];
  let rent = 1300;

  for (let y = 2020; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 3) break;
      const seasonal = Math.sin((m - 1) / 12 * Math.PI * 2) * 30;
      rent = rent * (1 + (0.004 + Math.random() * 0.003));
      data.push({
        date: `${y}-${m.toString().padStart(2, "0")}`,
        medianRent: Math.round(rent + seasonal),
        avgRent: Math.round(rent * 1.04 + seasonal),
        vacancyRate: Math.round((5 + Math.sin((m - 4) / 12 * Math.PI * 2) * 1.5) * 10) / 10,
        inventory: Math.round(200 + Math.random() * 80),
        yoyChange: Math.round((rent / (rent / 1.065) - 1) * 10000) / 100,
      });
    }
  }

  return data;
}
