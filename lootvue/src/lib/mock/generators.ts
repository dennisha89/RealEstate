// ============================================================
// Centralized Mock Data Generators
// ============================================================
//
// All mock data generators live here. In production, every one of
// these is replaced by real API calls routed through data-bridge.ts.
//
// Generators are deterministic: given the same zip / address, they
// return the same values across page loads (seeded PRNG).
// ============================================================

import type { PropertyData } from "@/lib/calculator";
import type { RawDemographicData } from "@/lib/engines/demographic-engine";
import type { RawEconomicData } from "@/lib/engines/economic-engine";
import type { RawInfrastructureData } from "@/lib/engines/infrastructure-engine";
import type { RawQualityOfLifeData } from "@/lib/engines/quality-of-life-engine";
import type { RawSupplyDemandData } from "@/lib/engines/supply-demand-engine";
import type { RawMacroRiskData } from "@/lib/engines/macro-risk-engine";
import type { AppreciationFeatures } from "@/lib/engines/appreciation-engine";
import type { CompProperty } from "@/lib/engines/comps-engine";
import type {
  ComparableRental,
  RentalScope,
  HistoricalRentData,
  TenantDemographics,
  RentalRegulations,
  RentalBreakdown,
  RentalMarketMetrics,
  RawRentalMarketData,
} from "@/lib/engines/rental-analysis-engine";
import type { FREDMacroData } from "@/lib/engines/data-bridge";

// ============================================================
// Deterministic Seeded PRNG
// ============================================================

/**
 * Returns a seeded pseudo-random number generator.
 * Given the same seed string, the sequence of numbers is identical.
 * Uses a simple mulberry32 algorithm.
 */
export function seededRandom(seed: string): () => number {
  let h = seed.split("").reduce((acc, char) => {
    acc = ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    return acc;
  }, 0);
  // Ensure positive starting state
  h = Math.abs(h) || 1;

  return function mulberry32(): number {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute a numeric hash from a string (used for deterministic offsets).
 */
function hashString(s: string): number {
  return s.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

// ============================================================
// 1. Property Data (from /api/analyze)
// ============================================================

/**
 * Generate fake property specs from an address string.
 * Deterministic: the same address always yields the same property.
 */
export function generateMockPropertyData(address: string): PropertyData {
  const hash = hashString(address);

  const estimatedValue = 250000 + (hash % 500000);
  const bedrooms = 2 + (hash % 4);
  const bathrooms = 1 + (hash % 3);
  const sqft = 1000 + (hash % 2000);
  const estimatedRent = Math.round(estimatedValue * 0.007 + sqft * 0.5);

  return {
    address,
    estimatedValue: Math.round(estimatedValue),
    estimatedRent,
    bedrooms,
    bathrooms,
    sqft,
    yearBuilt: 1990 + (hash % 35),
    propertyType: "Single Family",
  };
}

// ============================================================
// 2. Comparable Sales (from /api/market-intelligence)
// ============================================================

/**
 * Generate 6 comparable-sale properties around a subject property.
 * Used by the comps-engine dimension.
 */
export function generateMockComps(
  subject: CompProperty
): { properties: CompProperty[]; distances: number[] } {
  const rand = seededRandom(subject.address);
  const basePrice = subject.price;
  const comps: CompProperty[] = [];
  const distances: number[] = [];
  const streets = ["Oak", "Elm", "Pine", "Maple", "Cedar", "Birch"];

  for (let i = 0; i < 6; i++) {
    const priceDelta = (rand() - 0.5) * 0.2 * basePrice;
    const sqftDelta = Math.round((rand() - 0.5) * 400);
    const comp: CompProperty = {
      address: `${100 + i * 20} ${streets[i]} St`,
      price: Math.round(basePrice + priceDelta),
      sqft: subject.sqft + sqftDelta,
      pricePerSqft: 0,
      bedrooms: subject.bedrooms + Math.round((rand() - 0.5) * 2),
      bathrooms: subject.bathrooms + Math.round(rand()),
      yearBuilt: subject.yearBuilt + Math.round((rand() - 0.5) * 10),
      daysOnMarket: Math.round(rand() * 60) + 5,
      saleDate: new Date(
        Date.now() - rand() * 180 * 86400000
      )
        .toISOString()
        .split("T")[0],
    };
    comp.pricePerSqft = Math.round(comp.price / comp.sqft);
    comps.push(comp);
    distances.push(Math.round((0.1 + rand() * 0.9) * 10) / 10);
  }

  return { properties: comps, distances };
}

// ============================================================
// 3. Demographics (Dimension 3)
// ============================================================

/**
 * Generate demographic data for a zip code.
 * Returns data matching the RawDemographicData interface.
 */
export function generateMockDemographics(zip: string = "00000"): RawDemographicData {
  const rand = seededRandom(`demo-${zip}`);
  const popBase = 40000 + Math.round(rand() * 30000);
  const incBase = 60000 + Math.round(rand() * 40000);

  return {
    population: {
      current: popBase + Math.round(rand() * 12000),
      oneYearAgo: popBase + Math.round(rand() * 8000),
      threeYearAgo: popBase + Math.round(rand() * 4000),
      fiveYearAgo: popBase,
      nationalAvg: 0,
    },
    medianIncome: {
      current: incBase + Math.round(rand() * 16000),
      oneYearAgo: incBase + Math.round(rand() * 10000),
      threeYearAgo: incBase + Math.round(rand() * 6000),
      fiveYearAgo: incBase,
      nationalAvg: 75000,
    },
    netMigration: {
      current: 800 + Math.round(rand() * 800),
      oneYearAgo: 600 + Math.round(rand() * 600),
      threeYearAgo: 400 + Math.round(rand() * 500),
      fiveYearAgo: 200 + Math.round(rand() * 400),
    },
    professionals: {
      doctors: {
        current: 2.5 + rand() * 1.5,
        oneYearAgo: 2.3 + rand() * 1.2,
        threeYearAgo: 2.0 + rand() * 1.0,
        fiveYearAgo: 1.8 + rand() * 0.8,
      },
      engineers: {
        current: 4.0 + rand() * 2.5,
        oneYearAgo: 3.7 + rand() * 2.0,
        threeYearAgo: 3.2 + rand() * 1.5,
        fiveYearAgo: 2.8 + rand() * 1.2,
      },
      tech: {
        current: 6.0 + rand() * 4.0,
        oneYearAgo: 5.5 + rand() * 3.5,
        threeYearAgo: 4.5 + rand() * 3.0,
        fiveYearAgo: 3.5 + rand() * 2.5,
      },
      highIncome: {
        current: 15.0 + rand() * 6.0,
        oneYearAgo: 14.0 + rand() * 5.0,
        threeYearAgo: 12.0 + rand() * 4.5,
        fiveYearAgo: 10.0 + rand() * 4.0,
      },
    },
    education: {
      bachelors: {
        current: 35 + rand() * 15,
        oneYearAgo: 33 + rand() * 14,
        threeYearAgo: 30 + rand() * 13,
        fiveYearAgo: 28 + rand() * 12,
        nationalAvg: 33,
      },
      graduate: {
        current: 11 + rand() * 8,
        oneYearAgo: 10.5 + rand() * 7,
        threeYearAgo: 9.5 + rand() * 6,
        fiveYearAgo: 8.5 + rand() * 5.5,
        nationalAvg: 13,
      },
    },
    ageCohorts: {
      millennials: {
        current: 24 + rand() * 8,
        oneYearAgo: 23 + rand() * 7,
        threeYearAgo: 21 + rand() * 6,
        fiveYearAgo: 19 + rand() * 6,
      },
      youngFamilies: {
        current: 12 + rand() * 6,
        oneYearAgo: 11.5 + rand() * 5,
        threeYearAgo: 10 + rand() * 5,
        fiveYearAgo: 9 + rand() * 4.5,
      },
      retirees: {
        current: 10 + rand() * 5,
        oneYearAgo: 10.5 + rand() * 5,
        threeYearAgo: 11 + rand() * 5,
        fiveYearAgo: 12 + rand() * 4,
      },
    },
    householdFormation: {
      current: 1.5 + rand() * 1.2,
      oneYearAgo: 1.4 + rand() * 1.0,
      threeYearAgo: 1.2 + rand() * 0.8,
      fiveYearAgo: 1.0 + rand() * 0.7,
    },
  };
}

// ============================================================
// 4. Economy (Dimension 4)
// ============================================================

/**
 * Generate economic data for a zip / metro area.
 * Returns data matching the RawEconomicData interface.
 */
export function generateMockEconomy(zip: string = "00000"): RawEconomicData {
  const rand = seededRandom(`econ-${zip}`);

  return {
    jobGrowth: {
      current: 1.5 + rand() * 3.0,
      oneYearAgo: 1.3 + rand() * 2.5,
      threeYearAgo: 1.0 + rand() * 2.0,
      fiveYearAgo: 0.5 + rand() * 1.5,
      nationalAvg: 1.8,
    },
    unemployment: {
      current: 3.0 + rand() * 3.0,
      oneYearAgo: 3.3 + rand() * 3.0,
      threeYearAgo: 3.8 + rand() * 3.0,
      fiveYearAgo: 4.2 + rand() * 3.0,
      nationalAvg: 4.0,
    },
    wageGrowth: {
      current: 3.0 + rand() * 3.0,
      oneYearAgo: 2.8 + rand() * 2.5,
      threeYearAgo: 2.5 + rand() * 2.0,
      fiveYearAgo: 2.0 + rand() * 1.5,
      nationalAvg: 3.8,
    },
    costOfLivingIndex: 90 + Math.round(rand() * 30),
    costOfLivingGrowthRate: 2.0 + rand() * 2.5,
    businessPermits: {
      current: 300 + Math.round(rand() * 300),
      oneYearAgo: 260 + Math.round(rand() * 260),
      threeYearAgo: 220 + Math.round(rand() * 220),
      fiveYearAgo: 180 + Math.round(rand() * 180),
    },
    metroGDP: {
      current: 2.5 + rand() * 3.0,
      oneYearAgo: 2.2 + rand() * 2.8,
      threeYearAgo: 1.8 + rand() * 2.5,
      fiveYearAgo: 1.5 + rand() * 2.0,
      nationalAvg: 2.5,
    },
    majorEmployers: [
      {
        name: "Regional Medical Center",
        industry: "Healthcare",
        employees: 2500 + Math.round(rand() * 2000),
        recentEvent: "expanding",
      },
      {
        name: "TechCorp",
        industry: "Technology",
        employees: 1500 + Math.round(rand() * 1500),
        recentEvent: "relocating_in",
        eventDate: "2025-06",
        impactAssessment: "Adding 800 jobs over 3 years",
      },
      {
        name: "State University",
        industry: "Education",
        employees: 3000 + Math.round(rand() * 2000),
        recentEvent: "stable",
      },
    ],
    industries: [
      { name: "Healthcare", pctEmployment: 15 + Math.round(rand() * 6) },
      { name: "Technology", pctEmployment: 10 + Math.round(rand() * 10) },
      { name: "Education", pctEmployment: 10 + Math.round(rand() * 5) },
      { name: "Retail", pctEmployment: 8 + Math.round(rand() * 4) },
      { name: "Manufacturing", pctEmployment: 5 + Math.round(rand() * 6) },
      { name: "Finance", pctEmployment: 4 + Math.round(rand() * 6) },
      { name: "Government", pctEmployment: 4 + Math.round(rand() * 4) },
      { name: "Other", pctEmployment: 20 + Math.round(rand() * 8) },
    ],
  };
}

// ============================================================
// 5. Infrastructure & Development (Dimension 5)
// ============================================================

/**
 * Generate infrastructure data for a zip / metro area.
 * Returns data matching the RawInfrastructureData interface.
 */
export function generateMockInfrastructure(zip: string = "00000"): RawInfrastructureData {
  const rand = seededRandom(`infra-${zip}`);

  return {
    buildingPermitsResidential: {
      current: 200 + Math.round(rand() * 200),
      oneYearAgo: 180 + Math.round(rand() * 180),
      threeYearAgo: 140 + Math.round(rand() * 140),
      fiveYearAgo: 100 + Math.round(rand() * 120),
    },
    buildingPermitsCommercial: {
      current: 30 + Math.round(rand() * 30),
      oneYearAgo: 25 + Math.round(rand() * 25),
      threeYearAgo: 20 + Math.round(rand() * 20),
      fiveYearAgo: 15 + Math.round(rand() * 15),
    },
    permitTotalValue: {
      current: 120000000 + Math.round(rand() * 120000000),
      oneYearAgo: 100000000 + Math.round(rand() * 100000000),
      threeYearAgo: 80000000 + Math.round(rand() * 80000000),
      fiveYearAgo: 60000000 + Math.round(rand() * 60000000),
    },
    zoningChanges: [
      {
        area: "Downtown Corridor",
        fromZone: "C-2",
        toZone: "MX-3",
        densityImpact: "increase",
        estimatedUnits: 300 + Math.round(rand() * 400),
        status: "approved",
        date: "2025-09",
      },
    ],
    transitProjects: [
      {
        name: "BRT Line Extension",
        type: "transit",
        investment: 60000000 + Math.round(rand() * 50000000),
        status: "under_construction",
        completionDate: "2027-06",
        impactRadius: 2,
        valueImpactEstimate: 6 + Math.round(rand() * 4),
      },
    ],
    commercialDevelopment: [
      {
        name: "Town Center Mixed Use",
        type: "mixed_use",
        investment: 30000000 + Math.round(rand() * 30000000),
        status: "under_construction",
        completionDate: "2026-12",
        impactRadius: 1,
        valueImpactEstimate: 3 + Math.round(rand() * 4),
      },
    ],
    medicalFacilities: [
      {
        name: "Urgent Care Expansion",
        type: "medical",
        investment: 8000000 + Math.round(rand() * 8000000),
        status: "planned",
        completionDate: "2027-03",
        impactRadius: 3,
        valueImpactEstimate: 1 + Math.round(rand() * 2),
      },
    ],
    schoolProjects: [
      {
        name: "New Elementary School",
        type: "school",
        investment: 25000000 + Math.round(rand() * 20000000),
        status: "under_construction",
        completionDate: "2027-08",
        impactRadius: 2,
        valueImpactEstimate: 3 + Math.round(rand() * 3),
      },
    ],
    techOfficeOpenings: [
      {
        name: "TechCorp Regional HQ",
        type: "office",
        investment: 40000000 + Math.round(rand() * 40000000),
        status: "under_construction",
        completionDate: "2026-09",
        impactRadius: 3,
        valueImpactEstimate: 4 + Math.round(rand() * 4),
      },
    ],
  };
}

// ============================================================
// 6. Quality of Life (Dimension 6)
// ============================================================

/**
 * Generate quality-of-life data for a zip / metro area.
 * Returns data matching the RawQualityOfLifeData interface.
 */
export function generateMockQualityOfLife(zip: string = "00000"): RawQualityOfLifeData {
  const rand = seededRandom(`qol-${zip}`);

  return {
    schools: {
      elementary: [
        {
          name: "Lincoln Elementary",
          rating: 6 + Math.round(rand() * 4),
          distance: 0.3 + rand() * 0.5,
          previousRating: 5 + Math.round(rand() * 3),
          trend: "improving" as const,
        },
        {
          name: "Washington Elementary",
          rating: 5 + Math.round(rand() * 4),
          distance: 0.8 + rand() * 0.8,
          previousRating: 5 + Math.round(rand() * 4),
          trend: "stable" as const,
        },
      ],
      middle: [
        {
          name: "Jefferson Middle",
          rating: 5 + Math.round(rand() * 4),
          distance: 1.0 + rand() * 1.0,
          previousRating: 4 + Math.round(rand() * 3),
          trend: "improving" as const,
        },
      ],
      high: [
        {
          name: "Roosevelt High",
          rating: 6 + Math.round(rand() * 4),
          distance: 1.5 + rand() * 1.0,
          previousRating: 6 + Math.round(rand() * 3),
          trend: "stable" as const,
        },
      ],
    },
    crime: {
      violentPer1000: {
        current: 1.5 + rand() * 2.0,
        oneYearAgo: 1.7 + rand() * 2.0,
        threeYearAgo: 2.0 + rand() * 2.5,
        fiveYearAgo: 2.5 + rand() * 2.5,
      },
      propertyPer1000: {
        current: 12 + rand() * 8,
        oneYearAgo: 13 + rand() * 8,
        threeYearAgo: 14 + rand() * 9,
        fiveYearAgo: 16 + rand() * 9,
      },
      metroAvgViolent: 2.5 + rand() * 1.0,
      metroAvgProperty: 16 + rand() * 4,
    },
    walkScore: 50 + Math.round(rand() * 40),
    transitScore: 35 + Math.round(rand() * 40),
    bikeScore: 40 + Math.round(rand() * 40),
    healthcare: {
      doctorsPerCapita: 2.0 + rand() * 2.5,
      nearestHospitalMiles: 1.5 + rand() * 3.0,
      hospitalRating: 3 + Math.round(rand() * 2),
    },
    greenSpace: {
      parkAcresPerCapita: 0.04 + rand() * 0.08,
      nearestParkMiles: 0.2 + rand() * 0.5,
    },
    neighborhood: {
      restaurantsPerCapita: 0.003 + rand() * 0.006,
      retailDensity: 8 + Math.round(rand() * 10),
      nightlifeScore: 3 + Math.round(rand() * 6),
    },
  };
}

// ============================================================
// 7. Supply-Demand Dynamics (Dimension 7)
// ============================================================

/**
 * Generate supply-demand data for a zip / metro area.
 * Returns data matching the RawSupplyDemandData interface.
 */
export function generateMockSupplyDemand(zip: string = "00000"): RawSupplyDemandData {
  const rand = seededRandom(`sd-${zip}`);
  const medianPrice = 300000 + Math.round(rand() * 200000);
  const medianIncome = 65000 + Math.round(rand() * 30000);

  return {
    monthsOfInventory: {
      current: 2.0 + rand() * 3.0,
      oneYearAgo: 2.8 + rand() * 3.0,
      threeYearAgo: 3.5 + rand() * 3.0,
      fiveYearAgo: 4.5 + rand() * 3.0,
    },
    daysOnMarket: {
      current: 20 + Math.round(rand() * 20),
      oneYearAgo: 25 + Math.round(rand() * 25),
      threeYearAgo: 32 + Math.round(rand() * 25),
      fiveYearAgo: 40 + Math.round(rand() * 30),
    },
    listToSaleRatio: {
      current: 0.95 + rand() * 0.08,
      oneYearAgo: 0.93 + rand() * 0.07,
      threeYearAgo: 0.91 + rand() * 0.07,
      fiveYearAgo: 0.89 + rand() * 0.07,
    },
    newConstruction: {
      unitsPlanned: 200 + Math.round(rand() * 300),
      unitsUnderConstruction: 100 + Math.round(rand() * 200),
      estimatedDeliveryMonths: 12 + Math.round(rand() * 12),
      monthlySalesRate: 15 + Math.round(rand() * 20),
    },
    rental: {
      vacancyRate: {
        current: 3.0 + rand() * 3.0,
        oneYearAgo: 3.5 + rand() * 3.5,
        threeYearAgo: 4.0 + rand() * 4.0,
        fiveYearAgo: 4.5 + rand() * 4.0,
      },
      rentGrowthRate: {
        current: 3.0 + rand() * 5.0,
        oneYearAgo: 2.5 + rand() * 4.5,
        threeYearAgo: 2.0 + rand() * 3.0,
        fiveYearAgo: 1.5 + rand() * 2.5,
      },
      medianRent: 1400 + Math.round(rand() * 800),
      medianHomePrice: medianPrice,
    },
    affordability: {
      medianHomePrice: medianPrice,
      medianHouseholdIncome: medianIncome,
      currentMortgageRate: 6.5 + rand() * 1.5,
    },
  };
}

// ============================================================
// 8. Macro & Risk (Dimension 8)
// ============================================================

/**
 * Generate macro risk data.
 * Accepts optional interest rate and loan amount for stress testing.
 */
export function generateMockMacroRisk(
  interestRate: number = 7.5,
  loanAmount: number = 300000,
  zip: string = "00000"
): RawMacroRiskData {
  const rand = seededRandom(`macro-${zip}`);

  return {
    interestRate: {
      current: interestRate,
      forecastDirection: "stable",
      loanAmount,
      loanTermYears: 30,
    },
    propertyTax: {
      currentRate: 0.008 + rand() * 0.01,
      assessmentHistory: {
        current: 300000 + Math.round(rand() * 150000),
        oneYearAgo: 280000 + Math.round(rand() * 140000),
        threeYearAgo: 250000 + Math.round(rand() * 120000),
        fiveYearAgo: 220000 + Math.round(rand() * 100000),
      },
    },
    insurance: {
      floodZone: rand() < 0.15,
      wildfireRisk: "low",
      hurricaneRisk: "low",
      earthquakeRisk: "low",
      insuranceCostHistory: {
        current: 1500 + Math.round(rand() * 600),
        oneYearAgo: 1350 + Math.round(rand() * 550),
        threeYearAgo: 1100 + Math.round(rand() * 500),
        fiveYearAgo: 950 + Math.round(rand() * 400),
      },
    },
    climate: {
      overallScore: 15 + Math.round(rand() * 25),
      heatRisk: "low",
      seaLevelRisk: "none",
      droughtRisk: "low",
    },
    regulatory: {
      rentControlActive: false,
      rentControlProposed: rand() < 0.1,
      evictionMoratoriumHistory: rand() < 0.2,
      landlordFriendlinessScore: 55 + Math.round(rand() * 35),
    },
    marketCyclePosition: "mid_expansion",
  };
}

// ============================================================
// 9. FRED Macro Data (national indicators)
// ============================================================

/**
 * Generate mock FRED macro-economic data with realistic current values.
 * Matches the FREDMacroData interface from data-bridge.ts.
 */
export function generateMockFREDMacro(): FREDMacroData {
  return {
    mortgageRate30yr: 6.95,
    mortgageRate30yrPrior: 7.22,
    medianHomePrice: 420000,
    medianHomePricePrior: 398000,
    unemploymentRate: 4.1,
    cpi: 314.0,
    gdpGrowth: 2.1,
    fedFundsRate: 5.33,
  };
}

// ============================================================
// 10. Appreciation Features (from /api/kpi-drivers)
// ============================================================

/**
 * Build appreciation features for a zip code.
 * Deterministic based on zip hash.
 */
export function generateMockAppreciationFeatures(zip: string): AppreciationFeatures {
  const hash = hashString(zip);
  const s = (hash % 100) / 100;

  return {
    populationGrowthRate3yr: 0.3 + s * 3.0,
    medianIncomeGrowthRate3yr: 1.5 + s * 5.0,
    jobGrowthRate3yr: 0.8 + s * 3.5,
    buildingPermitsTrend: -8 + s * 30,
    monthsOfInventoryTrend: -3 + s * 4,
    rentGrowthRate3yr: 1.5 + s * 6.0,
    schoolRatingChange: -0.5 + s * 1.5,
    crimeRateChange: -2 + s * 3,
    transitScoreChange: -1 + s * 6,
    majorEmployerEvents: Math.round(-2 + s * 5),
    zoningChangeImpact: Math.round(-1 + s * 3),
    interestRateForecast: -1.5 + s * 2.5,
    walkScoreChange: -3 + s * 8,
    affordabilityIndex: 0.6 + s * 0.8,
    daysOnMarketTrend: -20 + s * 30,
    listToSaleRatioTrend: -3 + s * 7,
  };
}

// ============================================================
// 11. Rental Analysis (from /api/rental-analysis)
// ============================================================

/**
 * Generate comparable rental listings for a given scope.
 * Deterministic based on scope type + value.
 */
export function generateMockRentalComps(scope: RentalScope): ComparableRental[] {
  const scopeSeed = scope.zipCode || scope.address || scope.city || scope.state || "default";
  const rand = seededRandom(`rental-comps-${scopeSeed}`);
  const baseRent = 1600 + Math.round(rand() * 800);
  const comps: ComparableRental[] = [];
  const streets = ["Oak", "Elm", "Pine", "Maple", "Cedar", "Birch", "Walnut", "Cherry"];

  for (let i = 0; i < 8; i++) {
    const rent = Math.round(baseRent + (rand() - 0.5) * 600);
    const sqft = 800 + Math.round(rand() * 1200);
    comps.push({
      address: `${100 + i * 25} ${streets[i]} ${scope.type === "street" ? scope.street || "St" : "St"}`,
      rent,
      sqft,
      rentPerSqft: Math.round((rent / sqft) * 100) / 100,
      bedrooms: 1 + Math.round(rand() * 3),
      bathrooms: 1 + Math.round(rand() * 1.5),
      yearBuilt: 1985 + Math.round(rand() * 35),
      distance: Math.round((0.1 + rand() * 1.5) * 10) / 10,
      daysOnMarket: Math.round(rand() * 30) + 3,
      listDate: new Date(Date.now() - rand() * 30 * 86400000)
        .toISOString()
        .split("T")[0],
      amenities: ["Washer/Dryer", "Dishwasher", "Central AC"].slice(
        0,
        1 + Math.round(rand() * 2)
      ),
      petPolicy: rand() > 0.4 ? "Cats & Dogs OK" : "No Pets",
      parkingIncluded: rand() > 0.3,
      utilitiesIncluded: rand() > 0.6 ? ["Water", "Trash"] : [],
      similarity: 60 + Math.round(rand() * 35),
    });
  }

  return comps.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Generate raw rental market data for a given scope.
 * This is the pre-engine-processed format (RawRentalMarketData).
 */
export function generateMockRentalMarketData(scope: RentalScope): RawRentalMarketData {
  const scopeSeed = scope.zipCode || scope.address || scope.city || scope.state || "default";
  const rand = seededRandom(`rental-market-${scopeSeed}`);

  return {
    medianRent: {
      current: 1700 + Math.round(rand() * 400),
      oneYearAgo: 1580 + Math.round(rand() * 350),
      threeYearAgo: 1350 + Math.round(rand() * 300),
      fiveYearAgo: 1150 + Math.round(rand() * 250),
    },
    averageRent: {
      current: 1770 + Math.round(rand() * 400),
      oneYearAgo: 1640 + Math.round(rand() * 350),
      threeYearAgo: 1410 + Math.round(rand() * 300),
      fiveYearAgo: 1200 + Math.round(rand() * 250),
    },
    rentPerSqft: {
      current: 1.2 + rand() * 0.5,
      oneYearAgo: 1.1 + rand() * 0.45,
      threeYearAgo: 0.95 + rand() * 0.4,
      fiveYearAgo: 0.85 + rand() * 0.35,
    },
    vacancyRate: {
      current: 3.5 + rand() * 2.0,
      oneYearAgo: 4.0 + rand() * 2.0,
      threeYearAgo: 4.5 + rand() * 2.5,
      fiveYearAgo: 5.0 + rand() * 2.5,
    },
    daysToLease: {
      current: 15 + Math.round(rand() * 10),
      oneYearAgo: 18 + Math.round(rand() * 10),
      threeYearAgo: 22 + Math.round(rand() * 12),
      fiveYearAgo: 28 + Math.round(rand() * 14),
    },
    appVolume: {
      current: 10 + Math.round(rand() * 6),
      oneYearAgo: 8 + Math.round(rand() * 5),
      threeYearAgo: 6 + Math.round(rand() * 4),
      fiveYearAgo: 4 + Math.round(rand() * 3),
    },
    renewalRate: {
      current: 55 + Math.round(rand() * 15),
      oneYearAgo: 52 + Math.round(rand() * 12),
      threeYearAgo: 50 + Math.round(rand() * 10),
      fiveYearAgo: 48 + Math.round(rand() * 8),
    },
    rentToIncomeRatio: 0.24 + rand() * 0.08,
    affordabilityThreshold: 1800 + Math.round(rand() * 400),
    byBedroom: {
      studio: {
        medianRent: 1100 + Math.round(rand() * 200),
        vacancyRate: 3.0 + rand() * 1.5,
        rentGrowthYoY: 6.0 + rand() * 4.0,
      },
      oneBed: {
        medianRent: 1400 + Math.round(rand() * 200),
        vacancyRate: 3.5 + rand() * 1.5,
        rentGrowthYoY: 5.5 + rand() * 4.0,
      },
      twoBed: {
        medianRent: 1750 + Math.round(rand() * 300),
        vacancyRate: 4.0 + rand() * 1.5,
        rentGrowthYoY: 5.0 + rand() * 4.0,
      },
      threeBed: {
        medianRent: 2100 + Math.round(rand() * 300),
        vacancyRate: 4.0 + rand() * 2.0,
        rentGrowthYoY: 4.5 + rand() * 3.5,
      },
      fourPlusBed: {
        medianRent: 2600 + Math.round(rand() * 400),
        vacancyRate: 4.5 + rand() * 2.5,
        rentGrowthYoY: 3.5 + rand() * 3.0,
      },
    },
    byPropertyType: {
      singleFamily: {
        medianRent: 1950 + Math.round(rand() * 300),
        pctOfMarket: 30 + Math.round(rand() * 10),
        rentGrowthYoY: 5.5 + rand() * 3.0,
      },
      apartment: {
        medianRent: 1500 + Math.round(rand() * 250),
        pctOfMarket: 35 + Math.round(rand() * 10),
        rentGrowthYoY: 6.0 + rand() * 3.5,
      },
      condo: {
        medianRent: 1800 + Math.round(rand() * 250),
        pctOfMarket: 8 + Math.round(rand() * 5),
        rentGrowthYoY: 4.5 + rand() * 3.0,
      },
      townhouse: {
        medianRent: 1850 + Math.round(rand() * 300),
        pctOfMarket: 8 + Math.round(rand() * 5),
        rentGrowthYoY: 5.0 + rand() * 3.0,
      },
      duplex: {
        medianRent: 1650 + Math.round(rand() * 250),
        pctOfMarket: 3 + Math.round(rand() * 4),
        rentGrowthYoY: 5.5 + rand() * 3.0,
      },
    },
  };
}

/**
 * Generate rental breakdown (distribution, amenity premiums, etc.)
 * Matches the RentalBreakdown interface.
 */
export function generateMockRentalBreakdown(
  _marketMetrics: RentalMarketMetrics,
  zip: string = "00000"
): RentalBreakdown {
  const rand = seededRandom(`breakdown-${zip}`);

  return {
    distribution: {
      under1000: 3 + Math.round(rand() * 5),
      range1000to1500: 15 + Math.round(rand() * 10),
      range1500to2000: 30 + Math.round(rand() * 10),
      range2000to2500: 20 + Math.round(rand() * 10),
      range2500to3000: 8 + Math.round(rand() * 6),
      over3000: 3 + Math.round(rand() * 5),
    },
    amenityPremiums: [
      { amenity: "In-unit W/D", avgPremium: 100 + Math.round(rand() * 50), pctOfListingsWithAmenity: 40 + Math.round(rand() * 15) },
      { amenity: "Garage parking", avgPremium: 80 + Math.round(rand() * 40), pctOfListingsWithAmenity: 25 + Math.round(rand() * 15) },
      { amenity: "Central AC", avgPremium: 60 + Math.round(rand() * 30), pctOfListingsWithAmenity: 50 + Math.round(rand() * 20) },
      { amenity: "Updated kitchen", avgPremium: 120 + Math.round(rand() * 60), pctOfListingsWithAmenity: 30 + Math.round(rand() * 10) },
      { amenity: "Fenced yard", avgPremium: 80 + Math.round(rand() * 40), pctOfListingsWithAmenity: 20 + Math.round(rand() * 10) },
      { amenity: "Pool", avgPremium: 60 + Math.round(rand() * 30), pctOfListingsWithAmenity: 5 + Math.round(rand() * 10) },
    ],
    locationPremiums: [
      { subArea: "Near downtown", premiumVsZipMedian: 8 + Math.round(rand() * 8), reasoning: "Walk to restaurants, nightlife, offices" },
      { subArea: "School district zone A", premiumVsZipMedian: 5 + Math.round(rand() * 6), reasoning: "Top-rated elementary school zone" },
      { subArea: "Near transit station", premiumVsZipMedian: 4 + Math.round(rand() * 4), reasoning: "Commuter convenience premium" },
      { subArea: "Outer neighborhoods", premiumVsZipMedian: -(6 + Math.round(rand() * 8)), reasoning: "Further from amenities, car-dependent" },
    ],
    conditionAdjustments: {
      newConstruction: 12 + Math.round(rand() * 6),
      recentlyRenovated: 8 + Math.round(rand() * 5),
      averageCondition: 0,
      needsWork: -(8 + Math.round(rand() * 8)),
    },
    furnishedPremium: 30 + Math.round(rand() * 10),
    shortTermRental: {
      estimatedNightlyRate: 110 + Math.round(rand() * 50),
      estimatedOccupancy: 60 + Math.round(rand() * 15),
      estimatedMonthlyRevenue: 2400 + Math.round(rand() * 800),
      vsLongTermRent: 35 + Math.round(rand() * 25),
      regulatoryAllowed: rand() > 0.2,
      permitRequired: rand() > 0.4,
      competingListings: 50 + Math.round(rand() * 70),
    },
  };
}

/**
 * Generate tenant demographic data.
 * Matches the TenantDemographics interface.
 */
export function generateMockTenantDemographics(zip: string = "00000"): TenantDemographics {
  const rand = seededRandom(`tenant-${zip}`);

  return {
    renterPct: 35 + Math.round(rand() * 20),
    avgAge: 30 + Math.round(rand() * 10),
    avgHouseholdSize: 1.8 + rand() * 1.0,
    avgIncome: 55000 + Math.round(rand() * 25000),
    avgCreditScore: 650 + Math.round(rand() * 60),
    avgLengthOfStay: 14 + Math.round(rand() * 10),
    topEmployers: ["Regional Medical Center", "TechCorp", "State University"],
    studentPct: 8 + Math.round(rand() * 10),
    militaryPct: 1 + Math.round(rand() * 5),
    section8Pct: 5 + Math.round(rand() * 8),
    petOwnerPct: 35 + Math.round(rand() * 20),
    evictionRate: 1.5 + rand() * 2.0,
    avgDaysDelinquent: 3 + Math.round(rand() * 5),
  };
}

/**
 * Generate regulatory environment data for a rental market scope.
 * Matches the RentalRegulations interface.
 */
export function generateMockRentalRegulations(scope: RentalScope): RentalRegulations {
  const scopeSeed = scope.zipCode || scope.city || scope.state || "default";
  const rand = seededRandom(`regs-${scopeSeed}`);

  return {
    rentControlActive: rand() < 0.1,
    justCauseEviction: rand() < 0.15,
    relocationAssistanceRequired: rand() < 0.1,
    shortTermRentalRestrictions:
      "Permitted with annual permit ($150/yr), 90-day annual cap",
    securityDepositLimit: 2,
    requiredDisclosures: [
      "Lead paint (pre-1978)",
      "Mold",
      "Sex offender registry",
    ],
    landlordLicenseRequired: rand() > 0.4,
    inspectionRequired: rand() > 0.4,
    leadPaintDisclosure: true,
    bedbugDisclosure: rand() > 0.6,
    habitabilityStandards:
      "Must meet International Building Code minimums",
  };
}

/**
 * Generate historical monthly rent data (2020 to present).
 * Deterministic based on zip.
 * Matches the HistoricalRentData[] array type.
 */
export function generateMockHistoricalRents(zip: string = "00000"): HistoricalRentData[] {
  const rand = seededRandom(`hist-rent-${zip}`);
  const data: HistoricalRentData[] = [];
  let rent = 1200 + rand() * 200;

  for (let y = 2020; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 3) break;
      const seasonal = Math.sin(((m - 1) / 12) * Math.PI * 2) * 30;
      rent = rent * (1 + (0.004 + rand() * 0.003));
      data.push({
        date: `${y}-${m.toString().padStart(2, "0")}`,
        medianRent: Math.round(rent + seasonal),
        avgRent: Math.round(rent * 1.04 + seasonal),
        vacancyRate:
          Math.round(
            (5 + Math.sin(((m - 4) / 12) * Math.PI * 2) * 1.5) * 10
          ) / 10,
        inventory: Math.round(200 + rand() * 80),
        yoyChange:
          Math.round((rent / (rent / 1.065) - 1) * 10000) / 100,
      });
    }
  }

  return data;
}
